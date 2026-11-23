---
id: CS-1092
title: Merge CS-951, the pnpm spike's write-up
kind: decision
state: planned
created: 2026-11-22
project: CS-609
decider: owner
---

## Question

Merge CS-951 into main? It adds docs/design/pnpm-spike.md, the spike's data and findings, and closes CS-951, which CS-1091 (the move to pnpm you chose in CS-1090) needs. It changes no default: npm stays until CS-1091.

The spike compared npm 11.17.0 with pnpm 11.12.0 in fresh worktrees at one commit, each side with its own cache or store. Medians of three: a cold install 76 s under pnpm against 152 s under npm, a warm second worktree 2.6 s against 7.7 s; each extra worktree adds about 21 MiB under pnpm and about 1.1 GiB under npm. pnpm import resolved the same 832 versions; the build passes with the packed checks for all seven packages; pnpm pack writes the same file lists as npm pack. The strict layout names three undeclared dependencies (playwright and sharp in root scripts, onnxruntime-web in a spike) and stops the dyno bin resolving unless the root declares @cesium/dyno. Under pnpm the full suite fails only test/dynoBin.test.ts (2 of 6,912: the dyno bin), which passes 11 of 11 under npm; test:data, typecheck and tsc -p . pass. Publishing stays npm pack and npm stage publish. The write-up recommended staying on npm; your CS-1090 answer, A, is recorded in it. A fresh Claude review (Sonnet) of the write-up for the repository found the machine's hardware, OS version and volume state, a wrong clone total (1,781 MiB for 26 worktrees, not 1,957), a pointer to a report outside the repository and two wrong workflow counts. The orchestrator fixed each on the branch (4824caef43). The pnpm trial files (pnpm-workspace.yaml, pnpm-lock.yaml) stay on hitld/CS-951-pnpm-trial, which never merges. Checked by the orchestrator on the replay 9f819664ef (docs and the item only): markdownlint, the work check and staleNames pass.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main, regenerates the views and logs the merge. CS-951 is done, and CS-1091 can take a slot.
- B. Hold it: Nothing merges; CS-1091 waits.

Recommended: Merge it. It is a design note with the data you decided CS-1090 from, it changes no default, the review's findings are fixed, and CS-1091 waits on it.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
