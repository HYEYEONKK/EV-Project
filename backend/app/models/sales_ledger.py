from sqlalchemy import Column, Integer, String, Float, Date, Index
from app.database import Base


class SalesLedger(Base):
    __tablename__ = "sales_ledger"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vendor = Column(String)
    product_name = Column(String)
    product_category = Column(String)
    spec = Column(String)
    region = Column(String)
    district = Column(String)
    date = Column(Date, nullable=False)
    quantity = Column(Float)
    amount = Column(Float)
    sales_key = Column(String)
    period = Column(String)
    cumulative_amount = Column(Float)

    __table_args__ = (
        Index("idx_sales_date", "date"),
        Index("idx_sales_vendor", "vendor"),
        Index("idx_sales_category", "product_category"),
        Index("idx_sales_region", "region"),
    )
