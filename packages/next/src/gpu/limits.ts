/**
 * Device limits by kind (CESIUM2_WEBGPU_PLAN.md §13.15).
 *
 * - **Binding counts** (per-stage storage buffers, sampled textures,
 *   samplers, bind groups) are code: every `@binding` is written into the
 *   WGSL and the layouts. They are designed to the `base` tier, the spec
 *   defaults, and the device is created without raising them, so a layout
 *   over the floor fails on every machine, the developer's included.
 * - **Capacities** (binding and buffer sizes, array layers) are data: they
 *   are requested at the adapter's values and tables grow into them.
 *
 * Bindless: when resource tables ship, a higher tier will raise nothing
 * here; textures move out of per-stage counts into a table (one binding),
 * so the `base` budget gets more headroom, not less. Until then every
 * texture a material reads goes through a texture reference (§13.15).
 */

/** Binding counts every pipeline fits: WebGPU's defaults. */
export const BASE_BINDING_LIMITS = {
  maxBindGroups: 4,
  maxStorageBuffersPerShaderStage: 8,
  maxSampledTexturesPerShaderStage: 16,
  maxSamplersPerShaderStage: 16,
  maxUniformBuffersPerShaderStage: 12,
  maxStorageTexturesPerShaderStage: 4,
  maxDynamicStorageBuffersPerPipelineLayout: 4,
  maxDynamicUniformBuffersPerPipelineLayout: 8,
} as const;

/** WebGPU's default capacities: what the `minimum` tier creates. */
export const BASE_CAPACITY_LIMITS = {
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
  maxTextureArrayLayers: 256,
  maxComputeWorkgroupStorageSize: 16384,
} as const;

/**
 * - `base`: binding counts at the spec defaults, capacities at the
 *   adapter's (the default).
 * - `minimum`: both at the spec defaults, to see on any machine what the
 *   smallest device would (Dyno's `?limits=minimum`).
 * - `adapter`: everything the adapter offers. Only for experiments: a
 *   layout that fits only here fails on other hardware.
 */
export type LimitsTier = "base" | "minimum" | "adapter";

/** The limits to request for a tier from `adapter`. */
export function requiredLimitsFor(
  tier: LimitsTier,
  adapter: GPUSupportedLimits,
): Record<string, number> {
  const capacities: Record<string, number> = {};
  for (const name of Object.keys(BASE_CAPACITY_LIMITS)) {
    capacities[name] = (adapter as unknown as Record<string, number>)[name]!;
  }
  switch (tier) {
    case "minimum":
      return {};
    case "base":
      return capacities;
    case "adapter": {
      const all: Record<string, number> = { ...capacities };
      for (const name of Object.keys(BASE_BINDING_LIMITS)) {
        all[name] = (adapter as unknown as Record<string, number>)[name]!;
      }
      return all;
    }
  }
}

/** Per-stage counts of a pipeline layout's bindings. */
export interface StageCounts {
  storageBuffers: number;
  uniformBuffers: number;
  sampledTextures: number;
  samplers: number;
  storageTextures: number;
}

const STAGES = [
  ["vertex", 0x1],
  ["fragment", 0x2],
  ["compute", 0x4],
] as const;

export type StageName = (typeof STAGES)[number][0];

function emptyCounts(): StageCounts {
  return {
    storageBuffers: 0,
    uniformBuffers: 0,
    sampledTextures: 0,
    samplers: 0,
    storageTextures: 0,
  };
}

/** Counts each stage's bindings over a layout's bind groups' entries. */
export function countBindings(
  groups: ReadonlyArray<ReadonlyArray<GPUBindGroupLayoutEntry> | undefined>,
): Record<StageName, StageCounts> {
  const counts = {
    vertex: emptyCounts(),
    fragment: emptyCounts(),
    compute: emptyCounts(),
  };
  for (const entries of groups) {
    for (const entry of entries ?? []) {
      for (const [stage, bit] of STAGES) {
        if ((entry.visibility & bit) === 0) {
          continue;
        }
        const c = counts[stage];
        if (entry.buffer) {
          const type = entry.buffer.type ?? "uniform";
          if (type === "uniform") {
            c.uniformBuffers++;
          } else {
            c.storageBuffers++;
          }
        } else if (entry.texture || entry.externalTexture) {
          c.sampledTextures++;
        } else if (entry.sampler) {
          c.samplers++;
        } else if (entry.storageTexture) {
          c.storageTextures++;
        }
      }
    }
  }
  return counts;
}

/** A limit a layout exceeds: what, where, and by how much. */
export interface LimitViolation {
  stage: StageName | "layout";
  limit: string;
  count: number;
  max: number;
}

const COUNT_LIMITS: ReadonlyArray<[keyof StageCounts, string]> = [
  ["storageBuffers", "maxStorageBuffersPerShaderStage"],
  ["uniformBuffers", "maxUniformBuffersPerShaderStage"],
  ["sampledTextures", "maxSampledTexturesPerShaderStage"],
  ["samplers", "maxSamplersPerShaderStage"],
  ["storageTextures", "maxStorageTexturesPerShaderStage"],
];

/** The limits `groups` exceed under `limits` (empty when it fits). */
export function layoutViolations(
  groups: ReadonlyArray<ReadonlyArray<GPUBindGroupLayoutEntry> | undefined>,
  limits: Readonly<Record<string, number>>,
): LimitViolation[] {
  const violations: LimitViolation[] = [];
  if (groups.length > limits.maxBindGroups!) {
    violations.push({
      stage: "layout",
      limit: "maxBindGroups",
      count: groups.length,
      max: limits.maxBindGroups!,
    });
  }
  const counts = countBindings(groups);
  for (const [stage] of STAGES) {
    for (const [key, limit] of COUNT_LIMITS) {
      const count = counts[stage][key];
      const max = limits[limit];
      if (max !== undefined && count > max) {
        violations.push({ stage, limit, count, max });
      }
    }
  }
  return violations;
}

export function describeViolations(
  label: string,
  violations: readonly LimitViolation[],
): string {
  const what = violations
    .map((v) =>
      v.stage === "layout"
        ? `${v.count} bind groups (${v.limit} ${v.max})`
        : `${v.count} in the ${v.stage} stage (${v.limit} ${v.max})`,
    )
    .join("; ");
  return `Pipeline layout "${label}" exceeds the device's limits: ${what}. Binding counts are designed to the base tier (CESIUM2_WEBGPU_PLAN.md §13.15).`;
}

/** Entries of every bind group layout a device created, for checks. */
const layoutEntries = new WeakMap<
  GPUBindGroupLayout,
  { label: string; entries: GPUBindGroupLayoutEntry[] }
>();

export function bindGroupLayoutEntries(
  layout: GPUBindGroupLayout,
): GPUBindGroupLayoutEntry[] | undefined {
  return layoutEntries.get(layout)?.entries;
}

/** Called for every pipeline layout a checked device creates. */
export type LayoutObserver = (
  label: string,
  groups: ReadonlyArray<ReadonlyArray<GPUBindGroupLayoutEntry> | undefined>,
) => void;

/**
 * Observers of every layout any checked device creates, explicit ones
 * (`LayoutObserver`) and `layout: "auto"` ones from their WGSL. The layout
 * budget test (test/limits.test.ts) records the engine's with these.
 */
export const layoutObservers = new Set<LayoutObserver>();

/**
 * Bindings a WGSL module declares, as layout entries visible to `stage`,
 * by group. An upper bound for a `layout: "auto"` pipeline, which gets only
 * what its entry point uses.
 */
export function wgslBindings(
  code: string,
  stage: number,
  entryPoint?: string,
): GPUBindGroupLayoutEntry[][] {
  const groups: GPUBindGroupLayoutEntry[][] = [];
  const used = entryPoint ? staticallyUsed(code, entryPoint) : undefined;
  const pattern =
    /@group\((\d+)\)\s*@binding\((\d+)\)\s*var(<[^>]*>)?\s+(\w+)\s*:\s*([^;=]+)/g;
  for (const m of code.matchAll(pattern)) {
    if (used && !used.has(m[4]!)) {
      continue;
    }
    const group = Number(m[1]);
    const binding = Number(m[2]);
    const space = m[3] ?? "";
    const type = m[5]!.trim();
    const entry: GPUBindGroupLayoutEntry = { binding, visibility: stage };
    if (space.startsWith("<storage")) {
      entry.buffer = {
        type: space.includes("read_write") ? "storage" : "read-only-storage",
      };
    } else if (space.startsWith("<uniform")) {
      entry.buffer = { type: "uniform" };
    } else if (type.startsWith("texture_storage")) {
      entry.storageTexture = { format: "rgba8unorm" };
    } else if (type.startsWith("texture_external")) {
      entry.externalTexture = {};
    } else if (type.startsWith("texture")) {
      entry.texture = {};
    } else if (type.startsWith("sampler")) {
      entry.sampler = {};
    } else {
      continue;
    }
    (groups[group] ??= []).push(entry);
  }
  for (let g = 0; g < groups.length; g++) {
    groups[g] ??= [];
  }
  return groups;
}

/**
 * Identifiers an entry point uses, through the functions it calls: WGSL's
 * "statically used", which decides what a `layout: "auto"` pipeline binds.
 * A lexical approximation (comments stripped, braces matched).
 */
function staticallyUsed(code: string, entryPoint: string): Set<string> {
  const source = code
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const bodies = new Map<string, string>();
  const header = /\bfn\s+(\w+)\s*\(/g;
  for (const m of source.matchAll(header)) {
    const open = source.indexOf("{", m.index! + m[0].length);
    if (open < 0) {
      continue;
    }
    let depth = 0;
    let end = open;
    for (; end < source.length; end++) {
      const c = source[end];
      if (c === "{") {
        depth++;
      } else if (c === "}" && --depth === 0) {
        break;
      }
    }
    bodies.set(m[1]!, source.slice(m.index!, end + 1));
  }
  const used = new Set<string>();
  const pending = [entryPoint];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const name = pending.pop()!;
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    const body = bodies.get(name);
    if (body === undefined) {
      continue;
    }
    for (const [identifier] of body.matchAll(/\b[A-Za-z_]\w*\b/g)) {
      used.add(identifier);
      if (bodies.has(identifier)) {
        pending.push(identifier);
      }
    }
  }
  return used;
}

/**
 * Makes `device` check every pipeline layout against its own limits before
 * creating it, throwing a message that names the layout (its groups'
 * labels), the stage, the count and the limit, instead of WebGPU's
 * "invalid PipelineLayout" a frame later. `observe` sees every layout
 * (the layout budget test records them with it).
 */
export function checkLayouts(
  device: GPUDevice,
  observe?: LayoutObserver,
): void {
  const createBindGroupLayout = device.createBindGroupLayout.bind(device);
  const createPipelineLayout = device.createPipelineLayout.bind(device);
  device.createBindGroupLayout = (descriptor) => {
    const layout = createBindGroupLayout(descriptor);
    layoutEntries.set(layout, {
      label: descriptor.label ?? "(unlabeled)",
      entries: [...descriptor.entries],
    });
    return layout;
  };
  device.createPipelineLayout = (descriptor) => {
    const known = descriptor.bindGroupLayouts.map((l) =>
      l ? layoutEntries.get(l) : undefined,
    );
    const groups = known.map((k) => k?.entries);
    const label =
      descriptor.label ?? known.map((k) => k?.label ?? "-").join(" + ");
    observe?.(label, groups);
    for (const observer of layoutObservers) {
      observer(label, groups);
    }
    const violations = layoutViolations(
      groups,
      device.limits as unknown as Record<string, number>,
    );
    if (violations.length > 0) {
      throw new Error(describeViolations(label, violations));
    }
    return createPipelineLayout(descriptor);
  };
  if (layoutObservers.size === 0) {
    return;
  }
  // `layout: "auto"` pipelines, from their modules' WGSL (observers only:
  // WebGPU validates these itself, and the count is an upper bound).
  const code = new WeakMap<GPUShaderModule, string>();
  const createShaderModule = device.createShaderModule.bind(device);
  device.createShaderModule = (descriptor) => {
    const module = createShaderModule(descriptor);
    code.set(module, descriptor.code);
    return module;
  };
  const observeAuto = (
    label: string | undefined,
    layout: GPUPipelineLayout | "auto",
    stages: Array<[GPUShaderModule | undefined, number, string | undefined]>,
  ) => {
    if (layout !== "auto") {
      return;
    }
    const groups: GPUBindGroupLayoutEntry[][] = [];
    for (const [module, stage, entryPoint] of stages) {
      const source = module ? code.get(module) : undefined;
      if (source === undefined) {
        continue;
      }
      wgslBindings(source, stage, entryPoint).forEach((entries, g) => {
        const merged = (groups[g] ??= []);
        for (const entry of entries) {
          const same = merged.find((e) => e.binding === entry.binding);
          if (same) {
            same.visibility |= entry.visibility;
          } else {
            merged.push({ ...entry });
          }
        }
      });
    }
    for (let g = 0; g < groups.length; g++) {
      groups[g] ??= [];
    }
    for (const observer of layoutObservers) {
      observer(`${label ?? "(unlabeled)"} (auto)`, groups);
    }
  };
  const { VERTEX, FRAGMENT, COMPUTE } = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
  const wrapCompute = <T extends (d: GPUComputePipelineDescriptor) => unknown>(
    create: T,
  ): T =>
    ((descriptor: GPUComputePipelineDescriptor) => {
      observeAuto(descriptor.label, descriptor.layout, [
        [descriptor.compute.module, COMPUTE, descriptor.compute.entryPoint],
      ]);
      return create(descriptor);
    }) as T;
  const wrapRender = <T extends (d: GPURenderPipelineDescriptor) => unknown>(
    create: T,
  ): T =>
    ((descriptor: GPURenderPipelineDescriptor) => {
      observeAuto(descriptor.label, descriptor.layout, [
        [descriptor.vertex.module, VERTEX, descriptor.vertex.entryPoint],
        [
          descriptor.fragment?.module,
          FRAGMENT,
          descriptor.fragment?.entryPoint,
        ],
      ]);
      return create(descriptor);
    }) as T;
  device.createComputePipeline = wrapCompute(
    device.createComputePipeline.bind(device),
  );
  device.createComputePipelineAsync = wrapCompute(
    device.createComputePipelineAsync.bind(device),
  );
  device.createRenderPipeline = wrapRender(
    device.createRenderPipeline.bind(device),
  );
  device.createRenderPipelineAsync = wrapRender(
    device.createRenderPipelineAsync.bind(device),
  );
}
