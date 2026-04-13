from sqlalchemy import Column, Integer, String, Float
from app.database import Base


class TrialBalance(Base):
    __tablename__ = "trial_balance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    account_code = Column(String, unique=True, nullable=False)
    classification1 = Column(String)
    classification2 = Column(String)
    cost_center = Column(String)
    account_name = Column(String)
    entry_type = Column(String)
    branch = Column(String)
    division = Column(String)
    accounting_class = Column(String)
    balance = Column(Float)
