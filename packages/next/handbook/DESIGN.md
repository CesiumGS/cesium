# The engine handbook: design and upkeep

## Story and audience

One document about the CesiumJS 2.0 WebGPU engine, for two groups: stakeholders
deciding what gets built, and the 1.x team who will need to know how it differs.
It describes the engine as an embeddable rendering core whose host application
can supply its own services. Anything about the roadmap beyond the plans in
this repository needs the owner's agreement first.

Its promise is that nothing in it pretends. Each tab says how far it goes, each
figure says where it came from and when, each outside fact links to its source
with the date it was read, and where sources disagree the page says so.

## What it's built on

A static site, outside Dyno, on Dyno's stack: React and StrataKit (`Root`,
`unstable_NavigationList`, `Tabs`, MUI's tables, fields and icon buttons, all
themed). It builds to one self-contained HTML file, so it opens from disk and
can be attached or hosted with nothing beside it. It has no router: the hash is
the tab (`#/frames`), so a link goes straight to a tab. Dyno's own data store
and shell aren't reused, as they bring far more than a document needs.

## Handing it out

`npm run handbook` writes one file to hand out:
`handbook/dist/cesium-2.0-handbook-<date>-<commit>.html`, or `-dirty` when the
engine or the handbook has uncommitted changes. Build from a clean commit for
anything that leaves the team. It opens from disk with no server, and the page
itself uses no WebGPU.

Everything is inside the file: scripts, styles, diagrams, data and the font. Only
links to sources use the network, when someone follows them. Its figures are
fixed when it's built, and each page's footer and a
`<meta name="cesium-handbook-build">` tag give the build date and commit.

The font is the one thing fetched at build time: Inter 4.1, pinned by SHA-256 in
`scripts/handbookData.mjs` and kept in the setup store, never in the repository.
Adding it first stops StrataKit's `Root` from requesting it from its usual host.

The build fails, naming the source and never the value, if the page holds a value
from an env file (this checkout's or the main checkout's), anything shaped like
an access token, or this machine's home directory. No env file is loaded into the
build at all (`envDir: false`).

`BENCH_RESULTS_DIR` points the build at another `bench/results`, as a worktree has
only the committed runs.

## Layout

Fifteen tabs don't fit a horizontal strip, so they're a grouped side list on a
desktop and a scrolling strip on a phone. A reading column of about 72 characters
holds the prose; tables and figures may run to 1000 px. Nothing sits on a card:
tables and figures sit on the page, separated by space and headings.

The one bold element is the layer diagram on System architecture. It is drawn
from generated data, with the core filled and every arrow pointing toward it or
down the stack, because that shape is the architecture's main claim. Everything
around it stays quiet. Diagrams use StrataKit's tokens, so one drawing serves
both themes. Bars use Dyno's validated chart palette, and every bar carries its
value.

## Wording

Follow `AGENTS.md`: plain, short sentences; units and datums named. In frames and
camera prose never write "frame" alone: say reference frame, tick, render space
or render root. "Tick" stands in for "per frame" across the handbook. Code names
keep their names (`FrameGraph`).

Keep precision and accuracy apart. Precision is how finely a value can be
represented or repeated: a float32 step, the depth buffer's step. Accuracy is how
close it is to the truth or the best reference: within 27 km of DE440, a stated
±. Two computations agreeing is numerical agreement, and the text says which it
is. The catalog's `Precision` type and `"precise"` level keep their code names,
but they set accuracy, so prose calls them levels.

## Diagrams

A diagram earns its place by showing a mechanism better than prose. Everything in
one is real text, so it can be searched and printed, and nothing hides only behind
hover. `src/diagram.tsx` has what they share:

- `Board`: steps on swim lanes, with arrows drawn from where the cards really are. On
  a phone it becomes one column, each card naming its lane.
- `Tag`: a seam or decision named on a figure, which jumps to its entry.
- `useLayers`: layers of a dense figure that a reader can hide. All start on.

Details closed on screen print open.

| Diagram                                                                     | Source                                                                                                  | Checked    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| Rendering: the frame graph chart's passes and textures                      | Generated from `graph.addPass` and `graph.createTexture`                                                | Each build |
| Rendering: the chart's buffer columns, each pass's note, seams, decisions   | By hand, in `src/pipeline.ts`. The build warns about any pass, test or code name that no longer matches | 2026-11-08 |
| Rendering: one tick, on three lanes                                         | By hand, in `src/tabs/rendering.tsx`                                                                    | 2026-11-08 |
| System architecture: the layer diagram                                      | Generated, but its boxes are placed by hand                                                             | Each build |
| System architecture: what loads when; bundle bars                           | Sizes generated; the board by hand, in `src/flows.tsx`                                                  | 2026-11-08 |
| Tile selection: a tile's states; levels per policy; mixed LOD; cache levels | By hand, in `src/flows.tsx` and `src/tabs/selection.tsx`                                                | 2026-11-08 |
| Frame tree: the tree; one tick of answering                                 | By hand, in `src/tabs/frames.tsx` and `src/flows.tsx`                                                   | 2026-11-08 |
| Cameras: one tick down the chain                                            | By hand, in `src/flows.tsx`                                                                             | 2026-11-08 |
| Shading and linker: the routes to a pipeline                                | By hand, in `src/flows.tsx`                                                                             | 2026-11-08 |
| Precision and accuracy: the chain                                           | By hand, in `src/tabs/precision.tsx`                                                                    | 2026-11-08 |
| Vector rendering, Cesium ion: their flows                                   | By hand, in `src/flows.tsx`                                                                             | 2026-11-08 |

When the frame graph gains a pass, the chart shows it under "Not yet described", and
the build warns. Add its note in `src/pipeline.ts`.

## Keeping it up to date

`npm run handbook` regenerates the figures and builds the file to hand out.
`npm run handbook:dev -- --port <yours>` serves the same page with hot reload.

| What                                    | Where it comes from                                                                       | When it changes                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| API map                                 | `api/surface.txt`                                                                         | Each build                                                           |
| Layers, rules, imports, dynamic imports | `test/importBoundary.test.ts`, run over the import graph                                  | Each build                                                           |
| Bundle sizes                            | `scripts/checkBundle.mjs`, a `vite.lib.config.ts` build                                   | Each build                                                           |
| Frame graph, layout sizes               | `graph.addPass` and `graph.createTexture` under `src/`, `src/render/generated/layouts.ts` | Each build                                                           |
| Run-time file sizes                     | The setup store on the building machine                                                   | Each build                                                           |
| Benchmarks                              | `bench/results`, `handbook/baselines`                                                     | Each build                                                           |
| Outside facts                           | `src/sources.ts`, cited from each tab                                                     | By hand; a source is marked for rechecking 90 days after it was read |
| Prose and hand-drawn diagrams           | `src/tabs/*.tsx`, each with a "checked" date                                              | By hand, with the change they describe                               |

`test/handbookData.test.ts` fails when a source changes shape, naming what to
update in `scripts/handbookData.mjs`.

By hand, when the work changes it:

- A plan lands: move its row on the Overview, and fill in or correct its deep
  dive. A tab goes from stub to sketch to accurate through the `status` on its
  `Page`.
- A new entry point or layer: add its line in `ABOUT` in
  `src/tabs/architecture.tsx`. The diagram places known layers by hand and the
  table lists every layer, so a new one shows in the table first.
- A new dynamic import: add what triggers it to `TRIGGERS` there. Until then the
  table says "Not yet described".
- A browser ships or a proposal moves: read the page, update the tab, and set
  `checked` in `src/sources.ts`.
- An RTX baseline: see `baselines/README.md`.

## Decided while sketching (cheap to change)

- The side list rather than top tabs, as above.
- `packages/next/handbook/` as the location.
- One built file rather than a zip or a folder of assets, as it stays small.
- Generated data isn't committed, so a checkout builds its own figures. A shared
  copy of the page shows the commit it was built from.
- The API tab lists every export as `api/surface.txt` has it.
