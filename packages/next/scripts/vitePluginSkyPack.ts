import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { isPackBinary } from "../src/atmosphere/skyPack.ts";
import { chosenPackDirectory } from "./skyStore.mjs";

/** Base64 of a pack magic's first six bytes ("CSKYPT", "CSKYBG"). */
const INLINED = ["Q1NLWVBU", "Q1NLWUJH"];
/** The largest asset read as a possible manifest. */
const MAX_MANIFEST_BYTES = 1 << 20;

interface Item {
  fileName: string;
  bytes: Uint8Array;
  text: string | undefined;
}

function itemsOf(
  bundle: Record<
    string,
    | { type: "chunk"; fileName: string; code: string }
    | { type: "asset"; fileName: string; source: string | Uint8Array }
  >,
): Item[] {
  return Object.values(bundle).map((file) => {
    if (file.type === "chunk") {
      return {
        fileName: file.fileName,
        bytes: new Uint8Array(0),
        text: file.code,
      };
    }
    const bytes =
      typeof file.source === "string"
        ? new TextEncoder().encode(file.source)
        : file.source;
    return {
      fileName: file.fileName,
      bytes,
      text:
        typeof file.source === "string"
          ? file.source
          : bytes.length <= MAX_MANIFEST_BYTES
            ? new TextDecoder().decode(bytes)
            : undefined,
    };
  });
}

/** A manifest's name and whether it is cleared, if `text` is a manifest. */
function readManifest(
  text: string | undefined,
): { name: string; cleared: boolean } | undefined {
  if (text === undefined || text.length > MAX_MANIFEST_BYTES) {
    return undefined;
  }
  if (!text.trimStart().startsWith("{")) {
    return undefined;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof json !== "object" || json === null) {
    return undefined;
  }
  const o = json as Record<string, unknown>;
  if (!("format" in o && "points" in o && "background" in o)) {
    return undefined;
  }
  const c = o.clearance as Record<string, unknown> | undefined;
  const complete = (k: string) =>
    typeof c?.[k] === "string" && (c[k] as string).trim().length > 0;
  return {
    name: typeof o.name === "string" ? o.name : "(unnamed)",
    cleared:
      o.distributable === true &&
      c !== undefined &&
      complete("by") &&
      complete("date") &&
      complete("note"),
  };
}

/**
 * Builds: refuse to emit a sky data pack that isn't cleared (§13.29). A
 * JSON asset with a manifest's shape (`format`, `points`, `background`) is a
 * manifest; any asset that starts with a pack's magic, whatever its name, is
 * a pack file, and so is a chunk that inlines one as base64. The build
 * fails unless a manifest in the bundle says `distributable: true` with a
 * complete `clearance` (`by`, `date`, `note`); a file with no manifest
 * beside it counts as uncleared. A person edits the manifest after review:
 * no script writes either field.
 */
export function skyPackGuard(): Plugin {
  return {
    name: "sky-pack-guard",
    apply: "build",
    generateBundle(_options, bundle) {
      const items = itemsOf(bundle as Parameters<typeof itemsOf>[0]);
      const manifests = new Map<string, { name: string; cleared: boolean }>();
      const binaries: string[] = [];
      for (const item of items) {
        if (item.bytes.length > 0 && isPackBinary(item.bytes)) {
          binaries.push(item.fileName);
        } else if (
          item.text &&
          INLINED.some((p) => item.text!.includes(`base64,${p}`))
        ) {
          binaries.push(item.fileName);
        }
        const manifest = readManifest(item.text);
        if (manifest) {
          manifests.set(item.fileName, manifest);
        }
      }
      const rule =
        "§13.29 keeps sky data out of builds unless its manifest says distributable: true with a complete clearance (by, date, note)";
      for (const [file, m] of manifests) {
        if (!m.cleared) {
          this.error(`sky pack "${m.name}" (${file}) is not cleared: ${rule}.`);
        }
      }
      if (manifests.size === 0 && binaries.length > 0) {
        this.error(
          `${binaries.join(", ")} is a sky pack file with no manifest beside it, so it counts as uncleared: ${rule}.`,
        );
      }
    },
  };
}

/** The three files the dev route serves, by name. */
const ROUTE_FILES: Record<string, string> = {
  "manifest.json": "application/json",
  "points.bin": "application/octet-stream",
  "background.bin": "application/octet-stream",
};
const PREFIX = "/sky-pack/";

export interface SkyPackRouteFs {
  readFileSync(path: string): Uint8Array;
}

/**
 * The route's answer for a request URL: undefined when it isn't under
 * `/sky-pack/`, a 404 for any name but the three fixed ones (no part of the
 * URL reaches a path) or a file the pack lacks.
 */
export function skyPackResponse(
  url: string,
  directory: string,
  fs: SkyPackRouteFs = { readFileSync: (p) => readFileSync(p) },
): { status: number; type?: string; body?: Uint8Array } | undefined {
  if (!url.startsWith(PREFIX)) {
    return undefined;
  }
  const name = url.slice(PREFIX.length).split(/[?#]/, 1)[0]!;
  // The file is one of the three fixed names, never the URL's own text.
  const file = Object.keys(ROUTE_FILES).find((known) => known === name);
  if (file === undefined) {
    return { status: 404 };
  }
  try {
    return {
      status: 200,
      type: ROUTE_FILES[file]!,
      body: fs.readFileSync(join(directory, file)),
    };
  } catch {
    return { status: 404 };
  }
}

/**
 * The dev server only: serves the store's chosen pack at `/sky-pack/` (the
 * folder's name is SKY_PACK, default "default", under the store). Not in
 * builds.
 */
export function skyPackDevRoute(
  directory: () => string = chosenPackDirectory,
  fs?: SkyPackRouteFs,
): Plugin {
  return {
    name: "sky-pack-dev-route",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const answer = skyPackResponse(req.url ?? "", directory(), fs);
        if (!answer) {
          next();
          return;
        }
        res.statusCode = answer.status;
        if (answer.body) {
          res.setHeader("Content-Type", answer.type!);
          res.setHeader("Cache-Control", "no-store");
          res.end(answer.body);
        } else {
          res.end();
        }
      });
    },
  };
}
