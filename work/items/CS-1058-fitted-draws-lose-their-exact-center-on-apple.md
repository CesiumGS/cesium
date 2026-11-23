---
id: CS-1058
title: Fitted draws lose their "exact" center on Apple GPUs too
kind: work
state: proposed
created: 2026-11-22
project: CS-10
---

> **Proposal.** Source: the Fable accuracy review (`fable-review-accuracy.md`, finding F5), 2026-11-22. Severity: Important. Land before: beta.1. **Items:** CS-921 (same fix pattern); needs its own item. Decider: owner.

## Done when

- make the spike a lab suite and run it on an Apple GPU; state the result. If it fails, carry the displacement's high part as whole meters and sum the highs as integers, as CS-921 does.
- The finding's evidence in the review is rechecked first, since the code may have moved.
