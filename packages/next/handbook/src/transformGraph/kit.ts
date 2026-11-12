/** Small constructors for scene content. */
import { type Edge, type FnDef, type Mat, type V2 } from "./graph.ts";
import type { Item, Tone } from "./model.ts";

export const aff = (label: string, m: Mat): Edge => ({
  kind: "affine",
  label,
  m,
});
export const fnEdge = (label: string, fn: FnDef): Edge => ({
  kind: "fn",
  label,
  fn,
});

type Extra = Partial<Omit<Item, "id" | "label" | "node" | "kind" | "paths">>;

export function line(
  id: string,
  label: string,
  node: string,
  paths: V2[][],
  tone: Tone,
  extra: Extra = {},
): Item {
  return { id, label, node, kind: "line", paths, tone, ...extra };
}

export function area(
  id: string,
  label: string,
  node: string,
  paths: V2[][],
  tone: Tone,
  extra: Extra = {},
): Item {
  return { id, label, node, kind: "area", paths, tone, ...extra };
}

export function point(
  id: string,
  label: string,
  node: string,
  p: V2,
  tone: Tone,
  extra: Extra = {},
): Item {
  return { id, label, node, kind: "point", paths: [[p]], tone, ...extra };
}

export function text(
  id: string,
  node: string,
  p: V2,
  s: string,
  extra: Extra = {},
): Item {
  return {
    id,
    label: s,
    node,
    kind: "text",
    paths: [[p]],
    tone: "muted",
    text: s,
    ...extra,
  };
}

export function circle(cx: number, cy: number, r: number, n = 48): V2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as V2;
  });
}

export function rect(x0: number, y0: number, x1: number, y1: number): V2[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

export const range = (a: number, b: number, n: number): number[] =>
  Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
