import httpx
import asyncio

async def test():
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
          ranking
        }
      }
    }
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://leetcode.com/graphql",
            json={"query": query, "variables": {"username": "AryanMasti"}},
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        )
        print(response.json())

asyncio.run(test())
