// One work budget for reading a stage (CS-913, CS-1097 A). USD files are
// untrusted input, and a few kilobytes can name more work than any real asset
// needs: arcs that fan out, wide prims, long chains of sublayers. Rather than
// a limit per shape, every loop that does work for the file charges this one
// budget, in its inner loop, and reading stops when it runs out.
//
// One unit stands for 16 bytes the reader may allocate, or about 50 ns of
// work, and every charge is the larger of the two (CS-1153 A). Allocations
// are charged by their size before they happen: decoded text, strings,
// typed arrays by their bytes, and each object the stage keeps (a prim, a
// property, a field, a site, a spec, a package entry) as KEPT, and each
// entry added to a map or set as MAP_ENTRY. Loops charge
// per outer item as well as per inner one. So MAX_WORK bounds the heap and
// ArrayBuffer memory as well as the time. Spike code for CS-833, CS-843 and
// CS-913; not part of @cesium/next.

/** The bytes one unit stands for. */
export const UNIT_BYTES = 16;
/** An object the stage keeps, with its map entry: about 128 bytes. A map of its own is another. */
export const KEPT = 8;
/** An entry added to a map or set, with the table's growth: about 48 bytes. */
export const MAP_ENTRY = 3;
/** A token the USDA tokenizer holds until it's parsed, with the number or array slot it becomes: about 64 bytes. */
export const TOKEN = 4;

/**
 * The work one stage may cost: 80 MB of charged allocation. The six SimReady
 * samples spend 100,804 (copper_brushed) to 529,802 (the pallet, mostly its
 * meshes' typed arrays) units each, so this is about 9 times the heaviest.
 */
export const MAX_WORK = 5_000_000;

/**
 * The ceiling every input stays under, which `test/usdHostileFiles.ts`
 * checks on every generated file and named case: the time to load,
 * compose, build the records and their facts; and the V8 heap's peak and
 * the ArrayBuffer memory, each. The heap peaks at up to about three times
 * the bytes charged (V8's map growth and free space), so the memory ceiling
 * is MAX_WORK × UNIT_BYTES × 3, about 240 MiB, rounded up.
 */
export const STATED_MS = 4000;
export const STATED_MIB = 256;

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

  /** Spends for `n` bytes about to be allocated: one unit per UNIT_BYTES, by division (a size past 2^32 mustn't wrap). */
  bytes(n: number): void {
    this.charge(1 + Math.ceil(n / UNIT_BYTES));
  }

  /** Spends for a string of `length` characters about to be built, copied or compared: up to two bytes a character. */
  chars(length: number): void {
    this.bytes(2 * length);
  }

  /** Spends for a string copied or compared. */
  text(s: string): void {
    this.chars(s.length);
  }

  /** Spends for `n` entries about to be added to a map or set. */
  entries(n = 1): void {
    this.charge(n * MAP_ENTRY);
  }

  /** Spends for `n` objects the stage keeps. */
  keep(n = 1): void {
    this.charge(n * KEPT);
  }
}
