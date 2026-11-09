# Sky and Observer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The owner chose subagent-driven execution: a fresh implementer per task, a fresh reviewer after each, and a whole-branch review at the end.
>
> **Check every existing path before Task 1.** The order is: the file split merges, then its second pass (narrow contexts and real layers), then this plan, then 5b. This plan names existing code by symbol, and gives paths for new files only. Read the split's layout (branch `file-split`, in worktree `scratchpad/cull-bug`) and the second pass as they landed, and find each symbol with `grep -rn`. When this plan was written, the split had moved the view's passes to `src/render/view/` (`viewFrame.ts`, `outputPasses.ts`, `scenePasses.ts`, `exposure.ts`, `environment.ts`), `updateExposure` and `adaptExposure` to `exposure.ts`, and `RenderTarget` to `src/scene/renderTarget.ts`. Say in the commit message if a name moved. If the second pass's contexts change how a pass reaches the sky or the device, follow the second pass, and keep this plan's names for what's new.

**Goal:** Give each view one observer that owns light to pixels, on a first public post-processing interface; let the sky take a source-neutral data pack that never ships uncleared; draw stars as culled, sharp points; add glare as a post stage from a list of light sources; and remove the star exposure rule, so the simulated world stays physically correct.

**Architecture:**

- **The observer** (`view.observer`) holds exposure (EV100, or the eye), the stars' point spread, glare, tone mapping and a chain of stages. It's plain data with no GPU types. The chain is: scene light, then the meter (where it is today), then the eye's point limit, then glare, then the response (a camera's exposure or the eye's model), then look stages, then tone mapping, then encoding, then display stages.
- **A stage** declares its slot, what it reads, and whether it's physics, a model or a look. A host application can add one. Built-in multi-pass stages (glare) use an internal form of the same thing, registered in the same graph function.
- **The sky data pack** is a folder of a manifest, points and a background. The engine knows nothing of where it came from. A script builds it in a local store. A Vite plugin refuses to emit an uncleared pack. Today's map stays the default.
- **Stars** stay scene data: a `StarField` of typed arrays. The rasterizer sorts them into 384 sky cells, culls those in compute, and draws 4-vertex strips into the star layer. Each observer sets the point spread.
- **Glare** reads the image for its veil and a light list for the sun and the bright stars. The sun's disc is masked out of the image, and its veil is computed in closed form from its true illuminance, so no clamped pixel carries its energy. Spikes are sprites of a kernel that a worker computes once. No FFT runs in the live path.

**Tech Stack:** TypeScript, Slang compiled to checked-in WGSL (`npm run shaders`), WebGPU, Vitest, Playwright (`bench/run.mjs`), the Vite dev server for one check page, `node:zlib` for reading EXR. No new npm dependencies.

**Spec:** `CESIUM2_WEBGPU_PLAN.md` §13.32 ("Unifications") and its order, with §13.17, §13.22, §13.24, §13.28, §13.29 and §13.30. **Findings:** `.superpowers/reports/stars/notes.md` (the spike's measurements) and `.superpowers/reports/stars/Star data licenses.md` (what the terms say, untracked). **Paper:** Schneegans, Kreskowski and Gerndt, "Smaller than Pixels" (Eurographics 2025). **Base:** main, after the file split and its second pass.

**Takes findings from the spike, not its code.** Branch `star-spike` is throwaway. Its `SPIKE` hooks in `Sky.ts`, `sky.slang` and `Engine.ts`, its per-star gains and its stretch of the background are not to be carried over (§13.32).

**What this plan leaves alone.** Planets, the shutter and accumulation, deep-sky patches (5e), the medium stack, the shared point pipeline, and any renderer interface. It only keeps scene data and rasterizer data apart, so that seam can open later.

## What the spike and the code showed

These facts drive the calls below. Where they correct an earlier note, that's said.

| Finding | Evidence | Where it goes |
| --- | --- | --- |
| Cells plus strips is the cheapest way to draw stars at this count: 0.66 ms against 3.60 ms for today's quads | Spike, M2, 530,851 stars, 2560×1440, median of 5 runs | Tasks 8 and 9 |
| Compute splatting doesn't pay at this count, and it needs a 44 MB buffer | Same | Not built |
| Sprites cost 0.13 ms against 62.5 ms for the FFT, from the same kernel | Same | Task 14 |
| The veil cost 2.75 ms composed at full size | Same; the spike notes it could be halved | Task 13 composes at half size |
| The map clips at 1.0: Sirius, Canopus and Arcturus all read back as 0.08 | Spike | The hybrid, Task 6 |
| A map-only pack still needs a reference catalog, since flux isn't linear in magnitude | Spike | Task 6 |
| `STARLIGHT` counts faint stars that a deep map already holds | Spike, not isolated | Task 11 |
| **Halved weights on a mip pyramid fall as 1/θ³, not 1/θ²** | Checked for this plan: a mip level conserves energy, so its peak falls by 4 per level. With level weights of 2⁻ⁱ, the summed profile's log-log slope is −3.00; with equal weights it's −2.00 (12 levels, r from 8 to 256 px). The paper's equation 3 has peak ∝ 1/σ², which is equal energy per level, while its section 5.1 and the spike's compose use halved weights | Task 13 uses equal energy per octave, with a test on the slope |
| `EYE_STARS_EV100` does nothing on a moonless night | Computed from `eyeResponse`: dark-adapted, the view's pre-exposure is about 13.7, above the rule's 6.67 | The table in Task 11 |
| The rule is 17.2 stops at a sunlit adaptation | Same: pre-exposure 4.5 × 10⁻⁵ at 4,000 cd/m² | Same |
| An indirect draw's first instance is a silent no-op without `indirect-first-instance` | `Capabilities.indirectFirstInstance`. The spike's cells rely on it | Task 9's CPU path |
| No gated parity suite draws the sky | `parity/main.ts`, `globe.ts`, `imagery.ts`, `tileset.ts` and `models.ts` use `background: "color"` and `UNITLESS_EXPOSURE` | So they must show no difference at any task |
| The clamps are `SKY_MAX` 30,000 in the march and 60,000 from the table, pre-exposed, and `STAR_MAX` 60,000 cd/m² before exposure | `sky.slang`. §13.22's "60,000" is one of the three | Tasks 12 and 13 |

## Author's calls

Each is marked "(author's call N)" where it's used. One line each, then what undoing it costs. In order: the observer (1 to 11), the pack (12 to 22), stars (23 to 27), removing fudges (28 to 30), glare (31 to 41), the UI (42).

1. **`view.observer` replaces `view.exposure` and `view.toneMapping`, with no shim.** It's a prototype, and 5d and 5e haven't built on them yet. *Undo:* two getters.
2. **The `Exposure` union stays as `observer.exposure`.** EV100 stays the unit. `{ scale }` stays only for scenes without units, which the parity pages use. *Undo:* a type.
3. **`eyeObserver()` and `cameraObserver()` are functions that give settings, not classes.** `Camera` already names the pose and projection. *Undo:* renames.
4. **The readout's EV100 for the eye is an equivalent:** the EV100 of its pre-exposure, flagged `equivalent: true` and shown as "≈". A plain scale has none. *Undo:* one function.
5. **Engine defaults don't move:** a daylight camera, no glare, no stages. The `Viewer` stays on the eye, with glare off until the owner has judged it (question 1). *Undo:* one line.
6. **Three slots:** `scene` (linear, pre-exposed, before the response), `exposed` (after the response, before tone mapping) and `display` (encoded). *Undo:* a union, before any host uses it.
7. **`kind` is required on a stage:** `physics`, `model` or `look`, with a `label`. Readouts show it. So a look can't pass for physics. *Undo:* make it optional.
8. **`present.slang`'s `fs` keeps running unchanged unless an `exposed` stage is on.** New entries `fsResponse` and `fsTone` split it only then, so the default path costs nothing and stays the same. *Undo:* one entry.
9. **A public stage is one fullscreen fragment function,** `postStage(input: PostInput) -> vec4<f32>`, joined through the shader linker with a `POST_STAGE_BOUNDARY`. Slang goes through the existing offline compiler first. *Undo:* one boundary.
10. **Multi-pass built-ins use an internal `GraphStage`,** which isn't public until a second user asks for it. 5i decides. *Undo:* nothing to undo; exporting it later is additive.
11. **Ambient occlusion doesn't move.** It feeds shading before the opaque pass, so it isn't a post stage. See "FXAA and ambient occlusion". *Undo:* not needed.
12. **A pack is a folder:** `manifest.json`, `points.bin`, `background.bin`. Each binary starts with a magic (`CSKYPTS1`, `CSKYBG01`), so a build can recognize one under any name. *Undo:* a reader.
13. **The store is `~/.cesium-bench/sky`, or `SKY_DATA_DIR`,** beside the frames store. *Undo:* one path.
14. **The default recipe is NASA SVS 4851's layers plus HYG v4.1 for the bright end,** both marked uncleared. The spike found no good pack without a catalog. HYG's own inputs include Hipparcos, so this needs the owner's say (question 2). *Undo:* one recipe.
15. **There's no built-in download for raw Hipparcos or Gaia.** The script takes `--catalog <local file>` and an explicit `--allow-unsettled-terms`. Off by default. So nothing here fetches them until their terms are answered. *Undo:* a recipe.
16. **Catalog at magnitude 7 and brighter, map below.** From the spike's "roughly magnitude 7". *Undo:* a constant.
17. **The background defaults to 1024² a face, with mips,** 67 MB, since the spike found it "nearly enough"; `--background 2048` for 2048². *Undo:* a flag.
18. **The background's mip level rises smoothly as the field of view narrows below 30°,** in place of the spike's switch, which popped. Long lenses stay soft until 5e. *Undo:* one function.
19. **`distributable: true` also needs `clearance: { by, date, note }`.** The script never writes either. A person edits the manifest after review. A missing flag counts as false. *Undo:* one check.
20. **At run time an uncleared pack loads, with one warning.** Builds refuse; a local run needs it. *Undo:* a throw.
21. **Calibration stays out of the repository.** It's derived data, computed at build time and kept in the pack's manifest. Every committed test fixture is synthetic. *Undo:* not recommended.
22. **Uploads are sliced:** 4 MB of points, or one face's top level, per tick. The old sky draws until the new one is complete. *Undo:* a constant.
23. **The tight core applies to today's map too.** §13.29 says a checkout with no pack "draws what it draws now", and it also says to replace the fixed halo. *Ruling:* the first is about the data, and the point spread belongs to the observer. Task 8 states the difference. *Undo:* the presets' `pointSpread`, one line each.
24. **Point spread:** the eye σ 0.85 CSS px; a camera σ 0.55 CSS px. No wing by default, though `wing` stays in the type, since the spike's camera had one. From the spike. Energy per star doesn't change. *Undo:* constants.
25. **384 cells (8 a face side), sorted brightest first, built in the worker at load** for any `StarField`. *Undo:* a constant.
26. **Compute culling, with an identical CPU path** when `submission` is `"direct"` or `indirect-first-instance` is missing. *Undo:* drop a branch.
27. **The cull's visibility threshold divides by the chain's largest `shadowGain`,** so a look that lifts shadows can't reveal a culled star's absence. *Undo:* one term.
28. **The eye's point limit is a `model` stage, not a star gain.** It fades what stands above its surroundings below a limit: magnitude 6 dark-adapted, brighter in proportion to the rods' threshold at the eye's adaptation. It runs only with the eye. *Undo:* remove the stage.
29. **No special path for stars beside a sunlit Earth.** Physics shows none there, as photographs do (question 3). *Undo:* a look stage later.
30. **`STARLIGHT` splits into a `faintStars` uniform:** all of it with today's map; half with a deep pack, in the sky seen and in the environment, plus the pack's mean background in the environment only. The half is the spike's guess at the zodiacal light's share, and is labelled a guess. *Undo:* one number.
31. **Order:** the meter, the eye's local adaptation, the eye's point limit, the source list, the veil, the sprites, the composite, the response. Glare feeds neither the meter nor the adaptation (§13.22). `readHdr` stays before all of it. *Undo:* registration order.
32. **The sun's energy.** In the veil's input, pixels inside the sun's disc count as zero. Its veil is `E × V × share × psf(r)` per pixel, in closed form, from the same level weights as the pyramid: `E` is its true illuminance through the air, from the `sunLight` table, and `V` its visibility. So it's the right size at any exposure, and it doesn't vanish as the sun leaves the screen. *Undo:* a shader branch, at the cost of the clamp.
33. **Equal energy per octave of angle.** Each level's weight comes from the angle its σ covers at this field of view, over 0.1° to 60°, so a star's veil at 1° reads the same at a wide field and a long lens, and what falls outside the view is lost. *Undo:* one function.
34. **The veil is composed at half size, from a half-size base, then added.** *Undo:* a target size.
35. **`share` defaults to 0.2,** from the paper. It's a choice, not a measurement. *Undo:* a default.
36. **`V` is 32 taps over the disc:** depth at sample 0, the body's ellipsoid and the Moon's disc, per tap. A tap off screen counts as visible. *Undo:* a constant.
37. **Stars in the list are the 2,048 brightest,** walked by one thread in order, so the brightest always win a sprite. *Undo:* a constant.
38. **Sprites use `draw(4, 256)` with a degenerate vertex for an unused slot,** not an indirect draw, so they avoid §13.23's risk. A pixel budget of 4 million per view bounds overdraw. *Undo:* one draw call.
39. **Kernels come from a pupil, computed once in a worker, in angle.** Apertures: `round`, `vanes`, `hex`, `blades7`. The spike's streak stays out: it read most as an effect, and its grating failed. The eye gets a veil and no spikes for now. *Undo:* a list.
40. **Tiers:** `full`, `reduced`, `sources` and `off`, chosen from the adapter and the pixel count, with an override. Intel starts at `reduced` until the owner's laptop says otherwise. *Undo:* a table.
41. **The composite clamps at 60,000 and drops anything that isn't finite,** so glare can't reach the meter's NaN problem by another route. *Undo:* one line.
42. **One shared `attachObserverPanel` in the widgets,** used by the playground, Dyno's Viewer and the new example, so the rules hold everywhere. *Undo:* inline it.

## Rulings

Where the sources disagree.

1. **§13.28 says glare "needs the sun's disc to keep its true luminance rather than being clamped". §13.32 says its energy comes "from the list and not from clamped pixels".** *Ruling:* §13.32, the later and the owner's. The disc stays clamped in the image (call 32).
2. **§13.29 assigns the star exposure's removal to 5e. §13.32 moves it before 5b.** *Ruling:* §13.32, as the owner's order. See "What other plans need".
3. **§13.29 holds raw Gaia and Hipparcos as optional and off. The hybrid needs a bright-end catalog, and HYG is built on Hipparcos.** *Ruling for now:* "raw" means the ESA files, so HYG may be the default in a local pack, uncleared, with its stacking written in its manifest (call 14). The terms stay unsettled, and this plan concludes nothing about them. The owner can change it (question 2).
4. **The `Viewer` set `EYE_STARS_EV100` to −3 for "about 1.x's brightness" (r43). The owner's rule is no gains on scene light for looks.** *Ruling:* the owner's rule. Star brightness against 1.x's sky box isn't a parity target. No gated suite draws it. Dyno's side-by-side Viewer will differ, and the example says so.
5. **§13.32's "taste belongs to post-processing" against the spike's Eye look,** which set a limit and color per star in the vertex shader. *Ruling:* a stage (call 28). The spike's own later version did this too. Color per star under the eye stays what `eyeSees` gives, so bright stars read gray-blue under dark adaptation (Betelgeuse's orange in the spike came from the tint that's gone). The owner judges that in Task 11.

## Global Constraints

Copied from 5d where they apply, with this plan's additions.

- **The simulated world stays physically correct (owner, §13.32):** "no gains or tone changes on scene light for looks". Nothing derived from an observer reaches a scene or sky shader except `exposure` (pre-exposure, a matter of fp16's range) and `pointSpread`, which keeps each star's energy. Task 11 adds a seam test for this.
- **Scene data and rasterizer data stay apart:** `src/scene/observer.ts`, `src/atmosphere/skyPack.ts`, `src/atmosphere/starCells.ts` and `glareKernel.ts` hold no GPU types, and `test/importBoundary.test.ts` says so. Don't add a renderer interface.
- **Earth-only scenes with no sky are unchanged:** the parity suites show no pixel difference at any task. Metal can reorder a float sum when a kernel's code changes, so explain any difference before accepting it.
- **Sky data during R&D (§13.29):** no sky data, derived data or derived images in the repository, on a server of ours, in a library build, or in the handbook's file. Fetched by a script into the store, on the developer's machine. Stills and pack files never go in a commit. Numbers do.
- **Licences:** describe what a page says, with the date read. Don't write a legal conclusion, and don't describe the situation as resolved.
- **Pay for what you use:** a Viewer with no pack and no glare loads nothing new and allocates no new target. `scripts/checkBundle.mjs` and `test/libraryWidgets.test.ts` hold.
- **Allocation:** steady-state ticks allocate nothing new, with glare and stages on (`alloc`).
- **GPU safety:** see "GPU safety". Every loop has a constant bound. Node tests first. One small browser page at a time, on the task's own port. Never use the server on 127.0.0.1:5190. If the device is lost, stop and find out why.
- **UI (`packages/next/AGENTS.md`):** sliders run right for brighter. Readouts are in EV100. Polished, in both themes, at 380 px wide, keyboard only, with reduced motion, and with a clean console. Each control says whether it's physics, a model or a look.
- **Repository practice:**
  - Commands run in `packages/next`.
  - Commit locally and never push. End each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Commit only your task's files, by path (`git add -- <paths>`, then `git commit -m "…" -- <paths>`). Check `git diff --cached --name-only` first. Never `git add -A`, `git stash`, `git checkout`, `git reset` or `git push`. While `.git/index.lock` exists, wait and retry.
  - Slang for engine shaders. Never edit generated output. `npm run shaders:check` must pass.
  - `npm run surface` with any change to an entry point's exports, and commit `api/surface.txt` with it.
- **Snyk:** each task runs `snyk_code_scan` on the first-party files it adds or changes before it commits, fixes what the scan finds in its own code, and rescans until clean. Findings that predate this plan are reported, not fixed.
- **Wording:** plain, short sentences. Units named. No e-notation in prose. "Frame" is never used alone: say tick, reference frame or render space; code names keep theirs. Keep precision and accuracy distinct. Describe the purpose in generic words ("an embeddable rendering core", "a host application's own services"). "Overall plan" or "main", never the other word.

## Batches and gates

Plans batch: a type check per commit, the full suite and the gates once per batch, not per move.

**Per commit:** the task's focused tests, `npx tsc --noEmit -p .`, and `npx eslint` and `npx prettier --check` on the changed files. `npm run shaders:check` if a shader changed. Each task's gates below are run only at the end of its batch, unless the task says otherwise.

| Batch | Tasks | At its end, once |
| --- | --- | --- |
| A: the observer | 1 to 3 | `npm test`, `tsc -p tsconfig.lib.json`, `parity`, `imagery`, `translucency`, `customShader`, `alloc`, `check:bundle` |
| B: the pack | 4 to 7 | `npm test`, `npm run build`, `npm run build:lib`, `npm run handbook`, `check:bundle` |
| C: stars and fudges | 8 to 11 | `npm test`, `parity`, `imagery`, `alloc`, the check page |
| D: glare | 12 to 15 | `npm test`, `parity`, `translucency`, `customShader`, `alloc`, the check page |
| E: the rest | 16 to 19 | Everything, in Task 19 |

Gates compare with the batch's first commit and with main. Run one suite at a time. Which task can move which suite is in "Expected pixel differences".

**Parity against 1.x.** The suites above don't draw a sky, so no ruling should be needed for them. If one moves, that's a bug until explained. Only Dyno's side-by-side Viewer changes (ruling 4).

## Expected pixel differences

State these in the commit message, and check against them. "None" means zero differing pixels against the previous commit, unless a reordered float sum is shown to be the cause.

| Task | With no pack, no glare, no stage | When the new thing is on |
| --- | --- | --- |
| 1 Observer API | None | n/a |
| 2 Stages | None. `fs` is unchanged | A no-op `exposed` stage differs by at most 1/255, from the round trip through fp16 |
| 3 Astrophoto curve | None | The whole image: stars, Earth and clouds alike |
| 4 to 7 Pack | None | Stars and background only. Terrain and models are unchanged, except through call 30 in Task 11 |
| 8 Strips, point spread | In any view that draws stars: the 5% halo goes, so pixels 2 to 10 px around bright stars fall to the background. The eye's σ 0.85 takes a centered star's peak pixel from about 0.34 of its light to 0.20, about 0.8 stops down. A camera's σ 0.55 takes it to 0.41, about 0.3 stops up. Summed light per star is unchanged. Going from quads to strips alone is no difference | |
| 9 Cells | Stars add in a new order, so stacked stars may differ by 1/255 in under 0.1% of star-layer pixels. Nothing else | |
| 10 Bright end, background level | None without a pack, except the mip level below 30° field of view, which softens the background slightly | Long-lens background softer, with no pop |
| 11 Fudges | Eye only. See its table. A camera or a plain scale: none | With a deep pack: the sky's faint-star term halves |
| 12 to 15 Glare | None while off | Reads and adds. Pixels change everywhere the veil reaches. With `share` 0.2, a pixel far from anything bright falls by 20% in linear light. The meter's reading doesn't change |
| 16 to 19 | None | |

## FXAA and ambient occlusion

FXAA and ambient occlusion on this interface are a stretch. The interface must be able to carry them.

**FXAA, what it would take (Task 18, skippable).** It's one fullscreen function at the `display` slot, reading neighbors of the encoded image. `PostInput.color` is a texture and sampler pair, so it can take its taps. It then replaces the special case in the `present` pass: `frame.fxaaParams`, `frame.fxaaGroup`, `pipelines.fxaa`. `view.fxaa` becomes `observer.stages` holding `fxaaStage()`. Task 2's `display` slot already provides the `ldr` target. So about one task, and it proves the interface. FXAA's output against main should show no difference.

**Ambient occlusion, what it would take (not in this plan).** Today's GTAO runs before the opaque pass: depth and normals from a prepass, a trace, a blur, then the result is read while shading (`aoBuffer`), so only the sky's light is hidden. That's physically placed, and it's why it isn't a post stage: a post stage can only dim the finished image, direct sun included. To carry it, the interface would need a fourth slot (`beforeOpaque`) with declared inputs (`prepass.depth`, `prepass.normal`) and a declared output that shading binds. Task 2's declaration of `reads` by name leaves room for this, and nothing else in the interface assumes a stage comes after the opaque pass. Add it when a second stage needs that slot, and don't move GTAO until then.

## GPU safety

Every kernel, its bounds and its worst case. Each task reads the Metal of its kernels with `node scripts/dumpMsl.mjs <module.wgsl> <entry>` before their first browser run. Slang's loops pay Tint's guard on Metal, so small constant loops take `[ForceUnroll]`.

| Kernel or pass | Loops | Worst case | Bound by |
| --- | --- | --- | --- |
| `starCull` (compute, 64 threads) | 4 planes, unrolled; a binary search of at most 24 steps | 6 workgroups over 384 cells | `CELLS = 384`, clamped indices |
| Star strips | None | 530,851 × 4 vertices, under 2.2 M; a 4 million cap in the pack's reader | Cap in `parseManifest`, call 27's threshold |
| `glareSources` (compute, 1 thread) | 32 sun taps, unrolled; at most 2,048 stars, with a `break` at 256 sources or the pixel budget | One dispatch, one thread | `GLARE_BRIGHT_STARS`, `GLARE_SOURCES` |
| Veil input and down | 4 taps | 9 passes at most, each smaller | `VEIL_LEVELS` |
| Veil compose | 9 levels, unrolled, 4 bilinear taps each | Half-size | `VEIL_LEVELS` |
| Sprites | None | 256 instances; 4 million pixels; radius at most 512 px | `GLARE_SPRITE_PIXELS` |
| `eyeLimit` | 8 ring taps, unrolled | Full-size, fragment, eye only | Constant |
| Uploads | n/a | 4 MB, or one face, per tick; then the mip generator on one face per tick | Call 22 |
| Kernel | CPU only, in a worker | One pupil at a time, 1024² | Worker |

**Slicing.** §13.32 wants slicing to belong to the graph. This plan does less: its only heavy GPU work is uploads, which it slices itself, and every live pass is short and bounded. The graph-level mechanism stays with the temporal work.

**Tiers (call 40), per view:**

| Tier | Veil | Spikes | Sun's closed-form veil | Target cost at the view's size |
| --- | --- | --- | --- | --- |
| `full` | Half-size base, 9 levels | Yes | Yes | Under 1.5 ms |
| `reduced` | Quarter-size base, 7 levels | Up to 64 sprites, 1 million pixels | Yes | Under 1 ms |
| `sources` | None | Up to 16 sprites | Yes | Under 0.3 ms |
| `off` | None | None | None | 0 |

`glareTier(adapter, pixels)`: a fallback adapter is `off`. Intel is `reduced`, and `sources` above 3.7 million pixels. Anything else is `full`, and `reduced` above 8.3 million pixels. These are starting values. Task 16's run on the owner's laptop replaces them. Nothing here has been measured on Intel, AMD or NVIDIA.

## Intel checks

These need the owner's laptop. The Mac can't measure them: its GPU is tile-based, and it has no D3D12 path. An agent can't run them. List them in the report at the end of Batch D, and don't call Task 16 done without the results.

Carry the branch to the laptop the usual way, at a clean commit, then in `packages/next`:

1. **`npx vite --host 127.0.0.1 --port 5196 --strictPort`,** then Chrome at `http://127.0.0.1:5196/spikes/gpu-check.html`. Record the adapter, architecture and driver version. §13.23 still lacks these.
2. **`http://127.0.0.1:5196/bench/observerCost.html?bench=1&runs=5`,** which needs no pack: it draws 530,851 synthetic stars with the sky's magnitude counts. It takes a few minutes on a slower GPU. Press "Copy results", and send the JSON. It covers quads, strips, cells by indirect draw, cells by the CPU path, each glare tier, and each stage.
3. **The same page with `&submission=direct`,** to see whether direct submission changes any result.
4. **Watch for device loss.** If the page reports one, stop, send the report, and don't retry. A hung shader resets the GPU for every app on the machine.
5. **`http://127.0.0.1:5196/spikes/observer.html`,** and look at glare at each tier beside the Mac's: does `reduced` look acceptable?
6. Optional, with a pack built on that machine: `npm run sky -- build`, then the same page with `?pack=local`.

What it decides: `glareTier`'s table; whether cells keep indirect draws on Intel or go to the CPU path; and whether strips still beat quads on an immediate-mode GPU, which the spike couldn't test. Compute splatting isn't in the page: at this count it lost on the M2, and it may turn on count and GPU, so it stays with the point pipeline's measurements.

## Review Focus

1. **The sun at awkward places:** just off screen, half behind a truss, at the Earth's limb from orbit, eclipsed, below the horizon, or in a view with no sky. The veil moves smoothly, with no pop, no NaN and no light through the Earth. With `background: "color"` there's no sun source. Tests: Tasks 12 and 13.
2. **A pack that's wrong:** a truncated binary, a count that doesn't match, a manifest with no `distributable`, non-finite values, a count over the cap, a 404, credits holding HTML. The sky keeps today's map, with one warning naming the file and field. Credits show as text. Tests: Tasks 4 and 7.
3. **Exposure at its limits with glare on:** EV100 −12 and 18, `{ scale: 1 }`, an eye just adapted from noon to night, or a look stage returning NaN. Nothing overflows fp16 into infinity, no NaN reaches the display, and the meter still reads. Tests: Tasks 2 and 13.
4. **Views that differ or change:** two views with different observers on one canvas, a stage added or removed while running, a canvas squeezed to 0 px, a view removed with a pack still uploading. Each view gets its own chain, its targets free, and no bind group is stale. Tests: Tasks 2, 4 and 15.
5. **The on-demand loop:** a sleeping engine wakes when an observer's value is edited in place. An idle scene with the eye, glare or a stage on goes to sleep, and a kernel or pack arriving asks for one tick. Tests: Tasks 1, 7 and 15.

---

## File structure

New files, by responsibility. Modified code is named by symbol in each task.

- **The observer:** `src/scene/observer.ts` (settings, presets, readout; no GPU types).
- **Stages:** `src/render/post/postStage.ts` (the public definition, validation), `src/render/post/chain.ts` (registering a chain in the graph), `src/render/post/astroCurve.ts`, `src/render/post/eyeLimit.ts`, `src/shaders/postStage.slang`.
- **The pack:** `src/atmosphere/skyPack.ts` (manifest, readers), `src/atmosphere/starCells.ts` (sort into cells; no GPU types), `scripts/vitePluginSkyPack.ts` (the build's refusal), `scripts/skyPack.mjs` (fetch and build), `scripts/skyPack/exr.mjs`, `peaks.mjs`, `calibrate.mjs`, `recipes.mjs`, `background.mjs`.
- **Glare:** `src/render/post/glare.ts` (tiers, settings to passes), `src/render/post/veilWeights.ts` (weights and the closed-form spread; no GPU types), `src/render/post/glareKernel.ts` (pupil to kernel, CPU), `src/shaders/glare.slang`.
- **UI:** `widgets/observerPanel.ts`, `examples/night-sky/` (with `DESIGN.md`).
- **Checks:** `spikes/observer.html`, `spikes/observer.ts`, `bench/observerCost.html`, `bench/observerCost.ts`.

---
