import { FrameUnavailableError } from "../camera/frameResolver.ts";
import type { Instant } from "../time/Instant.ts";
import { Frame, frameTransform, routeRevision } from "./Frame.ts";
import { frameVelocity } from "./motion.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";

/** One piece of a piecewise reference frame. */
export interface FramePiece {
  /** The piece's definition: a constant offset in a parent, a trajectory's `frame`, any reference frame. */
  readonly frame: Frame;
  /** The piece is valid from here to the next piece's `from`. */
  readonly from: Instant;
  /** The change at `from` is a cut the application wants: no continuity check. */
  readonly jump?: true;
  /** The piece is a simulation: a route across it makes no accuracy claim. */
  readonly simulated?: true;
  readonly note?: string;
}

/** Options for `piecewiseFrame`. */
export interface PiecewiseOptions {
  /** The last piece is valid until here; without it, forever. */
  readonly until?: Instant;
  /** Continuity tolerance at an undeclared change (default 0.01 m and 0.01 m/s). */
  readonly tolerance?: {
    readonly meters: number;
    readonly metersPerSecond: number;
  };
}

/**
 * Thrown when two pieces of a piecewise reference frame meet at a change
 * with their origins apart in position or velocity beyond the tolerance, and
 * the application did not declare the change a jump.
 */
export class PiecewiseJumpError extends Error {
  readonly frame: string;
  readonly at: Instant;
  readonly meters: number;
  readonly metersPerSecond: number;
  readonly tolerance: { meters: number; metersPerSecond: number };

  constructor(
    frame: string,
    at: Instant,
    meters: number,
    metersPerSecond: number,
    tolerance: { meters: number; metersPerSecond: number },
  ) {
    super(
      `Frame "${frame}": its pieces are not continuous at a change: the origins are ${meters} m and ${metersPerSecond} m/s apart (the tolerance is ${tolerance.meters} m and ${tolerance.metersPerSecond} m/s); declare the change a jump if it is meant`,
    );
    this.name = "PiecewiseJumpError";
    this.frame = frame;
    this.at = at;
    this.meters = meters;
    this.metersPerSecond = metersPerSecond;
    this.tolerance = tolerance;
  }
}

const DEFAULT_TOLERANCE = { meters: 0.01, metersPerSecond: 0.01 } as const;

const chainOf = (frame: Frame): Frame[] => {
  const out: Frame[] = [];
  for (let f: Frame | undefined = frame; f; f = f.parent) {
    out.push(f);
  }
  return out;
};

/** The deepest reference frame that is an ancestor of, or is, every one of `frames`. */
function deepestCommon(name: string, frames: readonly Frame[]): Frame {
  let common = chainOf(frames[0]!);
  for (const f of frames.slice(1)) {
    const above = new Set(chainOf(f));
    common = common.filter((c) => above.has(c));
  }
  if (common.length === 0) {
    throw new RangeError(
      `Frame "${name}": its pieces are in different trees, so there is no hub to hang it under`,
    );
  }
  return common[0]!;
}

/**
 * A reference frame that is a different reference frame over time: its
 * pieces take over at their `from` instants. In the tree it hangs under a
 * fixed hub (the deepest common ancestor of its pieces' parents), so routes
 * stay static; `parentAt(instant)` says the current piece's parent, for
 * display and accuracy. Its matrix is the piece's route to the hub.
 */
export class PiecewiseFrame<N extends string = string> extends Frame<N> {
  readonly pieces: readonly FramePiece[];
  readonly hub: Frame;
  readonly changes: readonly Instant[];
  private readonly until: Instant | undefined;

  constructor(
    name: N,
    pieces: readonly FramePiece[],
    hub: Frame,
    until: Instant | undefined,
  ) {
    const box: { self?: PiecewiseFrame<N> } = {};
    super(
      name,
      hub,
      (instant, out) => {
        const piece = box.self!.pieceAt(instant);
        if (piece === undefined) {
          throw new FrameUnavailableError(
            name,
            "outsideData",
            `${name}: the instant is outside its pieces`,
          );
        }
        frameTransform(piece.frame, hub, instant, out);
      },
      {
        cache: false,
        accuracy: (instant): FrameAccuracy => {
          const piece = box.self!.pieceAt(instant);
          if (piece === undefined) {
            return {
              note: `${name}: not known outside its pieces' span`,
            };
          }
          if (piece.simulated === true) {
            return {
              simulated: true,
              note: piece.note ?? `${name}: a simulated piece`,
            };
          }
          return {
            byDefinition: true,
            note: `${name}: its piece's own edges state the accuracy`,
          };
        },
      },
    );
    box.self = this;
    this.pieces = pieces;
    this.hub = hub;
    this.until = until;
    this.changes = pieces.slice(1).map((p) => p.from);
  }

  /** The piece valid at `instant`, or `undefined` outside them (half-open: a piece owns its `from`). */
  pieceAt(instant: Instant): FramePiece | undefined {
    const t = instant.tdb();
    if (t < this.pieces[0]!.from.tdb()) {
      return undefined;
    }
    if (this.until !== undefined && t >= this.until.tdb()) {
      return undefined;
    }
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      if (t >= this.pieces[i]!.from.tdb()) {
        return this.pieces[i];
      }
    }
    return undefined;
  }

  override parentAt(instant: Instant): Frame | undefined {
    return this.pieceAt(instant)?.frame.parent ?? this.parent;
  }

  /** Its own revision plus each piece's route revision to the hub: it does not change at a change. */
  override get revision(): number {
    let sum = super.revision;
    for (const piece of this.pieces ?? []) {
      sum += routeRevision(piece.frame, this.hub);
    }
    return sum;
  }
}

/**
 * A piecewise reference frame (plan 5b's calls 25 to 28): `pieces`, sorted by
 * `from`, each valid until the next one's `from`, the last until
 * `options.until` or forever. Outside, it throws `FrameUnavailableError`
 * (`"outsideData"`). At each change not declared a `jump`, the two pieces'
 * origins must agree in position and velocity (by central differences) within
 * the tolerance: otherwise this throws `PiecewiseJumpError`. It is built only
 * when every change can be evaluated; otherwise it throws the
 * `FrameUnavailableError` it met. Throws a `RangeError`, naming it, for no
 * pieces, pieces not strictly increasing in `from`, or pieces in different
 * trees.
 */
export function piecewiseFrame<N extends string>(
  name: N,
  pieces: readonly FramePiece[],
  options: PiecewiseOptions = {},
): PiecewiseFrame<N> {
  if (pieces.length === 0) {
    throw new RangeError(`Frame "${name}": a piecewise frame needs a piece`);
  }
  for (let i = 1; i < pieces.length; i++) {
    if (!(pieces[i]!.from.tdb() > pieces[i - 1]!.from.tdb())) {
      throw new RangeError(
        `Frame "${name}": its pieces must be sorted by strictly increasing from (piece ${i} is not after piece ${i - 1})`,
      );
    }
  }
  const until = options.until;
  if (until !== undefined && !(until.tdb() > pieces.at(-1)!.from.tdb())) {
    throw new RangeError(
      `Frame "${name}": until must be after its last piece's from`,
    );
  }
  const parents = pieces.map((p) => {
    if (p.frame.parent === undefined) {
      throw new RangeError(
        `Frame "${name}": a piece's reference frame "${p.frame.name}" has no parent`,
      );
    }
    return p.frame.parent;
  });
  const hub = deepestCommon(name, parents);
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const origin = (f: Frame, at: Instant): number[] => {
    const m = frameTransform(f, hub, at);
    return [m[12]!, m[13]!, m[14]!];
  };
  for (let i = 1; i < pieces.length; i++) {
    const next = pieces[i]!;
    if (next.jump === true) {
      continue;
    }
    const at = next.from;
    const before = pieces[i - 1]!.frame;
    const after = next.frame;
    const p0 = origin(before, at);
    const p1 = origin(after, at);
    const v0 = frameVelocity(before, hub, at);
    const v1 = frameVelocity(after, hub, at);
    const meters = Math.hypot(
      p1[0]! - p0[0]!,
      p1[1]! - p0[1]!,
      p1[2]! - p0[2]!,
    );
    const metersPerSecond = Math.hypot(
      v1[0]! - v0[0]!,
      v1[1]! - v0[1]!,
      v1[2]! - v0[2]!,
    );
    if (
      meters > tolerance.meters ||
      metersPerSecond > tolerance.metersPerSecond
    ) {
      throw new PiecewiseJumpError(name, at, meters, metersPerSecond, {
        meters: tolerance.meters,
        metersPerSecond: tolerance.metersPerSecond,
      });
    }
  }
  return new PiecewiseFrame(name, pieces, hub, until);
}
