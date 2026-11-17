// The protocol table (src/thread/protocol.ts) against api/surface.txt: every
// exported name has a thread kind, and the counts are the plan's
// (docs/superpowers/plans/2026-11-13-worker-facade.md, section 1).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkProtocol,
  protocolRows,
  threadKindOf,
  type SurfaceRow,
  type ThreadKind,
} from "../src/thread/protocol.ts";

const surface: SurfaceRow[] = readFileSync("api/surface.txt", "utf8")
  .split("\n")
  .slice(1)
  .filter((line) => line.length > 0)
  .map((line) => {
    const [entry, name, kind] = line.split("\t") as [string, string, string];
    return { entry, name, kind };
  });

/** Section 1's table of exported names: type, local, engine, by entry point. */
const SECTION_1: Record<string, [number, number, number]> = {
  ".": [276, 176, 66],
  frames: [66, 55, 5],
  measure: [20, 13, 1],
  proj: [68, 41, 5],
  time: [5, 18, 0],
  widgets: [30, 2, 9],
};

const count = (entry: string | undefined, kind: ThreadKind) =>
  protocolRows().filter(
    (row) => (entry === undefined || row.entry === entry) && row.kind === kind,
  ).length;

describe("the protocol table", () => {
  it("gives every export of api/surface.txt a kind, and lists nothing else", () => {
    expect(checkProtocol(surface)).toEqual({
      unclassified: [],
      stale: [],
      duplicated: [],
      misclassified: [],
    });
  });

  it("matches section 1's counts by entry point", () => {
    for (const [entry, [type, local, engine]] of Object.entries(SECTION_1)) {
      expect(
        [count(entry, "type"), count(entry, "local"), count(entry, "engine")],
        entry,
      ).toEqual([type, local, engine]);
    }
  });

  it("matches section 1's totals: 465 types, 305 local, 86 engine, 856 names", () => {
    expect([count(undefined, "type"), count(undefined, "local")]).toEqual([
      465, 305,
    ]);
    expect(count(undefined, "engine")).toBe(86);
    expect(surface).toHaveLength(856);
    expect(protocolRows()).toHaveLength(856);
  });

  it("answers by entry and name", () => {
    expect(threadKindOf(".", "Engine")).toBe("engine");
    expect(threadKindOf(".", "EngineOptions")).toBe("type");
    expect(threadKindOf(".", "vec3.add")).toBe("local");
    expect(threadKindOf("widgets", "Viewer")).toBe("engine");
    expect(threadKindOf("frames", "Frame")).toBe("local");
    expect(threadKindOf("frames", "NotAnExport")).toBeUndefined();
  });

  it("fails on a new export with no kind", () => {
    const added: SurfaceRow[] = [
      ...surface,
      { entry: ".", name: "BrandNewThing", kind: "function" },
      { entry: "frames", name: "BrandNewOptions", kind: "interface" },
    ];
    expect(checkProtocol(added).unclassified).toEqual([
      "BrandNewThing has no thread kind",
      "frames:BrandNewOptions has no thread kind",
    ]);
  });

  it("fails on a name the surface map no longer exports", () => {
    const removed = surface.filter(
      (row) => !(row.entry === "." && row.name === "Engine"),
    );
    expect(checkProtocol(removed).stale).toEqual([
      ". Engine is not in the surface map",
    ]);
  });

  it("fails on a name listed under two kinds", () => {
    const rows = [
      ...protocolRows(),
      { entry: ".", name: "Engine", kind: "local" as const },
    ];
    expect(checkProtocol(surface, rows).duplicated).toEqual([
      ". Engine is listed 2 times (engine, local)",
    ]);
  });

  it("never calls a class, function or constant a type", () => {
    const rows = protocolRows().map((row) =>
      row.entry === "." && row.name === "Engine"
        ? { ...row, kind: "type" as const }
        : row,
    );
    expect(checkProtocol(surface, rows).misclassified).toEqual([
      "Engine is a class, not a type",
    ]);
  });
});
