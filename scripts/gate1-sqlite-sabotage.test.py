import sqlite3
import sys
import os
import uuid

db_path = os.path.join(os.path.dirname(__file__), "..", "data", "reels.sqlite")
schema_path = os.path.join(os.path.dirname(__file__), "..", "schema.sql")

if not os.path.exists(db_path):
    print(f"ERROR: SQLite database file not found at {db_path}")
    sys.exit(1)

con = sqlite3.connect(db_path)
con.execute("PRAGMA foreign_keys = ON;")

if os.path.exists(schema_path):
    with open(schema_path, "r", encoding="utf-8") as f:
        con.executescript(f.read())

passed = 0
failed = 0

print("=== REELS MAKER STUDIO: GATE 1 RAW SQLITE SABOTAGE TEST ===")

# --- TEST 1: Negative/Zero start_verse CHECK Constraint Sabotage ---
print("\n[TEST 1] Attempting to insert start_verse = 0 into render_jobs...")
try:
    con.execute("""
        INSERT INTO render_jobs (id, reader, surah_id, start_verse, end_verse, duration_seconds, output_file_name, output_full_path, status)
        VALUES ('job-sabotage-zero', 'alafasy', 1, 0, 5, 30, 'file.mp4', '/path/file.mp4', 'COMPLETED')
    """)
    con.commit()
    print("FAILED: start_verse = 0 was accepted! CHECK constraint failed.")
    failed += 1
except sqlite3.IntegrityError as e:
    print(f"PASSED: SQLite engine rejected insertion as expected: {e}")
    passed += 1

# --- TEST 2: end_verse < start_verse CHECK Constraint Sabotage ---
print("\n[TEST 2] Attempting to insert end_verse (3) < start_verse (5) into render_jobs...")
try:
    con.execute("""
        INSERT INTO render_jobs (id, reader, surah_id, start_verse, end_verse, duration_seconds, output_file_name, output_full_path, status)
        VALUES ('job-sabotage-reversed', 'alafasy', 1, 5, 3, 30, 'file.mp4', '/path/file.mp4', 'COMPLETED')
    """)
    con.commit()
    print("FAILED: Reversed verse bounds were accepted! CHECK constraint failed.")
    failed += 1
except sqlite3.IntegrityError as e:
    print(f"PASSED: SQLite engine rejected insertion as expected: {e}")
    passed += 1

# --- TEST 3: Foreign Key Constraint Sabotage (Non-existent reader) ---
print("\n[TEST 3] Attempting to insert orphan render_job with non-existent reader...")
try:
    con.execute("""
        INSERT INTO render_jobs (id, reader, surah_id, start_verse, end_verse, duration_seconds, output_file_name, output_full_path, status)
        VALUES ('job-sabotage-reader', 'non-existent-reciter', 1, 1, 7, 45, 'file.mp4', '/path/file.mp4', 'COMPLETED')
    """)
    con.commit()
    print("FAILED: Orphan render_job was accepted! Foreign key constraint failed.")
    failed += 1
except sqlite3.IntegrityError as e:
    print(f"PASSED: SQLite engine rejected insertion as expected: {e}")
    passed += 1

# Unique IDs for trigger tests
test_run_id = uuid.uuid4().hex[:8]
job_id = f"job-sabotage-{test_run_id}"
audit_id = f"audit-sabotage-{test_run_id}"

# --- TEST 4: Append-Only Trigger Sabotage (DELETE Blocked on render_jobs) ---
print("\n[TEST 4] Inserting valid render_job, then attempting DELETE...")
con.execute("""
    INSERT INTO render_jobs (id, reader, surah_id, start_verse, end_verse, duration_seconds, output_file_name, output_full_path, status)
    VALUES (?, 'alafasy', 1, 1, 7, 45, 'reel_sabotage.mp4', '/data/output/reel_sabotage.mp4', 'COMPLETED')
""", (job_id,))
con.commit()

try:
    con.execute("DELETE FROM render_jobs WHERE id = ?", (job_id,))
    con.commit()
    print("FAILED: Render job was deleted! Immutability trigger failed.")
    failed += 1
except sqlite3.DatabaseError as e:
    if "REEL_JOB_IMMUTABLE" in str(e):
        print(f"PASSED: SQLite BEFORE DELETE trigger successfully blocked job deletion: {e}")
        passed += 1
    else:
        print(f"FAILED: Unexpected error: {e}")
        failed += 1

# --- TEST 5: Append-Only Trigger Sabotage (DELETE Blocked on audit_ledger) ---
print("\n[TEST 5] Inserting valid audit record, then attempting DELETE...")
con.execute("""
    INSERT INTO audit_ledger (aggregate_type, aggregate_id, event_type, payload_json, prev_hash, signature_sha256)
    VALUES ('REEL_STUDIO', ?, 'TEST_AUDIT', '{"test": true}', '0000000000000000000000000000000000000000000000000000000000000000', 'mock_hash')
""", (audit_id,))
con.commit()

row = con.execute("SELECT id FROM audit_ledger WHERE aggregate_id = ?", (audit_id,)).fetchone()
inserted_audit_pk = row[0]

try:
    con.execute("DELETE FROM audit_ledger WHERE id = ?", (inserted_audit_pk,))
    con.commit()
    print("FAILED: Audit record was deleted! Immutability trigger failed.")
    failed += 1
except sqlite3.DatabaseError as e:
    if "AUDIT_LEDGER_IMMUTABLE" in str(e):
        print(f"PASSED: SQLite BEFORE DELETE trigger successfully blocked audit deletion: {e}")
        passed += 1
    else:
        print(f"FAILED: Unexpected error: {e}")
        failed += 1

con.close()

print(f"\nGate 1 Verification Summary: {passed} PASSED, {failed} FAILED.")
if failed > 0:
    sys.exit(1)
print("ALL GATE 1 SQLITE SABOTAGE PROOFS VERIFIED WITH EXIT CODE 0.")
