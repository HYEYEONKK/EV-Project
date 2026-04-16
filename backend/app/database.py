import shutil
from pathlib import Path
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Source DB (from git repo, read-only on Render)
SRC_DB = Path(__file__).parent.parent / "data" / "easyview.db"

# Runtime DB (writable location)
import tempfile
RUNTIME_DB = Path(tempfile.gettempdir()) / "easyview.db"

# On startup: copy source DB to writable location if not already there
if SRC_DB.exists() and not RUNTIME_DB.exists():
    shutil.copy2(str(SRC_DB), str(RUNTIME_DB))

# Use runtime DB if it exists, otherwise fall back to source
DB_PATH = RUNTIME_DB if RUNTIME_DB.exists() else SRC_DB
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
    cursor.execute("PRAGMA cache_size=-64000")
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
