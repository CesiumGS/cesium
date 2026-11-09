import type { ReactNode } from "react";
import { count, referenceAdapter } from "./data.ts";
import { C, CodeBlock, Section, Written } from "./parts.tsx";
import { snippetText } from "./snippets.ts";
import { drawScaling, ms, num } from "./tabs/benchmarks.tsx";

/**
 * Why the API breaks: what a shape of 1.x's made hard, what 2.0 does, and
 * where 2.0 still leaks. Each was read in `packages/engine/Source` and
 * `packages/next/src`. 1.x's shapes follow from WebGL and from when they were
 * made, so these state consequences, not faults.
 */

interface Reason {
  title: string;
  /** What 1.x's API asks of an application, and why that follows. */
  shape: ReactNode;
  /** What 2.0 does instead. */
  next: ReactNode;
  /** Where the same concern still reaches applications, or what's unproved. */
  open: ReactNode;
  /** A task in the 1.x to 2.0 API tab, or a snippet of this section's own. */
  snippet?: string;
  task?: string;
}

function drawFigures() {
  const adapter = referenceAdapter();
  const rows = adapter ? drawScaling(adapter) : [];
  const last = rows[rows.length - 1];
  if (!adapter || !last) {
    return "No run is recorded on this machine.";
  }
  return `On the ${adapter.adapter}, at ${count(last.draws)} draws, the draw scaling suite measured ${ms(num(last.old, "cpu/frame ms"))} of main-thread CPU and ${count(num(last.old, "API calls/frame") ?? 0)} API calls per tick in 1.x, and ${ms(num(last.next, "cpu/frame ms"))} and ${count(num(last.next, "API calls/frame") ?? 0)} in 2.0. That run predates plan 5a, and it's one synthetic scene on one machine.`;
}

const REASONS: Reason[] = [
  {
    title: "On-demand rendering",
    shape: (
      <>
        A property in 1.x is a plain JavaScript property, so the engine can't
        see every write. <C>requestRenderMode</C> therefore watches the camera,
        loads and time, and leaves the rest to the application, which calls{" "}
        <C>scene.requestRender()</C>. 1.x's own rendering performance example
        does that after changing a box's scale and colour. Forgetting it leaves
        a stale image, so the mode is opt-in, and the default renders every
        tick.
      </>
    ),
    next: (
      <>
        The check lives inside the engine. <C>renderMode</C> defaults to{" "}
        <C>"onDemand"</C>. <C>View</C> keeps a fingerprint of its state, setters
        wake the loop, <C>Camera.version</C> counts camera changes, and the
        world and tilesets report their own. The loop sleeps when nothing
        changes.
      </>
    ),
    open: (
      <>
        <C>requestRender()</C> is still public, because some state still isn't
        watched: <C>sunDirection</C> set in place, a camera's <C>position</C>,{" "}
        <C>direction</C> or <C>up</C> written without <C>version++</C>, and{" "}
        <C>View.shadows</C>, <C>fxaa</C>, <C>overlays</C>, <C>icrfToFixed</C>{" "}
        and the sky. So the leak is smaller, not gone, and the Overview's live
        view has to call it for the sun. Closing the list is a question for the
        API review (plan 5i).
      </>
    ),
    snippet: "ondemand",
  },
  {
    title: "One scene, one canvas",
    shape: (
      <>
        <C>Scene</C> takes a canvas and makes a WebGL context for it, a natural
        fit for one globe on a page. A second view is a second viewer with its
        own content, and browsers limit live contexts. 1.x's{" "}
        <C>SharedContext</C>, exported but marked private, lets scenes share a
        context, rendering each off screen and copying it over. It shares the
        context. How well one tileset serves two scenes wasn't tested here.
      </>
    ),
    next: (
      <>
        An <C>Engine</C> owns the device, a <C>World</C> the content and a{" "}
        <C>View</C> a camera and a target, so views share geometry and tiles.
        Measured, from the overall plan's table: four views of 1,000 draws took
        11.9 ms of CPU per tick in 1.x with four scene copies, and at most 0.3
        ms in 2.0 with one world.
      </>
    ),
    open: "Memory with several views hasn't been measured against its target.",
    task: "views",
  },
  {
    title: "Picks and readback",
    shape: (
      <>
        <C>scene.pick</C>, <C>drillPick</C>, <C>pickPosition</C> and{" "}
        <C>sampleHeight</C> return their answers directly, which WebGL allows by
        waiting for the GPU. 1.x has since added <C>pickAsync</C>, which reads
        back through a pixel buffer, for picks.
      </>
    ),
    next: (
      <>
        WebGPU has no synchronous readback, so this break is forced.{" "}
        <C>view.pick</C> and <C>view.pickPosition</C> return promises, and a
        pick reads the feature-ID and depth targets of what's on screen, with no
        extra render.
      </>
    ),
    open: "Every caller becomes asynchronous, which is a real cost to code that picks during input. The stall saved in practice hasn't been measured.",
    task: "pick",
  },
  {
    title: "update(frameState) and command lists",
    shape: (
      <>
        Each tick, the scene calls <C>update(frameState)</C> on what it holds,
        and each pushes commands. That suits WebGL, where each draw sets its own
        state. The work grows with visible draws, and a custom primitive written
        against that contract depends on <C>frameState</C> and{" "}
        <C>DrawCommand</C>, which 1.x marks private.
      </>
    ),
    next: (
      <>
        Objects register with a world and mark themselves dirty. Draws live in
        tables on the GPU, and compute culls them. {drawFigures()}
      </>
    ),
    open: (
      <>
        Whether <C>GpuDevice</C> and <C>World</C> belong in the public surface
        is open for the API review, since a host that shares a device may need
        them (overall plan, section 13.17).
      </>
    ),
  },
  {
    title: "GLSL and render state in the API",
    shape: (
      <>
        <C>CustomShader</C>, <C>PostProcessStage</C>, Fabric materials and an{" "}
        <C>Appearance</C>'s <C>renderState</C> take GLSL and WebGL's state
        directly, which made them powerful and quick to adopt. They also tie
        applications to the graphics API, so the renderer can't change under
        them. Shaders join by name, through <C>ShaderSource.replaceMain</C> and{" "}
        <C>czm_</C> names, so those names become part of what a custom shader
        depends on.
      </>
    ),
    next: (
      <>
        Custom shaders write to a versioned contract, and a linker joins units
        across declared boundaries (<C>shaders/link</C>). A shader that fails
        falls back to the engine's, with the error reported.
      </>
    ),
    open: (
      <>
        <C>CustomShader</C> takes WGSL, so the same tie exists to WebGPU. WGSL
        shaders wouldn't port to a WebGL 2 renderer, and Slang ones might.
      </>
    ),
    task: "shader",
  },
  {
    title: "One tileset, one look",
    shape: (
      <>
        A <C>Cesium3DTileset</C> is its tree and cache, and also its{" "}
        <C>style</C>, <C>modelMatrix</C> and <C>show</C>, which is simple when
        content is drawn once. Drawing it two ways means loading it twice, with
        two selections and two caches.
      </>
    ),
    next: (
      <>
        <C>engine.loadTileset</C> gives the content, and <C>world.add</C> a{" "}
        <C>SceneItem</C> with its own placement, tint, opacity and view mask.
        After the first item, each adds about 550 bytes a draw, by the code's
        reckoning. The Scene representation tab spells this out.
      </>
    ),
    open: "A tileset belongs to one world, and models and the globe aren't items yet. Those, and groups, are for a later brainstorm before or with the API review.",
  },
  {
    title: "Where assets come from",
    shape: (
      <>
        Workers, wasm and assets are found through <C>CESIUM_BASE_URL</C>, or{" "}
        <C>buildModuleUrl.setBaseUrl</C>, and copied static files. That's a
        global every application has to set, from before <C>import.meta.url</C>{" "}
        could do it.
      </>
    ),
    next: (
      <>
        They're found from <C>import.meta.url</C>, with nothing to copy.
      </>
    ),
    open: "This one needn't be a break. The list below suggests it as a change 1.x could make too, once checked against the failures users report.",
  },
  {
    title: "Earth-fixed coordinates",
    shape: (
      <>
        A position in 1.x means Earth-fixed metres, and about 100 lines read a
        global <C>Ellipsoid.default</C>. That was the right model for a globe.
        Another body, or a scene that moves with an orbit, works by changing
        that default or by converting by hand.
      </>
    ),
    next: (
      <>
        A tree of reference frames answers where one is in another at a time, in
        optional modules. A view's render space follows its camera rig, and the
        core reaches them only through its resolver.
      </>
    ),
    open: (
      <>
        <C>Camera.lookAt</C> still defaults to WGS84. A second body is plan 5c,
        with testing still to come, so this break's benefit there isn't shown
        yet.
      </>
    ),
  },
];

/** The section: each break with what it's for and what's still open. */
export function WhyApiChanges() {
  return (
    <Section title="Why the API changes">
      <p>
        A break should exist because an API's shape made something impossible or
        leaked an internal concern to applications, not for taste. 1.x made
        these choices for WebGL and for its time, and they've served for many
        years. What follows are consequences of those constraints. Where 2.0
        still leaks, or a break has shown no benefit yet, it says so, for the
        API review (plan 5i).
      </p>
      {REASONS.map((r) => (
        <section className="why" key={r.title}>
          <h3>{r.title}</h3>
          <dl>
            <dt>1.x's shape</dt>
            <dd>{r.shape}</dd>
            <dt>2.0</dt>
            <dd>{r.next}</dd>
            <dt>Still open</dt>
            <dd>{r.open}</dd>
          </dl>
          {r.snippet ? (
            <div className="task-sides">
              <div>
                <p className="task-side">1.x</p>
                <CodeBlock
                  language="js"
                  code={snippetText(`${r.snippet}.1x.txt`)}
                />
              </div>
              <div>
                <p className="task-side">2.0</p>
                <CodeBlock
                  language="ts"
                  code={snippetText(`${r.snippet}.next.ts`)}
                />
              </div>
            </div>
          ) : null}
          {r.task ? (
            <p className="provenance">
              Side by side in code in the <a href="#/compare">1.x to 2.0 API</a>{" "}
              tab, under its tasks.
            </p>
          ) : null}
        </section>
      ))}
      <h3>Changes with no benefit shown yet</h3>
      <ul>
        <li>
          <strong>Math.</strong> <C>Cartesian3</C> objects became typed arrays.
          1.x's result parameters were already a good answer to allocation, and
          2.0 keeps the idea as required out parameters. Nothing measured
          isolates a gain from this, and 2.0's own allocation target isn't met
          yet (Benchmarks tab).
        </li>
        <li>
          <strong>ion tokens.</strong> Both have a settable default,{" "}
          <C>Ion.defaultAccessToken</C> and <C>ionDefaults</C>, and both take a
          token per call. The difference is that 2.0 builds none in.
        </li>
      </ul>
      <Written
        from="1.x's source, packages/engine/Source, 2.0's source, and the overall plan, sections 2 and 13.17"
        on="2026-11-08"
      />
    </Section>
  );
}
