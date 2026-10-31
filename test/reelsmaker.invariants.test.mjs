import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_READERS,
  CANONICAL_SURAHS,
  ReelJobAggregate,
  AntiShadowbanBatchEntropyEngine,
  ReelsStore,
} from "../lib/domain/reel-rendering-pipeline.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Invariant 1: Catalogs expose verified readers and canonical surahs", () => {
  assert.ok(CANONICAL_READERS.length >= 4, "Must expose reciter catalog");
  assert.ok(CANONICAL_SURAHS.length >= 5, "Must expose canonical surahs");

  for (const surah of CANONICAL_SURAHS) {
    assert.ok(surah.verses_count > 0, `Surah ${surah.id} must have positive verse count`);
    assert.ok(surah.name_arabic, `Surah ${surah.id} must have Arabic name`);
  }
});

test("Invariant 2: Poka-Yoke rejects out-of-bounds verse ranges", () => {
  assert.throws(
    () =>
      new ReelJobAggregate({
        reader: "alafasy",
        surah: 1, // Al-Fatiha has 7 verses
        start: 5,
        end: 10,
      }),
    /Verse range exceeds surah total/
  );

  assert.throws(
    () =>
      new ReelJobAggregate({
        reader: "alafasy",
        surah: 1,
        start: 5,
        end: 2,
      }),
    /Start verse cannot be greater than end verse/
  );
});

test("Invariant 3: Safe-zone typography is strictly clamped between 25% and 68% viewport", () => {
  const aggregate = new ReelJobAggregate({
    reader: "alafasy",
    surah: 1,
    start: 1,
    end: 7,
  });

  const job = aggregate.job;
  assert.equal(job.safeZoneTypography.clamped, true);
  assert.equal(job.safeZoneTypography.minYPercent, 25);
  assert.equal(job.safeZoneTypography.maxYPercent, 68);
  assert.equal(job.aspectRatio, "9:16");
  assert.equal(job.resolution, "1080x1920");
});

test("Invariant 4: Anti-shadowban entropy engine generates unique signatures", () => {
  const sig1 = AntiShadowbanBatchEntropyEngine.generateEntropySignature(Date.now());
  const sig2 = AntiShadowbanBatchEntropyEngine.generateEntropySignature(Date.now() + 100);

  assert.ok(sig1.perceptualHash);
  assert.ok(sig2.perceptualHash);
  assert.notEqual(sig1.perceptualHash, sig2.perceptualHash);
  assert.equal(sig1.lufsNormalization, -14.0);
  assert.equal(sig1.duplicateHashBypassActive, true);
});

test("Invariant 5: Physical MP4 artifact materializes on disk with non-zero size", async () => {
  const aggregate = new ReelJobAggregate({
    reader: "alafasy",
    readerName: "مشاري راشد العفاسي",
    surah: 1,
    surah_ar: "الفاتحة",
    start: 1,
    end: 7,
  });

  const job = aggregate.materializeArtifact();

  const stat = await fs.stat(job.outputFullPath);
  assert.ok(stat.size > 50, "Physical video artifact must exist and have non-zero size");
  assert.ok(job.outputFileName.endsWith(".mp4"));
});

test("Invariant 6: Append-only Bitcask job ledger records and reloads jobs", () => {
  const store = ReelsStore.load();
  assert.ok(Array.isArray(store.jobs));

  const initialCount = store.jobs.length;
  const aggregate = new ReelJobAggregate({
    reader: "abdulbaset",
    surah: 112,
    start: 1,
    end: 4,
  });
  const job = aggregate.materializeArtifact();
  ReelsStore.append(job);

  const reloaded = ReelsStore.load();
  assert.equal(reloaded.jobs.length, initialCount + 1);
  assert.equal(reloaded.jobs[0].id, job.id);
});

test("Invariant 7: Ubiquitous Language contract file is non-empty and contains essential concepts", async () => {
  const docPath = path.resolve(__dirname, "../UBIQUITOUS_LANGUAGE.md");
  const content = await fs.readFile(docPath, "utf-8");
  assert.ok(content.length > 100);
  assert.match(content, /ReelGenerationJob/);
  assert.match(content, /VerseRange/);
});
