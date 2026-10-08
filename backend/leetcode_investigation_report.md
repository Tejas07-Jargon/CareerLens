# LeetCode Integration Investigation & Fix Report

## 1-2. Real-world Profile Trace
1. **Actual LeetCode username**: `AryanMasti`
2. **Actual profile URL**: https://leetcode.com/AryanMasti

## 3-4. Source Origins
3. **Data source used**: `ScrapeProvider` calling the official LeetCode GraphQL API (`https://leetcode.com/graphql`) using the `getUserProfile` and `matchedUser` query.
4. **Acceptance-rate source**: The LeetCode API does not expose a single authoritative aggregate `acceptanceRate` field in the `matchedUser` object. The `ScrapeProvider` computes it from the `submitStatsGlobal` field using `(acSubmissionNum / totalSubmissionNum) * 100`.

## 5-6. The 0.0% Root Cause & Fix
5. **Original root cause of 0.0%**: 
   The initial source of the `0` was an unverified JSON import (or early testing payload) that hardcoded `"acceptance_rate": 0`. 
   However, this `0.0` was never overwritten by the real data because of a bug in `sync_service.py` (`lc_profile.acceptance_rate = prof_data.get("acceptance_rate", 0.0)`). If a subsequent sync failed to retrieve the rate, it aggressively defaulted to `0.0` rather than `None`.
6. **Actual acceptance-rate value**: **58.49%** (Calculated from 62 accepted submissions / 106 total submissions retrieved via GraphQL).
   *(I have updated the sync pipeline to never blindly overwrite missing/null data with 0.0, and updated the UI label to correctly classify this as "Kareer Kranti Submission Acceptance Rate" complete with a provenance tooltip).*

## 7-11. Data Verification Against Actual GraphQL Source
7. **Total solved verification**: 59 (Verified: Matches API `acSubmissionNum` All count)
8. **Easy verification**: 50 (Verified: Matches API `acSubmissionNum` Easy count)
9. **Medium verification**: 9 (Verified: Matches API `acSubmissionNum` Medium count)
10. **Hard verification**: 0 (Verified: Matches API `acSubmissionNum` Hard count)
11. **Ranking verification**: #2,480,744 (Verified: Matches API `matchedUser.profile.ranking`)

## 12-17. Existing Provider Capabilities Report (`ScrapeProvider`)
12. **Submission availability**: PARTIAL (Only aggregate stats are retrieved via `submitStatsGlobal`. Full timeline history is not yet implemented in the scraper).
13. **Question-level availability**: NOT_SUPPORTED
14. **Topic availability**: NOT_SUPPORTED
15. **Language availability**: NOT_SUPPORTED
16. **Activity availability**: NOT_SUPPORTED
17. **Contest availability**: NOT_SUPPORTED

## 18-24. Changes & Validations
18. **Files changed**:
    - `backend/app/services/leetcode/sync_service.py`
    - `frontend/src/components/leetcode/LeetCodeAnalyzer.tsx`
19. **APIs changed**: No API routes changed, but the internal `SyncService` logic was fixed to prevent destructive null-defaulting.
20. **Database changes**: The `leetcode_profiles` row for `AryanMasti` has been successfully updated via a live test sync. `acceptance_rate` is now correctly stored as `58.490566037735846`.
21. **Tests added**: A live trace script (`test_sync.py`) was used.
22. **Test results**: `sync_via_scrape` correctly fetched 62 AC out of 106 Total and updated the DB to 58.49%.
23. **Real-world validation results**: The database confirms the real-world profile stats align perfectly with the backend fetch, removing the fake 0.0%.
24. **Known limitations**: The `ScrapeProvider` currently lacks queries for `recentAcSubmissionList` and `userContestRanking`, so the charts for Timeline, Topics, and Languages gracefully fall back to the "Not available" UI state.
