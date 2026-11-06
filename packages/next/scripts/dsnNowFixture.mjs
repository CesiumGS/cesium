// Fetches archived DSN Now snapshots and writes the Artemis II (EM2) ranges to
// test/fixtures/frames/dsnnow.json. Reads attributes with fixed regular
// expressions; fetched text is never run, and only numbers and dish names are
// written. Takes no arguments.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SNAPSHOTS = [
  "20260403050749",
  "20260405124853",
  "20260406150830",
  "20260406151609",
  "20260407035623",
  "20260408130537",
  "20260409093133",
  "20260410223806",
];
const SOURCE = "https://eyes.nasa.gov/dsn/data/dsn.xml";
const OUTPUT = fileURLToPath(
  new URL("../test/fixtures/frames/dsnnow.json", import.meta.url),
);
const TRIES = 3;
const PAUSE_MS = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchSnapshot(stamp) {
  const url = `https://web.archive.org/web/${stamp}id_/${SOURCE}`;
  for (let attempt = 1; attempt <= TRIES; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
      console.warn(`${stamp}: HTTP ${response.status} (try ${attempt})`);
    } catch (e) {
      console.warn(`${stamp}: ${e.message} (try ${attempt})`);
    }
    if (attempt < TRIES) {
      await sleep(PAUSE_MS);
    }
  }
  return undefined;
}

const ELEMENT = /<(station|dish|\/dish|target)\b([^>]*)>/g;
const ATTRIBUTE = /([A-Za-z]+)="([^"]*)"/g;

function attributes(text) {
  const out = {};
  for (const m of text.matchAll(ATTRIBUTE)) {
    out[m[1]] = m[2];
  }
  return out;
}

/** Rows for every dish tracking EM2 with a positive downleg range. */
function rows(xml, snapshot) {
  const out = [];
  let timeUTC;
  let dish;
  for (const m of xml.matchAll(ELEMENT)) {
    const kind = m[1];
    const attrs = attributes(m[2]);
    if (kind === "station") {
      timeUTC = Number(attrs.timeUTC);
    } else if (kind === "dish") {
      dish = /^DSS\d{2}$/.test(attrs.name ?? "") ? attrs.name : undefined;
    } else if (kind === "/dish") {
      dish = undefined;
    } else if (kind === "target" && dish && attrs.name === "EM2") {
      const uplegRange = Number(attrs.uplegRange);
      const downlegRange = Number(attrs.downlegRange);
      const rtlt = Number(attrs.rtlt);
      if (
        downlegRange > 0 &&
        Number.isFinite(timeUTC) &&
        Number.isFinite(uplegRange) &&
        Number.isFinite(rtlt)
      ) {
        out.push({ snapshot, timeUTC, dish, uplegRange, downlegRange, rtlt });
      }
    }
  }
  return out;
}

const all = [];
const missing = [];
for (const stamp of SNAPSHOTS) {
  const xml = await fetchSnapshot(stamp);
  if (xml === undefined) {
    missing.push(stamp);
    continue;
  }
  const found = rows(xml, stamp);
  console.log(`${stamp}: ${found.length} rows`);
  all.push(...found);
}
if (missing.length > 0) {
  console.error(`Could not get snapshots: ${missing.join(", ")}`);
  process.exit(1);
}
writeFileSync(
  OUTPUT,
  `${JSON.stringify(
    {
      credit: "NASA/JPL-Caltech DSN Now, via the Internet Archive",
      source: SOURCE,
      units: { uplegRange: "km", downlegRange: "km", rtlt: "s", timeUTC: "ms" },
      rows: all,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${all.length} rows`);
