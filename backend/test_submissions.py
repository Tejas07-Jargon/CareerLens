import asyncio
import httpx
import json

async def main():
    BASE_URL = "https://leetcode.com/graphql"
    username = "AryanMasti"
    query = """
    query recentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
    """
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            BASE_URL,
            json={"query": query, "variables": {"username": username, "limit": 15}},
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        )
        data = response.json()
        print(json.dumps(data, indent=2))

asyncio.run(main())
