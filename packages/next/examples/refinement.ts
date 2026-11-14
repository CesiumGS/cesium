// Refinement, not a gate: what a view says while its content keeps getting
// better. Tiles stream in coarse to fine, and the view is live from the first
// thing it draws, so the page does not hold the view back, or say it is
// loading, for what is only refining.
//
// Two things are shown, in this order:
//   - a card, only until something first draws (it names what that waits for);
//   - then a small chip, fixed in size, that counts what is still refining:
//     "Refining · 12 tiles, 3 fits". It comes and goes with the work and
//     blocks nothing.
//
// The shape matches what the engine plans for a view: a set of refinement
// sources, each a count of work still to do, and `converged()` for when all
// are zero (docs/design/investigations-2026-11-13.md, renderer decisions, item 7). When the engine has
// them, `Source.count` reads `view.refinement`; nothing else here changes.

/** One kind of work that is still refining, as a count of what is left. */
export interface RefinementSource {
  /** What one of them is called ("tile") and several ("tiles"). */
  readonly one: string;
  readonly many: string;
  /** What is left now: tiles in flight or waiting, fits pending. */
  count(): number;
}

/** What `createRefinement` is given at each check. */
export interface RefinementInput {
  /** Whether anything has drawn yet. It latches: once true, the card never returns. */
  readonly drawn: boolean;
  /** What the first draw waits for, in words, for the card. */
  readonly waitingFor?: string;
  /** The work left, by source. */
  readonly sources: readonly RefinementSource[];
}

/** What to show after a check. */
export interface RefinementView {
  /** The card's words until something draws; undefined after. */
  readonly card: string | undefined;
  /** The chip's words while something is still refining; undefined when nothing is. */
  readonly chip: string | undefined;
  /** The first thing has drawn and no source has work left (the engine's `view.converged()`). */
  readonly converged: boolean;
}

/** "Refining · 12 tiles, 3 fits", or undefined when no source has work left. */
export function refinementText(
  sources: readonly RefinementSource[],
): string | undefined {
  const parts: string[] = [];
  for (const source of sources) {
    const n = Math.max(0, Math.round(source.count()));
    if (n > 0) {
      parts.push(
        `${n.toLocaleString("en-US")} ${n === 1 ? source.one : source.many}`,
      );
    }
  }
  return parts.length > 0 ? `Refining · ${parts.join(", ")}` : undefined;
}

/**
 * The card and chip over time. The card goes for good at the first draw (or
 * when `cardTimeout` checks have passed with nothing drawn: a scene with
 * nothing near the camera is not held up for it). The chip is shown while any
 * source has work left, and held `hold` more checks after the last, so that a
 * count that bounces through zero does not make it flicker.
 */
export function createRefinement(
  options: {
    hold?: number;
    cardTimeout?: number;
  } = {},
): {
  update(input: RefinementInput): RefinementView;
} {
  const hold = options.hold ?? 3;
  const cardTimeout = options.cardTimeout ?? Infinity;
  let drawn = false;
  let checks = 0;
  let quiet = Infinity;
  let last: string | undefined;
  return {
    update(input) {
      checks++;
      drawn ||= input.drawn;
      const text = refinementText(input.sources);
      if (text !== undefined) {
        quiet = 0;
        last = text;
      } else {
        quiet++;
      }
      const cardGone = drawn || checks > cardTimeout;
      const card = cardGone
        ? undefined
        : (input.waitingFor ?? "Waiting for the first tiles…");
      // Before the first draw the card says what is happening; the chip adds nothing.
      const chip = cardGone && quiet <= hold ? (text ?? last) : undefined;
      return { card, chip, converged: drawn && quiet > hold };
    },
  };
}

/**
 * The chip: fixed in size (a width in `ch`, ellipsis past it) so its coming
 * and going moves nothing, `aria-live` polite and never focusable. Its class
 * is the page's, which places it over the view.
 */
export function createRefinementChip(className: string): {
  readonly element: HTMLElement;
  show(text: string | undefined): void;
} {
  const element = document.createElement("div");
  element.className = className;
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  const ring = document.createElement("span");
  ring.setAttribute("aria-hidden", "true");
  ring.className = `${className}-ring`;
  const label = document.createElement("span");
  label.className = `${className}-label`;
  element.append(ring, label);
  element.hidden = true;
  return {
    element,
    show(text) {
      // Absolutely placed over the view, so showing or hiding it moves nothing.
      element.hidden = text === undefined;
      if (text !== undefined && label.textContent !== text) {
        label.textContent = text;
      }
    },
  };
}
