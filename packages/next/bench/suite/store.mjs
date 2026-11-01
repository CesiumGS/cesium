// The benchmark content store (plan §16.2): datasets pinned by checksum.
// A dataset's checksum is the SHA-256 of its sorted file list (path and
// each file's SHA-256), so any changed, added or removed file changes it.
// Local datasets (Specs data) are hashed in place; mirrored datasets are
// downloaded into a content-addressed store outside the repository
// (BENCH_STORE, default ~/.cesium-bench/store) and verified the same way.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** This repository's Specs/Data, served as /specs-data. */
export const SPECS_DATA = join(here, "..", "..", "..", "..", "Specs", "Data");

export function storeDirectory() {
  return process.env.BENCH_STORE ?? join(homedir(), ".cesium-bench", "store");
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function walk(directory, out = []) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      walk(path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

/** Checksum and size of a directory or file: the Merkle root of its files. */
export function checksum(path) {
  const files = statSync(path).isDirectory() ? walk(path) : [path];
  const lines = [];
  let bytes = 0;
  for (const file of files) {
    const data = readFileSync(file);
    bytes += data.byteLength;
    const name = relative(path, file).replaceAll("\\", "/") || ".";
    lines.push(`${sha256(data)}  ${name}`);
  }
  return { sha256: sha256(lines.join("\n")), files: files.length, bytes };
}

/** Where a dataset's files are on disk, if it has any. */
export function datasetPath(dataset) {
  switch (dataset.source.kind) {
    case "specs":
      return join(SPECS_DATA, dataset.source.path);
    case "url":
      return dataset.mirror
        ? join(storeDirectory(), "datasets", dataset.id)
        : undefined;
    default:
      return undefined; // streamed (ion) or generated
  }
}

/**
 * Verifies each dataset with files against its pinned checksum. Returns
 * one row per dataset: "ok", "changed", "missing", "unpinned" (no checksum
 * yet; the computed one is shown) or "streamed"/"generated".
 */
export function verify(datasets) {
  return datasets.map((dataset) => {
    const path = datasetPath(dataset);
    if (!path) {
      return {
        id: dataset.id,
        status: dataset.source.kind === "generator" ? "generated" : "streamed",
      };
    }
    if (!existsSync(path)) {
      return { id: dataset.id, status: "missing", path };
    }
    const sum = checksum(path);
    const status = !dataset.sha256
      ? "unpinned"
      : dataset.sha256 === sum.sha256
        ? "ok"
        : "changed";
    return { id: dataset.id, status, ...sum };
  });
}

/**
 * Downloads mirrored URL datasets into the store (single files; archives
 * are kept as downloaded). Never runs for streamed or generated datasets.
 */
export async function fetchDatasets(datasets, log = console.log) {
  for (const dataset of datasets) {
    if (dataset.source.kind !== "url" || !dataset.mirror) {
      continue;
    }
    const directory = join(storeDirectory(), "datasets", dataset.id);
    const name = new URL(dataset.source.url).pathname.split("/").pop();
    const file = join(directory, name || "data");
    if (existsSync(file)) {
      log(`${dataset.id}: present`);
      continue;
    }
    mkdirSync(directory, { recursive: true });
    log(`${dataset.id}: downloading ${dataset.source.url}`);
    const response = await fetch(dataset.source.url);
    if (!response.ok) {
      throw new Error(`${dataset.id}: ${response.status}`);
    }
    writeFileSync(file, new Uint8Array(await response.arrayBuffer()));
  }
}
