import requests
url = 'https://leetcode.com/graphql'
query = '''
query userContestRankingInfo($username: String!) {
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
  }
}
'''
r = requests.post(url, json={'query': query, 'variables': {'username': 'neetcode'}})
print(r.json())
