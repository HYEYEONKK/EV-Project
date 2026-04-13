from pathlib import Path
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DB_PATH = Path(__file__).parent.parent / "data" / "easyview.db"
DB_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app.models import journal_entry, trial_balance, sales_ledger, business_plan  # noqa
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
