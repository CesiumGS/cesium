// Orion's trajectory, where its position is used (Task 4c, the owner's
// "why is there a worker between where the position is produced and where
// it's consumed?"). The worker builds the heavy things from the OEM (the
// path's mesh, the accuracy statement and its terms, the proof); the page
// loads the same OEM once and places Orion's dot itself, every frame, at the
// instant the globe shows: an interpolation and a few transforms, a few
// microseconds, with no round trip to wait for. The worker's catalog uses
// the same `orionFromOem` (stress/shared.ts re-exports it).
import { frameTransform } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import type { Instant } from "../../src/time/Instant.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import { parseOem } from "../../src/trajectory/oem.ts";

/** The Artemis II OEM's file name in the frames store. */
export const ORION_OEM = "EM2_FODNAVBET_revF_PUBLIC.oem";

/**
 * Orion from the Artemis II OEM, with the settings the library's data tests
 * use: Hermite degree 11 (NAIF's conversion; the OEM names none) and
 * covariance in m² (the file's actual unit).
 */
export function orionFromOem(text: string, frames: Frames): Trajectory {
  return Trajectory.fromOem(parseOem(text, frames.data.leapSeconds), frames, {
    name: "orion",
    accuracy: "precise",
    interpolation: { method: "hermite", degree: 11 },
    covarianceUnits: "m",
  });
}

/** What the dot reads of a trajectory. */
export type OrionTrack = Pick<Trajectory, "frame" | "contains">;

/**
 * Orion's place in ITRF at `instant`, meters, or undefined outside its
 * data. In whatever frame the path is drawn, this is the path's own sample
 * at `instant`, placed at `instant` (test/data/framesExplorerScenarios.test.ts).
 */
export function orionPlace(
  track: OrionTrack,
  frames: Pick<Frames, "itrf">,
  instant: Instant,
): Float64Array | undefined {
  if (!track.contains(instant)) {
    return undefined;
  }
  const m = frameTransform(track.frame, frames.itrf, instant);
  return Float64Array.of(m[12]!, m[13]!, m[14]!);
}

const hex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * The OEM from the frames store at `base` (the worker fetched it first, so
 * it is usually in the HTTP cache), checked against the manifest's SHA-256
 * where the manifest gives one.
 */
export async function loadOrionTrack(
  frames: Frames,
  manifest: { files: readonly { file: string; sha256: string }[] } | undefined,
  signal: AbortSignal,
  base = "/frames-data/",
): Promise<Trajectory> {
  const response = await fetch(`${base}${encodeURIComponent(ORION_OEM)}`, {
    signal,
  });
  if (!response.ok) {
    throw new Error(`${ORION_OEM} returned ${response.status}`);
  }
  const bytes = await response.arrayBuffer();
  const listed = manifest?.files.find((f) => f.file === ORION_OEM);
  if (listed !== undefined) {
    // An http page anywhere but localhost has no crypto.subtle: say so,
    // rather than use a file nothing has checked.
    const subtle = globalThis.crypto?.subtle;
    if (subtle === undefined) {
      throw new Error(
        `${ORION_OEM} can't be checked against its SHA-256 in manifest.json: this browser gives no crypto.subtle on an http page that isn't localhost; open the page over https or on localhost`,
      );
    }
    if (hex(await subtle.digest("SHA-256", bytes)) !== listed.sha256) {
      throw new Error(
        `${ORION_OEM} does not match its SHA-256 in manifest.json (the file is corrupt or changed); re-run \`npm run setup\``,
      );
    }
  }
  return orionFromOem(new TextDecoder().decode(bytes), frames);
}
