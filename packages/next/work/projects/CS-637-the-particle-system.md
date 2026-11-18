---
id: CS-637
title: The particle system
kind: project
state: planned
created: 2026-11-17
---

## Summary

A GPU particle system, not a port of 1.x's `ParticleSystem`: compute-shader simulation with constant loop bounds, drawing through the point-source seam, forces and emitters as Slang or Cesium IR functions, and emitters in the transform graph. Dense smoke stays with volumetric media. Consumers: weather, flood and wind flow, Artemis exhaust and debris (CS-237, CS-238), and 1.x parity.
