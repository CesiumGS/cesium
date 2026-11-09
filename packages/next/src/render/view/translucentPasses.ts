// The bodies of a view's translucent and composite passes (translucent.wgsl,
// composite.slang). buildViewFrame registers them.
import type { TextureHandle } from "../FrameGraph.ts";
import {
  translucentInputs,
  translucentGroup,
  keptGroup,
  compositeGroup,
} from "./translucency.ts";
import { type ViewFrame, type PassBody, LIST_HEADER } from "./viewFrameData.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";

export function translucentPass(
  engine: Engine,
  view: View,
  frame: ViewFrame,
  {
    color,
    momentsZero,
    momentsHigher,
    accumulatedLit,
    accumulatedUnlit,
  }: {
    color: TextureHandle;
    momentsZero: TextureHandle;
    momentsHigher: TextureHandle;
    accumulatedLit: TextureHandle;
    accumulatedUnlit: TextureHandle;
  },
): PassBody {
  const { device, pipelines } = engine.ctx;
  const { width, height } = frame;

  const cleared = (): GPURenderPassColorAttachment => ({
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "store",
  });
  const listTarget: GPURenderPassColorAttachment = {
    view: undefined as never,
    clearValue: { r: 0, g: 0, b: 0, a: 0 },
    loadOp: "clear",
    storeOp: "discard",
  };
  const listPass: GPURenderPassDescriptor = {
    label: "translucent.lists",
    colorAttachments: [listTarget],
  };
  const momentTargets = [cleared(), cleared()];
  const momentPass: GPURenderPassDescriptor = {
    label: "translucent.moments",
    colorAttachments: momentTargets,
  };
  const colorTargets = [cleared(), cleared()];
  const colorPass: GPURenderPassDescriptor = {
    label: "translucent.color",
    colorAttachments: colorTargets,
  };
  return (enc, get) => {
    if (!frame.translucent) {
      return;
    }
    const world = view.world;
    const dummies = translucentInputs(engine);
    if (view.translucencyMethod === "exact") {
      const lists = engine.lists!;
      enc.clearBuffer(lists, 0, (LIST_HEADER + width * height) * 4);
      listTarget.view = get(color);
      listPass.timestampWrites = engine.timer.passWrites("translucent-lists");
      const pass = enc.beginRenderPass(listPass);
      world.encodeTranslucent(
        pass,
        (doubleSided) =>
          doubleSided ? "translucentListDoubleSided" : "translucentList",
        translucentGroup(engine, frame, 0, [
          lists,
          dummies.zero,
          dummies.higher,
        ]),
      );
      pass.end();
      // Each pixel's list sorted and blended, into the accumulation
      // targets (composite.slang `sortLists`).
      const lit = get(accumulatedLit);
      const unlit = get(accumulatedUnlit);
      const sort = enc.beginComputePass({
        label: "translucent.sort",
        timestampWrites: engine.timer.passWrites("translucent-sort"),
      });
      sort.setPipeline(pipelines.translucentSort);
      sort.setBindGroup(
        0,
        keptGroup(engine, frame, 5, [lists, lit, unlit], () =>
          device.createBindGroup({
            label: "translucent.sort",
            layout: pipelines.translucentSort.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: { buffer: frame.translucentParams } },
              { binding: 1, resource: { buffer: lists } },
              { binding: 5, resource: lit },
              { binding: 6, resource: unlit },
            ],
          }),
        ),
      );
      sort.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 4));
      sort.end();
      if (!engine.listCountPending) {
        engine.listCountPending = true;
        const readback = device.createBuffer({
          label: "translucent.count",
          size: 4,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        });
        enc.copyBufferToBuffer(lists, 0, readback, 0, 4);
        engine.listCounts.push(readback);
      }
      return;
    }
    const zero = get(momentsZero);
    const higher = get(momentsHigher);
    momentTargets[0]!.view = zero;
    momentTargets[1]!.view = higher;
    momentPass.timestampWrites = engine.timer.passWrites("translucent-moments");
    const first = enc.beginRenderPass(momentPass);
    world.encodeTranslucent(
      first,
      (doubleSided) =>
        doubleSided ? "translucentMomentsDoubleSided" : "translucentMoments",
      translucentGroup(engine, frame, 1, [
        dummies.buffer,
        dummies.zero,
        dummies.higher,
      ]),
    );
    first.end();
    colorTargets[0]!.view = get(accumulatedLit);
    colorTargets[1]!.view = get(accumulatedUnlit);
    colorPass.timestampWrites = engine.timer.passWrites("translucent-color");
    const second = enc.beginRenderPass(colorPass);
    world.encodeTranslucent(
      second,
      (doubleSided) =>
        doubleSided ? "translucentColorDoubleSided" : "translucentColor",
      translucentGroup(engine, frame, 2, [dummies.buffer, zero, higher]),
    );
    second.end();
  };
}

export function compositePassBody(
  engine: Engine,
  view: View,
  frame: ViewFrame,
  {
    resolved,
    displayResolved,
    momentsZero,
    accumulatedLit,
    accumulatedUnlit,
  }: {
    resolved: TextureHandle;
    displayResolved: TextureHandle;
    momentsZero: TextureHandle;
    accumulatedLit: TextureHandle;
    accumulatedUnlit: TextureHandle;
  },
): PassBody {
  const { pipelines } = engine.ctx;

  const compositeScene: GPURenderPassColorAttachment = {
    view: undefined as never,
    loadOp: "load",
    storeOp: "store",
  };
  const compositeDisplay: GPURenderPassColorAttachment = {
    view: undefined as never,
    loadOp: "load",
    storeOp: "store",
  };
  const compositePass: GPURenderPassDescriptor = {
    label: "composite",
    colorAttachments: [compositeScene, compositeDisplay],
  };
  return (enc, get) => {
    if (!frame.translucent) {
      return;
    }
    compositeScene.view = get(resolved);
    compositeDisplay.view = get(displayResolved);
    compositePass.timestampWrites = engine.timer.passWrites(
      "translucent-composite",
    );
    const pass = enc.beginRenderPass(compositePass);
    if (view.translucencyMethod === "exact") {
      pass.setPipeline(pipelines.compositeExact);
      pass.setBindGroup(
        0,
        compositeGroup(engine, frame, 3, pipelines.compositeExact, [
          get(accumulatedLit),
          get(accumulatedUnlit),
        ]),
      );
    } else {
      pass.setPipeline(pipelines.compositeMoments);
      pass.setBindGroup(
        0,
        compositeGroup(engine, frame, 4, pipelines.compositeMoments, [
          get(momentsZero),
          get(accumulatedLit),
          get(accumulatedUnlit),
        ]),
      );
    }
    pass.draw(3);
    pass.end();
  };
}
