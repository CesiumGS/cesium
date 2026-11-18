---
id: CS-584
title: The widgets library
kind: project
state: planned
created: 2026-11-17
---

## Summary

A widgets package of React components built on StrataKit, plus thin DOM wrappers for pages without React (owner, 2026-11-17). React is a peer dependency of the widgets package only; core never sees it. The Viewer is composed from these widgets. It covers every job 1.x's widgets did: the timeline, credits and inspector that exist, and the geocoder, base layer picker, info box, selection indicator, home, fullscreen, navigation help, scene mode and projection pickers and the VR button. Record: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
