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

1. **`view.observer` replaces `view.exposure` and `view.toneMapping`, with no shim.** Nothing is released, and 5d and 5e haven't built on them yet. *Undo:* two getters.
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
28. **The eye's point limit is a `model` stage, not a star gain.** Where nothing was drawn (depth at the far plane), it fades what stands above its surroundings below a limit: magnitude 6 dark-adapted, brighter in proportion to the rods' threshold at the eye's adaptation. Only with the eye, and skipped above 30 cd/m² of adaptation. *Undo:* remove the stage.
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
41. **Glare's composite clamps the image at 10,000 and each sprite at 200, pre-exposed,** so 256 overlapping sprites can't pass fp16's 65,504 into infinity, and it replaces anything not finite with 0. All of those read as white. So glare can't reach the meter's old NaN problem by another route. *Undo:* two constants.
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
- **Scene data and rasterizer data stay apart:** `src/scene/observer.ts`, `src/scene/postStage.ts`, `src/atmosphere/skyPack.ts`, `src/atmosphere/starCells.ts`, `veilWeights.ts` and `glareKernel.ts` hold no GPU types, and `test/importBoundary.test.ts` says so. Don't add a renderer interface.
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
| 12 to 15 Glare | None while off | Pixels change wherever the veil reaches. A flat image doesn't change, since a pixel gives up only the light the veil spreads. A bright pixel falls by up to `share` in linear light, and what's near it rises. The meter's reading doesn't change |
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
| Uploads | n/a | 4 MB, or one face's level, per tick. Mips come from the pack or the worker, so no GPU mip pass runs | Call 22 |
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
5. **The on-demand loop:** a sleeping engine wakes when an observer's value is edited in place. An idle scene with the eye, glare or a stage on goes to sleep, and a kernel or pack arriving asks for one tick. Tests: Tasks 1, 4, 14 and 15.

---

## File structure

New files, by responsibility. Modified code is named by symbol in each task.

- **The observer:** `src/scene/observer.ts` (settings, presets, readout; no GPU types).
- **Stages:** `src/scene/postStage.ts` (the public definition and validation; plain data, no GPU types), `src/render/post/chain.ts` (registering a chain in the graph), `src/render/post/astroCurve.ts`, `src/render/post/eyeLimit.ts`, `src/shaders/postStage.slang`.
- **The pack:** `src/atmosphere/skyPack.ts` (manifest, readers), `src/atmosphere/starCells.ts` (sort into cells; no GPU types), `scripts/vitePluginSkyPack.ts` (the build's refusal), `scripts/skyPack.mjs` (fetch and build), `scripts/skyPack/exr.mjs`, `peaks.mjs`, `calibrate.mjs`, `recipes.mjs`, `background.mjs`.
- **Glare:** `src/render/post/glare.ts` (tiers, settings to passes), `src/render/post/veilWeights.ts` (weights and the closed-form spread; no GPU types), `src/render/post/glareKernel.ts` (pupil to kernel, CPU), `src/shaders/glare.slang`.
- **UI:** `widgets/observerPanel.ts`, `examples/night-sky/` (with `DESIGN.md`).
- **Checks:** `spikes/observer.html`, `spikes/observer.ts`, `bench/observerCost.html`, `bench/observerCost.ts`.

---

## Batch A: the observer

### Task 1: `view.observer` replaces the exposure settings

No picture changes. EV100 stays the unit.

**Files:**

- Create: `src/scene/observer.ts`, `test/observer.test.ts`
- Modify: `View` (`ViewOptions`, `exposure`, `toneMapping`, state, constructor), `updateExposure`, `adaptExposure`, the `meter`, `adaptation` and `present` passes, the on-demand fingerprint, the `Sky.write` call, `lights.ts`'s callers if they read the mode, `Viewer` (`ViewerOptions.exposure`, `setSplit`), `src/index.ts`, `examples/` (frames-explorer's `globe.ts` and `scenarios/stage.ts`, translucency, the slang playground), `bench/suite/` (`suite.ts`, `viewerHost.ts`, `Viewer.tsx`), `parity/*`, `handbook/src/apiMap.ts`, tests that set `exposure` (find them: `grep -rnE "\.exposure\b|exposure:|toneMapping" src widgets examples bench parity lab test`), `api/surface.txt`

**Interfaces:**

- Produces (author's calls 1 to 5), in `src/scene/observer.ts`, with no GPU types:
  - `Exposure`, `EYE`, `UNITLESS_EXPOSURE`, `DAYLIGHT_EXPOSURE`, `ev100ToScale`, `ToneMapping` move here, unchanged, and `src/index.ts` keeps exporting them;
  - `scaleToEv100(scale: number): number`, the inverse of `ev100ToScale`;
  - `interface PointSpread { core: number; wing?: { sigma: number; share: number } }`, in CSS pixels;
  - `interface ObserverSettings { exposure: Exposure; toneMapping: ToneMapping; pointSpread: PointSpread; glare: GlareSettings | null; stages: readonly PostStage[] }` (`GlareSettings`, `GlareTier` and `Aperture` are declared here, and used from Task 12: `{ tier: GlareTier | "auto"; veil: { share: number } | null; spikes: { aperture: Aperture; share: number; extent: number } | null }`, `extent` in degrees, `type GlareTier = "full" | "reduced" | "sources" | "off"`, `type Aperture = "round" | "vanes" | "hex" | "blades7"`; `PostStage` is a type import from Task 2, and `stages` is empty until then);
  - `eyeObserver(options?: { compensation?: number; speed?: number }): ObserverSettings`: exposure `{ eye: true, ... }`, core 0.85, glare null, no stages;
  - `cameraObserver(exposure: Exposure): ObserverSettings`: core 0.55, glare null, no stages;
  - `interface ObserverReadout { ev100: number | undefined; equivalent: boolean; preExposure: number; cones?: number; rods?: number }`;
  - `ViewOptions.observer?: Partial<ObserverSettings>`, over `cameraObserver({ ev100: 15 })`; `ViewOptions.exposure` and `.toneMapping` go;
  - `View.observer: ObserverSettings`: get and set, a watched copy as `viewport` is today. Writing a field, or a field of `exposure`, `pointSpread` or `glare`, in place wakes the loop and bumps `view.observerRevision`. `View.readout(): ObserverReadout`;
  - `View.exposureScale` stays, marked `@internal`. It's the pre-exposure, a matter of fp16's range. `ViewerOptions.observer` replaces `ViewerOptions.exposure`, default `eyeObserver()`.

- [ ] **Step 1: Write the failing test** (`test/observer.test.ts`, `fakeEngine`):
  - `"exposure" in view` and `"toneMapping" in view` are false;
  - the default view's `observer.exposure` is `{ ev100: 15 }`, tone mapping `pbrNeutral`, core 0.55, glare null;
  - `eyeObserver()`'s core is 0.85, and `eyeObserver({ compensation: 1 }).exposure.compensation` is 1;
  - each of `view.observer = …`, `view.observer.toneMapping = "agx"`, `view.observer.exposure.compensation = 1` calls `view.wake` once, and moves the on-demand fingerprint (Review Focus 5);
  - `updateExposure` gives the same numbers as before for `{ ev100: 15 }`, `{ scale: 1 }`, and an eye with adaptation set: 2.54 × 10⁻⁵, 1, and `eyeResponse`'s maximum;
  - readouts: `{ ev100: 15 }` reads 15, not equivalent; `{ scale: 1 }` reads `ev100` undefined; an eye adapted to 4,000 cd/m² reads 14.18 ± 0.01, equivalent, and at 10⁻⁴ cd/m² −4.04 ± 0.01, with `cones` and `rods` set;
  - the bytes the `present` pass writes to `frame.presentParams` for a daylight camera and an adapted eye equal numbers recorded in the test before the change;
  - `Viewer.setSplit`'s second view gets a separate copy of the observer: editing one doesn't touch the other.
- [ ] **Step 2: Run** `npx vitest run test/observer.test.ts` and confirm it fails.
- [ ] **Step 3: Implement.** Move the types, then the callers, in one commit; the compiler finds them. Use `view.observer.exposure` in every pass. In the playground, replace its own `scaleToEv100` with the public one.
- [ ] **Step 4: Run** the test, `test/exposureAdapt.test.ts`, `test/onDemandIdle.test.ts`, `test/frameLoopSleep.test.ts`, tsc. `npm run surface`.
- [ ] **Step 5: Commit** with "scene: one observer on a view: exposure and tone mapping move to it".

### Task 2: The post stage interface

**Files:**

- Create: `src/scene/postStage.ts`, `src/render/post/chain.ts`, `src/shaders/postStage.slang`, `test/postStage.test.ts`, `spikes/observer.html`, `spikes/observer.ts`
- Modify: `TextureDesc`, `FrameGraph`, `TexturePool`, `present.slang` (new entries only), the `present` pass and pipelines, `buildViewFrame`, `src/shaders/link/boundary.ts`, `src/index.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: Task 1's `ObserverSettings.stages`.
- Produces (author's calls 6 to 10):
  - `type StageSlot = "scene" | "exposed" | "display"`; `type StageKind = "physics" | "model" | "look"`; `type StageRead = "depth" | "ids"`;
  - `createPostStage(options: { name: string; slot: StageSlot; kind: StageKind; label: string; shader: string | ShaderUnit; reads?: readonly StageRead[]; uniforms?: Record<string, UniformDeclaration>; shadowGain?: number }): PostStage`; `class PostStage { readonly name; readonly slot; readonly kind; readonly label; enabled: boolean; readonly shadowGain: number; setUniform(name: string, value: number | readonly number[]): void }`. `shadowGain` is the largest slope near black, default 1;
  - `class PostStageError extends Error`, naming the stage and the field;
  - `POST_STAGE_BOUNDARY: Boundary`: requires `postStage(PostInput) -> vec4<f32>`; provides `postColor`, `postColorAt`, `postDepthAt`, `postIdAt`, and `PostInput { uv, pixel, size, preExposure, pixelAngle }`;
  - internal `interface GraphStage { name; slot; kind; label; register(graph: FrameGraph, io: ChainIo): void }`;
  - `chainOrder(stages): { scene: …; exposed: …; display: … }` and `chainSource(stages, index): number`, pure: the slots' order (stable by list position) and the latest enabled stage before `index`;
  - `observerShadowGain(settings: ObserverSettings): number`: the product of enabled `exposed` stages' gains;
  - `TextureDesc.mipLevelCount?: number`; `FrameGraph.mipView(handle, level): GPUTextureView`, created once per texture; the pool's key and `textureBytes` count mips;
  - `present.slang` entries `fsResponse` (scene light to exposed, with the eye's model when on) and `fsTone` (tone mapping, coverage and encoding). `fs` isn't edited.

- [ ] **Step 1: Write the failing test** (`test/postStage.test.ts`):
  - `createPostStage` refuses, naming the field: no `kind`, an unknown slot, an empty name, an unknown `reads` entry, and a shader that doesn't define `postStage` (a link diagnostic with its unit and line);
  - two stages of one name in a list are refused when the list is set, naming the name;
  - `chainOrder` keeps list order within a slot; `chainSource` skips disabled stages, and gives the slot's input with none;
  - with a `scene` stage and a `display` stage, the graph's `compile()` lists `meter` before `adaptation`, `adaptation` before `post.a`, `post.a` before `present`, and `post.b` after `present`; with none, the pass list is as before;
  - the meter's and adaptation's `reads` hold no stage's output;
  - a disabled stage's pass acquires no texture (count `allocator.acquire`), and with no stage the `present` pass binds `pipelines.present` with `fs`, not the split entries;
  - setting `view.observer.stages` to a new list rebuilds the view's graph once; setting the same list doesn't; the old stage targets are returned to the pool (Review Focus 4);
  - two views hold separate chains: enabling a stage on one leaves the other's pass list alone;
  - a canvas squeezed to 0 px wide with a stage on: no throw, no zero-size texture (Review Focus 4);
  - `FrameGraph`: a 5-level desc's bytes are 1.33 × the base's, within 1%; descs that differ only in mips don't share a bucket; `mipView` returns the same object twice;
  - `observerShadowGain` is 1 with no stage, and the product with two.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** Write the shader glue in `postStage.slang`; link at pipeline creation; a link diagnostic throws `PostStageError`. A stage's pipeline comes from the existing pipeline cache, keyed by its unit. `ids` and `depth` go in the pass's `reads`. Register the chain in `buildViewFrame`'s one registration function (§13.17). Rebuild the view's graph by the same path a resize takes.
- [ ] **Step 4: Run** the test, `npm run shaders`, `npm run shaders:check`, tsc. Read the Metal of `fsResponse` and `fsTone`.
- [ ] **Step 5: Browser check** (port 5195, `spikes/observer.html`, group `stages`): a stage that inverts red changes a known pixel; a no-op `exposed` stage differs from none by at most 1/255 on every pixel; a stage reading `depth` shows the terrain's outline; a stage returning NaN shows as 0 at that pixel only, since the chain's glue replaces a non-finite result (Review Focus 3); two views with different stages; a clean console. Stop the server.
- [ ] **Step 6: Commit** with "render: post stages: a first public interface, with slots, kinds and declared reads".

### Task 3: The astrophoto tone curve, labelled

A look, as a stage, over the whole image. It's built only on Task 2's public interface, which is part of what it proves.

**Files:**

- Create: `src/render/post/astroCurve.ts`, `test/astroCurve.test.ts`
- Modify: `src/index.ts`, `api/surface.txt`, `spikes/observer.ts`

**Interfaces:**

- Consumes: `createPostStage`.
- Produces:
  - `astroCurve(y: number, strength: number): number`, pure, the function the shader holds: on exposed luminance, `asinh(q × max(y − 0.004 s, 0)) / asinh(q)`, with `q = max(8 s, 0.001)`;
  - `astrophotoCurveStage(options?: { strength?: number }): PostStage`: slot `exposed`, kind `look`, label `"Astrophoto curve (a look)"`, default strength 1, `shadowGain` `q / asinh(q)`.

- [ ] **Step 1: Write the failing test:** `astroCurve(1, 1)` is 1; `astroCurve(0, 1)` is 0; below the black point (y 0.004, s 1) it's 0; it's monotonic over 1,000 samples; at strength 0 it's within 10⁻³ of `y`; `shadowGain` at strength 1 is 2.89 ± 0.01; the stage's kind is `look`, and its label contains "look"; the shader's source holds 8.0 and 0.004 (a source pin, as `test/meterGuard.test.ts` does), and scales RGB by one ratio, so hue holds before the saturation term; the stage's slot isn't `scene`, so it can't touch light before the response.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** WGSL text in the stage, from the spike's finding (asinh on luminance, black point, 1.4× saturation at full strength). The spike's stretch inside the sky shader isn't carried over.
- [ ] **Step 4: Run** the test and tsc. Browser check (port 5195, group `curve`): with the stage, an Earth pixel and a star pixel both change by what `astroCurve` says, within 2/255, with the meter's reading unchanged.
- [ ] **Step 5: Commit** with "render: the astrophoto curve, a labelled look over the whole image".
- [ ] **Step 6: Batch A's gates** (see "Batches and gates"). Expect no pixel difference in any suite. Report the `alloc` numbers.

## Batch B: the sky data pack

### Task 4: The pack's format and how the sky takes it

**Files:**

- Create: `src/atmosphere/skyPack.ts`, `test/skyPack.test.ts`
- Modify: `StarField`, `Sky.setStarField`, `Engine` (`setStarMap`, a new `setSkyPack`), the worker's `stars` handler, `api/surface.txt`

**Interfaces:**

- Produces (author's calls 12, 19, 20, 22), with no GPU types:
  - ```ts
    interface SkyPackManifest {
      format: 1;
      name: string;
      distributable: boolean; // false unless a person cleared it
      clearance?: { by: string; date: string; note: string };
      sources: ReadonlyArray<{
        name: string;
        url: string;
        credit: string;
        terms: string; // what its page says, with the date read
      }>;
      credits: readonly string[]; // shown by the Viewer, as text
      modelled: readonly string[]; // what is modelled rather than measured
      points: { file: string; count: number; floatsPerStar: 8 };
      background: {
        file: string;
        size: number;
        levels: number;
        meanLuminance: number; // cd/m²
        holdsFaintStars: boolean;
      };
      calibration?: Record<string, number>;
    }
    ```
  - `parseManifest(json: unknown): SkyPackManifest`: a missing or non-boolean `distributable` reads as false, with a note; anything else wrong throws `SkyPackError` naming the field; a count over `MAX_PACK_STARS` (4,000,000), a size that isn't a power of two up to 4,096, or more levels than the size allows is refused;
  - `readPoints(bytes: ArrayBuffer, manifest): Float32Array` and `readBackground(bytes, manifest): Float32Array[][]`, by face then level: check the magic, the header and the exact length; refuse non-finite values, naming the file and the star's index;
  - `isPackBinary(bytes: Uint8Array): boolean` (used by Task 5);
  - `StarField` gains `backgroundLevels: Float32Array[][]` in place of `background`, plus `holdsFaintStars: boolean` and `meanBackground: number`. Today's map gets a CPU box filter in the worker, `holdsFaintStars` false, and mean 0, so it uses no new light;
  - `Engine.setSkyPack(url: string | URL | null): Promise<SkyPackManifest | undefined>`: reads it in the worker. On any failure it warns once, naming the file and the field, and leaves what's drawn. `null` goes back to what `setStarMap` last set;
  - `Sky.setStarField` starts a sliced upload; `Sky.advanceUpload(): boolean` writes 4 MB of points or one face's level per tick, called from the tick; bind groups swap when it's complete, and the old field draws until then; a new `setStarField` during an upload destroys the part made;
  - **Point file:** 32-byte header: `CSKYPTS1`, count u32, floats-per-star u32, zeros; then little-endian float32, brightest first. **Background file:** `CSKYBG01`, size u32, faces u32 = 6, levels u32, zeros; then half floats, RGBA, by face, then level.

- [ ] **Step 1: Write the failing test** (`test/skyPack.test.ts`, synthetic bytes only, built in the test):
  - a good manifest round-trips, and one with no `distributable` reads false (Review Focus 2);
  - each of these is refused, naming its field or file: a truncated `points.bin`, a count one off, a NaN at star 7, a bad magic, a count of 5,000,000, a size of 100, and a `format` of 2;
  - with a 404 or a refused pack, `setSkyPack` resolves undefined, warns once, and `sky`'s star buffer is the same object (Review Focus 2);
  - uploading a 20 MB field takes at least 5 ticks' `writeBuffer` calls, none over 4 MB, and the bind group changes only on the last;
  - `setSkyPack` during an upload: the first field's partial buffer is destroyed, and the second completes; a view removed during an upload: no throw (Review Focus 4);
  - a pack arriving asks the on-demand loop for one tick, and the loop then sleeps (Review Focus 5);
  - `setStarMap` still gives today's field: `test/stars.test.ts` passes, with its first level's numbers the same as today's `background`;
  - no file named in this task imports a GPU type (`test/importBoundary.test.ts`).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** The manifest and points come over `workers.request`, as transferables. Don't touch drawing yet: until Task 8, a pack's stars draw with today's quads.
- [ ] **Step 4: Run** the test, `test/stars.test.ts`, `test/sky.test.ts` and tsc.
- [ ] **Step 5: Commit** with "sky: a source-neutral data pack: format, checks and sliced uploads".

### Task 5: Builds refuse an uncleared pack

**Files:**

- Create: `scripts/vitePluginSkyPack.ts`, `test/skyPackGuard.test.ts`
- Modify: `vite.config.ts`, `vite.lib.config.ts`, `handbook/vite.config.ts`, `scripts/checkBundle.mjs`

**Interfaces:**

- Consumes: `parseManifest`, `isPackBinary`.
- Produces (author's call 19):
  - `skyPackGuard(): Plugin`, with `generateBundle`: for each emitted asset, a JSON asset holding `format` and `points` and `background` is taken as a manifest, and any asset `isPackBinary` passes is a pack file. It throws unless a manifest in the bundle reads `distributable: true` with a complete `clearance`, and it names the file, the pack and §13.29's rule. A binary with no manifest beside it counts as uncleared. It's in the main, worker and handbook plugin lists;
  - `skyPackDevRoute(): Plugin`, with `apply: "serve"`: serves `/sky-pack/manifest.json`, `points.bin` and `background.bin` from the store's chosen pack, by those three fixed names only. No part of the URL reaches a path. Only `vite.config.ts` has it.

- [ ] **Step 1: Write the failing test** (`test/skyPackGuard.test.ts`):
  - the plugin's `generateBundle`, with a fake bundle, refuses: an uncleared manifest; a manifest with no flag; `distributable: true` with no `clearance`; `points.bin` renamed `x.dat` with no manifest; the same with `distributable` false in a JSON asset of another name. Each error names the file. It passes a bundle with no pack, and a cleared fixture;
  - `vite.config.ts`, `vite.lib.config.ts` and `handbook/vite.config.ts` each hold `skyPackGuard()`, in their main and worker plugins where they have both (a source pin), and a detector shown to flag a config without it;
  - **repository guard:** of `git ls-files packages/next`, no file starts with a pack magic, and no JSON holds the manifest's shape, skipping none but this test's own in-memory fixtures; a detector shown to flag a planted buffer;
  - the dev route's handler: `/sky-pack/../../secret` and `/sky-pack/other.bin` give 404, and it reads no file outside the store (the fake `fs` records paths);
  - the route isn't in the build: `apply` is `"serve"`.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** In `scripts/checkBundle.mjs`, add a third build: a page that imports a synthetic uncleared pack by `?url` must fail with the plugin's message, and the same page without it must pass.
- [ ] **Step 4: Run** the test, tsc, and `npm run check:bundle`.
- [ ] **Step 5: Commit** with "build: refuse a sky pack that isn't cleared, with a guard on the repository".

### Task 6: The script that builds a pack locally

**Files:**

- Create: `scripts/skyPack.mjs`, `scripts/skyPack/exr.mjs`, `peaks.mjs`, `calibrate.mjs`, `background.mjs`, `recipes.mjs`, `test/skyPackBuild.test.ts`, `test/data/skyPack.test.ts`
- Modify: `package.json` (`"sky": "node scripts/skyPack.mjs"`), README's "Setup"

**Interfaces:**

- Consumes: `verifiedDownload`; `magnitudeOfRank`'s table for the check; Task 4's formats.
- Produces (author's calls 13 to 17, 21):
  - `npm run sky -- fetch`, `build [--recipe id] [--background 1024|2048] [--catalog file --allow-unsettled-terms]`, `info`. Into `SKY_DATA_DIR`, default `~/.cesium-bench/sky`. It refuses an output inside any git worktree;
  - `readExr(bytes): { width; height; channels: Record<string, Float32Array> }`: scanline, half or float, ZIP compression (`compression` 3, as the NASA files use; checked for this plan). Others are refused, naming the compression. All sizes are checked before allocating, and a width or height over 32,768 is refused;
  - `findPeaks(luminance, width, height): Peak[]`: local maxima with the window stretched in x with latitude; flat tops merged to one (clipped discs); a centroid per peak, in RA and Dec; threshold 0.0035; findings from the spike's `c_points.py`, rewritten without its dependencies;
  - `fitFluxCurve(pairs: { flux; magnitude }[]): (flux) => magnitude`: monotonic and piecewise linear, by binned medians;
  - `mergeHybrid(catalog, mapStars, split = 7): Star[]`: catalog stars at the split or brighter; map stars below it that match no catalog star within 2 arcminutes; brightest first;
  - `starColor(bv: number): [r, g, b]`, luminance 1: Ballesteros 2012's temperature, a blackbody through the CIE functions;
  - `buildBackground(layer, size, levels)`: equirectangular to a cube, with a box filter for mips; absolute level from the fitted magnitude-0 flux, with `meanLuminance` recorded;
  - `RECIPES`: `"svs4851-hyg41"` is the default. Each source has a URL, SHA-256, size, credit, and `terms` in the words of `Star data licenses.md`, with its date. Every recipe sets `distributable: false`. No code path writes true or `clearance`. Gaia and Hipparcos have no recipe (call 15).

- [ ] **Step 1: Write the failing test** (`test/skyPackBuild.test.ts`, all fixtures synthetic, made in the test; injected `fetch`, no network):
  - an EXR written by the test (ZIP, half float, 3 channels) reads back within half-float rounding; a PIZ header is refused by name; a claimed 100,000 × 100,000 is refused before allocating;
  - `findPeaks` finds Gaussians placed at known RA and Dec within 0.3 texels; a flat-topped disc counts once; a disc stretched in x at Dec 85° counts once, while two peaks 3 texels apart at the equator stay two; a star on the RA seam counts once;
  - `fitFluxCurve` recovers a known non-linear curve within 0.05 magnitudes (accuracy against a truth the test chose), and is monotonic with noisy pairs;
  - `mergeHybrid`: a bright star in both comes from the catalog only; a faint one in the map stays; a catalog star at magnitude 8 isn't used; output is brightest first;
  - `starColor`: B−V 1.85 is redder than B−V −0.03, luminance 1 within 10⁻⁶;
  - `build` on a tiny synthetic source: its output passes `parseManifest`, `readPoints` and `readBackground`; `distributable` is false, and the sources and credits are listed; a run with the output inside the repository is refused; `--catalog` without `--allow-unsettled-terms` is refused, naming the flag, and with it the source shows in the manifest as supplied locally;
  - `RECIPES`: every recipe's flag is false; no recipe's URL holds `gea.esac.esa.int`, `cosmos.esa.int` or `cds.unistra.fr`; every source has `terms` with a date.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** The URLs come from NASA SVS 4851's page and HYG's repository. Read each page again before writing its `terms`: the licence report warns that its quotes are pointers. If `scratchpad/star-spike-data/` still holds the files, take the SHA-256 and sizes from them; otherwise pin them on the first fetch and say so in the commit. Treat downloads as untrusted: `verifiedDownload`, and the reader's checks.
- [ ] **Step 4: Run** the test and tsc.
- [ ] **Step 5: A real run on this machine** (it fetches about 300 MB; a heavy job, so run it when nothing else is measuring): `npm run sky -- fetch`, `npm run sky -- build`, then `SKY_DATA=1 npx vitest run test/data/skyPack.test.ts`. That data test checks: between 450,000 and 700,000 stars; counts brighter than magnitude 8 within 15% of Allen's 41,000, and 9 within 15% of 120,000; Sirius, Canopus and Arcturus within 0.1 magnitudes of −1.46, −0.74 and −0.05; the mean background between 0.5 and 2.5 × 10⁻⁴ cd/m², since the spike's level is good to maybe a factor of 2. Those are published facts, and the test holds no pack data. These counts agree with what the calibration used, so they are a check of the build, not independent proof.
- [ ] **Step 6: Commit** with "scripts: build a local sky pack, never distributable, from fetched sources".

### Task 7: The Viewer takes a pack and shows its credits

**Files:**

- Modify: `Viewer` (`ViewerOptions`, `credits()`), `widgets/credits.ts` if it needs it, `test/viewerCredits.test.ts`, `spikes/observer.ts`, `api/surface.txt`

**Interfaces:**

- Consumes: `Engine.setSkyPack`, `SkyPackManifest`.
- Produces: `ViewerOptions.skyPack?: string | URL`; `Viewer.setSkyPack(url | null): Promise<SkyPackManifest | undefined>`; `Viewer.credits()` lists the manifest's `credits`, on screen rather than behind "Data attribution", while the pack draws. Today's map adds no credit line, as now. An uncleared pack warns once, naming the pack (author's call 20).

- [ ] **Step 1: Write the failing test** (`test/viewerCredits.test.ts`): with a synthetic pack, `credits().credits` holds each manifest credit, and the on-screen bar's text holds them; `<img src=x onerror=…>` in a credit shows as text, with no element made (Review Focus 2); after `setSkyPack(null)`, or `stars: false`, they're gone; a failed pack leaves today's map, no credit, and one warning; an uncleared pack warns once across two renders; with no `skyPack`, a Viewer makes no new request and `credits()` is as it was.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** Credits are text nodes, and they don't go through the HTML attribution parser.
- [ ] **Step 4: Run** the test, `test/libraryWidgets.test.ts` and tsc.
- [ ] **Step 5: Commit** with "widgets: the Viewer takes a sky pack and shows its credits".
- [ ] **Step 6: Batch B's gates.** Confirm a library build and a handbook build hold no pack file: `grep -rl CSKY dist-lib` and the handbook's output are empty. Commit no output.

## Batch C: stars and fudges

### Task 8: Strips and the observer's point spread

**Files:**

- Create: `test/starDraw.test.ts`
- Modify: `sky.slang` (`Sky`, `starVertex`, `starFragment`), `Sky.ts` (`SKY_SIZE`, `write`, the `stars` pipeline, `encodeStars`), `test/sky.test.ts`

**Interfaces:**

- Consumes: `observer.pointSpread`.
- Produces (author's calls 23, 24):
  - `Sky` uniform fields `starCore`, `starWing`, `starWingShare`, in CSS pixels, as `starPixel` scales them. `STAR_CORE`, `STAR_HALO` and `STAR_HALO_SHARE` go;
  - `starRadius(spread: PointSpread, brightest: number, pixelRatio: number): number`, pure, and the same rule in the vertex shader: at least 3.5 σ of the core, plus the wing's reach where it's on, at most 64 px;
  - `starVertex` takes `SV_VertexID` 0 to 3 for a strip, `pass.draw(4, count)`.

- [ ] **Step 1: Write the failing test** (`test/starDraw.test.ts`): a port of the pixel-integrated Gaussian, summed over `starRadius`'s footprint, holds at least 0.999 of the star's light for σ 0.55 and 0.85 at 20 subpixel offsets; with a wing of share 0.05, its sum is still 1 within 0.001; the centered peak shares are 0.354 at σ 0.6, 0.197 at σ 0.85 and 0.405 at σ 0.55; the shader's source has no `STAR_HALO` and no six-corner array; `encodeStars` calls `draw(4, n)`; `Sky.write` puts the observer's values in the uniform, and setting `pointSpread` wakes the view.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** `npm run shaders`, then read the Metal of `starVertex` and `starFragment`.
- [ ] **Step 4: Run** the test, `test/sky.test.ts`, tsc.
- [ ] **Step 5: Browser check** (port 5195, group `points`): one synthetic star at a known place. Its summed light in `readHdr` is the same within 1% for σ 0.55, σ 0.85 and today's spread, at both pixel ratios. With σ held at today's and the wing on, strips and today's quads give no differing pixel. Record the star time beside the spike's 2.49 ms.
- [ ] **Step 6: Commit** with "sky: strips, and the observer's point spread in place of a fixed halo". State Task 8's expected difference.

### Task 9: Sky cells, culled in compute

**Files:**

- Create: `src/atmosphere/starCells.ts`, `test/starCells.test.ts`
- Modify: `sky.slang` (`starCull`), `Sky.ts` (`SkyView`, `writeStars`, `encodeStars`), the worker's star handling, the pipelines' layouts, `test/seams.test.ts`

**Interfaces:**

- Consumes: Task 8's `starRadius`; `Capabilities.indirectFirstInstance`; `World.submission`.
- Produces (author's calls 25, 26):
  - `CELLS_PER_SIDE = 8`; `buildStarCells(points: Float32Array, count: number): { points: Float32Array; cells: StarCell[]; table: Float32Array }`: a stable sort by cube-face cell, so each cell stays brightest first; `StarCell { center: [x, y, z]; sinRadius: number; first: number; count: number }`. Pure, in the worker, for any field;
  - `cullCell(cell: StarCell, planes, minIlluminance, illuminance: Float32Array): number`, the number of stars to draw: the plain function the shader mirrors, with a binary search of at most 24 steps;
  - `starCullInputs(forward, right, up, tanX, tanY, size, exposure, rows, shadowGain): { planes; minIlluminance }`. The tangents come from the sky's uniform values, so no new `.fovy` read is added. The planes are in ICRF, with a margin of the largest `starRadius` in angle. `minIlluminance` uses the smallest pixel solid angle in the view, at its corner;
  - `SkyView.starUniform`, `SkyView.starArgs` (16 bytes a cell) and `Sky.writeStars(view: SkyView, rows)`, per view, since 5c needs a per-view rotation anyway;
  - `starSubmission(mode, capabilities): "indirect" | "direct"`. With `"direct"`, `Sky` runs `cullCell` in TypeScript from a kept `Float32Array` of illuminance (2 MB at this count), and issues `pass.draw(4, n, 0, first)`, skipping empty cells.

- [ ] **Step 1: Write the failing test** (`test/starCells.test.ts`):
  - every star lands in exactly one cell, every cell's stars are brightest first, and each lies inside its cell's cone;
  - **no star that should show is dropped:** for 200 random views over 100,000 synthetic stars, every star inside the view whose shown value passes the threshold is in its cell's drawn prefix (this fails if the corner's solid angle or the margin is wrong);
  - a wide view draws under 20% of a uniform synthetic sky, and a 5° view under 1%;
  - a bright star just off screen, within its radius, stays drawn;
  - `cullCell` never returns more than `count`, and takes at most 24 steps with 4 million stars;
  - `starSubmission` is `"direct"` with `World.submission` direct, or without `indirectFirstInstance`; on that path the fake pass records `draw`, with no `drawIndirect`;
  - two views with different `rows` get different arguments, and neither view's write touches the other's;
  - the seam: `test/seams.test.ts`'s draw detector allows `drawIndirect` in `Sky.ts`'s star path only, with a reason, and still flags a planted one elsewhere;
  - a shader source pin: `starCull`'s bound is the constant 24, and its index is clamped.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** One dispatch of 6 workgroups before the star pass. Read the Metal of `starCull`.
- [ ] **Step 4: Run** the test, `test/seams.test.ts`, `test/sky.test.ts`, tsc.
- [ ] **Step 5: Browser check** (port 5195, group `cells`): for five views, compute's arguments, read back, match `cullCell`'s within 0.1%; the image with cells against without differs by at most 1/255, in under 0.1% of pixels; record cells-plus-strips time beside the spike's 0.66 ms, and the render-call CPU beside its 0.2 to 0.5 ms.
- [ ] **Step 6: Commit** with "sky: stars in sky cells, culled in compute, with a CPU path".

### Task 10: The hybrid sky on screen

**Files:**

- Modify: `sky.slang` (`starLight`), `Sky.ts` (the background's level), `spikes/observer.ts`, `test/starDraw.test.ts`

**Interfaces:**

- Consumes: Tasks 4 and 6 to 9.
- Produces (author's call 18): `backgroundLevel(tanY: number, levels: number): number`, pure, in the `Sky` uniform as `starBackgroundLevel`: 0 at 30° of vertical field of view and wider, rising with `log2` as the field narrows, and continuous, at most `levels − 1`. The background's sampler gets a linear mip filter.

- [ ] **Step 1: Write the failing test:** `backgroundLevel` is 0 at 60° and 30°, 1 at 15°, 2 at 7.5°, capped at `levels − 1`, finite at a `tanY` of 0, and it never jumps by over 0.01 between fields of view 0.1° apart; the shader's source has `SampleLevel(starSampler, d, sky.starBackgroundLevel)`, and today's `0.0` is gone.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and tsc.
- [ ] **Step 5: Browser check with a real pack** (port 5195, group `pack`, `?pack=local`; if the store has none, stop and say so; stills stay out of the repository): a view of the winter sky shows Sirius, Rigel and Betelgeuse's summed light in `readHdr` in the ratios of their magnitudes within 5%; Betelgeuse's color against Rigel's holds, redder against bluer; no even spacing shows; the Milky Way core has no blocks at 1024²; a slow zoom from 60° to 5° doesn't pop. Record the timings. The owner looks at these at the end of Batch C.
- [ ] **Step 6: Commit** with "sky: the background's level follows the field of view, and the hybrid pack draws".

### Task 11: Removing the fudges

**Files:**

- Create: `src/render/post/eyeLimit.ts`, `test/noSceneGains.test.ts`, `test/eyeLimit.test.ts`
- Modify: `EYE_STARS_EV100`'s definition and the call that passes it, `Sky.write`, `sky.slang` (`Sky`, `starExposure`, `starVertex`, `nightGlow`, `skyStarsFragment`, `skyFromTableFragment`), `scene/eye.ts`, `eyeObserver`, the environment's `Sky` faces, `test/exposureAdapt.test.ts`, `test/meterEmission.test.ts`, the `Viewer` docs on `Exposure` "eye", which say it sees stars "even where the scene is bright"

**Interfaces:**

- Consumes: Task 2, Task 4's `holdsFaintStars` and `meanBackground`, Task 9's `shadowGain` input.
- Produces (author's calls 27 to 30):
  - `EYE_STARS_EV100`, `Sky.write`'s `starExposure` parameter, the uniform's field and the shader's `starExposure` function are gone. Stars take `sky.exposure`, like everything else;
  - `eyePointLimit(cones: number, rods: number): number`, lux, in `eye.ts`: magnitude 6's illuminance × `max(1, rodThreshold(rods) / rodThreshold(dark))`, with `dark` at 10⁻⁴ cd/m² of photopic adaptation. Tuned by nothing but the model's own threshold;
  - `eyeLimitStage(): PostStage`: slot `scene`, kind `model`, label `"The eye's point limit (a model)"`, reads `depth`. Where depth is at the far plane, it compares each pixel with the darkest of a ring of 8 taps at about 6 px, turns the excess into illuminance at this pixel's solid angle and the observer's core share, and fades it over 1 magnitude around the limit. Other pixels pass through;
  - `eyeObserver`'s `pointLimit?: boolean`, default true; the chain enables it only with the eye, a drawn sky and adaptation under 30 cd/m²;
  - the uniform field `faintStars: float3`, in place of `STARLIGHT` in `nightGlow`: `STARLIGHT` with today's map; half of it with `holdsFaintStars`; in the environment faces only, plus `meanBackground`. `STARLIGHT`'s constant stays in TypeScript, with a comment that the half is a guess at the zodiacal light's share.

**What changes.** The eye only, and only where the sky behind a star is dark. A camera and a plain scale see no change from the rule's removal.

| Eye adapted to (cd/m²) | Example | Pre-exposure | Stars fall by |
| --- | --- | --- | --- |
| 4,000 | The sunlit Earth from orbit | 4.5 × 10⁻⁵ | 17.2 stops: gone |
| 30 | Heavy overcast, or a bright dusk | 3.9 × 10⁻³ | 10.7 stops: gone |
| 1 | Dusk | 0.064 | 6.7 stops |
| 0.03 | Full moon | 1.5 | 2.2 stops |
| 0.005 | Bright night | 5.4 | 0.3 stops |
| 0.003 and darker | A moonless night | 7.0 and up | None |

The examples are rough, from general knowledge. The numbers come from `eyeResponse`. **Separately,** the point limit takes away stars fainter than its limit: at 10⁻⁴ cd/m² the 86,000-star map falls to the roughly 5,000 stars to magnitude 6.

- [ ] **Step 1: Write the failing tests:**
  - `test/noSceneGains.test.ts` (the owner's rule as a seam): with `fakeEngine`, render a tick and record every byte of the sky's uniform and the view block; change `toneMapping`, `glare`, or add a look stage: not one byte changes. Change `pointSpread`: only `starCore`, `starWing` and `starWingShare` change. Change `exposure` to another EV100: only the exposure field and what's documented as pre-exposed changes. No `.slang` file under `src/atmosphere` or `src/shaders` holds `starExposure`, `EYE_STARS` or a uniform named with `gain` or `stretch` (a detector shown to flag a planted one);
  - `test/eyeLimit.test.ts`: `eyePointLimit` at 10⁻⁴ is magnitude 6.0 ± 0.05; at 10⁻³, 5.4; at 0.03, 2.7; at 1, −1.2; at 30, −4.8, each ± 0.1 (computed for this plan; a change in the eye's thresholds shows here); the stage's kind is `model`, and it reads `depth`; the shader passes through where depth isn't at the far plane (a source pin); the ring is 8 taps, unrolled; the chain has it with the eye at night, and not with a camera, at 4,000 cd/m², or with `background: "color"`;
  - the `Sky` uniform's `faintStars` equals `STARLIGHT` with today's map, half with a deep pack in the view's uniform, and half plus `meanBackground` in an environment face; the view block's night light doesn't change with today's map;
  - the star cull's threshold: a look stage with `shadowGain` 2.89 draws more stars than none; at EV100 15 on a 60° view, with the rule gone, at most the two brightest stars of a synthetic sky pass it (a shown value of 10⁻⁴ of white needs about magnitude −0.8).
- [ ] **Step 2: Run** and confirm they fail.
- [ ] **Step 3: Implement.** `npm run shaders`. Read the Metal of `skyStarsFragment`, `skyFromTableFragment` and the eye limit.
- [ ] **Step 4: Run** the tests, `test/sky.test.ts`, `test/exposureAdapt.test.ts`, `test/meterEmission.test.ts`, `test/frameSky.test.ts`, tsc. If a meter reading moves, explain it: star pixels were metered at the boosted value.
- [ ] **Step 5: Browser check** (port 5195, group `fudges`). Read `view.readout()` as text, and take stills only for judgement:
  - the table's rows, by scene: stars gone beside the sunlit Earth from orbit; present on a moonless night, with terrain pixels unchanged by the limit;
  - **twilight against naked-eye limits (§13.29):** with the sun at −6°, −12° and −18° and a real pack or today's map, read the faintest of a list of named stars that shows above the sky at the zenith. Record the table in the commit. Published rule-of-thumb limits (from general knowledge; check them before quoting) are about magnitude 1, 3 to 4, and 6. Don't tune anything to match. A wide miss goes to the owner.
- [ ] **Step 6: Commit** with "sky: stars take the view's exposure: remove the star exposure rule, and split STARLIGHT". State the table in the message.
- [ ] **Step 7: Batch C's gates.** Then the owner looks: Eye and Camera on Orion, the core, the winter sky and a limb at night, and bright stars' color under the eye (ruling 5).

## Batch D: glare

### Task 12: The light list and glare's sources

**Files:**

- Create: `src/scene/lightList.ts`, `src/render/post/glare.ts`, `src/shaders/glare.slang`, `test/glareSources.test.ts`
- Modify: `Sky.ts` (keeping the 2,048 brightest stars, `glareStars`), `buildViewFrame`

**Interfaces:**

- Consumes: `observer.glare`, the sky's uniform and `sunLight` table, the view's multisampled depth.
- Produces (author's calls 31, 32, 36 to 38):
  - `lightListFor(view): { sun: boolean; stars: number }`: this first version of §13.32's point 3 names what's in the list: the sun where the view draws it (`sunDisk`, with an atmosphere), and the star field's bright end. A comment says 5e adds the Moon and planets;
  - constants `GLARE_SOURCES = 256`, `GLARE_BRIGHT_STARS = 2048`, `GLARE_DISC_TAPS = 32`, `GLARE_SPRITE_PIXELS = 4_000_000`, `GLARE_SPRITE_MAX_RADIUS = 512`, each with a source pin against the shader's;
  - kernel `glareSources`: `[numthreads(1, 1, 1)]`, writing a per-view storage buffer of a header and `GlareSource { float2 pixel; float radius; float visibility; float3 light; float kind }`, in lux through the air. Record 0 is always the sun, with visibility 0 if there's none;
  - `discTaps(n: number): [x, y][]`: a Vogel spiral in the unit disc, as a constant table, pure;
  - `tapVisible`: depth at sample 0 at the far plane, off screen counts as visible, then the ray misses the body's ellipsoid (the same scaled-sphere test as `marchedSky`), then it isn't in the Moon's disc (`sky.moon`, `sky.moonSize`);
  - the sun's `light` is the `sunLight` table's value at the camera, by the mapping `sunlightThroughAir` uses, shared rather than copied; with `lighting.sunIlluminance` set to a number, that number. A star's is its illuminance times the table's color at its direction over the sun's outside the air;
  - a star becomes a source only if on screen within its radius, with visibility 1 from one tap, and bright enough at this exposure that its sprite shows: the `radii` table, from Task 14. Until then the table is empty, so only the sun is a source. The walk stops at 256 sources or the pixel budget, and the brightest come first, since `glareStars` is brightest first.

- [ ] **Step 1: Write the failing test** (`test/glareSources.test.ts`). The fake GPU runs no shader, so ports of the rules are tested, with source pins on the constants, as `test/meterGuard.test.ts` does. A browser step tests the shader itself.
  - `discTaps(32)`: all in the unit disc, with a centroid within 0.05 of the origin, and an even spread: half-disc coverage is within 2 taps of 16 at 8 angles;
  - a port of `tapVisible`: a half-covered disc is 0.5 ± 0.07; two-disc overlap against the analytic eclipse fraction is within 0.05 at 10 separations; every tap off screen is 1; a sun below the horizon from the ground is 0 by the ellipsoid (Review Focus 1);
  - moving the sun's disc across a limb in 64 steps, no step changes visibility by over 2/32 (no pop);
  - the walk: with 3,000 bright stars it stops at 256 and keeps the 256 brightest; with four huge sprites it stops at the pixel budget; with a test table, a star with a shown value below its cut isn't a source;
  - `lightListFor`: no sun with `background: "color"` or `sunDisk` false; zero stars with no field;
  - glare off: no pass acquires anything, and the buffer isn't written;
  - the kernel is registered after `adaptation`, and it reads depth;
  - no new `.fovy` read (5d's coming seam): the tangents come from the sky's uniform.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** `npm run shaders`. Read the Metal of `glareSources`, noting the guard on the star walk.
- [ ] **Step 4: Run** the test and tsc.
- [ ] **Step 5: Browser check** (port 5195, group `sources`, reading the buffer back): a box half across the sun gives 0.5 ± 0.07; a real solar eclipse date gives the overlap; the sun's color at elevation 2° against 45° matches the `sunLight` table within 1%; a sun just off screen reads 1; the Earth's limb from orbit goes to 0 smoothly.
- [ ] **Step 6: Commit** with "render: glare's light list: the sun from its true illuminance, and the bright stars".

### Task 13: The veil

**Files:**

- Create: `src/render/post/veilWeights.ts`, `test/veilWeights.test.ts`
- Modify: `glare.ts`, `glare.slang`, the `present` pass's source, `View.readHdr`, `spikes/observer.ts`

**Interfaces:**

- Consumes: `FrameGraph.mipView`, Task 12's sun record.
- Produces (author's calls 32 to 35, 41):
  - `VEIL_LEVELS = 9`; `veilWeights(pixelAngle: number, levels: number, basePixels: number): Float32Array`: each level's share of the energy, equal per octave of angle from 0.1° to 60°. A level's σ is `basePixels × 2^i` pixels, or that times `pixelAngle` in angle. Octaves finer than level 0's go to level 0, and octaves wider than the top level are lost. Zeros, not NaN, for a `pixelAngle` that isn't positive and finite;
  - `veilSpread(r: number, weights, basePixels): number`: per pixel², the closed form that the pyramid amounts to for a point, `Σ wᵢ exp(−r² / 2σᵢ²) / (2π σᵢ²)`, the same in `glare.slang`;
  - `sunVeil(pixelOffset, pixelSolidAngle, light, visibility, share, weights, basePixels, z): [r, g, b]`, pure, with a fade from z 0.15 to 0.05, so the sun behind the camera adds nothing;
  - **Passes:** `glare.input` writes level 0 of `glare.pyramid` (half size, `rgba16float`, mips): the image, clamped to 10,000, with pixels inside the sun's disc as zero; `glare.down.N`, 4 bilinear taps; `glare.veil`, half size: `share × Σ wᵢ bicubic(level i)` plus `sunVeil`; `glare.composite`, into `glare.image` (full size, `rgba16float`): `min(image, 10000) × (1 − share Σwᵢ) + veil`, with anything not finite replaced by 0;
  - the `present` pass reads `glare.image` when glare ran, by `get()`, so nothing allocates when it's off; the eye's adaptation map still reads `resolved`;
  - `View.readHdr(options?: { after?: "glare" })`, for checks; the default stays before glare.

- [ ] **Step 1: Write the failing test** (`test/veilWeights.test.ts`):
  - **the falloff:** `veilSpread`'s log-log slope is −2 ± 0.15 from 1° to 20° at a 60° view on 1,440 px (halved weights, kept in the test as a control, read −3, so the check can tell them apart);
  - weights sum to at most 1, and exactly to the octaves covered at a 60° view;
  - the same star's veil at 1° from it is within 15% between 60° and 20° fields of view, at the same pixel count;
  - `pixelAngle` 0 or NaN gives zeros (5d's orthographic view and a 0 px canvas);
  - `sunVeil`: linear in `light` and `visibility`; continuous as the sun moves off screen, with no step over 1% across the edge (Review Focus 1); zero behind the camera; fine at `light` of 150,000 lux, far beyond fp16, since only the result is written;
  - energy: a port of composite on a flat image gives the image back within 10⁻⁶; on a point in the middle of a 1,024² grid, input plus veil holds the input's total within 2%, less what's outside the view;
  - fp16: `10000 + 256 × 200 < 65504` as constants, pinned to the shader's; a port of the composite on infinity and NaN gives finite values (Review Focus 3);
  - the graph: `meter` and `adaptation` come before `glare.input`, and neither reads a glare output; with glare off, no glare texture is acquired, and `present` binds `resolved`; the pyramid's desc has 9 mips at half size, and per-mip views are made once;
  - the sun's mask: a port tests a pixel inside the disc's cosine as zero, and outside as itself.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** `[ForceUnroll]` on the levels. Read the Metal of the veil and the composite.
- [ ] **Step 4: Run** the test and tsc.
- [ ] **Step 5: Browser check** (port 5195, group `veil`, `readHdr({ after: "glare" })`):
  - a synthetic star: the veil's profile against `veilSpread` is within 10% from 1° to 20°;
  - the sun at EV100 −12, 5, 15 and 18, and `{ scale: 1 }`: no NaN, no infinity, no pixel below 0; the display's probes are clean (Review Focus 3);
  - the meter's reading is the same with glare on and off, to 4 decimals (it reads earlier in the tick);
  - a sun behind a truss, then at the limb, then just off screen: no pop, by the differences between ticks across a scripted move;
  - time beside the spike's 2.75 ms; the target is under 1.5 ms on the M2.
- [ ] **Step 6: Commit** with "render: the veil: equal energy per octave, and the sun in closed form".

### Task 14: Spike sprites from a precomputed kernel

**Files:**

- Create: `src/render/post/glareKernel.ts`, `test/glareKernel.test.ts`
- Modify: `glare.ts`, `glare.slang`, the worker, `spikes/observer.ts`

**Interfaces:**

- Consumes: Task 12's sources, Task 13's `glare.image`.
- Produces (author's calls 38, 39, 41):
  - `computeKernel(aperture: Aperture, size: number): { texels: Float32Array; radii: Float32Array; size: number }`, no GPU: the pupil's |FFT|², resampled per wavelength over a constant 16 wavelengths and summed to RGB, with its core tapered out over a radial window and the rest normalized to 1. `radii` gives the visible radius in cells per log2 of display brightness, 32 entries. FFT here runs once, in a worker, and never in a tick;
  - `glare.ts` owns the kernels, one per aperture, uploaded as `rgba16float` on first use; until then spikes draw nothing, and the veil runs. Its arrival asks for one tick (Review Focus 5);
  - the sprite pass: `pass.draw(4, GLARE_SOURCES)`, blending additively into `glare.image` after the composite. The vertex shader gives a degenerate triangle for a slot past the count; the fragment takes one sample, and clamps at 200; `spikes.share` scales it, default 0.05; `spikes.extent` is the kernel's half-width in degrees, default 3, and a sprite's radius is at most 512 px.

- [ ] **Step 1: Write the failing test** (`test/glareKernel.test.ts`, at `size` 128 so it runs in under a second):
  - the kernel's total is 1 within 1%, with its core's center at 0 and no radial step over 5% across the taper (the spike saw a bright ring there);
  - **it's a real aperture:** `vanes` has four-fold symmetry and at least 10 times more energy along its spike axes than between them; `hex` shows 6 spikes; `blades7`, 14; `round`, no spike: under 1.5 times between any two angles at a given radius;
  - longer wavelengths spread wider: the red channel's radius holding half its energy is larger than the blue's;
  - `radii` falls monotonically as brightness falls, and a cut below 2 cells gives no sprite;
  - the sprite pass calls `draw(4, 256)`, and never an indirect draw;
  - no `fft` name in any shader under `src/`, and nothing in the tick's code path imports `computeKernel` statically (a pin on the live path);
  - unknown apertures are refused, naming the value.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** Use the spike's finding on pupils (a central obstruction and four thin vanes, turned from the axes). Read the Metal of the sprite's vertex and fragment.
- [ ] **Step 4: Run** the test and tsc.
- [ ] **Step 5: Browser check** (port 5195, group `sprites`): a star's spikes against an FFT reference kept in the check page only (not in `src/`), at the same kernel, peak-normalized, within 10% along the spike; 300 bright stars in view keep to 256 sprites and the pixel budget; a star behind the limb has no sprite; time beside the spike's 0.13 ms.
- [ ] **Step 6: Commit** with "render: spike sprites from a kernel computed once in a worker".

### Task 15: Tiers, settings and many views

**Files:**

- Modify: `glare.ts`, `observer.ts`, `GpuDevice`, `bench/alloc.ts`, `bench/run.mjs`, `Viewer`, `spikes/observer.ts`
- Test: `test/glareTier.test.ts`

**Interfaces:**

- Consumes: Tasks 12 to 14.
- Produces (author's call 40):
  - `GpuDevice.adapterInfo: { vendor: string; architecture: string; isFallbackAdapter: boolean }`, read once from the adapter;
  - `glareTier(adapter, pixels: number): GlareTier`, by the table in "GPU safety", pure; `resolveGlare(settings: GlareSettings | null, adapter, pixels): ResolvedGlare`: the levels, base, sprite and pixel caps it means;
  - `eyeGlare(): GlareSettings`: a veil, no spikes, `tier: "auto"`; `cameraGlare(options?: { aperture?: Aperture }): GlareSettings`: a veil and spikes, default `vanes`;
  - `Viewer` keeps `glare: null` (question 1).

- [ ] **Step 1: Write the failing test** (`test/glareTier.test.ts`):
  - the table's cases: a fallback adapter; Intel at 2 and 4 million pixels; another vendor at 3 and 9 million; an explicit `tier` beats `"auto"`;
  - `resolveGlare` at `reduced` has base 4 and 7 levels, and at `sources` no pyramid: the pass list has no `glare.down`;
  - **two views:** different settings on one engine stay separate; the same size shares pooled textures (the pool's texture count doesn't double); removing a view frees its source buffer (Review Focus 4);
  - **on demand:** with glare on, an idle scene goes to sleep within 3 ticks; `view.observer.glare.veil.share = 0.1` wakes it; setting `glare` to null frees the targets to the pool (Review Focus 5);
  - resizing a canvas during glare rebuilds with no stale bind group; a 0 px canvas has no glare passes (Review Focus 4).
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** `bench/alloc.ts` takes `?glare=1`, and `bench/run.mjs` reads `ALLOC_GLARE=1`.
- [ ] **Step 4: Run** the test, the batch's other glare tests and tsc.
- [ ] **Step 5: Commit** with "render: glare's tiers, its presets, and many views".
- [ ] **Step 6: Batch D's gates,** with `alloc` both plain and `ALLOC_GLARE=1`. Expect no difference in `parity`, `translucency` or `customShader`, since glare's off there. Then the owner judges by looking (§13.28's test): the sun behind station structure, at the limb from orbit, and low over the sea; bright stars with the veil, then with spikes. A truss across the spikes is a known gap, since a sprite takes one visibility value (§13.22): say so beside the stills. Stills stay out of the repository.

## Batch E: the rest

### Task 16: The cost page, and the run on Intel

**Files:**

- Create: `bench/observerCost.html`, `bench/observerCost.ts`, `test/observerCost.test.ts`
- Modify: `bench/run.mjs`, then `glareTier`'s table once results arrive

**Interfaces:**

- Consumes: everything above.
- Produces:
  - `syntheticStars(count: number, seed: number): StarField`: positions with a band like the Milky Way's, magnitudes from `magnitudeOfRank`, colors from a fixed spread, a flat background. No sky data, so it can run anywhere and its results can be kept;
  - the page, at `?bench=1&runs=5` (and `&submission=direct`, `&pack=local`): five runs per row, each the median of 9 renders, at 2560×1440 whatever the window: quads (a test-only pipeline in the page), strips, cells by indirect draw, cells by the CPU path; wide, dense and long-lens views; each glare tier; each stage; the eye's point limit. It records adapter, architecture, driver string and device-loss events, shows a "Copy results" button, and stops at the first device loss, reporting it;
  - suite `observerCost` in `bench/run.mjs`.

- [ ] **Step 1: Write the failing test:** `syntheticStars` is deterministic for a seed, brightest first, its count of stars brighter than magnitude 6 within 15% of the 4,800 in `COUNTS`, and every value is finite; the results' JSON has a row per method and an adapter field; the page's source names no `.bin`, and with no `pack` parameter it makes no request to `/sky-pack/`.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and tsc. On the M2 (`BENCH_URL=http://127.0.0.1:5197 node bench/run.mjs observerCost`): compare with the spike's table. Report any row more than 2× off, which needs explaining. Read the star column first, as the spike's notes warn: on a tile-based GPU a pass's time can land in the sky pass.
- [ ] **Step 5: Commit** with "bench: what the observer, stars and glare cost, with no data needed".
- [ ] **Step 6: The owner's laptop** (see "Intel checks"). A person must run it. Don't mark this step done without the JSON. Other tasks may go on while waiting. When it arrives, update `glareTier`'s table and `test/glareTier.test.ts` from it, record the driver and results in §13.23 and §13.32, and commit with "render: glare's tiers, from a run on Intel". If device loss occurs, stop this plan's merge and report it.

### Task 17: The observer's controls

**Files:**

- Create: `widgets/observerPanel.ts`, `examples/night-sky/main.ts`, `index.html`, `DESIGN.md`, `test/observerPanel.test.ts`
- Modify: `widgets/index.ts`, `examples/index.ts`, `examples/slang-playground/main.ts`, `bench/suite/views/Viewer.tsx`, `api/surface.txt`

**Interfaces:**

- Consumes: `View.observer`, `View.readout`, `astrophotoCurveStage`, `eyeGlare`, `cameraGlare`, `Viewer.credits`.
- Produces (author's call 42):
  - `attachObserverPanel(container: HTMLElement, view: View, options?: { sections?: readonly ("exposure" | "optics" | "look" | "sky")[] }): ObserverPanelHandle`, public through the widgets entry, with `dispose()`;
  - **Exposure** (tagged Physics): Eye, Camera fixed or Camera metered. The fixed slider's internal value is −EV100, so right is brighter, from EV100 18 at the left to −12 at the right. Its label and readout are in EV100 ("EV100 −3.0"), and it carries the playground's line: "Right is brighter. A higher EV100 expects a brighter scene, so it lets in less light." The eye's compensation, in stops, also runs right for brighter. The meter's and the eye's readout shows "≈ EV100 14.2" for an equivalent;
  - **Optics** (tagged Model): the veil and its share, spikes and their aperture, and the tier in use and why;
  - **Look** (tagged Look): tone mapping, and the astrophoto curve, each with one line saying it changes the picture and not the light. Glare and the eye's limit name themselves as models of an eye or a lens, not looks or physics;
  - **Sky data:** the pack's name, or "1.x's star map"; its credits; and "Not cleared: local use only" while `distributable` is false.
  - `examples/night-sky`: public API only. Presets are data (§13.30): a date, a place or direction, an observer. No pack needed; `?pack=local` uses one where the dev route has it. Orion, the core, the winter sky, the night limb, the sun low, and the sun behind a structure.

- [ ] **Step 1: Write the failing test** (`test/observerPanel.test.ts`, the DOM setup `test/viewerCredits.test.ts` uses):
  - moving the fixed slider one step right raises `view.exposureScale` (the sign is the point); `ArrowRight` does the same; its `aria-valuetext` reads "EV100 …"; no readout in the panel shows a scale or a stop count in place of EV100;
  - the eye's readout starts with "≈", and a plain scale's says "no units";
  - every control sits under a section tagged physics, model or look, and the astrophoto control's label contains "look";
  - editing the view from outside updates the panel within one tick, and `dispose()` removes it and its listeners; no readout changes the layout's box size (fixed widths);
  - the sky section shows "Not cleared" for an uncleared pack, and credits as text;
  - the playground's and Dyno Viewer's EV100 sliders use the same direction: a source check on their `flip`. Dyno's runs the other way today, so it fails until changed.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.** Write `DESIGN.md` first: its story, audience and layout. Move the playground and Dyno's Viewer to the panel or to its direction rule.
- [ ] **Step 4: Run** the test, `npm test`'s example tests, tsc.
- [ ] **Step 5: Design pass** (port 5198, one page). Check the real page in both themes, at desktop and 380 px wide, keyboard only, with reduced motion, and with a clean console. Run a UX review on it, with a fresh reviewer, and fix what it finds. Nothing cramped; every figure in context. Stills stay out of the repository if a pack is on.
- [ ] **Step 6: Commit** with "widgets: the observer's controls: right is brighter, EV100 in readouts, and physics told from looks".

### Task 18 (stretch, skippable): FXAA on the interface

Skip this task if Batch E is short of time. Say so in the results. Nothing else depends on it.

**Files:**

- Create: `src/render/post/fxaaStage.ts`
- Modify: the `present` pass (its FXAA special case), `View.fxaa`, the examples that set `fxaa`, `bench/suite/suite.ts`, `api/surface.txt`, `test/postStage.test.ts`

**Interfaces:**

- Consumes: Task 2's `display` slot.
- Produces: `fxaaStage(): PostStage`: slot `display`, kind `look`, label `"FXAA"`. `fxaa.slang`'s body moves behind `POST_STAGE_BOUNDARY`. `ViewOptions.fxaa` and `View.fxaa` go; `frame.fxaaParams`, `frame.fxaaGroup` and `pipelines.fxaa` go.

- [ ] **Step 1: Write the failing test:** with `fxaaStage()` in the list, the pass list holds `post.fxaa` after `present`, and the `ldr` target is used; `"fxaa" in view` is false; a host stage after it in the `display` slot reads its output.
- [ ] **Step 2: Run** and confirm it fails.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Browser check:** the `translucency` example with FXAA on against main: no differing pixel, or each one explained. `npm run surface`.
- [ ] **Step 5: Commit** with "render: FXAA as a stage, to prove the interface".

### Task 19: Docs, the plan's results, and every gate

**Files:**

- Create: `test/observerDocs.test.ts`
- Modify: `packages/next/README.md`, `handbook/src/tabs/` (the scene tab's "Exposure and lighting", and its "checked" date), `handbook/src/apiMap.ts`, `handbook/src/sources.ts`, `handbook/DESIGN.md` if it names these, `packages/next/AGENTS.md` (the pack's rule), `CESIUM2_WEBGPU_PLAN.md`

- [ ] **Step 1: Write the failing test** (`test/observerDocs.test.ts`): each value export of the observer, stages and pack in `api/surface.txt` is named in the README; the scene tab's "checked" date is no older than this task's; `handbook/` holds no image, file or string derived from a pack (no `CSKY` magic, and no `sky-pack` URL); `sources.ts` holds the paper, with the date read.
- [ ] **Step 2: Docs.** The README covers the observer, stages (with what's a look), the pack, `npm run sky`, and that a pack isn't shipped. The handbook describes the engine as an embeddable rendering core, adds no roadmap, and shows no sky data. Read each outside page before adding it to `sources.ts`.
- [ ] **Step 3: The overall plan.** A "Sky and observer results" note under §13.32: measured values, calls and rulings one line each, the Intel results, or that they're still owed. Correct what's now stale: §13.29's "5e removes it", §13.30's table row, §13.22's "Not designed" and the "60,000" (three clamps), §13.28's disc rule (ruling 1). Write the real deferred work to §13.14's "Carried forward" list before deleting any ledger: the veil's asymmetric form from the paper; a truss across spikes; the Moon and planets in the list; the eye's color for bright stars; ambient occlusion's slot; §13.32's graph-level slicing; a `Renderer` interface when a second one is chosen; and the terms, still unsettled. Licences get no conclusion.
- [ ] **Step 4: Gates, once:**
  - `npx tsc --noEmit -p .`, `npx tsc --noEmit -p tsconfig.lib.json`, `npx eslint .`, `npx prettier --check .`;
  - `npm test`, `npm run test:data`, `SKY_DATA=1 npx vitest run test/data/skyPack.test.ts` where a pack exists;
  - `npm run build`, `npm run build:lib`, `npm run handbook`, `npm run check:bundle`, `npm run shaders:check`;
  - `parity`, `models`, `tileset`, `customShader`, `translucency`, `tracks`, `imagery`, and `alloc` plain and with `ALLOC_GLARE=1`, against main and against this branch's base, one suite at a time, on port 5194. Any pixel difference is explained or it's a bug;
  - a check that the branch adds no data: `git diff --stat main -- . | grep -E "\.(bin|exr|png|jpg)"` is empty;
  - `snyk_code_scan` on `src/render/post`, `src/scene/observer.ts`, `src/atmosphere/skyPack.ts`, `src/atmosphere/starCells.ts`, `scripts/skyPack.mjs`, `scripts/skyPack/`, `scripts/vitePluginSkyPack.ts`, `widgets/observerPanel.ts`, `bench/observerCost.ts`, `spikes/observer.ts` and `examples/night-sky`. Fix new findings, and rescan until clean. The dev route and the EXR reader are where a finding is most likely.
- [ ] **Step 5: Commit** with "Plan: sky and observer results".

## What other plans need

For the owner to apply. This plan doesn't edit them. Line references are by symbol or task, as those plans may move.

**5a (built).** Nothing to change in its code. Its plan's Step on "the stars, Sun and Moon match the base commit's to the eye" is history and no longer holds as a check: stars change here.

**5b.** A search for exposure, stars, tone mapping, observer (the optical sense) and glare finds nothing it depends on. Change only its **Base** line, to follow this plan, and check its symbols against the split. Its `observer` in vector kinds (`{ kind: "position"; target; observer }`) is SPICE's sense and unrelated. Worth a note, since `view.observer` now also exists; no rename needed.

**5c.**

- Its "a view on another body" task: `Sky.writeStars(view, rows)` is already per view (Task 9). It only has to pass R · `icrfToFixed` there. Its test on "its star rotation" should read `SkyView.starUniform`. Star cells and glare's sources then follow with no more work.
- Its `skyPixel` and `skyTablePixel` refactor: "keep their outputs exactly" now means against this plan's shader, which has no `starExposure`.
- Its Moon impostor: `glareSources`' `tapVisible` reads `sky.moon` and `sky.moonSize`. When the Moon moves to the opaque pass, its depth blocks the taps by itself. Keep the eclipse check from Task 12 passing, and drop the analytic test if the uniform goes.
- `ViewOptions` and `addView({ body })`: `observer`, not `exposure`. `Viewer.setSplit` with a body copies the observer. Its call 5's "same exposure" reads `view.observer.exposure`.
- A view on a body with no air: `lightListFor`'s sun has no `sunLight` table to read for it. Use the outside-air value until 5e; add this to its Step 1.
- Change its **Base** line.

**5d.**

- **`Camera.lens` should be renamed.** Its `Lens` holds tangents and half extents, which is projection. §13.22, §13.28 and §13.30 use "lens" for optics (a lens's spikes, a lens and camera in a preset), and those now live on the observer as `Aperture` and `spikes`. Two meanings of one word on neighboring objects will mislead. Recommended: `Camera.imagePlane(aspect): ImagePlane`, the same fields, in its calls 34 and 36, Tasks 14 and 15, and its seam's wording. It costs a rename now and more once built (question 5). This plan's API avoids the word either way.
- **Its `.fovy` seam:** this plan adds no `.fovy` read. New code takes tangents from the sky's uniform, so its Task 14 has nothing more to move. Keep it that way in review.
- **Its Task 15:** `Sky.write` no longer has a `starExposure` parameter. Add `glare` to what's off in an orthographic view, beside `frame.ambient`: there's no angle for a veil to spread over, and the narrowest dolly's tangents would make every star's radiance enormous. Add to its Step 1: `resolveGlare` gives `off` there; stars at the narrowest dolly's tangents have no NaN; `veilWeights` gives zeros. Star cells need no change, since they use the sky's tangents.
- **Its global constraints:** add the sky's check page to the browser checks, and read `view.observer` for any exposure a task sets. Its Viewer tasks: `ViewerOptions.observer`.
- **Its setters:** nothing is required. `view.observer.exposure.ev100` written through a setter wakes the loop, so `Timeline.bind` can animate EV100. Worth an example in its docs.
- Change its **Base** line, and its "What 5d takes" table if a name moved.

**5e (no plan yet; spec section 12, §13.29, §13.30).** Start from this plan:

- Out of its scope now: finishing the star exposure's removal, better source data, sharper points, eye and camera looks, and a first glare.
- Still its own: planets as points, deep-sky patches, the shutter and accumulation, and the sky per body.
- Planets and the Moon join `lightListFor` and `glareSources`' records. That also ends the undercount where the Moon clips at a low EV100.
- Patches: `format: 2` of the manifest, an optional `patches` block; the guard and credits already handle new files, as long as binaries get a magic.
- The shutter: a camera's `Exposure` gains a duration, with EV100 still the unit. Accumulation sits in the `scene` slot, on the graph's resources, off by default, and changes nothing in the default path.
- Per body: `faintStars` and the `sunLight` table become per body. The airglow on the night limb, which the spike found clipped at a long exposure, needs checking against real long exposures.
- `EYE_TARGET` and the highlight guard's tuning remain with it. So do §13.28's glint (a source in the list, at last) and water.
- 5f and 5g: a spacecraft camera is `cameraObserver` plus `cameraGlare`. 5g's replay should set observers as data.

## Self-review

- **Spec coverage.** Observer stage: Tasks 1 to 3, with EV100 readouts in 1 and 17, the meter unmoved in 2 and 13, FXAA in 18 and ambient occlusion in its section. Sky data pack: Tasks 4 to 7, with today's map as default (Task 4), a local script (6), refusal with a test (5), and credits (7). Star drawing: Tasks 8 to 10, with cells, strips, the core and the hybrid; raw catalogs off (call 15). Glare: Tasks 12 to 15, veil, sprites and tiers, per observer, no FFT live (a pin in Task 14), the sun's energy (call 32). Fudges: Task 11. Out-of-scope items appear only under "What other plans need".
- **Requirements of the brief.** Failable tests end each task. Node first, with browser groups on `spikes/observer.html`. Gates are named per batch, and "Expected pixel differences" states what moves. Batching is its own section. Intel checks, tiers, hang safety and slicing have sections. UI rules: Task 17. Calls carry undo costs. Questions end the document. Review Focus lines each have their tests.
- **Step scan.** No step says "handle" without saying what. The spike's bodies aren't copied. Formulas appear only where a signature can't determine them.
- **Type consistency.** `ObserverSettings`, `PointSpread`, `GlareSettings`, `ObserverReadout` (Task 1); `PostStage`, `StageSlot`, `StageKind`, `createPostStage`, `POST_STAGE_BOUNDARY`, `chainOrder`, `chainSource`, `observerShadowGain` (2); `SkyPackManifest`, `parseManifest`, `readPoints`, `readBackground`, `isPackBinary`, `setSkyPack` (4); `skyPackGuard`, `skyPackDevRoute` (5); `starRadius` (8); `buildStarCells`, `cullCell`, `starCullInputs`, `starSubmission` (9); `eyePointLimit`, `eyeLimitStage` (11); `lightListFor`, `discTaps` (12); `veilWeights`, `veilSpread`, `sunVeil` (13); `computeKernel`, `Aperture` (14); `glareTier`, `resolveGlare`, `eyeGlare`, `cameraGlare` (15).
- **Proportion.** The plan decides names, values and tests. Shader bodies are left to the implementer, except for formulas the spec leaves open.
- **Not verified in writing this.** All GPU costs are the spike's, on an M2. Nothing here has run. The eye-limit values and the "stars fall by" table are computed from today's `eye.ts`. The slope check was run on the formula, not on a GPU.

## Questions for the owner

Most important first. Each has the default the plan follows.

1. **Should the Viewer turn glare on by default?** A tight core with no glare makes bright stars stand out less, and a veil also lowers contrast in daylight scenes. *Default:* off until you've judged Batch D's renders; then it's one line.
2. **HYG as the default pack's bright end.** The spike found a map alone can't do it. HYG's page states CC BY-SA 4.0. Its inputs include Hipparcos, whose ESA page states CC BY-NC 3.0 IGO, and its pages don't say how those sit together (both read 2026-11-08). *Default:* use it locally, marked uncleared, with raw Hipparcos and Gaia supplied by hand only. Should it stay out until someone reads the terms? The plan then has no bright end to offer but what a developer supplies.
3. **Stars beside a sunlit Earth from orbit.** With the rule gone, they vanish, as in photographs. *Default:* accept it, with no special path. A look stage could add them later, labelled.
4. **The tight core on today's map.** §13.29 says a checkout with no pack draws what it draws now, and also says to drop the halo. *Default:* the data stays, the drawing improves (call 23). Say if the default look should hold until a pack is on.
5. **Rename 5d's `Camera.lens` to `Camera.imagePlane`?** *Default:* yes, before 5d is built. See "What other plans need".
