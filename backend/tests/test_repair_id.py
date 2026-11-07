"""Tests for atomic Repair ID generation and IST year rollover logic."""

from datetime import UTC, datetime

from infrastructure.repair_id import format_repair_id, generate_repair_id, get_ist_year


def test_format_repair_id():
    """Verify zero-padded format CC-YYYY-NNNNN."""
    assert format_repair_id(2026, 1) == "CC-2026-00001"
    assert format_repair_id(2026, 42) == "CC-2026-00042"
    assert format_repair_id(2026, 12345) == "CC-2026-12345"


def test_repair_id_increments_atomically(test_db):
    """Subsequent calls must increment sequence number."""
    id1 = generate_repair_id(db=test_db)
    id2 = generate_repair_id(db=test_db)
    id3 = generate_repair_id(db=test_db)

    seq1 = int(id1.split("-")[2])
    seq2 = int(id2.split("-")[2])
    seq3 = int(id3.split("-")[2])

    assert seq2 == seq1 + 1
    assert seq3 == seq2 + 1


def test_repair_id_year_rollover_at_ist_boundary(test_db):
    """Verify year transitions at midnight Asia/Kolkata (UTC+5:30).

    Dec 31, 2026, 18:29:59 UTC -> 23:59:59 IST (Year 2026)
    Dec 31, 2026, 18:30:00 UTC -> 00:00:00 IST (Year 2027)
    """
    dt_before_midnight = datetime(2026, 12, 31, 18, 29, 59, tzinfo=UTC)
    dt_after_midnight = datetime(2026, 12, 31, 18, 30, 0, tzinfo=UTC)

    year_before = get_ist_year(dt_before_midnight)
    year_after = get_ist_year(dt_after_midnight)

    assert year_before == 2026
    assert year_after == 2027

    # Generate IDs with overridden time
    id_before = generate_repair_id(db=test_db, at_time=dt_before_midnight)
    id_after = generate_repair_id(db=test_db, at_time=dt_after_midnight)

    assert id_before.startswith("CC-2026-")
    assert id_after.startswith("CC-2027-")
