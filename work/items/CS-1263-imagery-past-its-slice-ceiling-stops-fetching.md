---
id: CS-1263
title: Imagery past its slice ceiling stops fetching the same tiles again
kind: work
state: proposed
created: 2026-11-24
project: CS-17
---

> **Proposal.** Source: CS-165's diagnosis, relayed by orch-11 (2026-11-24). Why now: past the slice ceiling, imagery keeps requesting tiles it already has. At valley ×4, α 1, requests rose from 4,729 to 10,284 in 41 s with no new imagery tile among them. It's a bug whatever CS-1262 decides. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- A tile that can't get an imagery slice stops requesting the same imagery tiles again.
- A test at the slice ceiling shows the request count settles once the view stops moving.
