// A bounding-volume hierarchy over boxes, for the b-rep adapter (overall plan
// §13.33): built once, top-down by the median of the longest axis, and walked
// by a ray (near child first) or by distance to a point (best-first). The
// walks call back per item and read the current bound each time, so a hit or
// a closer point shrinks the work that remains.

const LEAF = 4;

/** Boxes as 6 numbers each: min x, y, z, then max x, y, z. */
export class Bvh {
  private readonly box: Float64Array;
  private readonly left: Int32Array;
  private readonly right: Int32Array;
  private readonly first: Int32Array;
  private readonly count: Int32Array;
  private readonly order: Uint32Array;
  private nodes = 0;

  constructor(private readonly boxes: Float64Array) {
    const n = boxes.length / 6;
    const capacity = Math.max(1, 2 * n);
    this.box = new Float64Array(capacity * 6);
    this.left = new Int32Array(capacity).fill(-1);
    this.right = new Int32Array(capacity).fill(-1);
    this.first = new Int32Array(capacity);
    this.count = new Int32Array(capacity);
    this.order = Uint32Array.from({ length: n }, (_, i) => i);
    if (n > 0) {
      this.build(boxes, 0, n);
    }
  }

  /** Whether the hierarchy holds no items. */
  get empty(): boolean {
    return this.nodes === 0;
  }

  private build(boxes: Float64Array, lo: number, hi: number): number {
    const node = this.nodes++;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const cmin = [Infinity, Infinity, Infinity];
    const cmax = [-Infinity, -Infinity, -Infinity];
    for (let i = lo; i < hi; i++) {
      const b = this.order[i]! * 6;
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k]!, boxes[b + k]!);
        max[k] = Math.max(max[k]!, boxes[b + 3 + k]!);
        const c = (boxes[b + k]! + boxes[b + 3 + k]!) / 2;
        cmin[k] = Math.min(cmin[k]!, c);
        cmax[k] = Math.max(cmax[k]!, c);
      }
    }
    for (let k = 0; k < 3; k++) {
      this.box[node * 6 + k] = min[k]!;
      this.box[node * 6 + 3 + k] = max[k]!;
    }
    this.first[node] = lo;
    this.count[node] = hi - lo;
    if (hi - lo <= LEAF) {
      return node;
    }
    let axis = 0;
    for (let k = 1; k < 3; k++) {
      if (cmax[k]! - cmin[k]! > cmax[axis]! - cmin[axis]!) {
        axis = k;
      }
    }
    if (!(cmax[axis]! > cmin[axis]!)) {
      return node;
    }
    const part = Array.from(this.order.subarray(lo, hi)).sort(
      (a, b) =>
        boxes[a * 6 + axis]! +
        boxes[a * 6 + 3 + axis]! -
        (boxes[b * 6 + axis]! + boxes[b * 6 + 3 + axis]!),
    );
    this.order.set(part, lo);
    const mid = (lo + hi) >> 1;
    this.left[node] = this.build(boxes, lo, mid);
    this.right[node] = this.build(boxes, mid, hi);
    this.count[node] = 0;
    return node;
  }

  /** Where the segment `from + t·d` enters the node's box within [tMin, tMax], or undefined. */
  private enter(
    node: number,
    from: ArrayLike<number>,
    d: ArrayLike<number>,
    tMin: number,
    tMax: number,
  ): number | undefined {
    let near = tMin;
    let far = tMax;
    for (let k = 0; k < 3; k++) {
      const lo = this.box[node * 6 + k]!;
      const hi = this.box[node * 6 + 3 + k]!;
      if (d[k] === 0) {
        if (from[k]! < lo || from[k]! > hi) {
          return undefined;
        }
        continue;
      }
      let t0 = (lo - from[k]!) / d[k]!;
      let t1 = (hi - from[k]!) / d[k]!;
      if (t0 > t1) {
        [t0, t1] = [t1, t0];
      }
      near = Math.max(near, t0);
      far = Math.min(far, t1);
      if (near > far) {
        return undefined;
      }
    }
    return near;
  }

  /**
   * Visits the items whose boxes the segment crosses, nearer boxes first,
   * skipping those entered after `limit()`. `visit` returns true to stop.
   */
  ray(
    from: ArrayLike<number>,
    d: ArrayLike<number>,
    tMin: number,
    limit: () => number,
    visit: (item: number) => boolean,
  ): void {
    if (this.nodes === 0) {
      return;
    }
    const stack: Array<[number, number]> = [];
    const root = this.enter(0, from, d, tMin, limit());
    if (root === undefined) {
      return;
    }
    stack.push([0, root]);
    while (stack.length > 0) {
      const [node, entry] = stack.pop()!;
      if (entry > limit()) {
        continue;
      }
      if (this.left[node]! < 0) {
        const start = this.first[node]!;
        for (let i = start; i < start + this.count[node]!; i++) {
          if (visit(this.order[i]!)) {
            return;
          }
        }
        continue;
      }
      const a = this.left[node]!;
      const b = this.right[node]!;
      const ta = this.enter(a, from, d, tMin, limit());
      const tb = this.enter(b, from, d, tMin, limit());
      // The stack pops the nearer child last pushed.
      if (ta !== undefined && tb !== undefined) {
        if (ta <= tb) {
          stack.push([b, tb], [a, ta]);
        } else {
          stack.push([a, ta], [b, tb]);
        }
      } else if (ta !== undefined) {
        stack.push([a, ta]);
      } else if (tb !== undefined) {
        stack.push([b, tb]);
      }
    }
  }

  /** The distance from `p` to the node's box. */
  private distance(node: number, p: ArrayLike<number>): number {
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      const x = p[k]!;
      const gap = Math.max(
        this.box[node * 6 + k]! - x,
        x - this.box[node * 6 + 3 + k]!,
        0,
      );
      sum += gap * gap;
    }
    return Math.sqrt(sum);
  }

  /**
   * Visits the items nearest first by their boxes' distance to `p`, skipping
   * those farther than `bound()`. `visit` gets the item and that distance.
   */
  nearest(
    p: ArrayLike<number>,
    bound: () => number,
    visit: (item: number, lower: number) => void,
  ): void {
    if (this.nodes === 0) {
      return;
    }
    const stack: Array<[number, number]> = [[0, this.distance(0, p)]];
    while (stack.length > 0) {
      const [node, lower] = stack.pop()!;
      if (lower > bound()) {
        continue;
      }
      if (this.left[node]! < 0) {
        const start = this.first[node]!;
        const items: Array<[number, number]> = [];
        for (let i = start; i < start + this.count[node]!; i++) {
          const item = this.order[i]!;
          items.push([item, this.itemDistance(item, p)]);
        }
        items.sort((x, y) => x[1] - y[1]);
        for (const [item, d] of items) {
          if (d <= bound()) {
            visit(item, d);
          }
        }
        continue;
      }
      const a = this.left[node]!;
      const b = this.right[node]!;
      const da = this.distance(a, p);
      const db = this.distance(b, p);
      if (da <= db) {
        stack.push([b, db], [a, da]);
      } else {
        stack.push([a, da], [b, db]);
      }
    }
  }

  private itemDistance(item: number, p: ArrayLike<number>): number {
    const b = this.boxes;
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      const x = p[k]!;
      const gap = Math.max(b[item * 6 + k]! - x, x - b[item * 6 + 3 + k]!, 0);
      sum += gap * gap;
    }
    return Math.sqrt(sum);
  }
}
