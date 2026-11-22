---
id: CS-959
title: Where does the coordinate contract the source seam uses live?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T20:39:18.827Z
answered_via: question-tool
answered_by: owner
---

## Question

Rows name a coordinate system as a string that nothing in core can convert, and a host's coordinate service never reaches the source seam. Where does the coordinate contract live?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. A small contract in core, implemented by crs-proj or the host and registered per engine; CoordinateService and CS-882's seam build on it.
- B. Two seams above core; each source adapter and writer takes a coordinate service as its own option.

Recommended: A.

## Answer

Open.
