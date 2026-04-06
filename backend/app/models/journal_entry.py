from sqlalchemy import Column, Integer, String, Float, Date, Index
from app.database import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False)
    je_number = Column(String)
    debit_credit = Column(String(1), nullable=False)  # 'D' or 'C'
    amount = Column(Float, nullable=False)
    department = Column(String)
    description = Column(String)
    account_code = Column(String, nullable=False)
    classification1 = Column(String)
    classification2 = Column(String)
    classification3 = Column(String)
    classification4 = Column(String)
    cost_center = Column(String)
    division = Column(String)
    branch = Column(String)
    entry_type = Column(String, nullable=False)  # 'BS', 'PL', 'IT'

    __table_args__ = (
        Index("idx_je_date", "date"),
        Index("idx_je_date_type", "date", "entry_type"),
        Index("idx_je_account", "account_code"),
        Index("idx_je_division", "division"),
        Index("idx_je_branch", "branch"),
        Index("idx_je_entry_type", "entry_type"),
    )
