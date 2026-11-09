import type { Rig } from "../camera/rig.ts";
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import type { Instant } from "../time/Instant.ts";
import type { FrameCatalog, Precision } from "./catalog.ts";
import type { Frame } from "./Frame.ts";
import {
  axesAt,
  twoVectorFrame,
  type Axis,
  type TwoVectorDefinition,
} from "./twoVector.ts";

/** The rig presets (plan's call 7). */
export type RigPresetName = "cockpit" | "orbital" | "inertial" | "level";

/** What a preset is built from. */
export interface RigPresetOptions {
  readonly catalog: FrameCatalog;
  /** The followed object's reference frame: its origin is the object. */
  readonly target: Frame;
  /** The object's body-fixed reference frame; `cockpit` and `level` need it. */
  readonly body?: Frame;
  /** The central body (default the Earth). Its vectors come from its ICRF-axes reference frame. */
  readonly central?: Body;
  /** The instant `inertial` freezes at; it needs one. */
  readonly at?: Instant;
  /** The object's forward axis in `body` (default `"+X"`). */
  readonly forward?: Axis;
  /** The object's up axis in `body` (default `"+Z"`). */
  readonly up?: Axis;
  /** What the catalog is asked for (default `"precise"`). */
  readonly precision?: Precision;
}

/** A preset's rig, as plain data, and the reference frames it built. */
export interface RigPreset {
  readonly name: RigPresetName;
  readonly rig: Rig;
  /** The reference frames the preset added to the catalog (none for `cockpit`). */
  readonly frames: readonly Frame[];
}

const VECTORS: Record<Axis, readonly [number, number, number]> = {
  "+X": [1, 0, 0],
  "-X": [-1, 0, 0],
  "+Y": [0, 1, 0],
  "-Y": [0, -1, 0],
  "+Z": [0, 0, 1],
  "-Z": [0, 0, -1],
};

// Presets are memoized per catalog, preset, target, body, central body and
// options; a tree of maps keyed by identity.
const memo = new WeakMap<FrameCatalog, Map<string, WeakMap<Frame, unknown>>>();

function memoized(
  options: RigPresetOptions,
  name: RigPresetName,
  key: string,
  build: () => RigPreset,
): RigPreset {
  let byName = memo.get(options.catalog);
  if (!byName) {
    byName = new Map();
    memo.set(options.catalog, byName);
  }
  const k = `${name}|${key}`;
  let byTarget = byName.get(k);
  if (!byTarget) {
    byTarget = new WeakMap();
    byName.set(k, byTarget);
  }
  // The body is part of the key through a nested weak map on the target.
  let byBody = byTarget.get(options.target) as
    WeakMap<object, RigPreset> | undefined;
  if (!byBody) {
    byBody = new WeakMap();
    byTarget.set(options.target, byBody);
  }
  const bodyKey = options.body ?? options.target;
  let preset = byBody.get(bodyKey);
  if (!preset) {
    preset = build();
    byBody.set(bodyKey, preset);
  }
  return preset;
}

/** The Earth's or the Moon's reference frames a preset reads. */
function central(
  options: RigPresetOptions,
  precision: Precision,
): { vectors: Frame; axes: Frame; body: Body } {
  const body = options.central ?? EARTH;
  const get = (name: "EARTH_ICRF" | "MOON_ICRF" | "GCRF") =>
    options.catalog.get(name, { precision, user: "rig" });
  if (body.name === EARTH.name) {
    return { vectors: get("EARTH_ICRF"), axes: get("GCRF"), body };
  }
  if (body.name === MOON.name) {
    const moon = get("MOON_ICRF");
    return { vectors: moon, axes: moon, body };
  }
  throw new RangeError(
    `rigPreset: no reference frames for the central body "${body.name}"; the Earth and the Moon have them`,
  );
}

const iso = (catalog: FrameCatalog, at: Instant): string =>
  new Date(at.toUtc(catalog.leapSeconds)).toISOString();

/**
 * A rig preset as data (plan's call 7). Each one builds two-vector
 * reference frames, adds them to the catalog as rig users, and returns a
 * plain `Rig`: the camera sits at the target's origin, in the preset's
 * reference frame, and looks along its +X with +Z up (`cockpit`: along
 * `forward`, with `up`, in `body`).
 *
 * - `cockpit`: the target's body-fixed reference frame;
 * - `orbital`: +Z up from the central body, +X along the velocity;
 * - `inertial`: `orbital` frozen at `at`; built anew on each call;
 * - `level`: +X the target's `forward` axis, +Z up from the central body.
 *
 * Vectors are geometric (no light time). Throws a `RangeError`, naming the
 * preset, for a missing `body` or `at`.
 */
export function rigPreset(
  name: RigPresetName,
  options: RigPresetOptions,
): RigPreset {
  const precision = options.precision ?? "precise";
  const forward = options.forward ?? "+X";
  const up = options.up ?? "+Z";
  const { target, body, catalog } = options;
  const axesRig = (frame: Frame, f: Axis, u: Axis): Rig => ({
    position: { frame },
    orientation: {
      kind: "axes",
      frame,
      forward: VECTORS[f],
      up: VECTORS[u],
    },
  });
  if (name === "cockpit") {
    if (!body) {
      throw new RangeError(
        'rigPreset "cockpit" needs the target\'s body-fixed reference frame (options.body)',
      );
    }
    return memoized(options, name, `${forward}${up}`, () => ({
      name,
      rig: axesRig(body, forward, up),
      frames: [],
    }));
  }
  if (name === "level" && !body) {
    throw new RangeError(
      'rigPreset "level" needs the target\'s body-fixed reference frame (options.body)',
    );
  }
  if (name === "inertial" && !options.at) {
    throw new RangeError(
      'rigPreset "inertial" needs the instant to freeze at (options.at)',
    );
  }
  const build = (): RigPreset => {
    const c = central(options, precision);
    const parent = axesAt(`${target.name} axes`, target, c.axes);
    const position = {
      kind: "position",
      target,
      observer: c.vectors,
    } as const;
    let definition: TwoVectorDefinition;
    let label: string;
    if (name === "level") {
      definition = {
        primary: {
          axis: "+X",
          vector: { kind: "constant", vector: VECTORS[forward], frame: body! },
        },
        secondary: { axis: "+Z", vector: position },
      };
      label = `${target.name} level`;
    } else {
      definition = {
        primary: { axis: "+Z", vector: position },
        secondary: {
          axis: "+X",
          vector: {
            kind: "velocity",
            target,
            observer: c.vectors,
            frame: c.axes,
          },
        },
        ...(name === "inertial" && { freeze: options.at! }),
      };
      label =
        name === "inertial"
          ? `${target.name} inertial ${iso(catalog, options.at!)}`
          : `${target.name} orbital`;
    }
    const frame = twoVectorFrame(label, parent, definition);
    catalog.add(parent, "rig");
    catalog.add(frame, "rig");
    return {
      name,
      rig: axesRig(frame, "+X", "+Z"),
      frames: [parent, frame],
    };
  };
  if (name === "inertial") {
    return build();
  }
  return memoized(
    options,
    name,
    `${name === "level" ? forward : ""}${options.central?.name ?? "Earth"}${precision}`,
    build,
  );
}
