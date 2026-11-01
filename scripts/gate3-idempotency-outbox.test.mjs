import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../data/reels.sqlite");

describe("Reels Maker Gate 3: Stateful API, Idempotency & Outbox Suite", () => {
  let baseUrl;
  let serverInstance = null;
  const idempotencyKey = `idem_reel_${Date.now()}`;

  before(async () => {
    try {
      const probe = await fetch("http://127.0.0.1:8097/health");
      if (probe.ok) {
        baseUrl = "http://127.0.0.1:8097";
        return;
      }
    } catch {
      // background server not up; spin up test server
    }

    process.env.NODE_ENV = "test";
    const mod = await import("../server-api.mjs");
    serverInstance = mod.server;
    await new Promise((resolve) => {
      serverInstance.listen(0, "127.0.0.1", () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance && serverInstance.listening) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  let initialResponseJson;
  let createdJobId;

  test("POST 1: Initial state change with Idempotency-Key writes to SQLite and outbox", async () => {
    const payload = {
      reader: "alafasy",
      readerName: "مشاري راشد العفاسي",
      surah: 112,
      surah_ar: "الإخلاص",
      start: 1,
      end: 4,
    };

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200, "First generation POST must succeed with 200 OK");
    initialResponseJson = await res.json();
    assert.equal(initialResponseJson.status, "success");
    assert.ok(initialResponseJson.job.id);
    createdJobId = initialResponseJson.job.id;

    // Verify physical SQLite row persistence
    const db = new DatabaseSync(dbPath);
    const jobRow = db.prepare("SELECT * FROM render_jobs WHERE id = ?").get(createdJobId);
    assert.ok(jobRow, "Render job must physically exist in SQLite render_jobs table");
    assert.equal(jobRow.surah_id, 112);
    assert.equal(jobRow.start_verse, 1);
    assert.equal(jobRow.end_verse, 4);

    // Verify idempotency cache in SQLite
    const idemRow = db.prepare("SELECT * FROM idempotency_keys WHERE key = ?").get(idempotencyKey);
    assert.ok(idemRow, "Idempotency key must be stored in SQLite idempotency_keys table");

    // Verify audit outbox row
    const outboxRows = db.prepare("SELECT * FROM audit_outbox WHERE event_type = ?").all("REEL_RENDERED");
    assert.ok(outboxRows.length >= 1, "Audit outbox must contain REEL_RENDERED event");
    db.close();
  });

  test("POST 2: Duplicate POST with identical Idempotency-Key returns cached response without duplicate side effects", async () => {
    const db = new DatabaseSync(dbPath);
    const countBefore = db.prepare("SELECT COUNT(*) as cnt FROM render_jobs WHERE id = ?").get(createdJobId).cnt;
    db.close();

    const payload = {
      reader: "alafasy",
      readerName: "مشاري راشد العفاسي",
      surah: 112,
      surah_ar: "الإخلاص",
      start: 1,
      end: 4,
    };

    const res = await fetch(`${baseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200, "Idempotent retry must return 200 OK");
    assert.equal(res.headers.get("x-cache"), "HIT-IDEMPOTENCY", "Response must carry X-Cache: HIT-IDEMPOTENCY");

    const duplicateResponseJson = await res.json();
    assert.deepEqual(duplicateResponseJson, initialResponseJson, "Payload must match initial response exactly");

    // Verify no duplicate rows were inserted
    const db2 = new DatabaseSync(dbPath);
    const countAfter = db2.prepare("SELECT COUNT(*) as cnt FROM render_jobs WHERE id = ?").get(createdJobId).cnt;
    db2.close();

    assert.equal(countAfter, countBefore, "Row count must remain exactly 1 after duplicate idempotent request");
  });
});
