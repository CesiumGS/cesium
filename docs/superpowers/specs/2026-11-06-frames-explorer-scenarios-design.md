# Frames Explorer: Scenarios Around the Frame Tree

The frames-explorer gallery example (`packages/next/examples/frames-explorer/`) works, and its verification is strong: 225 judged results against published references. But it reads as a test report with a globe attached. The owner finds it confusing. Its primary purpose should be **demoing what the frame tree can do**, with verification as supporting evidence.

This design rethinks the example's information architecture around **scenarios**. Each scenario is a real problem, solved by building the frame tree that problem needs, with the result shown on the globe.

## Why

- **The tree is the product being shown.** Today it's a list inside a tab. The power isn't visible: one system configured differently for very different problems, objects on different branches that just work, accuracy carried end to end.
- **Two audiences** (unchanged from the plan's R16):
  - graphics engineers exploring the proof of concept, who need a striking, legible demo;
  - subject-matter experts (geodesy, surveying, GIS, space, maritime), who need to see their kind of problem solved, honestly.
- **Configurability is the point.** A fixed tree with parts faded undersells it. Each problem gets its own tree.

## Goals

1. **The globe stays the hero** (owner's choice: direction C). It's where the tree's results are seen.
2. **A large, live frame-tree diagram is docked beside the globe,** replacing the tree list in the Explore tab. It is a node-and-edge diagram, not a list.
3. **A scenario strip replaces the six-stop tour.** Choosing a scenario builds that scenario's own frame tree and reconfigures both the diagram and the globe.
4. **Each scenario builds its own tree.** It starts from the built-in bodies and adds only the frames the problem needs. In the diagram, frames the scenario added are visually distinct from built-in ones. When you switch scenarios, the tree visibly rebuilds, with the added frames attaching in place.
5. **Each scenario answers one headline question,** shown on the globe and in the tree at once. Example: "Where does DSS-43 point to see Orion, and how long does the signal take?"
6. **Knobs, not an editor** (owner: "i don't want this to become an editor"). Each scenario exposes three or four knobs on the frames it added. The tree's shape never changes, and nobody adds or removes frames or types definitions. Turning a knob recomputes the tree, and the globe and the numbers respond live.
7. **Branches are first-class.** Whenever a scenario relates two objects on different branches, the diagram lights the path from one object up to their common ancestor and down to the other. The capstone scenario makes this the point.
8. **Each scenario carries its own proof, and the proof follows the knobs** (owner's choice: "i want it always to be honest and transparent but also show what happens when you twiddle stuff"). Each scenario has a **checked setup**: the knob values where its published references apply (R10).
   - **At the checked setup:** the proof shows the scenario's backing checks from the stress catalog, judged against their published references, in the existing result-row and inspector form (value against tolerance, accuracy, source, trace).
   - **Off the checked setup:** the proof re-runs at the live knob settings. Everything that can be judged live is judged live: round trips, consistency between paths, and the accuracy statement. Checks whose reference exists only at the checked setup say so, and show how the live answer differs from the checked one: "published reference applies at the checked setup; your setting moves the answer by …".
   - A persistent marker says whether you're at the checked setup or off it, and a "Back to the checked setup" action returns there.
   - Nothing reads as verified that isn't.
9. **Accuracy is always on screen** (R8 carries over). Every edge in the diagram, every headline answer and every overlay shows its accuracy, or says plainly that it isn't bounded.

## Non-goals

- **A tree editor:** no adding, removing or re-parenting frames, and no free-form frame definitions.
- **Replacing the stress catalog.** The 225-result catalog, its data test and its fingerprints stay as they are. They remain the regression test and the evidence base.
- **New library capability** beyond what the scenarios need. Where a scenario needs something the library lacks, the scenario says so plainly (see Maritime).

## Anti-goals (a failure even if it technically works)

- **The page still reads as a test report,** or the tree is still hard to find.
- **Scenarios that are variations of one tree:** the set must show structurally different trees.
- **Knobs that turn into an editor,** or so many knobs that a scenario needs instructions.
- **A confident answer without its accuracy,** or a known limitation hidden (a backdrop Moon, a chart datum we don't have).
- **Visual clutter that hides the globe.** The owner's quality bar for UI is high; see the UX review history in `.superpowers/sdd/…/ux-review.md`, and DESIGN.md.

## The scenarios

Ten scenarios, each with its tree (added frames in **bold**), its headline question, and its knobs. Structurally different trees are the point.

1. **The Earth turns.**
   - Tree: ITRF ↔ GCRF, purely rotational.
   - Question: how does the ground move against the stars?
   - Knobs: time and rate; measured against predicted Earth orientation (the accuracy grows with prediction age).
2. **A BIM site on the globe.**
   - Tree: **site grid** → design CRS → datum → ITRF, through PROJ.
   - Question: where exactly does this model sit, and how far off would a rigid placement be?
   - Knobs: the design CRS (California zone 3, UTM 10N, a low-distortion zone); the site's rotation and scale.
3. **Survey a corridor.**
   - Tree: **alignment** (station and offset, with spirals) → design grid → ITRF.
   - Question: what station and offset is this point at?
   - Knobs: drag a point along the alignment and set its offset.
4. **A dish tracks a spacecraft.**
   - Tree: **DSS-xx ENU** → ITRF → GCRF on the Earth branch; **Orion's trajectory** under GCRF.
   - Question: where do I point, how long does the signal take, and can I see it?
   - Knobs: the station (Goldstone, Canberra, Madrid); time.
5. **A drone over the site.**
   - Tree: **drone body frame** on a **track** over ITRF, with a **camera mount** on the body; the site's design grid below.
   - Question: what is the camera looking at on the design grid?
   - Knobs: the mount's tilt; position along the track; the height datum (ellipsoid or NAVD88).
6. **Where's the Moon from here?**
   - Tree: a **California site ENU** on the Earth branch, and the Moon on its own branch, meeting at ICRF.
   - Question: where is it in the sky, and how far?
   - Knob: time.
7. **One path, three frames.**
   - Tree: Orion's trajectory drawn in GCRF, ITRF and MOON_ME.
   - Question: why does the same trajectory look so different?
   - Knob: the frame to draw in. This is the clearest demo that the frame you look from matters.
8. **Stand on the Moon.**
   - Tree: **lunar site** → MOON_ME → MOON_ICRF → ICRF.
   - Question: how fast does a clock here run?
   - Knobs: the site's latitude; time.
   - The drawn Moon is the sky's backdrop disk until plan 5 draws it as a tileset in MOON_ME, and the scenario says so.
9. **A ship enters San Francisco Bay** (maritime).
   - Tree: **ship body frame** (heading, pitch, roll) on a **track** over ITRF, with a **mast sensor** on the ship; the port's design grid.
   - Question: where is the ship on the port's design grid, and can the mast see the buoy past the headland?
   - Knobs: time along the track; the sensor's height; the height datum (ellipsoid or NAVD88).
   - Mean lower low water (the chart datum) is plan 4b, and the scenario says so plainly.
   - Data: a small extract of one vessel's public-domain AIS track from NOAA (marinecadastre.gov), fetched by setup like the other data and cited. If that proves impractical, a clearly labelled synthetic track. This is the designer's call; the owner asked "if we have the data".
10. **Everything at once** (the capstone; branches).
    - Tree: a dish on the Earth, the ship at sea, Orion in transit and a site on the Moon, all live in one tree.
    - Question: pick any two, and get their distance, light time and line of sight, with the path through the tree lit.
    - This proves that objects down different branches just work.

The order on the strip is the builder's call. It should open on something immediately striking for a graphics engineer, and build toward the capstone.

## How the page works

**Layout (direction C):**

- The globe takes most of the space.
- The tree diagram sits beside it, in Dyno's side column or alongside the canvas; the builder decides, within Dyno's frame (R17 of the existing plan).
- The scenario strip runs across the top of the content.
- Each scenario's knobs and proof sit with the diagram.
- On narrow views, it degrades sensibly: the diagram collapses to a compact path view, for example.

**The tree diagram:**

- **Nodes:** frames, coloured by family (the existing palette: Earth, Moon, inertial, engineering, trajectory). Added frames are distinct from built-in ones.
- **Edges:** each shows its kind (rotation, translation, IERS affine, constant, trajectory, PROJ operation) and its accuracy.
- **Selection:** selecting a node or edge shows its detail. That reuses the existing walk and edge detail, which the UX review praised.
- **Animation:** the path a scenario's question travels lights up edge by edge as it computes. Respect reduced motion.
- **Rebuilding:** switching scenarios animates the tree into its new shape.

**The headline answer** shows as a callout on the globe and in the panel, with its accuracy. Knob changes update it live.

**Proof** is a compact list with the scenario. At the checked setup, its rows are the scenario's backing checks, linked by id to the existing stress catalog, and open into the existing inspector (value against tolerance, source, trace). Off the checked setup, rows re-run at the live settings, as in goal 8.

- This needs a parameterised run path in the worker: run a scenario's checks with knob values.
- The fixed catalog run, its data test and its fingerprints stay as they are, at the checked setups.
- The "checked setup" marker and "Back to the checked setup" sit with the knobs.

**What happens to today's features:**

- **The tour** is replaced by scenarios. Scenarios 2 (BIM, which absorbs the design grid with true north and the rigid-vs-exact inset), 4, 7 and 8 absorb its stops.
- **Explore's overlay toggles** become each scenario's overlays.
- **Verify** (the full catalog, lenses and question cards) and **Report** remain, but secondary: reached from a "Verification" entry, not the page's first view.
- **The clock** stays.
- **The camera work** (orbit controls in space, the pivot marker, Frame content) and the lunar fixes carry over.

## Constraints

- **Everything in the example's existing plan and DESIGN.md still binds** unless this document changes it:
  - StrataKit, Dyno's design guide and the gallery contract (React panel, params, `link`);
  - accuracy always shown (R8) and loading always visible (R9);
  - the worker for PROJ and runs (R13);
  - untrusted strings rendered as text;
  - the ion token kept private;
  - published references, not PROJ, for expected values (R10).
- **Real terrain for the ground** (owner's choice, with 1.x's visibility work as prior art: "it's good to start folding this kind of functionality in").
  - Line of sight (the ship's mast to the buoy past the headland) and the drone camera's footprint test against the globe's streamed terrain, through an additive, tested library function. It samples the terrain along the ray, or intersects it, through a height sampler such as the one the globe controller already uses (`terrain.sampleHeight`).
  - The answer's accuracy includes the terrain's own (its resolution and vertical accuracy), shown per R8.
  - A sampled viewshed overlay for the mast sensor or the drone camera (which ground is visible from it) is a welcome extension if the line-of-sight function makes it cheap. A GPU, shadow-map viewshed is later work: note it for plan 5's renderer items, not here.
- **Library first.** Scenarios use the library's public API (`src/index.ts`). Moving body frames (the drone, the ship) are user-defined `Frame`s with a time-dependent transform to their parent: `Frame` takes a `toParent(instant)` function, and trajectories give position. If a scenario needs a library addition, it's additive and tested, like the earlier fixes.
- **Deep links** (R15) cover the scenario, its knob values and the selection, so a scenario state can be shared.
- **The stress catalog stays green:** `npm test` and `npm run test:data`.

## Designer's calls (from the builder check)

These are settled here; the owner can override them:

- **The tree model:** extend `tree.ts` with a per-scenario tree builder and an "added" flag on nodes. Node ids stay compatible with the existing `select=` deep links. Nodes and edges get new keys in the same scheme (for example `select=node:…`, `select=edge:…`). Verify, Report and the inspector are reused unchanged.
- **Moving bodies:**
  - The drone's and the ship's body frames are example-defined `Frame`s on their tracks.
  - Heading comes from the track's velocity. Pitch and roll are modelled (a gentle, labelled sea state for the ship; level for the drone), because AIS carries position only.
  - Each added frame states its own accuracy: AIS position quality from the message's accuracy flag (about 10 m for high-accuracy fixes), or "not bounded" with a reason.
- **The lunar site** stays an east-north-up frame on MOON_ME.
- **Data:** the AIS extract is fetched by `npm run setup`, with its manifest entry and SHA pin like the other data, and cited. If it's missing, the scenario shows the usual R9 "missing, run `npm run setup`" state. A synthetic track is used only if the extract proves impractical, and is labelled.
- **The engine:** one engine and one world for all scenarios; switching tears down and rebuilds the scenario's overlays. Splitting `main.ts` into per-scenario modules is expected; it's a refactor, not a rewrite of the working parts.
- **Time:** each scenario pins a default epoch as part of its checked setup, so the answer and the proof are reproducible. The clock can move from there (off the checked setup), and deep links carry the time.

## Left to the builder

- The diagram's layout algorithm and rendering: plain SVG with StrataKit tokens is the expected default.
- The scenario strip's order and visual form, and each scenario's camera framing.
- Exact knob ranges and defaults.
- Which existing checks back each scenario, and any new checks a scenario needs, such as the ship's and the drone's. New checks follow R10.
- How the diagram fits Dyno's side column, and the narrow-view fallback.
- How a scenario's tree is defined in code. Something that reads like configuration is the aim, so the code itself shows how easy the tree is to build. A "how this tree is built" disclosure showing that configuration is a welcome touch for graphics engineers. This is the designer's suggestion, not a requirement.

## Related

- `docs/superpowers/plans/2026-11-06-frames-explorer-example.md`: the existing plan, R1–R18.
- `packages/next/examples/frames-explorer/DESIGN.md`: the visual language, the globe rules and the HUD.
- `CESIUM2_WEBGPU_PLAN.md` §13.14: plan 5's design inputs (camera rigs attached to frames; design space and the global view, with a morph), which this example will later demonstrate.
