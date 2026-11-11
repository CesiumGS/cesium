# Vertical exaggeration

The placement review's acceptance test (plan §13.26, §13.34) as a page: an application exaggerates everything vertically, the globe and its terrain included, through a reference frame and a camera rig alone. Exaggeration is the application's, not an engine feature.

## Audience and story

Engineers who will build exaggeration into their own viewer, and geoscientists who want to know what a measurement means once the picture is stretched. The story is one sentence: **the scene is drawn through a map, and every question is asked in true coordinates.** The slider moves the map; the true numbers stay put and the drawn ones follow it.

## What is on the page

- The Zermatt valley and the Matterhorn: Cesium World Terrain with Bing imagery (the viewer's own terrain globe), Cesium OSM Buildings (ion 96188) as the tileset, the Cesium milk truck (`Specs/Data`, scaled 25 times to read from afar) as the model, and a pin at each summit and at Zermatt.
- A slider, ×1 to ×10. It writes one placement parameter. The camera keeps its true place, so it never ends up inside terrain that has just grown.
- A table of the last pick: its height as it is (ITRF, above the WGS84 ellipsoid) beside the height it is drawn at, and the terrain's sampled true height there.
- A measurement between two places or picks, from the measure module: true height difference and distance beside the drawn ones, drawn as a line of true points through the map.
- Counters for the engine's fits (world.warpStats()): the route's revision, fits made as tiles load, refits (always 0 for the slider) and the warped draws by state.

## How it is built

- `exaggeration.ts` is the whole of the application's part: `verticalExaggeration` (the helper writes the Jacobian and inverse, and marks the warp a height scale so terrain is drawn exactly), `warpFrame` on the catalog's ITRF, and the rig.
- Nothing is set on any item. Pins are billboards, so the engine places them at their anchor and they stay upright; the truck follows the terrain's stretch unless "Truck keeps its shape" sets `warpAt: "anchor"` on its draws.
- `readings.ts` holds the questions, apart from the page so a Node test can ask them (`test/verticalExaggerationExample.test.ts`): a pick gives its true point (`truePick`: the content's own point where the pick resolved one, else the drawn point through the route's inverse at the scale it was drawn at, which the pick carries); `measure` runs on the true points.
- The page reaches for no private API: the warp's `warpForward` and `warpInverse` (which take the live scale), `world.warpStats()` for the counters, `view.toPixel` on true points for the labels, and a camera that the rig carries from ITRF onto the frame across the warp. The camera controller keeps above the ground as drawn by itself.

## Layout

The default overlay panel over the view, in the gallery's plain controls style. Labels for pins and the ruler are HTML over the canvas, placed from the true point's pixel (`View.toPixel` carries it through the route). A pick shows a ring that stays on the true point as the heights change.

While the terrain and buildings load, a card over the view (the B-reps example's: a spinner and the stage) says what is awaited: the terrain, the buildings, then the tiles still queued to fit (`world.warpStats()`). It goes once the terrain and buildings are drawn and no fit is pending, for good (`loading.ts`: a camera that moves loads more, which doesn't bring it back), and takes no input.

## Known edges

- A pick's point is the content's own where the pick resolved a domain point (a mesh's triangle or a b-rep face); on the bare ellipsoid or a billboard it is the drawn point taken back through the route (provisional, and the page says so).
- The low sun is set by `viewer.setSun`, not the clock, so the faces the camera looks at are lit.
- The ruler's label and pins are not hidden behind terrain: they are HTML.
