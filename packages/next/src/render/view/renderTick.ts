// One tick's GPU work: every view's blocks and graph, encoded and submitted.
import { updateEnvironment } from "./environment.ts";
import { updateExposure, adaptExposure } from "./exposure.ts";
import { resolvePicks, whenMapped, halfToFloat } from "./picks.ts";
import { writeTranslucency } from "./translucency.ts";
import { writeView } from "./viewBlocks.ts";
import { viewFrameFor } from "./viewFrame.ts";
import type {
  PersistentImage,
  TargetFrame,
  WorldFrame,
} from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { World } from "../../scene/World.ts";
import type { RenderTarget } from "../../scene/renderTarget.ts";
import { SHADOWS_STRIDE } from "../../scene/shadows.ts";
import { updateTilesets } from "../../scene/tileSelection.ts";

const FRAME_ENCODER: GPUCommandEncoderDescriptor = { label: "frame" };

/**
 * `tilesetsUpdated`: the tick already ran selection this frame.
 * `targets`: render only the views on these targets (on demand), and on a
 * target shared by several views only `dirtyViews` (the others are copied
 * from their last image).
 */
export function render(
  engine: Engine,
  tilesetsUpdated: boolean,
  targets?: ReadonlySet<RenderTarget>,
  dirtyViews?: ReadonlySet<View>,
): void {
  const start = performance.now();
  engine.renderRequested = false;
  engine.cameraTick++;
  engine.stats.idle = false;
  // Custom shaders' uniforms changed since the tick (or no tick ran);
  // the tick still sees what changed for its views.
  engine.ctx.shaderBindings.flush(false);
  engine.stats.framesRendered++;
  const device = engine.ctx.device;
  const stamp = ++engine.frameNumber;

  // Acquire each target first: acquiring a canvas resizes it to its CSS
  // size, and every view rectangle below (selection, frame graphs,
  // viewport/scissor) must use this frame's size, not last frame's.
  const views = engine.views;
  for (let i = 0; i < views.length; i++) {
    const view = views[i]!;
    if (!view.enabled || (targets && !targets.has(view.target))) {
      continue;
    }
    const target = targetFrame(engine, view.target);
    if (target.stamp !== stamp) {
      target.stamp = stamp;
      target.view = view.target.acquire(device, engine.ctx.outputFormat);
      target.clearedBy = undefined;
    }
  }

  const links = engine.links;
  for (let i = 0; i < links.length; i++) {
    links[i]!.evaluate();
  }
  if (!tilesetsUpdated) {
    updateTilesets(engine, () => true);
  }

  // Which views draw. On demand, a target shared by several views is
  // composited: each view presents into its own persistent image, only
  // dirty views (or ones without a current image) re-render, and every
  // view's image is copied into the target in view order. Otherwise views
  // draw straight into their target.
  const shared = engine.sharedTargets;
  const drawn = engine.drawnViews;
  shared.clear();
  drawn.clear();
  if (targets && dirtyViews) {
    const counts = engine.viewsPerTarget;
    counts.clear();
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      if (view.enabled) {
        counts.set(view.target, (counts.get(view.target) ?? 0) + 1);
      }
    }
    for (const [target, n] of counts) {
      if (n > 1 && targets.has(target) && target.texture) {
        shared.add(target);
      }
    }
  }
  for (let i = 0; i < views.length; i++) {
    const view = views[i]!;
    if (!view.enabled || (targets && !targets.has(view.target))) {
      continue;
    }
    if (shared.has(view.target)) {
      const rect = view.pixelRect();
      const image = persistentImage(engine, view, rect.width, rect.height);
      if (!image.valid || dirtyViews!.has(view)) {
        drawn.add(view);
      }
    } else {
      drawn.add(view);
      dropPersistent(engine, view);
    }
  }

  // Assign each drawn view a slot (the first view drawn into a target
  // clears it) and prepare each world once.
  let slots = 0;
  for (let i = 0; i < views.length; i++) {
    const view = views[i]!;
    if (!drawn.has(view)) {
      continue;
    }
    const image = shared.has(view.target)
      ? engine.persistent.get(view)
      : undefined;
    const rect = image ? image.rect : view.pixelRect();
    const frame = viewFrameFor(engine, view, rect);
    frame.slot = slots;
    // Every frame takes the view's exposure as it is now: only the
    // on-demand check computed it, so `renderFrame()` and the continuous
    // loop drew with a stale scale (a fixed exposure set later never
    // applied; automatic exposure never moved).
    updateExposure(engine, view);
    writeView(engine, view, slots, rect);
    updateEnvironment(engine, view);
    slots++;

    if (image) {
      frame.clearTarget = true;
      frame.graph.setImported(frame.output, image.view);
      image.valid = true;
    } else {
      const target = targetFrame(engine, view.target);
      frame.clearTarget = target.clearedBy === undefined;
      if (frame.clearTarget) {
        target.clearedBy = view;
      }
      frame.graph.setImported(frame.output, target.view!);
    }

    const world = worldFrame(engine, view.world);
    if (world.stamp !== stamp) {
      world.stamp = stamp;
      world.bundle = view.world.prepareFrame();
    }
    frame.bundle = world.bundle;
    // After the world's transforms are resolved for the frame.
    writeTranslucency(engine, view);
  }
  // The views' and cascades' blocks went up as they were written
  // (`writeView`, `writeShadows`: each to its anchor table's used slots).
  device.queue.writeBuffer(
    engine.shadowStaging,
    0,
    engine.shadowData,
    0,
    (slots * SHADOWS_STRIDE) / 4,
  );

  const encoder = device.createCommandEncoder(FRAME_ENCODER);
  engine.timer.beginFrame();
  for (let i = 0; i < views.length; i++) {
    const view = views[i]!;
    if (drawn.has(view)) {
      const frame = engine.viewFrames.get(view)!;
      // One pick per frame keeps the shared params/result buffers simple.
      frame.pick =
        engine.picks.length === 0 ? view.pendingPicks.shift() : undefined;
      // The scene time of this image, for its picks (also idle ones).
      frame.seconds = engine.cameras.clock(view.world)?.seconds ?? 0;
      frame.graph.execute(encoder);
      frame.rendered = true;
    }
  }
  // Composite shared targets: clear, then each view's image in view order
  // (an inset lands over the view it overlaps).
  for (const target of shared) {
    engine.compositeClear.view = targetFrame(engine, target).view!;
    encoder.beginRenderPass(engine.compositePass).end();
    engine.copyDestination.texture = target.texture!;
    const origin = engine.copyDestination.origin as GPUOrigin3DDict;
    for (let i = 0; i < views.length; i++) {
      const view = views[i]!;
      const image =
        view.enabled && view.target === target
          ? engine.persistent.get(view)
          : undefined;
      if (!image) {
        continue;
      }
      const rect = view.pixelRect();
      engine.copySource.texture = image.texture;
      origin.x = rect.x;
      origin.y = rect.y;
      encoder.copyTextureToTexture(engine.copySource, engine.copyDestination, [
        image.rect.width,
        image.rect.height,
      ]);
    }
  }
  engine.timer.endFrame(encoder);
  engine.commandBuffers[0] = encoder.finish();
  // A rejected submit draws nothing: report it and bind the worlds again
  // from their state, rather than repeat a black frame unexplained.
  device.pushErrorScope("validation");
  device.queue.submit(engine.commandBuffers);
  void device.popErrorScope().then((error) => {
    if (error) {
      frameRejected(engine, error);
    }
  });
  engine.timer.afterSubmit();
  engine.pool.endFrame();
  if (engine.picks.length > 0) {
    resolvePicks(engine, engine.picks);
    engine.picks.length = 0;
  }
  for (const meter of engine.meters.splice(0)) {
    whenMapped(meter.readback, () => {
      const [sum, count, rodSum, rodCount] = new Float32Array(
        meter.readback.getMappedRange(),
      );
      meter.readback.destroy();
      meter.scratch.forEach((b) => b.destroy());
      adaptExposure(
        engine,
        meter.view,
        count! > 0 ? 2 ** (sum! / count!) : undefined,
        rodCount! > 0 ? 2 ** (rodSum! / rodCount!) : undefined,
      );
    });
  }
  for (const range of engine.depthRanges.splice(0)) {
    whenMapped(range.readback, () => {
      const [near, far] = new Float32Array(range.readback.getMappedRange());
      range.readback.destroy();
      range.scratch.forEach((b) => b.destroy());
      range.frame.rangePending = false;
      // Nothing but sky: no range.
      range.frame.depthRange =
        far! > 0 && near! <= far! ? { near: near!, far: far! } : undefined;
    });
  }
  for (const readback of engine.listCounts.splice(0)) {
    whenMapped(readback, () => {
      const needed = new Uint32Array(readback.getMappedRange())[0]!;
      readback.destroy();
      engine.listCountPending = false;
      // Room for a quarter more than the frame needed (`writeTranslucency`),
      // and a frame drawn with it: that one dropped what didn't fit, and
      // drawing on demand, nothing else might come (glass missing until
      // the camera moved).
      if (needed > engine.listNodes) {
        engine.listNodes = Math.ceil(needed * 1.25);
        engine.requestRender();
      }
    });
  }
  for (const read of engine.hdrReads.splice(0)) {
    whenMapped(read.buffer, () => {
      const halves = new Uint16Array(read.buffer.getMappedRange());
      const data = new Float32Array(read.width * read.height * 4);
      const rowHalves = read.bytesPerRow / 2;
      const unexpose = 1 / read.exposure;
      for (let y = 0; y < read.height; y++) {
        for (let i = 0; i < read.width * 4; i++) {
          const value = halfToFloat(halves[y * rowHalves + i]!);
          data[y * read.width * 4 + i] = i % 4 === 3 ? value : value * unexpose;
        }
      }
      read.buffer.unmap();
      read.buffer.destroy();
      const image = { width: read.width, height: read.height, data };
      for (const resolve of read.resolvers) {
        resolve(image);
      }
    });
  }

  const elapsed = performance.now() - start;
  engine.stats.cpuMs =
    engine.stats.cpuMs === 0
      ? elapsed
      : engine.stats.cpuMs * 0.9 + elapsed * 0.1;
  engine.stats.gpuMs = engine.timer.milliseconds;
  engine.stats.gpuSpanMs = engine.timer.spanMilliseconds;
  engine.stats.views = slots;
  for (let i = 0; i < engine.worlds.length; i++) {
    engine.worlds[i]!.changedViews = 0;
  }
  let draws = 0;
  let batches = 0;
  for (let i = 0; i < engine.worlds.length; i++) {
    draws += engine.worlds[i]!.recordCount;
    batches += engine.worlds[i]!.batchCount;
  }
  engine.stats.draws = draws;
  engine.stats.batches = batches;
}

/** A view's persistent image at its current size (recreated on resize). */
function persistentImage(
  engine: Engine,
  view: View,
  width: number,
  height: number,
): PersistentImage {
  let image = engine.persistent.get(view);
  if (!image || image.rect.width !== width || image.rect.height !== height) {
    image?.texture.destroy();
    const texture = engine.ctx.device.createTexture({
      label: "view.image",
      size: [width, height],
      format: engine.ctx.outputFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    image = {
      texture,
      view: texture.createView(),
      rect: { x: 0, y: 0, width, height },
      valid: false,
    };
    engine.persistent.set(view, image);
  }
  return image;
}

export function dropPersistent(engine: Engine, view: View): void {
  const image = engine.persistent.get(view);
  if (image) {
    image.texture.destroy();
    engine.persistent.delete(view);
  }
}

function targetFrame(engine: Engine, target: RenderTarget): TargetFrame {
  let frame = engine.targetFrames.get(target);
  if (!frame) {
    frame = { stamp: 0, view: undefined, clearedBy: undefined };
    engine.targetFrames.set(target, frame);
  }
  return frame;
}

function worldFrame(engine: Engine, world: World): WorldFrame {
  let frame = engine.worldFrames.get(world);
  if (!frame) {
    frame = { stamp: 0, bundle: undefined };
    engine.worldFrames.set(world, frame);
  }
  return frame;
}

function frameRejected(engine: Engine, error: GPUError): void {
  engine.stats.rejectedFrames++;
  engine.ctx.errors.report(
    "frame",
    `the GPU rejected a frame, which drew nothing: ${error.message}`,
  );
  for (const world of engine.worlds) {
    world.rebind();
  }
}
