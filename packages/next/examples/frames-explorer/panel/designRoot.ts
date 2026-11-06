// Where the panel's portals go (Task 4c item 4): inside StrataKit's root, so
// its tokens, colour scheme and type apply to what is portalled (the tree's
// Expand dialog, its edge tips), not at the body, which sits outside it.

/** The StrataKit root that holds `from`, else `fallback` (the body). */
export function designRoot(
  from: Element | null | undefined,
  fallback: HTMLElement,
): HTMLElement {
  return from?.closest<HTMLElement>(".🥝Root") ?? fallback;
}
