"""
GitHub Repository Discovery & Identity Resolution Service.

Discovers public repositories where the candidate either owns the repository
or has contributed code (via GraphQL contributionsCollection and REST APIs).
Enforces:
- Public and non-fork filters
- Multi-year contribution window (~4 years)
- Deterministic 4-tier ranking
- Maximum 8 repositories per profile cap
- Durable numeric GitHub user ID resolution

ERROR SEMANTICS:
  discovery_error is set EXPLICITLY for:
  - 401 Unauthorized (bad or expired token)
  - 403 Forbidden / rate limit exceeded
  - 429 Too Many Requests
  - 5xx server errors
  - Network / timeout errors

  An empty repository list with no discovery_error means the
  user genuinely has no eligible public repositories.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import httpx
import structlog

from app.core.config import settings
from app.services.adapters.github_adapter import (
    get_github_headers,
    is_github_token_valid,
    get_github_rate_limit,
)
from app.services.ownership.models import StudentIdentity

log = structlog.get_logger(__name__)

MAX_DISCOVERED_REPOS = 8
GRAPHQL_URL = "https://api.github.com/graphql"


@dataclass
class DiscoveredRepository:
    """Discovered candidate repository metadata."""
    repo_full_name: str
    relation: str  # "owner" | "contributed_to"
    is_private: bool = False
    is_fork: bool = False
    is_archived: bool = False
    default_branch: str = "main"
    contribution_count: int = 0
    stars_count: int = 0
    disk_usage_kb: int = 0
    pushed_at: Optional[str] = None
    discovered_via: str = "graphql_contributions"  # "graphql_contributions" | "rest_owned"


@dataclass
class DiscoveryResult:
    """Complete discovery output with durable student identity."""
    student_identity: StudentIdentity
    repositories: List[DiscoveredRepository]
    total_discovered_candidates: int
    excluded_counts: Dict[str, int] = field(default_factory=dict)
    discovery_error: Optional[str] = None


def _classify_http_error(status_code: int, response_text: str) -> Optional[str]:
    """Map an HTTP status code to a human-readable discovery_error string."""
    if status_code == 401:
        return "GitHub API returned 401 Unauthorized – check GITHUB_TOKEN validity"
    if status_code == 403:
        if "rate limit" in response_text.lower() or "x-ratelimit" in response_text.lower():
            return "GitHub API rate limit exceeded (403). Configure a valid GITHUB_TOKEN for higher limits."
        return f"GitHub API returned 403 Forbidden – {response_text[:120]}"
    if status_code == 429:
        return "GitHub API rate limit exceeded (429 Too Many Requests)"
    if status_code >= 500:
        return f"GitHub API server error ({status_code})"
    return None


class RepositoryDiscoveryService:
    """
    Discovers candidate repositories and resolves durable GitHub identity.
    """

    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.GITHUB_TOKEN

    def _token_is_valid(self) -> bool:
        """Return True only when the configured token looks like a real token."""
        return is_github_token_valid(self.token)

    def _get_headers(self) -> Dict[str, str]:
        return get_github_headers(self.token)

    async def resolve_identity(self, username: str) -> Tuple[Optional[int], str, Set[str], Optional[str]]:
        """
        Resolves GitHub numeric user ID, current login, and known noreply emails.
        Returns (user_id, login, noreply_emails, error_string_or_None).
        """
        clean_user = username.strip().lstrip("@")
        user_id: Optional[int] = None
        current_login = clean_user
        noreply_emails: Set[str] = set()
        error: Optional[str] = None

        url = f"https://api.github.com/users/{clean_user}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(url, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    user_id = data.get("id")
                    current_login = data.get("login", clean_user)
                elif resp.status_code == 404:
                    error = f"GitHub user '{clean_user}' not found (404)"
                else:
                    err = _classify_http_error(resp.status_code, resp.text[:200])
                    if err:
                        error = err
                    else:
                        log.warning("Unexpected status resolving GitHub identity",
                                    status=resp.status_code, user=clean_user)
            except Exception as exc:
                log.warning("Network error resolving GitHub identity", user=clean_user, error=str(exc))
                error = f"Network error resolving GitHub identity: {exc}"

        login_lower = current_login.lower()
        noreply_emails.add(f"{login_lower}@users.noreply.github.com")
        if user_id:
            noreply_emails.add(f"{user_id}+{login_lower}@users.noreply.github.com")

        return user_id, current_login, noreply_emails, error

    async def discover_repositories_graphql(
        self,
        username: str,
        years_back: int = 4
    ) -> Tuple[Optional[int], Dict[str, DiscoveredRepository], Dict[str, int], Optional[str]]:
        """
        Query GitHub GraphQL contributionsCollection for the last N years.
        Returns (resolved_db_id, repos_map, excluded_counts, error_or_None).
        """
        clean_user = username.strip().lstrip("@")
        repos_map: Dict[str, DiscoveredRepository] = {}
        excluded_counts: Dict[str, int] = {}
        resolved_db_id: Optional[int] = None
        first_error: Optional[str] = None

        if not self._token_is_valid():
            log.info("No valid GITHUB_TOKEN configured; GraphQL discovery skipped")
            return None, repos_map, excluded_counts, None  # Not an error – graceful degradation

        now = datetime.now(timezone.utc)
        current_year = now.year

        query = """
        query($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            databaseId
            login
            contributionsCollection(from: $from, to: $to) {
              commitContributionsByRepository(maxRepositories: 100) {
                contributions {
                  totalCount
                }
                repository {
                  nameWithOwner
                  isPrivate
                  isFork
                  isArchived
                  diskUsage
                  stargazerCount
                  pushedAt
                  owner {
                    login
                  }
                  defaultBranchRef {
                    name
                  }
                }
              }
            }
          }
        }
        """

        async with httpx.AsyncClient(timeout=15.0) as client:
            for y_offset in range(years_back):
                year = current_year - y_offset
                from_dt = datetime(year, 1, 1, 0, 0, 0, tzinfo=timezone.utc).isoformat()
                to_dt = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc).isoformat()

                payload = {
                    "query": query,
                    "variables": {"login": clean_user, "from": from_dt, "to": to_dt},
                }

                try:
                    resp = await client.post(GRAPHQL_URL, json=payload, headers=self._get_headers())
                    if resp.status_code != 200:
                        err = _classify_http_error(resp.status_code, resp.text[:200])
                        if err and first_error is None:
                            first_error = err
                        log.warning("GraphQL query failed", status=resp.status_code, text=resp.text[:200])
                        continue

                    data = resp.json()

                    # GraphQL may return errors inside 200 OK
                    gql_errors = data.get("errors")
                    if gql_errors:
                        msg = gql_errors[0].get("message", "Unknown GraphQL error")
                        if first_error is None:
                            first_error = f"GitHub GraphQL error: {msg}"
                        log.warning("GraphQL returned errors", errors=gql_errors[:2])
                        continue

                    user_data = data.get("data", {}).get("user")
                    if not user_data:
                        continue

                    if resolved_db_id is None:
                        resolved_db_id = user_data.get("databaseId")

                    coll = user_data.get("contributionsCollection", {})
                    commit_repos = coll.get("commitContributionsByRepository", [])

                    for item in commit_repos:
                        repo = item.get("repository") or {}
                        count = item.get("contributions", {}).get("totalCount", 0)
                        name_with_owner = repo.get("nameWithOwner", "").strip()

                        if not name_with_owner:
                            continue

                        if repo.get("isPrivate", False):
                            excluded_counts["private"] = excluded_counts.get("private", 0) + 1
                            continue
                        if repo.get("isFork", False):
                            excluded_counts["fork"] = excluded_counts.get("fork", 0) + 1
                            continue
                        if repo.get("isArchived", False):
                            excluded_counts["archived"] = excluded_counts.get("archived", 0) + 1
                            continue

                        repo_owner = (repo.get("owner", {}).get("login") or "").lower()
                        is_owner = repo_owner == clean_user.lower()
                        relation = "owner" if is_owner else "contributed_to"

                        def_branch = (repo.get("defaultBranchRef") or {}).get("name", "main")

                        if name_with_owner in repos_map:
                            repos_map[name_with_owner].contribution_count += count
                        else:
                            repos_map[name_with_owner] = DiscoveredRepository(
                                repo_full_name=name_with_owner,
                                relation=relation,
                                is_private=False,
                                is_fork=False,
                                is_archived=False,
                                default_branch=def_branch,
                                contribution_count=count,
                                stars_count=repo.get("stargazerCount", 0),
                                disk_usage_kb=repo.get("diskUsage", 0),
                                pushed_at=repo.get("pushedAt"),
                                discovered_via="graphql_contributions",
                            )
                except Exception as exc:
                    log.warning("Error querying GraphQL contribution window", year=year, error=str(exc))
                    if first_error is None:
                        first_error = f"GraphQL network error ({year}): {exc}"

        return resolved_db_id, repos_map, excluded_counts, first_error

    async def discover_repositories_rest_owned(
        self,
        username: str
    ) -> Tuple[Optional[int], Dict[str, DiscoveredRepository], Dict[str, int], Optional[str]]:
        """
        Query GitHub REST API for public repositories owned by the user.
        Returns (resolved_db_id, repos_map, excluded_counts, error_or_None).

        IMPORTANT: HTTP errors (401, 403, 429, 5xx) are returned as explicit
        error strings, NOT silently swallowed. This prevents 403 rate-limit
        responses from appearing as '0 repositories discovered'.
        """
        clean_user = username.strip().lstrip("@")
        repos_map: Dict[str, DiscoveredRepository] = {}
        excluded_counts: Dict[str, int] = {}
        resolved_db_id: Optional[int] = None
        discovery_error: Optional[str] = None

        url = f"https://api.github.com/users/{clean_user}/repos?type=owner&sort=pushed&per_page=100"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(url, headers=self._get_headers())
                if resp.status_code == 200:
                    data = resp.json()
                    for r in data:
                        if not isinstance(r, dict):
                            continue
                        name_with_owner = r.get("full_name", "").strip()
                        if not name_with_owner:
                            continue

                        if r.get("private", False):
                            excluded_counts["private"] = excluded_counts.get("private", 0) + 1
                            continue
                        if r.get("fork", False):
                            excluded_counts["fork"] = excluded_counts.get("fork", 0) + 1
                            continue
                        if r.get("archived", False):
                            excluded_counts["archived"] = excluded_counts.get("archived", 0) + 1
                            continue

                        owner_data = r.get("owner", {})
                        if resolved_db_id is None:
                            resolved_db_id = owner_data.get("id")

                        repos_map[name_with_owner] = DiscoveredRepository(
                            repo_full_name=name_with_owner,
                            relation="owner",
                            is_private=False,
                            is_fork=False,
                            is_archived=False,
                            default_branch=r.get("default_branch", "main"),
                            contribution_count=max(r.get("size", 0), 1),
                            stars_count=r.get("stargazers_count", 0),
                            disk_usage_kb=r.get("size", 0),
                            pushed_at=r.get("pushed_at"),
                            discovered_via="rest_owned",
                        )
                elif resp.status_code == 404:
                    discovery_error = f"GitHub user '{clean_user}' not found (404)"
                else:
                    # CRITICAL: surface HTTP errors explicitly
                    err = _classify_http_error(resp.status_code, resp.text[:300])
                    if err:
                        discovery_error = err
                        log.warning("REST repository discovery: HTTP error", status=resp.status_code,
                                    user=clean_user, error=err)
                    else:
                        discovery_error = f"REST discovery returned unexpected status {resp.status_code}"
                        log.warning("REST repository discovery: unexpected status",
                                    status=resp.status_code, user=clean_user)
            except httpx.TimeoutException as exc:
                discovery_error = f"REST repository discovery timed out for '{clean_user}': {exc}"
                log.warning("REST repository discovery timeout", user=clean_user, error=str(exc))
            except Exception as exc:
                discovery_error = f"REST repository discovery network error: {exc}"
                log.warning("REST repository discovery failed", user=clean_user, error=str(exc))

        return resolved_db_id, repos_map, excluded_counts, discovery_error

    async def discover(self, username: str) -> DiscoveryResult:
        """
        Executes unified discovery across GraphQL contributions and REST owned repositories.
        Ranks deterministically and caps at MAX_DISCOVERED_REPOS (8).

        Error semantics:
        - If BOTH GraphQL and REST fail with errors, discovery_error is set.
        - If GraphQL is skipped (no token) but REST succeeds, result is valid.
        - If REST returns a 403 with repos=0, the error is surfaced – NOT hidden.
        """
        clean_user = username.strip().lstrip("@")
        if not clean_user:
            return DiscoveryResult(
                student_identity=StudentIdentity(github_login=""),
                repositories=[],
                total_discovered_candidates=0,
                discovery_error="Empty GitHub username"
            )

        # 0. Check rate limit
        rate_limit_info = await get_github_rate_limit(self.token)
        resources = rate_limit_info.get("resources", {})
        core_limit = resources.get("core", {})
        graphql_limit = resources.get("graphql", {})
        
        # Require at least 5 core API calls to proceed
        if core_limit.get("remaining", 100) < 5:
            reset_time = core_limit.get("reset", 0)
            reset_dt = datetime.fromtimestamp(reset_time, tz=timezone.utc)
            return DiscoveryResult(
                student_identity=StudentIdentity(github_login=clean_user),
                repositories=[],
                total_discovered_candidates=0,
                discovery_error=f"GITHUB_RATE_LIMIT_LOW: GitHub API rate limit exceeded. Resets at {reset_dt.isoformat()}"
            )

        # 1. Resolve identity
        user_id, login, noreply_emails, identity_error = await self.resolve_identity(clean_user)

        # If identity resolution gave us a hard error, still try discovery
        # but record the identity error
        if identity_error and user_id is None:
            log.warning("Identity resolution error, proceeding with username only",
                        user=clean_user, error=identity_error)

        # 2. Run GraphQL contributions discovery (requires token; skips gracefully without one)
        gql_id, gql_repos, gql_excluded, gql_error = await self.discover_repositories_graphql(login)
        if user_id is None and gql_id is not None:
            user_id = gql_id

        # 3. Run REST owned discovery
        rest_id, rest_repos, rest_excluded, rest_error = await self.discover_repositories_rest_owned(login)
        if user_id is None and rest_id is not None:
            user_id = rest_id

        # 4. Determine overall discovery_error
        # Only raise discovery_error if REST failed AND we have no repos at all.
        # If GraphQL found repos despite REST error (or vice versa), we proceed.
        merged_repos: Dict[str, DiscoveredRepository] = {}
        merged_repos.update(rest_repos)
        for repo_name, repo_obj in gql_repos.items():
            if repo_name in merged_repos:
                merged_repos[repo_name].contribution_count = max(
                    merged_repos[repo_name].contribution_count, repo_obj.contribution_count
                )
            else:
                merged_repos[repo_name] = repo_obj

        # Determine which error to surface (REST error is more actionable for owned repos)
        surfaced_error: Optional[str] = None
        if len(merged_repos) == 0:
            # No repos found – surface any error
            if rest_error:
                surfaced_error = rest_error
            elif gql_error:
                surfaced_error = gql_error
            elif identity_error:
                surfaced_error = identity_error
        else:
            # We found repos; log any errors but don't fail the result
            if rest_error:
                log.info("REST discovery had error but GraphQL found repos", error=rest_error)
            if gql_error:
                log.info("GraphQL discovery had error but REST found repos", error=gql_error)

        # Merge exclusions
        merged_excluded: Dict[str, int] = {}
        for k, v in gql_excluded.items():
            merged_excluded[k] = merged_excluded.get(k, 0) + v
        for k, v in rest_excluded.items():
            merged_excluded[k] = merged_excluded.get(k, 0) + v

        total_candidates = len(merged_repos)

        # 5. Rank candidates deterministically
        # Tier 1: Total contributions count descending
        # Tier 2: Owned repository preference (1 for owner, 0 for contributor)
        # Tier 3: Star count descending
        # Tier 4: Lexical tie-break on repo_full_name ascending
        def sort_key(repo: DiscoveredRepository):
            is_owner_score = 1 if repo.relation == "owner" else 0
            return (
                -repo.contribution_count,
                -is_owner_score,
                -repo.stars_count,
                repo.repo_full_name.lower(),
            )

        ranked_repos = sorted(merged_repos.values(), key=sort_key)
        selected_repos = ranked_repos[:MAX_DISCOVERED_REPOS]

        student_identity = StudentIdentity(
            github_login=login,
            user_id=user_id,
            noreply_emails=noreply_emails,
        )

        return DiscoveryResult(
            student_identity=student_identity,
            repositories=selected_repos,
            total_discovered_candidates=total_candidates,
            excluded_counts=merged_excluded,
            discovery_error=surfaced_error,
        )
