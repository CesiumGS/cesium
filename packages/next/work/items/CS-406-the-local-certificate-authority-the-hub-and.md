---
id: CS-406
title: The local certificate authority, the hub and pairing
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-390]
---

`ca init` and `ca rotate`: an ECDSA root with Name Constraints, short-lived leaves for `<mac>.local` and the LAN addresses, made with a reviewed X.509 dependency, the key kept outside the repo. `hub`: LAN-only binding with the source-address check; the plain-HTTP certificate page with fingerprint and per-platform steps; the pairing page and `/pair`; device tokens (cookie or file), the registry, revocation. Settings › Devices in Dyno (list, pair, revoke, the authority's fingerprint). The platform check of Name Constraints, recorded.

Its endpoints follow CS-358's fixes for the dev server's file endpoints.

Model: the most capable one (design-heavy or risky), per the plan.

## Done when

Tests with two temporary homes on loopback: the issued leaf verifies under the root, and a certificate for a public name can't be issued. A request without a token, with a revoked token, or from a public source address is refused. A code works once and fails after three wrong tries. The authority's key is never written inside the repo or into an archive, and the hub logs no token. The owner pairs the laptop's Edge and an iPhone by clicking around.

## Files

new `bench/suite/hub/ca.mjs`, `hub.mjs`, `pairing.mjs`, `devices.mjs`, `commands/hub.mjs`, `views/Devices.tsx`; `cli.mjs` (dispatch), `routes.tsx`, `shell.tsx` (the Settings menu), `package.json` (`hub`, the X.509 dependency)

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
