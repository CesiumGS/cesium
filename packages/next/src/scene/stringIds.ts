/**
 * String ids for the GPU (3D Tiles styling of string properties). A feature
 * table's string column is uploaded as numbers: each string's id, one
 * float32 per feature, so a style compares a string with an integer test.
 * Node-safe.
 *
 * One table serves every tile and every style, so an id means the same
 * string everywhere: a style's literal (`${name} === 'Main St'`) is
 * compiled to its id once, and any tile, loaded before or after the
 * style, holds the same id for the same string.
 *
 * - Ids start at `STRING_ID_BASE` (8,388,608) and stay below 2²⁴, where a
 *   float32 still holds every integer. A numeric column compared with a
 *   string never matches by accident unless its values are integers in
 *   that range.
 * - 0 is "no string": a missing value, which equals nothing.
 * - A tile's column holds a reference on each of its distinct strings
 *   while it is uploaded (`retain`, `release`), so a streaming session
 *   frees the strings of tiles it unloads, and their ids are reused. A
 *   style's literals are never freed.
 */

/** The first id: numbers below it are never string ids. */
export const STRING_ID_BASE = 0x800000;

/** How many distinct strings the table holds at once. */
export const MAX_STRING_IDS = 0x800000;

export class StringIds {
  private readonly ids = new Map<string, number>();
  /** The string of id `STRING_ID_BASE + i`, or undefined where free. */
  private readonly strings: Array<string | undefined> = [];
  private readonly references: number[] = [];
  /** Style literals: kept for the table's life. */
  private readonly pinned = new Set<number>();
  private readonly free: number[] = [];

  /** Distinct strings held now. */
  get size(): number {
    return this.ids.size;
  }

  /** `value`'s id, if it has one. */
  find(value: string): number | undefined {
    return this.ids.get(value);
  }

  /** The string an id stands for, if it is held. */
  stringOf(id: number): string | undefined {
    return this.strings[id - STRING_ID_BASE];
  }

  /**
   * A style literal's id, kept for good (a style may be used at any time
   * and has nothing to release). Throws if the table is full.
   */
  literal(value: string): number {
    const id = this.take(value);
    this.pinned.add(id);
    return id;
  }

  /**
   * Holds a reference on `value` for a table's column (one per distinct
   * string per column) and returns its id; `release` gives it back.
   * Throws if the table is full.
   */
  retain(value: string): number {
    const id = this.take(value);
    this.references[id - STRING_ID_BASE]!++;
    return id;
  }

  /** Gives back what `retain` took; the last one frees an unpinned string. */
  release(value: string): void {
    const id = this.ids.get(value);
    if (id === undefined) {
      return;
    }
    const at = id - STRING_ID_BASE;
    if (--this.references[at]! <= 0 && !this.pinned.has(id)) {
      this.ids.delete(value);
      this.strings[at] = undefined;
      this.references[at] = 0;
      this.free.push(id);
    }
  }

  private take(value: string): number {
    const known = this.ids.get(value);
    if (known !== undefined) {
      return known;
    }
    let id = this.free.pop();
    if (id === undefined) {
      if (this.strings.length >= MAX_STRING_IDS) {
        throw new Error(
          `String properties: more than ${MAX_STRING_IDS} distinct strings are held at once; styles can't compare them on the GPU.`,
        );
      }
      id = STRING_ID_BASE + this.strings.length;
      this.strings.push(undefined);
      this.references.push(0);
    }
    this.ids.set(value, id);
    this.strings[id - STRING_ID_BASE] = value;
    return id;
  }
}

/** The engine's table: every world and every style shares it. */
export const stringIds = new StringIds();
