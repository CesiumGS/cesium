---
id: CS-1343
title: ion issues 2.0 its own evaluation token, rotated with 2.0's releases
kind: external
state: planned
created: 2026-11-24
project: CS-191
waiting_on: the ion team issues 2.0's evaluation token and its rotation
---


## Done when

The ion team has issued 2.0 its own evaluation token and said how it rotates with 2.0's releases, and CS-271 knows where a build reads it from. The token itself goes only where `docs/design/ion-as-a-module.md` allows: never into this item, a commit message, a log or the handbook.

## Notes

From the owner's answer to CS-270 on 2026-11-24 ("ion issues a 2.0 token"): ion issues 2.0 its own evaluation token, rotated on 2.0's release schedule, rather than 2.0 reading 1.x's per-release token at build time. CS-271 (the default evaluation token, with the on-screen notice) waits on it. It is in 2.0.0-alpha.1's path through CS-497.
