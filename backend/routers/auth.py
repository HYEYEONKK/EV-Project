"""
Auth Router
POST /api/auth/register  — 회원가입
POST /api/auth/login     — 로그인
GET  /api/auth/me        — 내 정보 조회
PUT  /api/auth/me        — 내 정보 수정
"""

import json
import hashlib
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# 사용자 DB: JSON 파일로 저장
DB_PATH = Path(__file__).parent.parent / "users.json"


def _load() -> dict:
    if DB_PATH.exists():
        return json.loads(DB_PATH.read_text(encoding="utf-8"))
    return {}


def _save(data: dict):
    DB_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    email: str
    password: str
    name: str = ""
    company: str = ""
    department: str = ""
    phone: str = ""


class LoginBody(BaseModel):
    email: str
    password: str


class UpdateBody(BaseModel):
    name: str = ""
    company: str = ""
    department: str = ""
    phone: str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/register")
def register(body: RegisterBody):
    users = _load()
    if body.email in users:
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다.")
    users[body.email] = {
        "email":      body.email,
        "password":   _hash(body.password),
        "name":       body.name,
        "company":    body.company,
        "department": body.department,
        "phone":      body.phone,
    }
    _save(users)
    return {"ok": True}


@router.post("/login")
def login(body: LoginBody):
    users = _load()
    user = users.get(body.email)
    if not user or user["password"] != _hash(body.password):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    return {
        "email":      user["email"],
        "name":       user.get("name", ""),
        "company":    user.get("company", ""),
        "department": user.get("department", ""),
        "phone":      user.get("phone", ""),
    }


@router.get("/me")
def get_me(email: str):
    users = _load()
    user = users.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return {
        "email":      user["email"],
        "name":       user.get("name", ""),
        "company":    user.get("company", ""),
        "department": user.get("department", ""),
        "phone":      user.get("phone", ""),
    }


@router.put("/me")
def update_me(email: str, body: UpdateBody):
    users = _load()
    if email not in users:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    users[email].update({
        "name":       body.name,
        "company":    body.company,
        "department": body.department,
        "phone":      body.phone,
    })
    _save(users)
    return {"ok": True}
