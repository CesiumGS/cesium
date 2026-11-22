---
id: CS-966
title: resolveUri stops copying the base URL's query to other origins, and credentials go only to their own origins
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable security review (`fable-review-security.md`, confirmed by calling the function). Why now: one hostile tile in a trusted tileset can send its token to another server. `resolveUri` copies the base URL's whole query (a signed link, a key, a session) onto any absolute URL a tile names, and a source's `headers`, or a `Credential` without `origins`, go to every origin. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- `resolveUri` copies the base's query only to URLs on the base's own origin.
- A source's `headers` and a `Credential` with no `origins` go only to the source's own origin.
- Tests cover a tile that names another origin, with a signed query, with headers and with a credential, and none reaches it.
