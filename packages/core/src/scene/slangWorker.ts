/// <reference lib="webworker" />

/**
 * Compiles Slang custom shader stages to WGSL with the Slang WebAssembly
 * build, loaded once on the first request (slang.ts). A request is
 * `{ id, url, cesium, user, stub }` (contract.ts `slangBridge`), replied
 * `{ id, wgsl }`; or `{ id, op: "reflect", url, cesium, user }`, the user
 * module's parameters (its declared uniforms, with their attributes:
 * slangControls.ts), replied `{ id, parameters }`. Errors: `{ id, error }`.
 */

interface SlangModule {
  createGlobalSession(): SlangGlobalSession | null;
  getCompileTargets(): unknown;
  getLastError(): { message: string };
}
interface SlangGlobalSession {
  createSession(target: number): SlangSession | null;
}
interface SlangSession {
  loadModuleFromSource(
    source: string,
    name: string,
    path: string,
  ): SlangComponent | null;
  createCompositeComponentType(
    components: SlangComponent[],
  ): SlangComponent | null;
}
interface SlangComponent {
  findAndCheckEntryPoint(name: string, stage: number): SlangComponent | null;
  link(): SlangComponent | null;
  getTargetCode(target: number): string;
  getLayout(target: number): { toJsonObject(): { parameters?: unknown[] } };
}

const STAGE_FRAGMENT = 5;

interface Compiler {
  slang: SlangModule;
  global: SlangGlobalSession;
  target: number;
}

let compiler: Promise<Compiler> | undefined;

async function load(url: string): Promise<Compiler> {
  const factory = (await import(/* @vite-ignore */ url))
    .default as () => Promise<SlangModule>;
  const slang = await factory();
  const global = slang.createGlobalSession();
  if (!global) {
    throw new Error(`Slang: ${slang.getLastError().message}`);
  }
  const targets = slang.getCompileTargets();
  const wgsl = Array.isArray(targets)
    ? (
        targets.find((t: { name?: string }) => t.name === "WGSL") as
          { value: number } | undefined
      )?.value
    : (targets as Record<string, number> | null)?.WGSL;
  if (wgsl === undefined) {
    throw new Error("Slang: this build has no WGSL target.");
  }
  return { slang, global, target: wgsl };
}

self.onmessage = async (
  event: MessageEvent<{
    id: number;
    op?: "reflect";
    url: string;
    cesium: string;
    user: string;
    stub?: string;
  }>,
) => {
  const { id, op, url, cesium, user, stub } = event.data;
  try {
    compiler ??= load(url);
    const { slang, global, target } = await compiler;
    const check = <T>(value: T | null): T => {
      if (!value) {
        throw new Error(slang.getLastError().message);
      }
      return value;
    };
    const session = check(global.createSession(target));
    check(session.loadModuleFromSource(cesium, "cesium", "/cesium.slang"));
    const userModule = check(
      session.loadModuleFromSource(user, "user", "/user.slang"),
    );
    if (op === "reflect") {
      // The module alone, linked: its globals and their user attributes.
      const layout = check(userModule.link()).getLayout(0).toJsonObject();
      self.postMessage({ id, parameters: layout.parameters ?? [] });
      return;
    }
    const stages = check(
      session.loadModuleFromSource(stub!, "stages", "/stages.slang"),
    );
    const entry = check(
      stages.findAndCheckEntryPoint("cesiumStages", STAGE_FRAGMENT),
    );
    const program = check(
      session.createCompositeComponentType([stages, entry]),
    );
    self.postMessage({ id, wgsl: check(program.link()).getTargetCode(0) });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
