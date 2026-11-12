import { useEffect, useMemo, useState } from "react";
import { C, Figure, Note, Page, Section } from "../parts.tsx";
import { SCENES } from "../transformGraph/scenes.ts";
import {
  measureIn,
  pickBack,
  render,
  routeOf,
  type Flags,
  type Overlays,
  type SceneDef,
  type Values,
} from "../transformGraph/model.ts";
import type { V2 } from "../transformGraph/graph.ts";
import {
  Controls,
  Measures,
  OverlayToggles,
  RouteChips,
  Sigma,
  Stage,
  Tree,
} from "../transformGraph/view.tsx";
import "../transformGraph/transformGraph.css";

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

const fromHash = () => {
  const id = location.hash.split("/")[2];
  return SCENES.find((s) => s.id === id) ?? SCENES[0]!;
};

function Explorer() {
  const [def, setDef] = useState(fromHash);
  useEffect(() => {
    const on = () => setDef(fromHash());
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

export function TransformGraph() {
  return (
    <Page
      title="Transform graph: a visual tour (draft)"
      status="sketch"
      lede={
        <>
          A proposed design that generalizes warps: one graph of frames, where
          each node&apos;s edge to its parent is either a matrix or a
          differentiable function. Content and cameras are placed at nodes, and
          what a camera sees is decided by where things are placed. These are
          small 2D pictures of that design, drawn by its own arithmetic.
        </>
      }
    >
      <Section title="The design in a paragraph">
        <p>
          Every edge is <strong>affine</strong> (a matrix) or{" "}
          <strong>non-linear</strong>: a function <C>f</C> from the node&apos;s
          local frame to its parent&apos;s, with parameters, whose inverse is
          solved by Newton. A content point is carried up from its node to the
          lowest common ancestor of its node and the camera&apos;s through the{" "}
          <C>f</C>s, then down to the camera&apos;s node through the inverses.
          Runs of affine edges collapse to one matrix; non-linear nodes stay as
          functions. There are no modes and no regions: put something under a
          warp and it is warped, put the camera under the warp and the rest of
          the world is.
        </p>
        <ul>
          <li>
            <strong>J and H come from automatic differentiation</strong>, one
            definition of each <C>f</C>. J carries normals (by its cofactor) and
            gives the local distortion, drawn here as Tissot ellipses: unit
            circles mapped by J. H bounds how far a straight edge sags from its
            chord, about L²·‖H‖/8, which drives adaptive subdivision, so
            straight edges render as the curves they become.
          </li>
          <li>
            <strong>Measurements are taken in a named frame</strong>, in float64
            on the CPU. &ldquo;True&rdquo; is a frame below the warp;
            &ldquo;drawn&rdquo; is the camera&apos;s. Accuracy goes through the
            same J: Σ<sub>out</sub> = J Σ Jᵀ.
          </li>
        </ul>
      </Section>

      <Section title="Seven scenes">
        <p>
          Pick a scene, drag a slider, then move content or the camera to
          another node with the checkboxes and watch the picture and the route
          change. Thin grey edges in the tree are affine; bold purple ones are
          non-linear. Units in the Earth scenes are schematic: the planet is
          drawn small and its relief large, so that k is visible.
        </p>
        <Figure
          scroll={false}
          caption={
            <>
              The picture is one route per piece of content, evaluated in
              float64 from the graph on the right, J and H by forward-mode
              automatic differentiation in two variables (
              <C>handbook/src/transformGraph</C>
              ). The route of the content chosen above the picture is
              highlighted in the tree and in the picture.
            </>
          }
        >
          <Explorer />
        </Figure>
      </Section>

      <Section title="Reading the pictures">
        <ul>
          <li>
            <strong>Tissot ellipses</strong> are the route&apos;s J applied to a
            small circle in the content&apos;s frame. A circle stays a circle
            where the route is a similarity, stretches along the direction a
            warp stretches, and shrinks where it compresses.
          </li>
          <li>
            <strong>Subdivision points</strong> are added where H says an edge
            bends more than the tolerance; an edge the route keeps straight gets
            none. Endpoint-only drawing is shown dashed for comparison.
          </li>
          <li>
            <strong>True against drawn</strong> is the same measurement in two
            frames. Affine edges change nothing a ratio can see; the non-linear
            ones are where the two readouts part.
          </li>
          <li>
            <strong>Normals</strong> map by the cofactor of J (green). Mapping
            them as vectors by J (red) leaves them slanted wherever the stretch
            is not uniform.
          </li>
        </ul>
      </Section>

      <Note title="What this design doesn't decide yet">
        <ul>
          <li>
            <strong>Views and charts</strong> as convenience layers above the
            graph: whether a named view (a camera node plus its measurement
            frames) or a chart (a ready-made chain such as corridor plus
            vertical exaggeration) is API or a recipe.
          </li>
          <li>
            <strong>GPU compilation of the functions</strong>: here each{" "}
            <C>f</C> is written once over jets on the CPU. How <C>f</C>, J, H
            and the Newton inverse compile to shaders, in float32 and with kinks
            such as the exaggeration&apos;s ceiling, is open.
          </li>
          <li>
            <strong>Beyond these pictures</strong>: the scenes are 2D
            cross-sections, so the 3 × 3 case, inverses that fold (a strong
            lens), and the cost of picking through a Newton solve are not shown.
          </li>
        </ul>
      </Note>
    </Page>
  );
}
