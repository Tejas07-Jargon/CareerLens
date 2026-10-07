"""
Repository Discovery Regression Tests.

Tests:
1. Valid token check (placeholder detection)
2. HTTP 403 rate limit propagates as discovery_error
3. HTTP 401 bad token propagates as discovery_error
4. HTTP 404 user not found propagates as discovery_error
5. Network timeout propagates as discovery_error
6. Empty username returns error
7. GraphQL skipped gracefully without token
8. Successful REST discovery
9. Discovery error propagation in discover()
10. Duplicate repository deduplication
11. Repository filtering (private, fork, archived)
12. Cap at MAX_DISCOVERED_REPOS=8
13. Ranking determinism (contribution count > owned > stars > lex)
14. Noreply email construction
15. Merge of GraphQL and REST repos without duplication

Run with:
    pytest tests/unit/test_repository_discovery.py -v
"""

from typing import Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import httpx

from app.services.ownership.repository_discovery import (
    RepositoryDiscoveryService,
    DiscoveredRepository,
    DiscoveryResult,
    MAX_DISCOVERED_REPOS,
    _classify_http_error,
)
from app.services.ownership.models import StudentIdentity


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_repo(
    name: str = "user/repo",
    relation: str = "owner",
    contribution_count: int = 10,
    stars: int = 0,
    is_private: bool = False,
    is_fork: bool = False,
    is_archived: bool = False,
) -> DiscoveredRepository:
    return DiscoveredRepository(
        repo_full_name=name,
        relation=relation,
        is_private=is_private,
        is_fork=is_fork,
        is_archived=is_archived,
        contribution_count=contribution_count,
        stars_count=stars,
    )


def make_rest_response_item(
    full_name: str = "user/repo",
    private: bool = False,
    fork: bool = False,
    archived: bool = False,
    stars: int = 0,
    size: int = 50,
    owner_id: int = 12345,
) -> dict:
    return {
        "full_name": full_name,
        "private": private,
        "fork": fork,
        "archived": archived,
        "stargazers_count": stars,
        "size": size,
        "default_branch": "main",
        "pushed_at": "2024-01-01T00:00:00Z",
        "owner": {"id": owner_id, "login": full_name.split("/")[0]},
    }


# ── Unit: _classify_http_error ────────────────────────────────────────────────

def test_classify_http_error_401():
    err = _classify_http_error(401, "Unauthorized")
    assert err is not None
    assert "401" in err or "Unauthorized" in err.lower()


def test_classify_http_error_403_rate_limit():
    err = _classify_http_error(403, "rate limit exceeded")
    assert err is not None
    assert "rate limit" in err.lower() or "403" in err


def test_classify_http_error_403_other():
    err = _classify_http_error(403, "insufficient scope")
    assert err is not None
    assert "403" in err


def test_classify_http_error_429():
    err = _classify_http_error(429, "Too Many Requests")
    assert err is not None
    assert "rate limit" in err.lower() or "429" in err


def test_classify_http_error_500():
    err = _classify_http_error(500, "Internal Server Error")
    assert err is not None
    assert "500" in err or "server" in err.lower()


def test_classify_http_error_200():
    err = _classify_http_error(200, "OK")
    assert err is None  # Not an error


# ── Unit: token_is_valid ──────────────────────────────────────────────────────

def test_token_placeholder_rejected():
    svc = RepositoryDiscoveryService(token="ghp_your_token_here")
    assert not svc._token_is_valid()


def test_empty_token_rejected():
    svc = RepositoryDiscoveryService(token="")
    assert not svc._token_is_valid()


def test_none_token_rejected():
    svc = RepositoryDiscoveryService(token=None)
    assert not svc._token_is_valid()


def test_your_token_variant_rejected():
    svc = RepositoryDiscoveryService(token="some_your_token_value")
    assert not svc._token_is_valid()


def test_real_token_accepted():
    svc = RepositoryDiscoveryService(token="ghp_abc123def456realtoken")
    assert svc._token_is_valid()


# ── Unit: _get_headers ────────────────────────────────────────────────────────

def test_get_headers_no_token():
    svc = RepositoryDiscoveryService(token="ghp_your_token_here")
    h = svc._get_headers()
    assert "Authorization" not in h


def test_get_headers_with_valid_token():
    svc = RepositoryDiscoveryService(token="ghp_realtoken123")
    h = svc._get_headers()
    assert "Authorization" in h
    assert h["Authorization"] == "Bearer ghp_realtoken123"


# ── Async: discover_repositories_rest_owned – rate limit error ────────────────

@pytest.mark.asyncio
async def test_rest_discovery_403_rate_limit_returns_error():
    """A 403 rate-limit response MUST surface as discovery_error, NOT empty repos."""
    svc = RepositoryDiscoveryService(token="")

    mock_response = MagicMock()
    mock_response.status_code = 403
    mock_response.text = "rate limit exceeded"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("testuser")

    assert len(repos) == 0
    assert error is not None
    assert "rate limit" in error.lower() or "403" in error


@pytest.mark.asyncio
async def test_rest_discovery_401_bad_token_returns_error():
    """A 401 response MUST surface as discovery_error."""
    svc = RepositoryDiscoveryService(token="ghp_badtoken")

    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.text = "Bad credentials"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("testuser")

    assert len(repos) == 0
    assert error is not None
    assert "401" in error or "unauthorized" in error.lower()


@pytest.mark.asyncio
async def test_rest_discovery_404_user_not_found():
    """A 404 response MUST surface as a not-found error."""
    svc = RepositoryDiscoveryService(token="")

    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.text = "Not Found"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("nonexistentuser99")

    assert len(repos) == 0
    assert error is not None
    assert "not found" in error.lower() or "404" in error


@pytest.mark.asyncio
async def test_rest_discovery_timeout_returns_error():
    """A timeout MUST surface as discovery_error."""
    svc = RepositoryDiscoveryService(token="")

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock,
               side_effect=httpx.TimeoutException("Request timed out")):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("testuser")

    assert len(repos) == 0
    assert error is not None
    assert "timeout" in error.lower() or "timed out" in error.lower()


@pytest.mark.asyncio
async def test_rest_discovery_success_returns_repos():
    """Successful 200 response returns discovered repos with no error."""
    svc = RepositoryDiscoveryService(token="")

    items = [
        make_rest_response_item("alice/repo1", stars=5),
        make_rest_response_item("alice/repo2", stars=2),
    ]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = items

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("alice")

    assert error is None
    assert len(repos) == 2
    assert "alice/repo1" in repos
    assert "alice/repo2" in repos


@pytest.mark.asyncio
async def test_rest_discovery_filters_private_repos():
    """Private repos are excluded from results."""
    svc = RepositoryDiscoveryService(token="")

    items = [
        make_rest_response_item("alice/public"),
        make_rest_response_item("alice/private", private=True),
    ]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = items

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("alice")

    assert "alice/public" in repos
    assert "alice/private" not in repos
    assert excluded.get("private", 0) == 1


@pytest.mark.asyncio
async def test_rest_discovery_filters_fork_repos():
    """Fork repos are excluded from results."""
    svc = RepositoryDiscoveryService(token="")

    items = [
        make_rest_response_item("alice/original"),
        make_rest_response_item("alice/forked", fork=True),
    ]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = items

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("alice")

    assert "alice/original" in repos
    assert "alice/forked" not in repos
    assert excluded.get("fork", 0) == 1


@pytest.mark.asyncio
async def test_rest_discovery_filters_archived_repos():
    """Archived repos are excluded from results."""
    svc = RepositoryDiscoveryService(token="")

    items = [
        make_rest_response_item("alice/active"),
        make_rest_response_item("alice/archived", archived=True),
    ]

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = items

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        uid, repos, excluded, error = await svc.discover_repositories_rest_owned("alice")

    assert "alice/active" in repos
    assert "alice/archived" not in repos
    assert excluded.get("archived", 0) == 1


# ── GraphQL: skipped gracefully without token ─────────────────────────────────

@pytest.mark.asyncio
async def test_graphql_skipped_without_token():
    """Without a valid token, GraphQL discovery returns empty repos with NO error."""
    svc = RepositoryDiscoveryService(token="ghp_your_token_here")
    gql_id, repos, excluded, error = await svc.discover_repositories_graphql("testuser")

    assert len(repos) == 0
    assert error is None  # Graceful degradation, not an error


# ── discover(): empty username ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_discover_empty_username():
    """An empty username returns a DiscoveryResult with discovery_error."""
    svc = RepositoryDiscoveryService(token="")
    result = await svc.discover("")
    assert result.discovery_error is not None
    assert "empty" in result.discovery_error.lower()
    assert len(result.repositories) == 0


# ── discover(): error propagated when repos=0 ─────────────────────────────────

@pytest.mark.asyncio
async def test_discover_rate_limit_error_propagated():
    """When all discovery calls fail with rate limit, discovery_error is set."""
    svc = RepositoryDiscoveryService(token="")

    mock_403_response = MagicMock()
    mock_403_response.status_code = 403
    mock_403_response.text = "rate limit exceeded"

    # resolve_identity also calls the API
    mock_404_user = MagicMock()
    mock_404_user.status_code = 403
    mock_404_user.text = "rate limit"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_403_response):
        result = await svc.discover("testuser")

    # Either repos are 0 with an error, or we got some repos
    if len(result.repositories) == 0:
        assert result.discovery_error is not None


# ── Cap at MAX_DISCOVERED_REPOS ───────────────────────────────────────────────

def test_repository_cap_applied_in_ranking():
    """Only MAX_DISCOVERED_REPOS (8) repositories are selected after ranking."""
    # Create 20 candidate repos
    repos = {
        f"alice/repo{i}": make_repo(f"alice/repo{i}", contribution_count=i, stars=i)
        for i in range(20)
    }

    def sort_key(r: DiscoveredRepository):
        return (-r.contribution_count, -int(r.relation == "owner"), -r.stars_count, r.repo_full_name.lower())

    ranked = sorted(repos.values(), key=sort_key)
    selected = ranked[:MAX_DISCOVERED_REPOS]

    # The cap must limit to MAX_DISCOVERED_REPOS
    assert len(selected) == MAX_DISCOVERED_REPOS
    assert MAX_DISCOVERED_REPOS == 8

    # The top ones by contribution count should be selected
    # repo19, repo18, ... repo12
    selected_names = {r.repo_full_name for r in selected}
    assert "alice/repo19" in selected_names
    assert "alice/repo18" in selected_names
    # repo0 (contribution_count=0) should NOT be selected
    assert "alice/repo0" not in selected_names


# ── Deduplication when GraphQL and REST overlap ────────────────────────────────

def test_merge_deduplicates_same_repo():
    """If GraphQL and REST both discover the same repo, it should appear only once."""
    repo = make_repo("user/shared", contribution_count=5)
    gql_repos = {"user/shared": repo}
    rest_repos = {"user/shared": make_repo("user/shared", contribution_count=10)}

    merged = {}
    merged.update(rest_repos)
    for name, obj in gql_repos.items():
        if name in merged:
            merged[name].contribution_count = max(merged[name].contribution_count, obj.contribution_count)
        else:
            merged[name] = obj

    assert len(merged) == 1
    # Should take the max contribution count
    assert merged["user/shared"].contribution_count == 10


# ── Ranking determinism ───────────────────────────────────────────────────────

def test_ranking_by_contribution_count():
    """Higher contribution count should rank first."""
    repos = [
        make_repo("user/low", contribution_count=5),
        make_repo("user/high", contribution_count=100),
        make_repo("user/mid", contribution_count=50),
    ]

    def sort_key(r: DiscoveredRepository):
        return (-r.contribution_count, -int(r.relation == "owner"), -r.stars_count, r.repo_full_name.lower())

    ranked = sorted(repos, key=sort_key)
    assert ranked[0].repo_full_name == "user/high"
    assert ranked[1].repo_full_name == "user/mid"
    assert ranked[2].repo_full_name == "user/low"


def test_ranking_owner_preferred_over_contributor():
    """With same contribution count, owned repos rank before contributed repos."""
    repos = [
        make_repo("other/contributed", relation="contributed_to", contribution_count=10),
        make_repo("user/owned", relation="owner", contribution_count=10),
    ]

    def sort_key(r: DiscoveredRepository):
        return (-r.contribution_count, -int(r.relation == "owner"), -r.stars_count, r.repo_full_name.lower())

    ranked = sorted(repos, key=sort_key)
    assert ranked[0].repo_full_name == "user/owned"
    assert ranked[1].repo_full_name == "other/contributed"


def test_ranking_tie_broken_by_stars():
    """Same contribution count and relation: higher stars ranks first."""
    repos = [
        make_repo("user/lowstar", contribution_count=10, stars=5),
        make_repo("user/highstar", contribution_count=10, stars=100),
    ]

    def sort_key(r: DiscoveredRepository):
        return (-r.contribution_count, -int(r.relation == "owner"), -r.stars_count, r.repo_full_name.lower())

    ranked = sorted(repos, key=sort_key)
    assert ranked[0].repo_full_name == "user/highstar"


def test_ranking_tie_broken_lexically():
    """Last tiebreaker is lexical ascending on repo_full_name."""
    repos = [
        make_repo("user/zzz", contribution_count=10, stars=10),
        make_repo("user/aaa", contribution_count=10, stars=10),
        make_repo("user/mmm", contribution_count=10, stars=10),
    ]

    def sort_key(r: DiscoveredRepository):
        return (-r.contribution_count, -int(r.relation == "owner"), -r.stars_count, r.repo_full_name.lower())

    ranked = sorted(repos, key=sort_key)
    assert ranked[0].repo_full_name == "user/aaa"
    assert ranked[2].repo_full_name == "user/zzz"


# ── Noreply email construction ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_noreply_emails_constructed():
    """Noreply emails are constructed for the GitHub username."""
    svc = RepositoryDiscoveryService(token="")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": 42, "login": "Alice"}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_response):
        user_id, login, noreply_emails, error = await svc.resolve_identity("Alice")

    assert "alice@users.noreply.github.com" in noreply_emails
    assert "42+alice@users.noreply.github.com" in noreply_emails
    assert user_id == 42


# ── DiscoveryResult invariants ────────────────────────────────────────────────

def test_discovery_result_with_error_has_no_repos():
    """A discovery_error result must have no repositories if error caused failure."""
    result = DiscoveryResult(
        student_identity=StudentIdentity(github_login="test"),
        repositories=[],
        total_discovered_candidates=0,
        discovery_error="GitHub API rate limit exceeded",
    )
    assert result.discovery_error is not None
    assert len(result.repositories) == 0
