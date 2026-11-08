import { TextField } from "@mui/material";
import { Tabs } from "@stratakit/structures";
import { useMemo, useState } from "react";
import { count, data } from "../data.ts";
import {
  C,
  CodeBlock,
  DataTable,
  Generated,
  Page,
  Section,
  Written,
} from "../parts.tsx";
import { snippetText } from "../snippets.ts";

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
        <CodeBlock language="ts" code={snippetText("quick.next.ts")} />
        <p>For more control, the engine directly:</p>
        <CodeBlock language="ts" code={snippetText("engine.next.ts")} />
        <p className="provenance">
          These compile against the real types as part of a test, and most
          options are left out.
        </p>
      </Section>

      <Section title="Terrain regions">
        <p>
          A globe's terrain is drawn at an opacity in a region or everywhere,
          through <C>globe.terrain</C>. Only what <C>Engine.addTerrain</C> and{" "}
          <C>addEllipsoid</C> return has it: on another tileset it is a compile
          error. The Rendering tab shows how it draws.
        </p>
        <CodeBlock language="ts" code={snippetText("terrain.next.ts")} />
        <ul>
          <li>
            <C>globe.terrain.addRegion(shape, options)</C> returns a region.
            Opacity runs from 0, a cut, to 1, no effect, and a set never
            recompiles.
          </li>
          <li>
            <C>ground</C> says whether heights and rays still treat it as
            ground. It defaults to true, unless the region is added at opacity
            0, and an opacity change never alters it.
          </li>
          <li>
            <C>"everywhere"</C> takes the whole globe, and holds one of the 32
            region slots while its opacity is below 1. Where regions overlap,
            the least opacity wins.
          </li>
          <li>
            <C>pickThrough</C> decides whether picks stop at the ground or go on
            to what shows through it. It defaults to false, and it can be set on
            the region at any time.
          </li>
        </ul>
        <p>
          <C>opacity</C>, <C>ground</C> and <C>pickThrough</C> are properties of
          the region, and <C>remove()</C> ends it. Height captures follow{" "}
          <C>ground</C> too, whatever the opacity.
        </p>
        <Written from={<C>src/globe/Globe.ts</C>} on="2026-11-08" />
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
        <p>
          For how this differs from 1.x, the 1.x to 2.0 API tab goes area by
          area, with breaking changes first.
        </p>
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
        </ul>
      </Section>
    </Page>
  );
}
