---
id: CS-1195
title: Merge CS-1127, Dyno's headless runs get the ion token
kind: decision
state: planned
created: 2026-11-23
project: CS-199
decider: owner
---

## Question

Merge CS-1127 into main? Every headless Dyno run (suite, images, cold start and the Lab) gets the ion token from `.env.local` or the token pasted in Dyno's UI, and no build, record, log or URL can hold it.

As your CS-1126 asked: the runner resolves the token (the environment first, then `.env.local` as Vite parses it, then the one saved from Dyno's UI) and seeds it only into pages on this machine. Four rounds of security review shaped it. Dyno's token endpoint answers only whether a token is saved, never the token; it checks Host and Origin exactly; the servers a headless run starts refuse writes; and a page off this machine gets nothing unless `--allow-remote-token` says so. Every frozen build blanks the token key, takes it out of the environment while Vite builds, and is scanned for the token in five encoded forms afterward, new or cached; a hit removes the build. Servers that run another commit's code get an empty token store, so an older commit's store can't hand out a saved token. Records, console messages and errors are redacted. End-to-end leak tests with a marker (never the real token) pass five of five across lab, cold start, images and run, and a search of the whole branch diff finds no form of the real token. The last scoped check found no new Important. Accepted risk, written in the design doc: a local process can replace or clear the saved token but never read it. Owner path: `.claude/skills/dyno/SKILL.md` (where each run gets the token). Checked by the orchestrator on the replay 07b1cc4a19 onto main b01b665dcc (one import conflict with CS-395 in `bench/suite/commands/suite.mjs`, merged by keeping both imports; the changed lines are identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge. Follow-ups: CS-359 (the Google Maps key) starts after this merges; the fresh-clone check and CS-1152's ion-scene run follow too.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`, regenerates the views and logs the merge. Then the fresh-clone check runs and you can bundle.
- B. B. Hold it: Nothing merges; headless runs keep failing ion scenes.

Recommended: A. Merge it. It does what CS-1126 asked, four security rounds are settled with no Important left, and the leak tests and diff search are clean.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
