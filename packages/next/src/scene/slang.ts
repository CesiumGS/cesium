// The Slang worker's built URL (`?worker&url`, as WorkerPool's).
import slangWorkerUrl from "./slangWorker.ts?worker&url";
import cesiumSlang from "../shaders/cesium.slang?raw";
import { workerStart } from "../io/WorkerPool.ts";
import {
  adaptSlangStages,
  cesiumModule,
  slangStages,
  slangStub,
  type NamedType,
} from "./slangStages.ts";
import type { UniformDeclaration } from "./uniforms.ts";

/**
 * Runtime Slang compilation of custom shader stages (`CustomShader.fromSlang`):
 * one worker, started on first use, holds the Slang WebAssembly build.
 */
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (wgsl: string) => void; reject: (error: Error) => void }
>();

function slangWorker(): Worker {
  if (!worker) {
    worker = new Worker(workerStart(new URL(slangWorkerUrl, import.meta.url)), {
      type: "module",
    });
    worker.onmessage = (
      event: MessageEvent<{ id: number; wgsl?: string; error?: string }>,
    ) => {
      const { id, wgsl, error } = event.data;
      const request = pending.get(id);
      pending.delete(id);
      if (wgsl !== undefined) {
        request?.resolve(wgsl);
      } else {
        request?.reject(new Error(error ?? "Slang compilation failed."));
      }
    };
  }
  return worker;
}

/**
 * Slang stages (`import cesium;`) as custom shader WGSL, against the
 * shader's named attributes and metadata (`CustomShaderOptions`).
 */
export async function compileSlang(
  source: string,
  slangUrl = "/slang-wasm/slang-wasm.js",
  named: {
    attributes?: Record<string, { type: NamedType }>;
    metadata?: Record<string, NamedType | { type: NamedType }>;
    uniforms?: Record<string, { type: UniformDeclaration["type"] }>;
  } = {},
): Promise<string> {
  const stages = slangStages(source);
  if (!stages.vertex && !stages.fragment) {
    throw new Error(
      "Slang shader defines neither vertexMain nor fragmentMain.",
    );
  }
  const id = nextId++;
  const wgsl = await new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    slangWorker().postMessage({
      id,
      url: new URL(slangUrl, globalThis.location?.href).href,
      cesium: cesiumModule(cesiumSlang, {
        attributes: Object.fromEntries(
          Object.entries(named.attributes ?? {}).map(([n, a]) => [n, a.type]),
        ),
        metadata: Object.fromEntries(
          Object.entries(named.metadata ?? {}).map(([n, d]) => [
            n,
            typeof d === "string" ? d : d.type,
          ]),
        ),
        uniforms: named.uniforms ?? {},
      }),
      user: source,
      stub: slangStub(stages),
    });
  });
  return adaptSlangStages(wgsl, stages);
}
