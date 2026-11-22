---
id: CS-901
title: Which USD reader does CS-559 use, from CS-900's comparison?
kind: decision
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-900]
decider: owner
---

## Question

Which USD reader does CS-559 use? Choose from CS-900's three-way comparison: the TypeScript subset reader, LightUSD in WebAssembly, or full OpenUSD in WebAssembly.

Filed on 2026-11-22 from CS-802's answer B, which left the reader open until the comparison.

## The evidence

CS-900's Dyno run `2026-11-22T10-56-32-200Z-apple-metal-3`, over the six SimReady samples. The machine was under load that night, so treat the start times as upper bounds.

| | Subset reader | LightUSD 1.0.0 | OpenUSD 26.11.1 |
| --- | --- | --- | --- |
| Size with Brotli | 9,152 B | 817,081 B | 1,718,550 B |
| Start, median | 15 to 28 ms | 42 to 70 ms | 138 to 153 ms |
| Coverage, against OpenUSD | all but 3 checks | misses 17 | the reference |
| What the host page must allow | nothing | `wasm-unsafe-eval` | COOP, COEP and `wasm-unsafe-eval` |
| License | ours | Apache 2.0 | TOST 1.0 |

- Every miss is on the pallet sample, which lacks two layers that it references. LightUSD refuses that stage. The subset reader drops two prims under the failed reference.
- **The coverage row is being recomputed.** CS-900's review found that a check counted as agreeing even when both readers found nothing, and most physics and label checks are empty on most samples. So the coverage figures overstate what was tested. A fix round recounts coverage over only the checks where OpenUSD found something. Don't answer this decision until that's done.
- LightUSD's "7.1 MB" was a deprecated legacy `.wasm` in its npm package, so its size is settled.

## Options and recommendation

- A. **The subset reader.** Fix its two composition faults on broken assets, and use OpenUSD in WebAssembly as a test oracle that never ships. (Cost: we own about 2,300 lines. The oracle needs its build kept in the setup store.)
- B. **LightUSD.** (Cost: about 90 times the subset reader's bytes, `wasm-unsafe-eval` on every host page, and a C++ build to maintain.)
- C. **OpenUSD in WebAssembly, shipped.** (Cost: about 190 times the bytes and about 8 times the start time, and every host page needs cross-origin isolation.)

Recommended: A, with B as the fallback if the reader's upkeep grows. That's CS-900's recommendation, and the chief of staff agrees with it.
