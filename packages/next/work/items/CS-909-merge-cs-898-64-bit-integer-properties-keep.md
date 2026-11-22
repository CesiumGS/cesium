---
id: CS-909
title: Merge CS-898, 64-bit integer properties keep their exact value
kind: decision
state: planned
created: 2026-11-22
project: CS-191
decider: owner
---

## Question

Merge CS-898, which makes INT64 and UINT64 feature-table properties reach the caller exactly as bigint (never through Number()), into main? It meets the overnight bar for a safe merge: every gate passes on main's tip, a fresh Claude review has no open Important findings, it touches no owner path, it adds no dependency, secret or data, it doesn't change rendering, and it's two-way reversible.

As the owner answered: a non-normalized INT64 or UINT64 value is always a bigint, in arrays too, and FeatureValue gains bigint. Normalized 64-bit values are floating-point (INT64 divided by 2^63 and clamped at -1, UINT64 by 2^64), and offset and scale apply only to floating-point and normalized types, per the 3D Tiles Metadata specification ('Property Values Structure', read 2026-11-22, quoted in a comment). A class default is in final form: a normalized 64-bit default stays as written, a non-normalized one becomes a bigint. noData is compared exactly as a bigint; a JSON noData number is used only when it's a safe integer, so larger values come as decimal strings. 64-bit enum values are read exactly. The pick inspector formats bigint and bigint[] without throwing. featureTables.ts accepts bigint columns and uploads Number(v) to the GPU as before, so styling is unchanged. FeatureValue crosses the worker boundary by structured cloning. Tests: values above 2^53 for both types and negative INT64, IDs one apart stay distinct, arrays, defaults, noData, enums, normalized limits, the GPU upload, and the inspector; putting Number() back fails 7 of 8 tests, and putting plain JSON.stringify back in the inspector fails its test. Three Claude reviews: the first found two Important problems (the inspector threw on bigint[]; a class default passed through raw), the second found one (a normalized 64-bit default normalized twice, from the orchestrator's own fix brief), and both rounds were fixed; the third found nothing Important. Its two Minors: a non-normalized 64-bit default written as a JSON number above 2^53 stays a number, since JSON.parse already rounded it (commented), and rows of an array default share one array object (as before CS-898). Outside the brief's files: widgets/inspector.ts, the fix the owner's answer needs. api/surface.txt doesn't change (FeatureValue is a name-only entry). Checked by the orchestrator on main 0f651bd5fd (replay 466752c512 of fcf709a52a, patch identical outside work/): both type checks, work check 906 files, surface unchanged, eslint clean, npm test exit 0 (395 files, 6,634 tests), test:data exit 0 (56 files). Every commit's five trailers parse.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge. CS-530 can then build on exact 64-bit IDs.
- B. Hold it: Nothing merges; 64-bit IDs above 2^53 keep coming back rounded, and CS-530 and CS-338's per-element overrides wait.

Recommended: Merge it. It fixes a live correctness bug the owner committed for alpha.1, every gate passes on main's tip with a clean full suite, and three review rounds end with nothing Important open.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
