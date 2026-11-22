// The device-facts seam (docs/superpowers/plans/2026-11-13-engine-profiles.md,
// sections 2 and 5; CS-22): only the device layer (`src/gpu/`) and the
// profile layer (`src/profile/`) read what the device offers. Everything else
// reads the choices made from it: the paths (`paths(facts)`) and the profile's
// steps. A line elsewhere that reads the device's features, its adapter's
// info, the capabilities or the limits fails here, by file and line.
//
// The inspector (`widgets/`) shows the facts and is outside this scan: facts
// are visible there by design (the plan's layer table), and it chooses
// nothing from them.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../packages/core/", import.meta.url));
const src = join(root, "src");

/** The layers that may read device facts. */
const LAYERS = ["gpu", "profile"].map((name) => join(src, name));

/**
 * Files that only name members and read nothing: the protocol table lists the
 * members of `GpuDevice` (`adapterInfo`, `facts`...) as names, with the kind
 * each has in the worker façade (CS-567).
 */
const NAMES_ONLY = [join(src, "thread", "protocol.ts")];

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "generated" ? [] : files(path);
    }
    return /\.ts$/.test(name) && !/\.d\.ts$/.test(name) ? [path] : [];
  });
}

/** `source` with comments blanked (newlines kept, so offsets keep lines). */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (c) => " ".repeat(c.length));
}

/** WebGPU's limit names (`GPUSupportedLimits`), as a property read. */
const LIMIT_NAMES = String.raw`(?:maxTextureDimension[123]D|maxTextureArrayLayers|maxBindGroups\w*|maxBindingsPerBindGroup|max\w+PerPipelineLayout|max\w+PerShaderStage|max\w+In(?:Fragment|Vertex)Stage|max(?:Uniform|Storage)BufferBindingSize|min\w+OffsetAlignment|maxVertex(?:Buffers|Attributes|BufferArrayStride)|maxBufferSize|maxInterStageShaderVariables|maxColorAttachment\w*|maxComputeWorkgroup\w*|maxComputeInvocationsPerWorkgroup|maxImmediateSize)`;

/**
 * A content source's own capabilities (`SourceCapabilities`, CS-847): what
 * it selects, outputs and writes, not the device's. `capabilities.` before
 * one of these isn't a device fact.
 */
const SOURCE_CAPABILITY_FIELDS = String.raw`(?:selection|outputs|settles|pushes|polls|write)\b`;

/** The `Capabilities` fields (`GpuDevice.caps`), as a property read. */
const CAPABILITY_FIELDS = String.raw`(?:indirectFirstInstance|timestampQuery|subgroups|shaderF16|float32Blendable|textureCompression)`;

/** What reads a device fact, each with what it reads. */
const DETECTORS: readonly { reads: string; pattern: RegExp }[] = [
  {
    reads: "the device's features",
    pattern:
      /\b(?:device|adapter)\s*[?!]?\.\s*features\b|\.features\s*\.\s*has\s*\(/g,
  },
  {
    reads: "the adapter's info",
    pattern:
      /\badapter\s*[?!]?\.\s*(?:info|vendor|architecture|isFallbackAdapter)\b|\badapterInfo\b|\brequestAdapterInfo\b/g,
  },
  {
    reads: "the capabilities",
    pattern: new RegExp(
      String.raw`\bcapabilities\s*[?!]?\.\s*(?!${SOURCE_CAPABILITY_FIELDS})\w|\.\s*${CAPABILITY_FIELDS}\b|\bimport\b[^;]*\bCapabilities\b[^;]*from\s*"[^"]*GpuDevice`,
      "g",
    ),
  },
  {
    reads: "the limits",
    pattern: new RegExp(
      String.raw`\b(?:device|adapter)\s*[?!]?\.\s*limits\b|\{\s*limits\s*\}\s*=\s*[\w.?!]*\b(?:device|gpu)\b|\.\s*${LIMIT_NAMES}\b`,
      "g",
    ),
  },
  {
    reads: "the facts",
    pattern:
      /\bfacts\s*[?!]?\.\s*(?:features|adapter|probes|limitsTier|canvasFormat|renderer)\b|\bprobes\s*[?!]?\.\s*storageWritesRunPerSample\b|\bprobeResultsFor\s*\(|\bstorageWritesRunPerSample\s*\(/g,
  },
];

/** Each line of `text` that reads a device fact, with what it reads. */
export function factReads(text: string): { line: number; reads: string }[] {
  const source = stripComments(text);
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) {
      starts.push(i + 1);
    }
  }
  const lineOf = (offset: number) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= offset) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return lo + 1;
  };
  const out = new Map<number, string>();
  for (const { reads, pattern } of DETECTORS) {
    for (const m of source.matchAll(pattern)) {
      const line = lineOf(m.index);
      if (!out.has(line)) {
        out.set(line, reads);
      }
    }
  }
  return [...out]
    .map(([line, reads]) => ({ line, reads }))
    .sort((a, b) => a.line - b.line);
}

describe("the device-facts seam", () => {
  it("flags each kind of read", () => {
    const planted = [
      'if (device.features.has("float32-blendable")) {}', // 1
      "const f = gpu.device.features;", // 2
      "const v = engine.gpu.adapterInfo.vendor;", // 3
      "const a = adapter.info;", // 4
      "if (adapter.isFallbackAdapter) {}", // 5
      "if (engine.capabilities.timestampQuery) {}", // 6
      "const bc = caps.textureCompression.bc;", // 7
      'import { type Capabilities } from "../gpu/GpuDevice.ts";', // 8
      "const n = device.limits.maxTextureArrayLayers;", // 9
      "const { limits } = engine.ctx.device;", // 10
      "const m = limits.maxStorageBufferBindingSize;", // 11
      'if (gpu.facts.features.includes("subgroups")) {}', // 12
      "const p = facts.probes.storageWritesRunPerSample;", // 13
      "const s = await storageWritesRunPerSample(device);", // 14
      "// device.features.has in a comment is not a read", // 15
      "const ok = paths(gpu.facts).starSubmission;", // 16
      "const most = world.maxDraws;", // 17
      "if (source.capabilities.pushes) {}", // 18: a content source's: fine
      "const w = isReadOnly(source.capabilities.write);", // 19: fine
      "if (engine.capabilities.writeTimestamps) {}", // 20: not a source field
    ].join("\n");
    expect(factReads(planted).map((r) => r.line)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20,
    ]);
  });

  it("finds no read outside the device and profile layers", () => {
    const reads: string[] = [];
    for (const path of files(src)) {
      if (
        LAYERS.some((layer) => path.startsWith(`${layer}/`)) ||
        NAMES_ONLY.includes(path)
      ) {
        continue;
      }
      const text = readFileSync(path, "utf8");
      const lines = text.split("\n");
      for (const { line, reads: what } of factReads(text)) {
        reads.push(
          `${relative(root, path)}:${line} reads ${what}: ${lines[line - 1]!.trim()}`,
        );
      }
    }
    expect(reads).toEqual([]);
  });
});
