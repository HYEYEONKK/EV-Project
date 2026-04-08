"""
File Upload Router
POST /api/upload — JE + TB Excel 업로드, bi_engine 캐시 갱신
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import shutil
import datetime

from engine import bi_engine as be

router = APIRouter()

UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload(
    journalFile: UploadFile = File(..., description="분개장 Excel (.xlsx)"),
    trialFile:   UploadFile = File(..., description="시산표 Excel (.xlsx)"),
    baseMonth:   str = Form("", description="기준월 (YYYY-MM)"),
    company:     str = Form("", description="회사명"),
):
    # 파일 저장
    je_path = UPLOAD_DIR / "JE.xlsx"
    tb_path = UPLOAD_DIR / "TB.xlsx"

    with je_path.open("wb") as f:
        shutil.copyfileobj(journalFile.file, f)
    with tb_path.open("wb") as f:
        shutil.copyfileobj(trialFile.file, f)

    # bi_engine 캐시 갱신
    be.set_data_paths(je_path, tb_path)

    # 기준월 파싱
    try:
        parts  = baseMonth.split("-")
        year   = int(parts[0])
        month  = int(parts[1])
    except Exception:
        now    = datetime.datetime.now()
        year, month = now.year, now.month

    return {"year": year, "month": month, "company": company}
