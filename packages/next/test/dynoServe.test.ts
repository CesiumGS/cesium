// `npm run dyno` on a free port (CS-390).
import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { PORTS, canListen, freePort } from "../bench/suite/commands/serve.mjs";

describe("npm run dyno", () => {
  it("looks from 5200 to 5299, never at the owner's 5190", () => {
    expect(PORTS).toEqual({ from: 5200, to: 5299 });
  });

  it("takes the first port nothing listens on", async () => {
    const busy = new Set([5200, 5201, 5203]);
    expect(await freePort({ free: async (p: number) => !busy.has(p) })).toBe(
      5202,
    );
    busy.add(5202);
    expect(await freePort({ free: async (p: number) => !busy.has(p) })).toBe(
      5204,
    );
  });

  it("says so when the range is full", async () => {
    await expect(
      freePort({ from: 5200, to: 5202, free: async () => false }),
    ).rejects.toThrow(/no free port from 5200 to 5202/);
  });

  it("sees a port someone else listens on, and doesn't take it", async () => {
    const other = createServer();
    await new Promise<void>((r) => other.listen(0, "127.0.0.1", r));
    const { port } = other.address() as { port: number };
    try {
      expect(await canListen(port, "127.0.0.1")).toBe(false);
      expect(await freePort({ from: port, to: port + 1 })).not.toBe(port);
    } finally {
      await new Promise((r) => other.close(r));
    }
    expect(await canListen(port, "127.0.0.1")).toBe(true);
  });
});
