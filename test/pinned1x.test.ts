// The pinned CesiumJS 1.x (CS-611): `cesium-1x`, an npm alias of a published
// `cesium` release at an exact version, a dev dependency of the workspace root
// (docs/design/repository-build-and-release.md, "Parity and Dyno without 1.x's
// source"). Its own @cesium/* dependencies must never stand in for 2.0's.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PINNED_1X } from "../bench/suite/engines.mjs";
import { pinned1x } from "../bench/suite/pinned1x.mjs";

const next = fileURLToPath(new URL("..", import.meta.url));
const root = join(next, "..", "..");
const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

interface LockEntry {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
}
const lock = json(join(root, "package-lock.json")) as {
  packages: Record<string, LockEntry>;
};
const rootManifest = json(join(root, "package.json")) as {
  devDependencies: Record<string, string>;
};

/** The lockfile's workspace folders, by package name. */
const workspaces = new Map(
  Object.entries(lock.packages)
    .filter(([path, entry]) => !path.includes("node_modules") && entry.name)
    .map(([path, entry]) => [entry.name!, path]),
);

/** 2.0's own source: what ships and what it tests and measures with. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "generated" || name === "work") {
      continue;
    }
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      sources(path, out);
    } else if (/\.(ts|tsx|mts|mjs|js)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe("the pinned 1.x", () => {
  it("is an exact npm alias of a cesium release, the one Dyno names", () => {
    expect(rootManifest.devDependencies["cesium-1x"]).toBe(
      `npm:cesium@${PINNED_1X}`,
    );
    const entry = lock.packages["node_modules/cesium-1x"]!;
    expect(entry.name).toBe("cesium");
    expect(entry.version).toBe(PINNED_1X);
    expect(entry.resolved).toBe(
      `https://registry.npmjs.org/cesium/-/cesium-${PINNED_1X}.tgz`,
    );
    expect(entry.integrity).toMatch(/^sha512-/);
  });

  it("installs 1.x's engine and widgets from the registry, not from this repository", () => {
    for (const [name, major] of [
      ["@cesium/engine", "26."],
      ["@cesium/widgets", "16."],
    ] as const) {
      const entry = lock.packages[`node_modules/${name}`]!;
      expect(entry.link, name).toBeUndefined();
      expect(entry.version!.startsWith(major), name).toBe(true);
      expect(workspaces.has(name), name).toBe(false);
    }
  });

  it("resolves its oracles from its own dependencies", () => {
    const pin = pinned1x();
    expect(pin.version).toBe(PINNED_1X);
    expect(pin.core.version).toMatch(/^0\.1\./);
    expect(pin.engine.version).toMatch(/^26\./);
    expect(pin.widgets.version).toMatch(/^16\./);
    for (const dir of [pin.core.dir, pin.engine.dir, pin.widgets.dir]) {
      expect(dir.includes(`${join("node_modules", "@cesium")}`), dir).toBe(
        true,
      );
      expect(existsSync(dir), dir).toBe(true);
    }
    expect(existsSync(join(pin.build, "Cesium.js"))).toBe(true);
  });

  it("is the only way into 1.x: nothing of 2.0's reaches into a 1.x tree", () => {
    const tree =
      /(?:\.\.\/)+(?:(?:engine|core|widgets|gltf)\/Source\b|Specs\/Data\b|Build\/CesiumUnminified\b)/;
    const offenders = sources(next).filter((file) =>
      tree.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("never stands in for the workspace's @cesium/core", () => {
    const core = workspaces.get("@cesium/core");
    if (core) {
      // Once 2.0 has a package named @cesium/core, the name resolves to it,
      // and 1.x's 0.1.x nests under the 1.x packages that need it.
      expect(lock.packages["node_modules/@cesium/core"]).toMatchObject({
        link: true,
        resolved: core,
      });
      const resolved = createRequire(join(next, "package.json")).resolve(
        "@cesium/core/package.json",
      );
      expect(json(resolved).version).not.toMatch(/^0\.1\./);
    } else {
      // Until then 1.x's @cesium/core may hoist, so nothing of 2.0's may
      // import it, or any other 1.x package, by name.
      const named =
        /\bfrom\s+["'](?:cesium|cesium-1x|@cesium\/(?:core|engine|widgets|gltf))(?:\/[^"']*)?["']/;
      const offenders = sources(next).filter((file) =>
        named.test(readFileSync(file, "utf8")),
      );
      expect(offenders).toEqual([]);
    }
  });
});
