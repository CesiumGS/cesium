---
id: CS-1158
title: Hostile content can't hang the GPU, exhaust a worker or reach past its tile
kind: milestone
state: planned
created: 2026-11-23
project: CS-191
outcome: A tileset, model or file from an untrusted source can't run a shader loop without bound, make a worker allocate or recurse past stated limits, name a feature in another tile, or send credentials to another origin; each limit has a test.
constraints: [CS-966 c?, CS-969 c?, CS-970 c?, CS-971 c?, CS-972 c?]
---

## Notes

Grouped from alpha.1's loose work items (CS-1157): the hostile-content checks from the Fable reviews of 2026-11-22.
