---
id: CS-770
title: Merge CS-721, one dyno command for Dyno's runs, Lab pages, servers and measurements
kind: decision
state: planned
created: 2026-11-20
project: CS-389
decider: owner
---

## Question

Merge CS-721, which gives Dyno one command line (node packages/next/bench/dyno.mjs: status, data status, measure, result, suite, lab and serve, each with --help and --json), moves bench/suite/cli.mjs and bench/run.mjs behind it as thin wrappers, and adds a dyno skill for agents, into main?

Every command prints one JSON object with api_version, command and ok, and uses the same exit codes: 0 ok, 1 a problem, 2 usage, 3 not built yet (naming the item), 4 refused (out-of-date data, a busy machine, a held port). serve refuses your 5190 and 5199 and any port someone else holds. measure refuses while any dataset is out of date. status says busy, waiting-for-quiet or quiet, and reports the machine's load, power and thermal state separately. The old commands still work and print the new one. Not built yet, each exiting 3 with its item: result fetch and store (CS-406), pin (CS-736), study (CS-404), device (CS-408) and runner (CS-407); analysis compare, trend and bisect have no item. The local measure worker has run only with a stand-in command, so watch its first real run. Outside its touches: one paragraph in the root AGENTS.md, outside the contract's markers, naming dyno as the project's benchmark tool and asking agents to check dyno status before heavy work (a rule for agents in this repository; the item named it); the dyno skill under packages/next/.claude, force-added as the work-items skill is; one script in package.json (dyno:cli). Runs record their command as node packages/next/bench/dyno.mjs suite until npx dyno is wired; the stored-repetition key changes once, so the next runs don't reuse stored repetitions. Checked by hand on main 8acd08c42f with CS-746, CS-748 and CS-750 under it (tested 2d17105f17): both type checks, hitld work check (763 files), surface (no API change), npm test exit 0 (373 files, 6,305 passed, no unhandled errors), test:data exit 0; no CSS touched. Your cold-start check (CS-715) ran through the moved command at 2d17105f17: median first frame 1,370 ms, within the 1,400 ms budget (run 2026-11-21T05-44-34-142Z-mac-apple). The executor's question, for later and not part of this merge: where does the dyno bin live, so that npx dyno works? npx finds only the root's bin, so it needs a root-level change. Its recommendation: a private workspace package (packages/next/tools/dyno, private: true), added to the root workspaces and the lockfile; it ships nothing. The other options: a bin in @cesium/next stripped before CS-616 publishes, or a link setup makes that npm install prunes. To try it once merged, in packages/next: node bench/dyno.mjs --help, then status, data status, and serve start dyno (then serve status and serve stop dyno). Presentation: orch-11-merge-ready-CS-721.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator merges it after CS-746, CS-748 and CS-750, replays it onto main's tip, reruns the type checks, work check and the dyno tests, fast-forwards main, regenerates the views and logs the merge; CS-393 (the settings registry and sweeps) can start on it.
- B. Hold it: Nothing merges; cli.mjs and run.mjs stay separate, and CS-393 waits.

Recommended: Merge it. Every gate passes on main's tip, the old commands keep working, and agents get one command that refuses what would hurt the shared machine or your servers.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
