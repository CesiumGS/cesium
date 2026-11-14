/**
 * A layered layout for small dependency graphs (the Work board's item and
 * project graphs, tens of nodes): left to right, each node one layer
 * after everything it needs, rows ordered to cut crossings. A cycle (the
 * tracker's check refuses them, but a file may still have one) is broken
 * by placing what remains in one more layer.
 */

export interface DagEdge {
  /** What is needed. */
  from: string;
  /** What needs it. */
  to: string;
}

export interface DagLayout {
  /** Each node's layer (column) and row. */
  place: Map<string, { layer: number; row: number }>;
  layers: number;
  /** The most rows in any layer. */
  rows: number;
}

/** Sweeps of the crossing-reduction pass (barycenter, both directions). */
const SWEEPS = 6;

export function layoutDag(
  nodes: readonly string[],
  edges: readonly DagEdge[],
): DagLayout {
  const known = new Set(nodes);
  const kept = edges.filter(
    (e) => known.has(e.from) && known.has(e.to) && e.from !== e.to,
  );
  const preds = new Map(nodes.map((n) => [n, [] as string[]]));
  const succs = new Map(nodes.map((n) => [n, [] as string[]]));
  for (const e of kept) {
    preds.get(e.to)!.push(e.from);
    succs.get(e.from)!.push(e.to);
  }

  // Layers: longest path from the sources (Kahn's order).
  const layer = new Map<string, number>();
  const waiting = new Map(nodes.map((n) => [n, preds.get(n)!.length]));
  let frontier = nodes.filter((n) => waiting.get(n) === 0);
  let depth = 0;
  while (layer.size < nodes.length) {
    if (!frontier.length) {
      // A cycle: what is left goes in the next layer.
      frontier = nodes.filter((n) => !layer.has(n));
    }
    const next: string[] = [];
    for (const n of frontier) {
      if (layer.has(n)) {
        continue;
      }
      const after = Math.max(
        depth,
        ...preds.get(n)!.map((p) => (layer.get(p) ?? -1) + 1),
      );
      layer.set(n, after);
      for (const s of succs.get(n)!) {
        const left = waiting.get(s)! - 1;
        waiting.set(s, left);
        if (left === 0) {
          next.push(s);
        }
      }
    }
    frontier = next;
    depth++;
  }

  const layers = Math.max(0, ...layer.values()) + (nodes.length ? 1 : 0);
  const columns: string[][] = Array.from({ length: layers }, () => []);
  for (const n of nodes) {
    columns[layer.get(n)!]!.push(n);
  }

  // Rows: barycenter of the neighbours in the layer before (then after).
  const rowOf = new Map<string, number>();
  const number = () =>
    columns.forEach((c) => c.forEach((n, i) => rowOf.set(n, i)));
  number();
  const order = (c: string[], neighbours: Map<string, string[]>) => {
    const key = new Map(
      c.map((n, i) => {
        const ns = neighbours.get(n)!.filter((m) => rowOf.has(m));
        return [
          n,
          ns.length
            ? ns.reduce((sum, m) => sum + rowOf.get(m)!, 0) / ns.length
            : i,
        ];
      }),
    );
    c.sort((a, b) => key.get(a)! - key.get(b)!);
    c.forEach((n, i) => rowOf.set(n, i));
  };
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      for (let i = 1; i < columns.length; i++) {
        order(columns[i]!, preds);
      }
    } else {
      for (let i = columns.length - 2; i >= 0; i--) {
        order(columns[i]!, succs);
      }
    }
  }

  const place = new Map(
    nodes.map((n) => [n, { layer: layer.get(n)!, row: rowOf.get(n)! }]),
  );
  return {
    place,
    layers,
    rows: Math.max(0, ...columns.map((c) => c.length)),
  };
}
