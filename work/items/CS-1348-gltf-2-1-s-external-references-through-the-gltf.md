---
id: CS-1348
title: glTF 2.1's external references through the gltf kind
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-556]
---

> **Proposal.** Source: CS-556's report, relayed by orch-11 on 2026-11-25. Why now: glTF 2.1 adds external references; the gltf kind should follow them once Khronos publishes the schema. Waits on: Khronos's published glTF 2.1 schema (not published as of 2026-11-25). Related: CS-572 (the full version of scene items). Size: medium. Decider: owner. Filed 2026-11-25.

## Done when

- The gltf kind follows a file's external references, each through the source's fetch with its credentials, bounded by the content budget and refused past a depth limit, with cycles refused by name.
- A referenced file becomes part of the same content item, and its features keep their own declared identity.
