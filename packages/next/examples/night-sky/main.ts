import {
  Ellipsoid,
  cameraGlare,
  cameraObserver,
  createBox,
  eastNorthUpToFixedFrame,
  eyeObserver,
  fromDegrees,
  mat4,
  type ObserverSettings,
  vec3,
} from "../../src/index.ts";
import { attachObserverPanel } from "../../widgets/observerPanel.ts";
import type { ExampleContext } from "../types.ts";

/**
 * Night sky: the observer, at a place and a time. A preset sets the clock, a
 * place and where to look, and an observer; the panel then changes who is
 * looking (an eye, or a camera at an exposure) and shows what each setting is:
 * physics, a model of an eye or a lens, or a look.
 *
 * Public API only. The presets are data (§13.30): a date, a place and a
 * direction, an observer. It needs no sky pack: with none it draws 1.x's star map,
 * and `?pack=local` uses a pack the dev server offers.
 */

const DEG = Math.PI / 180;

/** Where to look: by azimuth and elevation at a place, or at a point of the sky. */
type Look =
  | { azimuth: number; elevation: number; fov: number }
  | { ra: number; dec: number; fov: number };

interface Preset {
  id: string;
  title: string;
  /** What it is for, one line. */
  note: string;
  /** UTC. */
  time: string;
  /** On the ground at a place, or in orbit above it, looking across the limb. */
  place:
    { longitude: number; latitude: number; height: number } | { orbit: number };
  look: Look;
  /**
   * The sun set by hand, degrees above the horizon and clockwise from north, or
   * from the direction looked at (`fromLook`).
   */
  sun?: { azimuth: number; elevation: number; fromLook?: boolean };
  /** Beams across the view, a structure between the observer and the sun. */
  structure?: boolean;
  observer: () => Partial<ObserverSettings>;
}

const skyCamera = (ev100: number): Partial<ObserverSettings> =>
  cameraObserver({ ev100 });

/** The presets, in the order they are listed. */
const PRESETS: readonly Preset[] = [
  {
    id: "orion",
    title: "Orion",
    note: "A camera at EV100 −6.5, from a dark site in winter. Stars and the Milky Way come from the exposure alone.",
    time: "2027-01-15T04:30:00Z",
    place: { longitude: -105, latitude: 30, height: 2000 },
    look: { ra: 84, dec: 7, fov: 60 },
    observer: () => skyCamera(-6.5),
  },
  {
    id: "core",
    title: "The Milky Way's core",
    note: "A wide view toward the galactic center from the Atacama in July, one long exposure.",
    time: "2027-07-10T03:30:00Z",
    place: { longitude: -70.4, latitude: -24.6, height: 2400 },
    look: { ra: 266.4, dec: -29, fov: 100 },
    observer: () => skyCamera(-6.5),
  },
  {
    id: "winter",
    title: "The winter sky, to the eye",
    note: "An eye, dark-adapted. Compare it with the camera presets: far fewer faint stars show.",
    time: "2026-12-21T04:00:00Z",
    place: { longitude: -100, latitude: 45, height: 400 },
    look: { azimuth: 180, elevation: 45, fov: 100 },
    observer: () => eyeObserver({ speed: 1000 }),
  },
  {
    id: "limb",
    title: "The night limb",
    note: "From 400 km, looking across the Earth's edge toward the core, with the airglow along it.",
    time: "2027-06-05T12:00:00Z",
    place: { orbit: 400_000 },
    look: { ra: 266.4, dec: -29, fov: 80 },
    // Well below the horizon, a little to one side: night over the Earth below.
    sun: { azimuth: 18, elevation: -45, fromLook: true },
    observer: () => skyCamera(-6.5),
  },
  {
    id: "low-sun",
    title: "The sun, low",
    note: "A camera at EV100 12 toward a sun 4 degrees up. Its glare is a model of a lens, tagged so.",
    time: "2027-03-20T00:30:00Z",
    place: { longitude: -105, latitude: 40, height: 1700 },
    look: { azimuth: 270, elevation: 6, fov: 60 },
    sun: { azimuth: 270, elevation: 4 },
    observer: () => ({
      ...cameraObserver({ ev100: 12 }),
      glare: cameraGlare(),
    }),
  },
  {
    id: "behind",
    title: "The sun behind a structure",
    note: "The same sun, half behind beams. The veil and spikes follow what the beams hide.",
    time: "2027-03-20T00:30:00Z",
    place: { longitude: -105, latitude: 40, height: 1700 },
    look: { azimuth: 270, elevation: 6, fov: 60 },
    sun: { azimuth: 270, elevation: 4 },
    structure: true,
    observer: () => ({
      ...cameraObserver({ ev100: 12 }),
      glare: cameraGlare(),
    }),
  },
];

/** The vectors of the observer's frame at a point: east, north, up (Earth-fixed). */
function frameAt(position: Float64Array) {
  const enu = eastNorthUpToFixedFrame(position, Ellipsoid.WGS84, mat4.mat4());
  const column = (c: number) =>
    vec3.vec3(enu[c * 4]!, enu[c * 4 + 1]!, enu[c * 4 + 2]!);
  return { east: column(0), north: column(1), up: column(2) };
}

export async function run({
  viewer,
  panel,
  params,
  setParams,
  signal,
}: ExampleContext) {
  const { engine, world, view } = viewer;
  viewer.creditsShown = true;
  // Looking around is this example's own: the globe's controls would move the Earth.
  viewer.controller.enabled = false;
  view.shadows = false;
  if (params.pack === "local") {
    void viewer.setSkyPack("/sky-pack/");
  }

  // ----------------------------------------------------------- the look-around
  const state = { azimuth: 0, elevation: 0, fov: 60 };
  let site = vec3.vec3();
  let orbitFrame:
    { east: vec3.Vec3; north: vec3.Vec3; up: vec3.Vec3 } | undefined;
  /** Away from the point the preset gave: set when it looks at a point of the sky. */
  const aim = () => {
    const frame = orbitFrame ?? frameAt(site);
    const { camera } = view;
    const cosE = Math.cos(state.elevation * DEG);
    const az = state.azimuth * DEG;
    const direction = vec3.vec3();
    for (let i = 0; i < 3; i++) {
      direction[i] =
        frame.east[i]! * Math.sin(az) * cosE +
        frame.north[i]! * Math.cos(az) * cosE +
        frame.up[i]! * Math.sin(state.elevation * DEG);
    }
    camera.position.set(site);
    camera.direction.set(direction);
    camera.fov = state.fov * DEG;
    camera.orient(frame.up);
    engine.requestRender();
  };

  /** A direction in the sky (ICRF) as azimuth and elevation in a frame. */
  const toLook = (
    frame: { east: vec3.Vec3; north: vec3.Vec3; up: vec3.Vec3 },
    ra: number,
    dec: number,
  ) => {
    const r = engine.icrfToFixed;
    const icrf = [
      Math.cos(dec * DEG) * Math.cos(ra * DEG),
      Math.cos(dec * DEG) * Math.sin(ra * DEG),
      Math.sin(dec * DEG),
    ];
    const d = [0, 1, 2].map(
      (i) =>
        r[i * 3]! * icrf[0]! +
        r[i * 3 + 1]! * icrf[1]! +
        r[i * 3 + 2]! * icrf[2]!,
    );
    const dot = (v: vec3.Vec3) => v[0]! * d[0]! + v[1]! * d[1]! + v[2]! * d[2]!;
    return {
      azimuth:
        (Math.atan2(dot(frame.east), dot(frame.north)) / DEG + 360) % 360,
      elevation: Math.asin(Math.min(Math.max(dot(frame.up), -1), 1)) / DEG,
    };
  };

  // ----------------------------------------------------------- a structure
  const beams: Array<ReturnType<typeof world.addDraw>> = [];
  const box = world.addMesh(createBox());
  const clearBeams = () => {
    for (const beam of beams.splice(0)) {
      world.removeDraw(beam);
    }
  };
  /** A lattice 30 m ahead in the look direction, covering the right half of the view. */
  const addStructure = () => {
    const frame = frameAt(site);
    const az = state.azimuth * DEG;
    const forward = vec3.vec3();
    const right = vec3.vec3();
    for (let i = 0; i < 3; i++) {
      forward[i] =
        frame.east[i]! * Math.sin(az) + frame.north[i]! * Math.cos(az);
      right[i] = frame.east[i]! * Math.cos(az) - frame.north[i]! * Math.sin(az);
    }
    const place = (
      across: number,
      height: number,
      sx: number,
      sy: number,
      sz: number,
      tilt = 0,
    ) => {
      const origin = vec3.vec3();
      const distance = 30;
      for (let i = 0; i < 3; i++) {
        origin[i] =
          site[i]! +
          forward[i]! * distance +
          right[i]! * (across - 0.65) +
          frame.up[i]! * height;
      }
      // Columns: right, forward, up, scaled, then turned about forward by `tilt`.
      const c = Math.cos(tilt);
      const s = Math.sin(tilt);
      const model = mat4.mat4();
      for (let i = 0; i < 3; i++) {
        model[i] = (right[i]! * c + frame.up[i]! * s) * sx;
        model[4 + i] = forward[i]! * sy;
        model[8 + i] = (frame.up[i]! * c - right[i]! * s) * sz;
      }
      model[15] = 1;
      // Unlit: a silhouette against the sun, as dark as black cloth.
      return world.addDraw({
        mesh: box,
        color: [0.012, 0.012, 0.014, 1],
        unlit: true,
        origin,
        model,
      });
    };
    // Two posts, three beams across and two braces. The near post stands just
    // right of the sun, so its disc is half behind it.
    beams.push(
      place(0.15, 4, 0.3, 0.3, 9),
      place(7, 4, 0.3, 0.3, 9),
      place(3.5, 8.2, 8, 0.3, 0.3),
      place(3.5, 5.6, 8, 0.3, 0.3),
      place(3.5, 0.6, 8, 0.3, 0.3),
      place(3.5, 4, 0.2, 0.2, 10.4, 0.75),
      place(3.5, 4, 0.2, 0.2, 10.4, -0.75),
    );
  };

  // ------------------------------------------------------------ the presets
  let current = PRESETS.find((p) => p.id === params.preset) ?? PRESETS[0]!;
  const apply = (preset: Preset) => {
    current = preset;
    setParams({ preset: preset.id });
    clearBeams();
    viewer.clock.time = Date.parse(preset.time);
    // The clock turned the stars and moved the sun: set the sun by hand where asked.
    const place = preset.place;
    if ("orbit" in place) {
      // From orbit: the observer sits where the point it looks at is just
      // beyond the limb (7 degrees under the horizontal), and the sun is behind.
      const r = engine.icrfToFixed;
      const look = preset.look as { ra: number; dec: number; fov: number };
      const toFixed = (v: number[]) =>
        [0, 1, 2].map(
          (i) =>
            r[i * 3]! * v[0]! + r[i * 3 + 1]! * v[1]! + r[i * 3 + 2]! * v[2]!,
        );
      const dir = toFixed([
        Math.cos(look.dec * DEG) * Math.cos(look.ra * DEG),
        Math.cos(look.dec * DEG) * Math.sin(look.ra * DEG),
        Math.sin(look.dec * DEG),
      ]);
      const north = toFixed([
        Math.cos(27.12825 * DEG) * Math.cos(192.85948 * DEG),
        Math.cos(27.12825 * DEG) * Math.sin(192.85948 * DEG),
        Math.sin(27.12825 * DEG),
      ]);
      const dot = (a: number[], b: number[]) =>
        a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
      const upish = north.map((n, i) => n - dot(north, dir) * dir[i]!);
      const len = Math.hypot(upish[0]!, upish[1]!, upish[2]!);
      const tilt = 7.2 * DEG;
      const radial = upish.map(
        (u, i) => (u / len) * Math.cos(tilt) - dir[i]! * Math.sin(tilt),
      );
      const rl = Math.hypot(radial[0]!, radial[1]!, radial[2]!);
      const unit = radial.map((v) => v / rl);
      const radius = Ellipsoid.WGS84.maximumRadius + place.orbit;
      site = vec3.vec3(unit[0]! * radius, unit[1]! * radius, unit[2]! * radius);
      orbitFrame = frameAt(site);
      const looked = toLook(orbitFrame, look.ra, look.dec);
      Object.assign(state, looked, { fov: look.fov });
    } else {
      orbitFrame = undefined;
      site = Ellipsoid.WGS84.cartographicToCartesian(
        fromDegrees(place.longitude, place.latitude, place.height),
        vec3.vec3(),
      );
      const frame = frameAt(site);
      const look = preset.look;
      if ("ra" in look) {
        Object.assign(state, toLook(frame, look.ra, look.dec), {
          fov: look.fov,
        });
      } else {
        Object.assign(state, look);
      }
    }
    if (preset.sun) {
      const frame = frameAt(site);
      const az =
        (preset.sun.azimuth + (preset.sun.fromLook ? state.azimuth : 0)) * DEG;
      const el = preset.sun.elevation * DEG;
      const sun = vec3.vec3();
      for (let i = 0; i < 3; i++) {
        sun[i] =
          frame.east[i]! * Math.sin(az) * Math.cos(el) +
          frame.north[i]! * Math.cos(az) * Math.cos(el) +
          frame.up[i]! * Math.sin(el);
      }
      viewer.sunFromClock = false;
      engine.sunDirection.set(vec3.normalize(sun, sun));
    } else {
      viewer.sunFromClock = true;
    }
    view.observer = {
      stages: [],
      glare: null,
      ...preset.observer(),
    };
    aim();
    if (preset.structure) {
      addStructure();
    }
    engine.requestRender();
    for (const [id, button] of buttons) {
      button.setAttribute("aria-pressed", String(id === preset.id));
    }
  };

  // ------------------------------------------------------------------ panel
  panel.replaceChildren();
  panel.classList.add("night-sky-panel");
  const list = document.createElement("div");
  list.className = "night-sky-presets";
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", "Places, times and observers");
  const buttons = new Map<string, HTMLButtonElement>();
  for (const preset of PRESETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "night-sky-preset";
    button.setAttribute("aria-pressed", "false");
    const title = document.createElement("span");
    title.className = "night-sky-preset-title";
    title.textContent = preset.title;
    const note = document.createElement("span");
    note.className = "night-sky-preset-note";
    note.textContent = preset.note;
    button.append(title, note);
    button.addEventListener("click", () => apply(preset));
    buttons.set(preset.id, button);
    list.append(button);
  }
  const heading = document.createElement("h3");
  heading.className = "night-sky-heading";
  heading.textContent = "Places and observers";
  const style = document.createElement("style");
  style.textContent = STYLE;
  const observerHost = document.createElement("div");
  panel.append(style, heading, list, observerHost);
  const observerPanel = attachObserverPanel(observerHost, view, {
    sky: () => viewer.skyPackManifest,
  });

  // -------------------------------------------------------------- the input
  const canvas = viewer.container;
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "Sky view: drag or use the arrow keys to look around",
  );
  let drag: { x: number; y: number } | undefined;
  const onDown = (event: PointerEvent) => {
    drag = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    if (!drag) {
      return;
    }
    const scale = state.fov / Math.max(canvas.clientHeight, 1);
    state.azimuth =
      (state.azimuth - (event.clientX - drag.x) * scale + 360) % 360;
    state.elevation = Math.min(
      Math.max(state.elevation + (event.clientY - drag.y) * scale, -89),
      89,
    );
    drag = { x: event.clientX, y: event.clientY };
    aim();
  };
  const onUp = () => {
    drag = undefined;
  };
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    state.fov = Math.min(
      Math.max(state.fov * Math.exp(event.deltaY * 0.001), 3),
      110,
    );
    aim();
  };
  const onKey = (event: KeyboardEvent) => {
    const step = state.fov * 0.1;
    switch (event.key) {
      case "ArrowLeft":
        state.azimuth = (state.azimuth - step + 360) % 360;
        break;
      case "ArrowRight":
        state.azimuth = (state.azimuth + step) % 360;
        break;
      case "ArrowUp":
        state.elevation = Math.min(state.elevation + step, 89);
        break;
      case "ArrowDown":
        state.elevation = Math.max(state.elevation - step, -89);
        break;
      case "+":
      case "=":
        state.fov = Math.max(state.fov / 1.2, 3);
        break;
      case "-":
        state.fov = Math.min(state.fov * 1.2, 110);
        break;
      default:
        return;
    }
    event.preventDefault();
    aim();
  };
  const opts = { signal } as const;
  canvas.addEventListener("pointerdown", onDown, opts);
  canvas.addEventListener("pointermove", onMove, opts);
  canvas.addEventListener("pointerup", onUp, opts);
  canvas.addEventListener("pointercancel", onUp, opts);
  canvas.addEventListener("wheel", onWheel, { ...opts, passive: false });
  canvas.addEventListener("keydown", onKey, opts);

  apply(current);

  return () => {
    observerPanel.dispose();
    clearBeams();
    panel.replaceChildren();
    panel.classList.remove("night-sky-panel");
    viewer.controller.enabled = true;
    viewer.sunFromClock = true;
  };
}

const STYLE = `
.night-sky-panel { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.night-sky-heading { margin: 0; font: 600 13px/18px inherit; font-family: inherit; }
.night-sky-presets { display: flex; flex-direction: column; gap: 4px; }
.night-sky-preset {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: start;
  min-height: 44px; padding: 6px 10px; cursor: pointer; font: inherit; color: inherit; background: none;
  border: 1px solid var(--stratakit-color-border-neutral-base, color-mix(in oklch, CanvasText 22%, Canvas));
  border-radius: 6px; overflow-wrap: anywhere;
}
.night-sky-preset:hover { background: color-mix(in oklch, currentColor 8%, transparent); }
.night-sky-preset[aria-pressed="true"] {
  border-color: var(--stratakit-color-bg-accent-base, AccentColor);
  box-shadow: inset 0 0 0 1px var(--stratakit-color-bg-accent-base, AccentColor);
}
.night-sky-preset-title { font-weight: 600; }
.night-sky-preset-note { font-size: 12px; line-height: 16px; opacity: 0.72; }
.night-sky-preset:focus-visible { outline: 2px solid var(--stratakit-color-border-accent-strong, Highlight); outline-offset: 2px; }
`;
