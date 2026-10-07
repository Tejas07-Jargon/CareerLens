import asyncio
import httpx

async def main():
    BASE_URL = "https://leetcode.com/graphql"
    username = "AryanMasti"
    query = """
    query getUserProfile($username: String!) {
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
    }
    """
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            BASE_URL,
            json={"query": query, "variables": {"username": username}},
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        )
        data = response.json()
        history = data.get("data", {}).get("userContestRankingHistory", [])
        attended = [x for x in history if x.get("attended")]
        print(f"Total history: {len(history)}, Attended: {len(attended)}")
        if attended:
            print(attended[0])

asyncio.run(main())
