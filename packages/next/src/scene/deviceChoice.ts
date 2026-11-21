// The device choice (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// section 6): which device an engine draws with, from the `renderer` option
// and what the probes found, and why. `chooseDevice` is pure (the probes are
// handed to it), so the rules are tested in Node; `probeWebgpu` is the first
// probe, which runs where the engine will (the page, or a worker): it needs
// only `navigator` and `OffscreenCanvas`. The WebGL 2 probe is in the
// `webgl2` chunk (src/webgl2/probe.ts), loaded only when it is asked for.
import {
  belowFloor,
  clampWebgl2Facts,
  type Webgl2Facts,
} from "../profile/webgl2Facts.ts";
import { webgl2Personas, type Webgl2PersonaName } from "../profile/personas.ts";

/** Which device `Engine.create` picks: WebGPU, then WebGL 2 if WebGPU is missing (auto), or the one named. */
export type RendererOption = "auto" | "webgpu" | "webgl2";

export type RendererName = "webgpu" | "webgl2";

/** What the WebGPU probe found: usable, or why not. */
export type WebgpuProbe = { ok: true } | { ok: false; reason: string };

/**
 * What the WebGL 2 probe found: the facts of a context that meets the floor,
 * or what it lacks (a context's facts too, when there was one).
 */
export type Webgl2Probe =
  | { ok: true; facts: Webgl2Facts }
  | { ok: false; missing: readonly string[]; facts?: Webgl2Facts };

/** The probes, each run only when the choice needs it. */
export interface Probes {
  webgpu(): Promise<WebgpuProbe>;
  webgl2(): Promise<Webgl2Probe>;
}

/** The choice, and why: what the inspector shows ("WebGL 2 · WebGPU unavailable: no adapter"). */
export interface DeviceChoice {
  readonly renderer: RendererName;
  /** The option as asked (`emulate` makes it "webgl2"). */
  readonly requested: RendererOption;
  /** Why this device, in one phrase. */
  readonly reason: string;
  /** `auto` took WebGL 2 because WebGPU was unavailable. */
  readonly fellBack: boolean;
  /** WebGL 2's facts, when it was chosen: the probe's, clamped toward the persona when emulating. */
  readonly webgl2?: Webgl2Facts;
  /** The persona the device was clamped toward. */
  readonly emulating?: string;
}

export interface ChoiceOptions {
  renderer?: RendererOption;
  /** A fallback that `auto` would make is refused instead. */
  strict?: boolean;
  /** Run the WebGL 2 device with what a persona lacks hidden (`webgl2-basic`, for tests). */
  emulate?: Webgl2PersonaName;
}

/** No device can run here; the message names what is missing. */
export class NoRendererError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoRendererError";
  }
}

const list = (items: readonly string[]) => items.join("; ");

/**
 * Picks the device. `auto` is WebGPU, then WebGL 2 if WebGPU is missing;
 * naming one forces it, and the rejection names what is missing. Under
 * `strict`, a fallback is refused. Throws `NoRendererError`.
 */
export async function chooseDevice(
  options: ChoiceOptions,
  probes: Probes,
): Promise<DeviceChoice> {
  const emulate = options.emulate;
  if (emulate !== undefined && !(emulate in webgl2Personas)) {
    throw new TypeError(
      `emulate: "${String(emulate)}" is not a WebGL 2 persona (${Object.keys(webgl2Personas).join(", ")}); emulating a WebGPU persona is not built yet`,
    );
  }
  let requested = options.renderer ?? "auto";
  if (emulate !== undefined) {
    if (requested === "webgpu") {
      throw new TypeError(
        `emulate: "${emulate}" is a WebGL 2 persona, which renderer: "webgpu" can't run`,
      );
    }
    requested = "webgl2";
  }
  if (requested === "webgpu") {
    const webgpu = await probes.webgpu();
    if (!webgpu.ok) {
      throw new NoRendererError(
        `Engine.create: renderer "webgpu" was asked for, but WebGPU is unavailable: ${webgpu.reason}.`,
      );
    }
    return {
      renderer: "webgpu",
      requested,
      reason: 'renderer: "webgpu"',
      fellBack: false,
    };
  }
  let why: string | undefined;
  if (requested === "auto") {
    const webgpu = await probes.webgpu();
    if (webgpu.ok) {
      return {
        renderer: "webgpu",
        requested,
        reason: "WebGPU available",
        fellBack: false,
      };
    }
    why = webgpu.reason;
    if (options.strict) {
      throw new NoRendererError(
        `strict: WebGPU is unavailable (${why}), and renderer "auto" would fall back to WebGL 2.`,
      );
    }
  }
  const probe = await probes.webgl2();
  const clamped =
    emulate !== undefined && probe.facts
      ? clampWebgl2Facts(probe.facts, webgl2Personas[emulate], emulate)
      : probe.facts;
  const missing = [
    ...(probe.ok ? [] : probe.missing),
    // An emulated persona can take a device below the floor.
    ...(probe.ok && clamped && emulate !== undefined
      ? belowFloor(clamped)
      : []),
  ];
  if (missing.length > 0 || !clamped) {
    throw new NoRendererError(
      `Engine.create: ${
        why === undefined
          ? 'renderer "webgl2" was asked for, but'
          : `WebGPU is unavailable (${why}), and`
      } WebGL 2 lacks ${list(missing.length > 0 ? missing : ["a context"])}.`,
    );
  }
  return {
    renderer: "webgl2",
    requested,
    reason:
      emulate !== undefined
        ? `emulating ${emulate}`
        : why === undefined
          ? 'renderer: "webgl2"'
          : `WebGPU unavailable: ${why}`,
    fellBack: why !== undefined,
    webgl2: clamped,
    ...(emulate !== undefined && { emulating: emulate }),
  };
}

/** The reasons warned of so far: a fallback warns once. */
const warned = new Set<string>();

/** Warns once, in the console, that `auto` fell back (and why). */
export function warnFallback(choice: DeviceChoice): void {
  if (!choice.fellBack || warned.has(choice.reason)) {
    return;
  }
  warned.add(choice.reason);
  console.warn(
    `[cesium/next] Using WebGL 2: ${choice.reason}. Set renderer: "webgl2" to choose it, or strict to refuse the fallback.`,
  );
}

/** Forgets the fallback warnings (tests). */
export function forgetFallbackWarnings(): void {
  warned.clear();
}

/** Probe results kept per navigator and user agent (one probe a page, as the thread probe's). */
const cache = new WeakMap<object, Map<string, Promise<unknown>>>();
/** Stands for a missing `navigator` (a bare Node), so it still has its own cache. */
const NO_NAVIGATOR = {};

const navigatorKey = (): object =>
  (globalThis as { navigator?: object }).navigator ?? NO_NAVIGATOR;

/**
 * Runs `probe` once for this navigator and user agent: the result is the
 * page's (or worker's) for good. A probe that throws is not cached.
 */
export function cachedProbe<T>(
  key: string,
  probe: () => Promise<T>,
): Promise<T> {
  const nav = navigatorKey();
  let kept = cache.get(nav);
  if (!kept) {
    kept = new Map();
    cache.set(nav, kept);
  }
  const id = `${key}|${(nav as { userAgent?: string }).userAgent ?? ""}`;
  let result = kept.get(id) as Promise<T> | undefined;
  if (!result) {
    result = probe();
    kept.set(id, result);
    result.catch(() => kept.delete(id));
  }
  return result;
}

/**
 * The WebGPU probe (the plan's step 1): `navigator.gpu`, `requestAdapter()`
 * and a throwaway `OffscreenCanvas` `"webgpu"` context, where there is an
 * `OffscreenCanvas`. It asks for no device, so the real one is made once,
 * after the choice. Works on the page and in a worker.
 */
export function probeWebgpu(): Promise<WebgpuProbe> {
  return cachedProbe("webgpu", async (): Promise<WebgpuProbe> => {
    const gpu = (globalThis as { navigator?: { gpu?: GPU } }).navigator?.gpu;
    if (!gpu) {
      return { ok: false, reason: "navigator.gpu is missing" };
    }
    let adapter: GPUAdapter | null;
    try {
      adapter = await gpu.requestAdapter();
    } catch (error) {
      return {
        ok: false,
        reason: `requestAdapter threw: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    if (!adapter) {
      return { ok: false, reason: "no adapter" };
    }
    if (typeof OffscreenCanvas !== "undefined") {
      const context = new OffscreenCanvas(1, 1).getContext("webgpu");
      if (!context) {
        return { ok: false, reason: "no WebGPU canvas context" };
      }
    }
    return { ok: true };
  });
}

/** Forgets every cached probe (tests). */
export function forgetProbes(): void {
  cache.delete(navigatorKey());
}
