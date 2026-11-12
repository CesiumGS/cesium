// Walks the examples gallery in headless Edge and records, per navigation,
// the time until the example's overlay is gone, the JS heap after a GC, live
// workers, live WebGPU devices/buffers/textures, outstanding animation
// frames, DOM nodes and listeners.
// `node scripts/galleryNav.mjs [--rounds N] [--ids a,b,c] [--shots dir]
// [--base url] [--list-wait ms]` with the dev server running (default
// http://127.0.0.1:5190). `--list-wait` is how long the gallery list is
// shown before it is measured (the engine outlives the page by its grace
// period).
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const rounds = Number(option("rounds", 3));
const ids = option(
  "ids",
  "brep-first-look,csg,clipping,vertical-exaggeration,frames-explorer,brep-first-look,csg",
).split(",");
const shots = option("shots", "");
const listWait = Number(option("list-wait", 1500));
const base = option("base", "http://127.0.0.1:5190");
if (shots) {
  mkdirSync(shots, { recursive: true });
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.BENCH_CHANNEL ?? "msedge",
  args: [
    "--enable-unsafe-webgpu",
    "--enable-webgpu-developer-features",
    "--force_high_performance_gpu",
  ],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors.push(`[error] ${m.text().slice(0, 200)}`);
    }
  });
  await page.addInitScript(() => {
    const c = (globalThis.__counts = {
      devices: 0,
      buffers: 0,
      textures: 0,
      shaders: 0,
      pipelines: 0,
      workersMade: 0,
      workersEnded: 0,
      rafOutstanding: new Set(),
      blobs: new Set(),
    });
    const live = new WeakSet();
    const track = (proto, create, kind) => {
      const make = proto[create];
      proto[create] = function (...a) {
        const r = make.apply(this, a);
        live.add(r);
        c[kind]++;
        return r;
      };
      return make;
    };
    if (globalThis.GPUDevice) {
      const D = GPUDevice.prototype;
      track(D, "createBuffer", "buffers");
      track(D, "createTexture", "textures");
      track(D, "createShaderModule", "shaders");
      track(D, "createRenderPipeline", "pipelines");
      track(D, "createComputePipeline", "pipelines");
      const dd = D.destroy;
      D.destroy = function () {
        if (!this.__destroyed) {
          this.__destroyed = true;
          c.devices--;
        }
        return dd.call(this);
      };
      for (const [P, kind] of [
        [GPUBuffer.prototype, "buffers"],
        [GPUTexture.prototype, "textures"],
      ]) {
        const d = P.destroy;
        P.destroy = function () {
          if (live.has(this)) {
            live.delete(this);
            c[kind]--;
          }
          return d.call(this);
        };
      }
      const rd = GPUAdapter.prototype.requestDevice;
      GPUAdapter.prototype.requestDevice = async function (...a) {
        const d = await rd.apply(this, a);
        c.devices++;
        return d;
      };
    }
    const W = globalThis.Worker;
    globalThis.Worker = class extends W {
      constructor(...a) {
        super(...a);
        c.workersMade++;
      }
      terminate() {
        c.workersEnded++;
        super.terminate();
      }
    };
    const raf = globalThis.requestAnimationFrame.bind(globalThis);
    const caf = globalThis.cancelAnimationFrame.bind(globalThis);
    globalThis.requestAnimationFrame = (cb) => {
      const id = raf((t) => {
        c.rafOutstanding.delete(id);
        cb(t);
      });
      c.rafOutstanding.add(id);
      return id;
    };
    globalThis.cancelAnimationFrame = (id) => {
      c.rafOutstanding.delete(id);
      caf(id);
    };
    const cu = URL.createObjectURL;
    const ru = URL.revokeObjectURL;
    URL.createObjectURL = (b) => {
      const u = cu(b);
      c.blobs.add(u);
      return u;
    };
    URL.revokeObjectURL = (u) => {
      c.blobs.delete(u);
      ru(u);
    };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("HeapProfiler.enable");
  await cdp.send("Runtime.enable");

  const queryObjects = async (proto) => {
    const { result } = await cdp.send("Runtime.evaluate", {
      expression: proto,
    });
    const { objects } = await cdp.send("Runtime.queryObjects", {
      prototypeObjectId: result.objectId,
    });
    const { result: n } = await cdp.send("Runtime.callFunctionOn", {
      objectId: objects.objectId,
      functionDeclaration: "function(){return this.length}",
    });
    await cdp.send("Runtime.releaseObject", { objectId: objects.objectId });
    return n.value;
  };

  const snapshot = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Runtime.getHeapUsage");
    const dom = await cdp.send("Memory.getDOMCounters");
    const counts = await page.evaluate(() => {
      const c = globalThis.__counts;
      return {
        devices: c.devices,
        buffers: c.buffers,
        textures: c.textures,
        shaders: c.shaders,
        raf: c.rafOutstanding.size,
        blobs: c.blobs.size,
        made: c.workersMade,
        ended: c.workersEnded,
      };
    });
    let wrappers = {};
    try {
      wrappers = {
        gpuDev: await queryObjects("GPUDevice.prototype"),
        canvas: await queryObjects("HTMLCanvasElement.prototype"),
      };
    } catch {
      // queryObjects unavailable: skip.
    }
    // The shared engine's own collections: what survives an example is here.
    const engine = await page.evaluate(() => {
      const e = globalThis.dynoExamplesViewer?.engine;
      return e
        ? `ticks ${e.tickListeners.length}+${e.afterTickListeners.length} views ${e.views.length} worlds ${e.worlds.length} links ${e.links.length} watches ${e.viewWatches.size}`
        : "";
    });
    if (engine) {
      console.log("   engine:", engine);
    }
    return {
      heapMiB: +(heap.usedSize / 2 ** 20).toFixed(1),
      workers: page.workers().length,
      nodes: dom.nodes,
      listeners: dom.jsEventListeners,
      ...counts,
      ...wrappers,
    };
  };

  await page.goto(`${base}/#/examples`);
  await page.waitForSelector(".examples-gallery");
  console.log(
    "step".padEnd(34),
    "ms".padStart(6),
    " heap  work dev  buf  tex  shd  raf nodes lstn blob canv",
  );
  const line = (label, ms, s) =>
    console.log(
      label.padEnd(34),
      String(ms).padStart(6),
      String(s.heapMiB).padStart(5),
      String(s.workers).padStart(5),
      String(s.devices).padStart(3),
      String(s.buffers).padStart(5),
      String(s.textures).padStart(4),
      String(s.shaders).padStart(4),
      String(s.raf).padStart(4),
      String(s.nodes).padStart(5),
      String(s.listeners).padStart(4),
      String(s.blobs).padStart(4),
      String(s.canvas ?? "").padStart(4),
    );
  line("baseline (gallery)", 0, await snapshot());

  const roundEnds = [];
  for (let round = 1; round <= rounds; round++) {
    for (const id of ids) {
      const t0 = Date.now();
      await page.evaluate(
        ([next]) => {
          globalThis.__prev =
            globalThis.dynoExamplesViewer &&
            new WeakRef(globalThis.dynoExamplesViewer);
          location.hash = `#/examples/${next}`;
        },
        [id],
      );
      await page.waitForFunction(
        () =>
          globalThis.dynoExamplesViewer !== globalThis.__prev?.deref() &&
          globalThis.dynoExamplesViewer &&
          !document.querySelector(".examples-loading") &&
          document.querySelector(".examples-view canvas"),
        undefined,
        { timeout: 120_000, polling: 50 },
      );
      const ms = Date.now() - t0;
      // A few frames so the first geometry is drawn.
      await page.waitForTimeout(1500);
      if (shots) {
        await page.screenshot({ path: `${shots}\\r${round}-${id}.png` });
      }
      const s = await snapshot();
      line(`r${round} ${id}`, ms, s);
    }
    // Back to the gallery's list: the page, and the engine, are left.
    await page.evaluate(() => {
      location.hash = "#/examples";
    });
    await page.waitForSelector(".examples-gallery");
    await page.waitForTimeout(listWait);
    const s = await snapshot();
    roundEnds.push(s);
    line(`r${round} gallery list`, 0, s);
  }
  if (errors.length > 0) {
    console.log("\nerrors:");
    for (const e of [...new Set(errors)].slice(0, 15)) {
      console.log(" ", e);
    }
  }
} finally {
  await browser.close();
}
