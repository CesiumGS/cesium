---
id: CS-327
title: Image regression in CI on SwiftShader, with saved checks and the parity pages as checks
kind: work
state: planned
created: 2026-11-13
project: CS-195
needs: [CS-323, CS-397, CS-401]
---

## Done when

A CI job runs the image checks on SwiftShader with offline content; checks can be saved from the Explorer; parity pages run as checks; a fully-refined mode gives exact repeats.

Parity pages as checks come from the Dyno harness: CS-401 makes Lab pages (the parity pages among them) runnable scenes, and CS-397 gives them image checks. This item adds the SwiftShader CI job and saved checks on top.

Detail: `docs/design/image-regression-in-dyno.md`, "Phasing".
