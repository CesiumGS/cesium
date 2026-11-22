// What a `World` is made over on a device that holds no content yet (the
// WebGL 2 device before CS-36): no GPU device, a plain binding size for its
// CPU tables, the engine's errors and wake, and the device's mirror. A world
// made so holds no geometry (its slab budgets are 0, and adding a mesh is
// refused with the budget's message) and draws nothing. CS-36 gives `World` a
// neutral host and this goes away.
import type { RenderContext } from "./RenderContext.ts";
import type { WorldMirror } from "./renderSeam.ts";
import type { World } from "./World.ts";

/** The binding size a headless world sizes its CPU tables by: the WebGPU default's. */
const BINDING_BYTES = 128 << 20;

/**
 * What the empty WebGL 2 device does with content: it refuses it, with this
 * error, wherever content reaches the device (geometry, textures, imagery),
 * so an app finds out at once that nothing would draw, not by a blank
 * canvas. The first draws arrive with CS-36.
 */
export function noContent(what: string): Error {
  return new Error(
    `The WebGL 2 renderer draws no content yet (CS-36), so it can't take ${what}.`,
  );
}

export interface HeadlessHost {
  wake(): void;
  readonly errors: RenderContext["errors"];
  createMirror(world: World): WorldMirror;
}

/** The context a headless world is made over. It has no device: `isHeadless` tells. */
export function headlessContext(host: HeadlessHost): RenderContext {
  return {
    device: undefined,
    capacities: { storageBindingBytes: BINDING_BYTES },
    errors: host.errors,
    wake: () => host.wake(),
    createMirror: (world: World) => host.createMirror(world),
  } as unknown as RenderContext;
}

/** The context has no GPU device behind it (`headlessContext`). */
export function isHeadless(ctx: RenderContext): boolean {
  return (ctx.device as unknown) === undefined;
}
