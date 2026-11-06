// The scenario's knobs (spec goal 6: knobs, not an editor): three or four at
// most, on the frames it added, and its time. A marker says whether the
// setting is the checked setup, where the published references apply, or
// what moved off it; "Back to the checked setup" returns there (goal 8).
// Each range knob's checked value is marked on its track.
import {
  Button,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgPause } from "@stratakit/icons/pause";
import { svgPlay } from "@stratakit/icons/play";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { svgUndo } from "@stratakit/icons/undo";
import { Icon } from "@stratakit/mui";
import { useId } from "react";
import type { KnobSpec, KnobValue } from "../scenarios/spec.ts";
import type { ScenarioPanelView } from "./model.ts";

/** "3,600×", "−45.5°", "25 m". */
export function knobText(knob: KnobSpec, value: KnobValue): string {
  if (knob.kind === "choice") {
    return knob.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  const n = Number(value);
  const digits = (knob.step ?? 1) < 1 ? 1 : 0;
  const text = n
    .toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
    .replace("-", "−");
  return knob.unit === "×" || knob.unit === "°"
    ? `${text}${knob.unit}`
    : knob.unit
      ? `${text} ${knob.unit}`
      : text;
}

/** A range spanning three decades or more moves on a log scale (the clock's rate). */
const logScale = (k: KnobSpec) =>
  (k.min ?? 0) > 0 && (k.max ?? 0) / (k.min ?? 1) >= 1000;

/** "“Site latitude” and the time": what moved, in words. */
export function movedText(
  changed: readonly string[],
  knobs: readonly KnobSpec[],
): string {
  const names = changed.map((c) =>
    c === "time"
      ? "the time"
      : `“${knobs.find((k) => k.id === c)?.label ?? c}”`,
  );
  return names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const utcText = (iso: string) =>
  iso.replace("T", " ").replace(/(\.\d+)?Z$/, " UTC");

function RangeKnob({
  knob,
  value,
  checked,
  onChange,
}: {
  knob: KnobSpec;
  value: number;
  checked: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const log = logScale(knob);
  const to = (v: number) => (log ? Math.log10(v) : v);
  const from = (t: number) => {
    const v = log ? 10 ** t : t;
    const step = knob.step ?? 1;
    return Math.round(v / step) * step;
  };
  return (
    <div className="fx-knob">
      <div className="fx-knob-head">
        <span id={id} className="fx-knob-label">
          {knob.label}
        </span>
        <span className="fx-knob-value fx-num">{knobText(knob, value)}</span>
      </div>
      <Slider
        size="small"
        min={to(knob.min ?? 0)}
        max={to(knob.max ?? 1)}
        step={log ? 0.01 : (knob.step ?? 1)}
        value={to(value)}
        marks={[{ value: to(checked), label: "checked" }]}
        aria-labelledby={id}
        getAriaValueText={(t) => knobText(knob, from(t))}
        onChange={(_, t) => onChange(from(t as number))}
      />
    </div>
  );
}

function ChoiceKnob({
  knob,
  value,
  checked,
  onChange,
}: {
  knob: KnobSpec;
  value: string;
  checked: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const options = knob.options ?? [];
  // A short value names its option on the button; the full label says what it is.
  const short = (v: string) => v;
  return (
    <div className="fx-knob">
      <span id={id} className="fx-knob-label">
        {knob.label}
      </span>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        aria-labelledby={id}
        className="fx-knob-choice"
        onChange={(_, v: string | null) => v !== null && onChange(v)}
      >
        {options.map((o) => (
          <ToggleButton
            key={o.value}
            value={o.value}
            title={o.label}
            render={<Button variant="outlined" />}
          >
            {short(o.value)}
            {o.value === checked && (
              <span className="fx-visually-hidden"> (checked setup)</span>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography
        variant="caption-lg"
        color="textSecondary"
        render={<p />}
        className="fx-knob-help"
      >
        {options.find((o) => o.value === value)?.label}
        {value === checked ? "" : `; checked in ${short(checked)}`}
      </Typography>
    </div>
  );
}

export function Knobs({
  scenario,
  onKnob,
  onBack,
  onPlay,
}: {
  scenario: ScenarioPanelView;
  onKnob: (id: string, value: KnobValue) => void;
  onBack: () => void;
  onPlay: (on: boolean) => void;
}) {
  const s = scenario;
  const timeMoved = s.changed.includes("time");
  const eop = s.eop;
  return (
    <div className="fx-knobs">
      <div
        className={`fx-checked-marker${s.atChecked ? "" : " fx-off-checked"}`}
        role="status"
      >
        {s.atChecked ? (
          <>
            <Icon href={svgStatusSuccess} aria-hidden />
            <span>
              <span className="fx-strong">At the checked setup.</span> The
              published references apply here.
            </span>
          </>
        ) : (
          <>
            <span className="fx-marker-dot" aria-hidden />
            <span>
              <span className="fx-strong">Off the checked setup:</span>{" "}
              {movedText(s.changed, s.knobs)}{" "}
              {s.changed.length === 1 ? "differs" : "differ"} from it. The proof
              re-runs here.
            </span>
          </>
        )}
        <Button
          size="small"
          variant="outlined"
          startIcon={<Icon href={svgUndo} />}
          disabled={s.atChecked}
          onClick={onBack}
          className="fx-back-button"
        >
          Back to the checked setup
        </Button>
      </div>
      {s.knobs.map((k) =>
        k.kind === "range" ? (
          <RangeKnob
            key={k.id}
            knob={k}
            value={Number(s.values[k.id])}
            checked={Number(s.checked[k.id])}
            onChange={(v) => onKnob(k.id, v)}
          />
        ) : (
          <ChoiceKnob
            key={k.id}
            knob={k}
            value={String(s.values[k.id])}
            checked={String(s.checked[k.id])}
            onChange={(v) => onKnob(k.id, v)}
          />
        ),
      )}
      <div className="fx-knob fx-knob-time">
        <div className="fx-knob-head">
          <span className="fx-knob-label">Time</span>
          <span className="fx-knob-value fx-num">{utcText(s.epochUtc)}</span>
        </div>
        <div className="fx-time-row">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Icon href={s.playing ? svgPause : svgPlay} />}
            onClick={() => onPlay(!s.playing)}
          >
            {s.playing
              ? "Pause"
              : `Play${s.rate !== 1 ? ` at ${s.rate.toLocaleString("en-US")}×` : ""}`}
          </Button>
          <Typography variant="caption-lg" color="textSecondary" render={<p />}>
            {timeMoved
              ? `Checked at ${utcText(s.checkedEpochUtc)}. `
              : "The checked setup's time. "}
            Also set with the time controls over the globe.
          </Typography>
        </div>
        {eop && eop.kind !== "measured" && (
          <Typography
            variant="caption-lg"
            render={<p />}
            className="fx-unbounded"
          >
            Earth orientation{" "}
            {eop.kind === "predicted"
              ? `predicted, ${eop.ageDays.toFixed(1)} days past the last measured row (IERS Bulletin A)`
              : `outside the table (${eop.span})`}
          </Typography>
        )}
      </div>
    </div>
  );
}
