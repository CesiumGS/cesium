// The globe's HUD (R14, R17): the legend at the bottom right, listing every
// overlay that is drawn with its accuracy (R8: accuracy is never shown only
// in the panel), and the scenario's answer at the top right. Both are rendered from the panel's React tree into the
// viewer's container (main.ts makes the host), clear of Dyno's inspector
// (top left) and credits (bottom left). The HUD is dark in either scheme, as
// the viewer's own widgets are (I16): Hud.css points its StrataKit tokens
// at the viewer's HUD theme.
import {
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronUp } from "@stratakit/icons/chevron-up";
import { svgReCenter } from "@stratakit/icons/re-center";
import { Icon } from "@stratakit/mui";
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { isFrameKey } from "../orbit.ts";
import { captionFold, foldReducer } from "./fold.ts";
import { legendRows } from "./legendRows.ts";
import { accuracyLine, accuracyWarns, answerTitle } from "./answerText.ts";
import type { PanelModel, ScenarioPanelView } from "./model.ts";

/** Below this view width the HUD goes compact: legend folded, the caption at the bottom (I18). */
export { NARROW_VIEW } from "../content.ts";

/**
 * Keeps the HUD clear of the viewer's time controls (bottom centre, one or
 * two rows as the view's width allows): `--fx-hud-bottom` on the host is the
 * room they take, so the legend sits above them. Returns the view's width.
 */
export function useHudLayout(host: HTMLElement): number {
  const [width, setWidth] = useState(() => host.clientWidth);
  useLayoutEffect(() => {
    const view = host.parentElement;
    if (!view) {
      return;
    }
    const measure = () => {
      const time = view.querySelector<HTMLElement>(".cesium-time");
      const bottom = view.getBoundingClientRect().bottom;
      const top = time?.getBoundingClientRect().top;
      host.style.setProperty(
        "--fx-hud-bottom",
        `${top === undefined ? 12 : Math.max(12, bottom - top + 12)}px`,
      );
      setWidth(view.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    const time = view.querySelector(".cesium-time");
    if (time) {
      observer.observe(time);
    }
    return () => observer.disconnect();
  }, [host]);
  return width;
}

/**
 * The legend (I17): compact by default, one line per drawn overlay (its
 * swatch, name and accuracy, ellipsized, the full line on hover and focus);
 * unfolded, the full lines and the triads' note.
 */
export function GlobeLegend({ model }: { model: PanelModel }) {
  const [open, setOpen] = useState(false);
  const drawn = model.overlays.filter((o) => o.on && o.state === "drawn");
  if (drawn.length === 0) {
    return null;
  }
  return (
    <section
      className={`fx-hud fx-legend${open ? " fx-legend-open" : ""}`}
      aria-label="Legend"
    >
      <div className="fx-legend-head">
        <Typography variant="subtitle-sm" render={<h2 />} className="fx-strong">
          On the globe
        </Typography>
        <IconButton
          size="small"
          aria-expanded={open}
          aria-label={open ? "Fold the legend" : "Unfold the legend"}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon href={open ? svgChevronDown : svgChevronUp} />
        </IconButton>
      </div>
      <ul className="fx-legend-list">
        {legendRows(drawn).map((row) => (
          <li
            key={row.key}
            tabIndex={open ? undefined : 0}
            title={`${row.label}: ${row.accuracy}`}
          >
            {row.line === "axes" ? (
              <span className="fx-axes" aria-hidden>
                <span className="fx-axis-x" />
                <span className="fx-axis-y" />
                <span className="fx-axis-z" />
              </span>
            ) : (
              <span
                className={`fx-line-key fx-line-${row.line} ${row.tone === "white" ? "fx-line-white" : `fx-family-${row.family}`}`}
                aria-hidden
              />
            )}
            <span className="fx-legend-text">
              <span className="fx-legend-name">
                {open ? row.label : row.name}
              </span>
              <span
                className={`fx-legend-acc${row.attention ? " fx-unbounded" : ""}`}
              >
                {row.accuracy}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {open && drawn.some((o) => o.id === "triads") && (
        <p className="fx-legend-note">
          Axes x <span className="fx-axis-word fx-axis-word-x">red</span>, y{" "}
          <span className="fx-axis-word fx-axis-word-y">green</span>, z{" "}
          <span className="fx-axis-word fx-axis-word-z">blue</span>;{" "}
          {model.triadScale}.
        </p>
      )}
    </section>
  );
}

/**
 * The scenario's answer on the globe (spec "The headline answer"): its
 * question, the answer and its accuracy (R8), top right, clear of Dyno's
 * inspector (top left), the credits (bottom left) and the legend (bottom
 * right). It says "updating" while the knobs' new answer is on its way and
 * says the scenario's limit (the backdrop Moon). On a narrow view it folds
 * to one row, the answer's figure, with a chevron to unfold it (F42).
 */
export function ScenarioCallout({
  scenario,
  narrow,
  onKnob,
}: {
  scenario: ScenarioPanelView;
  narrow: boolean;
  onKnob: (id: string, value: string) => void;
}) {
  const control = scenario.treeControl;
  const drawnIn = control ? String(scenario.values[control.knob]) : undefined;
  const drawnLabel = control?.options.find((o) => o.value === drawnIn)?.label;
  const [state, dispatch] = useReducer(foldReducer, { unfolded: false });
  const fold = captionFold(narrow, state.unfolded);
  const a = scenario.answer;
  const loading =
    scenario.freshness === "updating" ||
    (!scenario.answer && scenario.status === "loading");
  // The same headline as the panel's (answerTitle): a figure and its words.
  const figure = a ? answerTitle(a) : undefined;
  return (
    <section
      className={`fx-hud fx-callout${fold.folded ? " fx-callout-folded" : ""}`}
      aria-label="The scenario's answer"
      aria-busy={loading}
    >
      <div className="fx-callout-row">
        <p className="fx-callout-question fx-hud-muted">
          {scenario.title}
          {loading && (
            <span className="fx-callout-updating">
              {" "}
              · {a ? "updating" : "computing"}
            </span>
          )}
        </p>
        {fold.toggle && (
          <IconButton
            size="small"
            aria-expanded={fold.toggle.expanded}
            aria-label={
              fold.toggle.expanded ? "Fold the answer" : "Unfold the answer"
            }
            onClick={() => dispatch({ type: "toggle" })}
          >
            <Icon href={fold.toggle.expanded ? svgChevronUp : svgChevronDown} />
          </IconButton>
        )}
      </div>
      {control && drawnIn !== undefined && (
        // The frame the path is drawn in, said and chosen where the eye is
        // (owner, fix 1): the same choice as the tree and the knob.
        <div className="fx-callout-frame">
          <p className="fx-callout-drawn">
            Orion&rsquo;s path, drawn in {drawnLabel ?? drawnIn}
          </p>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={drawnIn}
            aria-label={control.verb}
            onChange={(_, v: string | null) => v && onKnob(control.knob, v)}
          >
            {control.options.map((o) => (
              <ToggleButton
                key={o.value}
                value={o.value}
                title={`${control.verb} ${o.label}`}
                render={<Button variant="outlined" />}
              >
                {o.value}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      )}
      {scenario.status === "error" && scenario.problem ? (
        <p className="fx-callout-problem">
          {scenario.problem.missing
            ? "Its data isn't in the frames store: run npm run setup in packages/next, then reload."
            : `It didn't answer: ${scenario.problem.message}`}
        </p>
      ) : a ? (
        <>
          {figure === undefined && fold.folded && (
            // No figure (no Orion data now): the sentence says why, even folded.
            <p className="fx-callout-answer">{a.headline}</p>
          )}
          {figure !== undefined && (
            <p className={`fx-callout-figure${loading ? " fx-stale" : ""}`}>
              {figure}
            </p>
          )}
          {a.aside && !fold.bodyHidden && (
            <p className="fx-callout-aside fx-num">{a.aside}</p>
          )}
          {!fold.bodyHidden && (
            <>
              {figure === undefined && (
                // No figure (no data now): the sentence says why.
                <p className="fx-callout-answer">{a.headline}</p>
              )}
              {/* A glance: the paragraph is the panel's (fix 2: the callout
                  grew over the legend on a shorter view). */}
              <p
                className={`fx-callout-acc${accuracyWarns(a) ? " fx-unbounded" : ""}`}
                title={accuracyLine(a)}
              >
                {accuracyLine(a)}
              </p>
              {scenario.note && (
                <p className="fx-callout-note fx-hud-muted">{scenario.note}</p>
              )}
            </>
          )}
        </>
      ) : (
        <p className="fx-callout-answer fx-hud-muted" role="status">
          {scenario.queued ?? "Working out the answer…"}
        </p>
      )}
    </section>
  );
}

/**
 * Frame content (owner: stuck out in space): re-flies the selected frame or
 * result, else the scenario's view, else the opening view.
 * The StrataKit re-center icon, as Dyno's Viewer page uses; the F key does
 * the same anywhere on the page but in a text field. Top left under Dyno's
 * inspector, clear of the credits (bottom left), the answer (top right),
 * the legend (bottom right) and the rigid line's inset (bottom left, or top
 * right on a narrow view).
 */
export function FrameButton({ onFrame }: { onFrame: () => void }) {
  const latest = useRef(onFrame);
  latest.current = onFrame;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        isFrameKey({
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          target: e.target instanceof Element ? e.target : null,
        })
      ) {
        e.preventDefault();
        latest.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="fx-hud fx-frame">
      <IconButton
        size="small"
        aria-label="Frame content"
        aria-keyshortcuts="F"
        title="Frame content (F)"
        onClick={onFrame}
      >
        <Icon href={svgReCenter} />
      </IconButton>
    </div>
  );
}
