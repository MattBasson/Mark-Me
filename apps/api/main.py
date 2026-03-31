from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from apps.api.config import settings
from apps.api.database import init_db
from apps.api.routes import assignments, submissions, marking


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Mark-Me API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")
app.mount("/processed", StaticFiles(directory=str(settings.processed_dir)), name="processed")

app.include_router(assignments.router, prefix="/assignments", tags=["assignments"])
app.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
app.include_router(marking.router, prefix="/submissions", tags=["marking"])


@app.get("/health")
async def health():
    return {"status": "ok", "model": "claude-sonnet-4-6"}
