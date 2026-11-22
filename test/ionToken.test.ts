import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ION_TOKEN,
  envToken,
  ionToken,
  isRemembered,
  needsToken,
  onTokenChange,
  requireToken,
  saveToken,
  TOKEN_KEY,
  tokenSource,
  userToken,
} from "../bench/suite/ionToken.ts";
import {
  findSecrets,
  keepEnvSecretsOut,
} from "../scripts/vitePluginEnvSecrets.ts";

/** A Web Storage over a Map, for Node. */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

const ENV = "env-token-from-dotenv-local-0123456789";
const PASTED = "pasted-token-from-dyno-settings-9876543210";

beforeEach(() => {
  const events = new EventTarget();
  vi.stubGlobal("sessionStorage", memoryStorage());
  vi.stubGlobal("localStorage", memoryStorage());
  vi.stubGlobal("addEventListener", events.addEventListener.bind(events));
  vi.stubGlobal("removeEventListener", events.removeEventListener.bind(events));
  vi.stubGlobal("dispatchEvent", events.dispatchEvent.bind(events));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("ionToken", () => {
  it("has CesiumJS's evaluation token to fall back on", () => {
    expect(DEFAULT_ION_TOKEN).toMatch(/^eyJ/);
  });

  it("prefers the pasted token over .env.local and the evaluation token", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_ION_TOKEN", ENV);
    expect(ionToken()).toBe(ENV);
    expect(tokenSource()).toBe("env");

    saveToken(PASTED, false);
    expect(ionToken()).toBe(PASTED);
    expect(userToken()).toBe(PASTED);
    expect(tokenSource()).toBe("pasted");
  });

  it("has no .env.local fallback in production builds", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_ION_TOKEN", ENV);
    expect(envToken()).toBeUndefined();
    expect(userToken()).toBeUndefined();
    expect(ionToken()).toBe(DEFAULT_ION_TOKEN);
    expect(tokenSource()).toBe("evaluation");
    // The error says where to get one, without any token in it.
    expect(() => requireToken("This check")).toThrow(/paste one in Dyno/);
    try {
      requireToken("This check");
    } catch (e) {
      expect(String(e)).not.toContain(ENV);
    }
    // A pasted token still works there.
    saveToken(PASTED, true);
    expect(ionToken()).toBe(PASTED);
  });

  it("ignores an empty VITE_ION_TOKEN (the uncaught 'no access token')", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_ION_TOKEN", "  ");
    expect(envToken()).toBeUndefined();
    expect(ionToken()).toBe(DEFAULT_ION_TOKEN);
  });

  it("keeps a token for the session or on the device, and clears it", () => {
    vi.stubEnv("DEV", false);
    const changes = vi.fn();
    const off = onTokenChange(changes);

    saveToken(` ${PASTED} `, false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe(PASTED);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(isRemembered()).toBe(false);

    saveToken(PASTED, true);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe(PASTED);
    expect(isRemembered()).toBe(true);

    saveToken(undefined, false);
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(tokenSource()).toBe("evaluation");
    expect(changes).toHaveBeenCalledTimes(3);
    off();
    saveToken(PASTED, false);
    expect(changes).toHaveBeenCalledTimes(3);
  });

  it("tells a missing or refused token from other ion failures", () => {
    expect(needsToken(new Error("ion asset 2: no access token"))).toBe(true);
    const failed = (status: number) =>
      new Error(
        `Couldn't load x: ion asset 7: endpoint request failed (${status})`,
      );
    expect(needsToken(failed(401), "pasted")).toBe(true);
    expect(needsToken(failed(403), "env")).toBe(true);
    // A 404 with only the evaluation token: the asset is someone's own.
    expect(needsToken(failed(404), "evaluation")).toBe(true);
    // With the person's own token, a 404 is an asset not in their account.
    expect(needsToken(failed(404), "pasted")).toBe(false);
    expect(needsToken(failed(500), "evaluation")).toBe(false);
    expect(needsToken(new Error("WebGPU is not available"))).toBe(false);
  });
});

describe("keepEnvSecretsOut", () => {
  it("reads the token as undefined in builds", () => {
    const plugin = keepEnvSecretsOut();
    expect(plugin.apply).toBe("build");
    const config = (
      plugin.config as () => { define: Record<string, string> }
    )();
    expect(config.define["import.meta.env.VITE_ION_TOKEN"]).toBe("undefined");
  });

  it("names the files holding a secret, never the value", () => {
    const found = findSecrets(
      [
        { name: "assets/a.js", text: `const t="${ENV}";` },
        { name: "assets/b.js", text: "nothing here" },
      ],
      [["VITE_ION_TOKEN", ENV]],
    );
    expect(found).toEqual([{ name: "VITE_ION_TOKEN", file: "assets/a.js" }]);
    expect(JSON.stringify(found)).not.toContain(ENV);
  });

  it("is the only reader of VITE_ION_TOKEN in Dyno's sources", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const readers: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
          walk(path);
        } else if (/\.(ts|tsx|mts|mjs)$/.test(name)) {
          if (
            /import\.meta\.env\.VITE_ION_TOKEN|import\.meta\.env\[/.test(
              readFileSync(path, "utf8"),
            )
          ) {
            readers.push(path.slice(root.length));
          }
        }
      }
    };
    for (const dir of [
      "bench",
      "parity",
      "examples",
      "widgets",
      "src",
      "lab",
      "spikes",
      "demo",
    ]) {
      walk(join(root, dir));
    }
    expect(readers).toEqual([join("bench", "suite", "ionToken.ts")]);
    // …and there only under import.meta.env.DEV.
    const source = readFileSync(join(root, "bench/suite/ionToken.ts"), "utf8");
    expect(source).toMatch(
      /import\.meta\.env\.DEV\s*\?\s*nonEmpty\(import\.meta\.env\.VITE_ION_TOKEN/,
    );
  });
});
