// The globe's labels and the panels over the view (Task 4c items 3 and 4):
// the HUD's own (the legend, the callout, the frame chip, the inset) and the
// viewer's (the time controls and their popover, the credits, the
// inspector). Labels sit under them (Hud.css), a label that would sit under
// one is hidden, and a pinned one (Orion's marker) moves its text clear of
// them, its dot left on its point (globe.ts `placeLabels`).

/** A box in the label host's pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The panels over the view, by class: the HUD's and the viewer's widgets'. */
export const PANELS =
  ".fx-hud, .fx-inset, .cesium-time > *, .cesium-credits > *, .cesium-inspector > *";

export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The boxes of the panels shown in `container`, in `host`'s pixels (hidden ones have no size). */
export function panelBoxes(container: ParentNode, host: Element): Box[] {
  const origin = host.getBoundingClientRect();
  const out: Box[] = [];
  for (const el of container.querySelectorAll(PANELS)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      out.push({
        x: r.left - origin.left,
        y: r.top - origin.top,
        w: r.width,
        h: r.height,
      });
    }
  }
  return out;
}

/** Pixels between a label and its point, or a panel's edge. */
const GAP = 12;
const MARGIN = 2;

/**
 * `box` (a pinned label's text beside `point`) moved to the nearest place
 * that no panel covers and that stays inside the view: just past the
 * panels it would sit under, below or above, on its side of the point or
 * the other. A box no panel touches, or with nowhere clear to go, stays.
 */
export function clearOfPanels(
  box: Box,
  point: { x: number; y: number },
  panels: readonly Box[],
  view: { w: number; h: number },
): Box {
  const hit = panels.filter((p) => overlaps(box, p));
  if (hit.length === 0) {
    return box;
  }
  const other = box.x >= point.x ? point.x - GAP - box.w : point.x + GAP;
  const below = Math.max(...hit.map((p) => p.y + p.h)) + MARGIN;
  const above = Math.min(...hit.map((p) => p.y)) - box.h - MARGIN;
  let best: Box | undefined;
  let cost = Infinity;
  for (const x of [box.x, other]) {
    for (const y of [box.y, below, above]) {
      const c: Box = { x, y, w: box.w, h: box.h };
      const inside =
        x >= MARGIN &&
        y >= MARGIN &&
        x + box.w <= view.w - MARGIN &&
        y + box.h <= view.h - MARGIN;
      const d = Math.abs(x - box.x) + Math.abs(y - box.y);
      if (inside && d < cost && !panels.some((p) => overlaps(c, p))) {
        best = c;
        cost = d;
      }
    }
  }
  return best ?? box;
}
