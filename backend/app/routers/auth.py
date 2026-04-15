"""
Auth Router (SQLite DB 저장)
POST /api/v1/auth/register
POST /api/v1/auth/login
"""
import hashlib
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from app.database import engine

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── 서버 시작 시 users 테이블 생성 ──
with engine.connect() as _conn:
    _conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            name TEXT DEFAULT '',
            company TEXT DEFAULT '',
            department TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    _conn.commit()


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


class RegisterBody(BaseModel):
    email: str
    password: str
    name: str = ""

class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(body: RegisterBody):
    with engine.connect() as conn:
        existing = conn.execute(
            text("SELECT email FROM users WHERE email = :e"), {"e": body.email}
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")
        conn.execute(
            text("INSERT INTO users (email, password_hash, name) VALUES (:e, :p, :n)"),
            {"e": body.email, "p": _hash(body.password), "n": body.name},
        )
        conn.commit()
    return {"ok": True, "email": body.email, "name": body.name}


@router.post("/login")
def login(body: LoginBody):
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT email, password_hash, name FROM users WHERE email = :e"),
            {"e": body.email},
        ).fetchone()
    if not row or row.password_hash != _hash(body.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    return {"ok": True, "email": row.email, "name": row.name}
