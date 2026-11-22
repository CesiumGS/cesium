/**
 * The chooser behind the Path view's search (CS-746). This file held the
 * Dependencies view's model (CS-694) until CS-775 retired that view into
 * Path; only the chooser stayed, since Path still searches with it.
 */

import { idNumber, isOpen, type WorkSnapshot } from "./work.ts";

const byNumber = (a: { id: string }, b: { id: string }) =>
  idNumber(a.id) - idNumber(b.id);

/**
 * Milestones and items whose ID or title holds every word typed, the
 * milestones first: the chooser's matches.
 */
export function matchFocus(
  s: WorkSnapshot,
  q: string,
  limit = 12,
): Array<{ id: string; title: string; kind: "milestone" | "item" }> {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }
  const hit = (id: string, title: string) => {
    const hay = `${id} ${title}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  };
  const ms = s.milestones
    .filter((m) => m.state !== "dropped" && hit(m.id, m.title))
    .sort(byNumber)
    .map((m) => ({ id: m.id, title: m.title, kind: "milestone" as const }));
  const its = s.items
    .filter((it) => it.state !== "dropped" && hit(it.id, it.title))
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || byNumber(a, b))
    .map((it) => ({ id: it.id, title: it.title, kind: "item" as const }));
  return [...ms, ...its].slice(0, limit);
}
