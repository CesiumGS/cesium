---
id: CS-566
title: "CS-200: the globe and lod parity suites need the ion token in executor worktrees"
kind: decision
state: planned
created: 2026-11-17
project: CS-188
decider: owner
---

## Question

CS-200's executor ran the parity suite, which matches the base commit exactly, but couldn't run globe or lod: both need the Cesium ion token, which is in the main checkout's packages/next/.env.local and not in the executor's worktree. Copying it there was refused by the permission check. How should CS-200 finish its browser checks?

packages/next/AGENTS.md asks for the browser parity suites when rendering changes. The Earth anchor's selection views are byte-identical to the base commit's for three eye poses, and the full suite, the data tests (except skyPack, which fails on the base commit too) and the parity suite pass.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. Owner provides the token: The owner makes the token available to executor worktrees (for example through env.worktree_setup or by placing .env.local in the CS-200 worktree and its base tree), and the same executor reruns globe and lod on both trees (cost: One owner step; a token in more places on this machine)
- B. Accept without globe and lod: CS-200 goes to the merge queue with parity and the identical selection views as its browser evidence; globe and lod run at the next item that has the token (cost: The rendering rule's globe and lod checks are skipped for this item)

Recommended: Owner provides the token. The project rule asks for the parity suites on rendering changes, and globe and lod cover streamed globe tiles that the parity suite doesn't.

## Answer

Recorded in the front matter once answered.
