# Image regression in Dyno

**What this holds:** Image regression checks in Dyno. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Image regression belongs in Dyno, not in a separate app: it needs the same
scene definitions, engine adapters, capture, FLIP (§4), results store,
lineage and review UI, and a change is judged on both axes at once
("faster" must not mean "drawing differently"). What differs is the run,
not the system, so Dyno gets a second kind of run with its own command,
CI job and tab.

- _Two questions, two baselines._
  - Parity (§4 L2): does 2.0 draw what 1.x draws? 2.0 against 1.x on the
    same scene and pose, judged with FLIP thresholds (mean ≤ 0.05, p95
    ≤ 0.2) and the drift sources §4 lists. This is what the filmstrip
    already shows per performance run.
  - Regression: did a change alter what 2.0 draws? 2.0 against its own
    approved image of the same check, near-exact (FLIP p95 near 0 on the
    same machine class), so any change is either approved or a bug.
- _Checks, not runs._ An image check is a scene, a pose (or a moment on
  its camera path), a time of day, a size and an engine configuration,
  captured once settled. It is deterministic: fixed size and device pixel
  ratio, fixed `JulianDate`, `Stepwise` selection or a selection settled
  to full detail, no frame-time dependence, animation stopped. The
  catalog's scenes supply poses; the parity pages (`parity/*.html`)
  become checks; the explorer can save the current view as a check.
- _Baselines._ Approved images per check and per renderer class (GPU
  vendor and architecture, or a software rasterizer in CI). Stored like
  results, outside the repo where the content's license forbids
  redistributing renders (Google tiles, most ion assets); public content
  cleared for it may keep small baselines in the repo. Each approval
  records who, when, the commit and the reason.
- _Command and CI._ `cli.mjs images [--update]` captures every check,
  compares against its baseline, writes a report and exits non-zero on
  unapproved differences; a JUnit and Markdown summary for CI and pull
  requests. In CI it can run without a GPU on a software rasterizer
  (SwiftShader for WebGPU and WebGL), with its own baselines, on offline
  content (`Specs/Data`, generated scenes) so it is fast and needs no
  network; nightly runs on runner machines add real GPUs and streamed
  content. Performance runs stay on real hardware only.
- _Review in Dyno (an Images tab)_, after Chromatic and Skia Gold: a
  queue of changed checks, each with the baseline and new image side by
  side, a swipe, a flicker toggle and the FLIP heatmap (§4 L3), and
  approve or reject (approvals go to the baseline store, or to a commit
  for in-repo baselines); history per check; and "open in the explorer"
  at that pose in both engines.
- _During development:_ the same command on one scene or check
  (`--checks`), and the Images tab against the local results, so a
  developer sees what a change does to images before pushing.
- _Phasing:_ v2 (with M5) for the checks, baselines, command, Images tab
  and CI on a software rasterizer; v3 for real-GPU nightly baselines
  across runner machines.
- _Built (r33):_ `images.mjs` and `cli.mjs images` (checks at
  `scene.checks` points of the camera path, default the start; FLIP
  against the approved baseline per renderer class, thresholds mean 0.01
  and p95 0.05; `--parity` captures the pinned 1.x release too and scores
  it against §4 L2; `--update` approves; `--software` runs on SwiftShader;
  JSON, JUnit and Markdown output; exit 1 on changed or new images);
  `runCheck` in the suite page; Dyno's Images tab (side by side, swipe,
  flicker, FLIP heatmap, parity view; approve copies the image into the
  baselines, reject records why). Streamed scenes repeat within FLIP
  0.002–0.006 mean and 0.04 p95 run to run (selection settles slightly
  differently); a fully refined check mode would make them exact. Next:
  the CI job on SwiftShader with offline content (deferred, r34: see
  §16.9 phasing), checks saved from the explorer, parity pages as checks.
