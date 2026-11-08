/**
 * The ids of tiles evicted lately, newest last, with the bytes each held,
 * and no content: a bounded memory of what the cache let go. `Tileset3D`
 * keeps one for shadow casters and one for the cold view tiles, and moves
 * the casters' share of the cache by which list is asked for its tiles
 * again (the adaptive split of ARC, the Adaptive Replacement Cache).
 */
export class RecentlyEvicted {
  private readonly entries = new Map<string, number>();

  constructor(readonly capacity = 1024) {}

  get size(): number {
    return this.entries.size;
  }

  /** Remembers the tile's id; the oldest id goes when the list is full. */
  add(id: string, bytes: number): void {
    this.entries.delete(id);
    this.entries.set(id, bytes);
    if (this.entries.size > this.capacity) {
      this.entries.delete(this.entries.keys().next().value!);
    }
  }

  /** Forgets the id, returning the bytes it held; undefined if not listed. */
  take(id: string): number | undefined {
    const bytes = this.entries.get(id);
    if (bytes !== undefined) {
      this.entries.delete(id);
    }
    return bytes;
  }
}
