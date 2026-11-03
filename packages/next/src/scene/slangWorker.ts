/// <reference lib="webworker" />

/**
 * Compiles Slang custom shader stages to WGSL with the Slang WebAssembly
 * build, loaded once on the first request (slang.ts). Each request is
 * `{ id, url, cesium, user, stub }` (slangStages.ts `slangStub`); each reply
 * `{ id, wgsl }` or `{ id, error }`.
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
    url: string;
    cesium: string;
    user: string;
    stub: string;
  }>,
) => {
  const { id, url, cesium, user, stub } = event.data;
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
    check(session.loadModuleFromSource(user, "user", "/user.slang"));
    const stages = check(
      session.loadModuleFromSource(stub, "stages", "/stages.slang"),
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
