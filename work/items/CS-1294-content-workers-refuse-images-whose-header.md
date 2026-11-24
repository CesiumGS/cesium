---
id: CS-1294
title: "Content workers refuse images whose header doesn't state their size (AVIF, ICO): keep the refusal?"
kind: decision
state: done
created: 2026-11-24
project: CS-191
decider: owner
---

> **Decision for the owner, answered.** Source: CS-969 (content workers bound what a file states), the executor's Q2, relayed by orch-11's report audit (2026-11-24). CS-1266 said Q2 was filed separately, but no item existed. Filed 2026-11-24.

## Question

Images whose pixel size can't be read from the header, such as AVIF and ICO, are now refused before decoding, so an oversized image can't get past the size limit. Keep that refusal?

## Options and recommendation

- Keep refusing (recommended): add an AVIF header reader when a server we support needs AVIF.
- Add an AVIF reader now: keep the refusal, and add an AVIF header reader now, so AVIF imagery works from the start.
- Let them through: decode formats without a size reader, with only the worker watchdog to stop an oversized image.

## Answer

The owner, 2026-11-24: "Add AVIF reader now". The refusal stays for formats without a header reader, such as ICO; an AVIF header reader is its own item.
