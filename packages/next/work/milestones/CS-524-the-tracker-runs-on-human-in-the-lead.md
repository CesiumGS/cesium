---
id: CS-524
title: The tracker runs on human-in-the-lead
kind: capability
status: Planned
created: 2026-11-15
project: CS-18
outcome: Cesium's work is tracked in human-in-the-lead's format with its hitld commands, installed from a release tag, and Dyno's board reads it through human-in-the-lead's read API.
needs: [CS-520 c?, CS-521 c?, CS-522 c?, CS-523 c?]
---

## Why

Cesium's tracker began as its own small format, modelled on human-in-the-lead's, while the plugin was being built; the board was designed to read the tracker through one adapter so that it could switch. Human-in-the-lead's first release candidate (CS-516) ships the files format, `hitld work migrate` and its read API, so the tracker can run on it. Planned on the owner's answer of 2026-11-15.

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

- The migration retires initiatives (human-in-the-lead's HITLD-90): Cesium's seven become long outcomes. CS-388, about initiatives for the newer projects, is reframed for long outcomes.
- The agent system's pages (CS-517) wait on the board reading the read API (CS-523).
