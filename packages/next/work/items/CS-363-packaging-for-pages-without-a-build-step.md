---
id: CS-363
title: Packaging for pages without a build step
kind: work
state: proposed
created: 2026-11-13
project: CS-199
---

## Done when

`exports` point at built files, a classic-script build exists, re-bundling `dist-lib` is tested, and `Engine.create` takes the worker URL so an app can keep WebAssembly off its page under strict CSP.

Detail: `docs/design/examples-and-the-gallery.md`, "Pages without a build step".
