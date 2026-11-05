// Synthetic packs with the segment names Ephemeris.fromPacks looks up, for tests.
import { writePack } from "../src/ephemeris/pack.ts";
import { readDaf } from "../src/ephemeris/spk.ts";
import { writeSpk } from "./spkWriter.ts";

export const INIT = -200;
export const LEN = 100;
export const COUNT = 4;
const RSIZE = 2 + 3 * 3;

function records(): Float64Array {
  const out = new Float64Array(COUNT * RSIZE);
  for (let i = 0; i < COUNT; i++) {
    out[i * RSIZE] = INIT + (i + 0.5) * LEN;
    out[i * RSIZE + 1] = LEN / 2;
    for (let k = 0; k < 9; k++) {
      out[i * RSIZE + 2 + k] = (i + 1) * 10 + k;
    }
  }
  return out;
}

/** A pack of `names`, each a 4-record type-2 segment over [INIT, INIT + COUNT * LEN]. */
export function pack(
  kind: "SPK" | "PCK",
  names: string[],
  frame: "ICRF" | "MOON_PA",
  packKind: "position" | "euler",
): Uint8Array {
  const spk = writeSpk({
    kind,
    segments: names.map((_, i) => ({
      target: 10 + i,
      center: 0,
      frame: 1,
      init: INIT,
      intervalLength: LEN,
      recordSize: RSIZE,
      records: records(),
    })),
  });
  const daf = readDaf(spk);
  return writePack(
    {
      format: "cesium-chebyshev-pack/1",
      source: "synthetic.bsp",
      sourceSha256: "0".repeat(64),
      span: ["1999-12-31T00:00:00Z", "2000-01-02T00:00:00Z"],
      derivedFrom: "Derived from synthetic.bsp (test data)",
    },
    names.map((name, i) => ({
      segment: daf.segments[i]!,
      name,
      frame,
      kind: packKind,
      start: INIT,
      end: INIT + COUNT * LEN,
    })),
  );
}
