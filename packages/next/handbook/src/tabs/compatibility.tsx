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
import { WEBGPU_USAGE } from "../sources.ts";

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
          The engine needs core WebGPU. By usage share that reaches about 89% of
          browsers worldwide, and by working adapters about 81% of the devices
          one survey sees. Its largest gaps are Linux, older Android devices and
          Firefox outside Windows and macOS.
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
            <strong>{WEBGPU_USAGE} of global browser usage</strong> has WebGPU:
            86.83% full and 1.8% partial, per <Cite id="caniuse" />, using
            StatCounter for October 2026.
          </li>
          <li>
            <strong>81.18% of reports</strong> returned a working adapter, per{" "}
            <Cite id="survey" />, with 0.04% of those a fallback adapter.
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
          spec's defaults and checked by a test. Capacities, such as table rows
          and arena bytes, are data: they grow toward the device's limits.
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
            <C>SubmissionMode</C>'s <C>"direct"</C> may avoid it. We haven't
            reproduced it, or tried that. The overall plan, section 13.23, holds
            the work.
          </p>
        </Note>
      </Section>

      <ReachOptions />
      <ReachFacts />

      <Sources
        ids={[
          "impl",
          "caniuse",
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
        ]}
      />
    </Page>
  );
}
