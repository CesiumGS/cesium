---
id: CS-1098
title: "CS-966's remaining minors: off-list hook query tokens through a proxy, a proxy's fixed secret header, two tests, and a behavior note"
kind: work
state: proposed
created: 2026-11-23
project: CS-191
needs: [CS-966]
---

> **Proposal.** Source: CS-966's round-3 security review (2026-11-23). None fails open. Size: small. Decider: owner. Filed 2026-11-23.

## Done when

- A hook-added query token whose name isn't on the fixed list, riding a proxy's `X-Target-URL` under follow, is documented as the host's choice under CS-1034 A.
- A custom `RequestProxy`'s fixed secret header that follows a redirect when the target carries no token is documented the same way.
- Two tests are added: an off-list, mixed-case credential key, and a hook-moved target through a proxy.
- The behavior note is in the docs: ion and iTwin endpoints through a credential-forwarding proxy now refuse a gateway redirect in browsers, which fails closed.
