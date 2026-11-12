import { useEffect, useMemo, useState } from "react";
import { C } from "../parts.tsx";
import { SCENES } from "./scenes.ts";
import {
  measureIn,
  pickBack,
  render,
  routeOf,
  type Flags,
  type Overlays,
  type SceneDef,
  type Values,
} from "./model.ts";
import type { V2 } from "./graph.ts";
import {
  Controls,
  Measures,
  OverlayToggles,
  RouteChips,
  Sigma,
  Stage,
  Tree,
} from "./view.tsx";
import "./transformGraph.css";

interface SceneState {
  values: Values;
  flags: Flags;
  overlays: Overlays;
  picked: string | undefined;
}

const BASE_OVERLAYS: Overlays = {
  tissot: false,
  route: true,
  readouts: true,
  subdivision: false,
  normals: false,
  sigma: false,
  tolerance: 0.4,
  naive: false,
};

function initial(def: SceneDef): SceneState {
  return {
    values: Object.fromEntries(def.controls.map((c) => [c.key, c.init])),
    flags: Object.fromEntries(def.toggles.map((t) => [t.key, t.init])),
    overlays: { ...BASE_OVERLAYS, ...def.overlays },
    picked: undefined,
  };
}

/** The scene the hash names (`#/transform-graph/<scene>`), if it names one. */
const sceneInHash = () => {
  const id = location.hash.split("/")[2];
  return SCENES.find((s) => s.id === id);
};

/** The 2D tour: seven small scenes, drawn by the same arithmetic the engine uses on the CPU. */
export function Explorer() {
  const [def, setDef] = useState(() => sceneInHash() ?? SCENES[0]!);
  useEffect(() => {
    const on = () => {
      const named = sceneInHash();
      if (named) {
        setDef(named);
      }
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  const [states, setStates] = useState<Record<string, SceneState>>({});
  const [cursor, setCursor] = useState<V2 | undefined>();
  const st = states[def.id] ?? initial(def);
  const update = (patch: Partial<SceneState>) =>
    setStates((all) => ({ ...all, [def.id]: { ...st, ...patch } }));

  const built = useMemo(
    () => def.build(st.values, st.flags),
    [def, st.values, st.flags],
  );
  const picked =
    built.items.find((i) => i.id === st.picked && i.pick) ??
    built.items.find((i) => i.pick);
  const tolerance = st.values.tol ?? BASE_OVERLAYS.tolerance;
  const naive = st.flags.naive === true;
  const overlays = useMemo<Overlays>(
    () => ({ ...st.overlays, tolerance, naive }),
    [st.overlays, tolerance, naive],
  );
  const rendered = useMemo(
    () => render(built, picked, overlays),
    [built, picked, overlays],
  );
  const route = useMemo(
    () => (picked ? routeOf(built, picked) : undefined),
    [built, picked],
  );
  const measures = useMemo(
    () =>
      built.measures.map((m) => ({
        id: m.id,
        label: m.label,
        cols: m.cols.map((c) => ({
          key: c.key,
          label: c.label,
          v: measureIn(built.nodes, m, c),
        })),
      })),
    [built],
  );
  const local = cursor && picked ? pickBack(built, picked, cursor) : undefined;
  const { stats } = rendered;

  return (
    <div className="tg">
      <div className="tg-scenes" role="group" aria-label="Scenes">
        {SCENES.map((s) => (
          <button
            key={s.id}
            type="button"
            className="tg-scene"
            aria-pressed={s.id === def.id}
            onClick={() => {
              setDef(s);
              setCursor(undefined);
              history.replaceState(null, "", `#/transform-graph/${s.id}`);
            }}
          >
            {s.short}
          </button>
        ))}
      </div>
      <h3 className="tg-scene-title">{def.title}</h3>
      <div className="tg-main">
        <div className="tg-stagecol">
          <div
            className="tg-pick"
            role="group"
            aria-label="Content whose route is shown"
          >
            <span>Route for</span>
            {built.items
              .filter((i) => i.pick)
              .map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="tg-chipbtn"
                  aria-pressed={i === picked}
                  onClick={() => update({ picked: i.id })}
                >
                  {i.label}
                </button>
              ))}
          </div>
          <Stage
            built={built}
            rendered={rendered}
            picked={picked}
            overlays={overlays}
            onMove={setCursor}
            label={`${def.title}: a 2D picture of content carried through the graph to the camera`}
          />
          <p className="tg-cursor" aria-live="off">
            {local && picked
              ? `Cursor, brought back through the route's inverse into ${picked.label}'s frame: (${local[0].toFixed(2)}, ${local[1].toFixed(2)})`
              : "Move over the picture: the cursor is picked back into the frame of the content chosen above."}
          </p>
        </div>
        <div className="tg-side">
          <h4>The graph</h4>
          <Tree
            built={built}
            picked={picked}
            steps={route?.raw ?? []}
            routeOn={overlays.route}
          />
          <h4>The route, as evaluated</h4>
          <RouteChips built={built} picked={picked} steps={route?.raw ?? []} />
        </div>
      </div>
      <Controls
        controls={def.controls}
        toggles={def.toggles}
        values={st.values}
        flags={st.flags}
        onValue={(key, v) => update({ values: { ...st.values, [key]: v } })}
        onFlag={(key, v) => update({ flags: { ...st.flags, [key]: v } })}
      />
      <OverlayToggles
        overlays={st.overlays}
        onChange={(key, v) =>
          update({ overlays: { ...st.overlays, [key]: v } })
        }
      />
      <p className="tg-caption">{def.caption}</p>
      {overlays.readouts ? (
        <>
          <Measures built={built} values={measures} />
          <p className="tg-stats">
            Edges: {stats.source} straight in their own frame, drawn as{" "}
            {stats.drawn} segments at a tolerance of{" "}
            {overlays.tolerance.toFixed(1)} px. With endpoints only the worst
            chord would be {stats.naiveError.toFixed(1)} px off
            {stats.estimate <= 10 * stats.naiveError + 1
              ? `, and H bounds it at ${stats.estimate.toFixed(1)} px`
              : ""}
            .
            {stats.newton > 0
              ? ` Inverse solves took up to ${stats.newton} Newton steps.`
              : ""}
          </p>
        </>
      ) : null}
      {overlays.sigma ? <Sigma built={built} rendered={rendered} /> : null}
    </div>
  );
}

/** What the tour is, in a paragraph. */
export function TourNotes() {
  return (
    <ul>
      <li>
        <strong>Tissot ellipses</strong> are the route&apos;s J applied to a
        small circle in the content&apos;s frame. A circle stays a circle where
        the route is a similarity, stretches along the direction a smooth node
        stretches, and shrinks where it compresses.
      </li>
      <li>
        <strong>Subdivision points</strong> are added where H says an edge bends
        more than the tolerance; an edge the route keeps straight gets none.
        Endpoint-only drawing is shown dashed for comparison. This is the{" "}
        <C>M₂</C> bound that the tessellation spike uses in 3D.
      </li>
      <li>
        <strong>True against drawn</strong> is the same measurement in two
        nodes. Affine edges change nothing a ratio can see; the smooth ones are
        where the two readouts part.
      </li>
      <li>
        <strong>Normals</strong> map by the cofactor of J (green). Mapping them
        as vectors by J (red) leaves them slanted wherever the stretch is not
        uniform.
      </li>
    </ul>
  );
}
