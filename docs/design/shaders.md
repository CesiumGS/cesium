# Shaders: Slang as the one source, WGSL where it must be, a WGSL-level user contract

**What this holds:** Slang as the one source, WGSL where it must be, and the user contract (since 2026-11-13, Cesium IR programs: see `core-ir.md`). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

> **Superseded in part (owner, 2026-11-13; §13.41 renderer decisions and §13.42):** the user-facing contract is **Cesium IR** (`cesium-ir`), not a WGSL-level ABI. Styles, transforms, materials and user functions are written in any front-end language (1.x and 3D Tiles styles, restricted JS, MaterialX, Slang offline, WGSL functions through naga) and lowered into Cesium IR, whose vocabulary is `KHR_interactivity`'s. A WGSL string can't reach a second renderer or the CPU evaluator, so raw WGSL is not offered as an escape hatch. Engine kernels stay Slang compiled offline, as below.

**Why decide now.** The user-facing shader contract is public API.

**What Slang gives us**:

- Interfaces and generics for "engine pipeline + user material"
- Specialization constants → `override`
- `ParameterBlock` → one bind group
- Multi-target output (WGSL, SPIR-V, HLSL, Metal, GLSL)
- Khronos governance

**Gaps in Slang's WGSL backend today**:

- no wave/subgroup intrinsics
- no `SV_PrimitiveID`
- no `SV_ClipDistance`
- no pointers to struct fields
- 32-bit integer atomics only

**Model:**

1. **Material, vertex and fragment code is authored in Slang** and compiled to WGSL at build time.
2. **Compute kernels may be hand-written WGSL**: sorts and reductions that use subgroups, and CAD edges that need `primitive_index`.
3. **The user contract is specified as a WGSL-level ABI**: struct layouts and entry-point signatures for `IMaterial`, `IVertexModifier`, `IFeatureStyle` and `IPostEffect`.
   - Slang is the first-class authoring language for it.
   - Raw WGSL and generators such as three.js TSL-style node systems can target the same ABI.
4. **User shaders are compiled offline** (CLI or bundler plugin, recommended), or at runtime by a lazily loaded Slang WASM compiler in a worker, cached by hash.

**M0 spike checks.** If they fail, the fallback is WGSL with WESL modules behind the same ABI:

- generated WGSL validates in Chrome, Safari and Firefox
- PBR and globe shaders run within ~5% of hand-written WGSL
- `ParameterBlock` group numbering fits the 4-group limit
- `instance_index` semantics are preserved
- `override`-sized workgroup arrays work on Safari
- generated code passes Tint's uniformity analysis (non-uniform `textureSample` is rejected)
- generated arithmetic doesn't break the hi/lo precision path
- WASM compiler payload size and cold/warm compile latency are measured
- the output is readable enough to debug
- the license is reviewed

**Slang-first, for real (r50: decision and migration).** The model above
says engine material, vertex and fragment code is authored in Slang. In
practice every engine shader grew as hand-written WGSL: 26 files, about
7,800 lines, `opaque.wgsl` alone 1,451. The Slang spike's M0-era port
became a second copy that nobody kept in sync. By r50 its `View` had 19
of the engine's 26 fields and its `DrawRecord` lacked five, so it
rendered garbage, and the page had failed outright since r48 (§13.15).
Two copies of a shader drift. The fix is one source, Slang, with WGSL
generated from it, not a better-kept copy.

_What one Slang source buys, from this revision's own problems:_

- **Layouts in one place.** Structs are defined once in Slang. The
  TypeScript offsets (`render/layout.ts`) come from Slang's reflection
  (`-reflection-json`), and so do the bind group layouts and the binding
  budget test, which today reads WGSL with regular expressions.
- **Types that refuse mistakes.**
  - A `SplitPosition` with private hi/lo fields whose only operations are
    `difference` (integer-assisted) and `approximate`. Misuse is a compile
    error, not a test failure.
  - Types don't stop the compiler reassociating floats, so the integer
    form stays inside that type.
- **The bindless seam as an interface.** An `IMaterialTextures` with two
  implementations, a texture set per batch now and a resource table
  later, chosen at link time where today it's a WGSL function swap.
- **Materials as `IMaterial`** (the spike's model), with parameter blocks
  sized from reflection (the "generic material parameters" item below).
- **One language for the vector pipeline's kernels** (§13.9): a style
  compiles to an interface implementation, not to string-pasted WGSL.

_What stays WGSL:_

- **Kernels that need what Slang's WGSL backend lacks.** Subgroups (sorts,
  compaction), `primitive_index` (CAD edges) and clip distances stay WGSL
  until it has them, behind the same reflected layouts. None of today's
  shaders use them.
- **The user contract** (custom shaders, 3D Tiles styles, the vector
  styling language). Generators emit code at run time, and a style edit
  can't wait for an offline compiler. The contract stays a WGSL-level ABI
  (struct layouts, entry points, a few named helpers) that the generated
  engine WGSL exports under stable names. Runtime Slang through the
  lazily loaded WASM compiler stays an option, decided by its measured
  size and compile latency.

_Migration, in steps that each leave the engine working:_

1. **Re-run the M0 checks on today's Slang (2026.21 when written; the pin is now 2026.22) and today's
   features.** The checks above, plus what the engine now uses:
   `@builtin(sample_mask)` (`SV_Coverage`), flat interpolation,
   `override` constants sizing workgroup arrays, 32-bit atomics, 3D
   `rgba16float` storage textures, and exported names stable enough for
   the user ABI (Slang suffixes names, `records_0`). Gate: kernels within
   5% of the hand-written WGSL's GPU time, images within ΔE 0.5.
2. **The toolchain.**
   - `slangc` pinned to a release and fetched by `npm run setup`.
   - A Vite plugin compiles `.slang` imports to WGSL, cached by content
     hash.
   - The generated WGSL is checked in, so the library build and readers
     need no compiler, and CI regenerates it and fails on a difference.
   - Slang's line directives map shader errors back to the `.slang`
     source.
3. **Shared layouts.** `common.slang` becomes the source of `View`,
   `DrawRecord`, `Transform`, `Instance`, `Material`, `LightTable` and the
   cull structs. `common.wgsl` and the hand-kept offsets in `layout.ts`
   are generated from it. The layout budget test reads reflection.
4. **Kernels**, smallest and best tested first: scatter, pick, depthRange,
   cull (ported once already; checked by the precision page), pointCull,
   raycast, lights, imagery, adapt, ao, meter, composite, present, fxaa.
   Each is checked by its existing tests and pages before the WGSL file
   goes, and by the performance gate (`/#/lab/slang-kernels`: each port
   against the hand-written WGSL it replaced, timed and its outputs
   compared). **The gate and the probes have run only on an Apple GPU
   (Metal) so far: re-run both on Windows (D3D12, an NVIDIA and an AMD or
   Intel GPU) before the migration counts as done.** Slang's output
   reaches each backend's compiler through Dawn, and what costs time on
   Metal (a conditional write into a local array, loop shapes it won't
   unroll) may not be what costs it on D3D12, or the reverse.
5. **The surface shaders.** opaque and translucent on `IMaterial`,
   `IMaterialTextures` and `SplitPosition`, linked to run-time code
   through a declared boundary (_Step 5 design_ below). Checked by image
   regression in Dyno (§16.10), the parity pages and the custom-shader
   parity page.
6. **Sky and atmosphere** (`sky.wgsl`, `atmosphere.wgsl`,
   `reference.wgsl`), checked by their reference comparisons (§4.2).
   IBL's kernels and its Monte Carlo reference moved into step 4.
7. **Retire the spike.** Its port is the engine's source by then, and the
   page becomes a check that `ToonMaterial` links against it.

_Step 1 results (r53, Slang 2026.21, Apple M-series GPU on Metal)._ The
checks are a suite now: `spikes/slang/probes/*.slang`, compiled by
`node spikes/slang/probes.mjs` and validated in WebGPU by the probe page
(`/#/lab/slang-probes`). Re-run it on each Slang release; 13 of 16 behave
as expected today.

| Feature                                                    | Result                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sample mask in and out, flat interpolation, instance_index | Works (sample mask through an output struct)                                                                                                              |
| 32-bit atomics                                             | Works through typed buffers (`RWStructuredBuffer<Atomic<uint>>`, `groupshared Atomic<uint>`); `InterlockedAdd` on a plain buffer isn't available for WGSL |
| Scalar `override` constants                                | Work (`[vk::constant_id]`)                                                                                                                                |
| Override-sized workgroup arrays                            | **Compiler crash** (E99999). None of the engine's arrays need it: theirs are const-sized                                                                  |
| 3D `rgba16float` storage textures                          | Work write-only (`WTexture3D`, `Store`); read-write isn't allowed for that format in WGSL                                                                 |
| Subgroups                                                  | **Work now** (`enable subgroups`); the M0 gap is closed                                                                                                   |
| `primitive_index`, clip distances                          | Still unsupported: CAD edges and clip planes would stay WGSL                                                                                              |
| Uniformity                                                 | Slang emits sampling as written; WebGPU rejects non-uniform `textureSample` as for hand-written code                                                      |
| hi/lo as a type                                            | `SplitPosition` (private parts, one `difference`) is bit-equal to the WGSL on 4,096 Earth-scale pairs (worst 0.49 mm); misuse is a compile error          |
| `ParameterBlock`                                           | One bind group each, in order                                                                                                                             |
| Matrices in buffers                                        | Stored as arrays of `vec4` and rebuilt element by element on each read (to measure in the kernels' timing)                                                |
| Names                                                      | Suffixed by default (`records_0`); entry points keep theirs. See the boundary below                                                                       |
| WASM compiler                                              | 24.1 MB; a custom shader in 1.9 s cold (worker and WASM load), 260 ms warm here (30–90 ms in the playground after a few compiles)                         |

**Names: the runtime boundary is declared in source, never rewritten.**
Code composed at run time (custom shaders, 3D Tiles and vector styles)
refers to engine names. Slang documents no naming guarantees, and its
maintainers advise against relying on emitted names (issue #8391), so
renaming its output with text manipulation is out.

- The boundary is marked `__extern_cpp` in the Slang source: the
  contract's value structs and their fields, the helpers runtime code calls,
  and the few bindings it reads. They keep their names, checked by the
  `boundary` probe.
- Two caveats apply:
  - `__extern_cpp` is documented only for the CPU target. Slang issue
    #14028 says same-named fields in different structs can merge (the
    probe checks they don't today).
  - The probe and golden tests of the generated boundary therefore guard
    every Slang upgrade, and the version stays pinned.
    - _Pin moved 2026-11-13: 2026.21 to 2026.22._ Rebuilt shaders differ
      from 2026.21's only in the version line of each header; the feature
      probes, the golden and boundary tests and the offline Slang compile
      give the same results (WASM zip 10,567,678 bytes, native macOS arm64
      zip 65,185,549 bytes; the fetch checks each against the SHA-256 GitHub
      publishes: WASM `f5b2b196…b75699`, native `f6d6fe9c…af61cc3`).
- Buffer-backed structs keep a layout copy (`View_std140_0`, fields named)
  and wrapped matrices. Runtime code never reads them directly: what it
  needs comes through the contract structs (as the custom-shader contract
  already does) or accessor functions.
- The engine calls functions the runtime code defines (the user's
  `vertexMain` and `fragmentMain`, a style's functions) by literal name
  through `__target_intrinsic(wgsl, …)`. That is internal Slang API, so it
  is kept to those call sites and tested the same way.
- Most kernels need none of this. The engine joins `common.wgsl` to each
  kernel as text today; with Slang each kernel's WGSL is self-contained
  (`import common;`), and the host binds it by group and binding number.
  Names matter only where code is spliced in at run time: the opaque and
  translucent surfaces, the point cull and the model pool.

_Step 2 started (r53)._

- `scripts/slangBuild.mjs` compiles each `.slang` under `src/` that has
  entry points to `src/shaders/generated/<name>.wgsl`, every entry point
  in it, plus its reflection (`<name>.json`). The output is checked in with
  a do-not-edit header.
- `npm run shaders` regenerates; `npm run shaders:check` fails on anything
  stale (for CI, which needs the pinned slangc).
- In dev a Vite plugin regenerates a `.slang`'s WGSL and its importers'
  on save; without slangc it says so once and the checked-in files serve.
- Scatter and pick are the first two kernels ported. They are identical in
  use, verified by the tests and by pick positions in the browser.

_Step 3 (r53): shared layouts._

- `shaders/common.slang` is the source of `View`, `DrawRecord`,
  `Transform`, `Instance`, `DrawItem`, `Material`, `LightHeader` and
  `Light`, their constants, the material texture references and
  `SplitPosition`.
- `layouts.slang` binds each struct the way the engine does, and the build
  generates `render/generated/layouts.ts` from its reflection: each
  struct's size, alignment and field offsets, formatted by Prettier so
  `--check` stays stable.
- `render/layout.ts` derives every size and word constant from it, and its
  writers address fields by name (`o + R.featureId`, not `o + 13`). The
  offsets match the hand-kept ones exactly.
- Until the last WGSL kernel is ported, `common.wgsl` stays for them, and
  `test/layouts.test.ts` computes its layouts with WGSL's rules and fails
  if any field or size differs from the Slang's. It was checked by swapping
  two fields, which it caught.
- The common structs are deliberately not `__extern_cpp`: several share
  field names (`flags` in four), which is the case Slang issue #14028
  warns about. Only the custom-shader contract's structs get it (step 5).

_Step 4 results (Slang 2026.21, Apple M-series GPU on Metal): every
kernel ported._ 35 cases on the gate (`/#/lab/slang-kernels`), each the
port against the WGSL it replaced (kept in `spikes/slang/reference/`),
dispatched alternately on the same synthetic inputs, timed by GPU
timestamps (Chrome rounds them to 65.5 µs, so each case repeats its
dispatch, 64 times by default), and compared element by element.

| Kernel                                                                  | Slang / WGSL | Outputs                                                          |
| ----------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| scatter, depthRange, lights, overlay, splat, imagery ×3, cull ×2, fxaa  | 0.99–1.03    | identical                                                        |
| raycast                                                                 | 1.00         | 28 within 1 ulp (dot products' order)                            |
| present: neutral, AgX with the eye, ACES                                | 1.00–1.02    | identical but AgX (1,353 within 1 ulp)                           |
| adapt.reduce: a workgroup a cell, bins summed in shared memory          | 0.72         | identical                                                        |
| adapt.blur: separable, in shared memory                                 | 0.33         | 136 within 1 f16 ulp                                             |
| meter: the bins' walk as a parallel prefix sum                          | 0.81         | 1 within 1 ulp                                                   |
| ao.gtao; ao.denoise from a shared tile                                  | 1.00; 0.97   | within the gate; 40 within 1 ulp                                 |
| composite: exact (sorted in a compute pass, per sample), moments        | 0.10; 0.93   | 7 within 1 ulp; identical                                        |
| ibl: sky, downsample, prefilter, shFinal, brdf                          | 1.00         | identical                                                        |
| ibl.shFace, its nine sums unrolled                                      | 0.89         | within 1e-6 (sums that cancel: many ulps near zero)              |
| ibl.irradianceCube, the source staged a face at a time in shared memory | 0.43         | identical (the same sums in the same order)                      |
| ibl reference (Monte Carlo)                                             | 0.99         | within 0.05 of sums up to 84, 1e-6 on average: see below         |
| points: applySamples, placePoints                                       | 1.00–1.01    | identical                                                        |
| modelPool: bin, claim, hide (with a style appended)                     | 0.98–1.00    | identical (claimed rows compared as a set: slots follow threads) |

What Slang's WGSL does that cost time, found by the gate, and what was
done:

- **Every loop is `loop { if (c) {} else { break; } … }`.** On Metal that
  shape with a small private array indexed by data (a histogram, a
  per-thread list) kept the array out of registers: the straight adapt
  port was 2.5× and the fragment-shader sort tens of milliseconds.
  Shared memory replaced them (above); `[ForceUnroll]` for loops over a
  constant count keeps their indices constant.
- **Every Slang loop pays Tint's loop guard (Chrome, Metal; found r59).**
  Metal treats an infinite loop as undefined behaviour, so Tint, writing
  MSL, guards every loop it can't prove finite with a 64-bit counter
  (`uint2 tint_loop_idx`: a decrement with carry, an `all()` test and a
  branch per iteration). Only a `for` with a counter and a constant bound
  is exempt; a `while`, a `for` to a uniform's count and every `loop {}`
  are guarded, and Slang writes every loop as `loop {}`. Where a loop's
  body is cheap it shows: the atmosphere's path tracer (ratio tracking: a
  `log`, a random number and a few multiplies a step) stayed 5% slower
  than its hand WGSL, whose two inner loops were constant-bounded `for`s
  and unguarded. Found by transplanting the hand WGSL's functions one at a
  time into Slang's output (the ratio-tracking loop alone took back the
  difference), then loop forms: the same body as a `for` was even, as a
  `while` or `loop { if … break }` 5 to 7% slower, wherever the exit test
  sat; Dawn's MSL (`scripts/dumpMsl.mjs`: Chromium with
  `--enable-dawn-features=dump_shaders,disable_symbol_renaming`) showed
  the guard. Nothing in Slang's source avoids it; `[ForceUnroll]` removes
  small constant loops altogether. Upstream, either fixes it: Slang
  emitting WGSL `for` for counted loops, or Tint recognizing a counted
  loop in `loop {}` form. To raise with both (and to check the other
  backends: Tint's HLSL and SPIR-V writers on Windows, step 4's runs).
  Two smaller lessons from the same kernel: `select(c, a, b)`, not `?:`,
  where the WGSL had `select` (Slang's `?:` is a branch, which rounded
  otherwise: paths drifted a few ulps), and `any(bool3(…))` over a `||`
  chain (Slang emits nested branches: 4 of the 11 points).
- **Large struct loads are split per field at each use** (deferred buffer
  loads): raycast was 30% slower until it read its draw record's fields
  once. **Stores too (r60):** a struct read, changed and written back
  (`Instance inst = rows[i]; inst.flags |= 1u; rows[i] = inst;`) becomes a
  load and a store per field, each with its own bounds clamp, where the
  WGSL's copy was one wide access: the model pool's `hideRest` (one flag
  bit) and `claimSlots` (three rows and a flag) ran 4 to 11% slower until
  they wrote only their fields (`rows[i].flags |= 1u`), now within 4%.
  Seen once their timings resolved: at 64 dispatches a pass these
  few-µs kernels were a timer step or two (Chrome's 65.5 µs), and read
  as even.
- **Matrices:** a `float3x3(...)` or `float4x4(...)` literal takes rows,
  WGSL's `mat3x3f(...)` columns; one read from a buffer is the same
  matrix in both (Slang stores it column-major for WGSL). Ports keep the
  literals verbatim and multiply as `mul(v, m)`, or transpose a column
  literal where it meets a buffer's matrix (the model pool). Grouping a
  product the WGSL's way keeps the rounding.
- **Tolerances** where a port can't be bit-identical: ulps for sums
  ordered or fused differently; an absolute bound for sums that cancel
  (SH coefficients near zero are many ulps from their twins while both
  are 1e-7 from the truth) and for the Monte Carlo reference, whose
  near-mirror sphere (roughness 0.05) turns a direction a rounding apart
  into a different point on the GGX peak (119 pixels by up to 0.02 of
  values to 84, 8e-4 relative).
- The gate itself: it flags outputs that are all zero (a case whose
  inputs never made its kernel write), and a GPU shared with other heavy
  work loses the device on the heaviest case (ao.gtao, which also
  happened at the commit where the whole gate had passed).

Still WGSL: only `surfaceVertex.wgsl`, by design (Slang emits no
`@invariant`).

_Step 6 results (r59): the atmosphere in Slang._ `air.slang` (a module:
the medium, the geometry, the tables' mappings and reads, the march),
`atmosphere.slang` (the tables and the probe), `sky.slang` (the sky-view
table, the sky from space, stars, the Moon, the sun-light table, aerial
perspective) and `reference.slang` (the Monte Carlo reference). The gate
(spikes/slangKernels.ts `ATMOSPHERE_CASES`): 15 of 15, every output
identical or within 1 ulp of f16, the probe within 1.1e-4 relative
(f32), all within 5% but the path tracer (7%, the loop guard above; an
offline reference, given 10%, stated in the gate). The reference path
tracer passes its own check against the CPU integral (|z| < 1.94); the
sky spike runs on them with its measures in range (the sky within 1% of
its tables' march, aerial perspective 1.8%, sunlight 1.1%); globe parity
passes and imagery's first view matches the previous run to the digit.

- **The aerial pass is two entry points, not a pipeline constant.** With
  its wavelength group a `[vk::constant_id]` constant, slangc ran for
  minutes and gigabytes on that one kernel; a generic's value parameter
  (`aerialColumn<let group : uint>`) makes each entry its own specialized
  copy. A plain function argument also compiled, but the first group's
  pass kept the second's reads and indexed the weights at run time: 40%
  slower.
- **Test inputs must be what the engine has.** With random tables the sky
  from space differed by up to 110 ulps of f16 and the probe by 5,540 of
  f32: a coordinate a rounding apart crosses a fixed-point filter weight's
  step, and between random texels that step is large. Made by the
  reference's own table passes, 1 ulp. Discontinuities (the horizon test,
  the rim's eight-ray average) flip on a rounding with random input too.
- **Small passes need many draws per timing:** Chrome quantizes
  timestamps to 65.5 µs, so a pass of a few µs drawn 64 times was 13%
  noise (cases now set `repeat`).
- **A varying `nointerpolation` struct passed whole** to a helper is
  copied with its `@interpolate(flat)` onto a struct WGSL forbids it on;
  fragment entries read such inputs by field (sky.slang `starFragment`).

_Step 7 results (r60): the spike retired._ Its port is the engine's
source: the spike's opaque shader, its `IMaterial` extension point bound
at link time and its cull kernel went (`spikes/slang.html`, its Slang
and build script, its lab and bench entries), and so did `common.wgsl`
(no WGSL kernel declares the shared structs any more; the layouts test
keeps the reflection's own checks). Materials in Slang reach the engine
through the custom shader contract instead (step 5): `ToonMaterial`, the
spike's user material (posterized base color, a rougher finish), is
`parity/slang/toon.slang`, a fragment stage, and the custom shader page
checks it links: compiled at build time and at runtime, it draws what its
WGSL twin draws, and differs from the default (54 of 54). Kept: the
probes (`spikes/slang/probes/`, re-run per Slang release, step 1) and the
gate with its references (`spikes/slang/reference/`): **the migration
still counts as done only after the gate and the probes run on Windows
(D3D12; an NVIDIA and an AMD or Intel GPU), and the loop guard (above) is
checked on Tint's other writers there.**

_To fix (r60): Snyk findings in the development tooling._ A scan of the
whole package (CLAUDE.md asks for Snyk on new code) found 17 issues, none
in the engine or in code the migration touched, all in tooling:

- DOM-XSS: parity pages' error tables (`parity/globe.ts`, `heights.ts`,
  `imagery.ts`, `lod.ts`, `selection.ts`) and the bench dashboard
  (`bench/suite/suite.html`, `views/Compare.tsx`, `Trends.tsx`,
  `Explorer.tsx` with `cesium1x.ts`). Text via `textContent` / DOM nodes,
  as `parity/translucency.ts` `fillTable` and `spikes/slang.ts` `report`
  already do.
- The dev server's file endpoints (`vite.config.ts`): paths from a
  request body read and written unchecked (path traversal), and error
  messages returned to the client. Resolve each path under its allowed
  root; return generic errors.
- An open redirect (`bench/suite/limitsTier.ts`); no rate limits on
  file operations (`bench/suite/frozen.mjs`, `vite.config.ts`); a
  hard-coded token flagged in `bench/suite/ionToken.ts`. On a
  localhost-only dev tool these may be false positives: say why in a
  comment where so, and rescan until only those remain.

_Step 5 design (decided): the surface shaders as a precompiled unit,
linked by name._ The custom-shader contract (`VertexInput`,
`FragmentInput`, …) can't be exported from the generated module as first
planned: its structs hold types each shader defines (`Attributes`,
`Metadata`, `InstanceValues`), which a module compiled ahead of time can't
name. So the engine's surface module is treated as an object file and
run-time code as a second unit, joined as a linker would, never by
rewriting the compiler's output:

- **The boundary is declared once, in Slang:** small fixed structs for
  the engine's side (a vertex, a fragment, their IDs), exported under their
  names (`__extern_cpp`); the functions the engine calls by name
  (`__target_intrinsic`: a vertex stage and a fragment stage the run-time
  unit defines); the helpers it exports (`readNamed`,
  `readFragmentProperty`, `readInstance`) and accessors for what styles
  read of the view (the camera, the view-projection, the anchor), not the
  `View` buffer's fields.
- **The build generates both sides from it:** the engine's WGSL (as for
  the kernels), a TypeScript description of the boundary from its
  reflection (fields, types, signatures; as `layouts.ts` is), and the
  Slang authors' contract (`cesium.slang`). `CustomShader.ts`, the 3D
  Tiles and vector styles and `slangStages.ts` generate the contract
  structs and the glue that builds them from the engine's, against the
  description. Golden tests check that the three agree.
- **Linking is joining plus a check:** before compiling, the host checks
  the run-time unit defines each function the engine calls, once, with
  the boundary's signature, and reports it in the author's terms.
- **Values passed from vertex to fragment** are packed into `vec4` slots
  (two floats and a `vec2` share one) and the generated module with that
  many slots is chosen: no `// @named` splice. Whether that is a module per
  count (0 to 4) or two (none and four) is measured first: unused slots
  may cost tile memory per vertex on Apple's GPUs.
- **Front ends:** styles keep their TypeScript expression compilers
  (WGSL, no Slang); WGSL custom shaders link as they are; Slang custom
  shaders are compiled offline (`scripts/slangShader.mjs`, the
  recommended path) or in the browser (`CustomShader.fromSlang`, the WASM
  compiler loaded lazily in a worker), now cached in IndexedDB by source
  and Slang version, so the compiler loads only when a visitor meets a
  shader not yet compiled. The engine itself never loads it.
- Switches inside the surface shaders stay `override` constants where
  they can (settled at pipeline creation, not compiled again); variants
  only where a struct or binding changes.
- **Measured (r55, Apple M-series, Metal):** a vertex-heavy pass (2
  million triangles of about a pixel, 4× MSAA) costs what the fragment
  stage reads, not what the vertex stage declares: four slots with one
  read cost the same as one slot with one read. Metal drops outputs the
  linked fragment stage doesn't read, so one module with four slots serves
  every pipeline, the engine's own included. To check on D3D12 and Vulkan
  (§3.4 step 4's Windows runs).

_Step 5 architecture: compilation units and a linker._ Composition is a
first-class step, not string joining spread through `RenderContext`:

- **A unit** (`ShaderUnit`) is WGSL with a name and its symbol table:
  what it defines (structs, functions, bindings) and what it uses from
  other units. Engine units are the generated surface WGSL, common
  structs and kernels' modules; run-time units come from front ends: a
  custom shader's stages, its generated contract and glue, its uniforms'
  bindings, a style's helpers. Symbols are declared, or read from the
  WGSL by a scanner of its top-level declarations (reading, never
  rewriting).
- **A boundary** (`Boundary`) names what one side exports and what it
  requires the other to define, with signatures: the surface shaders'
  (`cesiumVertexStage`, `cesiumFragmentStage`, the helpers, the fixed
  structs) is the first; the point cull's and the model pool's styles are
  others. Generated from Slang reflection once the surfaces are Slang;
  until then declared beside the WGSL.
- **A linker** (`Linker`) takes units and a boundary and gives a module
  or diagnostics: each required symbol defined exactly once, no name
  defined twice, signatures as the boundary says. Errors from the
  compiler map back to a unit and its own line (one table, from the
  link). Today's linker joins checked units in order; others can sit
  behind the same interface: Slang module linking where the compiler is
  loaded anyway, WESL-style imports, or WGSL linking if the language gets
  it.
- **Front ends** produce units: WGSL custom shaders as written, Slang
  ones offline (`scripts/slangShader.mjs`) or in the browser (the WASM
  compiler, cached), styles from their expression compilers. Pipelines
  are made from links, cached by the linked code.

_Step 5 progress (r56): the surfaces are Slang._ `surface.slang` (opaque
and translucent in one module, one compile for every pass) plus
`surfaceVertex.wgsl`, the three vertex entry points hand-written because
Slang emits no `@invariant`; they call `surfaceVertex`,
`surfacePointVertex` and `surfaceDepthVertex` across a second boundary
(`SURFACE_VERTEX_BOUNDARY`). Slang gives varyings locations in field
order (its `vk::location` doesn't reach WGSL, and semantics ending in a
digit are one semantic's indices, placed out of order), so a test checks
`VsOut` against every fragment entry point's inputs. `cutOutInDepth` is
pipeline constant `0` (`[vk::constant_id(0)]`). Custom shaders 51/51,
translucency 8/8, models, tileset and tracks pass.

- **Found by the linker:** Slang-compiled custom stages and the
  Slang-generated surface both carry Slang's synthesized names
  (`pixelOutput_0` from the stub's output); the link stopped it with
  both places named. The stub now has no outputs (it `discard`s), but two
  separately compiled Slang modules share one naming scheme, so a
  collision can come back with any synthesized helper.
- **Replaced (r57): `slangStages.ts`'s reading of Slang's output.** It
  found `vertexMain_N` and Slang's copies of the contract structs by
  pattern and stripped the `_N` suffix to match fields. Slang writes no
  symbol map, and `__extern_cpp` fixes the names of every struct it
  touches, so sharing contract structs between two compiles would emit
  them twice. What crosses now is only functions over built-in types:
  - _The boundary's description_ (`src/shaders/generated/boundary.ts`):
    the structs that cross, field by field with their WGSL types, from
    Slang's reflection of `surfaceBoundary.slang` (the engine's, through
    the reflection-only `boundary.slang`) and of cesium.slang (the
    contract's, compiled with empty named values). `shaders:check` keeps
    it current. Slang's reflection has no functions' signatures, so the
    functions stay declared in `shaders/link/boundary.ts`, checked against
    the generated WGSL.
  - _WGSL shaders:_ the contract's structs and stage glue are generated
    from the description (`scene/contract.ts` `CONTRACT_WGSL`): cesium.slang
    is their one source, and a field it adds must be one the engine
    passes.
  - _Slang shaders:_ compiled with a bridge (`slangBridge`):
    `cesiumSlangVertex` and `cesiumSlangFragment`, `__extern_cpp`, whose
    parameters are the contract's fields and named values flattened
    (built-in types only, named values sorted by name). Slang's output is
    used as it is; `CustomShader` finds the bridge in its symbol table and
    adds the WGSL side (`slangAdapter`; outputs through variables of their
    own, WGSL forbidding aliased pointer arguments) and a boundary for its
    signatures (`slangBridgeBoundary`: a shader compiled against other
    named values fails the link, named). Uniform bindings are read from the
    units' declarations, not matched in their code.
  - _Still open:_ a `SlangLinker` (one compile with `surface.slang`) stays
    an option behind `Linker`, for when a compile per shader of the whole
    surface is affordable (with the IndexedDB cache).
- **Done (r58): browser-compiled Slang cached in IndexedDB**
  (`scene/slangCache.ts`, database `cesium-slang`). The key is a SHA-256
  of everything the compile reads: the pinned Slang release
  (`scene/slangVersion.ts`, also slangTools.mjs's), the compiler's URL,
  the `cesium` module for the shader's declarations (given uniforms by
  type only), the shader and its bridge. A hit returns the WGSL and the
  shader's own uniforms without starting the worker, so the WebAssembly
  build isn't fetched: on the custom shader page's second visit no Slang
  worker started, 51/51. At most 128 entries, least recently used first
  out. `fromSlang({ cache })` takes `false` or any `SlangCache`
  (`memorySlangCache`). Where IndexedDB or digests are missing (private
  windows, insecure contexts) or an operation fails, shaders compile as
  without it. A compiler served at the same URL but changed isn't seen;
  the release in the key is the engine's, not the served build's (that
  needs the compiler loaded to ask).
- **Later (with the 2.0 package's tooling): ahead-of-time Slang for
  apps.** `scripts/slangShader.mjs` is the package's own script. Apps
  that don't want the WASM compiler need it published: a CLI in the
  package (`npx @cesium/next slang …`) and a Vite/Rollup plugin turning
  `import shader from "./x.slang?cesium"` into `CustomShader` options,
  with the same compile as `fromSlang`, pinned to the engine's Slang
  version (the contract is versioned with it). Its output must link
  against the engine version it runs on: the boundary's description,
  carried in the output and checked by the linker, says so in the
  author's terms rather than as a WGSL error.

_Explore when the surface shaders move (step 5): runtime Slang for the
user contract._ Today 3D Tiles styles, the vector styling language and
`CustomShader` generate WGSL strings against the WGSL ABI
(`FeatureStyle.ts`, `VectorStyle.ts`, `CustomShader.ts`). The
alternative is to generate Slang: styles become implementations of a
style interface, custom shaders link as modules, and the WASM `slangc`
compiles them in a worker (as `CustomShader.fromSlang` and the Slang
playground already do, §13.12). Compare the two on:

- **Latency:** compile time per style edit, cold (loading the 10 MB
  build) and warm. The playground shows it on every edit.
- **Payload:** the WASM build, when it is loaded, and whether it can be
  lazy only for pages that compile.
- **Errors:** messages and line mapping for a style author against what
  WGSL generation reports.
- **Capability and safety:** generics, interfaces and type checking of
  user code against the engine's types, versus string templates.
- **Speed:** GPU time of the generated code for the same style.
- **Reach:** pages without the WASM build (the library standalone, CSP
  without `'wasm-unsafe-eval'` in workers).

The answer may differ by user: styles and the vector language could
compile to Slang offline in their tooling, while `CustomShader` keeps a
WGSL path for pages that must not load the compiler.

_Open:_ how stable exported names are across Slang releases (the user ABI
depends on them); whether generated code passes Tint's uniformity
analysis at the surface shaders' size; the WASM compiler's size, for
runtime user Slang.

**Engine foundations for user shaders (r28; built in the PoC, milestone
"Custom shading").** The r28 spike state: `ShaderOverrides` swaps the
whole opaque module for the whole engine, and the Slang spike links one
`IMaterial` into it at build time. User shaders per tileset, model or
style need:

1. _Shader identity in the batch key and an async pipeline cache._ Batches
   key on mesh, material, texture set and cull mode, and the pipeline
   follows topology and sidedness only. The key gains the shader; pipelines
   are cached by shader hash × variant (cull mode, topology) × pass and
   compiled asynchronously, so content shows when its pipeline is ready and
   compiling never stalls a frame.
2. _A vertex attribute directory._ Records have six fixed stream slots.
   1.x `CustomShader` reads any glTF attribute (`_TEMPERATURE`), and point
   clouds and vector billboards need named attributes too: a per-mesh table
   of (semantic, stream offset, format) replaces the slots, read by a
   generated accessor per attribute.
3. _Generic material parameters._ The material table is the fixed 64-byte
   glTF PBR struct. User materials get typed parameter blocks (layout from
   Slang reflection) in a parameter buffer addressed per material, and
   texture sets with as many slots as the material declares (a bind group
   layout per material type, Slang `ParameterBlock` → group 2). glTF PBR
   becomes the default material type.
4. _Pass variants from one module._ Opaque, pick, depth-only and later
   shadow and translucent pipelines compile from the same user code, so a
   vertex modifier moves geometry the same way in every pass. A vertex
   modifier declares its displacement bound, which pads culling bounds;
   ray queries see undeformed geometry until compute skinning exists
   (§13.9).
5. _A versioned `cesium` Slang module as the public contract:_
   `SurfaceInput`/`Surface`, attribute access, per-instance streams,
   feature IDs and feature-property lookup (for `IFeatureStyle` and 3D
   Tiles styling), view and lighting inputs. Raw WGSL can target the same
   ABI.
6. _Runtime compilation_ by the lazily loaded Slang WASM compiler in a
   worker, cached by source hash; build-time compilation (CLI or bundler
   plugin) stays the recommended path. Errors surface asynchronously and
   the content draws with the default material meanwhile.

Compared with 1.x `CustomShader` (GLSL snippets `vertexMain` and
`fragmentMain`, uniforms, varyings, a lighting model, for `Model` and 3D
Tiles): the same capabilities, typed and checked at compile time, one
material per batch instead of per primitive draw command, and the same
module drives every pass. A migration guide maps `vsInput.attributes`,
`fsInput.features` and `czm_` built-ins to the `cesium` module.
