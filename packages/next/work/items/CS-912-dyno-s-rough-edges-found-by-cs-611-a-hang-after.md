---
id: CS-912
title: Dyno's rough edges found by CS-611: a hang after a throwing suite, baseline IDs in studies, a port for suite run
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: CS-611's executor (CS-910). Why now: a throwing suite leaves `dyno lab` hanging, which ties up the gate overnight, as CS-814's leftover did for four and a half hours. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- `dyno lab` releases keepAwake and exits after a suite throws.
- Studies compare the resolved baseline ID, not the raw `--baseline` spec.
- `dyno suite run` takes a port option.
