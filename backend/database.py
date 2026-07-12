from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

BASE_DIR = Path(__file__).resolve().parent
SQLALCHEMY_DATABASE_URL = f"sqlite:///{BASE_DIR / 'tourism.db'}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_sqlite_schema():
    booking_columns = {
        "booking_status": "ALTER TABLE bookings ADD COLUMN booking_status VARCHAR DEFAULT 'confirmed'",
        "payment_status": "ALTER TABLE bookings ADD COLUMN payment_status VARCHAR DEFAULT 'pending'",
        "payment_method": "ALTER TABLE bookings ADD COLUMN payment_method VARCHAR DEFAULT 'upi'",
        "payment_reference": "ALTER TABLE bookings ADD COLUMN payment_reference VARCHAR",
        "created_at": "ALTER TABLE bookings ADD COLUMN created_at VARCHAR",
        "pricing_breakdown": "ALTER TABLE bookings ADD COLUMN pricing_breakdown TEXT",
    }

    with engine.begin() as connection:
        existing_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(bookings)")).fetchall()
        }

        for column_name, ddl in booking_columns.items():
            if column_name not in existing_columns:
                connection.execute(text(ddl))

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
