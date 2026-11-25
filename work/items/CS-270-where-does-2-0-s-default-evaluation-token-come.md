---
id: CS-270
title: Where does 2.0's default evaluation token come from?
kind: decision
state: done
created: 2026-11-13
project: CS-191
decider: owner
answer: Have ion issue a 2.0 token
answered_at: 2026-11-25T02:57:19.334Z
answered_via: question-tool
answered_by: owner
---

## Question

The owner wants 1.x-style default token behaviour, with the on-screen notice, in `@cesium/next/ion` (2026-11-08). Source: `docs/design/ion-as-a-module.md`, "A default evaluation token".

## Options and recommendation

- **Read 1.x's per-release token** from `packages/engine/Source/Core/Ion.js` at build time.
- **Have ion issue a 2.0 token** with its own rotation.

The source makes no recommendation.

## Answer

The owner, 2026-11-24, in the question tool: "ion issues a 2.0 token", with the description "ion issues 2.0 its own evaluation token and rotates it on 2.0's release schedule. This needs the ion team, so it becomes an external item that CS-271 waits on. It doesn't tie 2.0's build to 1.x." The external item is CS-1343.
