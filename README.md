# Kareer Kranti 🔍
**AI-Powered Employability & Career Readiness Analyzer**
*DataQuest 3.0 Submission*

Kareer Kranti gives every student a clear, fair, and data-backed picture of their employability by verifying skills against real proof of work — not just keywords.

---

## Core Pillars

| Pillar | What it means |
|--------|--------------|
| **Evidence-based** | Every skill claim is linked to a specific commit, file, or artefact with a confidence score |
| **Explainable & Actionable** | Every score component has a reason, an evidence link, and a concrete next step |

---

## Architecture

```
frontend/          Next.js 14 (App Router) + Tailwind + Recharts
backend/           FastAPI + Celery + Redis
├── adapters/      GitHub, Resume, Design Portfolio, LinkedIn PDF
├── analysis/      Repo static analysis, temporal consistency
├── scoring/       Pure-function scorer (no LLM) with interval bounds
├── explainer/     LLM explainer with evidence-citation validator
└── batch/         Cohort aggregation + workshop optimiser
data/              JD corpus, skill aliases, seed profiles
docs/              Architecture, scoring design, API reference
infra/             Docker Compose, env templates
```

---

## Quick Start

```bash
# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in GITHUB_TOKEN, GEMINI_API_KEY
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Key Features

- **Claim → Evidence Graph** — per-claim Verified / Partial / Not yet evidenced status
- **Explainable Score** — components, reasons, evidence links, shown as a range (e.g. 61 [48–70])
- **GitHub Deep Analysis** — fast pass (seconds) + async deep pass (minutes)
- **Consistency Timeline** — 12-month weekly activity series, 3 metrics
- **Both Branches Demoable** — strong-evidence and weak-evidence personas
- **Placement Dashboard** — cohort heatmap + greedy workshop optimiser
- **What-If Simulator** — pure-function scorer, so trivially interactive
- **Poisoned-Resume Defence** — hidden-text detection, prompt-injection guard
- **Evaluation Harness** — injection detection rate + rank correlation

---

## Team
DataQuest 3.0 — Kareer Kranti Team