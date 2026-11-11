// NIST's public-domain STEP test models, for the b-rep example's "STEP file"
// scene (plan §13.33): real CAD parts to import through Open CASCADE. The
// official zip from nist.gov, pinned by SHA-256, from which only the chosen
// geometry-only AP203 files are kept, each pinned too, in a store outside the
// repo (~/.cesium-bench/step/nist-pmi/<version>), never committed and never
// bundled. The dev server serves it at /step-samples/. The models are works
// of the US government (17 U.S.C. § 105; NIST open licence), with NIST's
// attribution asked for: a NOTICE.txt is written next to them.
//
//   node scripts/stepSamples.mjs     fetch and unpack, print the folder
//   npm run setup                    the same, as part of setup
//
// STEP_SAMPLES_DIR overrides the store (a folder holding the files below).
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";
import { verifiedDownload } from "./verifiedDownload.mjs";

/** NIST CAD Models and STEP Files with PMI: the dataset, and the zip this pins. */
export const STEP_DATASET = {
  doi: "10.18434/mds2-1452",
  title: "NIST CAD Models and STEP Files with PMI",
  /** The date in the zip's path on nist.gov (the PDR record itself is at 1.0.6, from 2021). */
  version: "2024-06-19",
  /** The zip's own address: the page's /document/nist-pmi-step-files redirects here. */
  url: "https://www.nist.gov/system/files/documents/noindex/2024/06/19/NIST-PMI-STEP-Files.zip",
  bytes: 13_976_599,
  sha256: "8fa78429e6d8d9b0d7681d223b6aa9ec98c3772185c55b1a0e3679b21c181911",
  licence: "https://www.nist.gov/open/license",
  landing:
    "https://www.nist.gov/ctl/smart-connected-systems-division/smart-connected-manufacturing-systems-group/mbe-pmi-validation",
};

const FOLDER = "NIST-PMI-STEP-Files/AP203 geometry only/";

/** The files kept, each pinned: the CTC and FTC models' geometry, without PMI. */
export const STEP_SAMPLES = [
  {
    file: "nist_ftc_11_asme1_rb.stp",
    bytes: 7634,
    sha256: "a5abfea460499dc31bc812aca68917948a117565fea4f5a080e36eb32f39650d",
  },
  {
    file: "nist_ftc_06_asme1_rd.stp",
    bytes: 222_799,
    sha256: "5e30f0903f9470c14a98e70395ca005fe90bcd3fb704c381a80a69958838f169",
  },
  {
    file: "nist_ftc_10_asme1_rb.stp",
    bytes: 323_601,
    sha256: "2bd726f9fe86aeb96ab517ce876e5696e7951310df5c4fbca36276d65879067b",
  },
  {
    file: "nist_ctc_05_asme1_rd.stp",
    bytes: 326_817,
    sha256: "5140b8f41fa1d0a069ea978e28c92a597f47220d0a11e667b79ff5f7c7243b86",
  },
];

const NOTICE_FILE = "NOTICE.txt";

const defaultStore = join(
  homedir(),
  ".cesium-bench",
  "step",
  "nist-pmi",
  STEP_DATASET.version,
);

const sha256Of = (bytes) => createHash("sha256").update(bytes).digest("hex");

const complete = (directory, samples = STEP_SAMPLES) =>
  existsSync(join(directory, NOTICE_FILE)) &&
  samples.every(({ file }) => existsSync(join(directory, file)));

/** The folder holding the sample files, or undefined if it isn't fetched. */
export function stepSamplesDirectory() {
  if (process.env.STEP_SAMPLES_DIR) {
    return process.env.STEP_SAMPLES_DIR;
  }
  return complete(defaultStore) ? defaultStore : undefined;
}

/** The NOTICE.txt kept with the files: what they are, where from, and NIST's terms. */
export function stepSamplesNotice(
  dataset = STEP_DATASET,
  samples = STEP_SAMPLES,
) {
  return `${dataset.title}
doi:${dataset.doi}  https://doi.org/${dataset.doi}
${dataset.landing}

These STEP files are NIST's MBE PMI Validation and Conformance Testing test
models (geometry only, STEP AP203), as published by the National Institute of
Standards and Technology. They are works of the United States government,
not subject to copyright protection in the United States (17 U.S.C. 105), 
and are offered under the NIST open licence, ${dataset.licence}
Attribution to NIST is requested. NIST's disclaimer applies:
https://www.nist.gov/disclaimer

Source: ${dataset.url}
(NIST's zip, SHA-256 ${dataset.sha256}); only these files are kept:
${samples.map(({ file, sha256 }) => `  ${file}  ${sha256}`).join("\n")}

This folder is a copy made by scripts/stepSamples.mjs for local use. It isn't
part of the repository and is never redistributed with it.
`;
}

/**
 * Checks each sample file in `directory` against its pinned length and
 * SHA-256, and throws, naming the file and both hashes, on the first that is
 * missing or differs.
 */
export function verifyStepSamples(directory, samples = STEP_SAMPLES) {
  for (const { file, bytes, sha256 } of samples) {
    const path = join(directory, file);
    if (!existsSync(path)) {
      throw new Error(`${file}: missing from ${directory}`);
    }
    const data = readFileSync(path);
    if (data.length !== bytes) {
      throw new Error(`${file}: ${data.length} bytes, expected ${bytes}`);
    }
    const actual = sha256Of(data);
    if (actual !== sha256) {
      throw new Error(
        `${file}: SHA-256 mismatch (expected ${sha256}, got ${actual})`,
      );
    }
  }
}

/**
 * The named members of a zip (a Buffer), without a zip library: the central
 * directory is read, and each wanted member is stored or deflated. A member's
 * name is only looked up, never used as a path. Throws if one is missing, is
 * compressed some other way, or doesn't inflate to its declared size.
 *
 * @param {Uint8Array} zip
 * @param {readonly string[]} names
 * @returns {Map<string, Buffer>}
 */
export function unzipMembers(zip, names) {
  const buffer = Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength);
  const searchFrom = buffer.length - 22;
  let end = -1;
  for (let at = searchFrom; at >= Math.max(0, searchFrom - 0xffff); at--) {
    if (buffer.readUInt32LE(at) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) {
    throw new Error("zip: no end-of-central-directory record");
  }
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const wanted = new Set(names);
  const found = new Map();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(at) !== 0x02014b50) {
      throw new Error("zip: a central directory entry is malformed");
    }
    const method = buffer.readUInt16LE(at + 10);
    const compressed = buffer.readUInt32LE(at + 20);
    const size = buffer.readUInt32LE(at + 24);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const local = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;
    if (!wanted.has(name)) {
      continue;
    }
    if (compressed === 0xffffffff || size === 0xffffffff) {
      throw new Error(`zip: ${name} needs zip64, which isn't read`);
    }
    if (buffer.readUInt32LE(local) !== 0x04034b50) {
      throw new Error(`zip: ${name}'s local header is malformed`);
    }
    const start =
      local +
      30 +
      buffer.readUInt16LE(local + 26) +
      buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + compressed);
    if (raw.length !== compressed) {
      throw new Error(`zip: ${name} is cut short`);
    }
    let data;
    if (method === 0) {
      data = Buffer.from(raw);
    } else if (method === 8) {
      data = inflateRawSync(raw, { maxOutputLength: size });
    } else {
      throw new Error(`zip: ${name} uses compression method ${method}`);
    }
    if (data.length !== size) {
      throw new Error(`zip: ${name} is ${data.length} bytes, declared ${size}`);
    }
    found.set(name, data);
  }
  for (const name of names) {
    if (!found.has(name)) {
      throw new Error(`zip: no member ${name}`);
    }
  }
  return found;
}

/**
 * The folder of sample files, fetching them first if the store lacks them: the
 * zip (about 14 MB, checked against its pinned length and SHA-256), then each
 * wanted file checked against its own pinned SHA-256 before it is kept. A
 * store that is there is verified too: a changed file is an error, not a
 * reason to refetch. `options` is for tests.
 *
 * @param {(line: string) => void} [log]
 * @param {{
 *   dataset?: typeof STEP_DATASET;
 *   samples?: typeof STEP_SAMPLES;
 *   store?: string;
 *   fetch?: typeof fetch;
 * }} [options]
 * @returns {Promise<string>}
 */
export async function ensureStepSamples(log = console.log, options = {}) {
  const {
    dataset = STEP_DATASET,
    samples = STEP_SAMPLES,
    store = defaultStore,
    fetch: fetcher,
  } = options;
  if (options.store === undefined && process.env.STEP_SAMPLES_DIR) {
    return process.env.STEP_SAMPLES_DIR;
  }
  if (complete(store, samples)) {
    verifyStepSamples(store, samples);
    return store;
  }
  log(
    `${dataset.title} (doi:${dataset.doi}): downloading NIST's zip (about ${(dataset.bytes / 1e6).toFixed(0)} MB)…`,
  );
  const staging = `${store}.partial`;
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  try {
    const zip = join(staging, basename(new URL(dataset.url).pathname));
    await verifiedDownload(dataset.url, zip, dataset, { fetch: fetcher });
    const members = unzipMembers(
      readFileSync(zip),
      samples.map(({ file }) => FOLDER + file),
    );
    for (const { file } of samples) {
      writeFileSync(join(staging, file), members.get(FOLDER + file));
    }
    rmSync(zip);
    verifyStepSamples(staging, samples);
    writeFileSync(
      join(staging, NOTICE_FILE),
      stepSamplesNotice(dataset, samples),
    );
  } catch (error) {
    rmSync(staging, { recursive: true, force: true });
    throw error;
  }
  rmSync(store, { recursive: true, force: true });
  renameSync(staging, store);
  log(`  ${samples.length} STEP files: ready (${store})`);
  return store;
}

// Run directly: fetch now.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(`step samples: ${await ensureStepSamples()}`);
}
