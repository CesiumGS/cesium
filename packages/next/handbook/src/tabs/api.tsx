import { TextField } from "@mui/material";
import { Tabs } from "@stratakit/structures";
import { useMemo, useState } from "react";
import { count, data } from "../data.ts";
import { C, DataTable, Generated, Page, Section, Written } from "../parts.tsx";

const ENTRY_LABEL: Record<string, string> = {
  ".": "core",
  time: "time",
  frames: "frames",
  proj: "proj",
  measure: "measure",
  widgets: "widgets",
};

const ENTRY_PATH: Record<string, string> = {
  ".": "@cesium/next",
  time: "@cesium/next/time",
  frames: "@cesium/next/frames",
  proj: "@cesium/next/proj",
  measure: "@cesium/next/measure",
  widgets: "widgets/index.ts",
};

const KINDS = ["class", "function", "const", "interface", "type"];

const QUICK = `import { Viewer } from "./widgets/index.ts";

// A globe with terrain, imagery and controls, in one call.
const viewer = await Viewer.create(container);`;

const ENGINE = `import { Engine } from "@cesium/next";

// One GPU device, shared by every world and view.
const engine = await Engine.create();
const world = engine.createWorld();
const view = engine.addView({ target: canvas, world });

// Content arrives asynchronously and registers with its world.
await engine.addTileset(world, url);

// Picks read back from the GPU, so the answer is a promise.
const hit = await view.pick(x, y);`;

const TERRAIN = `const globe = await engine.addTerrain(world, url);

// A region, in geodetic degrees. Picks go on to what shows through it.
const site = globe.addTerrainTranslucency(
  { rectangle: { west: -75.6, south: 40.0, east: -75.5, north: 40.1 } },
  { opacity: 0.3, pickThrough: true },
);

// In place, with no recompile, so a fade can call it every tick.
globe.setTerrainTranslucency(site, { opacity: 0.5 });
globe.removeTerrainTranslucency(site);

// The whole globe. 1 is opaque again.
globe.setTerrainOpacity(0.6, { pickThrough: true });`;

const PRINCIPLES = [
  "Creation is asynchronous, and nothing has a ready flag.",
  "No update(frameState) contract: objects register with the world, and changes mark them dirty.",
  "Ownership is explicit: dispose(), and using where the language has it.",
  "Engine, World and View are separate, with any number of views per engine.",
  "The core touches no DOM. A smoke test runs it in a worker with an OffscreenCanvas.",
  "Math works on typed arrays, with required out parameters.",
  "Shaders extend through a versioned WGSL-level contract, with Slang as the first-class authoring language.",
  "UI and widgets live outside the core, and camera controllers are replaceable modules.",
];

function NameList({ entry }: { entry: string }) {
  const source = data.surface.entries.find((e) => e.entry === entry);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (source?.names ?? []).filter(
      (n) => q === "" || n.name.toLowerCase().includes(q),
    );
  }, [source, query]);
  return (
    <>
      <div className="api-tools">
        <TextField
          size="small"
          label={`Search ${ENTRY_LABEL[entry]}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span aria-live="polite">
          {shown.length} of {source?.total ?? 0} names
        </span>
      </div>
      {shown.length > 0 ? (
        <ul className="api-names">
          {shown.map((n) => (
            <li key={n.name}>
              <C>{n.name}</C>
              <span className="api-kind">
                {n.kind}
                {n.tier !== "-" ? `, ${n.tier}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          No name in this entry point contains that text. Try a shorter one.
        </p>
      )}
    </>
  );
}

export function Api() {
  const [selected, setSelected] = useState<string | null | undefined>(
    "entry-.",
  );
  const untiered = data.surface.tiers["-"] ?? 0;
  return (
    <Page
      title="Public API"
      status="sketch"
      lede={
        <>
          {count(data.surface.total)} exports across{" "}
          {data.surface.entries.length} entry points. The map below is read from{" "}
          <C>api/surface.txt</C>, which a test keeps in step with the code, so
          reviewing a change to the API means reading a diff of that file.
        </>
      }
    >
      <Section title="In brief">
        <pre className="snippet" tabIndex={0}>
          <code>{QUICK}</code>
        </pre>
        <p>For more control, the engine directly:</p>
        <pre className="snippet" tabIndex={0}>
          <code>{ENGINE}</code>
        </pre>
        <p className="provenance">
          Calls follow <C>src/scene/Engine.ts</C> and <C>widgets/Viewer.ts</C>;
          options are left out. The snippets aren't compiled yet.
        </p>
      </Section>

      <Section title="Translucent terrain">
        <p>
          Terrain is translucent in a region or everywhere, through four methods
          on a globe's <C>Tileset3D</C>. The Rendering tab shows how it draws.
        </p>
        <pre className="snippet" tabIndex={0}>
          <code>{TERRAIN}</code>
        </pre>
        <ul>
          <li>
            <C>addTerrainTranslucency(region, {"{ opacity, pickThrough }"})</C>{" "}
            takes a region as <C>addTerrainClip</C> does, with an opacity above
            0 and below 1, and returns a handle.
          </li>
          <li>
            <C>setTerrainTranslucency(handle, {"{ opacity, pickThrough }"})</C>{" "}
            changes either in place. To make a region opaque, remove it with{" "}
            <C>removeTerrainTranslucency</C>.
          </li>
          <li>
            <C>setTerrainOpacity(opacity, {"{ pickThrough }"})</C> applies to
            the whole globe, above 0 and up to 1. Where it meets a region, the
            least opacity wins, and a clip wins over both.
          </li>
          <li>
            <C>pickThrough</C> decides whether picks stop at the translucent
            ground or go on to what shows through it. Omitted, it's false for a
            new region, and <C>setTerrainTranslucency</C> and{" "}
            <C>setTerrainOpacity</C> keep the current value.
          </li>
        </ul>
        <p>
          Only a globe has terrain to make translucent, so these throw on any
          other tileset. Heights, terrain rays and clamping treat translucent
          terrain as ground.
        </p>
        <Written from={<C>src/streaming/Tileset3D.ts</C>} on="2026-11-08" />
      </Section>

      <Section title="The principles behind it">
        <ul>
          {PRINCIPLES.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <Written from="the overall plan, section 3.10" on="2026-11-08" />
      </Section>

      <Section title="The surface, by entry point">
        <DataTable
          label="Exports per entry point"
          columns={[
            { head: "Entry point", cell: (r) => <C>{ENTRY_PATH[r.entry]}</C> },
            ...KINDS.map((kind) => ({
              head: kind,
              numeric: true,
              cell: (r: (typeof data.surface.entries)[number]) =>
                r.kinds[kind] ?? 0,
            })),
            { head: "Total", numeric: true, cell: (r) => r.total },
          ]}
          rows={data.surface.entries}
        />
        <Generated from={<C>api/surface.txt</C>} />
        <p>
          Stability tiers are the map's fourth column, and {count(untiered)} of{" "}
          {count(data.surface.total)} names have none yet. Sub-plan 5i, the API
          review, assigns them and proposes moves. Until then, treat every name
          here as subject to change.
        </p>
        <Tabs.Provider selectedId={selected} setSelectedId={setSelected}>
          <Tabs.TabList aria-label="Entry points">
            {data.surface.entries.map((e) => (
              <Tabs.Tab id={`entry-${e.entry}`} key={e.entry}>
                {ENTRY_LABEL[e.entry] ?? e.entry}
              </Tabs.Tab>
            ))}
          </Tabs.TabList>
          {data.surface.entries.map((e) => (
            <Tabs.TabPanel tabId={`entry-${e.entry}`} key={e.entry}>
              {selected === `entry-${e.entry}` ? (
                <NameList entry={e.entry} />
              ) : null}
            </Tabs.TabPanel>
          ))}
        </Tabs.Provider>
      </Section>

      <Section title="Still to write">
        <ul>
          <li>
            Hand-written summaries of the main classes in each entry point.
          </li>
          <li>
            Links from each name to its documentation, once generated reference
            docs exist.
          </li>
          <li>Snippets compiled by a test, so they can't drift.</li>
        </ul>
      </Section>
    </Page>
  );
}
