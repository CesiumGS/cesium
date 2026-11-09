import type { ReactNode } from "react";
import { C, Cite, DataTable, Note, Section, Written } from "./parts.tsx";
import type { SourceId } from "./sources.ts";

/**
 * Reaching browsers without core WebGPU, and the facts around that question.
 * The work pieces are read from the code. Every outside figure was re-read on
 * its `checked` date in sources.ts: what couldn't be confirmed isn't here.
 */

const OPTIONS: {
  row: string;
  oneX: ReactNode;
  compat: ReactNode;
  webgl: ReactNode;
}[] = [
  {
    row: "What it is",
    oneX: "An application uses CesiumJS 1.x where the device has no core WebGPU.",
    compat:
      "2.0 on a compatibility adapter: a second vertex path and a set of variants, inside one renderer.",
    webgl:
      "A second renderer over one scene and one content layer, loaded as its own chunk.",
  },
  {
    row: "Work in the engine",
    oneX: "Documentation, and a clear message when no adapter is offered.",
    compat:
      "12 pieces, listed below. Nothing is built, and none has been tried.",
    webgl: "11 pieces, listed below. Its largest unknown has had no spike.",
  },
  {
    row: "What stays as it is",
    oneX: "1.x itself. The application keeps two integrations, as the 1.x to 2.0 API tab shows.",
    compat:
      "Compute, so culling and indirect draws. The style compiler. Slang to WGSL. Most of the 43 kernels.",
    webgl:
      "Selection, requests, parsers and the scene's bookkeeping, once they're apart from the renderer.",
  },
  {
    row: "What it gives up",
    oneX: "Everything 2.0 adds, on those devices.",
    compat:
      "4× MSAA on the scene, per-sample translucency, and any custom shader that reads tables in its vertex stage. Performance on these GPUs isn't measured.",
    webgl:
      "GPU culling and compute traversal, the current translucency, and WGSL custom shaders. Kernels with no equivalent may be dropped. Later WebGPU features don't apply.",
  },
  {
    row: "Who it adds",
    oneX: "As the WebGL 2 column, since 1.x draws with WebGL.",
    compat: (
      <>
        Today, Chrome on Android devices with OpenGL ES 3.1 and without what
        core WebGPU needs. Chrome's intent says 23% of Android users lack Vulkan
        1.1 (<Cite id="compatIntent" />
        ). Nobody publishes how many of those a compatibility adapter reaches.
      </>
    ),
    webgl: (
      <>
        97.29% of global usage has WebGL 2 (<Cite id="webgl2Usage" />) and
        98.21% of one survey's reports (<Cite id="webgl2Survey" />
        ), against 88.63% and 81.18% for WebGPU.
      </>
    ),
  },
  {
    row: "Who it still doesn't reach",
    oneX: "As the WebGL 2 column.",
    compat:
      "Windows without D3D12, while the D3D11 backend stays blocklisted. Firefox and Safari. Sessions with no GPU, and browsers with graphics acceleration off.",
    webgl:
      "Sessions with no GPU, as Chromium is deprecating the automatic software fallback for WebGL. Browsers where policy turns 3D APIs or graphics acceleration off.",
  },
  {
    row: "Afterwards",
    oneX: "It relies on 1.x staying maintained for those users.",
    compat:
      "Vertex changes are made twice, and a compatibility adapter joins the test matrix.",
    webgl:
      "Two renderers kept at parity, with every rendering feature written twice or declared missing.",
  },
];

const COLUMNS = [
  { key: "oneX", title: "Use 1.x there" },
  { key: "compat", title: "Compatibility mode" },
  { key: "webgl", title: "A WebGL 2 renderer" },
] as const;

const COMPAT_PIECES: { piece: string; today: ReactNode; change: ReactNode }[] =
  [
    {
      piece: "Starting the device",
      today: (
        <>
          <C>gpu/GpuDevice.ts</C> asks for a default adapter, and{" "}
          <C>gpu/limits.ts</C>'s base tier is the core defaults.
        </>
      ),
      change:
        "Ask for a compatibility adapter when there's no core one. Add a tier with its own floor, checked by the layouts test.",
    },
    {
      piece: "The surface vertex stage",
      today: (
        <>
          <C>surface.slang</C>'s <C>vertexOut</C> reads <C>items</C>, the draw
          record and up to six streams from <C>vertices</C>, all storage
          buffers. The default limit there is 0.
        </>
      ),
      change: (
        <>
          The second vertex path. Streams become vertex attributes, with a batch
          binding its slab at offsets, so <C>scene/Slabs.ts</C>'s buffers gain
          vertex usage. Items arrive as an instance-step buffer, which is
          already how their index arrives.
        </>
      ),
    },
    {
      piece: "Point sets",
      today: (
        <>
          <C>surfacePointVertex</C> reads a point list and anchors by vertex
          index, six vertices a point.
        </>
      ),
      change:
        "Anchors become instance-step attributes, and lists an index buffer.",
    },
    {
      piece: "Placement and custom vertex stages",
      today: (
        <>
          <C>placement.slang</C> reads <C>placements</C> in the vertex stage,
          and a custom vertex stage can read feature tables through its
          directory.
        </>
      ),
      change:
        "Data textures, or results a compute pass writes into a stream beforehand. Custom shaders that read tables there need another route.",
    },
    {
      piece: "Stars",
      today: (
        <>
          <C>sky.slang</C>'s <C>starVertex</C> reads <C>starPoints</C>.
        </>
      ),
      change: "Instance-step attributes.",
    },
    {
      piece: "Fragment storage buffers",
      today:
        "The overall plan's audit counts 7 in the translucent fragment stage: materials, clip boxes, lights and ambient occlusion among them. The default limit there is 4.",
      change:
        "Pack tables into fewer buffers, the step section 13.15 already names, or use data textures. What real adapters offer above 4 isn't measured.",
    },
    {
      piece: "Scene targets",
      today: (
        <>
          <C>SCENE_TARGETS</C> is <C>rgba16float</C>, <C>rg16uint</C> and{" "}
          <C>rgba8unorm-srgb</C> at 4× MSAA. Compatibility mode allows no MSAA
          on the first two.
        </>
      ),
      change: (
        <>
          A single-sample variant of the opaque, translucent and pick passes.{" "}
          <C>sample_mask</C> and <C>fsListSamples</C> go. <C>fxaa.slang</C> is
          already there for edges.
        </>
      ),
    },
    {
      piece: "Reading depth",
      today: (
        <>
          <C>textureLoad</C> on depth textures in <C>ao</C>, <C>depthRange</C>,{" "}
          <C>pick</C>, <C>points</C> and <C>surface</C>. Compatibility mode
          allows neither that nor a non-comparison sampler on depth.
        </>
      ),
      change:
        "Write depth to an r32float colour target in the prepass, and read that. The default limit of 4 colour targets leaves room for one more beside the scene's three.",
    },
    {
      piece: "Texture views",
      today: (
        <>
          <C>gpu/MipGenerator.ts</C> binds one level of one layer, and{" "}
          <C>gpu/Environment.ts</C> writes a cube's levels as 2D arrays.
        </>
      ),
      change:
        "Each texture states its view dimension when created, and mip generation of arrays takes another route. Whether the rule reaches storage views needs a check.",
    },
    {
      piece: "Flat interpolation",
      today: (
        <>
          24 flat outputs in the generated WGSL. A terrain skirt is marked
          through its provoking vertex (<C>SKIRT_BIT</C>).
        </>
      ),
      change: (
        <>
          Compatibility mode has only <C>flat, either</C>, with no promise of
          which vertex. Skirts need another signal.
        </>
      ),
    },
    {
      piece: "Blending per target",
      today: (
        <>
          The composite, splat and translucent pipelines in{" "}
          <C>scene/RenderContext.ts</C> differ per colour target.
        </>
      ),
      change: "All targets of a pipeline must match, so these split or change.",
    },
    {
      piece: "Workgroup sizes",
      today: (
        <>
          <C>depthRange.slang</C> and <C>meter.slang</C> use 16 × 16, which is
          256 invocations. The default limit is 128.
        </>
      ),
      change: "Smaller workgroups, and more of them.",
    },
  ];

const WEBGL_PIECES: { piece: string; today: ReactNode; change: ReactNode }[] = [
  {
    piece: "A renderer interface",
    today: (
      <>
        The passes and other GPU work are in their own files (
        <C>src/render/view</C>, <C>src/render/world</C>), but they take the
        whole <C>Engine</C> or <C>World</C>. <C>src/streaming</C> and{" "}
        <C>src/globe</C> import from <C>scene</C> and <C>render</C>.
      </>
    ),
    change:
      "Narrow what those functions take, along the layers section 13.17 sketches, then write the interface against a real second renderer.",
  },
  {
    piece: "Shaders",
    today: (
      <>
        Slang compiled to WGSL, and <C>shaders/link</C> links WGSL.
      </>
    ),
    change:
      "Slang to GLSL ES 3.00 is untested, and a spike decides it. The linker and surfaceVertex.wgsl need a GLSL form.",
  },
  {
    piece: "Culling and draw work: 18 kernels",
    today: (
      <>
        <C>cull</C>, <C>pointCull</C>, <C>points</C>, <C>modelPool</C>,{" "}
        <C>layouts</C>, <C>boundary</C>, <C>raycast</C>, <C>scatter</C> and{" "}
        <C>pick</C>.
      </>
    ),
    change: "CPU equivalents or another design, as WebGL 2 has no compute.",
  },
  {
    piece: "Tables and imagery: 17 kernels",
    today: (
      <>
        <C>atmosphere</C>, <C>sky</C>, <C>reference</C>, <C>ibl</C>,{" "}
        <C>iblReference</C> and <C>imagery</C>.
      </>
    ),
    change: "Fragment passes into float targets, or dropped.",
  },
  {
    piece: "Image and lighting passes: 8 kernels",
    today: (
      <>
        <C>adapt</C>, <C>meter</C>, <C>depthRange</C>, <C>lights</C>, <C>ao</C>{" "}
        and <C>composite</C>.
      </>
    ),
    change: "Fragment passes, the CPU, or dropped, one at a time.",
  },
  {
    piece: "Draws",
    today: (
      <>
        Indirect draws from compute. <C>SubmissionMode</C>'s <C>"direct"</C>{" "}
        bakes CPU-side arguments, so it's a starting point.
      </>
    ),
    change:
      "One draw call per record or batch from the CPU, without indirect arguments.",
  },
  {
    piece: "Vertex data",
    today: "Vertex pulling from storage buffers.",
    change:
      "Attributes, as in compatibility mode's second path, with per-draw data in uniform buffers or data textures.",
  },
  {
    piece: "Fragment tables and translucency",
    today: (
      <>
        Materials, lights and clip boxes in storage buffers. Translucency uses
        atomic lists written from <C>surface.slang</C>'s fragments.
      </>
    ),
    change:
      "Data textures for the tables. A different translucency method, which won't match pixel for pixel.",
  },
  {
    piece: "Styles and custom shaders",
    today: (
      <>
        <C>styleExpression.ts</C> emits WGSL, and <C>CustomShader</C> takes it.
      </>
    ),
    change:
      "A GLSL emitter or an intermediate form. WGSL user shaders don't port. Slang ones might.",
  },
  {
    piece: "Reading back",
    today:
      "Picks and depth through compute and buffers. Queries through compute traversal.",
    change:
      "Another path for picks and depth, and queries on their CPU backend.",
  },
  {
    piece: "Clip space and targets",
    today: "Reverse-Z on depth32float, and HDR in rgba16float.",
    change:
      "To check against WebGL 2's clip range and its float-target extensions.",
  },
];

const PieceTable = ({
  label,
  rows,
}: {
  label: string;
  rows: { piece: string; today: ReactNode; change: ReactNode }[];
}) => (
  <DataTable
    label={label}
    columns={[
      { head: "Piece", cell: (r) => r.piece },
      { head: "Today", cell: (r) => r.today },
      { head: "What it would take", cell: (r) => r.change },
    ]}
    rows={rows}
  />
);

/** The three ways to reach browsers without core WebGPU, and their work. */
export function ReachOptions() {
  return (
    <Section title="Devices without core WebGPU: three options">
      <p>
        There are three ways to reach them, and none is chosen. The work is read
        from the code as it stands, and nothing here has been run. The overall
        plan keeps WebGPU uncompromised while the prototype is built.
      </p>
      <div className="options">
        {COLUMNS.map((column) => (
          <section className="option" key={column.key}>
            <h3>{column.title}</h3>
            <dl>
              {OPTIONS.map((r) => (
                <div key={r.row}>
                  <dt>{r.row}</dt>
                  <dd>{r[column.key]}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <h3>What compatibility mode is today</h3>
      <ul>
        <li>
          An opt-in subset for older devices: a page passes{" "}
          <C>featureLevel: "compatibility"</C> to <C>requestAdapter</C> (
          <Cite id="compatIntent" />
          ). The specification lists its limit defaults (<Cite id="webgpu" />
          ).
        </li>
        <li>
          It shipped in Chrome 146 on OpenGL ES 3.1, "starting with Android".
          The same post says the team is exploring ChromeOS on OpenGL ES 3.1 and
          Windows on Direct3D 11 (<Cite id="chrome146" />
          ). The posts for Chrome 147 to 156 don't mention it again.
        </li>
        <li>
          Requesting <C>core-features-and-limits</C> on a device lifts all of
          its restrictions, where the adapter offers that (
          <Cite id="compatLesson" />
          ). 99.07% of browsers tested for that feature have it (
          <Cite id="surveyCore" />
          ), which doesn't say how many offered only a compatibility adapter.
        </li>
        <li>
          Firefox "is considering" it, and shipping in Safari is "not
          anticipated" (<Cite id="compatIntent" />, January 2026).
        </li>
      </ul>
      <Note title="Where the sources disagree">
        <p>
          The intent to ship says compatibility mode would be available on
          Android, ChromeOS, Mac and Windows "where hardware support is
          available". The Chrome 146 post says Android first, with the others
          being explored. Chromium's blocklist blocks the D3D11 backend (
          <Cite id="blocklist" />
          ), and Dawn calls it not ready for production (
          <Cite id="dawn" />
          ). So this page treats Windows on D3D11 as not available.
        </p>
      </Note>

      <h3>The work for compatibility mode</h3>
      <p>
        Restrictions are from <Cite id="compatLesson" /> and{" "}
        <Cite id="compatProposal" />, and the rest from reading the shaders and
        layouts. These fit already: 13 varyings against a limit of 15, no cube
        arrays, no fine derivatives, no format reinterpretation.
      </p>
      <PieceTable
        label="Compatibility mode, piece by piece"
        rows={COMPAT_PIECES}
      />
      <p>
        Not checked: uniform blocks against the default 16,384-byte limit,
        read-only storage textures, the default pools against these devices'
        memory, and whether later features behind the seams, such as bindless,
        would exist there at all.
      </p>

      <h3>The work for a WebGL 2 renderer</h3>
      <p>
        WebGL 2 has no compute, storage buffers or indirect draws, so a thin
        backend can't carry today's renderer. This is section 13.17's view, with
        the 43 compute entry points grouped from the code.
      </p>
      <PieceTable
        label="A WebGL 2 renderer, piece by piece"
        rows={WEBGL_PIECES}
      />
      <Written
        from="the overall plan, sections 3.1, 13.15 and 13.17, and the engine's shaders, layouts and passes"
        on="2026-11-08"
      />
    </Section>
  );
}

type Evidence = "Primary" | "Survey" | "Report" | "Listing";

const FEDERAL: { fact: ReactNode; evidence: Evidence; source: SourceId }[] = [
  {
    fact: "BOD 26-04, of 10 June 2026, replaces BOD 19-02 and BOD 22-01 for federal civilian systems. It excludes national security systems and certain Department of War and Intelligence Community systems.",
    evidence: "Primary",
    source: "cisa",
  },
  {
    fact: "Chrome's Stable channel moved to a 2-week cycle in version 153. Extended Stable ships a milestone every 8 weeks, with weekly security refreshes.",
    evidence: "Primary",
    source: "extendedStable",
  },
  {
    fact: "None of the 36 rule titles in the Chrome STIG V2R11, of 15 May 2025, covers 3D APIs, hardware acceleration or WebGPU.",
    evidence: "Listing",
    source: "stig",
  },
  {
    fact: "Disable3DAPIs stops pages reaching the GPU, and names WebGL. Turning off hardware acceleration has the same effect. The page doesn't mention WebGPU.",
    evidence: "Primary",
    source: "disable3d",
  },
  {
    fact: 'WebGPU is off when "Use graphics acceleration when available" is off, and the adapter is then null.',
    evidence: "Primary",
    source: "troubleshooting",
  },
  {
    fact: "The public visiting US government sites, in the 30 days before 5 February 2025: Chrome 53.4%, Safari 24.4%, Edge 14.5%, Firefox 2.9%, computed from its user counts. This isn't agency staff, and it has no versions.",
    evidence: "Survey",
    source: "usaAnalytics",
  },
];

const VDI: { fact: ReactNode; evidence: Evidence; source: SourceId }[] = [
  {
    fact: "Azure Virtual Desktop renders sessions with the CPU by default. Using the GPU takes a GPU-optimized VM size, Azure's drivers, a policy and a restart.",
    evidence: "Primary",
    source: "azure",
  },
  {
    fact: "Chrome 124 on an EC2 g4dn under Windows Server 2022: requestAdapter failed while WebGL 2 worked. Posters said Chrome saw only Microsoft's basic render driver, and that WebGPU is blocklisted on WARP. No resolution shows.",
    evidence: "Report",
    source: "ec2Thread",
  },
  {
    fact: "WebGPU on EC2 failed when tests ran unattended, and worked with a remote desktop connected.",
    evidence: "Report",
    source: "unattendedThread",
  },
  {
    fact: "As of Chrome 136, Chrome had not shipped fallback adapters, so no software WebGPU reaches users that way.",
    evidence: "Primary",
    source: "chrome136",
  },
  {
    fact: "The blocklist blocks CPU adapters and the D3D11 backend.",
    evidence: "Primary",
    source: "blocklist",
  },
  {
    fact: "Chromium has deprecated the automatic SwiftShader fallback for WebGL. Context creation is to fail instead, unless started with --enable-unsafe-swiftshader. So WebGL 2 in sessions with no GPU isn't a safe assumption either.",
    evidence: "Primary",
    source: "swiftshader",
  },
];

const VENDORS = [
  { vendor: "Apple", share: "32.52%" },
  { vendor: "Intel", share: "32.35%" },
  { vendor: "NVIDIA", share: "15.93%" },
  { vendor: "AMD", share: "8.73%" },
  { vendor: "ARM", share: "5.81%" },
  { vendor: "Qualcomm", share: "4.46%" },
];

const PRODUCTS: { product: string; states: ReactNode; source: SourceId[] }[] = [
  {
    product: "LuciadRIA",
    states:
      'Release 2026.0, of February 2026: "This transition replaces WebGL as the underlying graphics API", and applications must be served through HTTPS. Its setup page for 2026.1.01 calls WebGPU well supported on Windows and Mac, with Linux still in development. Neither page says whether a WebGL path remains.',
    source: ["luciadGuide", "luciadSetup"],
  },
  {
    product: "APS Viewer v8 preview",
    states:
      "Renders with WebGPU, and WebGL only as a fallback for hardware without it. Developers can force WebGL, and the post calls it already deprecated. The post gives 1 February 2027 for v8 becoming the default, and 31 July 2027 for the end of v7's support.",
    source: ["aps"],
  },
  {
    product: "Figma",
    states:
      "Renders with WebGPU, and can fall back to WebGL, including mid-session. It blocklists devices by their fallback rates.",
    source: ["figma"],
  },
  {
    product: "deck.gl v9",
    states:
      'WebGPU support is "still a work in progress and is not production ready". Its table marks 32 layers as working on WebGPU, and 7 CARTO layers as not.',
    source: ["deckgl"],
  },
  {
    product: "MapLibre GL JS",
    states:
      "The roadmap lists a WebGPU backend beside the WebGL 2 renderer, with no dates. A proof-of-concept pull request opened in April 2026 is closed.",
    source: ["maplibre", "maplibrePr"],
  },
  {
    product: "Mapbox GL JS v3",
    states:
      'WebGL 2 is mandatory, and WebGL 1 support was discontinued. The guide doesn\'t mention WebGPU. An issue titled "WebGPU support?" has been open since April 2020.',
    source: ["mapbox", "mapboxIssue"],
  },
  {
    product: "ArcGIS Maps SDK for JavaScript 5.1",
    states:
      "Only WebGL 2, 64-bit browsers: Chrome and Edge 146 or later, Firefox 151 or 140 ESR, Safari 18 or later. The page doesn't mention WebGPU.",
    source: ["arcgis"],
  },
  {
    product: "three.js",
    states:
      "Ships a WebGPURenderer. Its migration guide lists changes to it in the steps from r181 to r187.",
    source: ["threeMigration"],
  },
  {
    product: "Babylon.js",
    states:
      "WebGL and WebGPU are maintained side by side. An existing WebGPU scene can't swap to WebGL for WebXR, so an application chooses up front.",
    source: ["babylon"],
  },
  {
    product: "Unity 6.2",
    states: "WebGPU is marked experimental. WebGL 2 is the default.",
    source: ["unity"],
  },
  {
    product: "CesiumJS 1.140",
    states:
      "Billboards and labels require WebGL 2, or WebGL 1 with two named capabilities.",
    source: ["cesium1140"],
  },
];

const ISOLATION: { fact: ReactNode; evidence: Evidence; source: SourceId }[] = [
  {
    fact: "Canvas Remoting supports 2D canvas contexts only. WebGL and WebGPU contexts and 3D graphics applications are listed as not supported.",
    evidence: "Primary",
    source: "cloudflareCanvas",
  },
  {
    fact: "Sites that use WebGL may not function under Browser Isolation, and it isn't supported in virtual machines.",
    evidence: "Primary",
    source: "cloudflareLimits",
  },
  {
    fact: "Turbo Mode sends rendering to the local machine as a WebGL instruction set. The post doesn't mention WebGPU or 3D canvases.",
    evidence: "Primary",
    source: "zscaler",
  },
  {
    fact: 'A 2021 post: "WebGL, in particular, is often disabled in virtualized environments". It doesn\'t mention WebGPU.',
    evidence: "Primary",
    source: "menlo",
  },
];

const DEPLOYMENT: { fact: ReactNode; evidence: Evidence; source: SourceId }[] =
  [
    {
      fact: (
        <>
          Without <C>'wasm-unsafe-eval'</C> in <C>script-src</C>, WebAssembly is
          blocked. <C>'unsafe-eval'</C> also permits it, and overrides the
          first.
        </>
      ),
      evidence: "Primary",
      source: "cspScript",
    },
    {
      fact: (
        <>
          Workers are governed by <C>worker-src</C>, then <C>child-src</C>,{" "}
          <C>script-src</C> and <C>default-src</C>.
        </>
      ),
      evidence: "Primary",
      source: "cspWorker",
    },
    {
      fact: "Cesium ion Self-Hosted deploys on Kubernetes, and can run in disconnected, air-gapped environments.",
      evidence: "Primary",
      source: "ionSelfHosted",
    },
    {
      fact: "ArcGIS Enterprise on Kubernetes needs the organization's own container registry when disconnected, and its default basemaps and Living Atlas aren't supported there.",
      evidence: "Primary",
      source: "esriDisconnected",
    },
    {
      fact: "Mapbox Atlas runs behind a firewall, including on air-gapped networks.",
      evidence: "Primary",
      source: "atlas",
    },
    {
      fact: "The Section 508 standards require content and applications to conform to WCAG 2.0 Level A and AA.",
      evidence: "Primary",
      source: "section508",
    },
    {
      fact: "ArcGIS's JavaScript SDK supports keyboard navigation in 2D and 3D, gives the view an ARIA role of application, and takes a label and description. The page describes no alternative to the scene's content.",
      evidence: "Primary",
      source: "esriAccessibility",
    },
  ];

const FactTable = ({
  label,
  rows,
}: {
  label: string;
  rows: { fact: ReactNode; evidence: Evidence; source: SourceId }[];
}) => (
  <DataTable
    label={label}
    columns={[
      { head: "What the source says", cell: (r) => r.fact },
      { head: "Evidence", cell: (r) => r.evidence },
      { head: "Source", cell: (r) => <Cite id={r.source} /> },
    ]}
    rows={rows}
  />
);

/** The cited research: facts only, each with what kind of evidence it is. */
export function ReachFacts() {
  return (
    <>
      <Section title="What's known about who's blocked">
        <p>
          The labels say what each fact rests on. <strong>Primary</strong> is a
          vendor or government page about its own product or rule.{" "}
          <strong>Survey</strong> is a share of one site's reports or visitors.{" "}
          <strong>Report</strong> is one person's post about one case.{" "}
          <strong>Listing</strong> is a third party's copy of a primary
          document. Each page was re-opened on the date in the sources below,
          and anything that couldn't be confirmed was dropped.
        </p>
        <h3>Reach, and why two figures differ</h3>
        <DataTable
          label="WebGPU and WebGL 2 reach"
          columns={[
            { head: "API", cell: (r) => r.api },
            { head: "Measure", cell: (r) => r.measure },
            { head: "Figure", numeric: true, cell: (r) => r.figure },
            { head: "Evidence", cell: () => "Survey" },
            { head: "Source", cell: (r) => <Cite id={r.source} /> },
          ]}
          rows={
            [
              {
                api: "WebGPU",
                measure: "Global usage, by browser version",
                figure: "88.63%",
                source: "caniuse",
              },
              {
                api: "WebGPU",
                measure: "Reports with a working adapter",
                figure: "81.18%",
                source: "survey",
              },
              {
                api: "WebGL 2",
                measure: "Global usage, by browser version",
                figure: "97.29%",
                source: "webgl2Usage",
              },
              {
                api: "WebGL 2",
                measure: "Reports, of which 6.33% may run slowly",
                figure: "98.21%",
                source: "webgl2Survey",
              },
            ] satisfies {
              api: string;
              measure: string;
              figure: string;
              source: SourceId;
            }[]
          }
        />
        <p>
          The two count different things, and neither source explains the gap
          between them. By browser, the same survey has a working adapter on
          Edge 92.58%, Safari 82.62%, Chrome 81.47% and Firefox 60.95%. Chrome's
          intent to ship says 31% of its Windows users don't have Direct3D
          feature level 11.1 or higher, and 23% of Android users don't have
          Vulkan 1.1, 15% no Vulkan at all (<Cite id="compatIntent" />
          ). Feature level 11.1 isn't the same as failing to create a device,
          since Dawn also accepts 11.0 with binding tier 2 (<Cite id="dawn" />
          ).
        </p>
        <h3>Federal systems</h3>
        <p>
          We found no public source on the browsers, GPUs or graphics policy of
          federal desktops, and didn't search for those of defense or classified
          networks, which stay unknown. What follows is the policy around them.
        </p>
        <FactTable label="Federal systems" rows={FEDERAL} />
        <h3>Virtual desktops</h3>
        <FactTable label="Virtual desktops" rows={VDI} />
      </Section>

      <Section title="GPU vendors">
        <p>
          No source we opened describes commercial or government fleets. These
          describe other populations.
        </p>
        <DataTable
          label="Share of Web3D Survey's working adapters by vendor"
          columns={[
            { head: "Vendor", cell: (r) => r.vendor },
            {
              head: "Share of its reports",
              numeric: true,
              cell: (r) => r.share,
            },
          ]}
          rows={VENDORS}
        />
        <p className="provenance">
          From <Cite id="survey" />, which states no period. This isn't market
          share: it depends on which sites run the script and who has a working
          adapter.
        </p>
        <ul>
          <li>
            Shipments: 75.5 million PC GPUs in Q2 2026. Share rose 0.46% for
            NVIDIA and 0.6% for AMD, and fell 1.0% for Intel (
            <Cite id="jpr" />
            ). These are shipments, not machines in use.
          </li>
          <li>
            Steam's October 2026 survey has 90.63% of cards at DirectX 12, and
            publishes no vendor totals (<Cite id="steam" />
            ). It describes people who play games.
          </li>
          <li>
            Dawn needs D3D12 feature level 11.1, or 11.0 with binding tier 2;
            Vulkan 1.1; or Metal 2.3 on macOS 13 or later (<Cite id="dawn" />
            ). The floor is an API, not a vendor.
          </li>
        </ul>
      </Section>

      <Section title="Browser isolation">
        <p>
          Remote browser isolation runs the page somewhere else and sends the
          result on, so it can stand between an application and the GPU,
          whatever the browser's version. None of the pages we opened documents
          WebGPU working through one, and we found no figure for how much
          traffic is isolated. Nothing here has been tested.
        </p>
        <FactTable label="Browser isolation" rows={ISOLATION} />
      </Section>

      <Section title="Deployment requirements">
        <h3>Content security policy</h3>
        <p>
          The engine runs WebAssembly (Draco, meshopt, Basis) in its workers,
          and the page bundle has no WebAssembly and no <C>eval</C>. It was
          tested with a page served <C>script-src 'self'</C>, apart from an
          example's own inline script, and a same-origin worker served{" "}
          <C>script-src 'self' 'wasm-unsafe-eval'</C>. A worker from another
          origin starts through a <C>blob:</C> URL, so that page's policy must
          allow it. This is from the overall plan, section 13.12.
        </p>
        <h3>Air-gapped use</h3>
        <p>
          The engine's reference data downloads today into a store outside the
          repository, so a disconnected deployment has to supply it. A separate
          optional data package is proposed and not built. The overall plan,
          section 13.24, records what its author read of each data source's
          terms. That reading needs legal confirmation before anything ships.
        </p>
        <h3>Accessibility</h3>
        <p>
          We found no rule specific to 3D canvases, and didn't check whether
          agencies now ask for a later WCAG version. How the engine and its
          widgets meet this hasn't been reviewed.
        </p>
        <h3>What the sources say</h3>
        <FactTable label="Deployment requirements" rows={DEPLOYMENT} />
      </Section>

      <Section title="Other engines and comparable products">
        <p>
          What each one's own pages say it requires or does, as read. No
          statement on a page doesn't mean no work is under way.
        </p>
        <DataTable
          label="Other engines and comparable products"
          columns={[
            { head: "Product", cell: (r) => r.product },
            { head: "What its pages say", cell: (r) => r.states },
            { head: "Evidence", cell: () => "Primary" },
            {
              head: "Source",
              cell: (r) =>
                r.source.map((id, i) => (
                  <span key={id}>
                    {i > 0 ? ", " : ""}
                    <Cite id={id} />
                  </span>
                )),
            },
          ]}
          rows={PRODUCTS}
        />
      </Section>

      <Section title="Short notes">
        <ul>
          <li>
            <strong>iPad.</strong> WebGPU in Safari there needs iPadOS 26. On 7
            June 2026, 68% of devices transacting on the App Store used it, and
            79% of iPhones used iOS 26 (
            <Cite id="appleShare" />
            ). Trimble Connect's mobile floor is iOS 18, with iOS 26 recommended
            (
            <Cite id="trimble" />
            ).
          </li>
          <li>
            <strong>WebXR.</strong> With Safari 26.2 on visionOS, WebXR supports
            WebGPU (<Cite id="webkit262" />
            ). Chrome's status for that integration reads "No active
            development" (<Cite id="chromeXr" />
            ). The engine has no WebXR path.
          </li>
          <li>
            <strong>Slang.</strong> Slang has been under multi-company
            governance at Khronos since November 2024, licensed under Apache 2.0
            (
            <Cite id="slangKhronos" />
            ), and its newest release is v2026.21 (
            <Cite id="slangReleases" />
            ). The engine compiles its shaders at build time.
          </li>
          <li>
            <strong>Community.</strong> npm's weekly downloads rose between the
            first weeks of November 2025 and 2026: three from 2.9 to 34.6
            million, and <C>@webgpu/types</C> from 2.2 to 14.4 million. So did
            lodash, which has no WebGPU work, from 74.6 to 204.7 million (
            <Cite id="npm" />
            ). So these counts don't show demand for WebGPU. We found no survey
            of developers on it.
          </li>
        </ul>
      </Section>

      <Section title="What we need to measure">
        <ul>
          <li>
            <strong>Intel and AMD.</strong> UHD 7xx and Iris Xe on Windows 11,
            an integrated and a discrete Radeon, with driver versions and any
            device loss.
          </li>
          <li>
            <strong>Safari and Firefox.</strong> Real runs, starting with the
            WebKit failure above. Linux and Android too.
          </li>
          <li>
            <strong>Compatibility adapters.</strong> On real OpenGL ES 3.1
            devices, the limits they offer, above all storage buffers in the
            fragment stage, and whether they offer indirect draws as the engine
            uses them.
          </li>
          <li>
            <strong>The WebGL 2 spike.</strong> Slang to GLSL ES on two kernels
            and one material, as section 13.17 says.
          </li>
          <li>
            <strong>Virtual desktops.</strong> In each of Citrix, Omnissa
            Horizon, Azure Virtual Desktop, Windows 365, Amazon WorkSpaces and
            plain remote desktop, with and without a GPU: <C>requestAdapter</C>{" "}
            at both feature levels, a device with the engine's real limits, and
            WebGL 2 in the same session, attended and unattended.
          </li>
          <li>
            <strong>Managed images.</strong> A hardened browser image, with the
            acceleration and 3D policies on and off.
          </li>
          <li>
            <strong>Browser isolation.</strong> Ask vendors, then test: an
            adapter, a device and WebGL 2 through each isolation mode.
          </li>
          <li>
            <strong>Reach over time.</strong> A dated series of our own. Web3D
            Survey's page publishes no history or dates.
          </li>
          <li>
            <strong>Reach where it counts.</strong> Adapter success, vendor and
            limits, and WebGL 2 success, from real deployments and counted per
            organization. One image or desktop pool decides for everyone on it,
            so a share of users doesn't say this. For federal users, ask
            directly.
          </li>
        </ul>
      </Section>
    </>
  );
}
