# Transform graph: design

**Story.** One example, eight scenes, one idea: _where content and the camera sit in a graph of nodes decides what is warped._ Each scene is a small tree of affine, smooth and switch nodes, built with the engine's own frames (`smoothFrame`, `switchFrame`, `bindAnchor`, `View.setParameter`) and the built-in transforms. The panel makes the tree visible.

**Audience.** Engine users who need to place a deformer, a CRS, a lens or a sheet, and subject-matter experts who need to trust a number. Every readout names the node it is in.

**Layout.** A side panel, top to bottom:

1. the scene picker (eight numbered choices);
2. the scene's caption and its design point;
3. its controls (sliders, switches, shots);
4. readouts, true beside drawn, from `pickIn`, `pointIn` and `measureIn` through the frames' graph;
5. the graph: the nodes with their kinds, what sits at each, affine runs collapsed, and the route of the last pick lit, with its direction through each smooth node;
6. sources and credits.

A loading card names what the view waits for. Scenes with no globe get a plain studio (background, procedural light).

**Scenes and what makes each one honest.**

| #   | Scene                           | Nodes                                                                                             | Data                                                                  |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | Exaggeration over Earth content | ITRF > exaggeration with a ceiling (smooth); satellite and Moon at other nodes                    | Cesium World Terrain, OSM Buildings; synthetic satellite and Moon     |
| 2   | Split view                      | the same node, a value per view (`View.setParameter`)                                             | as 1                                                                  |
| 3   | BIM site in UTM                 | exaggeration > geographic to geocentric > UTM 48S (grid to geographic) > site grid                | synthetic port at Tanjung Priok                                       |
| 4   | Plan and profile                | site (ENU) > switch (corridor unroll, or a translation, by view) > vertical ×k (a value per view) | swissTLM3D road, baked to 40 vertices; terrain heights from the globe |
| 5   | Seismic time to depth           | exaggeration > survey > depth > time (velocity model)                                             | F3 Netherlands inline by Range request (CC BY-SA); synthetic fallback |
| 6   | Exploded assembly               | assembly > one affine node per part                                                               | AS1 STEP at run time; NIST parts as the fallback                      |
| 7   | Lens on the camera              | camera pose > lens (Brown–Conrady) > world in camera space                                        | synthetic city; approximate Phantom 4 Pro coefficients                |
| 8   | Time-varying subsidence         | ITRF > bump with a time-driven amplitude                                                          | synthetic bowl, Jakarta                                               |

**Glue the example carries** (each is something the engine could take):

- `liveEdge.ts`: a built-in graph edge as the spec `smoothFrame` takes, with a slider float and a Jacobian by differences where the edge writes none;
- `utmInverse.ts`: the unprojection (UTM grid to geographic) with its restricted-JS source, since the built-in runs the other way.
