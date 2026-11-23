// One work budget for reading a stage (CS-913, CS-1097 A). USD files are
// untrusted input, and a few kilobytes can name more work than any real asset
// needs: arcs that fan out, wide prims, long chains of sublayers. Rather than
// a limit per shape, every loop that does work for the file charges this one
// budget, in its inner loop, and reading stops when it runs out.
//
// One unit is one step of a loop: a decoded value, 16 numbers of a bulk
// array or 16 bytes decompressed, a site, a layer of a site's stack, a
// property spec, a list element, a variant selection indexed, a node of an
// arc chain, and 16 characters of a string copied or compared. A token costs
// two, since all of a layer's tokens are held at once, and an object the
// stage keeps (a prim, a property, a field, a site, a spec) costs KEPT, so
// that the same budget bounds the heap as well as the time. Spike code for
// CS-833, CS-843 and CS-913; not part of @cesium/next.

/**
 * The work one stage may cost. The six SimReady samples spend 32,012 to
 * 113,762 units each (see `docs/design/usd-readers.md`), so this is about 44
 * times the heaviest of them. On the Mac test machine, the hostile files of
 * `test/usdHostileFiles.ts` that spend it all take under half a second and
 * keep under 130 MiB.
 */
export const MAX_WORK = 5_000_000;
/** What an object the stage keeps costs, in units: about 50 bytes a unit. */
export const KEPT = 4;
/** The largest layer file read, checked before parsing. The samples' largest is 1.4 MiB. */
export const MAX_LAYER_BYTES = 64 * 2 ** 20;
/** The most bytes read for a whole stage, checked before each layer is parsed. */
export const MAX_STAGE_BYTES = 256 * 2 ** 20;
/**
 * The longest path, name or asset path the reader takes, in characters. V8
 * hashes a string longer than 16,383 characters by its length alone, so a
 * file of many such strings would make every map lookup a scan that no
 * budget sees. Real paths are a few hundred characters at most.
 */
export const MAX_PATH = 4096;
/** The longest field or metadata name the parsers take: Sdf's names are short identifiers. */
export const MAX_FIELD_NAME = 256;
/** The most layers a stage reads. The samples read 1 to 12. */
export const MAX_LAYERS = 1000;

/** Thrown by `Budget.charge` when the budget runs out; readers stop where they are. */
export class WorkLimit extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(
      `Reading stopped at the subset reader's work limit of ${limit} units; the rest of the stage is not read or composed.`,
    );
    this.limit = limit;
  }
}

export class Budget {
  readonly limit: number;
  private left: number;
  constructor(limit = MAX_WORK) {
    this.limit = limit;
    this.left = limit;
  }

  /** Units spent so far. */
  get spent(): number {
    return this.limit - Math.max(0, this.left);
  }

  /** True once a charge has passed the limit. */
  get exhausted(): boolean {
    return this.left < 0;
  }

  /** The stop message, in the same words wherever reading stopped. */
  get message(): string {
    return new WorkLimit(this.limit).message;
  }

  /** Spends `units`; throws WorkLimit past the limit, and on every charge after. */
  charge(units = 1): void {
    this.left -= units;
    if (this.left < 0) {
      throw new WorkLimit(this.limit);
    }
  }

  /** Spends for a string copied or compared: one unit, and one per 16 characters. */
  text(s: string): void {
    this.charge(1 + Math.floor(s.length / 16));
  }

  /** Spends for `n` objects the stage keeps. */
  keep(n = 1): void {
    this.charge(n * KEPT);
  }
}
