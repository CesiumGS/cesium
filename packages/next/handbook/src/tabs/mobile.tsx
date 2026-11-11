import {
  C,
  CodeBlock,
  DataTable,
  Note,
  Page,
  Section,
  Written,
} from "../parts.tsx";

const FOUND = [
  {
    what: "A secure context",
    found:
      "WebGPU runs only on a secure page. localhost counts, but plain http to the Mac's network address doesn't, so a phone on the same network got no navigator.gpu.",
    fix: (
      <>
        <C>DEV_HTTPS=1</C> serves the dev server over HTTPS with a certificate
        made at startup. Accept Safari's warning once per address.
      </>
    ),
  },
  {
    what: "Syntax Safari doesn't parse",
    found: (
      <>
        <C>using</C> declarations, in Dyno's own code.
      </>
    ),
    fix: "The dev transform lowers them, as the build already did.",
  },
  {
    what: "Missing runtime pieces",
    found: (
      <>
        <C>Symbol.dispose</C> and <C>DisposableStack</C>. Without the symbol, a
        class's dispose method is silently named "undefined".
      </>
    ),
    fix: (
      <>
        A small shim, <C>src/core/disposeShim.ts</C>, loaded first by the
        modules that need it.
      </>
    ),
  },
  {
    what: "Stricter shader checks",
    found: (
      <>
        Safari rejected <C>adapt.reduce</C>: a return before{" "}
        <C>workgroupBarrier</C>, uniform in fact but not provably so. The WGSL
        specification requires that proof. Chrome had accepted it.
      </>
    ),
    fix: "The bounds check moved after the barrier. A failed pipeline now names itself, its reason and the compiler's messages, since Safari's errors carry no message.",
  },
  {
    what: "Full screen",
    found:
      "An iPhone's Safari gives full screen only to video, so the viewer's button did nothing.",
    fix: "Where the browser can't, the viewer fills the window instead.",
  },
];

const GESTURES = [
  {
    gesture: "One finger",
    globe: "Grabs the ground and pans; spins on with inertia when let go",
    object: "Orbits",
  },
  {
    gesture: "Two fingers",
    globe:
      "Pinch, twist and pan together: zoom toward the point between the fingers, turn the heading about it, and move the ground with them",
    object: "Pinch, twist and pan together: zoom, turn the heading, and pan",
  },
  {
    gesture: "Two fingers sliding up or down together",
    globe: "Tilts, and does nothing else until a finger lifts",
    object: "Tilts",
  },
];

const TILES = [
  {
    risk: "Passes",
    why: "A tile-based GPU keeps a pass's attachments in fast on-chip memory and writes them out when the pass ends. Every pass boundary is a round trip to main memory.",
    here: "The frame graph has about two dozen passes (shadows, culling, the depth prepass, ambient occlusion and its blur, the sky, opaque, translucency, glare and post). Most of their attachments are stored, and only a few are discarded.",
  },
  {
    risk: "Load and store",
    why: "An attachment loaded at a pass's start and stored at its end costs bandwidth both ways. One that is cleared and discarded never leaves the chip.",
    here: "The graph knows each texture's lifetime, so it could choose the load and store operations itself. It doesn't yet. WebGPU has no memoryless attachments today; a proposal for transient ones would make this explicit.",
  },
  {
    risk: "Depth prepass",
    why: "These GPUs remove hidden surfaces per tile before shading, which is the prepass's job done for free. A prepass then costs a second geometry pass.",
    here: "Ambient occlusion and other effects read its depth, so dropping it means another depth source for them.",
  },
  {
    risk: "Reading what was just drawn",
    why: "Sampling the depth or colour of the current pass forces the tile out to memory. Effects that read depth or colour mid-frame split passes.",
    here: "Ambient occlusion, glare, aerial perspective and translucency all read earlier results.",
  },
  {
    risk: "Precision and bandwidth",
    why: "A 16-bit float target moves twice the bytes of an 8-bit one, on every load, store and sample. On a phone, bandwidth is power and heat, and a warm phone slows its GPU down.",
    here: "The engine renders in physical light, so its scene targets are 16-bit float, and moment-based translucency adds more.",
  },
  {
    risk: "Compute between draws",
    why: "A compute pass ends any render pass around it. GPU-driven culling and tessellation are compute-heavy by design.",
    here: "Culling runs in compute each tick, and the b-rep dice is compute too, in a pass of its own each view. A b-rep face of degree 3 or less draws through it.",
  },
  {
    risk: "Memory",
    why: "A browser tab on a phone has far less memory than on a desktop, and the system ends a page that takes too much without warning.",
    here: "The tile cache, the frame graph's targets and imagery arrays are sized for desktops.",
  },
];

export function Mobile() {
  return (
    <Page
      title="Mobile"
      status="sketch"
      lede={
        <>
          The engine runs on an iPhone, in Safari with WebGPU. This tab says
          what it took to get there, how touch works, and what tile-based phone
          GPUs mean for the architecture. Nothing has been measured on a phone
          yet.
        </>
      }
    >
      <Note title="How far it goes">
        <p>
          Dyno and the examples load and draw on an iPhone over the dev server.
          Touch controls are new, and are being tried on the phone. No frame
          times, memory or heat have been measured on any phone.
        </p>
      </Note>

      <Section title="What getting it running turned up">
        <p>
          Each of these worked on a desktop and failed on the phone, one after
          the other.
        </p>
        <DataTable
          label="What failed on the phone, and the fix"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Found", cell: (r) => r.found },
            { head: "Fix", cell: (r) => r.fix },
          ]}
          rows={FOUND}
        />
        <p>
          The shader check is the one to watch. Safari's WGSL compiler follows
          the specification's uniformity rules more strictly than Chrome's, so
          shaders need checking on both. The engine's 28 generated shaders now
          have no return before a barrier.
        </p>
        <p>
          To try it, run this, then open the Mac's address on port 5198 on the
          phone. WebGPU on an iPhone needs iOS 26 or later.
        </p>
        <CodeBlock
          code="DEV_HTTPS=1 npm run dev --workspace @cesium/next -- --host 0.0.0.0 --port 5198"
          language="shell"
        />
        <Written from="this session's fixes, on 2026-11-10" on="2026-11-10" />
      </Section>

      <Section title="Touch">
        <p>
          The controls follow the maps apps people already know (Apple Maps,
          Google Maps and Google Earth) on the globe, and 3D model viewers on
          objects. Each finger moves what's under it one to one: fingers twice
          as far apart halve the distance, and a twist turns the heading by the
          twist's angle.
        </p>
        <DataTable
          label="Touch gestures by view"
          columns={[
            { head: "Gesture", cell: (r) => r.gesture },
            { head: "On the globe", cell: (r) => r.globe },
            { head: "On an object (orbit, inspect)", cell: (r) => r.object },
          ]}
          rows={GESTURES}
        />
        <ul>
          <li>
            Pinch, twist and pan apply together, as in the maps apps, so one
            motion zooms, turns and moves. Tilt is the one gesture held apart:
            it starts only when both fingers begin moving vertically together.
          </li>
          <li>
            A second finger ends a one-finger gesture without a jump. When one
            finger of a pair lifts, the other moves nothing until it lifts too:
            fingers never lift at quite the same moment, and the last one off
            would otherwise flick a pan.
          </li>
          <li>
            The globe never rolls. Twisting turns the heading, as it does on a
            map.
          </li>
          <li>
            While a camera takes input, the canvas holds the browser's own
            gestures (<C>holdBrowserGestures</C>): no page zoom, no pull to the
            tab overview, no long-press callout. Canvases that take no input are
            left alone, so a page still zooms over a picture.
          </li>
        </ul>
        <p>
          Plan 5d's bindings take this over later, as <C>touch1:drag</C>,{" "}
          <C>touch2:pinch</C>, <C>touch2:rotate</C>, <C>touch2:drag</C> and{" "}
          <C>touch2:tilt</C>. The <a href="#/cameras">Cameras tab</a> has the
          controllers themselves.
        </p>
        <Written
          from="plan 5d, ruling 26 as changed after trying the phone, and src/scene/touchGestures.ts"
          on="2026-11-10"
        />
      </Section>

      <Section title="Tile-based GPUs and the architecture">
        <p>
          Phone GPUs, and Apple's laptop ones, are tile-based: they split the
          screen into small tiles and draw each one in fast on-chip memory, then
          write it out. Desktop GPUs mostly draw straight to memory. On a tile
          GPU, what costs is not the drawing but moving data between the chip
          and memory, and that's set by how the frame is divided into passes.
          The engine's design so far is a desktop one.
        </p>
        <DataTable
          label="Where tile-based GPUs push on the design"
          columns={[
            { head: "Risk", cell: (r) => r.risk },
            { head: "Why it costs", cell: (r) => r.why },
            { head: "In this engine", cell: (r) => r.here },
          ]}
          rows={TILES}
        />
        <p>What the architecture can do about it, none of it built yet:</p>
        <ul>
          <li>
            <strong>Let the frame graph choose load and store.</strong> It
            already knows when each texture is first written and last read, so
            it can clear and discard transient attachments, and store only what
            a later pass reads. This is the largest lever, and it helps desktops
            too.
          </li>
          <li>
            <strong>Merge passes that share attachments,</strong> where nothing
            between them reads what they drew.
          </li>
          <li>
            <strong>A mobile profile:</strong> no depth prepass, ambient
            occlusion off or at a lower resolution, fewer post stages, and
            smaller scene targets. The same scene and the same physical light,
            at a cost a phone can carry.
          </li>
          <li>
            <strong>Measure on phones.</strong> Dyno now runs on one, so the
            benchmark suite can record frame times there; and timing heat over
            minutes matters as much as single frames.
          </li>
          <li>
            <strong>Keep shader checks honest:</strong> run every pipeline
            through Safari, whose WGSL checks are stricter, as part of testing.
          </li>
        </ul>
        <p>
          The <a href="#/rendering">Rendering tab</a> shows the frame graph's
          passes and textures.
        </p>
        <Written
          from="general properties of tile-based GPUs, and this engine's frame graph (src/render)"
          on="2026-11-10"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>Frame times, memory and heat measured on phones.</li>
          <li>
            Android: Chrome on Android has WebGPU on many devices, with Mali and
            Adreno GPUs, also tile-based. Not tried.
          </li>
          <li>The mobile profile's settings, once measured.</li>
          <li>Touch for picking, measuring and snapping.</li>
        </ul>
      </Section>
    </Page>
  );
}
