# UBIQUITOUS LANGUAGE: REELS MAKER MEDIA STUDIO OS
*Domain 5: Creator, Headless CMS & Media Automation*
*Standard: ANTIGRAVITY-SPEC-V2 | DDD Level 3*

---

## 1. Core Domain Glossary

### Reciter / ReaderProfile (القارئ)
- **Definition**: An accredited Quranic reciter with verified high-fidelity acoustic recordings and known pacing parameters.
- **Attributes**: `identifier` (e.g. `alafasy`, `abdulbaset`), `name` (e.g. "مشاري راشد العفاسي"), `audioBitrateKbps` (192, 320), `supportedRiwaya` (Hafs an Asim).

### Surah & VerseRange (السورة والآيات)
- **Definition**: Canonical structural boundary within the Quran.
- **Attributes**: `surahId` (1 to 114), `nameArabic`, `totalVerses`, `startVerse`, `endVerse`.
- **Invariants**:
  - `startVerse >= 1`
  - `endVerse <= totalVerses`
  - `startVerse <= endVerse`

### ReelGenerationJob (مهمة إنتاج الريلز)
- **Definition**: A stateful rendering task transforming selected verses and audio into a vertical 9:16 short-form video.
- **Attributes**: `jobId` (UUID/KSUID), `readerId`, `surahId`, `startVerse`, `endVerse`, `aspectRatio` (`9:16`), `status` (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), `durationMs`, `outputFileName`, `outputFullPath`, `createdAt`, `completedAt`.

### SubtitleSyncAlignment (محاذاة النص والصوت)
- **Definition**: Word-by-word timestamp markers mapping verse typography to audio frequencies for kinetic typography overlays.

---

## 2. Invariant Rules
1. **Physical Artifact Existence**: A completed job must write a physical deliverable (video file or timeline manifest) to `data/output/` on disk before marking status `COMPLETED`.
2. **Append-Only Ledger**: All generation jobs are appended monotonically to `data/reels-store.json` with unique sequence tokens.
3. **Poka-Yoke Bounds Checking**: Any request specifying verses outside the surah count is rejected before invoking the media pipeline.
