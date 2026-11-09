import { useId } from "react";
import {
  C,
  Cite,
  CodeBlock,
  DataTable,
  Figure,
  Page,
  Section,
  Sources,
  Written,
} from "../parts.tsx";
import { snippetText } from "../snippets.ts";

const OWNS = [
  {
    what: "Engine",
    owns: "The GPU device, pipelines, the request scheduler, the workers and the loop. It lists every view and tileset.",
    relation: "It makes worlds and views.",
  },
  {
    what: "World",
    owns: "The geometry arena, material table, texture sets, draw records, transform table, anchors and items.",
    relation: "Any number per engine. Content in one isn't in another.",
  },
  {
    what: "View",
    owns: "A camera, a target, its exposure and lighting, and where each anchor sits in its render space.",
    relation:
      "Any number per engine. Each shows one world, and worlds can have several.",
  },
  {
    what: "Tileset",
    owns: "Content: the tile tree, its selection and cache, loaded tiles' geometry and transforms, its attributions, and a second position if the content has one.",
    relation: "Belongs to one world, and hangs under one anchor.",
  },
  {
    what: "Scene item",
    owns: "One drawing of a tileset: its placement, tint, opacity, view mask, show flag and shader, and a draw record and draw item per draw.",
    relation: "Any number per tileset, in a flat list on the world.",
  },
  {
    what: "Anchor",
    owns: "A top-level transform whose place in render space is set per view. It names a reference frame.",
    relation:
      "Any number per world. Content under it keeps anchor-relative transforms.",
  },
  {
    what: "Reference frame",
    owns: "Where one frame is in another at a time, as a tree. Hierarchy lives here.",
    relation: "The core's resolver answers, or the optional frames module.",
  },
];

const SHARED = [
  {
    level: "One per engine",
    things: "The GPU device, pipelines, request windows per origin, the loop",
  },
  {
    level: "One per world",
    things:
      "The geometry arena, material and draw record tables, transforms, anchors",
  },
  {
    level: "One per tileset, whatever its items",
    things:
      "The tile tree, selection, cache, bounds, attributions, loaded geometry and transforms",
  },
  {
    level: "One per item",
    things:
      "Placement, tint, opacity, view mask, show, shader. Per draw: a draw record, a draw item, and a material where its look needs one",
  },
  {
    level: "One per view",
    things:
      "The camera, target and exposure, a selection pass, the cull's results, where each anchor sits",
  },
];

const RULES: { rule: string; detail: string }[] = [
  {
    rule: "Selection decides, then the mask",
    detail:
      "A view draws an item's tile only where selection chose that tile for the view too. A view no item shows selects and fetches nothing.",
  },
  {
    rule: "A tileset with no items",
    detail:
      "It selects nothing and sleeps, and its tiles stay cached until eviction. loadTileset alone fetches no content and takes no ticks.",
  },
  {
    rule: "Bounds",
    detail:
      "A tile's bounds grow by the farthest its items can move a vertex, and each draw is culled by its own item's. A hidden item doesn't pad them.",
  },
  {
    rule: "Below opacity 1",
    detail:
      "Only the translucent passes draw the item. It writes no depth, casts no shadow, takes no ambient occlusion and isn't picked. At 0 it isn't drawn.",
  },
  {
    rule: "Placement",
    detail:
      "Where each vertex is drawn, from the tile's position at 0 to its second position at 1, written in the content by a CESIUM_dual_position declaration. Setting it writes 4 bytes. Without a second position, it can only be 0.",
  },
  {
    rule: "Picks and snaps",
    detail:
      "They report the item they hit. Content coordinates exist only at placement 0 or 1, since between them a point has none.",
  },
  {
    rule: "Ground and collision",
    detail:
      "On each tile, the first opaque item that draws it carries these, so removing an item doesn't drop content from height queries or clamping.",
  },
  {
    rule: "After removal",
    detail:
      "A setter on a removed item keeps its value and does nothing else. world.add makes a new one.",
  },
];

/** What owns what, and what's shared, with one tileset drawn twice. */
function SceneMap() {
  const titleId = useId();
  return (
    <svg viewBox="0 0 940 640" role="img" aria-labelledby={titleId}>
      <title id={titleId}>
        An engine holds one world and two views. In the world, one tileset holds
        the tree, one selection, one cache and the loaded tiles. Two scene items
        in a flat list draw that tileset, each with its own placement and look.
        They become draw records, one per item per draw, sharing the tiles'
        meshes and transforms. The tileset hangs under an anchor. Each view
        shows the world and sets where the anchor sits in its render space.
        Below the engine, a reference frame tree holds the hierarchy and answers
        where the anchor is.
      </title>

      <rect className="d-box" x={10} y={10} width={920} height={500} rx={8} />
      <text className="d-title" x={28} y={36}>
        Engine
      </text>
      <text className="d-text" x={96} y={36}>
        One GPU device, pipelines, the request scheduler, workers and the loop
      </text>

      <rect
        className="d-box-accent"
        x={28}
        y={52}
        width={610}
        height={444}
        rx={6}
        fillOpacity={0.25}
      />
      <text className="d-title" x={44} y={76}>
        World
      </text>
      <text className="d-text" x={100} y={76}>
        Geometry arena, materials, transforms
      </text>

      <rect className="d-box" x={44} y={92} width={262} height={204} rx={6} />
      <text className="d-title" x={58} y={116}>
        Tileset: the content
      </text>
      {[
        "The tile tree",
        "One selection, a pass per view",
        "One cache",
        "Bounds, from the farthest item",
        "Loaded tiles' meshes, transforms",
        "Its attributions",
        "A second position, if it has one",
      ].map((line, i) => (
        <text className="d-text" x={58} y={142 + i * 22} key={line}>
          {line}
        </text>
      ))}

      <text className="d-title" x={352} y={106}>
        world.items: a flat list
      </text>
      {[
        { y: 116, name: "Item 1", a: "placement 0, opaque", b: "all views" },
        {
          y: 208,
          name: "Item 2",
          a: "placement 1, opacity 0.4",
          b: "one view",
        },
      ].map((item) => (
        <g key={item.name}>
          <rect
            className="d-box"
            x={352}
            y={item.y}
            width={268}
            height={80}
            rx={6}
          />
          <text className="d-title" x={366} y={item.y + 24}>
            {item.name}
          </text>
          <text className="d-text" x={366} y={item.y + 46}>
            {item.a}
          </text>
          <text className="d-text" x={366} y={item.y + 66}>
            {item.b}
          </text>
          <path
            className="d-edge"
            strokeWidth={1.5}
            d={`M352 ${item.y + 40} H306 M316 ${item.y + 34} L306 ${item.y + 40} L316 ${item.y + 46}`}
          />
        </g>
      ))}
      <text className="d-text" x={329} y={186} textAnchor="middle">
        draws
      </text>

      <rect className="d-box" x={44} y={312} width={576} height={72} rx={6} />
      <text className="d-title" x={58} y={336}>
        Draw records, one per item per draw
      </text>
      <text className="d-text" x={58} y={358}>
        Each has its own tint, opacity, view mask and placement.
      </text>
      <text className="d-text" x={58} y={376}>
        The mesh and transform are shared. Nothing walks a tree per tick.
      </text>

      <rect className="d-box" x={44} y={400} width={576} height={80} rx={6} />
      <text className="d-title" x={58} y={424}>
        Anchor
      </text>
      <text className="d-text" x={58} y={446}>
        A top-level transform that names a reference frame.
      </text>
      <text className="d-text" x={58} y={466}>
        The tileset hangs under it, by default the Earth's.
      </text>

      {[
        { y: 52, name: "View 1" },
        { y: 280, name: "View 2" },
      ].map((view) => (
        <g key={view.name}>
          <rect
            className="d-box"
            x={682}
            y={view.y}
            width={232}
            height={200}
            rx={6}
          />
          <text className="d-title" x={696} y={view.y + 26}>
            {view.name}
          </text>
          {[
            "A camera and a target",
            "Exposure and lighting",
            "A selection pass",
            "The cull's results",
            "Where each anchor sits",
            "in its render space",
          ].map((line, i) => (
            <text
              className="d-text"
              x={696}
              y={view.y + 52 + i * 22}
              key={line}
            >
              {line}
            </text>
          ))}
          <path
            className="d-edge"
            strokeWidth={1.5}
            d={`M682 ${view.y + 100} H638 M648 ${view.y + 94} L638 ${view.y + 100} L648 ${view.y + 106}`}
          />
          <text className="d-text" x={660} y={view.y + 90} textAnchor="middle">
            shows
          </text>
        </g>
      ))}

      <rect
        className="d-box-plain"
        x={28}
        y={534}
        width={884}
        height={92}
        rx={6}
        strokeWidth={1.5}
      />
      <text className="d-title" x={44} y={560}>
        Reference frame tree
      </text>
      <text className="d-text" x={44} y={584}>
        The hierarchy is here: ICRF, ITRF, a site's engineering frame and more.
      </text>
      <text className="d-text" x={44} y={606}>
        The core's resolver answers, or the optional frames module.
      </text>
      <path
        className="d-edge"
        strokeWidth={1.5}
        d="M560 534 V480 M554 490 L560 480 L566 490"
      />
      <text className="d-text" x={572} y={522}>
        where the anchor is, at this time
      </text>
    </svg>
  );
}

export function Scene() {
  return (
    <Page
      title="Scene representation"
      status="current"
      lede={
        <>
          An engine holds worlds and views. A tileset is content, and a scene
          item is that content drawn once in a world, as often as asked. Items
          are a flat list, and hierarchy stays with the reference frame tree.
        </>
      }
    >
      <Section title="What owns what">
        <Figure
          scroll
          label="The engine, a world, a tileset with two items, and two views"
          caption="One tileset drawn by two items and shown in two views. One device, one selection and one cache serve all of it. Worlds, tilesets and views can each be several."
        >
          <SceneMap />
        </Figure>
        <DataTable
          label="What each owns, and how they relate"
          columns={[
            { head: "Object", cell: (r) => r.what },
            { head: "What it owns", cell: (r) => r.owns },
            { head: "How it relates", cell: (r) => r.relation },
          ]}
          rows={OWNS}
        />
        <Written
          from={
            <>
              <C>src/scene/Engine.ts</C>, <C>src/scene/World.ts</C>,{" "}
              <C>src/scene/world</C>, <C>src/scene/View.ts</C>,{" "}
              <C>src/scene/SceneItem.ts</C> and{" "}
              <C>src/streaming/Tileset3D.ts</C>
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="Loading, then adding">
        <p>
          <C>engine.loadTileset</C> gives the content, and <C>world.add</C> puts
          it in a world. <C>engine.addTileset</C> does both, with one item at{" "}
          <C>tileset.items[0]</C>. The engine gives items no meaning: an
          application decides what each stands for.
        </p>
        <CodeBlock language="ts" code={snippetText("scene.next.ts")} />
        <p className="provenance">
          This compiles against the real types as part of a test.
        </p>
      </Section>

      <Section title="What's shared, and what isn't">
        <DataTable
          label="What's shared at each level"
          columns={[
            { head: "Level", cell: (r) => r.level },
            { head: "What", cell: (r) => r.things },
          ]}
          rows={SHARED}
        />
        <p>
          So a further item costs little: after the first, about 550 bytes a
          draw, by the code's reckoning, with nothing loaded twice. Tint and
          opacity write a draw record per loaded draw, so a colour that changes
          every tick costs less as a custom shader's uniform.
        </p>
        <h3>How items behave</h3>
        <DataTable
          label="How scene items behave"
          columns={[
            { head: "Case", cell: (r) => r.rule },
            { head: "What happens", cell: (r) => r.detail },
          ]}
          rows={RULES}
        />
      </Section>

      <Section title="A flat list, not a scene graph">
        <p>
          GPU-driven drawing wants flat records: compute culls a table of draw
          records, and indirect draws consume the result. A tree walked per tick
          would add work the renderer has no use for, so nothing walks{" "}
          <C>world.items</C> per draw, and an item is a set of records once it's
          added.
        </p>
        <p>
          Hierarchy has a home already. An item hangs under its tileset's
          anchor, an anchor names a reference frame, and the frame tree answers
          where one frame is in another at a given time. So there's one tree,
          and it describes where things are, not how they're drawn.
        </p>
      </Section>

      <Section title="What's limited today">
        <ul>
          <li>
            <strong>One world.</strong> A tileset belongs to the first world
            it's added to. Adding it to another throws.
          </li>
          <li>
            <strong>Rigid normals on placed vertices.</strong> A vertex moved by
            a placement keeps its rigid normal: off by 0.197° on the 44 km
            corridor, and 0.225° calculated at 50 km.
          </li>
          <li>
            <strong>Instanced draws take no placement.</strong> A draw that
            can't take a second position, instanced or with no such attribute,
            is drawn at its own position by the item holding the tile's draws,
            and the tileset warns.
          </li>
          <li>
            <strong>Only tilesets are items.</strong> Models aren't items yet,
            and a globe's surface isn't one: <C>world.add</C> refuses a globe's
            tileset.
          </li>
        </ul>
      </Section>

      <Section title="What's planned">
        <p>
          The small version is what's built. Two pieces of work are planned,
          with no dates. A later brainstorm (overall plan, section 13.25) takes
          up models and per-node transforms as items, the globe as an item, one
          tileset across worlds, groups and editing, before or with the API
          review. An architectural review (section 13.26) looks at geometry
          through placement: one model of a placement, normals, and what's
          carried per vertex or per instance.
        </p>
        <h3>Related work being looked at</h3>
        <p>
          These are being read as related work, and nothing here says how
          they'll relate to this engine or to each other.
        </p>
        <ul>
          <li>
            <strong>glTF 2.1,</strong> in the open at Khronos. Its tracking
            issue says the specification is under active development, with
            schema and normative text to follow. It lists a way for a glTF file
            to reference external glTF files, and per-node bounding volumes (
            <Cite id="gltf21" />
            ).
          </li>
          <li>
            <strong>OpenUSD.</strong> Its glossary calls a prim "the primary
            container object in USD", and a payload a composition arc that gives
            a "deferred reference" behaviour (<Cite id="usdGlossary" />
            ). The Alliance for OpenUSD promotes interoperability through it (
            <Cite id="aousd" />
            ).
          </li>
        </ul>
        <Written
          from="the overall plan, sections 13.25 and 13.26"
          on="2026-11-08"
        />
      </Section>

      <Sources ids={["gltf21", "usdGlossary", "aousd"]} />
    </Page>
  );
}
