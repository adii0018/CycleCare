"""Atomic Repair ID generation using MongoDB counter sequence."""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from pymongo import ReturnDocument
from pymongo.database import Database

from .mongodb import get_database

logger = logging.getLogger(__name__)

IST_TIMEZONE = ZoneInfo("Asia/Kolkata")
ID_PREFIX = "CC"
COUNTER_COLLECTION = "counters"


def get_ist_year(now_dt: datetime | None = None) -> int:
    """Return the current 4-digit calendar year in Asia/Kolkata timezone."""
    if now_dt is None:
        return datetime.now(IST_TIMEZONE).year
    # Convert provided aware or naive datetime to IST
    if now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=ZoneInfo("UTC"))
    return now_dt.astimezone(IST_TIMEZONE).year


def format_repair_id(year: int, seq: int) -> str:
    """Format year and sequence number into the standard Repair ID string."""
    return f"{ID_PREFIX}-{year}-{seq:05d}"


def get_next_sequence(db: Database, year: int) -> int:
    """Atomically increment and return the next counter sequence for the given year."""
    counter_id = f"repair_id_{year}"
    doc = db[COUNTER_COLLECTION].find_one_and_update(
        {"_id": counter_id},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(doc["seq"])


def generate_repair_id(db: Database | None = None, at_time: datetime | None = None) -> str:
    """Generate the next unique atomic Repair ID."""
    database = db if db is not None else get_database()
    year = get_ist_year(at_time)
    seq = get_next_sequence(database, year)
    return format_repair_id(year, seq)
