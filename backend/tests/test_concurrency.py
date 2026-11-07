"""Concurrency test verifying safe Repair ID generation under concurrent load."""

import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed

from apps.repairs.services import register_customer_repair


def test_concurrent_registrations_yield_unique_repair_ids(test_db):
    """50 concurrent submissions must produce 50 unique sequential Repair IDs without errors."""
    num_submissions = 50

    def submit_one(index: int) -> dict:
        validated_data = {
            "customer_name": f"Concurrent User {index}",
            "mobile": f"98765{index:05d}",
            "repair_problems": ["puncture_tyre"],
            "other_problem_text": None,
            "additional_details": None,
            "idempotency_key": str(uuid.uuid4()),
            "website": "",
        }
        res, is_created = register_customer_repair(validated_data, photo_files=[], db=test_db)
        assert is_created is True
        return res

    results = []
    # Execute with 10 concurrent threads against MongoDB Atlas
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(submit_one, i) for i in range(num_submissions)]
        for future in as_completed(futures):
            results.append(future.result())

    assert len(results) == num_submissions

    repair_ids = [r["repair_id"] for r in results]
    unique_ids = set(repair_ids)

    # 1. All 50 IDs must be strictly unique
    assert len(unique_ids) == num_submissions

    # 2. Extract sequences and verify all 50 integers from 1 to 50 exist
    sequences = sorted([int(rid.split("-")[2]) for rid in repair_ids])
    assert sequences == list(range(1, num_submissions + 1))

    # 3. Verify exactly 50 records exist in MongoDB repairs collection
    assert test_db["repairs"].count_documents({}) == num_submissions
