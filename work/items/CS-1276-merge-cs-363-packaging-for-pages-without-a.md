---
id: CS-1276
title: Merge CS-363, packaging for pages without a build step
kind: decision
state: planned
created: 2026-11-24
project: CS-199
decider: owner
---

## Question

Merge CS-363 into main? It adds a classic-script build (one file defining the global CesiumNext), Engine.create({ workerUrl }) so a page can serve the content worker itself, and a check that the re-bundled library carries its workers and wasm.

What it adds: dist/browser/cesium-next.js, a classic script that defines only CesiumNext, with the other entry points on it (CesiumNext.time and so on); assets resolve against the script's own URL. Engine.create({ workerUrl }) names the content worker; a cross-origin script starts through a same-origin blob, so the page's policy must allow blob: in worker-src, which the docs say. Workers are named by the package's version (`assets/worker-<version>.js`), so a stale cached worker can't meet a newer release. checkBundle checks that core's dist has the worker, the Draco and Basis wasm, and every file its modules name. Browser checks, under the gpu lock, each load a Draco model and a Basis KTX2 model and draw both: the classic page, a script from another origin, a page whose policy blocks its own WebAssembly and eval, the re-bundled library, and the module build. An Opus security review found two Importants, both closed in one round and confirmed by a scoped Opus check. First, the classic script's URL could be hijacked from HTML alone by shadowing document.currentScript, which would start an attacker's worker in the page's origin; it now trusts only a real script element, fetches nothing otherwise, and refuses with a fixed message asking for workerUrl (tested with shadowing fixtures in the browser). Second, unhashed workers had no version check. Public names for the API review (CS-973 C), which the executor recommends keeping for alpha.1: workerUrl, CesiumNext and the worker file name. Follow-ups: a build-ID handshake between worker and pool (after CS-969), workerUrl for the Slang and Moon map workers, and whether a plain re-bundle should work without serving dist/assets. The orchestrator resolved a conflict with CS-847's WorkerPool start factory (the default now uses the named script), with the worker URL test passing and failing under a mutation. No owner paths. Checked by the orchestrator on the replay cfcb77259f (tree identical to the branch, which merged main). Its cheap gates passed except test/noSceneGains.test.ts, which failed alone once at a load average of about 44 and then passed alone on both this replay and main (8 of 8 each, at about 36): the known load-sensitive glare test, CS-538's ground. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The three public names go to the API review.
- B. B. Hold it: Nothing merges; pages still need a build step to load the engine.

Recommended: A. Merge it. It meets the done-when in real browsers, including a strict policy, and both security findings are closed and checked.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
