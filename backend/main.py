"""
Worldwide Easy View — FastAPI Backend
실행: uvicorn main:app --reload --port 5000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from routers import bi, upload

BASE_DIR     = Path(__file__).parent          # EV 시스템/backend
FRONTEND_DIR = BASE_DIR.parent / "frontend"   # EV 시스템/frontend
FRAME_DIR    = BASE_DIR.parent / "Frame"      # EV 시스템/Frame

app = FastAPI(title="Worldwide Easy View API", version="1.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files ──────────────────────────────────────────────────────────────
app.mount("/css",   StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
app.mount("/js",    StaticFiles(directory=str(FRONTEND_DIR / "js")),  name="js")
app.mount("/frame", StaticFiles(directory=str(FRAME_DIR)),             name="frame")
app.mount("/Frame", StaticFiles(directory=str(FRAME_DIR)),             name="Frame")

# ── API Routers ───────────────────────────────────────────────────────────────
app.include_router(bi.router,     prefix="/api/bi", tags=["BI Analysis"])
app.include_router(upload.router, prefix="/api",    tags=["Upload"])

# ── HTML Pages ────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
def index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

@app.get("/login", include_in_schema=False)
@app.get("/login.html", include_in_schema=False)
def login():
    return FileResponse(str(FRONTEND_DIR / "login.html"))

@app.get("/input", include_in_schema=False)
@app.get("/input.html", include_in_schema=False)
def input_page():
    return FileResponse(str(FRONTEND_DIR / "input.html"))

@app.get("/output", include_in_schema=False)
@app.get("/output.html", include_in_schema=False)
def output_page():
    return FileResponse(str(FRONTEND_DIR / "output.html"))
