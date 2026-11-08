import {
  Ellipsoid,
  MaterialFlags,
  createBox,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type DrawHandle,
  type MeshData,
  type TranslucencyMethod,
  type View,
} from "../../src/index.ts";
import type { ExampleContext } from "../types.ts";

/**
 * Translucency, two ways, one above the other: moment-based
 * order-independent transparency ("moments", the default: two passes, a
 * fixed 36 bytes a pixel) above, and exact per-pixel lists sorted on the
 * GPU ("exact": every layer kept and blended in order, memory as the
 * view needs it) below, one camera for both.
 *
 * The scene is synthetic, to cover what translucency meets: a ramp of
 * panes from nearly clear to nearly opaque; three stacks of layers (faint,
 * middling and near opaque) whose count and spacing are yours, down to a
 * centimeter apart; panes crossing each other; a glass box around an
 * opaque one; all over a striped wall that shows what light comes
 * through. Where moments estimate (layers close together, near-opaque
 * ones over others) the two halves differ; "Measure cost" times each way
 * against the scene without its glass.
 */

const SITE = fromDegrees(-75.1652, 39.9526, 0);
const DEG = Math.PI / 180;

type Rgb = readonly [number, number, number];
const HUES: Rgb[] = [
  [0.9, 0.12, 0.1],
  [0.1, 0.75, 0.25],
  [0.12, 0.3, 0.95],
  [0.95, 0.8, 0.1],
  [0.8, 0.15, 0.85],
  [0.1, 0.8, 0.85],
];

/** A unit square in its xy-plane, facing +z. */
function square(): MeshData {
  return {
    positions: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  };
}

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine, world, view } = viewer;
  viewer.creditsShown = false;
  viewer.setControls("orbit");
  view.background = "color";
  view.clearColor = [0.02, 0.025, 0.035];
  view.lighting.environment = "procedural";
  view.translucencyMethod = "moments";

  const settings = {
    compare: "split" as "split" | TranslucencyMethod,
    layers: 8,
    /** Between a stack's layers, m. */
    spacing: 0.12,
    faint: 0.08,
    middling: 0.4,
    nearOpaque: 0.93,
    rampMin: 0.02,
    rampMax: 0.98,
    glass: 0.25,
    saturation: 1,
    unlit: false,
    fxaa: false,
  };

  // ------------------------------------------------------------ the scene
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(SITE, vec3.vec3());
  const enu = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  mat4.setTranslation(enu, vec3.vec3());
  const meshes = {
    square: world.addMesh(square()),
    box: world.addMesh(createBox()),
  };
  const opaque = world.addMaterial({ baseColor: [1, 1, 1, 1], roughness: 0.6 });
  const materials = {
    lit: world.addMaterial({
      baseColor: [1, 1, 1, 1],
      roughness: 0.15,
      flags: MaterialFlags.alphaBlend,
    }),
    unlit: world.addMaterial({
      baseColor: [1, 1, 1, 1],
      flags: MaterialFlags.alphaBlend | MaterialFlags.unlit,
    }),
  };

  /** Scale, then turn about up and tilt about east (deg), then offset. */
  const placement = (
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    turn = 0,
    tilt = 0,
  ) => {
    const local = mat4.fromScale(mat4.mat4(), ...size);
    const rx = mat4.mat4();
    rx[5] = Math.cos(tilt * DEG);
    rx[6] = Math.sin(tilt * DEG);
    rx[9] = -Math.sin(tilt * DEG);
    rx[10] = Math.cos(tilt * DEG);
    const rz = mat4.mat4();
    rz[0] = Math.cos(turn * DEG);
    rz[1] = Math.sin(turn * DEG);
    rz[4] = -Math.sin(turn * DEG);
    rz[5] = Math.cos(turn * DEG);
    mat4.multiply(local, rx, local);
    mat4.multiply(local, rz, local);
    mat4.setTranslation(local, vec3.vec3(...at));
    return mat4.multiply(mat4.mat4(), enu, local);
  };

  /** A blended part: its draw, hue and where its alpha comes from. */
  interface Glass {
    draw: DrawHandle;
    hue: Rgb;
    alpha: () => number;
  }
  const opaqueDraws: DrawHandle[] = [];
  let glass: Glass[] = [];

  const addOpaque = (
    shape: "square" | "box",
    color: Rgb,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    turn = 0,
    tilt = 0,
  ) =>
    opaqueDraws.push(
      world.addDraw({
        mesh: meshes[shape],
        origin,
        model: placement(size, at, turn, tilt),
        material: opaque,
        color: [...color, 1],
        doubleSided: shape === "square",
      }),
    );

  // Fixed: the ground, a striped wall behind everything, an opaque box
  // in the glass one.
  addOpaque("box", [0.35, 0.35, 0.37], [30, 24, 0.2], [0, 4, -0.1]);
  for (let i = 0; i < 24; i++) {
    const v = i % 2 ? 0.85 : 0.05;
    addOpaque("box", [v, v, v], [0.75, 0.3, 6], [-9 + i * 0.75, 12, 3]);
  }
  addOpaque("box", [0.9, 0.45, 0.1], [0.8, 0.8, 0.8], [4.5, 0.5, 0.4], 25);

  const tint = (g: Glass): [number, number, number, number] => {
    const s = settings.saturation;
    const [r, gr, b] = g.hue;
    return [
      1 - s + s * r,
      1 - s + s * gr,
      1 - s + s * b,
      Math.min(Math.max(g.alpha(), 0), 0.999),
    ];
  };
  const retint = () => {
    for (const g of glass) {
      world.setColor(g.draw, tint(g));
    }
    engine.requestRender();
  };

  /** The glass, rebuilt when its layout or material changes. */
  const build = () => {
    for (const g of glass) {
      world.removeDraw(g.draw);
    }
    glass = [];
    const material = settings.unlit ? materials.unlit : materials.lit;
    const add = (
      hue: Rgb,
      alpha: () => number,
      shape: "square" | "box",
      size: readonly [number, number, number],
      at: readonly [number, number, number],
      turn = 0,
      tilt = 0,
    ) => {
      const g: Glass = {
        hue,
        alpha,
        draw: world.addDraw({
          mesh: meshes[shape],
          origin,
          model: placement(size, at, turn, tilt),
          material,
          color: [1, 1, 1, 1],
          doubleSided: true,
        }),
      };
      world.setColor(g.draw, tint(g));
      glass.push(g);
    };

    // The ramp: twelve panes, clear to opaque, in front of the wall.
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      add(
        HUES[i % HUES.length]!,
        () => settings.rampMin + (settings.rampMax - settings.rampMin) * t,
        "square",
        [1.1, 1.6, 1],
        [-7.15 + i * 1.3, 9, 4.6],
        0,
        90,
      );
    }
    // Three stacks: faint, middling, near opaque; going north, each
    // layer a hue on.
    const stacks: Array<[x: number, alpha: () => number]> = [
      [-6, () => settings.faint],
      [-2, () => settings.middling],
      [2, () => settings.nearOpaque],
    ];
    for (const [x, alpha] of stacks) {
      for (let k = 0; k < settings.layers; k++) {
        add(
          HUES[k % HUES.length]!,
          alpha,
          "square",
          [2.4, 2.4, 1],
          [x + 0.08 * k, 2 + settings.spacing * k, 1.4 + 0.05 * k],
          0,
          90,
        );
      }
    }
    // Panes crossing at one place, and the glass box.
    [0, 60, 120].forEach((turn, i) =>
      add(
        HUES[i]!,
        () => settings.middling,
        "square",
        [2.6, 1.8, 1],
        [6.5, 3, 1],
        turn,
        90,
      ),
    );
    add(
      [0.6, 0.85, 0.9],
      () => settings.glass,
      "box",
      [1.8, 1.8, 1.6],
      [4.5, 0.5, 0.8],
    );
    engine.requestRender();
  };
  build();
  // The scene's middle, Earth-fixed.
  const middle = placement([1, 1, 1], [0, 4, 2]);
  viewer.zoomTo(
    {
      center: vec3.add(
        vec3.vec3(),
        origin,
        vec3.vec3(middle[12], middle[13], middle[14]),
      ),
      radius: 7.5,
    },
    0,
    -10 * DEG,
  );
  viewer.setSun(150, 35);

  // ------------------------------------------------------- the two halves
  // Moments above, exact below (each half wide, as the scene is): the
  // lower half a view of its own, its camera the upper one's.
  let lower: View | undefined;
  const labels = document.createElement("div");
  labels.style.cssText = "position:absolute;inset:0;pointer-events:none";
  viewer.container.append(labels);
  const label = (text: string, top: string) =>
    Object.assign(document.createElement("span"), {
      textContent: text,
      style: `position:absolute;right:10px;top:${top};font:600 13px system-ui;color:#fff;text-shadow:0 1px 3px #000`,
    });
  const MOMENTS = "Moments (MBOIT)";
  const EXACT = "Exact (sorted lists)";
  const layout = () => {
    const shown = settings.compare;
    const split = shown === "split";
    if (split && !lower) {
      view.viewport = { x: 0, y: 0, width: 1, height: 0.5 };
      lower = engine.addView({
        target: viewer.target,
        world,
        viewport: { x: 0, y: 0.5, width: 1, height: 0.5 },
        background: "color",
        clearColor: view.clearColor,
        translucencyMethod: "exact",
        fxaa: settings.fxaa,
      });
      Object.assign(lower.lighting, view.lighting);
      lower.exposure = view.exposure;
      lower.outputEncoding = view.outputEncoding;
      lower.camera.copyFrom(view.camera);
    } else if (!split && lower) {
      engine.removeView(lower);
      lower = undefined;
      view.viewport = { x: 0, y: 0, width: 1, height: 1 };
    }
    view.translucencyMethod = shown === "split" ? "moments" : shown;
    labels.replaceChildren(
      ...(split
        ? [label(MOMENTS, "10px"), label(EXACT, "calc(50% + 10px)")]
        : [label(shown === "moments" ? MOMENTS : EXACT, "10px")]),
    );
    engine.requestRender();
  };
  layout();
  // The lower half follows the upper one's camera.
  let raf = requestAnimationFrame(function follow() {
    if (lower) {
      lower.camera.copyFrom(view.camera);
      lower.exposure = view.exposure;
    }
    raf = requestAnimationFrame(follow);
  });

  // ------------------------------------------------------------ the panel
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };
  const slider = (
    label: string,
    range: { min: number; max: number; step: number },
    get: () => number,
    set: (v: number) => void,
    format: (v: number) => string = (v) => v.toFixed(2),
  ) => {
    const value = el("output", {}, format(get()));
    const input = el("input", {
      type: "range",
      min: String(range.min),
      max: String(range.max),
      step: String(range.step),
      value: String(get()),
      oninput: () => {
        set(Number(input.value));
        value.textContent = format(Number(input.value));
      },
    });
    return el("label", { className: "slider" }, label, input, value);
  };
  const alphaSlider = (label: string, key: keyof typeof settings) =>
    slider(
      label,
      { min: 0.01, max: 0.99, step: 0.01 },
      () => settings[key] as number,
      (v) => {
        (settings[key] as number) = v;
        retint();
      },
    );
  const check = (
    label: string,
    get: () => boolean,
    set: (v: boolean) => void,
  ) => {
    const box = el("input", {
      type: "checkbox",
      checked: get(),
      onchange: () => set(box.checked),
    });
    return el("label", {}, label, box);
  };
  const compare = el(
    "select",
    {
      onchange: () => {
        settings.compare = compare.value as typeof settings.compare;
        layout();
      },
    },
    el("option", { value: "split", selected: true }, "Both (moments above)"),
    el("option", { value: "moments" }, "Moments only"),
    el("option", { value: "exact" }, "Exact only"),
  );

  // Spacing on a log scale: a centimeter to a meter.
  const spacingOf = (t: number) => 0.01 * Math.pow(100, t);
  const spacingT = (m: number) => Math.log(m / 0.01) / Math.log(100);

  const costOut = el("dl");
  const measure = el(
    "button",
    {
      type: "button",
      onclick: async () => {
        measure.disabled = true;
        try {
          await measureCost();
        } finally {
          measure.disabled = false;
        }
      },
    },
    "Measure cost",
  );

  panel.append(
    el("h3", {}, "Compare"),
    el("label", {}, "Show", compare),
    check(
      "FXAA (both)",
      () => settings.fxaa,
      (on) => {
        settings.fxaa = on;
        view.fxaa = on;
        if (lower) {
          lower.fxaa = on;
        }
        engine.requestRender();
      },
    ),
    el("h3", {}, "Stacks"),
    slider(
      "Layers",
      { min: 1, max: 32, step: 1 },
      () => settings.layers,
      (v) => {
        settings.layers = v;
        build();
      },
      (v) => String(v),
    ),
    slider(
      "Spacing",
      { min: 0, max: 1, step: 0.01 },
      () => spacingT(settings.spacing),
      (t) => {
        settings.spacing = spacingOf(t);
        build();
      },
      (t) => {
        const m = spacingOf(t);
        return m < 0.1 ? `${(m * 100).toFixed(1)} cm` : `${m.toFixed(2)} m`;
      },
    ),
    alphaSlider("Faint α", "faint"),
    alphaSlider("Middling α (and crossing)", "middling"),
    alphaSlider("Near-opaque α", "nearOpaque"),
    el("h3", {}, "Ramp and glass"),
    alphaSlider("Ramp from α", "rampMin"),
    alphaSlider("Ramp to α", "rampMax"),
    alphaSlider("Glass box α", "glass"),
    el("h3", {}, "Look"),
    slider(
      "Tint",
      { min: 0, max: 1, step: 0.01 },
      () => settings.saturation,
      (v) => {
        settings.saturation = v;
        retint();
      },
    ),
    check(
      "Unlit (colors as given)",
      () => settings.unlit,
      (on) => {
        settings.unlit = on;
        build();
      },
    ),
    el("h3", {}, "Cost"),
    measure,
    costOut,
    el(
      "p",
      {},
      "Each way alone at this view's size, against the scene without its glass: the time a frame takes, frames rendered back to back, the fastest of five rounds taken in turn (other work on the GPU slows a round, not the answer). Moments cost the same however the layers lie; the lists grow with the layers a pixel sees.",
    ),
  );

  /**
   * Each way's frame time against the scene without its glass, the view
   * alone (the split undone for it): frames rendered back to back, then
   * waited for (`onSubmittedWorkDone`; not timestamps, a render pass's
   * aren't its own on every GPU). The three take turns over several
   * rounds and each keeps its fastest: anything else on the GPU (another
   * tab, the first frames' warming up) only slows a round.
   */
  async function measureCost() {
    const queue = engine.gpu.device.queue;
    const was = settings.compare;
    // Back to back, waited on once: waited on each, a frame quicker than
    // the display's refresh heard it was done only at the next one (16.7
    // ms at 60 Hz), and the scene without glass came out slower than with.
    const frames = async (count: number) => {
      for (let i = 0; i < count; i++) {
        engine.renderFrame();
      }
      await queue.onSubmittedWorkDone();
    };
    const visible = (on: boolean) => {
      for (const g of glass) {
        world.setVisible(g.draw, on);
      }
    };
    type Way = "none" | TranslucencyMethod;
    const ways: Way[] = ["none", "moments", "exact"];
    const best: Record<Way, number> = {
      none: Infinity,
      moments: Infinity,
      exact: Infinity,
    };
    const ROUNDS = 5;
    settings.compare = "moments";
    layout();
    try {
      for (let round = 0; round < ROUNDS; round++) {
        for (const way of ways) {
          if (signal.aborted) {
            return;
          }
          costOut.replaceChildren(
            el("dt", {}, `Measuring… ${round + 1} of ${ROUNDS}`),
          );
          visible(way !== "none");
          view.translucencyMethod = way === "none" ? "moments" : way;
          await frames(8);
          const start = performance.now();
          await frames(30);
          best[way] = Math.min(best[way], (performance.now() - start) / 30);
        }
      }
    } finally {
      visible(true);
      settings.compare = was;
      layout();
    }
    const { width, height } = viewer.target;
    const added = (way: TranslucencyMethod) => {
      const d = best[way] - best.none;
      return `${d < 0 ? "−" : "+"}${Math.abs(d).toFixed(2)} ms`;
    };
    costOut.replaceChildren(
      el("dt", {}, "Without glass"),
      el("dd", {}, `${best.none.toFixed(2)} ms a frame (${width} × ${height})`),
      el("dt", {}, "Moments"),
      el("dd", {}, added("moments")),
      el("dt", {}, "Exact"),
      el("dd", {}, added("exact")),
    );
  }

  return () => {
    cancelAnimationFrame(raf);
    if (lower) {
      engine.removeView(lower);
    }
    labels.remove();
    for (const g of glass) {
      world.removeDraw(g.draw);
    }
    for (const d of opaqueDraws) {
      world.removeDraw(d);
    }
    panel.replaceChildren();
  };
}
