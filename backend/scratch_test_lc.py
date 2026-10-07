import requests

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
    }
    profile {
      realName
      ranking
      reputation
    }
  }
}
"""

variables = {"username": "tourist"}
response = requests.post("https://leetcode.com/graphql", json={"query": query, "variables": variables})
print(response.json())
