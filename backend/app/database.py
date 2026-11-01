
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Use PostgreSQL when DATABASE_URL is configured.
# Otherwise, use the existing local SQLite database.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Render PostgreSQL URLs may use postgres://.
    # SQLAlchemy expects postgresql+psycopg://.
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace(
            "postgres://",
            "postgresql+psycopg://",
            1
        )
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1
        )

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )

else:
    DATABASE_DIR = PROJECT_ROOT / "data"
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)

    DATABASE_URL = f"sqlite:///{(DATABASE_DIR / 'airwise.db').as_posix()}"

    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
