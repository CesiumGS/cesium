---
id: CS-818
title: "A catalog and search seam: STAC, CSW and OGC API Records return asset references that sources resolve"
kind: work
state: proposed
created: 2026-11-21
project: CS-191
needs: [CS-552]
---

STAC, CSW, OGC API Records and ion's asset list each answer "what data is there for this place and time?" A catalog seam takes a query and returns asset references that a streaming source or loader then resolves. It's a query seam, like the geocoder, not a content source.

Source: the owner's review of 2.0's seams, 2026-11-21. Why now: it isn't urgent. It's recorded so that CS-552's seam leaves room for it. Rough size: medium. Decider: the owner, when committing it. Filed: 2026-11-21.

## Done when

- A catalog interface, a query in and asset references out, with extents, times, credits and signed-URL renewal through CS-809.
- STAC (including Planetary Computer) and ion's asset list fit it, and a sample STAC catalog loads imagery through CS-810's provider.
