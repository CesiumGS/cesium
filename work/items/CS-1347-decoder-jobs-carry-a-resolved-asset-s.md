---
id: CS-1347
title: Decoder jobs carry a resolved asset's credentials, so an ion glTF loads through the gltf kind
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-556, CS-269]
---

> **Proposal.** Source: CS-556's report, relayed by orch-11 on 2026-11-25. Why now: `ResolvedAsset.credentials` is ignored today, so a glTF from Cesium ion can't load through the gltf kind. Unblocks: ion glTF assets through the content-source seam. Size: small to medium. Decider: owner. Filed 2026-11-25.

## Done when

- A decoder job carries a resolved asset's credentials (CS-809) for the requests it makes, renewed as the resolver renews them, never written to logs, results or errors.
- An ion glTF asset opens through the gltf kind (tested with a fake resolver; one Dyno check with the token setting).
