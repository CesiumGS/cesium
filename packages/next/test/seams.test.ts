import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import type { Engine } from "../src/scene/Engine.ts";
import type { MeshData } from "../src/scene/meshes.ts";
import { fakeEngine } from "./fakeGpu.ts";

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
 *   submission path.
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
 * alias of one), a record array filled or set, `writeDrawRecord` called, or
 * the records' mirrored table made.
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
    String.raw`\b(?:const|let|var)\s+(\w+)\s*=\s*(?:this\.)?${ARRAY.source}(?!\s*[[.])`,
    "g",
  );
  for (const m of source.matchAll(alias)) {
    local(m[1]!, m.index);
  }
  const destructured =
    /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*(?:this\.)?(?:records|drawConstants|constants)\b(?!\s*[[.])/g;
  for (const m of source.matchAll(destructured)) {
    for (const part of m[1]!.split(",")) {
      const name = part.split(":").pop()!.trim();
      if (/^\w+$/.test(name)) {
        local(name, m.index);
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
      } else if (/^\s*\.\s*(?:set|fill|copyWithin)\s*\(/.test(after)) {
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

/** Lines of a Slang module that index `records[` outside `drawRecord`. */
export function recordReadsOutsideAccessor(text: string): number[] {
  const lines = stripComments(text).split("\n");
  const out: number[] = [];
  let inSeam = false;
  let depth = 0;
  lines.forEach((line, i) => {
    if (/\bDrawRecord\s+drawRecord\s*\(/.test(line)) {
      inSeam = true;
      depth = 0;
    }
    if (inSeam) {
      for (const c of line) {
        depth += c === "{" ? 1 : c === "}" ? -1 : 0;
      }
      if (depth <= 0 && line.includes("}")) {
        inSeam = false;
      }
      return;
    }
    if (/\brecords\s*\[/.test(line)) {
      out.push(i + 1);
    }
  });
  return out;
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
}`;
    expect(recordWritesOutsideSeam(module)).toEqual([
      3, 5, 7, 9, 11, 13, 14, 15,
    ]);
  });

  it("record reads in Slang", () => {
    const module = `[[vk::binding(0, 1)]] StructuredBuffer<DrawRecord> records;
[ForceInline]
public DrawRecord drawRecord(uint index) {
  return records[index];
}
void main() {
  DrawRecord r = drawRecord(i);
  uint f = records[i].flags;
  // records[i]
}`;
    expect(recordReadsOutsideAccessor(module)).toEqual([8]);
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
    const violations: string[] = [];
    for (const path of files(src, /\.slang$/)) {
      for (const line of recordReadsOutsideAccessor(
        readFileSync(path, "utf8"),
      )) {
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    expect(violations).toEqual([]);
    for (const name of ["cullTables.slang", "surface.slang"]) {
      expect(
        /\bDrawRecord\s+drawRecord\s*\(\s*uint\s+\w+\s*\)/.test(
          readFileSync(join(src, "shaders", name), "utf8"),
        ),
      ).toBe(true);
    }
  });
});

describe("the draw-arguments and geometry-submission seams", () => {
  const seam = join(src, "render", "drawArguments.ts");

  it("issues indexed and indirect draws only in src/render/drawArguments.ts", () => {
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (path === seam) {
        continue;
      }
      for (const line of contentDraws(readFileSync(path, "utf8"))) {
        violations.push(`${relative(root, path)}:${line}`);
      }
    }
    expect(violations).toEqual([]);
    expect(contentDraws(readFileSync(seam, "utf8")).length).toBeGreaterThan(0);
  });

  it("binds vertex and index buffers only on the submission path", () => {
    const allowed = new Set([
      "World.recordBundle",
      "World.bindSlab",
      "Engine.drawOverlays",
    ]);
    const violations: string[] = [];
    for (const path of files(src, /\.ts$/)) {
      if (path === seam) {
        continue;
      }
      for (const where of bufferBinds(readFileSync(path, "utf8"))) {
        if (!allowed.has(where)) {
          violations.push(`${relative(root, path)}: ${where}`);
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
    const args = world.drawArguments;
    const slots = draws.map((d) => args.slotOf(d.index));
    // Five 32-bit words (20 bytes) a batch.
    expect([...slots].sort((a, b) => a - b)).toEqual([0, 20, 40]);
    expect(args.slotOf(shared.index)).toBe(slots[0]);
    // The bundle draws each batch from that slot.
    offsets = [];
    world.prepareFrame();
    expect([...offsets].sort((a, b) => a - b)).toEqual([0, 20, 40]);
    world.destroy();
  });
});
