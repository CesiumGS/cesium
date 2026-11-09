// A world's point sets: their cull parameters and their splats.
import { PointCuller } from "../PointCuller.ts";
import type { World } from "../World.ts";
import type { UniformDeclaration } from "../uniforms.ts";
import type { DrawHandle, PointDraw } from "./types.ts";

/** A point draw's cull parameters (pointCull.slang `PointCull`). */
export const POINT_CULL_BYTES = 48;
/** Pixels past a view's edges a point's symbol may reach. */
const POINT_MARGIN = 64;

export function setPointCuller(
  world: World,
  handle: DrawHandle,
  culler: PointCuller | undefined,
  tiny = 0,
): void {
  const draw = world.pointDraws.get(handle.index);
  if (!draw || !world.hasDraw(handle)) {
    throw new Error("setPointCuller: not a point draw");
  }
  draw.culler = culler;
  draw.tiny = culler ? tiny : 0;
  writePointParams(world, draw, handle.index);
}

export function createPointCuller(
  world: World,
  options: {
    code: string;
    uniforms: Record<string, UniformDeclaration>;
    label?: string;
  },
): PointCuller {
  return new PointCuller(world.ctx, options);
}

/** A point draw's group 2 (pointCull.slang), its splats the current ones. */
export function pointGroup(world: World, draw: PointDraw): GPUBindGroup {
  return world.ctx.device.createBindGroup({
    label: "world.pointCull",
    layout: world.ctx.pipelines.pointCullLayout,
    entries: [
      draw.params,
      world.slabs.get(draw.mesh.slab).vertexBuffer,
      world.pointCounts,
      world.splats.depth,
      world.splats.color,
      world.splats.feature,
    ].map((buffer, binding) => ({ binding, resource: { buffer } })),
  });
}

/** Splat buffers for `pixels` (a word each), and the resolve's group. */
export function createSplats(world: World, pixels: number): World["splats"] {
  const { device } = world.ctx;
  const make = (label: string) =>
    device.createBuffer({
      label: `world.splats.${label}`,
      size: Math.max(4, pixels * 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  const depth = make("depth");
  const color = make("color");
  const feature = make("feature");
  return {
    pixels,
    depth,
    color,
    feature,
    group: device.createBindGroup({
      label: "world.splats",
      layout: world.ctx.pipelines.splatLayout,
      entries: [depth, color, feature].map((buffer, binding) => ({
        binding,
        resource: { buffer },
      })),
    }),
  };
}

/** A point draw's `PointCull` parameters. */
export function writePointParams(
  world: World,
  draw: PointDraw,
  record: number,
): void {
  const data = new Uint32Array(POINT_CULL_BYTES / 4);
  const f32 = new Float32Array(data.buffer);
  const p = draw.mesh.points;
  data[0] = p.anchors;
  data[1] = draw.list / 4;
  data[2] = p.capacity;
  data[3] = record;
  data[4] = draw.counter;
  data[5] = draw.batch.index;
  data[6] = draw.tiny > 0 ? 1 : 0;
  f32[7] = POINT_MARGIN;
  f32[8] = draw.tiny;
  data[9] = p.streams;
  data[10] = p.stride;
  world.ctx.device.queue.writeBuffer(draw.params, 0, data);
}

export function drawSplats(world: World, pass: GPURenderPassEncoder): void {
  if (![...world.pointDraws.values()].some((d) => d.tiny > 0)) {
    return;
  }
  pass.setPipeline(world.ctx.pipelines.splatResolve);
  pass.setBindGroup(0, world.ctx.currentViewBindGroup);
  pass.setBindGroup(1, world.splats.group);
  pass.draw(3);
}
