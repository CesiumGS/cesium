---
id: CS-265
title: "The styling language: its form, where its spec lives, and when it goes to the 3D Tiles group?"
kind: decision
state: dropped
created: 2026-11-13
project: CS-190
decider: owner
reason: "Superseded by the owner's piecewise answers of 2026-11-23: any language lowers to Cesium IR, whose JSON and conformance vectors live in the Rust workspace's IR crate (CS-1130); an experimental language of our own plus a 1.x front end ship with 2.0 (CS-1140); a proposal goes to the 3D Tiles group after the plan settles (CS-1143). Closed as superseded on the owner's word."
---

## Question

The styling notes are brainstorms. Cesium IR's decisions settled the IR, its normative JSON and the numeric semantics; the language above it is open. Sources: `docs/design/styling-language.md`; `docs/design/styling-and-a-shared-ir.md`, "Questions for the owner".

## Options and recommendation

- **Form:** a declarative document, restricted JavaScript or TypeScript, or both lowered to one JSON interchange. Both notes recommend both, on one interchange.
- **The spec:** standalone and referenced by 3D Tiles, with runtime classes for 2D, draped and free 3D content.
- **Who takes a proposal to the 3D Tiles working group, and whether the language ships with 2.0 or after.**

## Answer

Open.
