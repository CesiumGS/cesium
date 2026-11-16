---
id: CS-520
title: Install human-in-the-lead v0.1.0-rc.1, pinned, with its first-run setup
kind: work
status: In progress
claimed: hitld-migration
created: 2026-11-15
project: CS-18
needs: [CS-516]
---

Cesium uses human-in-the-lead only from release tags. Install the plugin and its `hitld` command pinned to `v0.1.0-rc.1`, with its first-run setup. The setup writes the owner's person and machine settings files, outside the repository; that step is the owner's.

## Done when

- `hitld version` reports 0.1.0-rc.1 in this repository, installed from the tag, with no machine path in any committed file.
- The owner's person and machine settings files exist, and `hitld config explain` shows the layers that apply here.
- The stale `hitl-adopt` branch and its worktree are removed, with the owner's OK; it predates the plugin's names.
