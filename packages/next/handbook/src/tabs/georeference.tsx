import { useId } from "react";
import { Sec, OnThisPage, useSectionLinks } from "../anchors.tsx";
import { FrameTick } from "../flows.tsx";
import { snippetText } from "../snippets.ts";
import {
  C,
  CodeBlock,
  DataTable,
  Figure,
  Note,
  Page,
  Written,
} from "../parts.tsx";

/** Text where `backticked` names are code. */
function Ticks({ text }: { text: string }) {
  return (
    <>
      {text
        .split("`")
        .map((part, i) => (i % 2 === 1 ? <C key={i}>{part}</C> : part))}
    </>
  );
}

const SECTIONS = [
  { id: "placement", title: "Frames and placement" },
  { id: "georeference", title: "Georeference" },
  { id: "crs", title: "CRSs and the 3D Tiles 2.0 extensions" },
  { id: "grid", title: "Grid and ground distance" },
  { id: "tilesets", title: "Tilesets under nodes" },
  { id: "bentley", title: "What may still need an extension" },
  { id: "catalogue", title: "The frame catalogue" },
] as const;

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
    sub: "site transform",
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

const KINDS = [
  {
    what: "What it names",
    frame:
      "A body's own reference systems: ICRF, GCRF, ITRF, EME2000, a Moon's mean-Earth and principal-axis frames, a trajectory's",
    placement: "A CRS: the coordinates a piece of content was made in",
  },
  {
    what: "Question it answers",
    frame:
      "Where is the Moon in this site's engineering frame, at this time, and how fast is it moving?",
    placement:
      "Where does this model go on the Earth, and how do I get back to its own coordinates?",
  },
  {
    what: "Where its data is",
    frame: "Ephemerides, Earth orientation, leap seconds: `src/frames/`",
    placement:
      "The content's declaration: its CRS, its site transform, its anchor: `src/georeference/` and `/proj`",
  },
  {
    what: "In the transform graph",
    frame: "Affine nodes (`graphOfFrames`), on demand",
    placement:
      "A chain of nodes from the CRS to a body frame: affine for a site transform, smooth for a projection",
  },
];

const CRS_ROUTES = [
  {
    crs: "Geocentric (ECEF, ITRF; EPSG:4978)",
    route:
      "None, or a transformation between frames when the epochs or datums differ",
    edge: "Identity",
    built:
      "Place the anchor at ITRF (a tileset's default). Content already in the body's frame is drawn as it is",
  },
  {
    crs: "Geographic (longitude, latitude, height)",
    route:
      "A datum shift when it isn't the body's, then geographic to geocentric",
    edge: "Smooth, compiled",
    built:
      "`geographicToGeocentric`. A datum shift or any PROJ operation is `reprojectionWarp(operation)` from `/proj`, which is fitted",
  },
  {
    crs: "Projected (x, y, height in a 2D projection)",
    route: "The projection's inverse to geographic, then as above",
    edge: "Smooth, compiled",
    built:
      "`utmToGeographic`, `transverseMercatorToGeographic`, `lambertConformalConicToGeographic` or `webMercatorToGeographic`, under `geographicToGeocentric`",
  },
  {
    crs: "Compound (horizontal plus vertical)",
    route:
      "The vertical CRS's step to ellipsoidal height, then as projected or geographic",
    edge: "Smooth, compiled",
    built:
      "The nodes above take ellipsoidal heights. Geoid models (`GeoidModel`) are in `/proj`",
  },
  {
    crs: "Local, with `EXT_georeference`",
    route:
      "The node's translation, rotation and scale (the site transform), then the anchor's east-north-up frame, then geocentric",
    edge: "Rigid (affine)",
    built:
      "An affine node: no smooth edge, so no warp and no pipeline. The site transform is what an engineering frame holds",
  },
  {
    crs: "Local, with neither",
    route: "No route",
    edge: "—",
    built: "The engine says so rather than guess",
  },
];

const THREE = [
  {
    distance: "Grid",
    where: "The CRS's own node (the projection's plane)",
    what: "Scaled by the projection: about 0.9996 on UTM's central meridian, 1 some 180 km out, and growing beyond",
  },
  {
    distance: "Ground",
    where: "A true node: the body's frame (ITRF)",
    what: "What a tape measures, at the surface",
  },
  {
    distance: "Drawn",
    where: "The camera's node",
    what: "Whatever the nodes above the content do to it, an exaggeration included",
  },
];

const OPEN = [
  {
    what: "A declared coordinate operation and its accuracy",
    why: "A CRS says where content is, not which operation the producer used to move it there. Two operations between the same CRSs can differ by metres (a ballpark transformation against a gridded one), so a producer who reprojected needs to say which, as WKT2's `COORDINATEOPERATION` or `BOUNDCRS`, for a consumer to reproduce the placement exactly.",
  },
  {
    what: "`IfcMapConversionScaled`'s scale semantics",
    why: "A node's scale and an `EXT_georeference` anchor carry IFC's origin, rotation and one scale. IFC's separate horizontal and vertical factors, and what they scale (grid or ground distances), may not fit. Left open.",
  },
  {
    what: "Alignments",
    why: "Nothing in the four extensions carries alignment geometry, so `BENTLEY_alignments` stays a proposal.",
  },
  {
    what: "The site transform at the tileset level",
    why: "`EXT_georeference` is on a glTF node, so a tileset whose tiles all share a site transform either repeats it per tile or declares it once. A tileset-level declaration may remain, as what `BENTLEY_engineering_frame` holds, with no mode.",
  },
];

export function Georeferencing() {
  useSectionLinks(
    "georeferencing",
    SECTIONS.map((s) => s.id),
  );
  return (
    <Page
      title="Georeferencing"
      status="current"
      lede={
        <>
          Georeferencing places content on a body: it takes a model made in some
          coordinate system to where it goes, and back again. The content&apos;s
          declared CRS selects the route, so there is no placement mode. The
          route is a chain of nodes in the{" "}
          <a href="#/transform-graph">transform graph</a>: affine for a site
          transform, smooth for a projection.
        </>
      }
    >
      <OnThisPage tab="georeferencing" items={SECTIONS} />

      <Note title="How much of this is built">
        <p>
          Built: the reprojection nodes (UTM, transverse Mercator, Lambert
          conformal conic, Web Mercator, and their inverses to geographic,
          compiled to the GPU), tilesets placed under a node (
          <C>TilesetOptions.anchor</C> and{" "}
          <C>rootTransform: &quot;none&quot;</C>
          ), and <C>Georeference</C> as the name of the core interface. Not yet:{" "}
          <C>Georeference</C> still carries a <C>mode</C> field, and{" "}
          <C>georeferenceTileset</C> still reads a tileset&apos;s{" "}
          <C>BENTLEY_engineering_frame</C> with its placement mode. Removing
          both, and reading the glTF-level <C>EXT_geospatial_crs</C> and{" "}
          <C>EXT_georeference</C>, belong to the API review. Until then a
          projected tileset is placed by building its nodes, as the gallery
          example does.
        </p>
      </Note>

      <Sec id="placement" title="Frames and placement">
        <p>
          Two things sit near each other and are not the same. The{" "}
          <strong>frame catalogue</strong> is the engine&apos;s knowledge of
          reference systems: ICRF, ITRF, the Moon&apos;s frames, with the
          ephemerides and Earth orientation that move them. It is data feeding
          the graph. <strong>Placement</strong> is about content: a model made
          in a CRS, and the route that takes it to a body&apos;s frame. The
          catalogue is why the module is called <C>frames</C> and not{" "}
          <C>georeference</C>: georeferencing names placing <em>content</em>.
        </p>
        <DataTable
          label="Frames against placement"
          columns={[
            { head: "", cell: (r) => <strong>{r.what}</strong> },
            { head: "Frame catalogue", cell: (r) => <Ticks text={r.frame} /> },
            {
              head: "Placement",
              cell: (r) => <Ticks text={r.placement} />,
            },
          ]}
          rows={KINDS}
        />
        <Written
          from="the overall plan, sections 13.26 and 13.37"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="georeference" title="Georeference">
        <p>
          <C>Georeference</C> replaces <C>DesignPlacement</C>, the 3D Tiles and
          CAD term for it. It is just the route from the content&apos;s CRS to
          the body frame, and the exact way back:
        </p>
        <ul>
          <li>
            <C>frameName</C>: the reference frame the design coordinates are in.
          </li>
          <li>
            <C>displayed(design)</C>: body-fixed metres of a design point, as
            this placement draws it.
          </li>
          <li>
            <C>designOf(position)</C>: the design coordinates of a drawn
            position, the exact inverse of <C>displayed</C>, so a measurement
            agrees with the CAD data.
          </li>
          <li>
            <C>displayError(design)</C>: how far the placement draws a design
            point from where it truly is, in metres. 0 when the route is the
            projection itself.
          </li>
        </ul>
        <p>
          The core never builds one. <C>readGeoreference</C> and{" "}
          <C>georeferenceTileset</C> from <C>/proj</C> read a tileset&apos;s
          declaration and set one, and an application may set its own. With the
          graph, the route <em>is</em> nodes, so what it says is also available
          through <C>pickIn</C>, <C>pointIn</C> and <C>measureIn</C> in any node
          of it.
        </p>
        <Written
          from={
            <>
              <C>src/georeference/georeference.ts</C> and the overall plan,
              section 13.26
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="crs" title="CRSs and the 3D Tiles 2.0 extensions">
        <p>
          The 3D Tiles 2.0 draft lists four glTF 2.1 extensions, optional, in
          CesiumGS/glTF&apos;s <C>3d-tiles-2.0</C> branch (read 2026-11-11):
        </p>
        <ul>
          <li>
            <strong>
              <C>EXT_geospatial_crs</C>
            </strong>{" "}
            declares an asset&apos;s CRS, overriding glTF&apos;s own coordinate
            system. It has a type: <em>geographic</em> (longitude, latitude,
            height), <em>geocentric</em> (global x, y, z), <em>projected</em>{" "}
            (x, y, height in a 2D projection), <em>compound</em> (horizontal
            plus vertical) or <em>local</em> (x, y, z). A CRS&apos;s axes and
            units are its own.
          </li>
          <li>
            <strong>
              <C>EXT_geospatial_crs_wkid</C>
            </strong>
            : an <C>authority</C> and an integer <C>wkid</C>, an optional{" "}
            <C>vcsWkid</C> for a vertical CRS and an optional <C>epoch</C> for a
            dynamic one.{" "}
            <strong>
              <C>EXT_geospatial_crs_wkt2</C>
            </strong>
            : a WKT2 string.
          </li>
          <li>
            <strong>
              <C>EXT_georeference</C>
            </strong>{" "}
            on a node: anchors its local origin at a longitude, latitude and
            height on WGS 84 (or the declared CRS&apos;s ellipsoid), rotated to
            east-north-up, <em>after</em> the node&apos;s own transform.
          </li>
        </ul>
        <p>
          So the declared CRS&apos;s <strong>type selects the route</strong>:
          the mode said something the CRS already says.
        </p>
        <DataTable
          label="CRS type to route"
          columns={[
            { head: "Declared CRS", cell: (r) => <Ticks text={r.crs} /> },
            {
              head: "Route to the body frame",
              cell: (r) => <Ticks text={r.route} />,
            },
            { head: "Edge", cell: (r) => r.edge },
            { head: "Nodes, as built", cell: (r) => <Ticks text={r.built} /> },
          ]}
          rows={CRS_ROUTES}
        />
        <p>
          The built-in projections run grid to geographic, each with its own IR
          source, so a node over projected content compiles: its vertices are
          carried to body-fixed metres in the vertex stage, exact at any
          distance from the anchor, where a single rigid transform sags away
          from it.
        </p>
        <Written
          from={
            <>
              the overall plan, section 13.26, <C>src/georeference/</C> and{" "}
              <C>src/engineering/georeference.ts</C>
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="grid" title="Grid and ground distance">
        <p>
          The real distinction underneath the old modes is grid against ground
          distances, and it is a property of the CRS. A design in a projected
          CRS has <strong>grid</strong> distances, scaled by the projection:
          reprojecting is right. A design meant to keep its dimensions on the
          ground belongs in an <strong>engineering CRS</strong> with a site
          transform, which is a rigid edge. IFC carries the difference in{" "}
          <C>IfcMapConversionScaled</C>&apos;s scale factors.
        </p>
        <p>
          Because a measurement is taken in a named node, all three distances
          between two points are one call each (<C>measureIn</C>). The gallery
          example&apos;s BIM-site scene reads them side by side.
        </p>
        <DataTable
          label="Three distances between two points"
          columns={[
            { head: "Distance", cell: (r) => <strong>{r.distance}</strong> },
            { head: "Measured in", cell: (r) => r.where },
            { head: "What it is", cell: (r) => r.what },
          ]}
          rows={THREE}
        />
        <Written
          from="the overall plan, section 13.26, and examples/transform-graph"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="tilesets" title="Tilesets under nodes">
        <p>
          A tileset is placed under a node by giving it an anchor bound to the
          node&apos;s frame (<C>TilesetOptions.anchor</C>,{" "}
          <C>FramesResolver.bindAnchor</C>): its tiles are then in the
          frame&apos;s own coordinates and drawn through the route to the
          camera. Two cases:
        </p>
        <ul>
          <li>
            A tileset whose root <C>transform</C> carries body-fixed (ECEF)
            metres, as most do, belongs in a frame whose local coordinates are
            body-fixed: an exaggeration over ITRF, say.
          </li>
          <li>
            A tileset authored in a projected CRS belongs in the frame of that
            CRS, with <C>rootTransform: &quot;none&quot;</C>. Its root transform
            is only the rigid placement of its design coordinates at an anchor,
            so the tiles stay in design coordinates and the nodes <em>are</em>{" "}
            the projection. <C>modelMatrix</C> still applies; the tileset&apos;s
            declared <C>placement</C> describes the rigid transform it declares,
            not this drawing; and the route is the way back to design
            coordinates (<C>pickIn</C>).
          </li>
        </ul>
        <CodeBlock language="ts" code={snippetText("georeference.next.ts")} />
        <p>
          The gallery example&apos;s third scene does this for a port in
          Jakarta, in UTM 48S under the exaggeration, and reads grid, ground and
          drawn distances through <C>measureIn</C>.
        </p>
        <Written
          from={
            <>
              <C>TilesetOptions</C> in <C>src/streaming/tilesetTypes.ts</C>, the
              commit that added <C>rootTransform</C>, and{" "}
              <C>examples/transform-graph</C>
            </>
          }
          on="2026-11-12"
        />
      </Sec>

      <Sec id="bentley" title="What may still need an extension">
        <p>
          Each of these is to be checked against the draft&apos;s text before it
          is proposed, and none is needed to remove the mode. The{" "}
          <a href="#/specs">Spec extensions tab</a> holds the proposals.
        </p>
        <DataTable
          label="What the 2.0 extensions may not cover"
          columns={[
            { head: "What", cell: (r) => <strong>{r.what}</strong> },
            { head: "Why", cell: (r) => <Ticks text={r.why} /> },
          ]}
          rows={OPEN}
        />
        <Written
          from="the overall plan, section 13.26 (“Decided: no placement modes”)"
          on="2026-11-12"
        />
      </Sec>

      <Sec id="catalogue" title="The frame catalogue">
        <p>
          1.x keeps content and the camera in one Earth-fixed space. 2.0 has a
          tree of reference frames, so a question such as &quot;where is the
          Moon in this site&apos;s engineering frame, at this time, and how fast
          is it moving?&quot; has one answer, with its accuracy stated.
        </p>
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

        <h3>One tick of answering</h3>
        <p>
          The camera layer&apos;s question goes through one interface, so what
          answers it can be replaced. Without the frames module, the core&apos;s
          transform table answers instead.
        </p>
        <Figure caption="A query is always synchronous, and data arrives later. That's why every route has a revision: it says when an earlier answer is out of date, without the clock moving.">
          <FrameTick />
        </Figure>

        <h3>Providers load on demand</h3>
        <p>
          A globe-only app pays for none of this. Each reference frame in the
          catalog names its provider, and asking for a reference frame states
          the level wanted: <C>&quot;analytic&quot;</C> or{" "}
          <C>&quot;precise&quot;</C>. The levels choose a model and its data, so
          they set accuracy; values are float64 at both. A reference frame runs
          at the highest level anyone has asked for. Loading is asynchronous and
          cancellable, and queries stay synchronous.
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
          While its full data loads, a reference frame runs on its declared
          stand-in if it has one, stating that stand-in&apos;s accuracy, and its
          revision goes up when the data arrives. Without a stand-in, a query
          throws a named error until the data loads. Reference frames throw, and
          rendering falls back.
        </p>

        <h3>The sky in a globe-only app</h3>
        <p>
          It asks for the <C>&quot;analytic&quot;</C> level: IAU 1976 precession
          with sidereal time, no nutation, and the Meeus sun and Moon. That
          loads no series tables and no data. The stand-ins state their own
          accuracy: ITRF&apos;s is 18″ (0.005°) from IAU 2006/2000A with the
          EOP, a bound from its parts. The Moon is Meeus&apos;s chapter 47:
          within 16″ and 27 km of DE440 from the Earth, sampled daily over 2000
          to 2050, and within 20.9″ and 36.5 km in the Earth-fixed sky. The
          Precision and accuracy tab lists the rest.
        </p>

        <h3>Accuracy is part of the answer</h3>
        <p>
          A stated accuracy never claims more than its inputs support, and
          &quot;can&apos;t tell&quot; is an honest answer. Reference frames and
          points carry accuracy statements (<C>Frame.accuracy</C>,{" "}
          <C>pointAccuracy</C>), and revisions let anything that cached an
          answer know when a route has changed. A smooth node adds its own, and{" "}
          <C>accuracyAlong</C> carries a point&apos;s σ through the whole route:
          see the <a href="#/transform-graph">Transform graph tab</a>.
        </p>

        <h3>The data behind it</h3>
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

        <h3>Still to write</h3>
        <ul>
          <li>Two-vector reference frames, from sub-plan 5b.</li>
          <li>
            Validation: what SPICE and NGS fixtures check, and to what
            tolerance.
          </li>
          <li>
            Reading the glTF-level <C>EXT_geospatial_crs</C> and{" "}
            <C>EXT_georeference</C>, with the API review.
          </li>
        </ul>
      </Sec>
    </Page>
  );
}
