# Kareer Kranti

**Evidence-Based Employability and Career Intelligence**

Kareer Kranti is an evidence-first career intelligence platform designed to evaluate candidate skills against verifiable proof of work. Rather than relying on unverified resume keywords, Kareer Kranti links candidate claims directly to source code, commit histories, Git blame attribution, algorithmic problem-solving records, and deployment signals.

The system translates empirical evidence into deterministic employability scores, role-fit analyses, transparent skill gap breakdowns, and actionable personalized roadmaps.

---

## Core Philosophy

Traditional applicant screening and candidate evaluation tools rely heavily on keyword matching and subjective resume claims. This approach fails to differentiate between uncorroborated assertions and authentic, high-depth technical execution.

Kareer Kranti operates on an evidence-based pipeline:

```
CLAIM
  │
  ▼
EVIDENCE EXTRACTION
  │
  ▼
PROVENANCE & VALIDATION
  │
  ▼
STATUS DETERMINATION (Verified / Partial / Not Yet Evidenced)
  │
  ▼
ROLE BASELINE & FIT
  │
  ▼
DETERMINISTIC READINESS SCORING
  │
  ▼
SKILL GAP IDENTIFICATION
  │
  ▼
PERSONALIZED ACTIONABLE ROADMAP
```

### Key Conceptual Distinctions

- **Claims vs. Evidence**: A skill listed on a resume is treated strictly as an unverified claim until corroborated by external artifacts (repositories, commits, LeetCode records, live endpoints, or practical assessments).
- **Absence of Evidence**: When the system cannot locate proof for a claim, it marks the status as **Not Yet Evidenced**. It does not declare that the candidate lacks the skill, only that evidence has not yet been provided or discovered.
- **Deterministic Evaluation**: Final scores and readiness levels are computed via deterministic mathematical functions, ensuring reproducibility, explainability, and freedom from non-deterministic LLM scoring drift.
- **Traceable Provenance**: Every verified claim maintains a direct link to its source artifact, including repository URLs, file paths, commit SHAs, line ranges, or submission timestamps.

---

## System Architecture

Kareer Kranti is organized as a decoupled multi-tier system comprising a Next.js frontend, a FastAPI backend, asynchronous Celery workers backed by Redis, a persistent database with vector capability, and external source adapters.

```mermaid
flowchart TB
    subgraph Client ["Client Layer"]
        UI["Next.js 14 Frontend<br/>(App Router, Recharts, Framer Motion)"]
    end

    subgraph API ["API & Routing Layer"]
        FastAPI["FastAPI Application<br/>(Uvicorn, Pydantic v2, SSE Streams)"]
        Routes["API Endpoints<br/>(/profiles, /ownership, /leetcode, /job-fit, /quiz, /cohorts)"]
    end

    subgraph Orchestration ["Orchestration & Analysis Services"]
        Orchestrator["Analysis Orchestrator"]
        GitAdapter["GitHub Adapter<br/>(Fast API Pass + Deep Clone)"]
        ResumeAdapter["Resume Adapter<br/>(PyMuPDF, Hidden-Text Defense)"]
        LCAdapter["LeetCode Service<br/>(Multi-Provider, GraphQL Scraper)"]
        OwnershipSvc["Ownership Service<br/>(Git Blame, Author Classifier)"]
        JobFitSvc["Job Fit Service<br/>(Role Baseline & JD Matcher)"]
        QuizEngine["Quiz Engine<br/>(Practical Skill Verification)"]
    end

    subgraph ScoringEngine ["Deterministic Scoring & Explanation"]
        Normalizer["Skill Normalizer<br/>(Alias Map + Fuzzy Matching)"]
        EvidenceLinker["Evidence Linker<br/>(Noisy-OR Aggregation)"]
        PureScorer["Pure-Function Scorer<br/>(5-Component Weighted Math)"]
        WhatIfSim["What-If Simulator<br/>(In-Memory Score Projection)"]
        Explainer["LLM Explainer<br/>(Citation-Enforced Gemini Integration)"]
    end

    subgraph Workers ["Asynchronous Background Layer"]
        Redis["Redis Broker & Result Backend"]
        Celery["Celery Workers<br/>(Deep Git Clones, Repository Analysis)"]
    end

    subgraph Storage ["Persistence Layer"]
        DB[("PostgreSQL 16 + pgvector<br/>(SQLite aiosqlite Fallback)")]
    end

    UI <-->|HTTP / SSE| FastAPI
    FastAPI --> Routes
    Routes --> Orchestrator
    Orchestrator --> GitAdapter
    Orchestrator --> ResumeAdapter
    Orchestrator --> LCAdapter
    Orchestrator --> OwnershipSvc
    Orchestrator --> JobFitSvc
    Orchestrator --> QuizEngine
    Orchestrator --> ScoringEngine
    GitAdapter -->|Queue Deep Pass| Redis
    Redis --> Celery
    Celery --> DB
    ScoringEngine --> DB
    FastAPI --> DB
```

---

## Evidence Pipeline

The core analytical pipeline converts heterogeneous inputs into standardized evidence items, aggregates them against market role profiles, and derives verified readiness.

```mermaid
flowchart LR
    subgraph Ingestion ["1. Multi-Source Ingestion"]
        R[Resume PDF]
        GH[GitHub Repositories]
        LC[LeetCode Profile]
        LP[Live Deployments]
        QZ[Practical Quiz]
    end

    subgraph Normalization ["2. Normalization & Extraction"]
        Ext[Extractor Modules]
        Norm[Skill Alias Normalizer]
        Sec[Adversarial & Injection Checks]
    end

    subgraph EvidenceModel ["3. Evidence Records & Provenance"]
        EV["Evidence Record<br/>• Reliability<br/>• Depth<br/>• Recency<br/>• Authenticity<br/>• Ownership Factor"]
        Prov["Provenance Metadata<br/>(Repo, SHA, Line Range, URL)"]
    end

    subgraph Evaluation ["4. Deterministic Evaluation"]
        NoisyOR["Noisy-OR Confidence per Claim"]
        CompScore["5-Component Scorer"]
        Interval["Uncertainty Interval [Lo, Hi]"]
    end

    subgraph Output ["5. Explainable Insights"]
        Fit["Role Fit %"]
        Status["Claim Status List"]
        Gaps["Ranked Skill Gaps"]
        Roadmap["Milestone Roadmap"]
    end

    R & GH & LC & LP & QZ --> Ext
    Ext --> Sec --> Norm
    Norm --> EV
    EV --> Prov
    EV --> NoisyOR --> CompScore --> Interval
    CompScore --> Fit & Status & Gaps
    Gaps --> Roadmap
```

---

## Major Implemented Modules

### 1. Evidence-Based Profile Analysis

Every fact extracted by the system is formalized as an immutable `Evidence` record containing:
- **Source**: `github_repo`, `resume`, `leetcode`, `live_probe`, `github_calendar`, `design_portfolio`, `linkedin_pdf`, or `quiz`.
- **Evidence Type**: `language`, `commit`, `has_tests`, `has_ci`, `has_docker`, `readme_quality`, `resume_claim`, `deployment`, `consistency_*`, or `authenticity_signal_*`.
- **Skill Hints**: Normalized canonical technical skills supported by the artifact.
- **Quality Dimensions**:
  - `reliability` $\in [0, 1]$: Source credibility (e.g., verified commit > self-written resume claim).
  - `depth` $\in [0, 1]$: Technical complexity, volume of lines, or difficulty tier.
  - `recency` $\in [0, 1]$: Exponential time decay with a 180-day half-life.
  - `authenticity` $\in [0, 1]$: Authorship, originality, and lack of boilerplate.
  - `ownership_factor` $\in [0.2, 1.0]$: Ratio of surviving candidate lines determined via Git blame.
- **Computed Strength**:
  $$\text{strength} = \text{reliability} \times \text{depth} \times \text{recency} \times \text{authenticity} \times \text{ownership\_factor}$$
- **Provenance**: Precise locator mapping to repository name, file path, commit SHA, line ranges, URLs, or timestamps.

---

### 2. Deterministic Employability Scoring

Kareer Kranti uses a mathematical pure-function scorer with zero LLM interference in the score calculation:

1. **Per-Claim Confidence ($e_k$)**: Computed across all corroborating evidence items $i$ using a noisy-OR accumulation model:
   $$e_k = 1 - \prod_{i} (1 - s_i)$$
2. **Role Skill Coverage ($C$)**:
   $$C = \frac{\sum_{k} w_k \cdot \min(1, e_k / \tau_k)}{\sum_{k} w_k}$$
   where $w_k$ is the skill frequency in the target role corpus, and $\tau_k$ is the proof threshold ($0.60$ for core skills, $0.30$ for nice-to-have skills).
3. **Component Weighting**:
   - **Role Skill Coverage**: 40% ($0.40$)
   - **Project Depth**: 20% ($0.20$)
   - **Consistency and Growth**: 15% ($0.15$)
   - **Portfolio and Presentation**: 15% ($0.15$)
   - **Professional Signals**: 10% ($0.10$)
4. **Score Interval $[Lo, Hi]$**:
   - **Lower Bound ($Lo$)**: Unobserved components evaluate to $0$.
   - **Upper Bound ($Hi$)**: Unobserved components evaluate to the candidate's average on observed components.
   - The score is reported as $\text{Mid } [\text{Lo} - \text{Hi}]$, narrowing as additional data sources are provided.
5. **Claim Verification Status**:
   - **Verified**: $e_k \ge 0.60$
   - **Partial**: $0.25 \le e_k < 0.60$
   - **Not Yet Evidenced**: $e_k < 0.25$

---

### 3. Ownership Map

The **Ownership Map** estimates how much surviving, meaningful code in public repositories is attributable to the candidate using Git history and line-by-line blame analysis.

```
Repository Discovery (Owned / Contributed / Forked)
  │
  ▼
Repository Filtering (Size limit <= 50 MB, HTTPS validation)
  │
  ▼
Full-History / Shallow Clone & Source File Filtering
  │
  ▼
Line-by-Line Git Blame Execution
  │
  ▼
Author Identity Resolution (Candidate, Bot, Other, Unknown)
  │
  ▼
Ownership Aggregation (Candidate lines vs. Total meaningful lines)
  │
  ▼
Skill Mapping (Association of attributed lines with language/stack)
  │
  ▼
Ownership Factor Calculation (Applied as multiplier to evidence strength)
```

#### Important Technical Notes & Limitations
- **Attribution vs. Authorship**: Git blame measures line attribution in the surviving codebase. It is not cryptographic proof of intellectual originality, sole authorship, or non-AI generation.
- **Refactoring Impact**: Large-scale formatting, file renames, or subsequent commits by teammates can alter line attribution counts.
- **File Exclusions**: Automated build outputs, lockfiles (`package-lock.json`, `poetry.lock`), generated assets, and vendored code are filtered out before analysis.
- **Scope**: Analysis is restricted to public repositories accessible via HTTPS. Private repositories are not analyzed unless explicit authentication tokens are configured.

---

### 4. LeetCode Analyzer

The LeetCode Analyzer provides algorithmic practice intelligence through a capability-aware architecture that connects to public profile endpoints and export files.

#### Key Capabilities
- **Problem Solving Distribution**: Solved problem counts categorized by difficulty (Easy, Medium, Hard) and acceptance rates.
- **Topic and Category Coverage**: Tag-level breakdown (Algorithms, Data Structures, Dynamic Programming, Graph Theory, etc.) mapped against difficulty tiers.
- **Language Breakdown**: Distribution of programming languages used across accepted submissions.
- **Activity & Consistency**: Submission calendar history and practice progression over time.
- **Contest Metrics**: Contest ratings, global rankings, and attended contest counts when available.
- **Capability-Aware State Handling**: When a data provider does not supply specific metrics (e.g., submission timestamps or private question logs), the system displays the status as **Not Available from Connected Provider** rather than fabricating zero counts.

#### Analytical Distinction
Problem counts are treated as practice consistency signals. They are not represented as standalone proof of software engineering mastery or system design capability.

---

### 5. Job Fit Analysis

The Job Fit module compares candidate evidence against predefined role market profiles (e.g., Full Stack Engineer, Backend Engineer, Frontend Engineer, Data Scientist) or custom Job Descriptions.

- **Requirement Extraction**: Parses required vs. preferred technical competencies, frameworks, and domain knowledge.
- **Direct Matching**: Evaluates evidence strength for each role requirement.
- **Gap Ranking**: Prioritizes skill gaps based on requirement weight multiplied by missing confidence:
  $$\text{Priority} = \text{Weight} \times (1 - \text{Confidence})$$
- **Explainable Feedback**: Generates role readiness percentages and highlights strengths backed by direct evidence citations.

---

### 6. Personalized Milestone Roadmap

The Roadmap Engine translates identified skill gaps into concrete, actionable engineering steps:

- **Root Cause Mapping**: Details why a skill is marked Partial or Not Yet Evidenced.
- **Required Evidence Specification**: Details the specific artifact required to upgrade status (e.g., "Deploy a FastAPI service with Docker and Pytest coverage").
- **Structured Milestones**: Provides sequential milestones with estimated timelines, learning resources, and recommended repository projects.
- **Deterministic Logic with LLM Enrichment**: Milestone structures are determined by the deterministic roadmap engine (`roadmap_engine.py`) and narrated by the LLM explainer with strict citation constraints.

---

### 7. Practical Technical Quiz

The Quiz module provides practical conceptual verification for candidate skill claims:
- **Targeted Question Sets**: Evaluates core domain knowledge across technical stacks (Python, React, Algorithms, Backend).
- **Weighted Assessment**: Generates scored outcomes that convert directly into verifiable `live_probe`/`quiz` evidence records.
- **Evidence Pipeline Integration**: Quiz results feed into the evidence linker with timestamps and score metadata, providing a direct mechanism to corroborate claimed skills.

---

### 8. Cohort and Batch Intelligence

For placement cells, academic departments, and training cohorts, Kareer Kranti provides aggregate intelligence:
- **Cohort Readiness Overview**: Batch-level skill distribution, average readiness scores, and role fit distributions.
- **Skill Gap Heatmaps**: Matrix visualization showing widespread deficiencies across candidate groups.
- **Greedy Workshop Optimizer**: Algorithmic recommendation engine that calculates high-impact group interventions to resolve the largest shared skill deficits.
- **Privacy Threshold Enforcement**: Enforces `SMALL_COHORT_MIN_SIZE = 5`. Aggregated statistics for cohorts with fewer than 5 candidates are suppressed to prevent individual identification.

---

### 9. What-If Simulator

The What-If Simulator enables interactive, exploratory scenario modeling:
- **In-Memory Score Projection**: Clones the candidate's `ScoreInput` object in memory.
- **Synthetic Evidence Injection**: Injects hypothetical achievements (e.g., adding automated tests, publishing a Docker container, raising LeetCode Medium problem count).
- **Instant Delta Analysis**: Re-runs the pure-function scoring calculation to show projected score and readiness changes.
- **Zero Database Mutation**: Calculations are completely isolated and do not modify persistent profile records.

---

## Security and Privacy Protections

| Threat / Risk | Implemented Protection |
| :--- | :--- |
| **Resume Keyword Stuffing & Hidden Text** | PyMuPDF extracts text coordinates, font sizes, and RGB colors. White-on-white text, micro-fonts (<2pt), and off-page text layers are automatically flagged. |
| **Prompt Injection Attacks** | Regex-based adversarial token filtering combined with strict Pydantic schema validation on all LLM outputs. |
| **Arbitrary Code Execution** | Repositories are cloned for static analysis only. The system never executes `npm install`, `pip install`, build scripts, or cloned binaries. |
| **Uncontrolled Cloning & Resource Exhaustion** | Shallow clones (`depth=1`), HTTPS-only URLs, a 50 MB repository size cap (`GITHUB_MAX_CLONE_MB = 50`), and execution timeouts. |
| **SSRF (Server-Side Request Forgery)** | Host validation and protocol restriction on external live probe checks and Git endpoints. |
| **Demographic & Unconscious Bias** | Demographic fields (name, gender, ethnicity, institution) are excluded from the scoring engine inputs. |
| **Cohort Re-identification** | Group aggregation is strictly suppressed for sample sizes below 5 students (`SMALL_COHORT_MIN_SIZE = 5`). |
| **Auditability & Consent** | Explicit candidate consent tracking (`Consent` model) and append-only audit logging (`AuditLog` model). |

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **UI & Styling**: React 18, Tailwind CSS, Lucide React, React Icons, clsx
- **Animation**: Framer Motion
- **Data Visualization**: Recharts (radar charts, area series, bar breakdowns)
- **Streaming**: `eventsource-parser` for Server-Sent Events (SSE)

### Backend & Analysis
- **API Framework**: FastAPI, Uvicorn
- **Language**: Python 3.11+
- **Data Validation & Settings**: Pydantic v2, Pydantic Settings
- **Database & ORM**: SQLAlchemy 2.0 (Async), Alembic, aiosqlite (local SQLite), asyncpg (PostgreSQL), pgvector
- **Document & PDF Parsing**: PyMuPDF (`fitz`), pdfplumber
- **Git & Repository Analysis**: GitPython, PyGithub, Tree-sitter, Radon
- **NLP & String Matching**: RapidFuzz
- **Scientific Computing**: NumPy, SciPy, Pandas
- **LLM Integration**: Google Generative AI (`google-generativeai` / Gemini SDK), OpenAI SDK
- **Logging & Diagnostics**: structlog, rich

### Background Processing & Task Queue
- **Task Queue**: Celery 5.4+
- **Message Broker & Result Store**: Redis 7+

### Infrastructure & Containerization
- **Containers**: Docker, Docker Compose (PostgreSQL 16 + pgvector, Redis, FastAPI, Celery, Next.js)

---

## Project Structure

```
kareer-kranti/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/           # API endpoints (profiles, ownership, leetcode, job_fit, quiz, cohorts, roles, health)
│   │   ├── core/                 # App configuration, database sessions, logging setup
│   │   ├── models/               # SQLAlchemy ORM data models (Evidence, Profile, LeetCode, Ownership, etc.)
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── adapters/         # Input adapters (GitHub, Resume PDF, Portfolio, Live Probe)
│   │   │   ├── analysis/         # Temporal consistency, authenticity detection, skill normalizer
│   │   │   ├── batch/            # Cohort analytics and workshop optimization
│   │   │   ├── explainer/        # LLM explainer with citation enforcement
│   │   │   ├── job_fit/          # Job fit and role profile evaluation service
│   │   │   ├── leetcode/         # Multi-provider LeetCode synchronization and analytics
│   │   │   ├── ownership/        # Git blame runner, repository discovery, author resolution
│   │   │   ├── resume/           # Resume parser and text extraction
│   │   │   ├── roadmap/          # Deterministic roadmap generation engine
│   │   │   └── scoring/          # Pure-function scorer, confidence linker, what-if simulator
│   │   ├── utils/                # Helper utilities and validators
│   │   └── workers/              # Celery application and background task definitions
│   ├── scripts/                  # Role profile builder, evaluation harness, DB migration tools
│   ├── tests/
│   │   ├── fixtures/             # Seed profiles and test datasets
│   │   ├── integration/          # End-to-end integration tests
│   │   └── unit/                 # Unit test suite for scoring, ownership, leetcode, job fit
│   ├── Dockerfile                # Backend container definition
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages (home, leetcode, evidence)
│   │   ├── components/           # Component library (dashboard, evidence, job-fit, leetcode, ownership, quiz, roadmap)
│   │   ├── lib/                  # Typed API client and utilities
│   │   └── types/                # TypeScript interfaces and shared types
│   ├── public/                   # Static branding assets and icons
│   ├── Dockerfile                # Frontend container definition
│   └── package.json              # Node.js dependencies and scripts
├── data/
│   ├── jd_corpus/                # Role baseline job description corpus
│   ├── skill_aliases/            # Technical skill alias mappings
│   └── seed_profiles/            # Benchmark candidate profiles
├── docs/                         # Technical architecture documentation
├── infra/                        # Docker Compose deployment configuration
└── start_servers.bat             # Windows local development startup script
```

---

## Configuration & Environment Variables

Create a `.env` file in `backend/` based on `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Required | Safe Example |
| :--- | :--- | :---: | :--- |
| `APP_ENV` | Application environment (`development` / `production`) | No | `development` |
| `APP_SECRET_KEY` | Secret key for session security and token hashing | Yes | `generate-a-secure-random-key` |
| `LOG_LEVEL` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | No | `INFO` |
| `DATABASE_URL` | Database connection string. If blank, SQLite is used automatically. | No | `postgresql://user:pass@localhost:5432/kareerkranti` |
| `REDIS_URL` | Redis URL for caching and task messaging | No | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Celery broker connection string | No | `redis://localhost:6379/0` |
| `CELERY_RESULT_BACKEND` | Celery result backend connection string | No | `redis://localhost:6379/1` |
| `GITHUB_TOKEN` | GitHub Personal Access Token (raises rate limit from 60 to 5,000 req/hr) | Recommended | `ghp_yourPersonalAccessToken` |
| `GEMINI_API_KEY` | Google Gemini API Key for citation-enforced explanations | Yes | `AIzaSyYourGeminiApiKey` |
| `OPENAI_API_KEY` | Optional OpenAI API Key fallback | No | `sk-yourOpenAiApiKey` |
| `LLM_FAST_MODEL` | Lightweight model for bulk classification | No | `gemini-1.5-flash` |
| `LLM_STRONG_MODEL` | High-capability model for roadmap synthesis | No | `gemini-1.5-pro` |
| `GITHUB_MAX_REPOS_FAST` | Maximum repositories analyzed in fast pass | No | `20` |
| `GITHUB_MAX_REPOS_DEEP` | Maximum repositories cloned in deep pass | No | `5` |
| `GITHUB_MAX_CLONE_MB` | Maximum allowed repository clone size | No | `50` |
| `EVIDENCE_VERIFIED_THRESHOLD` | Threshold for Verified status ($e_k$) | No | `0.6` |
| `EVIDENCE_PARTIAL_THRESHOLD` | Threshold for Partial status ($e_k$) | No | `0.25` |
| `SMALL_COHORT_MIN_SIZE` | Minimum cohort size required to display aggregate stats | No | `5` |
| `CORS_ORIGINS` | Allowed CORS origins for frontend requests | No | `http://localhost:3000` |

---

## Getting Started

### Prerequisites
- **Python**: 3.11 or newer
- **Node.js**: 18.x or 20.x LTS
- **Git**: Installed and available in PATH
- **Redis** *(optional for local development, required for Celery background tasks)*
- **Docker & Docker Compose** *(optional for containerized deployment)*

---

### Local Development Setup

#### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your GITHUB_TOKEN and GEMINI_API_KEY

# Run the FastAPI development server
uvicorn app.main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs`.

#### 2. Frontend Setup
```bash
# Navigate to frontend directory in a separate terminal
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```

The frontend interface will be accessible at `http://localhost:3000`.

---

### Running Background Workers (Optional / Full Async Pass)

To enable asynchronous deep Git cloning and background repository processing:

```bash
# Start Redis (using Docker or local installation)
docker run -p 6379:6379 redis:7-alpine

# In the backend directory with active virtual environment:
celery -A app.workers.celery_app worker --loglevel=info --concurrency=2
```

---

### Running with Docker Compose

Kareer Kranti provides a multi-container Docker Compose configuration that orchestrates the Next.js frontend, FastAPI backend, Celery worker, Redis broker, and PostgreSQL database with pgvector:

```bash
# From the repository root
docker compose -f infra/docker-compose.yml up --build
```

---

## Testing

The backend includes a comprehensive test suite covering unit logic, integration pipelines, and scoring models.

### Running Unit & Integration Tests

```bash
cd backend
python -m pytest tests/unit
```

#### Test Suite Status
- **Unit Tests Collected**: 141 tests across batch analytics, job fit, ownership calculation, Git blame pipelines, repository discovery, resume extraction, roadmap engine, pure-function scoring, and what-if simulation.
- **Results**: 140 tests pass. 1 test (`test_resume_security.py::test_near_white_detection`) is documented as a known boundary-value test under active refinement.

To run end-to-end integration tests:
```bash
python -m pytest tests/integration/test_end_to_end_pipeline.py
```

---

## Evaluation & Validation Harness

The platform includes an automated evaluation harness (`backend/scripts/evaluation_harness.py`) to validate core mathematical and security properties:

```bash
cd backend
python scripts/evaluation_harness.py
```

### Measured Benchmark Properties

1. **Claim Injection Defense**:
   - Injects fabricated technical skills (`QuantumSQL`, `HyperReact`, `DeepScaffold`) into resume inputs without corroborating code evidence.
   - **Result**: 100% detection rate (all 9 injected test claims correctly classified as **Not Yet Evidenced**).
2. **Rank Correlation**:
   - Computes Spearman's rank correlation ($\rho$) between Kareer Kranti computed scores and human-labeled seniority rankings on standardized seed fixtures.
   - **Result**: $\rho = 1.0$ ($p = 0.0$) on reference seed test fixtures ($n = 3$).
3. **Weight Sensitivity Stability**:
   - Perturbs component weights by $\pm 20\%$ across test profiles.
   - **Result**: 100% stability ratio (score deviations remained within a 5-point margin across 30 perturbation runs).

*Note: These metrics represent internal automated validation against benchmark fixtures, not an external population study.*

---

## Known Limitations

- **Git Blame as an Attribution Proxy**: Git blame calculates surviving line counts. It does not prove intellectual originality, detect off-platform code sharing, or measure code quality in isolation.
- **Repository Discovery Constraints**: Only public repositories or repositories accessible via the configured Personal Access Token are analyzed. Unlinked or private work cannot be factored in.
- **LeetCode Data Provider Scope**: Detailed topic-level breakdowns, submission histories, and contest analytics depend on the data returned by the connected LeetCode provider or export file. Unsupported fields are marked as unavailable rather than estimated.
- **Rate Limits**: Unauthenticated GitHub requests are capped at 60 requests/hour by GitHub's API. Supplying a valid `GITHUB_TOKEN` increases this limit to 5,000 requests/hour.
- **Refactoring Dilution**: Major repository refactoring, automated linting sweeps, or squash commits can impact line attribution proportions in collaborative repositories.
- **LLM Narrative Quality**: Explanations and roadmap narratives depend on available upstream Gemini API access. When the API is unavailable, the system defaults to deterministic template-based gap summaries.

---

## Future Work

- **Cryptographic Credential Verification**: Direct verification of institutional certificates, digital diplomas, and verified exam results using standard verifiable credential protocols.
- **Expanded Platform Adapters**: Native adapters for GitLab, Bitbucket, Kaggle, Codeforces, and Stack Overflow.
- **Telemetry-Based Local Activity**: Opt-in developer IDE telemetry integrations to verify local development activity and project iteration patterns.
- **Interactive Code Execution Sandbox**: Automated ephemeral evaluation environments to test candidate code against test suites and performance benchmarks.

---

## Project Status

Kareer Kranti is under active development as part of the DataQuest 3.0 hackathon submission.

---

## License

This project is licensed under the MIT License.