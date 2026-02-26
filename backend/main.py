import sys
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time

# Ensure the backend and project root are on the path for all platforms
_this_dir = os.path.dirname(os.path.abspath(__file__))
_root_dir = os.path.dirname(_this_dir)
if _this_dir not in sys.path:
    sys.path.insert(0, _this_dir)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from config import settings
from database import engine, Base

# Import routes
from routes.auth import router as auth_router
from routes.projects import router as projects_router
from routes.executions import router as executions_router
from routes.adversarial import router as adversarial_router
from routes.dashboard import router as dashboard_router

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("auditai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting AuditAI Backend...")
    # Create enum types safely (PostgreSQL has no CREATE TYPE IF NOT EXISTS)
    from sqlalchemy import text
    with engine.connect() as conn:
        for type_name, values in [
            ("plantier", "'free', 'pro', 'enterprise'"),
            ("executionstatus", "'success', 'failure'"),
            ("steptype", "'prompt', 'system_prompt', 'retrieval', 'tool_call', 'tool_output', 'response'"),
        ]:
            conn.execute(text(f"""
                DO $$ BEGIN
                    CREATE TYPE {type_name} AS ENUM ({values});
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
            """))
        conn.commit()
        logger.info("✅ Enum types ready")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables ready")
    yield
    logger.info("👋 Shutting down AuditAI Backend")


app = FastAPI(
    title="AuditAI – AI Reliability & Compliance Auditor",
    description="Datadog for LLM Agents. Audit, evaluate, and stress-test LLM-based applications.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – allows your Vercel frontend to call the Render backend
# Set FRONTEND_URL env var in production (e.g. https://auditai.vercel.app)
_allowed_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
_frontend_url = os.environ.get("FRONTEND_URL")
if _frontend_url:
    _allowed_origins.append(_frontend_url)
else:
    _allowed_origins.append("*")  # fallback for dev

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    response.headers["X-Response-Time-Ms"] = str(duration)
    return response


# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(executions_router, prefix="/api")
app.include_router(adversarial_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "AuditAI",
        "tagline": "Datadog for LLM Agents",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
