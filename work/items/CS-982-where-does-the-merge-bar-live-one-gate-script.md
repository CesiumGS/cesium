---
id: CS-982
title: "Where does the merge bar live: one gate script, or policy.json's lists?"
kind: decision
state: planned
created: 2026-11-22
project: CS-199
decider: owner
---

## Question

Today `policy.json` lists three commands (the type check, the work check and `npm test`), and the orchestrator runs more out of habit: the data suite, the bundle check, surface, shaders and parity. Where does the merge bar live?

From the Fable evidence review of 2026-11-22.

## Options and recommendation

- A. One `npm run gate` script in the repository, which `policy.json` calls.
- B. Keep the habit, and extend `policy.json`'s lists.

Recommended: A.

## Answer

Open. The owner, 2026-11-22: hold until human-in-the-lead's rc.2 is released, since it changes how merge gates work. Ask again then.
