# Phase 0: Audit of Current Implementation

## Feature Matrix

| FEATURE | SOURCE | RETRIEVED | STORED | API | FRONTEND | VERIFIED |
| --- | --- | --- | --- | --- | --- | --- |
| **Profile Stats (Total, Easy, Med, Hard, Rank)** | GraphQL `matchedUser` | YES | YES (`LeetCodeProfile`) | YES | YES | Partial (verified values, but acceptance rate logic was flawed initially) |
| **Acceptance Rate** | GraphQL `matchedUser` | YES (Calculated from total/AC submissions) | YES (`acceptance_rate`) | YES | YES | YES |
| **Difficulty Distribution** | GraphQL `matchedUser` | YES | YES | YES | YES | YES |
| **Topics Analytics** | GraphQL `skillStats` (Available but not retrieved) | NO | NO | NO | NO (UI says "not available") | NO |
| **Language Analytics** | GraphQL `languageStats` (Available but not retrieved) | NO | NO | NO | NO | NO |
| **Contest Analytics** | GraphQL `userContestRankingHistory` (Available but not retrieved) | NO | NO | NO | NO | NO |
| **Submissions Over Time** | GraphQL `recentSubmissionList` (Only last 20) | NO | NO | NO | NO | NO |
| **Question Explorer** | NOT SUPPORTED by public API without auth/pagination | NO | NO | NO | NO | NO |

## Findings
- The `ScrapeProvider` currently only queries `matchedUser` for basic stats.
- LeetCode's public GraphQL API *does* support aggregate language counts, tag counts, and contest history.
- The public GraphQL API *does not* support fetching all solved problems (Question Explorer) or full submission history.
- The frontend correctly shows "not available" for missing data, but we *can* actually get aggregate topics, languages, and contests from the legitimate source.

## Plan
1. Expand `ScrapeProvider` GraphQL query to include `skillStats`, `languageStats`, `userContestRankingHistory`, and `recentSubmissionList`.
2. Add `aggregate_topics` and `aggregate_languages` JSON columns to `LeetCodeProfile` model to store these.
3. Add `LeetCodeContest` records from the contest history.
4. Add `LeetCodeSubmission` records from the recent 20 submissions.
5. Update `analytics.py` to fallback to `aggregate_topics` and `aggregate_languages` when question-level data is absent.
6. Update frontend to render these charts using the aggregate data, clearly marking them as aggregate (no drilldown).
