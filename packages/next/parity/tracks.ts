import {
  Camera,
  Ellipsoid,
  Engine,
  OffscreenTarget,
  Tracks,
  createSurfacePatch,
  fromDegrees,
  vec3,
  type World,
} from "../src/index.ts";
import type { Harness } from "../lab/harness.ts";
import { flip } from "./flip.ts";

const TEMPLATE = `
<h1>Real-time tracks</h1>
<p>
  Tracks (plan §13.11) as instance data: a feed update writes their
  samples at once; each frame a kernel interpolates them on the GPU and
  writes their instance rows; each draws as a truck within the switch
  distance of the camera and a red billboard beyond it, chosen per
  instance in the cull pass. The clock is the harness's, so motion is
  exact. Click a row to see its image.
</p>
<div class="status">Run to check every case.</div>
<div class="images">
  <figure>
    <figcaption>Image</figcaption>
    <canvas class="out" data-id="image"></canvas>
  </figure>
</div>
<table data-id="results"></table>`;

let root: HTMLElement;
const $ = <T extends Element = HTMLElement>(id: string) =>
  root.querySelector<T>(`[data-id="${id}"]`)!;

const WIDTH = 640;
const HEIGHT = 400;
const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);
const TRUCK =
  "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf";
/** The billboards' side, px, and the switch distance, m. */
const PIXELS = 24;
const SWITCH = 300;

interface Row {
  case: string;
  measured: string;
  expected: string;
  pass: boolean;
}

/**
 * The unlit red billboards' area in pixels, weighted by coverage (red over
 * green: 1 inside, about half on an antialiased edge, 0 on the background,
 * the ground and the trucks).
 */
function redPixels(image: ImageData): number {
  let n = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    const red =
      image.data[i]! - Math.max(image.data[i + 1]!, image.data[i + 2]!);
    n += Math.max(0, red) / 255;
  }
  return Math.round(n);
}

/** Tracks along the x axis `spacing` m apart, heading east. */
function line(
  count: number,
  x0 = 0,
  heading = 90 * deg,
  spacing = 30,
): Float32Array {
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    out.set([x0 + (i - (count - 1) / 2) * spacing, 0, 0, heading], i * 4);
  }
  return out;
}

const frame = () => new Promise((resolve) => setTimeout(resolve, 30));

async function runTracks(): Promise<Row[]> {
  const status = root.querySelector(".status")!;
  const engine = await Engine.create();
  const target = new OffscreenTarget(WIDTH, HEIGHT);
  const origin = Ellipsoid.WGS84.cartographicToCartesian(SITE, vec3.vec3());
  const rows: Row[] = [];
  const images: ImageData[] = [];
  let now = 0;

  /** A world with ground and tracks; `render` draws it from `range` m. */
  // An asset's images are released once uploaded to a world, so each
  // scene (a world) loads the truck itself.
  const scene = async (capacity: number) => {
    const asset = await engine.loadGltf(new URL(TRUCK, location.href).href);
    const world: World = engine.createWorld({
      maxDraws: 64,
      maxMaterials: 32,
      maxInstances: Math.max(1024, capacity * 8),
      vertexBytes: 32 << 20,
      indexBytes: 16 << 20,
    });
    const patch = createSurfacePatch(
      Ellipsoid.WGS84,
      SITE.longitude - 0.05,
      SITE.latitude - 0.04,
      SITE.longitude + 0.05,
      SITE.latitude + 0.04,
      16,
    );
    world.addDraw({
      mesh: world.addMesh(patch),
      origin: patch.origin,
      radius: patch.radius,
      material: world.addMaterial({
        baseColor: [0.35, 0.4, 0.3, 1],
        roughness: 1,
      }),
    });
    const tracks = new Tracks(engine, world, {
      capacity,
      origin,
      model: { asset },
      billboard: {
        size: PIXELS,
        anchor: "center",
        lift: 2,
        color: [1, 0, 0, 1],
        depthTestDistance: 1e9,
      },
      switchDistance: SWITCH,
      delay: 0,
      clock: () => now,
    });
    const render = async (range: number, pitch = -35): Promise<ImageData> => {
      const camera = new Camera();
      camera.near = 0.5;
      camera.lookAt(origin, 20 * deg, pitch * deg, range);
      const view = engine.addView({
        target,
        world,
        camera,
        background: "color",
        clearColor: [0.03, 0.04, 0.06],
        lighting: { environment: "procedural" },
      });
      for (let i = 0; i < 4; i++) {
        engine.renderFrame();
        await frame();
      }
      const image = new ImageData(await target.read(), WIDTH, HEIGHT);
      engine.removeView(view);
      return image;
    };
    const dispose = () => {
      tracks.destroy();
      engine.worlds.splice(engine.worlds.indexOf(world), 1);
      world.destroy();
    };
    return { world, tracks, render, dispose };
  };

  const add = (row: Row, image?: ImageData) => {
    rows.push(row);
    images.push(image ?? images.at(-1)!);
    renderTable(rows, images);
  };

  // Up close: trucks, no billboards.
  status.textContent = "model up close…";
  {
    const s = await scene(3);
    s.tracks.update(0, line(3));
    s.tracks.count = 3;
    const near = await s.render(90);
    s.tracks.count = 0;
    const empty = await s.render(90);
    s.tracks.count = 3;
    const f = flip(near.data, empty.data, WIDTH, HEIGHT).mean;
    const red = redPixels(near);
    add(
      {
        case: "model within the switch distance",
        measured: `FLIP vs no tracks ${f.toFixed(4)}, red px ${red}`,
        expected:
          "trucks drawn (FLIP > 0.002), no billboards (red px < 30: the trucks' own)",
        pass: f > 0.002 && red < 30,
      },
      near,
    );
    // From afar: billboards only (in front of everything), spread apart so
    // they don't overlap on screen.
    now += 1;
    s.tracks.update(0, line(3, 0, 90 * deg, 300));
    now += 1;
    const far = await s.render(1500);
    const n = redPixels(far);
    const want = 3 * PIXELS * PIXELS;
    add(
      {
        case: "billboards beyond the switch distance",
        measured: `${n} red px`,
        expected: `${want} (3 × ${PIXELS}²) ± 5%`,
        pass: Math.abs(n - want) / want < 0.05,
      },
      far,
    );
    // Count hides the rest.
    s.tracks.count = 1;
    const one = redPixels(await s.render(1500));
    add({
      case: "count shows the first tracks only",
      measured: `${one} red px`,
      expected: `${PIXELS * PIXELS} ± 5%`,
      pass: Math.abs(one - PIXELS * PIXELS) / (PIXELS * PIXELS) < 0.05,
    });
    s.dispose();
  }

  // Interpolation: halfway between two samples is the midpoint.
  status.textContent = "interpolation…";
  {
    const moving = await scene(3);
    now = 10;
    moving.tracks.update(0, line(3, -40));
    now = 11;
    moving.tracks.update(0, line(3, 40));
    moving.tracks.count = 3;
    now = 10.5;
    const halfway = await moving.render(90);
    moving.dispose();
    const fixed = await scene(3);
    fixed.tracks.update(0, line(3, 0));
    fixed.tracks.count = 3;
    const midpoint = await fixed.render(90);
    const f = flip(halfway.data, midpoint.data, WIDTH, HEIGHT).mean;
    add(
      {
        case: "halfway between samples (vs placed at the midpoint)",
        measured: `FLIP ${f.toFixed(5)}`,
        expected: "below 0.001",
        pass: f < 0.001,
      },
      halfway,
    );
    // Heading: turned trucks differ (once the clock passes the sample).
    fixed.tracks.update(0, line(3, 0, 0));
    now += 1;
    const turned = await fixed.render(90);
    const g = flip(turned.data, midpoint.data, WIDTH, HEIGHT).mean;
    add(
      {
        case: "heading turns the trucks",
        measured: `FLIP vs heading east ${g.toFixed(4)}`,
        expected: "above 0.002",
        pass: g > 0.002,
      },
      turned,
    );
    fixed.dispose();
  }

  // 100,000 tracks: a feed update's CPU cost and the kernel's GPU time.
  status.textContent = "100,000 tracks…";
  {
    const capacity = 100_000;
    const s = await scene(capacity);
    const samples = new Float32Array(capacity * 4);
    for (let i = 0; i < capacity; i++) {
      samples.set(
        [
          ((i % 316) - 158) * 25,
          (Math.floor(i / 316) - 158) * 25,
          0,
          (i % 360) * deg,
        ],
        i * 4,
      );
    }
    s.tracks.count = capacity;
    const times: number[] = [];
    for (let k = 0; k < 11; k++) {
      now = 20 + k * 0.1;
      const t0 = performance.now();
      s.tracks.update(0, samples);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    const median = times[5]!;
    const image = await s.render(6000, -50);
    add(
      {
        case: "100,000 tracks: a feed update on the CPU",
        measured: `median ${median.toFixed(2)} ms (${((median / capacity) * 1e6).toFixed(0)} ns a track)`,
        expected: "under 10 ms",
        pass: median < 10,
      },
      image,
    );
    s.dispose();
  }

  const passed = rows.filter((r) => r.pass).length;
  status.textContent = `Done: ${passed} of ${rows.length} pass.`;
  target.destroy();
  engine.destroy();
  return rows;
}

function renderTable(rows: Row[], images: ImageData[]): void {
  const table = $("results");
  table.innerHTML = `<tr><th>Case</th><th>Measured</th><th>Expected</th><th>Pass</th></tr>${rows
    .map(
      (r, i) =>
        `<tr class="row" data-index="${i}"><td>${r.case}</td><td>${r.measured}</td><td>${r.expected}</td><td>${r.pass ? "yes" : "NO"}</td></tr>`,
    )
    .join("")}`;
  const show = (image: ImageData) => {
    const canvas = $<HTMLCanvasElement>("image");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.getContext("2d")!.putImageData(image, 0, 0);
  };
  show(images.at(-1)!);
  table
    .querySelectorAll<HTMLTableRowElement>("tr.row")
    .forEach((tr) =>
      tr.addEventListener("click", () =>
        show(images[Number(tr.dataset.index)]!),
      ),
    );
}

export const harness: Harness = {
  mount(element) {
    root = element;
    root.innerHTML = TEMPLATE;
    return { run: runTracks };
  },
};
