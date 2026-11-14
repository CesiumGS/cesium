import type { ReactNode } from "react";
import { data } from "../data.ts";
import {
  C,
  Cite,
  DataTable,
  Figure,
  Generated,
  Note,
  Page,
  Section,
  Sources,
  Written,
} from "../parts.tsx";
import { ReachFacts, ReachOptions } from "../reach.tsx";

const SUPPORT: { browser: string; platform: string; state: ReactNode }[] = [
  {
    browser: "Chrome, Edge",
    platform: "Windows x86-64, macOS, ChromeOS",
    state: "Since 113",
  },
  {
    browser: "Chrome, Edge",
    platform: "Android",
    state:
      "Since 121 on ARM, Qualcomm and Intel GPUs with Android 12 or later; since 139 on Imagination with Android 16 or later. Samsung Xclipse and others: to be decided.",
  },
  {
    browser: "Chrome, Edge",
    platform: "Linux",
    state:
      "Since 144 on Intel Gen12 and later; since 147 on NVIDIA with driver 535.183.01 or later under Wayland. Others behind flags.",
  },
  {
    browser: "Chrome, Edge",
    platform: "Windows ARM64",
    state: "Behind a flag",
  },
  { browser: "Firefox", platform: "Windows", state: "Since 141" },
  {
    browser: "Firefox",
    platform: "macOS",
    state: "145 on macOS 26 and later; 147 on all macOS versions",
  },
  {
    browser: "Firefox",
    platform: "Linux, Android",
    state:
      "Not on by default: Nightly or a preference. Mozilla expects Linux in 2026, and Android work in 2026.",
  },
  {
    browser: "Safari",
    platform: "macOS, iOS, iPadOS, visionOS",
    state: "Since 26, enabled by default",
  },
];

const PLATFORMS = [
  { name: "Chromium OS", value: 92.84 },
  { name: "macOS", value: 91.14 },
  { name: "iOS", value: 87.76 },
  { name: "Windows", value: 83.28 },
  { name: "Android", value: 72.83 },
  { name: "Linux", value: 18.79 },
];

const DISAGREEMENTS = [
  <>
    Firefox: <Cite id="impl" /> says shipped on Windows since 141, while{" "}
    <Cite id="caniuse" /> lists every Firefox version as disabled by default.
  </>,
  <>
    Desktop Safari: <Cite id="impl" /> says enabled by default since 26, while{" "}
    <Cite id="caniuse" /> marks 26.0 onward as partial support.
  </>,
  <>
    Chrome for Android: <Cite id="impl" /> says since 121, while{" "}
    <Cite id="caniuse" /> shows only its one current version, 157.
  </>,
  <>
    The specification: <Cite id="caniuse" /> labels it a Working Draft, while{" "}
    <Cite id="webgpu" /> states Candidate Recommendation Draft.
  </>,
];

const FEATURES = [
  {
    name: "indirect-first-instance",
    use: "Draw records. An instance-step fallback is always compiled in.",
    without: "Fallback path",
  },
  {
    name: "timestamp-query",
    use: "GPU timing in benchmarks only",
    without: "No GPU timings",
  },
  {
    name: "texture-compression-bc, -etc2, -astc",
    use: "The KTX2 transcode target",
    without: "Another target",
  },
  {
    name: "subgroups",
    use: "Faster sorts and reductions, where a kernel has them",
    without: "Portable kernel paths",
  },
  {
    name: "immediates",
    use: "Per-draw constants through one seam (Chrome 149 and 150)",
    without: "An emulation behind the seam",
  },
  {
    name: "TRANSIENT_ATTACHMENT",
    use: "MSAA targets (Chrome 146)",
    without: "Ordinary attachments",
  },
];

const LIMITS = [
  {
    limit: "Storage buffers per stage",
    spec: "8",
    devices:
      "10 or more on 99% overall, 95% of Macs; 16 or more on 80%, 30% of Macs",
  },
  {
    limit: "Sampled textures per stage",
    spec: "16",
    devices:
      "44 or more on 91%. About 9% report 16: most of ChromeOS, a third of Linux",
  },
  {
    limit: "Largest storage binding",
    spec: "128 MiB",
    devices: "256 MiB or more on 98% overall, 74% of Android",
  },
  {
    limit: "Texture array layers",
    spec: "256",
    devices: "2048 or more on 99%",
  },
  {
    limit: "Bind groups",
    spec: "4",
    devices: "Exactly 4 on all Android and ChromeOS",
  },
];

export function Compatibility() {
  return (
    <Page
      title="Browser compatibility"
      status="current"
      lede={
        <>
          The engine needs core WebGPU. Between 7% and 18% of browsers lack it,
          and which end is nearer depends on what is counted: Can I use counts
          browser versions, and Web3D Survey counts working adapters. Its
          largest gaps are Linux, older Android devices and Firefox outside
          Windows and Apple Silicon Macs.
        </>
      }
    >
      <Section title="Who can run it">
        <DataTable
          label="WebGPU support per browser and platform"
          columns={[
            { head: "Browser", cell: (r) => r.browser },
            { head: "Platform", cell: (r) => r.platform },
            { head: "State", cell: (r) => r.state },
          ]}
          rows={SUPPORT}
        />
        <p className="provenance">
          From <Cite id="impl" />, edited 2 Oct 2026. Its flattened table
          doesn't show which of the Firefox Nightly and preference notes belongs
          to Linux and which to Android, so they're stated together.
        </p>
        <p>
          WebGPU needs a secure context. <Cite id="mdn" /> still marks it
          "Limited availability", not Baseline.
        </p>
      </Section>

      <Section title="How many people that is">
        <ul>
          <li>
            <strong>86.83% of global browser usage</strong> has WebGPU in full,
            and 3.32% more in part (Safari on macOS 1.80%, Firefox desktop
            1.52%), per <Cite id="caniuseData" />. Partial means only on some OS
            or CPU families.
          </li>
          <li>
            <strong>81.86% of reports</strong> returned a working adapter, per{" "}
            <Cite id="surveyR1" />, with 0.04% of those a fallback adapter.
          </li>
        </ul>
        <Figure caption="Share of Web3D Survey reports with a working WebGPU adapter, by platform. The page states no survey period.">
          <div className="bars">
            {PLATFORMS.map((p) => (
              <div className="bar-row" key={p.name}>
                <span>{p.name}</span>
                <span className="bar-track">
                  <span
                    className="bar"
                    style={{ inlineSize: `${p.value * 0.7}%` }}
                  />
                  <span className="bar-value">{p.value.toFixed(1)}%</span>
                </span>
              </div>
            ))}
          </div>
        </Figure>
        <Note title="Where the sources disagree">
          <ul>
            {DISAGREEMENTS.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          <p>
            The support table follows the working group's implementation status,
            which browser engineers maintain. These gaps should be resolved by
            testing, and the Can I use figure read with them in mind.
          </p>
        </Note>
      </Section>

      <Section title="The share without WebGPU: 7% to 18%">
        <p>
          Two public sources give two answers, and neither can narrow the other.
          The answer is a range, and no point inside it is better supported.
          Both were read on 13 Nov 2026.
        </p>
        <DataTable
          label="The share of browsers without WebGPU, by source"
          columns={[
            { head: "Source", cell: (r) => r.source },
            { head: "Without WebGPU", cell: (r) => r.without },
            { head: "What it measures", cell: (r) => r.measures },
          ]}
          rows={[
            {
              source: <Cite id="caniuseData" />,
              without:
                "7.42% of page views marked no, and 3.32% partial. 86.83% yes.",
              measures:
                "Whether a browser version ships it, weighted by StatCounter page views. It can't see the operating system, GPU or driver, so it overstates who has WebGPU. The partial class enables it on some operating systems or CPU families only.",
            },
            {
              source: <Cite id="surveyR1" />,
              without: "18.14% of reports. 81.86% had a working adapter.",
              measures:
                "Whether requestAdapter() worked in a real browser. The sample is whoever ran the survey's script, so it leans to developers, test sites and automated runs. The page states no date or period.",
            },
          ]}
        />
        <ul>
          <li>
            Behind the 7.42%: Safari on iOS 18 and earlier (3.00%), old Chrome
            (1.35%), Safari on macOS 18 and earlier (1.11%), old Firefox desktop
            (0.60%), UC Browser (0.58%) and Firefox for Android (0.38%).
          </li>
          <li>
            By platform, the survey has no working adapter in 80.6% of Linux
            reports, 23.4% of Android, 15.6% of Windows, 12.0% of iOS, 9.0% of
            macOS and 6.7% of ChromeOS. Linux is the nearest proxy for the
            population with no WebGPU.
          </li>
          <li>
            WebGL 2 is almost universal: 97.29% of page views by Can I use and
            98.27% of tested reports by the survey, with 5.97% of those flagged
            as possibly running in software.
          </li>
        </ul>
        <Note title="The earlier single figure">
          <p>
            This tab used to state 88.63% from Can I use, read on 8 Nov. That is
            the 86.83% yes plus 1.80% partial. The data read on 13 Nov also has
            Firefox desktop's 1.52% as partial, 3.32% in all, so counting every
            partial browser would give 90.15%. The "yes" figure didn't change,
            so the difference is which browsers were counted, not a new month.
            The survey's figure moved from 81.18% to 81.86% between the two
            reads, with no period stated. Neither is a number to quote alone.
          </p>
        </Note>
        <h3>What a WebGL 2 renderer would need of those browsers</h3>
        <p>
          The research note behind the WebGL 2 plan (R1, reviewed and accepted
          by the owner) sets a floor and names no browser list. The floor is a
          WebGL 2 context, <C>EXT_color_buffer_float</C> (99.95% of reports,
          99.67% on Linux, the lowest platform), a texture size of at least
          4096, 4 samples, 4 draw buffers, a uniform block of 16384 bytes and 16
          vertex texture units. Every report in the survey meets all of them. A
          device below it is refused with a message that names what is missing.
          Everything else is a reported path with a fallback: log depth through{" "}
          <C>EXT_clip_control</C>, multi-draw, linear and blendable float
          textures, the timer query and parallel shader compile. Firefox lacks{" "}
          <C>WEBGL_multi_draw</C>, the timer query and parallel shader compile,
          and added <C>EXT_clip_control</C> in 159 (<Cite id="firefox159" />
          ). Safari's float filtering and blending sit at 53% to 58%.
        </p>
        <p>
          The plan orders the renderer's later steps by this: FXAA, clips, the
          depth-range readback, shadows, ambient occlusion, 16-bit moments, and
          32-bit moments only where <C>EXT_float_blend</C> exists. Browser
          sniffing decides nothing. The renderer is planned and nothing of it is
          built.
        </p>
        <Written
          from="docs/superpowers/plans/2026-11-13-webgl2-r1-browser-reach.md and the WebGL 2 renderer plan"
          on="2026-11-13"
        />
      </Section>

      <Section title="The standard">
        <p>
          WebGPU is a W3C Candidate Recommendation Draft (<Cite id="webgpu" />,
          15 Sep 2026), and so is WGSL (<Cite id="wgsl" />, 6 Nov 2026). Both
          still change in small ways.
        </p>
      </Section>

      <Section title="What the engine requires of a device">
        <p>
          Core WebGPU, by requesting <C>core-features-and-limits</C>.
          Compatibility mode is out of scope today, because it defaults{" "}
          <C>maxStorageBuffersInVertexStage</C> to 0, which rules out vertex
          pulling: the options below say what changing that would take. Chromium
          is the gate for releases; Safari and Firefox are best effort so far.
        </p>
        <h3>Optional features, each with a fallback</h3>
        <DataTable
          label="Optional features"
          columns={[
            { head: "Feature", cell: (r) => <C>{r.name}</C> },
            { head: "Used for", cell: (r) => r.use },
            { head: "Without it", cell: (r) => r.without },
          ]}
          rows={FEATURES}
        />
        <h3>Limits</h3>
        <p>
          Binding counts are written into shaders, so they're designed to the
          spec's defaults and checked by a test: the cull kernel binds eight
          storage buffers, the default limit, so it takes no more. Capacities,
          such as table rows and arena bytes, are data: they grow toward the
          device's limits.
        </p>
        <DataTable
          label="Limits and what devices report"
          columns={[
            { head: "Limit", cell: (r) => r.limit },
            { head: "Spec default", cell: (r) => r.spec },
            { head: "What devices report", cell: (r) => r.devices },
          ]}
          rows={LIMITS}
        />
        <Written
          from="the overall plan, sections 3.1 and 13.15, whose device figures were read from Web3D Survey in November 2026"
          on="2026-11-08"
        />
      </Section>

      <Section title="Where we've tested">
        <DataTable
          label="Tested adapters"
          columns={[
            { head: "GPU", cell: (r) => r.adapter },
            { head: "Browser", cell: () => "Chromium, through Playwright" },
            {
              head: "Suites",
              numeric: true,
              cell: (r) => Object.keys(r.suites).length,
            },
          ]}
          rows={data.bench.adapters}
        />
        <Generated from={<C>bench/results</C>} />
        <p>
          All of it comes from those two adapters, with none from Intel or AMD,
          and none on Linux or Android. Runs in Safari and Firefox aren't
          recorded here yet. A compatibility matrix from real runs would replace
          much of this tab's reliance on outside tables.
        </p>
        <p>
          The one try outside Chromium: the engine doesn't start in WebKit 27.2,
          driven by Playwright on a Mac, on 2026-11-08. Its compiler rejects a{" "}
          <C>workgroupBarrier</C> in <C>adapt.slang</C>, as needing uniform
          control flow, and Chrome's accepts it. Which is right hasn't been
          looked into, and Safari itself wasn't tried. Firefox 157 offered no
          adapter there, with WebGPU blocklisted.
        </p>
        <Note title="A reported risk, not yet tested: indirect draws on Intel integrated GPUs">
          <p>
            Intel's article reports a simple WebGPU application hanging with
            indirect draw calls on UHD 700 and Iris Xe GPUs under Windows 11:
            the driver fails to create a command allocator, and the device is
            removed with <C>DXGI_ERROR_DEVICE_REMOVED</C>. It lists no
            workaround (
            <Cite id="intel" />
            ). This engine renders with indirect draws by default, and{" "}
            <C>SubmissionMode</C>'s <C>"direct"</C> may avoid it, though point
            sets still draw from the cull there. We haven't reproduced it, or
            tried that. The overall plan, section 13.23, holds the work.
          </p>
        </Note>
      </Section>

      <ReachOptions />
      <ReachFacts />

      <Sources
        ids={[
          "impl",
          "caniuse",
          "caniuseData",
          "surveyR1",
          "firefox159",
          "mdn",
          "survey",
          "webgpu",
          "wgsl",
          "chrome146",
          "chrome136",
          "compatLesson",
          "compatProposal",
          "compatIntent",
          "blocklist",
          "dawn",
          "webgl2Usage",
          "webgl2Survey",
          "surveyCore",
          "swiftshader",
          "azure",
          "ec2Thread",
          "unattendedThread",
          "cisa",
          "extendedStable",
          "stig",
          "disable3d",
          "troubleshooting",
          "usaAnalytics",
          "intel",
          "jpr",
          "steam",
          "arcgis",
          "mapbox",
          "aps",
          "figma",
          "unity",
          "cesium1140",
          "cloudflareCanvas",
          "cloudflareLimits",
          "zscaler",
          "menlo",
          "cspScript",
          "cspWorker",
          "ionSelfHosted",
          "esriDisconnected",
          "atlas",
          "section508",
          "esriAccessibility",
          "luciadGuide",
          "luciadSetup",
          "deckgl",
          "maplibre",
          "maplibrePr",
          "mapboxIssue",
          "threeMigration",
          "babylon",
          "appleShare",
          "trimble",
          "webkit262",
          "chromeXr",
          "slangKhronos",
          "slangReleases",
          "npm",
        ]}
      />
    </Page>
  );
}
