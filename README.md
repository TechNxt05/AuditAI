<p align="center">
  <img src="https://img.shields.io/badge/AuditAI-v1.0.0-6366f1?style=for-the-badge&logo=shield&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
</p>

<h1 align="center">🛡️ AuditAI</h1>
<h3 align="center">AI Reliability & Compliance Auditor</h3>
<p align="center"><em>Datadog for LLM Agents</em></p>

<p align="center">
  Audit, evaluate, and stress-test LLM-based applications — RAG systems, multi-agent workflows, copilots & more.
</p>

---

## 🎯 What is AuditAI?

AuditAI is a **production-grade SaaS platform** that provides observability and reliability scoring for AI applications. Think of it as Datadog, but specifically built for LLM-powered systems.

**The Problem:** LLM applications fail silently — they hallucinate, leak PII, fall victim to prompt injections, and misuse tools. Traditional monitoring tools can't catch this.

**The Solution:** AuditAI captures every execution trace, runs deterministic evaluations across 5 reliability dimensions, and stress-tests your AI with adversarial simulations — all without making a single LLM API call.

---

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 📡 Trace Ingestion
Capture complete execution traces via Python SDK or REST API:
- User & system prompts
- Retrieved documents (RAG)
- Tool calls & outputs
- Final LLM response
- Model, tokens, latency

</td>
<td width="50%">

### 🧠 5-Point Evaluation Engine
Deterministic scoring — no randomness, fully reproducible:
- **Hallucination Detection** — TF-IDF cosine similarity
- **Faithfulness Scoring** — context utilization check
- **Injection Risk** — 30+ attack patterns
- **Tool Usage Validation** — format & necessity
- **Compliance** — PII, secrets, data leakage

</td>
</tr>
<tr>
<td>

### 🧪 Adversarial Testing
Stress-test your AI with automated attack simulations:
- Prompt injection payloads
- Fake retrieval document injection
- Context poisoning
- Compliance stress testing
- Robustness delta scoring

</td>
<td>

### 📊 Rich Dashboard
Premium dark-themed UI with:
- Reliability score trends
- Execution timeline charts
- Risk distribution analysis
- Interactive React Flow trace graphs
- Radar chart evaluation breakdowns

</td>
</tr>
<tr>
<td>

### 🔁 Replay Engine
Re-run any execution with a different model:
- Swap models (GPT-4 → Claude → Gemini)
- Compare metrics side-by-side
- Track performance across providers

</td>
<td>

### 🔐 Enterprise Ready
Built for production from day one:
- JWT authentication + bcrypt
- Multi-tenant project isolation
- Plan tiers (Free / Pro / Enterprise)
- Usage quotas & rate limiting
- Docker deployment ready

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
auditai/
├── frontend/          Next.js 14 · TypeScript · Tailwind · Recharts · React Flow
├── backend/           FastAPI · SQLAlchemy 2.0 · Pydantic v2 · PostgreSQL
├── evaluator/         Deterministic scoring engine (5 modules)
├── sdk/python/        Python SDK for trace ingestion
├── docker/            Docker Compose + Dockerfile
├── render.yaml        Render deployment config
└── README.md
```

```mermaid
graph LR
    subgraph Client
        SDK["🐍 Python SDK"]
        API["🌐 REST API"]
    end

    subgraph Backend ["⚡ FastAPI Backend"]
        AUTH["🔐 Auth"]
        INGEST["📡 Ingestion"]
        EVAL["🧠 Evaluator"]
        ADV["🧪 Adversarial"]
        REPLAY["🔁 Replay"]
        DASH["📊 Dashboard"]
    end

    subgraph Storage
        DB[("🗄️ PostgreSQL\n+ pgvector")]
    end

    subgraph Frontend ["🖥️ Next.js Frontend"]
        UI["Dashboard · Projects\nExecution Detail · Risk Insights"]
    end

    SDK --> INGEST
    API --> INGEST
    INGEST --> DB
    EVAL --> DB
    ADV --> DB
    DASH --> DB
    UI --> AUTH
    UI --> DASH
    UI --> EVAL
```

---

## 🚀 Quick Start

### Prerequisites
| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 15+ with pgvector |

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Configure
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auditai"
export SECRET_KEY="your-secret-key"

# Start server
uvicorn main:app --reload --port 8000

# Seed demo data (optional)
python seed.py
# → Creates demo@auditai.com / demo123456
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** → Login with demo credentials.

### 3. Docker (Full Stack)

```bash
cd docker
docker-compose up --build
```

---

## 📡 API Reference

Interactive docs available at **`/docs`** (Swagger UI) when the backend is running.

| Method | Endpoint | Description |
|:------:|----------|-------------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Get JWT access token |
| `GET` | `/api/auth/me` | Current user info |
| `POST` | `/api/projects/` | Create project |
| `GET` | `/api/projects/` | List user's projects |
| `POST` | `/api/executions/ingest` | SDK-friendly trace ingestion |
| `POST` | `/api/executions/` | Create execution with trace steps |
| `GET` | `/api/executions/{id}` | Get execution with full trace |
| `POST` | `/api/executions/{id}/evaluate` | Run 5-point evaluation |
| `POST` | `/api/executions/{id}/replay` | Replay with new model |
| `POST` | `/api/adversarial/{id}/run` | Run adversarial test suite |
| `GET` | `/api/dashboard/stats` | Aggregated dashboard metrics |

---

## 🐍 Python SDK

```bash
cd sdk/python && pip install -e .
```

```python
from auditai import AuditAI

client = AuditAI(api_key="your-jwt-token", base_url="http://localhost:8000")

# 1. Log an execution trace
result = client.log_execution(
    project_name="my-rag-app",
    prompt="What is the capital of France?",
    response="The capital of France is Paris.",
    retrieval_docs=["France is a country in Europe. Its capital is Paris."],
    tools=[{"name": "search", "arguments": {"query": "capital of France"}}],
    tool_outputs=[{"result": "Paris is the capital of France"}],
    model="gpt-4",
    total_tokens=150,
    latency_ms=1200.0,
)
print(f"Execution ID: {result['id']}")

# 2. Run evaluation
evaluation = client.evaluate(result["id"])
print(f"Overall Score: {evaluation['overall_score']}")

# 3. Run adversarial tests
tests = client.run_adversarial(result["id"])
for t in tests:
    print(f"  {t['test_type']}: {t['result_score']}")

# 4. Get dashboard stats
stats = client.get_dashboard()
print(f"Total Executions: {stats['total_executions']}")
```

---

## 🧠 Evaluation Engine

All scoring is **100% deterministic** — uses TF-IDF cosine similarity and regex pattern matching. No LLM API calls, no randomness, fully reproducible results.

| Module | What It Checks | Technique |
|--------|---------------|-----------|
| **Hallucination** | Response grounded in retrieval docs? | Sentence-level TF-IDF cosine similarity |
| **Faithfulness** | Retrieved docs actually used in response? | Token overlap + phrase matching + similarity |
| **Injection Risk** | Prompt contains attack patterns? | 30+ regex patterns across 6 categories |
| **Tool Validator** | Tools used correctly? | Format check + output referencing + necessity |
| **Compliance** | PII or secrets exposed? | Regex for email, phone, SSN, Aadhaar, API keys |

### Injection Detection Categories
`instruction_override` · `prompt_extraction` · `role_override` · `safety_bypass` · `data_exfiltration` · `code_injection`

### Compliance Checks
`email` · `phone` · `SSN` · `Aadhaar` · `credit_card` · `IP_address` · `passwords` · `API_keys` · `private_keys`

---

## 🧪 Adversarial Test Suite

| Test | Description |
|------|-------------|
| **Prompt Injection** | Injects 4 known attack payloads, measures injection score delta |
| **Fake Retrieval** | Adds misinformation documents, measures hallucination impact |
| **Context Poisoning** | Contradicts retrieved context, measures faithfulness delta |
| **Compliance Stress** | Injects PII-laden content, validates detection capability |

Each test returns a **robustness score** (0–1) and **vulnerability classification** (low/medium/high).

---

## 🌐 Deployment

### Backend → [Render](https://render.com) (Free)

| Setting | Value |
|---------|-------|
| Runtime | Python 3 |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `cd backend && gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --timeout 120` |

**Environment Variables:**
| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `PYTHONPATH` | `/opt/render/project/src/backend:/opt/render/project/src` |
| `FRONTEND_URL` | Your Vercel deployment URL |

### Frontend → [Vercel](https://vercel.com) (Free)

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Root Directory | `frontend` |
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com/api` |

### Database → [Neon](https://neon.tech) (Free)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 🗄️ Database Schema

```mermaid
erDiagram
    Users ||--o{ Projects : owns
    Projects ||--o{ Executions : contains
    Executions ||--o{ TraceSteps : has
    Executions ||--o{ Evaluations : scored_by
    Executions ||--o{ AdversarialTests : tested_by

    Users {
        uuid id PK
        string email UK
        string hashed_password
        enum plan_tier
        int execution_count
    }

    Projects {
        uuid id PK
        uuid user_id FK
        string name
    }

    Executions {
        uuid id PK
        uuid project_id FK
        string model_name
        int total_tokens
        float latency_ms
        enum status
    }

    TraceSteps {
        uuid id PK
        uuid execution_id FK
        int step_order
        enum step_type
        jsonb content
        float latency_ms
    }

    Evaluations {
        uuid id PK
        uuid execution_id FK
        float hallucination_score
        float faithfulness_score
        float injection_risk_score
        float compliance_score
        float tool_usage_score
        float overall_score
        jsonb failure_taxonomy
    }

    AdversarialTests {
        uuid id PK
        uuid execution_id FK
        string test_type
        float result_score
        jsonb details
    }
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 · TypeScript · Tailwind CSS · Recharts · React Flow · Lucide Icons |
| **Backend** | FastAPI · SQLAlchemy 2.0 · Pydantic v2 · Gunicorn + Uvicorn |
| **Database** | PostgreSQL 15 · pgvector |
| **Auth** | JWT (python-jose) · bcrypt (passlib) |
| **Evaluator** | TF-IDF · Cosine Similarity · Regex Pattern Engine |
| **SDK** | Python · requests |
| **DevOps** | Docker · Docker Compose · Render · Vercel · Neon |

---

## 🧪 Testing

```bash
cd backend
python -m pytest tests/ -v
```

Test suite covers:
- ✅ Hallucination detection (grounded vs hallucinated responses)
- ✅ Faithfulness scoring (faithful vs unfaithful)
- ✅ Injection detection (clean vs malicious prompts)
- ✅ Tool validation (valid vs invalid usage)
- ✅ Compliance checking (clean vs PII-laden content)
- ✅ Determinism verification (same input → same output)
- ✅ Adversarial simulation (injection compounding, fake retrieval impact)

---

## 📁 Project Structure

```
auditai/
├── backend/
│   ├── main.py                 # FastAPI app factory
│   ├── config.py               # Pydantic settings
│   ├── database.py             # SQLAlchemy engine
│   ├── models.py               # 6 database models
│   ├── schemas.py              # Pydantic v2 schemas
│   ├── auth.py                 # JWT + bcrypt utilities
│   ├── deps.py                 # FastAPI dependencies
│   ├── seed.py                 # Demo data seeder
│   ├── routes/
│   │   ├── auth.py             # Register, login, me
│   │   ├── projects.py         # CRUD + multi-tenant
│   │   ├── executions.py       # Ingest, evaluate, replay
│   │   ├── adversarial.py      # Run attack simulations
│   │   └── dashboard.py        # Aggregated statistics
│   ├── services/
│   │   ├── evaluation.py       # Orchestrates 5 evaluators
│   │   ├── adversarial.py      # 4 adversarial test types
│   │   ├── replay.py           # Model swap & re-run
│   │   └── quota.py            # Plan tier enforcement
│   └── tests/
│       ├── test_evaluator.py   # Deterministic eval tests
│       └── test_adversarial.py # Adversarial sim tests
├── evaluator/
│   ├── __init__.py             # Public API
│   ├── hallucination.py        # Sentence-level grounding
│   ├── faithfulness.py         # Context utilization
│   ├── injection.py            # 30+ attack patterns
│   ├── tool_validator.py       # Tool usage checks
│   ├── compliance.py           # PII & secret detection
│   ├── similarity.py           # TF-IDF engine
│   └── utils.py                # Text processing
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/      # Stats + charts
│       │   ├── projects/       # CRUD + detail view
│       │   ├── executions/     # Trace graph + eval radar
│       │   ├── risks/          # Risk distribution + alerts
│       │   ├── login/          # Auth
│       │   └── register/       # Auth
│       ├── components/
│       │   └── Sidebar.tsx     # Navigation
│       └── lib/
│           ├── api.ts          # API client
│           └── auth.tsx        # Auth context
├── sdk/python/
│   └── auditai/
│       ├── __init__.py
│       └── client.py           # AuditAI SDK class
├── docker/
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── render.yaml                 # Render Blueprint
├── build.sh                    # Render build script
└── .gitignore
```

---

## 📄 License

MIT License — free for personal and commercial use.

---

<p align="center">
  Built with ❤️ for the AI reliability community
</p>
