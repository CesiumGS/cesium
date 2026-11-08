/**
 * Loaded tiles in eviction order: least recently touched first, and tiles
 * touched in the same frame in load order. Eviction used to copy and sort
 * every loaded tile into this order on each frame it ran (5.5 ms at 30,000
 * tiles). This keeps the order as tiles are touched, loaded and unloaded, in
 * an intrusive doubly linked list, so eviction walks from the cold end and
 * costs what it evicts.
 *
 * - `touch` moves a loaded tile to the warm end.
 * - `add` places a newly loaded tile by its last touch (usually the warm
 *   end; a tile that waited in the upload queue may land further back).
 * - `seal` puts the tiles touched since its last call in load order. That
 *   costs a sort of those tiles only (one frame's selection), and keeps ties
 *   as the old sort had them (stable, over the loaded set's insertion
 *   order), so the same tiles are evicted.
 */
export interface TouchNode<T> {
  /** Frame in which any view last touched (needed) the tile. */
  touchedFrame: number;
  /** Neighbors in the order (undefined at either end, or outside it). */
  touchPrev: T | undefined;
  touchNext: T | undefined;
  /** Load sequence: later loads are larger; 0 while not in the order. */
  touchSeq: number;
}

export class TouchOrder<T extends TouchNode<T>> {
  private head: T | undefined;
  private tail: T | undefined;
  private seq = 0;
  /** Tiles last touched in this frame or earlier are in load order. */
  private sealed = -Infinity;
  /** Tiles in the order. */
  size = 0;
  /** Links followed so far (tests read it as the order's cost). */
  steps = 0;

  has(node: T): boolean {
    return node.touchSeq !== 0;
  }

  /** A tile loaded: after every tile touched in its touch frame or earlier. */
  add(node: T): void {
    if (this.has(node)) {
      return;
    }
    node.touchSeq = ++this.seq;
    let after = this.tail;
    while (after !== undefined && after.touchedFrame > node.touchedFrame) {
      after = after.touchPrev;
      this.steps++;
    }
    this.insertAfter(node, after);
    this.size++;
  }

  /** Sets the tile's touch frame; a loaded tile moves to the warm end. */
  touch(node: T, frame: number): void {
    const previous = node.touchedFrame;
    node.touchedFrame = frame;
    // Touched again in the same frame: already among this frame's tiles.
    if (!this.has(node) || previous === frame || this.tail === node) {
      return;
    }
    this.unlink(node);
    this.insertAfter(node, this.tail);
  }

  /** A tile unloaded. */
  remove(node: T): void {
    if (!this.has(node)) {
      return;
    }
    this.unlink(node);
    node.touchSeq = 0;
    this.size--;
  }

  /**
   * Puts the tiles touched since the last call in touch frame, then load
   * order. They are the warm end of the list. Call once a frame, after its
   * touches and loads and before eviction walks.
   */
  seal(frame: number): void {
    const group: T[] = [];
    let before = this.tail;
    while (before !== undefined && before.touchedFrame > this.sealed) {
      group.push(before);
      before = before.touchPrev;
      this.steps++;
    }
    this.sealed = Math.max(this.sealed, frame);
    if (group.length < 2) {
      return;
    }
    group.reverse();
    const sorted = [...group].sort(
      (a, b) => a.touchedFrame - b.touchedFrame || a.touchSeq - b.touchSeq,
    );
    if (sorted.every((node, i) => node === group[i])) {
      return;
    }
    // Relink the group after `before`, in sorted order.
    let previous = before;
    for (const node of sorted) {
      node.touchPrev = previous;
      if (previous === undefined) {
        this.head = node;
      } else {
        previous.touchNext = node;
      }
      previous = node;
    }
    previous!.touchNext = undefined;
    this.tail = previous;
  }

  /**
   * The tiles not touched in `frame` or later, least recently touched first.
   * The caller may remove each tile as it's yielded.
   */
  *coldest(frame: number): Generator<T> {
    let node = this.head;
    while (node !== undefined && node.touchedFrame < frame) {
      const next = node.touchNext;
      this.steps++;
      yield node;
      node = next;
    }
  }

  private insertAfter(node: T, after: T | undefined): void {
    node.touchPrev = after;
    if (after === undefined) {
      node.touchNext = this.head;
      this.head = node;
    } else {
      node.touchNext = after.touchNext;
      after.touchNext = node;
    }
    if (node.touchNext === undefined) {
      this.tail = node;
    } else {
      node.touchNext.touchPrev = node;
    }
  }

  private unlink(node: T): void {
    const { touchPrev: prev, touchNext: next } = node;
    if (prev === undefined) {
      this.head = next;
    } else {
      prev.touchNext = next;
    }
    if (next === undefined) {
      this.tail = prev;
    } else {
      next.touchPrev = prev;
    }
    node.touchPrev = node.touchNext = undefined;
  }
}
