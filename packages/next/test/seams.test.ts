import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { RAY_MODULES, rayBypasses, rayProgram } from "./raySeam.ts";

/**
 * Seams for later WebGPU features (CESIUM2_WEBGPU_PLAN.md §7.1's bindless
 * pattern: design for it, don't build it; plan 5a's call 37). Each is one
 * place every caller goes through, so the feature replaces an emulation
 * there rather than call sites:
 *
 * - per-draw constants (immediates, push constants): records are written
 *   only by `src/render/drawConstants.ts` and read in Slang only through
 *   `drawRecord(index)`;
 * - draw arguments (multi-draw indirect, GPU-driven submission): content
 *   draws are issued only by `src/render/drawArguments.ts`, and a record's
 *   batch's argument slot (`DrawArguments.slotOf`) is its pointer to them;
 * - geometry submission: vertex and index buffers are bound only on the
 *   submission path;
 * - per-draw placements (plan 5a's call 42): the placements buffer is
 *   written only by `src/scene/placementTable.ts` and read in Slang only
 *   through placement.slang's `placementRow`, so a per-draw data backend
 *   (or the later tessellation engine) replaces those two;
 * - rays (a hardware ray-query engine, spec section 7.10): the examples and
 *   `measure` reach rays only through the query interface
 *   (`src/query/queries.ts`, `Engine.queries`), never `castTerrainRay`, a
 *   tileset's ray target, `World.castRays` or a tileset's retained
 *   geometry, so swapping the engine changes the answers, not the callers.
 *
 * Like test/bindless.test.ts, each check scans the sources, and each
 * detector is first shown to flag a bypass.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "src");

function files(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" || name === "generated"
        ? []
        : files(path, pattern);
    }
    return pattern.test(name) ? [path] : [];
  });
}

/** `source` with comments blanked (newlines kept, so offsets keep lines). */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (c) => " ".repeat(c.length));
}

function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) {
    if (source.charCodeAt(i) === 10) {
      line++;
    }
  }
  return line;
}

/** The offset just past the `]` matching the `[` at `open`. */
function closing(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    depth += c === "[" ? 1 : c === "]" ? -1 : 0;
    if (depth === 0) {
      return i + 1;
    }
  }
  return source.length;
}

const ASSIGN = /^\s*(?:\*\*|<<|>>>|>>|[-+*/%&|^])?=(?!=)|^\s*(?:\+\+|--)/;
const ARRAY =
  /(?:\brecords(?:U32|F32)\b|\b(?:records|drawConstants|constants)\.(?:u32|f32)\b)/;

/**
 * Lines of a TypeScript module that write draw records other than through
 * the seam: an element of a record array assigned (also through a local
 * alias of one), a record array filled or set or cast (its read-only type
 * is what keeps other writes out), `writeDrawRecord` called, or the
 * records' mirrored table made.
 */
export function recordWritesOutsideSeam(text: string): number[] {
  const source = stripComments(text);
  const out = new Set<number>();
  // Each write target: a record array anywhere, or a local alias of one
  // from its declaration to the end of its block.
  const targets: { pattern: RegExp; from: number; to: number }[] = [
    { pattern: new RegExp(ARRAY.source, "g"), from: 0, to: source.length },
  ];
  const local = (name: string, from: number) =>
    targets.push({
      pattern: new RegExp(String.raw`(?<![.\w])${name}\b`, "g"),
      from,
      to: blockEnd(source, from),
    });
  const alias = new RegExp(
    String.raw`\b(?:const|let|var)\s+(\w+)\s*=\s*(?:\w+[?!]?\.)*${ARRAY.source}(?!\s*[[.])`,
    "g",
  );
  for (const m of source.matchAll(alias)) {
    local(m[1]!, m.index);
  }
  const destructured =
    /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(?:\w+[?!]?\.)*(?:records|drawConstants|constants)\b(?!\s*[[.])/g;
  for (const m of source.matchAll(destructured)) {
    for (const part of m[1]!.split(",")) {
      const name = part.split(":").pop()!.trim();
      if (/^\w+$/.test(name)) {
        local(name, m.index);
      }
    }
  }
  // A record array taken by name out of a world's data or a context.
  const named =
    /\b(?:const|let|var)\s*\{([^}]*\brecords(?:U32|F32)\b[^}]*)\}\s*=/g;
  for (const m of source.matchAll(named)) {
    for (const part of m[1]!.split(",")) {
      const [key, name] = part.split(":").map((s) => s.trim());
      if (/^records(?:U32|F32)$/.test(key!)) {
        local(name ?? key!, m.index);
      }
    }
  }
  for (const { pattern, from, to } of targets) {
    for (const m of source.slice(0, to).matchAll(pattern)) {
      if (m.index < from) {
        continue;
      }
      const end = m.index + m[0].length;
      const before = source.slice(Math.max(0, m.index - 2), m.index);
      const after = source.slice(end, end + 200);
      const open = /^\s*\[/.exec(after);
      if (open) {
        const rest = source.slice(closing(source, end + open[0].length - 1));
        if (ASSIGN.test(rest) || before === "++" || before === "--") {
          out.add(lineAt(source, m.index));
        }
      } else if (
        /^\s*\.\s*(?:set|fill|copyWithin)\s*\(/.test(after) ||
        /^\s*as\b/.test(after)
      ) {
        out.add(lineAt(source, m.index));
      }
    }
  }
  for (const m of source.matchAll(/(?<!function\s+)\bwriteDrawRecord\s*\(/g)) {
    out.add(lineAt(source, m.index));
  }
  for (const m of source.matchAll(/new\s+MirroredTable\s*\([^)]*"records"/g)) {
    out.add(lineAt(source, m.index));
  }
  return [...out].sort((a, b) => a - b);
}

/** The offset of the `}` closing the block that holds `offset`. */
function blockEnd(source: string, offset: number): number {
  let depth = 0;
  for (let i = offset; i < source.length; i++) {
    const c = source[i];
    depth += c === "{" ? 1 : c === "}" ? -1 : 0;
    if (depth < 0) {
      return i;
    }
  }
  return source.length;
}

/** The seams' GPU buffers, as the world names them. */
const SEAM_BUFFERS =
  /\b(?:recordBuffer|drawConstants\.buffer|drawArguments\.(?:buffer|itemList))\b/;

/** The placements buffer, as the world and its table name it. */
const PLACEMENT_BUFFERS =
  /\b(?:placementTable\.buffer|placementBuffer|placements)\b/;

/**
 * Lines of a TypeScript module that write a seam's GPU buffer from the CPU
 * (`writeBuffer`, `clearBuffer`, `copyBufferToBuffer` naming it).
 */
export function seamBufferWrites(
  text: string,
  buffers: RegExp = SEAM_BUFFERS,
): number[] {
  const source = stripComments(text);
  const out = new Set<number>();
  for (const m of source.matchAll(
    /\.\s*(?:writeBuffer|clearBuffer|copyBufferToBuffer)\s*\(/g,
  )) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      depth += source[end] === "(" ? 1 : source[end] === ")" ? -1 : 0;
      if (depth === 0) {
        break;
      }
    }
    if (buffers.test(source.slice(open, end + 1))) {
      out.add(lineAt(source, m.index));
    }
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * The offset ranges of the bodies of the functions named in `names` in a
 * Slang module (definitions only: a forward declaration has no body).
 */
function bodies(source: string, names: readonly string[]): [number, number][] {
  const out: [number, number][] = [];
  const definition = new RegExp(
    String.raw`\b(?:${names.join("|")})\s*\([^()]*\)\s*\{`,
    "g",
  );
  for (const m of source.matchAll(definition)) {
    const open = m.index + m[0].length - 1;
    out.push([open, blockEnd(source, open + 1)]);
  }
  return out;
}

/** Lines of Slang source that index `buffer[` outside the `accessors`. */
function indexedOutside(
  text: string,
  buffer: string,
  accessors: readonly string[],
): number[] {
  const source = stripComments(text);
  const seams = bodies(source, accessors);
  const out = new Set<number>();
  for (const m of source.matchAll(
    new RegExp(String.raw`\b${buffer}\s*\[`, "g"),
  )) {
    if (!seams.some(([from, to]) => m.index > from && m.index < to)) {
      out.add(lineAt(source, m.index));
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** Lines of a Slang module that index `records[` outside `drawRecord`. */
export function recordReadsOutsideAccessor(text: string): number[] {
  return indexedOutside(text, "records", ["drawRecord"]);
}

/** Lines of a Slang module that index `placements[` outside `placementRow`. */
export function placementReadsOutsideAccessor(text: string): number[] {
  return indexedOutside(text, "placements", ["placementRow"]);
}

/** Lines of a Slang module that declare a buffer named `placements`. */
export function placementTables(text: string): number[] {
  const source = stripComments(text);
  return [...source.matchAll(/StructuredBuffer\s*<[^>]*>\s+placements\b/g)].map(
    (m) => lineAt(source, m.index),
  );
}

/** cullTables.slang's draw-argument accessors (the arguments' seam). */
const ARGUMENT_ACCESSORS = [
  "argumentSlot",
  "countInstance",
  "countedInstances",
  "storeIndexedArguments",
  "storeArgument",
  "countChunks",
  "countedChunks",
  "storePatchArguments",
] as const;

/** Lines of a Slang module that index `args[` outside its accessors. */
export function argumentsOutsideAccessors(text: string): number[] {
  return indexedOutside(text, "args", ARGUMENT_ACCESSORS);
}

/** Lines of a Slang module that define any of `names` (with a body). */
export function definitions(text: string, names: readonly string[]): number[] {
  const source = stripComments(text);
  return bodies(source, names).map(([open]) => lineAt(source, open));
}

/** A Slang module's buffers of draw records: line and name. */
export function recordTables(text: string): { line: number; name: string }[] {
  const source = stripComments(text);
  return [
    ...source.matchAll(
      /\b(?:RW)?StructuredBuffer\s*<\s*DrawRecord\s*>\s+(\w+)/g,
    ),
  ].map((m) => ({ line: lineAt(source, m.index), name: m[1]! }));
}

/** Lines of a TypeScript module that issue indexed or indirect draws. */
export function contentDraws(text: string): number[] {
  const source = stripComments(text);
  return [
    ...source.matchAll(
      /\.\s*(?:drawIndexedIndirect|drawIndexed|drawIndirect)\s*\(/g,
    ),
  ].map((m) => lineAt(source, m.index));
}

/**
 * Where a TypeScript module binds vertex or index buffers: `Class.member`
 * per call (members at a class's two-space indentation, as prettier
 * writes them).
 */
export function bufferBinds(text: string): string[] {
  const lines = stripComments(text).split("\n");
  const out: string[] = [];
  let cls = "";
  let member = "";
  for (const line of lines) {
    const c =
      /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(line);
    if (c) {
      cls = c[1]!;
      member = "";
    } else if (line.startsWith("}")) {
      cls = "";
      member = "";
    }
    const m =
      /^ {2}(?:(?:private|public|protected|static|readonly|async|override|get|set)\s+)*#?(?!(?:if|for|while|switch|return|catch|await|new|throw|typeof|super)\b)(\w+)\s*(?:<[^>]*>)?\s*\(/.exec(
        line,
      );
    if (m) {
      member = m[1]!;
    } else if (/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/.test(line)) {
      cls = "";
      member = /function\s+(\w+)/.exec(line)![1]!;
    }
    const binds = line.match(/\.\s*(?:setVertexBuffer|setIndexBuffer)\s*\(/g);
    for (let k = 0; k < (binds?.length ?? 0); k++) {
      out.push(cls ? `${cls}.${member}` : member);
    }
  }
  return out;
}

/**
 * Modules under `examples/` that keep or read retained geometry for
 * something other than rays, and what for. Rays through it are still
 * flagged by the other rules.
 */
const RETAINED_NOT_FOR_RAYS: Record<string, string> = {
  "examples/design-globe/siteLoader.ts":
    "keeps its tiles' geometry for the measure tool's snaps",
};

describe("seam detectors flag bypasses", () => {
  it("record writes", () => {
    const module = `function one() {
const o = i * RECORD_WORDS;
this.recordsU32[o + FLAGS_WORD] = 1;
const x = this.recordsU32[o + FLAGS_WORD]!;
this.recordsF32[o + RADIUS_WORD] -= 2;
const u = this.recordsU32;
u[o] |= 4;
if (u[o] === 4) {}
this.drawConstants.u32[o] = 1;
const { u32 } = this.drawConstants;
u32[a[o]] = 3;
// this.recordsU32[o] = 1;
writeDrawRecord(f32, u32, 0, data);
this.records.f32.fill(0);
new MirroredTable(ctx, "records", RECORD_WORDS, n);
new MirroredTable(ctx, "transforms", TRANSFORM_WORDS, n);
}
function other() {
  const u = this.transforms.u32;
  u[o] = 1;
  const flags = this.recordsU32[o + FLAGS_WORD]!;
  this.flags[o] = flags;
  const w = this.recordsU32 as Uint32Array;
  (this.drawConstants.f32 as unknown as Float32Array)[o] = 2;
}`;
    expect(recordWritesOutsideSeam(module)).toEqual([
      3, 5, 7, 9, 11, 13, 14, 15, 23, 24,
    ]);
  });

  it("record writes in a helper that takes the world as an argument", () => {
    const module = `function moved(world: World, engine: Engine) {
  const u = world.recordsU32;
  u[o] |= 4;
  world.recordsF32[o + RADIUS_WORD] -= 2;
  const { u32 } = world.drawConstants;
  u32[o] = 3;
  const c = engine.world!.recordsU32;
  c[o] = 1;
  const flags = world.recordsU32[o]!;
  this.flags[o] = flags;
}`;
    expect(recordWritesOutsideSeam(module)).toEqual([3, 4, 6, 8]);
  });

  it("record writes through a world's rasterizer data", () => {
    const module = `function moved(world: DrawWorld) {
  const u = world.raster.recordsU32;
  u[o] |= 4;
  world.raster.recordsF32[o] -= 2;
  const { recordsU32 } = world.raster;
  recordsU32[o] = 1;
  const { recordsF32: f } = world.raster;
  f[o] = 1;
  const { u32 } = world.raster.drawConstants;
  u32[o] = 3;
}`;
    expect(recordWritesOutsideSeam(module)).toEqual([3, 4, 6, 8, 10]);
  });

  it("CPU writes of the seams' GPU buffers", () => {
    const module = `queue.writeBuffer(this.recordBuffer, 0, data);
queue.writeBuffer(this.batchBuffer, 0, table);
encoder.clearBuffer(
  this.drawArguments.buffer,
  0,
  20,
);
encoder.copyBufferToBuffer(old, 0, this.drawConstants.buffer, 0, n);
queue.writeBuffer(this.drawArguments.itemList, 0, f(a, b));
pass.setBindGroup(0, group(this.recordBuffer));`;
    expect(seamBufferWrites(module)).toEqual([1, 3, 8, 9]);
  });

  it("record reads in Slang", () => {
    const module = `[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
DrawRecord drawRecord(uint index);
uint early(uint i) {
  return records[i].flags;
}
[ForceInline]
public DrawRecord drawRecord(uint index) {
  return records[index];
}
void main() {
  DrawRecord r = drawRecord(i);
  uint f = records[i].flags;
  // records[i]
}`;
    // A forward declaration is not the seam.
    expect(recordReadsOutsideAccessor(module)).toEqual([4, 12]);
    expect(definitions(module, ["drawRecord"])).toEqual([7]);
  });

  it("record tables in Slang under another name, or read-write", () => {
    const module = `[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[[vk::binding(1, 1)]] StructuredBuffer< DrawRecord > draws;
[[vk::binding(2, 1)]] RWStructuredBuffer<DrawRecord> scratch;
uint f(uint i) {
  return draws[i].flags; // no records[: only the name gives it away
}`;
    expect(recordReadsOutsideAccessor(module)).toEqual([]);
    expect(recordTables(module)).toEqual([
      { line: 1, name: "records" },
      { line: 2, name: "draws" },
      { line: 3, name: "scratch" },
    ]);
  });

  it("draw arguments in Slang", () => {
    const module = `[[vk::binding(7, 1)]] public RWStructuredBuffer<Atomic<uint>> args;
public uint argumentSlot(uint batch) {
  uint a = batch * ARGUMENT_WORDS;
  return a;
}
public void storeArgument(uint a, uint word, uint value) {
  args[a + word].store(value);
}
void append(uint batch, uint item) {
  uint slot = args[batch * 5u + 1u].add(1u);
}
void writePointArgs() {
  uint a = argumentSlot(pointCull.batch);
  storeArgument(a, 0u, 6u);
  args[a + 1u].store(1u);
}`;
    expect(argumentsOutsideAccessors(module)).toEqual([10, 15]);
    expect(definitions(module, ARGUMENT_ACCESSORS)).toEqual([2, 6]);
  });

  it("placements in Slang, and CPU writes of their buffer", () => {
    const module = `[[vk::binding(7, 1)]] StructuredBuffer<float4> placements;
[ForceInline]
float4 placementRow(uint row) {
  return placements[row];
}
float3 sneak(uint at) {
  return placements[at + 1u].xyz;
}`;
    expect(placementReadsOutsideAccessor(module)).toEqual([7]);
    expect(placementTables(module)).toEqual([1]);
    expect(
      placementTables("RWStructuredBuffer< float4 > placements;\n"),
    ).toEqual([1]);
    const writes = `queue.writeBuffer(this.placementTable.buffer, 0, data);
queue.writeBuffer(this.recordBuffer, 0, data);
encoder.copyBufferToBuffer(
  old, 0, placements, 0, n,
);
pass.setBindGroup(1, group(this.placementTable.buffer));`;
    expect(seamBufferWrites(writes, PLACEMENT_BUFFERS)).toEqual([1, 3]);
  });

  it("content draws and buffer binds", () => {
    const module = `export class World {
  private recordBundle(): void {
    encoder.setIndexBuffer(b, "uint32");
  }
  encodeTranslucent(pass: GPURenderPassEncoder): void {
    pass.setVertexBuffer(0, list);
    pass.draw(3);
    pass.drawIndexed(6, 1);
    pass.drawIndexedIndirect(args, 0);
  }
}
function overlay() {
  pass.drawIndirect(args, 0);
}`;
    expect(contentDraws(module)).toEqual([8, 9, 13]);
    expect(bufferBinds(module)).toEqual([
      "World.recordBundle",
      "World.encodeTranslucent",
    ]);
  });
});

describe("the ray seam's detector flags bypasses", () => {
  it("by what imports and names resolve to, and members of any spelling", () => {
    // Each line marked "rays" or "retained" must be flagged so, and no
    // other line: aliases, namespaces, the package's index, dynamic and
    // type imports, members bracketed or destructured, a tile under
    // another name.
    const lines = [
      `import { castTerrainRay } from "../src/globe/terrainRay.ts"; // rays`,
      `import { castTerrainRay as trace } from "../src/index.ts"; // rays`,
      `import * as next from "../src/index.ts";`,
      `import type { TerrainRayTarget } from "../src/globe/terrainRay.ts"; // rays`,
      `import { drawBackend } from "../src/query/drawBackend.ts"; // rays`,
      `import { castEllipsoid } from "../src/query/ellipsoidBackend.ts"; // rays`,
      `import { castFrameRays } from "../src/query/frameRays.ts"; // rays`,
      `import { terrainQueries, terrainBackend } from "../src/query/terrainBackend.ts"; // rays`,
      `import { terrainQueries as fine } from "../src/query/terrainBackend.ts";`,
      `import type { Tile } from "../src/streaming/Tile.ts";`,
      `import type { World } from "../src/scene/World.ts";`,
      `import type { Engine } from "../src/scene/Engine.ts";`,
      `export * from "../src/query/drawBackend.ts"; // rays`,
      `export { castRays as moved } from "../src/scene/world/rays.ts"; // rays`,
      `export { globeTarget } from "../src/query/terrainBackend.ts"; // rays`,
      `declare const tile: Tile;`,
      `declare const world: World;`,
      `declare const engine: Engine;`,
      `declare const target: TerrainRayTarget;`,
      `// castTerrainRay and world.castRays in a comment are no call.`,
      `void next.castTerrainRay; // rays`,
      `void trace; // rays`,
      `const w = world;`,
      `void w.castRays([], {}); // rays`,
      `void engine.queries.castRays({ anchor: undefined, seconds: 0, rays: [], targets: [] });`,
      `const q = engine.queries;`,
      `void q.castRays({ anchor: undefined, seconds: 0, rays: [], targets: [] });`,
      `void world["castRays"]; // rays`,
      `const { castRays } = world; // rays`,
      `void castRays;`,
      `void engine.tilesets[0]!.terrainRayTarget(1); // rays`,
      `const t = tile;`,
      `void t.geometry; // retained`,
      `const { geometry } = tile; // retained`,
      `void geometry;`,
      `void tile["geometry"]; // retained`,
      `const overlay = { geometry: 1 };`,
      `void overlay.geometry;`,
      `const options = { retainGeometry: true }; // retained`,
      `void options;`,
      `void (await import("../src/globe/terrainRay.ts")); // rays`,
      `void fine; void target;`,
      `void terrainQueries; void terrainBackend; // rays`,
      `void castEllipsoid; void castFrameRays; // rays`,
      `export {};`,
    ];
    const marked = (mark: string) =>
      lines.flatMap((l, i) => (l.endsWith(`// ${mark}`) ? [i + 1] : []));
    const path = join(root, "examples", "__ray_seam_snippet__.ts");
    const program = rayProgram([], { [path]: lines.join("\n") });
    expect(rayBypasses(program, program.getSourceFile(path)!)).toEqual({
      rays: marked("rays"),
      retained: marked("retained"),
    });
  });
});

describe("the per-draw constants seam", () => {
  it("writes draw records only in src/render/drawConstants.ts", () => {
    const seam = join(src, "render", "drawConstants.ts");
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (path === seam) {
        continue;
      }
      for (const line of recordWritesOutsideSeam(readFileSync(path, "utf8"))) {
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    expect(violations).toEqual([]);
    // The seam is where they are written.
    expect(
      recordWritesOutsideSeam(readFileSync(seam, "utf8")).length,
    ).toBeGreaterThan(0);
  });

  it("reads draw records in Slang only through drawRecord", () => {
    // The modules that bind the records, each with its accessor: a
    // per-draw constants backend replaces these four functions.
    const readers = [
      "cullTables.slang",
      "surface.slang",
      "raycast.slang",
      "layouts.slang",
    ].map((name) => join(src, "shaders", name));
    const violations: string[] = [];
    for (const path of files(src, /\.slang$/)) {
      const text = readFileSync(path, "utf8");
      const where = relative(root, path);
      for (const line of recordReadsOutsideAccessor(text)) {
        violations.push(`${where}:${line} reads records[`);
      }
      const reader = readers.includes(path);
      for (const line of definitions(text, ["drawRecord"])) {
        if (!reader) {
          violations.push(`${where}:${line} defines drawRecord`);
        }
      }
      for (const { line, name } of recordTables(text)) {
        if (!reader || name !== "records") {
          violations.push(`${where}:${line} binds draw records as ${name}`);
        }
      }
    }
    expect(violations).toEqual([]);
    for (const path of readers) {
      const text = readFileSync(path, "utf8");
      expect(
        /\bDrawRecord\s+drawRecord\s*\(\s*uint\s+\w+\s*\)/.test(text),
      ).toBe(true);
      expect(definitions(text, ["drawRecord"]).length).toBe(1);
      expect(recordTables(text).map((t) => t.name)).toEqual(["records"]);
    }
  });

  it("writes the records' GPU table only through the seam", () => {
    const seams = [
      join(src, "render", "drawConstants.ts"),
      join(src, "render", "drawArguments.ts"),
    ];
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (seams.includes(path)) {
        continue;
      }
      for (const line of seamBufferWrites(readFileSync(path, "utf8"))) {
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("the placements buffer", () => {
  const module = join(src, "shaders", "placement.slang");
  const table = join(src, "scene", "placementTable.ts");

  it("is read in Slang only through placement.slang's placementRow", () => {
    const violations: string[] = [];
    for (const path of files(src, /\.slang$/)) {
      const text = readFileSync(path, "utf8");
      const where = relative(root, path);
      for (const line of placementReadsOutsideAccessor(text)) {
        violations.push(`${where}:${line} reads placements[`);
      }
      if (path !== module) {
        for (const line of placementTables(text)) {
          violations.push(`${where}:${line} binds placements`);
        }
        for (const line of definitions(text, ["placementRow"])) {
          violations.push(`${where}:${line} defines placementRow`);
        }
      }
    }
    expect(violations).toEqual([]);
    const text = readFileSync(module, "utf8");
    expect(placementTables(text).length).toBe(1);
    expect(definitions(text, ["placementRow"]).length).toBe(1);
  });

  it("is written only by src/scene/placementTable.ts", () => {
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (path === table) {
        continue;
      }
      for (const line of seamBufferWrites(
        readFileSync(path, "utf8"),
        PLACEMENT_BUFFERS,
      )) {
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    expect(violations).toEqual([]);
    // Its own writes go through `this.gpu`; the buffer is made only there.
    for (const path of files(src, /\.ts$/)) {
      if (path !== table) {
        expect(readFileSync(path, "utf8")).not.toMatch(/"world\.placements"/);
      }
    }
    expect(readFileSync(table, "utf8")).toMatch(/"world\.placements"/);
  });
});

describe("the draw-arguments and geometry-submission seams", () => {
  const seam = join(src, "render", "drawArguments.ts");
  const stars = join(src, "atmosphere", "Sky.ts");
  const STAR_DRAW = "pass.drawIndirect(view.starArgs,";

  it("issues indexed and indirect draws only in src/render/drawArguments.ts", () => {
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (path === seam) {
        continue;
      }
      const text = readFileSync(path, "utf8");
      const lines = stripComments(text).split("\n");
      for (const line of contentDraws(text)) {
        // The stars' strips aren't content: no index buffer and no draw record, and
        // their own compute pass writes the arguments (Sky.starCull).
        if (path === stars && lines[line - 1]!.includes(STAR_DRAW)) {
          continue;
        }
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    expect(violations).toEqual([]);
    expect(contentDraws(readFileSync(seam, "utf8")).length).toBeGreaterThan(0);
    // The exception holds for that one call, and only there.
    expect(readFileSync(stars, "utf8")).toContain(STAR_DRAW);
    expect(
      contentDraws(
        `pass.drawIndirect(view.starArgs, 0);\npass.drawIndirect(args, 0);`,
      ),
    ).toHaveLength(2);
  });

  it("reaches draw arguments in Slang only through cullTables' accessors", () => {
    const tables = join(src, "shaders", "cullTables.slang");
    const violations: string[] = [];
    for (const path of files(src, /\.slang$/)) {
      const text = readFileSync(path, "utf8");
      for (const line of argumentsOutsideAccessors(text)) {
        violations.push(`${relative(root, path)}:${line} indexes args[`);
      }
      if (path !== tables) {
        for (const line of definitions(text, ARGUMENT_ACCESSORS)) {
          violations.push(
            `${relative(root, path)}:${line} defines an accessor`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
    expect(
      definitions(readFileSync(tables, "utf8"), ARGUMENT_ACCESSORS).length,
    ).toBe(ARGUMENT_ACCESSORS.length);
  });

  it("binds vertex and index buffers only on the submission path", () => {
    // Slabs (index buffers) and the overlays; the batches' item lists are
    // bound by DrawArguments.drawBatch.
    const allowed = new Set([
      "src/render/world/tables.ts: bindSlab",
      "src/render/view/outputPasses.ts: drawOverlays",
    ]);
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (path === seam) {
        continue;
      }
      const file = relative(root, path).replaceAll("\\", "/");
      for (const where of bufferBinds(readFileSync(path, "utf8"))) {
        // A free function's name alone says nothing: its file counts too.
        if (!allowed.has(where) && !allowed.has(`${file}: ${where}`)) {
          violations.push(`${file}: ${where}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

const square: MeshData = {
  positions: new Float32Array([
    -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
  ]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
  uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
};

describe("DrawArguments.slotOf", () => {
  let engine: Engine;
  /** The offsets of the opaque bundle's indirect draws. */
  let offsets: number[] = [];

  beforeAll(async () => {
    engine = await fakeEngine();
    const device = engine.gpu.device as unknown as Record<string, unknown>;
    const create = device.createRenderBundleEncoder as (
      d: GPURenderBundleEncoderDescriptor,
    ) => GPURenderBundleEncoder;
    device.createRenderBundleEncoder = (
      d: GPURenderBundleEncoderDescriptor,
    ) => {
      const encoder = create(d) as unknown as Record<string, unknown>;
      if (d.label === "world.bundle") {
        encoder.drawIndexedIndirect = (_: GPUBuffer, offset: number) => {
          offsets.push(offset);
        };
      }
      return encoder as unknown as GPURenderBundleEncoder;
    };
  });

  it("is the byte offset of the record's batch's arguments", () => {
    const world = engine.createWorld({
      maxDraws: 64,
      vertexBytes: 1 << 18,
      indexBytes: 1 << 18,
    });
    // Three meshes, three batches; a fourth draw shares the first's.
    const meshes = [0, 1, 2].map(() => world.addMesh(square));
    const draws = meshes.map((mesh, i) =>
      world.addDraw({ mesh, origin: new Float64Array([i, 0, 0]) }),
    );
    const shared = world.addDraw({
      mesh: meshes[0]!,
      origin: new Float64Array([0, 1, 0]),
    });
    const args = world.raster.drawArguments;
    const slots = draws.map((d) => args.slotOf(d.index));
    // Five 32-bit words (20 bytes) a batch.
    expect([...slots].sort((a, b) => a - b)).toEqual([0, 20, 40]);
    expect(args.slotOf(shared.index)).toBe(slots[0]);
    // The bundle draws each batch from that slot.
    offsets = [];
    world.prepareFrame();
    expect([...offsets].sort((a, b) => a - b)).toEqual([0, 20, 40]);
    // A slot that holds no draw has no arguments: removed, never used, or
    // past the table.
    world.removeDraw(shared);
    expect(() => args.slotOf(shared.index)).toThrow(RangeError);
    expect(args.slotOf(draws[0]!.index)).toBe(slots[0]);
    expect(() => args.slotOf(shared.index + 1)).toThrow(RangeError);
    expect(() => args.slotOf(1 << 20)).toThrow(RangeError);
    expect(() => args.slotOf(-1)).toThrow(RangeError);
    expect(() => args.slotOf(0.5)).toThrow(RangeError);
    world.destroy();
  });
});

describe("the ray seam", () => {
  const examples = join(root, "examples");
  const measure = join(src, "measure");
  let program: ReturnType<typeof rayProgram>;
  let scanned: string[];
  beforeAll(() => {
    scanned = [...files(examples, /\.ts$/), ...files(measure, /\.ts$/)];
    program = rayProgram(scanned);
  });

  it("examples and measure reach rays only through the query interface", () => {
    const violations: string[] = [];
    const allowed = new Set<string>();
    for (const path of scanned) {
      const where = relative(root, path).replaceAll("\\", "/");
      const found = rayBypasses(program, program.getSourceFile(path)!);
      for (const line of found.rays) {
        violations.push(`${where}:${line} reaches rays around src/query`);
      }
      if (found.retained.length > 0 && where in RETAINED_NOT_FOR_RAYS) {
        allowed.add(where);
      } else {
        for (const line of found.retained) {
          violations.push(
            `${where}:${line} reads a tileset's retained geometry (rays go through src/query; another use goes in RETAINED_NOT_FOR_RAYS with its reason)`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
    // Each allowance still holds: a stale one would let rays in unseen.
    expect([...allowed].sort()).toEqual(
      Object.keys(RETAINED_NOT_FOR_RAYS).sort(),
    );
  }, 120_000);

  it("the query interface's backends are where rays are reached", () => {
    const scan = (path: string) =>
      rayBypasses(program, program.getSourceFile(path)!).rays;
    // castTerrainRay imported and called, the globe's ray target read.
    expect(scan(RAY_MODULES.terrainBackend).length).toBeGreaterThanOrEqual(3);
    // The world's GPU cast called.
    expect(scan(RAY_MODULES.drawBackend).length).toBeGreaterThanOrEqual(1);
  });
});
