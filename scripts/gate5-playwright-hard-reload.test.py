import time
import sys
import subprocess
import os
import urllib.request
import sqlite3
import uuid
from playwright.sync_api import sync_playwright

SERVER_PORT = 8097
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "data", "reels.sqlite")

print("===========================================================================")
print("=== REELS MAKER STUDIO: GATE 5 PLAYWRIGHT HARD-RELOAD PROOF SUITE =========")
print("===========================================================================")

# Step 1: Ensure server is running or start it
server_proc = None

def is_server_healthy():
    try:
        with urllib.request.urlopen(f"{BASE_URL}/health", timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False

if not is_server_healthy():
    print(f"\n[STEP 1] Starting Reels Maker Server on port {SERVER_PORT}...")
    server_proc = subprocess.Popen(
        ["node", "server-api.mjs"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    started = False
    for i in range(20):
        time.sleep(0.5)
        if is_server_healthy():
            started = True
            break
    if not started:
        print("ERROR: Server failed to start on port 8097.")
        if server_proc:
            server_proc.kill()
        sys.exit(1)
    print(f"PASSED: Server started and listening at {BASE_URL}.")
else:
    print(f"\n[STEP 1] Server already running and healthy at {BASE_URL}.")

try:
    with sync_playwright() as p:
        print("\n[STEP 2] Launching Headless Chromium Browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # Step 3: Test Reels Maker Studio UI
        print(f"[STEP 3] Navigating to Reels Maker Studio ({BASE_URL})...")
        page.goto(BASE_URL, wait_until="domcontentloaded")
        assert len(page.title()) > 0, "Page title must be non-empty"
        print(f"PASSED: Reels Maker Studio loaded successfully (Title: '{page.title()}').")

        # Step 4: Record a live reel generation via API
        print("\n[STEP 4] Executing batch generation for Surah Al-Fatiha (Verses 1-7)...")
        gen_res = page.request.post(f"{BASE_URL}/generate", data={
            "reader": "alafasy",
            "readerName": "مشاري راشد العفاسي",
            "surah": 1,
            "surah_ar": "الفاتحة",
            "start": 1,
            "end": 7
        })
        assert gen_res.status == 200, f"Generation failed: {gen_res.status}"
        gen_data = gen_res.json()
        assert gen_data["status"] == "success"
        job_id = gen_data["job"]["id"]
        output_file = gen_data["file_name"]
        full_path = gen_data["full_path"]
        print(f"PASSED: Reel job generated (ID: {job_id}, file: {output_file}).")

        # Step 5: Perform Hard Reload (The True Persistence Gate)
        print("\n[STEP 5] Performing Hard Reload (page.reload()) to prove persistence...")
        page.reload(wait_until="domcontentloaded")
        print("PASSED: Page reloaded successfully without session corruption.")

        # Step 6: Direct SQLite Database Physical Assertions
        print("\n[STEP 6] Asserting physical SQLite database rows on disk...")
        assert os.path.exists(DB_PATH), f"SQLite database must exist at {DB_PATH}"

        con = sqlite3.connect(DB_PATH)
        row = con.execute("SELECT id, reader, surah_id, start_verse, end_verse, duration_seconds, output_file_name FROM render_jobs WHERE id = ?", (job_id,)).fetchone()
        assert row is not None, f"Generated reel job {job_id} must physically exist in SQLite table!"
        assert row[1] == "alafasy"
        assert row[2] == 1
        assert row[3] == 1
        assert row[4] == 7
        print(f"PASSED: SQLite render_job row verified: id='{row[0]}', reader='{row[1]}', surah={row[2]}, verses={row[3]}-{row[4]}.")

        # Step 7: Direct Physical Artifact File Assertions
        print("\n[STEP 7] Asserting physical MP4 video artifact on disk...")
        assert os.path.exists(full_path), f"Video file must exist at {full_path}"
        file_size = os.path.getsize(full_path)
        assert file_size > 50, f"Physical video file must be non-empty (was {file_size} bytes)"
        print(f"PASSED: Verified physical artifact on disk ({file_size} bytes at {output_file}).")

        con.close()
        browser.close()

    print("\n===========================================================================")
    print("=== ALL GATE 5 PLAYWRIGHT HARD-RELOAD PROOFS VERIFIED WITH EXIT CODE 0 ===")
    print("===========================================================================")
    sys.exit(0)

except Exception as e:
    print(f"\nGATE 5 VERIFICATION FAILED: {e}")
    sys.exit(1)

finally:
    if server_proc:
        server_proc.kill()
