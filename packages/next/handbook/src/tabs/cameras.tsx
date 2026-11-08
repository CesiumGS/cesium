import { C, Flow, Page, Section, Written } from "../parts.tsx";

const LAYERS = [
  {
    name: "Application or host",
    owns: 'Which rig and controller, presets, what "zoom to fit" fits, tours, what content it declares. It may bring its own resolver',
    blind: "Render space",
  },
  {
    name: "Viewer",
    owns: "Defaults: a rig on ITRF, globe controls, the default gestures, an ellipsoid-only Earth",
    blind: "Nothing: it's a convenience on top",
  },
  {
    name: "Frames module (optional)",
    owns: "The resolver over the frame tree; binding anchors to reference frames; per-vertex placements for a given render root",
    blind: "Cameras, controllers",
  },
  {
    name: "Frame resolver (an interface)",
    owns: "Where is reference frame A in reference frame B at this scene time, and how fast is it moving?",
    blind: "Who asks",
    accent: true,
  },
  {
    name: "Animation core",
    owns: "Values over a timeline, easing, playback, a wall-clock or scene-clock choice per animation",
    blind: "Cameras, reference frames, Instant",
  },
  {
    name: "Camera layer",
    owns: "Rigs, controllers and their constraints, gesture bindings, transitions. Each tick it decides each view's render root",
    blind: "Which library answers its questions about reference frames",
  },
  {
    name: "Scene core",
    owns: "Render space; the camera's pose and projection in it; the transform table; anchors; each draw's placement",
    blind: "What render space means",
  },
  {
    name: "GPU renderer",
    owns: "Camera-relative shaders: an eye position (hi/lo) and a rotation per anchor",
    blind: "Reference frames, rigs, time",
  },
];

export function Cameras() {
  return (
    <Page
      title="Cameras"
      status="sketch"
      lede={
        <>
          A camera rig is only a pose in a reference frame. The rig's reference
          frame decides what holds still: on <C>MOON_ME</C> the Moon stays put,
          on <C>GCRF</C> the Earth turns underneath, and on a trajectory the
          camera rides along. Each layer of the chain owns one thing and reaches
          the next through an interface.
        </>
      }
    >
      <Section title="The layers of the camera chain">
        <div
          className="stack"
          role="table"
          aria-label="Layers of the camera chain"
        >
          <div className="stack-row stack-head" role="row">
            <div role="columnheader">Layer</div>
            <div role="columnheader">Owns</div>
            <div role="columnheader">Knows nothing about</div>
          </div>
          {LAYERS.map((l) => (
            <div
              className={l.accent ? "stack-row accent" : "stack-row"}
              role="row"
              key={l.name}
            >
              <div className="stack-name" role="cell">
                {l.name}
              </div>
              <div role="cell">{l.owns}</div>
              <div role="cell">{l.blind}</div>
            </div>
          ))}
        </div>
        <p>
          The highlighted interface is why the frames module is optional.
          Without it, the resolver is the core's own transform table: its nodes
          and anchors are the only reference frames, and a rig can still follow
          a moving node. A host can also bring its own resolver.
        </p>
      </Section>

      <Section title="What happens each tick, per view">
        <Flow
          label="The camera layer's steps"
          steps={[
            {
              title: "Pick the render root",
              body: "The rig's position reference frame, or a running transition's blend reference frame.",
            },
            {
              title: "Evaluate the rig",
              body: "In that root. This gives the camera's pose in render space.",
            },
            {
              title: "Place what hangs under anchors",
              body: "Ask the resolver where each anchor is relative to the root, and the frames module for per-vertex placements that depend on it.",
            },
          ]}
        />
        <p>
          <strong>The rule:</strong> a view's render space is its rig's position
          reference frame, or the blend reference frame while a transition runs.
        </p>
      </Section>

      <Section title="What re-rooting changes">
        <p>
          Re-rooting never changes pixels for content placed rigidly. Below the
          application, though, the root is real:
        </p>
        <ul>
          <li>
            Per-vertex placements depend on it, which is why straight design
            lines draw straight in a design view.
          </li>
          <li>Picks come back in it.</li>
          <li>The sky gets the camera's position per body through it.</li>
          <li>
            Anything that compares across ticks works per anchor. With a rig on
            GCRF the whole Earth moves in render space while the clock runs, so
            nothing may assume content standing still in its anchor stands still
            in render space.
          </li>
        </ul>
      </Section>

      <Section title="Rigs and anchors">
        <p>
          A rig splits position from orientation. Position is an anchor, an
          offset and the reference frame the offset is expressed in. Orientation
          is a reference frame whose axes the camera follows, or an aim at a
          target. A rig holds no rules about where the camera may go:
          controllers own the constraints.
        </p>
        <p>
          An anchor is a top-level transform whose placement is set per view,
          each tick. Bodies, engineering frames and trajectories each get one.
          The core places the camera in each anchor rather than each anchor in
          render space: draws keep anchor-relative transforms, uploaded once,
          and the vertex stage subtracts a per-anchor eye position. That is the
          same camera-relative scheme as before, with one eye per anchor instead
          of one per view.
        </p>
        <Written
          from="the plan 5 spec, sections 7.2, 7.4 and 7.5"
          on="2026-11-08"
        />
      </Section>

      <Section title="What's still being built">
        <p>
          Plan 5a is in progress, and these names may still move. Controllers
          beyond the globe's, gesture bindings, transitions between live rigs
          and the animation core come in sub-plan 5d; rig presets such as
          orbital and cockpit come after 5b's two-vector reference frames.
        </p>
      </Section>
    </Page>
  );
}
