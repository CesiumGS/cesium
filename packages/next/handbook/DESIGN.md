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

## The live view

Overview's "See it run" draws a small scene with the real engine, from inside the
one file, with no network and no token. `viewer/` holds its scene. `vite.config.ts`
builds that as one module and puts it in the page as inert text
(`<script type="text/plain" id="live-engine">`), so nothing parses it until a reader
presses Start, when `src/live.tsx` imports it from a blob.

It reaches past the public API in three places, all in `viewer/`:

- `viewer/workerPool.ts` replaces `src/io/WorkerPool.ts`, because Chromium won't
  start module workers from a page opened from disk, even from a blob. It decodes
  on the main thread and answers only terrain and image requests.
- It imports `flatTerrainTile` from `src/globe/quantizedMesh.ts`, for those requests.
- `viewer/slang.ts` replaces `src/scene/slang.ts`, as the scene compiles no Slang.

`viewer/natural-earth-world.jpg` is Natural Earth II (public domain,
naturalearthdata.com), stitched from the engine's level 2 tiles at 2048 by 1024.
It's one tile because the engine addresses a geographic provider's level as a square
grid, with Mercator rows in `GlobeImagery.job()`, which doesn't suit a geographic
pyramid. If that changes, check the map still sits in the right place: the towers
stand in Switzerland.

Check by hand when the engine changes: from `file://`, with stock browser flags, it
starts on a click, the map and shadows look right, dragging orbits, and it submits
no GPU work before the click, while idle, out of view or on another tab. A lost
device shows the message and doesn't retry.

## Layout

Nineteen tabs don't fit a horizontal strip, so they're a grouped side list on a
desktop and a scrolling strip on a phone. A reading column of about 72 characters
holds the prose; tables and figures may run to 1000 px. Nothing sits on a card:
tables and figures sit on the page, separated by space and headings.

The one bold element is the layer diagram on System architecture. It is drawn
from generated data, with the core filled and every arrow pointing toward it or
down the stack, because that shape is the architecture's main claim. Everything
around it stays quiet. Diagrams use StrataKit's tokens, so one drawing serves
both themes. Bars use Dyno's validated chart palette, and every bar carries its
value.

## The 1.x to 2.0 comparison

`src/apiMap.ts` is written by hand, row by row, and each claim is checked against
the code. `scripts/handbookData.mjs` reads 1.x's public names from its source, and
`test/handbookData.test.ts` fails when a 2.0 name in a row no longer exists, an
exported 2.0 name has no row, or a 1.x name or member doesn't exist. When the API
changes, add or fix the row; a row marked `inFlight` needs checking when that work
lands. `snippets/` holds its tasks: `<id>.next.ts` compiles against the real types
in that test (and with `tsc -p handbook`), and `<id>.1x.txt` has its `Cesium.` names
and static members checked against 1.x's source, while its instance members were read
from that source by hand, checked 2026-11-08. Use `yourIonToken` as the placeholder
in any snippet.

## Code blocks

Use `CodeBlock` from `src/parts.tsx`, never a bare `pre`. It takes a language
(`ts`, `js`, `json`, `shell` or `text`) and draws real, copyable text on its own
surface with a border. Tokens come from `src/highlight.ts`, which runs the
stream parsers in `@codemirror/legacy-modes` with no editor, so it adds no
dependency. The token colours passed WCAG AA on each theme's block background,
checked on 2026-11-08 (4.5:1 is the floor; the lowest is 5.6:1); check again if
they change.

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

| Diagram                                                                          | Source                                                                                                                                                                         | Checked                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| Rendering: the frame graph chart's passes and textures                           | Generated from `graph.addPass` and `graph.createTexture`                                                                                                                       | Each build                   |
| Rendering: the chart's buffer columns, each pass's note, seams, decisions        | By hand, in `src/pipeline.ts`. The build warns about any pass, test or code name that no longer matches                                                                        | 2026-11-08                   |
| Rendering: how translucent terrain draws                                         | By hand, in `src/flows.tsx`                                                                                                                                                    | 2026-11-08                   |
| Rendering: one tick, on three lanes                                              | By hand, in `src/tabs/rendering.tsx`                                                                                                                                           | 2026-11-08                   |
| System architecture: the module stack; what an app loads                         | Layers, rules and sizes generated; each block's words by hand, in `src/modules.tsx`. A new layer shows as "Not yet described"                                                  | Each build; words 2026-11-08 |
| System architecture: what loads when; bundle bars                                | Sizes generated; the board by hand, in `src/flows.tsx`                                                                                                                         | 2026-11-08                   |
| Shadows: one tick; a cascade seen from above                                     | By hand, in `src/tabs/shadows.tsx`                                                                                                                                             | 2026-11-08                   |
| Shadows: how far the cascades reach                                              | Computed at build time by `src/scene/shadows.ts` itself                                                                                                                        | Each build                   |
| Tessellation: the seam and the engine it leaves room for; the chart's dashed row | By hand, in `src/tabs/tessellation.tsx` and `src/pipeline.ts`, from the plan 5 spec                                                                                            | 2026-11-08                   |
| 1.x to 2.0 API: the mapping and its tasks                                        | By hand, in `src/apiMap.ts` and `src/snippets.ts`. Counts and shares generated                                                                                                 | 2026-11-08                   |
| Overview: the design targets and what they cost                                  | By hand, in `src/goals.tsx`, `src/costs.tsx` and `src/tabs/overview.tsx`, from the plans and 1.x source. Figures generated where the data exists; others cite the plan         | 2026-11-08                   |
| Overview: the live view's still, `shots/live-globe.webp`                         | Captured by hand from the live view itself, in Edge. Holds only the globe                                                                                                      | 2026-11-08                   |
| Dyno: how the pieces fit; each view by its job                                   | By hand, in `src/tabs/dyno.tsx`, from `bench/suite` and the overall plan, section 16                                                                                           | 2026-11-08                   |
| Dyno: screenshots in `shots/`                                                    | Captured by hand from a short run of the one redistributable scene, in both themes where cheap. Check each by eye for tokens and account details. Licensed renders never go in | 2026-11-08                   |
| Tile selection: a tile's states; levels per policy; mixed LOD; cache levels      | By hand, in `src/flows.tsx` and `src/tabs/selection.tsx`                                                                                                                       | 2026-11-08                   |
| Frame tree: the tree; one tick of answering                                      | By hand, in `src/tabs/frames.tsx` and `src/flows.tsx`                                                                                                                          | 2026-11-08                   |
| Cameras: one tick down the chain                                                 | By hand, in `src/flows.tsx`                                                                                                                                                    | 2026-11-08                   |
| Shading and linker: the routes to a pipeline                                     | By hand, in `src/flows.tsx`                                                                                                                                                    | 2026-11-08                   |
| Precision and accuracy: the chain                                                | By hand, in `src/tabs/precision.tsx`                                                                                                                                           | 2026-11-08                   |
| Vector rendering, Cesium ion: their flows                                        | By hand, in `src/flows.tsx`                                                                                                                                                    | 2026-11-08                   |

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
