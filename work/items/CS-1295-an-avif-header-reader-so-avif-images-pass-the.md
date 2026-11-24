---
id: CS-1295
title: An AVIF header reader, so AVIF images pass the content workers' size check
kind: work
state: planned
created: 2026-11-24
project: CS-191
needs: [CS-969]
---

> **Committed by the owner (2026-11-24), through the decision on CS-969's Q2: "Add AVIF reader now".** Source: CS-969 (content workers bound what a file states). Filed 2026-11-24.

## Done when

- The image workers read an AVIF file's pixel size from its header (the ISOBMFF boxes) before decoding, and charge it against CS-969's named limits like the other formats.
- AVIF imagery that fits the limits decodes; one that states a larger size is refused by name, with CS-969's fixed text.
- A malformed or truncated header is refused, never decoded on a guess.
- Formats without a header reader, such as ICO, are still refused before decoding.
- Tests cover a valid AVIF, an oversized one, a truncated header and a box that lies about its length.
