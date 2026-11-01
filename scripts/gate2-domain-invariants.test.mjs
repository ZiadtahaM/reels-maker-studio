import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_READERS,
  CANONICAL_SURAHS,
  ReelJobAggregate,
  AntiShadowbanBatchEntropyEngine,
} from "../lib/domain/reel-rendering-pipeline.mjs";

test("Reels Maker Gate 2: Pure Domain Invariants Suite", async (t) => {
  await t.test("Invariant 1: Canonical reciter and surah catalogs maintain structural integrity", () => {
    assert.ok(CANONICAL_READERS.length >= 6, "Must expose at least 6 canonical reciters");
    assert.ok(CANONICAL_SURAHS.length >= 11, "Must expose at least 11 canonical surahs");
    const alafasy = CANONICAL_READERS.find((r) => r.identifier === "alafasy");
    assert.ok(alafasy, "Alafasy reciter must exist");
    const fatiha = CANONICAL_SURAHS.find((s) => s.id === 1);
    assert.equal(fatiha.verses_count, 7, "Al-Fatiha must have exactly 7 verses");
  });

  await t.test("Invariant 2: Poka-Yoke verse bounds rejects requests exceeding total surah verses", () => {
    assert.throws(
      () =>
        new ReelJobAggregate({
          reader: "alafasy",
          surah: 1, // 7 verses
          start: 1,
          end: 8, // Out of bounds!
        }),
      /exceeds surah total/,
      "Must reject verse ranges extending past surah boundaries"
    );
  });

  await t.test("Invariant 3: Start verse greater than end verse is rejected immediately", () => {
    assert.throws(
      () =>
        new ReelJobAggregate({
          reader: "alafasy",
          surah: 1,
          start: 5,
          end: 2,
        }),
      /Start verse cannot be greater than end verse/,
      "Must reject reversed verse bounds"
    );
  });

  await t.test("Invariant 4: Safe zone typography strictly clamps vertical bounds to 25%-68%", () => {
    const jobAgg = new ReelJobAggregate({
      reader: "alafasy",
      surah: 1,
      start: 1,
      end: 7,
    });
    const { safeZoneTypography, aspectRatio, resolution } = jobAgg.job;
    assert.equal(aspectRatio, "9:16", "Must be vertical 9:16 aspect ratio");
    assert.equal(resolution, "1080x1920", "Must enforce 1080x1920 vertical resolution");
    assert.equal(safeZoneTypography.minYPercent, 25);
    assert.equal(safeZoneTypography.maxYPercent, 68);
    assert.equal(safeZoneTypography.clamped, true);
  });

  await t.test("Invariant 5: Anti-shadowban entropy engine generates valid perceptual hash and normalization", () => {
    const sig1 = AntiShadowbanBatchEntropyEngine.generateEntropySignature(1001);
    const sig2 = AntiShadowbanBatchEntropyEngine.generateEntropySignature(1002);
    assert.ok(sig1.perceptualHash, "Must contain SHA-256 perceptual hash");
    assert.equal(sig1.lufsNormalization, -14.0, "Must enforce standard -14.0 LUFS audio normalization");
    assert.notEqual(sig1.perceptualHash, sig2.perceptualHash, "Perceptual hashes across distinct seeds must differ");
  });
});
