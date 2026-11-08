// The short tour's card over the globe (DESIGN.md "A short tour"; plan 4b
// Task 20): where the tour is (six segments and "Step 3 of 6"), the step's
// title, its one sentence, the ladder's stops on that step, and Back, Next
// and "Explore on your own", always there. Leaving keeps everything.
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgArrowLeft } from "@stratakit/icons/arrow-left";
import { svgArrowRight } from "@stratakit/icons/arrow-right";
import { Icon } from "@stratakit/mui";
import { useId, useRef } from "react";
import { TOUR_STEPS, type TourCardView } from "../tour.ts";
import type { PanelActions } from "./model.ts";

export function TourCard({
  card,
  actions,
}: {
  card: TourCardView;
  actions: PanelActions;
}) {
  const id = useId();
  const leave = useRef<HTMLButtonElement>(null);
  return (
    <section className="dg-hud dg-tour" aria-labelledby={`${id}-t`}>
      <div className="dg-tour-head">
        {/* The steps, each one a way to it (UX review P6): for the pointer
            and a screen reader's own navigation, out of the Tab order,
            which Back and Next already serve. */}
        <ol className="dg-tour-steps" aria-label="The tour's steps">
          {Array.from({ length: card.count }, (_, i) => (
            <li
              key={i}
              className={
                i < card.index ? "done" : i === card.index ? "now" : undefined
              }
            >
              <button
                type="button"
                tabIndex={-1}
                aria-label={`Step ${i + 1}: ${TOUR_STEPS[i]?.title ?? ""}`}
                aria-current={i === card.index ? "step" : undefined}
                onClick={() => actions.tour({ type: "start", step: i })}
              />
            </li>
          ))}
        </ol>
        <span className="dg-hud-muted dg-num">{card.progress}</span>
      </div>
      <div aria-live="polite" className="dg-tour-say">
        <span className="dg-visually-hidden">{card.progress}.</span>
        <h2 id={`${id}-t`} className="dg-tour-title">
          {card.title}
        </h2>
        <p className="dg-tour-narration">{card.narration}</p>
      </div>
      {card.stops !== undefined && (
        <ToggleButtonGroup
          exclusive
          size="small"
          className="dg-tour-stops"
          aria-label="Stop on the ladder"
          value={card.stops.findIndex((s) => s.selected)}
          onChange={(_, v: number | null) =>
            v !== null && actions.tour({ type: "stop", stop: v })
          }
        >
          {card.stops.map((s, i) => (
            <ToggleButton
              key={s.label}
              value={i}
              render={<Button variant="outlined" />}
            >
              {s.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
      <div className="dg-tour-actions">
        <Button
          size="small"
          variant="outlined"
          disabled={!card.canBack}
          onClick={() => actions.tour({ type: "back" })}
          startIcon={<Icon href={svgArrowLeft} aria-hidden />}
        >
          Back
        </Button>
        <Button
          size="small"
          variant="outlined"
          className={card.canNext ? "dg-tour-primary" : undefined}
          disabled={!card.canNext}
          onClick={() => {
            actions.tour({ type: "next" });
            // Next goes disabled on the last step: its focus moves on to
            // "Explore on your own" rather than being dropped.
            if (card.index === card.count - 2) {
              requestAnimationFrame(() => leave.current?.focus());
            }
          }}
          endIcon={<Icon href={svgArrowRight} aria-hidden />}
        >
          Next
        </Button>
        <Button
          size="small"
          variant={card.canNext ? "text" : "outlined"}
          ref={leave}
          className={`dg-tour-leave${card.canNext ? "" : " dg-tour-primary"}`}
          onClick={() => {
            actions.tour({ type: "leave" });
            // The card goes: focus moves to the panel's way back in, not the page's top.
            focusSoon(".dg-tour-entry");
          }}
        >
          Explore on your own
        </Button>
      </div>
    </section>
  );
}

/** The panel's way back into the tour, when it isn't running. */
export function TourEntry({ actions }: { actions: PanelActions }) {
  return (
    <Typography variant="body-sm" component="span">
      <Button
        size="small"
        variant="outlined"
        className="dg-tour-entry"
        onClick={() => actions.tour({ type: "start" })}
      >
        Take the short tour
      </Button>
    </Typography>
  );
}

/**
 * Focuses the first element matching `selector` once it is in the page
 * (within about 2 s): the panel re-renders a frame or two after an action.
 */
export function focusSoon(selector: string): void {
  let tries = 0;
  const step = () => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el !== null) {
      el.focus();
    } else if (tries++ < 40) {
      setTimeout(step, 50);
    }
  };
  setTimeout(step, 50);
}
