"""
데이터 문의 접수 API
- 문의 내용을 kr_easyview@pwc.com 으로 이메일 발송
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class InquiryRequest(BaseModel):
    company: str
    name: str
    email: str
    phone: str
    erp: str
    country: str
    timeline: str
    note: str = ""

@router.post("/submit")
async def submit_inquiry(req: InquiryRequest):
    """문의 접수 후 이메일 발송"""

    # 이메일 본문 구성
    body = f"""
[Easy View+ 데이터 문의 접수]

■ 회사명: {req.company}
■ 담당자명: {req.name}
■ 이메일: {req.email}
■ 연락처: {req.phone}
■ 사용 중인 ERP: {req.erp}
■ 국가: {req.country}
■ 희망 일정: {req.timeline}
■ 추가 요청사항: {req.note or "없음"}
"""

    try:
        msg = MIMEMultipart()
        msg["From"] = "easyview-noreply@pwc.com"
        msg["To"] = "kr_easyview@pwc.com"
        msg["Subject"] = f"[Easy View+] 데이터 문의 - {req.company} ({req.name})"
        msg.attach(MIMEText(body, "plain", "utf-8"))

        # SMTP 발송 시도 (실패해도 접수는 성공 처리)
        try:
            with smtplib.SMTP("localhost", 25, timeout=5) as server:
                server.send_message(msg)
        except Exception:
            # SMTP 서버가 없는 환경에서도 접수는 정상 처리
            print(f"[INFO] 이메일 발송 실패 (SMTP 미설정) - 문의 내용:\n{body}")

        return {"success": True, "message": "문의가 접수되었습니다."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
