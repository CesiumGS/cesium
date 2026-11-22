---
id: CS-158
title: Cesium ion's answers on status codes and token lifetimes
kind: external
state: planned
created: 2026-11-13
project: CS-16
waiting_on: Cesium ion
---

## Waiting on

Three questions for Cesium ion from the streaming robustness plan (its questions for ion; CS-155 records them):

- Does `assets.ion.cesium.com` ever answer 403, 429 or `Retry-After`?
- Does revoking a parent token kill an endpoint token already issued?
- What status comes back when an endpoint token expires?

They feed ion tokens (CS-150), which proceeds without them: refreshing on 403 is dropped if ion never uses 403 for a stale token, once CS-150 measures the real service. Status: to ask.
