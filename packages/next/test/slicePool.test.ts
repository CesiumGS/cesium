import { beforeAll, describe, expect, it } from "vitest";
import { SlicePool, type SliceUser } from "../src/globe/SlicePool.ts";
import type { World } from "../src/scene/World.ts";
import { fakeDevice, installGpuGlobals } from "./fakeGpu.ts";

/** A layer holding no slices. */
function user(): SliceUser {
  return { needed: 0 };
}

describe("SlicePool", () => {
  beforeAll(() => installGpuGlobals());

  it("unbinds the array from the world before destroying it", () => {
    // A bind group naming a destroyed texture fails every submit it's in:
    // turning the globe off drew black frames until the array was unbound.
    const log: string[] = [];
    const world = {
      setImageryArray: (view: unknown) => {
        log.push(view === undefined ? "unbind" : "bind");
      },
    } as unknown as World;
    const only = user();
    const pool = SlicePool.acquire(fakeDevice({}), world, 256, 4, only);
    pool.texture.destroy = () => void log.push("destroy");
    pool.release(only);
    expect(log).toEqual(["bind", "unbind", "destroy"]);
  });

  it("keeps the array bound while another user remains", () => {
    const log: string[] = [];
    const world = {
      setImageryArray: (view: unknown) => {
        log.push(view === undefined ? "unbind" : "bind");
      },
    } as unknown as World;
    const device = fakeDevice({});
    const first = user();
    const pool = SlicePool.acquire(device, world, 256, 4, first);
    SlicePool.acquire(device, world, 256, 4, user());
    pool.texture.destroy = () => void log.push("destroy");
    pool.release(first);
    expect(log).not.toContain("unbind");
    expect(log).not.toContain("destroy");
  });
});

describe("SlicePool growth", () => {
  beforeAll(() => installGpuGlobals());

  it("binds the grown array before destroying the old one", () => {
    const log: string[] = [];
    const world = {
      setImageryArray: (view: unknown) => {
        log.push(view === undefined ? "unbind" : "bind");
      },
    } as unknown as World;
    const device = fakeDevice({});
    const pool = SlicePool.acquire(device, world, 256, 1, user());
    const first = pool.texture;
    first.destroy = () => void log.push("destroy old");
    log.length = 0;
    SlicePool.acquire(device, world, 256, 8, user()); // grows
    expect(log).toEqual(["bind", "destroy old"]);
  });
});
