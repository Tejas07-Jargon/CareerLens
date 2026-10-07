import asyncio
import httpx

async def main():
    BASE_URL = "https://leetcode.com/graphql"
    username = "AryanMasti"
    query = """
    query userProfileCalendar($username: String!, $year: Int) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          activeYears
          streak
          totalActiveDays
          submissionCalendar
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
        print(data)

asyncio.run(main())
