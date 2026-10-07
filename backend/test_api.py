import requests
import json
import time

base_url = "http://localhost:8000"
profile_id = "b129ab69-bdf1-4005-aabd-1a6c98a41cf4"
username = "AryanMasti"

print("Scraping LeetCode data...")
res = requests.post(f"{base_url}/profiles/{profile_id}/leetcode/scrape", json={"username": username})
print(res.status_code)
print(res.json())

time.sleep(2)

print("\nFetching LeetCode profile...")
res = requests.get(f"{base_url}/profiles/{profile_id}/leetcode")
print(res.status_code)
data = res.json()
print(json.dumps(data, indent=2))

print("\nFetching Analytics...")
res = requests.get(f"{base_url}/profiles/{profile_id}/leetcode/analytics")
print(res.status_code)
data = res.json()
print("Topics count:", len(data.get("topics", [])))
print("Languages count:", len(data.get("languages", [])))
print("Capabilities:", data.get("capabilities"))
