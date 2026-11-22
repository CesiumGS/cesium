---
id: CS-569
title: Mars is a known body, so a Mars tileset loads on its own ellipsoid instead of refusing
kind: work
state: planned
created: 2026-11-17
project: CS-188
touches: [packages/next/src/scene/Body.ts, packages/next/src/frames/**, packages/next/src/streaming/**, packages/next/test/**]
---

Since CS-200 (merged 2026-11-17), a tileset whose `3DTILES_ellipsoid` radii match no known body refuses to load with `TilesetBodyError`, where before it silently used the Earth's ellipsoid. The known bodies are `EARTH` and `MOON` (`src/scene/Body.ts`). So a Mars tileset, like the Cesium Mars tileset on the owner's ion account (kept for second-body testing), now refuses instead of loading wrongly. The owner approved CS-200's merge with this follow-up.

## Done when

- `MARS` is a known body, with its radii from a cited source (the IAU's report on cartographic coordinates and rotational elements, or the tileset's own `3DTILES_ellipsoid`, with the two compared and any difference stated), and `tilesetBody` resolves a Mars tileset to it.
- A Mars tileset loads on Mars's ellipsoid: horizon culling and selection use Mars's radii, as CS-200 made them do for the Moon.
- Where it hangs in the frame tree is stated: a Mars body-fixed reference frame if the frames library can give one, or a refusal that says what's missing, never a silent Earth anchor.
- A test loads a tileset with Mars's radii, and one with radii of no known body still refuses.
- A browser check loads the owner's Mars tileset on a server of the executor's own, never 5190 or 5199, with the ion token from `.env.local` only.
