---
id: CS-1190
title: "Explore untrusted plugins: a worker-hosted source host the engine can terminate"
kind: work
state: proposed
created: 2026-11-23
project: CS-191
needs: [CS-1188]
---

> **Proposal, contingent.** Source: the owner, 2026-11-24: "file a follow up ticket to explore untrusted plugins if needed". CS-1187 chose trusted code, so this runs only if 2.0 needs to load plugins the host can't vouch for. Size: a spike first. Decider: owner. Filed 2026-11-24.

## Done when

- A spike hosts one content source in a worker, with structured clone as the boundary, and the engine can terminate it when it runs away.
- The spike reports the costs: async calls at every inlet, a copy per push, memory, and start-up time, measured in Dyno.
- It says which CS-1188 guarantees the worker gives for free and which still need the boundary module.
- The owner gets a recommendation: whether 2.0 offers an untrusted-plugin host, and for which seams.
