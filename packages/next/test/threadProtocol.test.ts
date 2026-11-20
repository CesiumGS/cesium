// The protocol table (src/thread/protocol.ts) against the code: every name in
// api/surface.txt has a thread kind, and so has every public member of the
// engine types (docs/superpowers/plans/2026-11-13-worker-facade.md, section 1).
// The checks are per name and pin no total: a change that adds or removes an
// export or a member adds or removes one name in the table, and nothing else.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { memberRows as codeMembers } from "../scripts/surfaceMap.mjs";
import {
  checkProtocol,
  engineOwners,
  memberKindOf,
  memberRows,
  protocolRows,
  threadKindOf,
  type MemberSurfaceRow,
  type SurfaceRow,
} from "../src/thread/protocol.ts";

const surface: SurfaceRow[] = readFileSync("api/surface.txt", "utf8")
  .split("\n")
  .slice(1)
  .filter((line) => line.length > 0)
  .map((line) => {
    const [entry, name, kind] = line.split("\t") as [string, string, string];
    return { entry, name, kind };
  });

/** The public members of the engine types, as the TypeScript checker lists them. */
const members: MemberSurfaceRow[] = codeMembers(engineOwners(surface));

const owner = (entry: string, name: string) => ({ entry, owner: name });

describe("the protocol table", () => {
  it("gives every export of api/surface.txt a kind, and lists nothing else", () => {
    expect(checkProtocol(surface)).toEqual({
      unclassified: [],
      stale: [],
      duplicated: [],
      misclassified: [],
    });
  });

  it("gives every public member of an engine type a kind, and lists nothing else", () => {
    expect(members.length).toBeGreaterThan(0);
    expect(checkProtocol(surface, protocolRows(), { actual: members })).toEqual(
      { unclassified: [], stale: [], duplicated: [], misclassified: [] },
    );
  });

  it("answers by entry and name", () => {
    expect(threadKindOf(".", "Engine")).toBe("engine");
    expect(threadKindOf(".", "EngineOptions")).toBe("type");
    expect(threadKindOf(".", "vec3.add")).toBe("local");
    expect(threadKindOf("widgets", "Viewer")).toBe("engine");
    expect(threadKindOf("frames", "Frame")).toBe("local");
    expect(threadKindOf("frames", "NotAnExport")).toBeUndefined();
  });

  it("answers for members by entry, owner and name", () => {
    expect(memberKindOf(".", "Engine", "onTick")).toBe("callback");
    expect(memberKindOf(".", "Engine", "createWorld")).toBe("handle");
    expect(memberKindOf(".", "Engine", "loadTileset")).toBe("query");
    expect(memberKindOf(".", "Engine", "static.create")).toBe("query");
    expect(memberKindOf(".", "Camera", "position")).toBe("mutation");
    expect(memberKindOf(".", "View", "toPixel")).toBe("sync-read");
    expect(memberKindOf(".", "View", "target")).toBe("dom");
    expect(memberKindOf("widgets", "Viewer", "canvas")).toBe("dom");
    expect(memberKindOf(".", "GpuDevice", "device")).toBe("cannot-cross");
    expect(memberKindOf(".", "Engine", "notAMember")).toBeUndefined();
  });

  it("lists the engine types the surface map declares as a class or an interface", () => {
    const owners = engineOwners(surface).map(
      ({ entry, name }) => `${entry}:${name}`,
    );
    expect(owners).toContain(".:Engine");
    expect(owners).toContain(".:QueryHost");
    expect(owners).toContain("widgets:Viewer");
    expect(owners).not.toContain(".:createWorld");
    expect(owners).not.toContain(".:EngineOptions");
  });
});

describe("the per-name checks fail by name", () => {
  it("on a new export with no kind", () => {
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

  it("on a name the surface map no longer exports", () => {
    const removed = surface.filter(
      (row) => !(row.entry === "." && row.name === "Engine"),
    );
    expect(checkProtocol(removed).stale).toEqual([
      ". Engine is not in the surface map",
    ]);
  });

  it("on a name listed under two kinds", () => {
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

  it("on a new member of an engine type with no kind", () => {
    const added: MemberSurfaceRow[] = [
      ...members,
      { ...owner(".", "Camera"), name: "brandNewMember", callable: true },
      { ...owner("widgets", "Viewer"), name: "static.other", callable: false },
    ];
    const found = checkProtocol(surface, protocolRows(), { actual: added });
    expect(found.unclassified).toEqual([
      "Camera.brandNewMember has no thread kind",
      "widgets:Viewer.static.other has no thread kind",
    ]);
    expect(found.stale).toEqual([]);
  });

  it("on a member the code no longer has", () => {
    const removed = members.filter(
      (m) => !(m.entry === "." && m.owner === "Camera" && m.name === "fov"),
    );
    const found = checkProtocol(surface, protocolRows(), { actual: removed });
    expect(found.stale).toEqual([". Camera.fov is not a public member"]);
    expect(found.unclassified).toEqual([]);
  });

  it("on a member of an owner that is no longer an engine type", () => {
    const removed = members.filter((m) => m.owner !== "ViewLink");
    const found = checkProtocol(surface, protocolRows(), { actual: removed });
    expect(found.stale.length).toBeGreaterThan(0);
    expect(found.stale.every((line) => line.startsWith(". ViewLink."))).toBe(
      true,
    );
  });

  it("on a member listed under two kinds", () => {
    const rows = [
      ...memberRows(),
      { ...owner(".", "Camera"), name: "fov", kind: "command" as const },
    ];
    const found = checkProtocol(surface, protocolRows(), {
      actual: members,
      rows,
    });
    expect(found.duplicated).toEqual([
      ". Camera.fov is listed 2 times (mutation, command)",
    ]);
  });

  it("on a command, handle or sync read that can't be called", () => {
    const rows = memberRows().map((row) =>
      row.entry === "." && row.owner === "Camera" && row.name === "position"
        ? { ...row, kind: "command" as const }
        : row,
    );
    const found = checkProtocol(surface, protocolRows(), {
      actual: members,
      rows,
    });
    expect(found.misclassified).toEqual([
      "Camera.position can't be called, so it is not a command",
    ]);
  });
});
