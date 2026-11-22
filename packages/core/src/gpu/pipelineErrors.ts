// Pipeline failures that say what failed. A browser may reject a pipeline
// with a GPUPipelineError that has no message (Safari does), which leaves no
// clue which of the engine's pipelines it was. Wrapping the device's two async
// pipeline methods turns such a rejection into an Error that names the
// pipeline's label, the error's reason ("validation" or "internal"), and the
// error and warning messages its shader modules compiled with.

type PipelineDescriptor =
  GPURenderPipelineDescriptor | GPUComputePipelineDescriptor;

/** The shader modules a pipeline descriptor names, each once. */
function modulesOf(descriptor: PipelineDescriptor): GPUShaderModule[] {
  const found: GPUShaderModule[] = [];
  const add = (module: GPUShaderModule | undefined) => {
    if (module && !found.includes(module)) {
      found.push(module);
    }
  };
  if ("compute" in descriptor) {
    add(descriptor.compute.module);
  } else {
    add(descriptor.vertex.module);
    add(descriptor.fragment?.module);
  }
  return found;
}

/** The compiler's errors and warnings for the modules, at most `limit` of them. */
async function compilerMessages(
  modules: readonly GPUShaderModule[],
  limit = 4,
): Promise<string[]> {
  const out: string[] = [];
  for (const module of modules) {
    let info: GPUCompilationInfo;
    try {
      info = await module.getCompilationInfo();
    } catch {
      continue;
    }
    for (const m of info.messages) {
      if (m.type === "info" || out.length >= limit) {
        continue;
      }
      const where = module.label ? `${module.label} ` : "";
      out.push(`${where}${m.lineNum}:${m.linePos} ${m.type}: ${m.message}`);
    }
  }
  return out;
}

/** The rejection as an Error that says which pipeline, why, and what the compiler said. */
async function described(
  error: unknown,
  kind: "render" | "compute",
  descriptor: PipelineDescriptor,
): Promise<unknown> {
  const reason =
    typeof error === "object" && error !== null && "reason" in error
      ? String((error as { reason: unknown }).reason)
      : undefined;
  const original = error instanceof Error ? error.message : "";
  const compiler = await compilerMessages(modulesOf(descriptor));
  const parts = [
    `${kind} pipeline "${descriptor.label ?? "(no label)"}" failed`,
    reason ? `(${reason})` : "",
    original ? `: ${original}` : "",
    compiler.length > 0 ? `; compiler: ${compiler.join(" | ")}` : "",
  ];
  return new Error(parts.join(""), { cause: error });
}

/**
 * Wraps `device.createRenderPipelineAsync` and `createComputePipelineAsync`
 * so a rejection names its pipeline. Results are unchanged; only failures
 * gain words.
 */
export function describePipelineErrors(device: GPUDevice): void {
  const render = device.createRenderPipelineAsync.bind(device);
  const compute = device.createComputePipelineAsync.bind(device);
  device.createRenderPipelineAsync = async (descriptor) => {
    try {
      return await render(descriptor);
    } catch (error) {
      throw await described(error, "render", descriptor);
    }
  };
  device.createComputePipelineAsync = async (descriptor) => {
    try {
      return await compute(descriptor);
    } catch (error) {
      throw await described(error, "compute", descriptor);
    }
  };
}
