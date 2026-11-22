// The Slang worker's built URL (`?worker&url`, as WorkerPool's).
import slangWorkerUrl from "./slangWorker.ts?worker&url";
import cesiumSlang from "../shaders/cesium.slang?raw";
import { workerStart } from "../io/WorkerPool.ts";
import {
  cesiumModule,
  slangStages,
  withoutComments,
  type InstanceType,
  type NamedType,
} from "./slangStages.ts";
import { slangBridge, type NamedFields } from "./contract.ts";
import {
  defaultSlangCache,
  slangCacheKey,
  type SlangCache,
} from "./slangCache.ts";
import { SLANG_VERSION } from "./slangVersion.ts";
import type { UniformDeclaration } from "./uniforms.ts";
import {
  bindDeclaredUniforms,
  declaredUniforms,
  type ShaderControl,
} from "./slangControls.ts";

/**
 * Runtime Slang compilation of custom shader stages (`CustomShader.fromSlang`):
 * one worker, started on first use, holds the Slang WebAssembly build.
 */
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<
  number,
  {
    resolve: (reply: { wgsl?: string; parameters?: unknown[] }) => void;
    reject: (error: Error) => void;
  }
>();

function slangWorker(): Worker {
  if (!worker) {
    worker = new Worker(workerStart(new URL(slangWorkerUrl, import.meta.url)), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<{
        id: number;
        wgsl?: string;
        parameters?: unknown[];
        error?: string;
      }>,
    ) => {
      const { id, error, ...reply } = event.data;
      const request = pending.get(id);
      pending.delete(id);
      if (error === undefined) {
        request?.resolve(reply);
      } else {
        request?.reject(new Error(error || "Slang compilation failed."));
      }
    };
  }
  return worker;
}

function request(
  message: Record<string, unknown>,
): Promise<{ wgsl?: string; parameters?: unknown[] }> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    slangWorker().postMessage({ id, ...message });
  });
}

/** What `compileSlang` makes: the WGSL, and the uniforms the shader declared. */
export interface CompiledSlang {
  wgsl: string;
  /** Its declared uniforms' controls (`ShaderControl`). */
  controls: ShaderControl[];
  /** All its uniforms: the options' and the declared ones, in buffer order. */
  uniforms: Record<string, UniformDeclaration>;
}

/**
 * Slang stages (`import cesium;`) as custom shader WGSL, against the
 * shader's named attributes and metadata (`CustomShaderOptions`). Cached
 * (`cache`, IndexedDB by default; `false` for none): a shader compiled
 * before, with the same declarations, Slang release and compiler, comes
 * from the cache and the compiler isn't loaded.
 */
export async function compileSlang(
  source: string,
  slangUrl = "/slang-wasm/slang-wasm.js",
  named: {
    attributes?: Record<string, { type: NamedType }>;
    metadata?: Record<string, NamedType | { type: NamedType }>;
    uniforms?: Record<string, UniformDeclaration>;
    instance?: Record<string, InstanceType>;
  } = {},
  cache: SlangCache | false | undefined = defaultSlangCache(),
): Promise<CompiledSlang> {
  const stages = slangStages(source);
  if (!stages.vertex && !stages.fragment) {
    throw new Error(
      "Slang shader defines neither vertexMain nor fragmentMain.",
    );
  }
  const url = new URL(slangUrl, globalThis.location?.href).href;
  const fields: NamedFields = {
    attributes: Object.fromEntries(
      Object.entries(named.attributes ?? {}).map(([n, a]) => [n, a.type]),
    ),
    metadata: Object.fromEntries(
      Object.entries(named.metadata ?? {}).map(([n, d]) => [
        n,
        typeof d === "string" ? d : d.type,
      ]),
    ),
    instance: named.instance ?? {},
  };
  const cesium = (uniforms: Record<string, UniformDeclaration>) =>
    cesiumModule(cesiumSlang, { ...fields, uniforms });
  const given: Record<string, UniformDeclaration> = { ...named.uniforms };
  const bridge = slangBridge(stages, fields);
  // Everything the compile reads: the release and the compiler, the
  // `cesium` module for these declarations (the given uniforms by type:
  // their values aren't compiled), the shader, the bridge.
  const key =
    cache &&
    (await slangCacheKey([SLANG_VERSION, url, cesium(given), source, bridge]));
  const hit =
    key && cache ? await cache.get(key).catch(() => undefined) : undefined;
  if (hit) {
    return {
      wgsl: hit.wgsl,
      controls: hit.controls,
      uniforms: { ...given, ...hit.declared },
    };
  }
  let user = source;
  let controls: ShaderControl[] = [];
  let declaredByShader: Record<string, UniformDeclaration> = {};
  let uniforms: Record<string, UniformDeclaration> = given;
  // Uniforms the shader declares itself: found by reflection (a pass over
  // the module alone), then bound to the shader's buffer.
  if (/\buniform\b/.test(withoutComments(source))) {
    const { parameters = [] } = await request({
      op: "reflect",
      url,
      cesium: cesium(uniforms),
      user: source,
    });
    const declared = declaredUniforms(
      parameters as Parameters<typeof declaredUniforms>[0],
      new Set(["uniforms", ...Object.keys(uniforms)]),
    );
    controls = declared.controls;
    declaredByShader = declared.uniforms;
    uniforms = { ...uniforms, ...declared.uniforms };
    user = bindDeclaredUniforms(source, declared);
  }
  const { wgsl = "" } = await request({
    url,
    cesium: cesium(uniforms),
    user,
    stub: bridge,
  });
  if (key && cache) {
    // Not kept (quota, a private window) only costs a compile next time.
    await cache
      .put(key, { wgsl, controls, declared: declaredByShader })
      .catch(() => undefined);
  }
  // Slang's output as it is: CustomShader finds the bridge in it.
  return { wgsl, controls, uniforms };
}
