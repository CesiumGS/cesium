---
id: CS-1317
title: The GPU destroy bypass test matches the resolved method, not the receiver's type name
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-972]
---

> **Proposal.** Source: CS-972's scoped check after its structural round, relayed by orch-11 on 2026-11-24. Why now: the GPU destroy bypass test guards CS-972's rule that a render feature never destroys a GPU object directly, and it matches only one spelling of the call. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The bypass test resolves each `destroy()` call's method through the type checker, and fails on a call that resolves to `GPUBuffer`, `GPUTexture` or `GPUQuerySet`'s `destroy`, whatever the receiver's spelling. Today it catches `x.destroy()` only when `x`'s own type is named one of those three.
- It catches each case the check found missed: `any`, an interface that extends one of the three, intersections, generics, method values (`const d = b.destroy`), destructuring and element access (`b["destroy"]()`), each with a fixture the test refuses.
- The code has none of these today (checked with the type checker), so the test passes on the tree as it is.
- The audit sentence that describes the test says what it checks, no more.
