import httpx
from typing import Dict, Any, List, Optional
from .provider import Provider
from .capabilities import LeetCodeCapability
from ...schemas.leetcode import ImportProviderPayload


class ScrapeProvider(Provider):
    """
    Scrapes data from LeetCode's public GraphQL API.
    """
    BASE_URL = "https://leetcode.com/graphql"

    @property
    def name(self) -> str:
        return "ScrapeProvider"

    def get_capabilities(self) -> set[LeetCodeCapability]:
        return {
            LeetCodeCapability.PROFILE_STATS,
            LeetCodeCapability.DIFFICULTY_STATS,
        }

    async def _graphql_request(self, query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                self.BASE_URL,
                json={"query": query, "variables": variables},
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            )
            response.raise_for_status()
            data = response.json()
            if "errors" in data:
                raise ValueError(f"GraphQL errors: {data['errors']}")
            return data["data"]

    async def get_profile(self, username: str, payload: Optional[ImportProviderPayload] = None) -> Dict[str, Any]:
        query = """
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            submitStats: submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
                submissions
              }
              totalSubmissionNum {
                difficulty
                count
                submissions
              }
            }
            profile {
              realName
              ranking
              reputation
            }
            userCalendar {
              submissionCalendar
            }
          }
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
          }
          userContestRankingHistory(username: $username) {
            attended
            rating
            ranking
            trendDirection
            problemsSolved
            totalProblems
            finishTimeInSeconds
            contest {
              title
              startTime
            }
          }
          skillStats: matchedUser(username: $username) {
            tagProblemCounts {
              advanced {
                tagName
                tagSlug
                problemsSolved
              }
              intermediate {
                tagName
                tagSlug
                problemsSolved
              }
              fundamental {
                tagName
                tagSlug
                problemsSolved
              }
            }
          }
          languageStats: matchedUser(username: $username) {
            languageProblemCount {
              languageName
              problemsSolved
            }
          }
          recentSubmissionList(username: $username, limit: 20) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
          }
        }
        """
        data = await self._graphql_request(query, {"username": username})
        matched_user = data.get("matchedUser")
        
        if not matched_user:
            raise ValueError(f"User {username} not found on LeetCode")

        ac_submissions_data = matched_user.get("submitStats", {}).get("acSubmissionNum", [])
        total_submissions_data = matched_user.get("submitStats", {}).get("totalSubmissionNum", [])
        
        total_solved = 0
        easy_solved = 0
        medium_solved = 0
        hard_solved = 0
        
        ac_submissions = 0
        total_submissions = 0
        
        for item in ac_submissions_data:
            diff = item.get("difficulty")
            count = item.get("count", 0)
            if diff == "All":
                total_solved = count
                ac_submissions = item.get("submissions", 0)
            elif diff == "Easy":
                easy_solved = count
            elif diff == "Medium":
                medium_solved = count
            elif diff == "Hard":
                hard_solved = count
                
        for item in total_submissions_data:
            if item.get("difficulty") == "All":
                total_submissions = item.get("submissions", 0)

        acceptance_rate = None
        if total_submissions > 0:
            acceptance_rate = (ac_submissions / total_submissions) * 100.0

        profile_data = matched_user.get("profile", {})
        
        # Aggregate stats processing
        tag_counts = data.get("skillStats", {}).get("tagProblemCounts", {})
        aggregate_topics = {}
        for level in ["advanced", "intermediate", "fundamental"]:
            for tag in tag_counts.get(level) or []:
                aggregate_topics[tag["tagName"]] = tag["problemsSolved"]
                
        lang_counts = data.get("languageStats", {}).get("languageProblemCount", [])
        aggregate_languages = {}
        for lang in lang_counts:
            aggregate_languages[lang["languageName"]] = lang["problemsSolved"]
            
        contest_history = []
        for c in data.get("userContestRankingHistory", []):
            if c.get("attended"):
                contest_history.append(c)
                
        recent_submissions = data.get("recentSubmissionList", [])
        submission_calendar = matched_user.get("userCalendar", {}).get("submissionCalendar", "{}")
        
        return {
            "username": username,
            "total_solved": total_solved,
            "easy_solved": easy_solved,
            "medium_solved": medium_solved,
            "hard_solved": hard_solved,
            "acceptance_rate": acceptance_rate,
            "global_ranking": profile_data.get("ranking"),
            "reputation": profile_data.get("reputation", 0),
            "aggregate_topics": aggregate_topics,
            "aggregate_languages": aggregate_languages,
            "contest_history": contest_history,
            "recent_submissions": recent_submissions,
            "submission_calendar": submission_calendar
        }

    async def get_submissions(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        # For a full implementation, we'd add the recentAcSubmissionList query
        return []

    async def get_contests(self, username: str, payload: Optional[ImportProviderPayload] = None) -> List[Dict[str, Any]]:
        # For a full implementation, we'd add the userContestRanking query
        return []
