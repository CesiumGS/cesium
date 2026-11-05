import { beforeAll, describe, expect, it } from "vitest";
import { SlicePool } from "../src/globe/SlicePool.ts";
import type { World } from "../src/scene/World.ts";
import { fakeDevice, installGpuGlobals } from "./fakeGpu.ts";

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
    const pool = SlicePool.acquire(fakeDevice({}), world, 256, 4);
    pool.texture.destroy = () => log.push("destroy");
    pool.release(4);
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
    const pool = SlicePool.acquire(device, world, 256, 4);
    SlicePool.acquire(device, world, 256, 4);
    pool.texture.destroy = () => log.push("destroy");
    pool.release(4);
    expect(log).not.toContain("unbind");
    expect(log).not.toContain("destroy");
  });
});
