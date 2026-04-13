from sqlalchemy import Column, Integer, String, Float, Date, Index
from app.database import Base


class BusinessPlan(Base):
    __tablename__ = "business_plan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False)
    amount = Column(Float)
    item = Column(String, nullable=False)

    __table_args__ = (
        Index("idx_plan_date", "date"),
        Index("idx_plan_item", "item"),
    )

#수정test