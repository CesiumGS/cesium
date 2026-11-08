import { useId } from "react";
import { C, DataTable, Figure, Page, Section, Written } from "../parts.tsx";

interface TreeNode {
  id: string;
  x: number;
  y: number;
  sub: string;
  parent?: string;
  /** Not in the tree until an application makes one. */
  added?: boolean;
}

const W = 138;
const H = 54;

const NODES: TreeNode[] = [
  { id: "ICRF", x: 450, y: 16, sub: "the root" },
  { id: "HCRS", x: 20, y: 110, sub: "ephemeris", parent: "ICRF" },
  { id: "EARTH_ICRF", x: 180, y: 110, sub: "ephemeris", parent: "ICRF" },
  { id: "GCRF", x: 450, y: 110, sub: "ephemeris", parent: "ICRF" },
  { id: "MOON_ICRF", x: 730, y: 110, sub: "ephemeris", parent: "ICRF" },
  {
    id: "EME2000",
    x: 180,
    y: 204,
    sub: "a constant rotation",
    parent: "EARTH_ICRF",
  },
  { id: "ITRF", x: 450, y: 204, sub: "Earth orientation", parent: "GCRF" },
  { id: "MOON_ME", x: 730, y: 204, sub: "ephemeris", parent: "MOON_ICRF" },
  {
    id: "Engineering",
    x: 360,
    y: 298,
    sub: "PROJ and grids",
    parent: "ITRF",
    added: true,
  },
  {
    id: "Local",
    x: 540,
    y: 298,
    sub: "app-defined",
    parent: "ITRF",
    added: true,
  },
  {
    id: "MOON_PA",
    x: 730,
    y: 298,
    sub: "a constant rotation",
    parent: "MOON_ME",
  },
];

function FrameTree() {
  const titleId = useId();
  const byId = new Map(NODES.map((n) => [n.id, n]));
  return (
    <svg viewBox="0 0 900 370" role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        The reference frame tree. ICRF is the root, with HCRS, EARTH_ICRF, GCRF
        and MOON_ICRF under it. EME2000 is under EARTH_ICRF, ITRF under GCRF,
        and MOON_ME then MOON_PA under MOON_ICRF. Engineering and local
        reference frames hang under ITRF when an application makes them.
      </title>
      {NODES.filter((n) => n.parent).map((n) => {
        const p = byId.get(n.parent!)!;
        const x1 = p.x + W / 2;
        const y1 = p.y + H;
        const x2 = n.x + W / 2;
        const y2 = n.y;
        const mid = (y1 + y2) / 2;
        return (
          <path
            key={n.id}
            className="d-edge"
            strokeWidth={1.5}
            strokeDasharray={n.added ? "5 4" : undefined}
            d={`M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`}
          />
        );
      })}
      {NODES.map((n) => (
        <g key={n.id}>
          <rect
            className={
              n.added
                ? "d-box-plain"
                : n.id === "ITRF"
                  ? "d-box d-box-accent"
                  : "d-box"
            }
            x={n.x}
            y={n.y}
            width={W}
            height={H}
            rx={8}
          />
          <text className="d-title d-mono" x={n.x + 12} y={n.y + 23}>
            {n.id}
          </text>
          <text className="d-text" x={n.x + 12} y={n.y + 42}>
            {n.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}

const PROVIDERS = [
  {
    frame: "EME2000, MOON_PA",
    provider: "None: a constant rotation from the parent",
    loads: "Nothing of its own",
  },
  {
    frame: "ITRF",
    provider: "Earth orientation",
    loads: "The IAU 2006/2000A series, EOP and leap seconds",
  },
  {
    frame: "GCRF, EARTH_ICRF, HCRS, MOON_ICRF, MOON_ME",
    provider: "Ephemeris",
    loads: "The planets and Moon packs from DE440",
  },
  {
    frame: "An engineering frame",
    provider: "Coordinate service",
    loads: "PROJ and its grids",
  },
  { frame: "A trajectory", provider: "Trajectory", loads: "Its OEM or SPK" },
];

const DATA = [
  {
    what: "Planets and lunar orientation",
    source:
      "NAIF's de440s.bsp and moon_pa_de440_200625.bpc, excerpted into packs",
    credit: "NAIF",
  },
  {
    what: "Leap seconds",
    source: "naif0012.tls built in; Leap_Second.dat when it expires later",
    credit: "IERS",
  },
  {
    what: "Earth orientation",
    source: "EOP-All.csv",
    credit: "IERS, via CelesTrak",
  },
  {
    what: "Grids",
    source: "PROJ-data 1.25.0, pinned by SHA-256",
    credit: "See its license list",
  },
];

export function Frames() {
  return (
    <Page
      title="Frame tree"
      status="sketch"
      lede={
        <>
          1.x keeps content and the camera in one Earth-fixed space. 2.0 has a
          tree of reference frames: a question such as "where is the Moon in
          this site's engineering frame, at this time, and how fast is it
          moving?" has one answer, with its accuracy stated.
        </>
      }
    >
      <Section title="The tree">
        <Figure
          scroll
          label="Reference frame tree"
          caption="Each box names what its provider needs. Dashed boxes join the tree when an application makes them, and trajectories hang wherever they were defined. ITRF is highlighted because it's where the Earth's content lives."
        >
          <FrameTree />
        </Figure>
        <Written
          from={
            <>
              <C>src/frames/frames.ts</C> and <C>src/frames/catalog.ts</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Providers load on demand">
        <p>
          A globe-only app pays for none of this. Each reference frame in the
          catalog names its provider, and asking for a reference frame states
          the precision wanted. It runs at the highest precision anyone has
          asked for. Loading is asynchronous and cancellable, and queries stay
          synchronous.
        </p>
        <DataTable
          label="Providers"
          columns={[
            { head: "Reference frame", cell: (r) => r.frame },
            { head: "Provider", cell: (r) => r.provider },
            { head: "Loads", cell: (r) => r.loads },
          ]}
          rows={PROVIDERS}
        />
        <p>
          While precise data loads, a reference frame runs on its declared
          stand-in if it has one, stating that stand-in's accuracy, and its
          revision goes up when the data arrives. Without a stand-in, a query
          throws a named error until the data loads. Reference frames throw, and
          rendering falls back.
        </p>
      </Section>

      <Section title="The sky in a globe-only app">
        <p>
          It asks for GCRF and the Sun at analytic precision: IAU 1976
          precession with sidereal time, no nutation, and the Meeus sun and
          Moon. That loads no series tables and no data. It is GCRF's declared
          stand-in, with a stated accuracy of 0.0023° (about 8″) from the IAU
          2006/2000A model.
        </p>
      </Section>

      <Section title="Accuracy is part of the answer">
        <p>
          A stated accuracy never claims more than its inputs support, and
          "can't tell" is an honest answer. Reference frames and points carry
          accuracy statements (<C>Frame.accuracy</C>, <C>pointAccuracy</C>), and
          revisions let anything that cached an answer know when a route has
          changed.
        </p>
      </Section>

      <Section title="The data behind it">
        <DataTable
          label="Data sources"
          columns={[
            { head: "What", cell: (r) => r.what },
            { head: "Source", cell: (r) => r.source },
            { head: "Credit", cell: (r) => r.credit },
          ]}
          rows={DATA}
        />
        <p>
          Downloads are checked against pinned hashes, written on your machine
          by <C>npm run setup</C> and never redistributed by this repository.
        </p>
        <Written
          from="the package README, the plan 5 spec, section 7.7, and the catalog"
          on="2026-11-08"
        />
      </Section>

      <Section title="Still to write">
        <ul>
          <li>How an engineering frame is placed, and its grid factors.</li>
          <li>Two-vector reference frames, from sub-plan 5b.</li>
          <li>
            Validation: what SPICE and NGS fixtures check, and to what
            tolerance.
          </li>
        </ul>
      </Section>
    </Page>
  );
}
