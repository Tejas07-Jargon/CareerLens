# CareerLens — Architecture Reference

## System overview

```
                   Student / Placement Cell
                            │
                    ┌───────▼────────┐
                    │  Next.js UI    │  (port 3000)
                    │  App Router    │
                    └───────┬────────┘
                            │ /api/* → proxy
                    ┌───────▼────────┐
                    │  FastAPI       │  (port 8000)
                    │  + SSE stream  │
                    └──┬─────────┬──┘
               DB reads│         │task.delay()
                ┌──────▼──┐  ┌───▼──────────┐
                │Postgres  │  │ Redis broker │
                │+pgvector │  └───┬──────────┘
                └──────────┘  ┌───▼──────────┐
                              │ Celery worker│
                              │  fast pass   │
                              │  deep pass   │
                              └──────────────┘
```

## The Evidence contract

Every fact the system knows is an **Evidence record**:

| Field | Purpose |
|-------|---------|
| `id` | UUID |
| `profile_id` | Owning profile |
| `source` | `github_repo` \| `resume` \| `design_portfolio` \| `live_probe` \| `github_calendar` \| `linkedin_pdf` |
| `evidence_type` | `language` \| `commit` \| `has_tests` \| `has_ci` \| `has_docker` \| `readme_quality` \| `resume_claim` \| `design_rubric_*` \| `deployment` \| `consistency_*` \| `authenticity_signal_*` |
| `skill_hints` | Normalised skill names this evidence supports |
| `reliability` | `[0,1]` — source trustworthiness |
| `depth` | `[0,1]` — how deeply demonstrated |
| `recency` | `[0,1]` — exponential decay, 180-day half-life |
| `authenticity` | `[0,1]` — authorship / originality |
| **`strength`** | `reliability × depth × recency × authenticity` (computed property) |
| `locator` | JSON: `{repo, path, commit_sha, line_start?, url?, snippet?}` |
| `extractor_id` | Which extractor version produced this |

## Scoring pipeline (pure functions, no LLM)

```
Evidence records
     │
     ├─ SkillNormaliser      alias → canonical name
     │
     ├─ EvidenceLinker       claim ↔ evidence edges; authenticity penalty for unsupported claims
     │
     ├─ Scorer.compute_score()
     │    ├─ noisy_OR per claim     e_k = 1 − Π(1 − s_i)
     │    ├─ skill_coverage         C = Σ w_k · min(1, e_k/τ_k) / Σ w_k
     │    ├─ component scores       (5 components, role-tuned weights)
     │    ├─ score interval         [lo, hi] from unobserved components
     │    ├─ claim statuses         Verified / Partial / Not yet evidenced
     │    └─ gap list               sorted by importance × (1 − confidence)
     │
     └─ LLMExplainer          narrative (citation-enforced) + JSON roadmap
```

## Two-speed GitHub analysis

| Pass | When | Method | Output |
|------|------|--------|--------|
| **Fast** | Immediately | API only (no clone) | Language bytes, manifest detection, contribution calendar |
| **Deep** | After fast pass, async | Shallow clone (depth=1, size-capped) | Test files, README quality, authorship signals |

The UI shows fast results immediately and upgrades live via SSE.

## Score interval

The score is reported as `mid (lo–hi)`. The interval captures uncertainty from missing sources:

- **Lower bound**: unobserved components → 0
- **Upper bound**: unobserved components → student's average on observed components
- The range narrows as more sources are added — built-in incentive to upload more

## Security

| Threat | Defence |
|--------|---------|
| White / tiny font in resume | PyMuPDF reads colour & size; flagged in UI |
| Prompt injection | Regex scan + schema-constrained LLM output |
| Repo execution | Never install or run anything from a clone |
| Fake skills (keyword stuffing) | noisy-OR needs corroborating evidence |
| Small-cohort privacy | Stats suppressed for groups < 5 students |
| Name/gender/college bias | These fields are never inputs to the scorer |

## Key file map

```
backend/app/
├── main.py                          FastAPI app factory
├── core/
│   ├── config.py                    Pydantic-settings (all env vars)
│   ├── database.py                  Async SQLAlchemy + session factory
│   └── logging.py                   structlog configuration
├── models/
│   ├── evidence.py                  Evidence + ClaimEvidence (the central contract)
│   ├── profile.py                   Student profile
│   ├── score_run.py                 Immutable score snapshot
│   ├── role_profile.py              JD-derived market baseline
│   ├── cohort.py                    Placement-cell batch
│   ├── consent.py                   Consent record
│   └── audit_log.py                 Append-only audit trail
├── services/
│   ├── adapters/
│   │   ├── github_adapter.py        Fast + deep pass
│   │   ├── resume_adapter.py        PDF parsing + defence
│   │   ├── design_portfolio_adapter.py  Vision rubric
│   │   └── live_probe_adapter.py    HTTP deployment check
│   ├── analysis/
│   │   ├── temporal_consistency_service.py  52-week series + 3 metrics
│   │   ├── authenticity_detector.py         5 transparent signals
│   │   ├── evidence_linker.py               Claim ↔ evidence graph
│   │   └── skill_normaliser.py              Alias → fuzzy → embedding
│   ├── scoring/
│   │   ├── scorer.py                Pure-function scorer (no LLM, no DB)
│   │   └── whatif_simulator.py      Clone ScoreInput + inject synthetic evidence
│   ├── explainer/
│   │   └── llm_explainer.py         Citation-enforced narrative + JSON roadmap
│   └── batch/
│       └── batch_analytics_service.py  Heatmap + greedy workshop optimiser
├── workers/
│   ├── celery_app.py                Celery factory
│   └── analysis_tasks.py           fast_pass + deep_pass tasks
└── api/routes/
    ├── profiles.py                  POST / GET /stream / GET /report / POST /whatif / DELETE
    ├── roles.py                     GET roles list + detail
    ├── cohorts.py                   GET insights / POST optimise
    └── health.py                    GET /health

frontend/src/
├── app/
│   ├── layout.tsx                   Root layout + SEO
│   ├── page.tsx                     Home page + persona switcher
│   └── globals.css                  Design system
├── components/
│   ├── ui/
│   │   └── SubmitForm.tsx           Multi-source upload + SSE progress
│   ├── evidence/
│   │   ├── ReportView.tsx           Full report assembler
│   │   ├── ScorePanel.tsx           Score ring + radar + components
│   │   ├── ClaimList.tsx            Evidence cards + provenance drill-down
│   │   ├── SecurityFlagBanner.tsx   Hidden-text / injection flags
│   │   ├── RoadmapList.tsx          Milestone timeline
│   │   └── WhatIfPanel.tsx          What-if simulator
│   ├── dashboard/
│   │   ├── GapChart.tsx             Horizontal bar chart (colour-coded)
│   │   └── ConsistencyChart.tsx     52-week area chart
│   └── batch/
│       └── BatchDashboard.tsx       Placement-cell heatmap + optimiser
├── lib/api.ts                       Typed API client (all endpoints)
└── types/index.ts                   Shared TypeScript types

data/
├── skill_aliases/aliases.json       Alias → canonical name table
├── jd_corpus/<role>/*.json          Job description seed data
└── seed_profiles/                   Profiles for evaluation harness

backend/scripts/
├── build_role_profiles.py           Parse JD corpus → RoleProfile rows
└── evaluation_harness.py            Injection detection + rank correlation

backend/tests/
├── conftest.py
├── unit/test_scorer.py              Pure-function scorer unit tests
└── fixtures/labelled_profiles.json  Human-labelled profiles for rank correlation
```
