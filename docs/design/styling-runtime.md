# A shared styling runtime (design note, 2026-11-23)

**What this holds:** The architecture the owner decided on 2026-11-23 for a styling runtime shared across viewers, what Cesium 2.0 must reserve for it before beta.1 (CS-531), and what stays open. The runtime is Rust compiled to WebAssembly. Any styling language lowers to Cesium IR, the runtime plans the work, and each viewer runs it. **Nothing here is built. The Rust workspace that will hold the runtime isn't started yet.**

**Read first:** "The decisions at a glance" (section 1), then "What 2.0 must reserve before beta.1" (section 11) and "Open" (section 12). The rest is the detail behind them.

**What it read.** Main at `a82d9c4afd`, 2026-11-23. Paths are in the repository, with packages under `packages/<name>/src/`. A claim about existing code or documents is marked _checked_ (read on that commit, with the file) or _unverified_. Everything about the runtime itself is design, not code.

**Marks on each part.** _Decided_: the owner answered, and the item says which. _Open_: a question the note raises and nobody has answered. _For later_: decided in direction, to be settled when something else lands. _Proposed_: filed or to be filed as a proposal (CS-686), and the owner hasn't committed it. _Not begun_: nothing of it exists yet. The sketches of types are to fix ideas. They are not an API.

## 1. The decisions at a glance

| Part                                           | Status    | Where it is settled                      |
| ---------------------------------------------- | --------- | ---------------------------------------- |
| The workspace, the IR crate, the boundary      | Decided   | CS-1129, CS-1130, CS-1131                |
| Rust and WebAssembly in production builds      | Decided   | CS-1133 (naga: open, section 12)         |
| GPU-first evaluation                           | Decided   | CS-1134                                  |
| CPU forms of generators, for WebGL 2           | Decided   | CS-1135                                  |
| A pure, total, metered IR and a plan format    | Decided   | CS-1136                                  |
| Label placement split between CPU and GPU      | Decided   | CS-1137                                  |
| Overflow of a generator's GPU buffer           | Decided   | CS-1138                                  |
| Units as IR types                              | Decided   | CS-1139                                  |
| An experimental language of our own, and 1.x's | Decided   | CS-1140                                  |
| A MapLibre expressions front end               | Decided   | CS-1169 A, CS-1170                       |
| MapLibre style documents as a front end        | For later | CS-1169 A, CS-1171 (proposed)            |
| CSS Color 4 in, linear-light sRGB out          | Decided   | CS-1141                                  |
| An explicit missing value                      | Decided   | CS-1142                                  |
| Custom shaders compose after the style stage   | Decided   | CS-1132                                  |
| Per-feature state and feature identity         | Decided   | CS-1108 and the identity decisions below |
| A proposal to the 3D Tiles group               | For later | CS-1143: after the plan settles          |
| The plan format's shape, the IR's new ops      | Open      | Section 12                               |
| The experimental language's syntax             | Open      | Section 12                               |
| The Rust workspace itself                      | Not begun | Section 2                                |
| The four shapes 2.0 reserves before beta.1     | Not begun | Section 11: proposals to file            |
| Contours as the first test case                | Proposed  | Section 10.2; CS-337, rescoped           |

## 2. What this is, and the decisions behind it

Any styling language lowers to Cesium IR. One runtime, written in Rust, turns that IR into a plan: CPU jobs, GPU kernels, and styled geometry in a fixed layout. Each viewer runs the plan on its own job system and its own GPU device. Cesium 2.0 is one such viewer. Another engine with its own job system and device is another.

The runtime owns the parts that are costly to write twice and must agree across viewers: generators, operators, aggregation and clustering, and label placement and collision.

**The workspace isn't started.** The Rust workspace, its crates and the new 3D Tiles decoder have no code yet, and where they will live is not settled beyond CS-1129. Everything below about the crates is the shape the owner chose, not a description of code.

- **CS-1129:** The runtime lives in one Rust workspace with the new 3D Tiles decoder: separate crates for the IR, the decoder and the styling runtime, WebAssembly packages for browsers, and a C interface for other engines.
- **CS-1130:** Cesium IR's spec and conformance vectors live in that workspace's IR crate. 2.0 pins a version and runs the vectors in its tests.
- **CS-1131:** The runtime plans and compiles; the viewer executes. CPU work is jobs on the viewer's job system. GPU work is IR compute kernels with declared buffers. Outputs stay in viewer-owned GPU buffers and feed indirect draws.
- **CS-1132:** Custom shaders compose after the style stage. They read the style's outputs and may override them.
- **CS-1133:** Amended fully: WebAssembly is required to run 2.0, and Rust and WebAssembly are used wherever they help.
- **CS-1134:** GPU first: whatever lowers to the GPU runs there. The runtime's CPU jobs handle strings, aggregation, generators, and CPU-side picks and queries. The planner decides per expression.
- **CS-1135:** Every generator has a CPU form in the runtime, run as jobs, with its output uploaded once. A WebGL 2 viewer uses it.
- **CS-1136:** The IR stays pure, total and metered, gaining strings, an item rate and bounded loops. A separate, versioned plan format describes execution as a typed graph of stages (inputs, outputs, buffers, budgets) referencing IR functions, with styling as its first user.
- **CS-1137:** Text shaping and candidate positions run on the CPU. Per-tick collision and fading is a GPU kernel. A WebGL 2 viewer uses the CPU form.
- **CS-1138:** A kernel counts what it dropped. The viewer reads the count later without stalling, reports it on `Engine.errors`, and grows the buffer or coarsens the generator on the next run. Nothing writes past a buffer.
- **CS-1139:** Units are IR types. Every front end and evaluator agrees, and a mixed expression is refused by name.
- **CS-1140:** An experimental language of our own ships in 2.0, plus a front end for the 1.x styling language. Both lower to the IR.
- **CS-1141:** Styles write any CSS Color 4 space. The IR converts at compile time. `StyleOutputs.color` is linear-light sRGB with straight alpha.
- **CS-1142:** A missing property reads as an explicit missing value: an option type with defaults that make it total. The 1.x front end maps `undefined` onto it. `NaN` stays a number.
- **CS-1143:** A styling proposal goes to the 3D Tiles group after the plan settles. The answer doesn't say who takes it.
- **CS-1169:** MapLibre expressions now, whole style documents later. An experimental MapLibre expressions front end lowers to the IR alongside MVT (CS-557), as CS-1170. Whole style documents follow as their own item (CS-1171) once label placement and the styling runtime's outputs settle.

The owner also settled how the runtime sees a feature. These are the decisions this note leans on:

- **CS-1108:** Per-feature state is run-time columns keyed by stable ID, which styles read. An application builds its override table on them. There is no separate override table.
- **CS-1087:** A content's identity is a name its declarer (the application or a resolver) gives it. No URL text enters an ID.
- **CS-1100:** Content with no declared name digests everything its kind receives except the declared credential. That can split content, never merge it.
- **CS-1101:** A declared name is text in a grammar no URL satisfies. Change sets carry it. The engine's own messages never print it.
- **CS-1084:** A new version of the data changes feature IDs only when the declarer puts the version in the content's name.
- **CS-1089:** Tilesets' own IDs take the declared name too, so there is one identity rule.
- **CS-1088:** Applications don't save feature IDs until the API review settles the key's encoding (CS-1081, planned). They save the source's keys.
- **CS-1085:** Nobody holds a feed change for a feature that isn't loaded. The feed updates loaded rows, and the source's next load brings committed state.
- **CS-1102:** The engine drops a peer's insert of a new feature. The source invalidates the content that holds it, and the reload shows it.
- **CS-1086, CS-1103:** CS-847's restructuring and tightening land on its branch before it merges. So the identity code this note leans on isn't on the main branch yet (_checked_: CS-847 is `planned`).

**What follows:** every feature the runtime sees carries a declared content name and a key. Every output primitive carries that key. State columns, picks, labels and generated geometry all join on it.

**Rust and WebAssembly in production (CS-1133).** The owner's decision of 2026-11-13 says "Rust and naga never reach a production build" (_checked_, `docs/design/core-ir.md`, "Owner's decisions (2026-11-13)", 4). CS-1133 amends decision 4 fully: WebAssembly is required to run 2.0, and Rust and WebAssembly are used wherever they help. So the runtime's package may be required in every deployment. CS-1133 sets no size or start-time budget. The answer doesn't name naga, and whether the amendment covers naga in production builds is open (section 12).

## 3. The pipeline

```text
 styling languages                       the shared runtime (Rust, WebAssembly)           a viewer (2.0, or another engine)
 -----------------                       --------------------------------------           ---------------------------------
 our own experimental language -+
 3D Tiles 1.x styling ----------+--> front ends --> Cesium IR (JSON) --> plan and compile
 MapLibre expressions ----------+                                              |
                                                                               +--> CPU jobs ------------> the viewer's job system
 viewer inputs (declared) ---------------------------------------------------> |     (per-feature results -> per-feature state columns)
   camera, terrain, time, view scale, state columns                            |     (generators, labels   -> output primitives)
                                                                               |
                                                                               +--> GPU kernels (IR) ----> the viewer compiles them for its
                                                                               |     with declared buffers   backend and schedules them
                                                                               |
                                                                               +--> style stage (IR) -----> the viewer compiles it into its
                                                                                     per vertex, fragment    own geometry's shaders
                                                                                                                  |
                                                                                              custom shader (after the style stage)
                                                                                                                  |
                                                                      viewer-owned GPU buffers --> indirect draws (draw-arguments seam)
```

The runtime has no GPU context. It never reads a GPU buffer back to the CPU.

## 4. The contracts

Four things cross the boundary between the runtime and a viewer: the IR in, the plan out, the viewer's inputs, and the output primitives.

### 4.1 The IR in

The interchange and the spec artifact is Cesium IR's JSON form. A front end's only output is this.

```ts
interface StyleProgram {
  format: "cesium-ir/<major>.<minor>"; // pinned by each evaluator
  inputs: InputDecl[]; // name, type, unit, rate; see 4.3
  equations: Equation[]; // pure, single assignment, in dependency order
  outputs: OutputDecl[]; // style channels, generator calls, label requests
}
```

**What the owner decided about the IR (CS-1136, CS-1139, CS-1141, CS-1142).**

- **It stays pure, total and metered.** A program has no side effects and no input it can't answer, and a viewer can count its cost against a budget. What exactly the meter counts is open (section 12).
- **It gains strings, an item rate and bounded loops.** An item is a thing a generator produced, such as a dash along a line or a glyph.
- **Units are types** (CS-1139). A length is in screen pixels, paper millimeters at a reference scale, or ground meters (_checked_, `docs/design/styling-language.md`, section 1). An expression that mixes them is refused by name, in any front end and any evaluator.
- **A missing value is explicit** (CS-1142): an option type, with defaults that make an expression total. The 1.x front end maps `undefined` onto it. `NaN` stays a number, with the exact semantics the IR already has (_checked_, `core-ir.md`, research notes).
- **Colors** (CS-1141): a style may write any CSS Color 4 space, and the IR converts at compile time. Everything downstream sees linear-light sRGB with straight alpha. This extends the existing rule that CSS notation is sRGB and converted to linear where it enters the style (_checked_, `docs/design/color-in-the-styling-language.md`, "Decided").
- **This note's own proposals, not decisions:** a loop's bound is a constant, as the GPU-safety rule asks (section 6), with the syntax open (section 12); and time is a type with the unit seconds and its time scale named.
- **The kernels, buffers and generator calls are not IR.** They belong to the plan format (4.2). The IR holds the pure functions the plan's stages reference.

**Where it stands today.**

- _Checked_ (`packages/core/src/ir/FORMAT.md`): the format in the repository is `cesium-ir/0.1`, experimental, not 1.0. It has inputs with a type (`bool`, `int`, `float`, `float2` to `float4`) and a rate (`uniform`, `feature`, `vertex`, `fragment`), equations and outputs. It graduates to 1.0 only through the API review (CS-102).
- _Checked_ (same file): 0.1 has no extension ops. Tables and a bounded search come with CS-56 (planned).
- **Gap:** today's IR has no string type, no item rate, no unit, no option type and no bounded loop. Section 12 lists what the IR crate's spec settles for each.

### 4.2 The plan format

The plan is a separate format from the IR, and a general one: a typed graph of stages, each with inputs, outputs, buffers and budgets, referencing IR functions (CS-1136). It is versioned on its own. Styling is its first user, not its only one.

The shape below is a sketch of what the runtime hands a viewer. It is not the plan format's schema, which the IR crate's work settles.

```ts
interface Plan {
  featureJobs: CpuJob[]; // evaluate per-feature channels into state columns
  generatorJobs: CpuJob[]; // CPU forms of generators, clustering, label shaping
  kernels: GpuKernel[]; // GPU forms of generators, per-feature passes, label collision
  styleStage: StyleStage; // per-vertex and per-fragment IR, per geometry kind
  invalidation: Map<InputName, PlanStep[]>; // what each input's change re-runs
}

interface GpuKernel {
  program: StyleProgram; // IR, compiled by the viewer
  reads: BufferDecl[]; // name, layout, element count bound
  writes: BufferDecl[]; // an output primitive's fixed layout
  maxItems: number; // a constant: bounds every loop and every write
  dropped: BufferDecl; // a counter of what didn't fit (section 7)
}
```

### 4.3 Viewer inputs

Each viewer implements one declared interface. Every input says how often it changes, so the runtime re-evaluates only what a change affects.

```ts
type Cadence = "load" | "cameraMove" | "tick";

interface ViewerInput {
  name: string; // "view.metersPerPixel", "terrain.height", "state.selected"
  type: IrType; // with its unit where it has one: meters, pixels, seconds
  rate: "uniform" | "feature" | "vertex" | "fragment"; // where it varies
  cadence: Cadence; // when it changes
  where: "cpu" | "gpu" | "both"; // a value, a column, or a texture or buffer
}
```

| Input                         | Cadence                 | Notes                                                                                       |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| The camera                    | per camera move         | Position, orientation, projection. Position in a named reference frame, in meters.          |
| View scale                    | per camera move         | Meters per pixel at a point, and the map scale for paper units.                             |
| Terrain heights and gradients | per load of the terrain | Sampled by a job (CPU) or read from a texture (GPU). Heights in meters above a named datum. |
| Time                          | per tick                | The view's clock, in seconds, with its time scale named.                                    |
| Per-feature state columns     | per write               | Keyed by stable ID (CS-1108). Typed columns, read at the feature rate.                      |
| Feature properties            | per load                | The content's own columns, bound through its schema.                                        |
| A scalar field (section 10)   | per load, or per tick   | Needed on the CPU for generated contours.                                                   |

Two axes are in play: the IR's rate (where a value varies) and the input's cadence (when it changes). They are separate, and the note keeps both names. A tick is one pass of the engine loop.

A style that reads an input the viewer doesn't supply for that content is refused, naming the input and the content (as `docs/design/styling-language.md`, section 3, proposes; _checked_).

### 4.4 Outputs: styled geometry and GPU jobs

```ts
type OutputPrimitive =
  | "polyline" // with widths and dashes
  | "fill"
  | "glyphRun" // and placed labels
  | "mesh"
  | "instance";
```

Every output primitive row carries the feature's key and its style attributes (color, opacity, show, size, offset). The layout of each primitive is fixed by the spec, so any viewer can draw any generator's output. The list of primitives is a first set. Its members and layouts are settled with the spec (section 12).

## 5. The rates and the representations

**Per feature.** Color, show, size and label text are evaluated once per feature, and again only when an input they read changes. The runtime serves any content with features: vectors, meshes, point clouds, Gaussian splats, B-rep faces and edges, and terrain and imagery features. Results land in per-feature state columns, which the viewer's shaders read by the feature's index.

**GPU first (CS-1134).** Whatever lowers to the GPU runs there, in the style stage or a kernel. The runtime's CPU jobs take what the GPU can't: strings, aggregation, generators, and CPU-side picks and queries. The planner decides per expression. The criteria the planner uses are open (section 12).

**Per vertex and per fragment.** The style's GPU-rate parts are emitted as IR. Each viewer compiles them into a style stage for its own geometry. A ramp over a per-vertex value, a dash pattern along a line, or a screen-space isoline are examples.

**Generators.** A generator makes new geometry: items along a line, hatches, contours, clusters, labels. It writes one of the output primitives.

- **Under WebGPU** it may run on the GPU, as a kernel.
- **Every generator also has a CPU form** in the runtime (CS-1135), run as jobs, with its output uploaded once. A WebGL 2 viewer has no compute shaders, so it uses this form, and refuses no style for lack of compute.
- **The two forms agree** to a stated bound, tested as in section 8.

| Representation               | Per-feature channels                | Style stage            | Typical generators                                     |
| ---------------------------- | ----------------------------------- | ---------------------- | ------------------------------------------------------ |
| Vector features              | yes                                 | strokes, fills         | offsets, hatches, items along a line, labels, clusters |
| Meshes with feature IDs      | yes                                 | surface color, ramps   | labels, outlines                                       |
| Point clouds                 | yes, where points carry feature IDs | point color and size   | clusters, density                                      |
| Gaussian splats              | yes, where splats carry feature IDs | color and opacity      | none planned                                           |
| B-rep faces and edges        | yes                                 | face and edge color    | edge strokes, labels                                   |
| Terrain and imagery features | yes                                 | ramps, bands, isolines | contours, labels                                       |

Where the existing code stands:

- _Checked_ (`packages/core/src/scene/FeatureStyle.ts`, `styleExpression.ts`): 2.0 compiles 3D Tiles 1.x style expressions (`show`, `color`, `defines`, conditions) straight to WGSL. `docs/design/styling-and-a-shared-ir.md` says there is no IR between the parse and the WGSL; that statement is _unverified_ against today's code.
- _Checked_ (`packages/core/src/vector/VectorStyle.ts` exists): the point path's style compiler. Its contents were not read: _unverified_.
- _Checked_ (`packages/core/src/ir/rates.ts`): rate inference exists. An equation's rate is the highest of its operands', in the order uniform, feature, vertex, fragment, and uniform-rate work is evaluated once on the CPU in float64.
- _Checked_ (search of `packages/core/src`): nothing named for per-feature state or state columns exists yet.
- _Checked_ (`docs/design/architecture.md`, "Compute shaders: where they pay off"): the table lists "no CPU style evaluation" as the win over 1.x. CS-1134 keeps that win for what lowers to the GPU. The CPU is used for what the GPU can't do.

## 6. Execution: jobs, kernels, buffers, indirect draws

**The runtime plans and compiles; the viewer executes** (CS-1131).

**The runtime is WebAssembly in the browser** (CS-1133). 2.0 requires WebAssembly to run. When the package loads, and how it is delivered, are open (item 9 of section 12).

**CPU work is jobs on the viewer's job system.**

- _Checked_ (`docs/design/job-system.md`, "The design"): a 2.0 job is a pure function of its payload on a worker, with large arrays transferred. Its main-thread step runs in the apply phase at the end of a tick, within a budget of 4 ms. Jobs have priorities, dependencies and cancellation.
- The runtime's WebAssembly package is loaded into the pool's workers as job types. A plan's CPU step is a job: IR and input columns in, state columns or output-primitive rows out.
- A changed input cancels the jobs it invalidates and posts new ones. This matches the job system's cancellation (_checked_, same section).
- Shared memory can't be required (_checked_, same section: the engine detects cross-origin isolation and falls back to transfer). So the runtime's jobs must work on transferred buffers.

**GPU work arrives as IR compute kernels with declared buffers.**

- The viewer compiles each kernel for its backend and schedules it on its own device.
- In 2.0 the hook is `World.addFrameCompute` (_checked_, `packages/core/src/scene/World.ts`, line 2022). Its kernels run once per tick, after the table uploads and before any view culls (_checked_, `packages/core/src/scene/world/featureTables.ts`, lines 371 to 375). Whether it is public API is _unverified_; it is not in `api/surface.txt` by that name (_checked_).
- Every kernel loop is bounded by a constant (`maxItems`), and every buffer index is clamped. This is 2.0's GPU-safety rule (_checked_, `AGENTS.md`, "GPU safety"), applied by the viewer's compile step, not trusted from the runtime.
- The runtime makes no CPU round trips. A kernel that can produce a variable count writes a count the next kernel or the draw arguments read on the GPU.

**Outputs stay in viewer-owned GPU buffers** in the output primitives' fixed layout. The viewer allocates them from the declared bounds, so they count against its memory budget.

**They feed indirect draws through the draw-arguments seam.**

- _Checked_ (`packages/core/src/render/drawArguments.ts`): `DrawArguments` is the one place a world's content draws are issued, and the only CPU writer of the arguments' buffers. On the GPU, cull kernels reach the arguments only through `cullTables.slang`'s accessors.
- _Checked_ (`test/seams.test.ts`, "the draw-arguments and geometry-submission seams"): a test fails on an indexed or indirect draw issued anywhere else, with one named exception for the stars.
- _Checked_ (`docs/design/architecture.md`, "Render world and draws"): a per-view draw-prep compute pass writes camera-relative offsets and the indirect arguments, with culling in the same pass.
- So a generator's output becomes batches in this seam. The cull-and-prep pass culls them and writes their arguments as it does for other content. A generator never issues a draw.

**A reference compiler.** The runtime crate may ship a reference IR-to-shader compiler that viewers can use (CS-1131). 2.0 keeps its own (`packages/core/src/ir/wgsl.ts`, `glsl.ts`; _checked_ that they exist).

## 7. Labels, and what happens when a buffer overflows

**Label placement (CS-1137).** A job's result applies at the end of a tick, so collision done only on the CPU would trail the camera by at least one tick. The owner split it:

- **On the CPU:** text shaping and candidate positions. These change when the text or the geometry changes, not with every camera move.
- **On the GPU:** per-tick collision and fading, as a kernel that reads the candidates and the camera.
- **In a WebGL 2 viewer:** the CPU form of the whole thing (CS-1135). Its collision trails the camera by a tick. That is the cost of having no compute.
- A label carries its feature's key, so a label that straddles a tile edge is one label, and a pick on it returns the feature.

**Overflow (CS-1138).** With no CPU round trip, the viewer sizes each buffer from a declared constant, and a generator may produce more than fits.

- The kernel counts what it dropped, in the counter its declaration names (`dropped`, section 4.2). Nothing writes past a buffer.
- The viewer reads the count later, without stalling the tick. It reports a nonzero count on `Engine.errors` (_checked_, `packages/core/src/scene/Engine.ts`: `errors` exists), and grows the buffer or coarsens the generator on the next run.
- A result that dropped items is drawn, not refused. It is incomplete, and the report says so.

## 8. Conformance and versioning

**Two evaluators of one IR** pass shared conformance vectors: 2.0's TypeScript and GPU path, and the runtime's Rust interpreter.

- The spec and the vectors live in the workspace's IR crate (CS-1130). 2.0 pins a version and runs the vectors in its tests.
- _Checked_ (`docs/design/core-ir.md`, "Owner's decisions (2026-11-13)", 3): the CPU evaluator, in float64, is the conformant one. The GPU side is a documented float32 approximation. The vectors therefore need exact expected values for CPU evaluators and a stated tolerance for GPU ones.
- The vectors also cover the new parts: strings, units, the missing value, color conversion and the item rate. A mixed-unit expression has a vector that expects its refusal, by name.
- _Checked_ (`test/irCorpus.ts`): 2.0 has a corpus of IR programs its JSON tests round-trip. It is a starting set for the vectors, not yet a set of inputs with expected outputs. Whether any file pairs inputs with expected outputs is _unverified_.
- _Checked_ (`FORMAT.md`, "Versioning"): a 0.x reader reads only its own version. From 1.0, a minor version adds ops or optional fields and never changes a meaning, and a reader refuses another major version. Extension ops are named, versioned, and never change meaning after release.
- **The plan format, the output primitives' layouts and the viewer-input interface need the same rules:** a version, additive minors, and refusal by name. They are further spec artifacts beside the IR.
- **The CPU and GPU forms of a generator** (CS-1135) are held to a stated bound in the same vectors, as section 10 does for contours.
- Moving the spec out of `packages/core/src/ir/FORMAT.md` means that file becomes a pointer to the pinned version.

## 9. Custom shaders and the style stage

Custom shaders compose **after** the style stage (CS-1132).

```ts
interface StyleOutputs {
  color: float4; // linear-light sRGB, straight alpha (CS-1141)
  opacity: float; // 0 to 1
  show: bool;
  size: float; // with its unit: pixels or meters
  offset: float3; // meters, in the geometry's local reference frame
}
```

- A custom shader reads these values and may override any of them.
- The viewer's compile step applies its GPU-safety checks to both the style stage and the custom shader. Neither is trusted more than the other.
- _Checked_ (`packages/core/src/scene/CustomShader.ts`, lines 92 to 94): today an item's own shader **replaces** the tileset's custom shader or style for that item; "it doesn't combine with it". CS-1132 changes this to composition.
- _Checked_ (same file, `DEFAULT_STAGES`): the engine's stages are `cesiumVertexStage` and `cesiumFragmentStage`, the second taking a `MaterialOutput`. The style stage would sit before both, and `StyleOutputs` would become an input to them.
- _Checked_ (`FeatureStyle.ts` imports `CustomShader`): today's feature style is built on the custom-shader mechanism. How much it shares is _unverified_.

## 10. The languages, and contours as the first test case

### 10.1 What ships with 2.0 (CS-1140)

- **An experimental language of our own,** lowering to the IR. It is experimental: its form can change, as the IR's 0.x versions can. Its syntax is open (section 12). Specifying it apart from 3D Tiles follows `docs/design/styling-language.md` (_checked_).
- **A front end for the 1.x styling language,** lowering to the IR. It maps `undefined` onto the explicit missing value (CS-1142).
- **A MapLibre expressions front end** (CS-1169 A, CS-1170), lowering to the IR, experimental, alongside MVT (CS-557). Whole style documents follow later as their own item (CS-1171), once label placement (CS-1137) and the runtime's outputs settle.
- **Other front ends:** none is decided.
- **The 3D Tiles group** gets a proposal after the plan settles (CS-1143). The answer doesn't say who takes it, and it sets no date. What "settled" means is open.

### 10.2 Contours

Scalar fields are the first test because they need all three rates and both forms of a generator.

- **A field shown as a ramp or as bands** is GPU-rate style: the field's value at the vertex or fragment, through a ramp. No generator runs.
- **Contour lines come from one IR expression,** for example `contour(elevation, 10 m)`: isolines of the field every 10 meters. The unit is an IR type, so `10 m` can't be taken for pixels.
- **It lowers two ways:**
  - in the fragment shader, as screen-space isolines. This is cheap and always matches the drawn surface, but the lines have no geometry: no labels, no picks, no fixed width in ground units.
  - by the runtime, as generated polylines with the feature's key and the level as an attribute. These can be labeled and picked, and they have a CPU form for WebGL 2.
- **The generated form needs the field as a viewer input** on the side where the generator runs: sampled heights for a CPU job, or a texture for a GPU kernel.
- **What the test proves:** one expression with two lowerings that agree; an input with a cadence (terrain per load, a simulated field per tick); output primitives through the draw-arguments seam; labels along generated lines; and picks that return the level.
- **Agreement has a stated bound.** The two lowerings sample the field differently, so they agree to within the field's sample spacing, not exactly. The test states that bound in meters per data set, and says "can't tell" where the field's own accuracy is unknown.
- **This replaces CS-337 as written** (section 13).

## 11. What 2.0 must reserve before beta.1

The public API and the seams freeze at beta.1 (CS-531). None of the runtime needs to exist by then. These four shapes do.

1. **The style stage's outputs.** `StyleOutputs` (color, opacity, show, size, offset) as the named values a style writes and a custom shader reads, in that order of composition. Reserve room for them between the engine's stages; today a draw passes at most 16 float components between its stages for named values (_checked_, `CustomShader.ts`, `MAX_NAMED = 4`, four components each).
2. **The draw-arguments seam's share.** Generated geometry enters as batches through `DrawArguments`, sized from a declared constant bound, with its count written on the GPU. The seam must admit a batch whose item count a kernel writes, not only the cull.
3. **The input interface.** The viewer-input declaration (name, type, unit, rate, cadence, CPU or GPU side), with the camera, terrain heights and gradients, time, view scale and state columns as its first entries. Terrain as an input means a sampling call the job system can serve.
4. **Per-feature state.** Typed columns keyed by stable ID (CS-1108), written by the application and by the runtime's per-feature jobs, read by shaders at the feature rate. The key's encoding waits on CS-1081.

Also to settle before the freeze: custom shaders composing rather than replacing (section 9), and the public status of the per-tick compute hook.

## 12. Open

**Settled by the owner since the questions were raised** (so no longer questions): where the code lives (CS-1129), the spec's home (CS-1130), Rust in production (CS-1133), who evaluates per feature (CS-1134), WebGL 2 (CS-1135), how the IR grows (CS-1136), labels (CS-1137), overflow (CS-1138), units (CS-1139), the languages (CS-1140), MapLibre expressions (CS-1169), the color model (CS-1141), `undefined` and `NaN` (CS-1142).

**Open:**

1. **What the IR's meter counts.** CS-1136 says metered. Whether the meter counts operations, loop trips or memory, and who enforces a budget, is for the IR crate's spec.
2. **The IR's new ops.** The string operations, the item rate's semantics, the loops' bound syntax, the option type's defaults, and the unit algebra. `core-ir.md` put general bounded loops and structs last in the gap order (_checked_, decision 6); CS-1136 has the IR gain them.
3. **The plan format's schema.** CS-1136 gives its shape, a typed graph of stages. Its stage kinds, its buffer declarations and its budgets are not designed.
4. **The planner's rule for a side.** CS-1134 says it decides per expression. What it weighs (cost, cadence, a viewer's limits) is not designed.
5. **The experimental language's syntax,** name and grammar.
6. **Who takes a proposal to the 3D Tiles group,** and what "the plan settles" means (CS-1143). No date is set.
7. **Strings and 64-bit IDs.** The IR gains strings (CS-1136). Their encoding on the GPU, and 64-bit properties and IDs, sit with CS-898 and CS-936.
8. **The key's width on the GPU.** The feature-ID target holds 32 bits (_checked_, `architecture.md`, "Frame graph"). Whether an output primitive carries a 32-bit index into a key table or the key itself depends on CS-1081.
9. **The WebAssembly package's size, start time and delivery.** CS-1133 sets no budget and doesn't say whether it loads eagerly or on first use. Its size and start time are measured when it exists.
10. **The C interface's stability,** and how another engine's job system and device meet the same contracts. No such viewer has been tried: _unverified_ that the contracts are enough.
11. **The workspace.** It isn't started. Its crates, its layout and the decoder's state are for the work that starts it.
12. **The output primitives' set and layouts,** and whether five is the right number.
13. **How CPU and GPU forms of one generator agree,** and the bound per generator, as section 10 does for contours.
14. **Does CS-1133's amendment of decision 4 cover naga in production builds?** The answer doesn't name it. For the owner.

## 13. Which decisions and items this affects

CS-265 (the language's form, where its spec lives, and when it goes to the 3D Tiles group) and CS-266 (styling semantics) are `dropped` as superseded by the decisions above (_checked_: their `reason` fields). This note is where the settled points are collected.

- **CS-337.** _Today:_ Proposed work: scalar fields on any geometry, with ramps, legends and picks. Needed CS-265. _Change:_ Rescoped to the contour test case of section 10.2, with its done-when in its item file. It stays proposed, since the owner decides a proposal (CS-686's practice).
- **CS-258.** _Today:_ Planned work: the vector drawing design, one path for lines, polygons, labels and CAD styles. _Change:_ The output primitives of section 4.4 are the design's input contract. Label collision moves to the runtime (section 7), and label drawing stays. A note in its item file points here.
- **CS-557.** _Today:_ Planned work: MVT through the content-source seam. It asks whether to accept MapLibre style JSON. _Change:_ The owner decided it (CS-1169 A): expressions now, as a front end lowering to Cesium IR (CS-1170), and whole style documents later (CS-1171). A label that straddles a tile edge is the runtime's label placement, keyed by the feature's key. A note points here.
- **CS-558.** _Today:_ Planned work: Esri services through the seam. _Change:_ Feature services' fields bind as feature-rate inputs through the schema, and elevation services become a provider of the terrain-height input. Scope is unchanged. A note points here.
- **CS-559.** _Today:_ Planned work: USD through the seam. _Change:_ Its features carry declared content names and keys like any other, so per-feature channels apply. Materials stay with the material system. Scope is unchanged. A note points here.

**What else this implies,** for the main session to file after checking for duplicates (CS-686's practice: filed as proposals, not decided here):

- Reserving `StyleOutputs` and the composition order.
- Per-feature state columns (CS-1108's build item, if none exists: _unverified_).
- The viewer-input interface.
- A generated batch in the draw-arguments seam.
- Moving `FORMAT.md` and the vectors to the IR crate and pinning them, once the crate exists.
- Amending `docs/design/core-ir.md`, decision 4, in place for CS-1133, once the naga question (section 12) is answered. This note doesn't edit it.
