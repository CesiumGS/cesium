// The scenario's knobs (spec goal 6: knobs, not an editor): three or four at
// most, on the frames it added, and its time. Task 6c moved them up, under
// the question (owner: "the knobs are hard to find"), in the approved
// mockup's shape: a head with "Knobs" and the checked-setup chip, which says
// whether the setting is the checked setup, where the references apply;
// one labelled row per knob; then, where the scenario has moments, "Jump
// to": its moments ("Behind the Moon") as buttons, and "Back to the checked
// setup" (goal 8); without moments, Back sits in the head beside the chip
// (fix 1). Off the checked setup a line under the head says what moved. Each range knob's
// checked value is marked on its track.
import {
  Button,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgMinimize } from "@stratakit/icons/minimize";
import { svgMoon } from "@stratakit/icons/moon";
import { svgPathExtend } from "@stratakit/icons/path-extend";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { svgTimeline } from "@stratakit/icons/timeline";
import { svgUndo } from "@stratakit/icons/undo";
import { Icon } from "@stratakit/mui";
import { memo, useId } from "react";
import type { Moment } from "../scenarios/evaluate.ts";
import type { KnobSpec, KnobValue } from "../scenarios/spec.ts";
import { knobText, movedText, snapToStep } from "./knobText.ts";
import { useLiveTime } from "./liveTime.ts";
import { equalOn } from "./memo.ts";
import type { ScenarioPanelView } from "./model.ts";

/** A range spanning three decades or more moves on a log scale (the clock's rate). */
const logScale = (k: KnobSpec) =>
  (k.min ?? 0) > 0 && (k.max ?? 0) / (k.min ?? 1) >= 1000;

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
    return snapToStep(v, knob.step ?? 1);
  };
  return (
    <div className="fx-knob">
      <span id={id} className="fx-knob-label">
        {knob.label}
      </span>
      <div className="fx-knob-control fx-knob-range">
        <Slider
          size="small"
          min={to(knob.min ?? 0)}
          max={to(knob.max ?? 1)}
          step={log ? 0.01 : (knob.step ?? 1)}
          value={to(value)}
          // The checked value's tick; the chip above says it in words.
          marks={[{ value: to(checked) }]}
          aria-labelledby={id}
          getAriaValueText={(t) => knobText(knob, from(t))}
          onChange={(_, t) => onChange(from(t as number))}
        />
        <span className="fx-knob-value fx-num">{knobText(knob, value)}</span>
      </div>
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
  return (
    <div className="fx-knob">
      <span id={id} className="fx-knob-label">
        {knob.label}
      </span>
      <div className="fx-knob-control">
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
              {o.short ?? o.value}
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
          {value === checked
            ? ""
            : `; checked in ${options.find((o) => o.value === checked)?.short ?? checked}`}
        </Typography>
      </div>
    </div>
  );
}

/** What `movedText` reads, field by field (a spread would read every field). */
const movedFrom = (s: ScenarioPanelView, epochUtc: string) => ({
  changed: s.changed,
  knobs: s.knobs,
  values: s.values,
  checked: s.checked,
  checkedEpochUtc: s.checkedEpochUtc,
  epochUtc,
});

/** What moved off the checked setup, the time as it is now (it moves while the clock plays). */
function MovedWithTime({ s }: { s: ScenarioPanelView }) {
  const { epochUtc } = useLiveTime();
  return <>{movedText(movedFrom(s, epochUtc ?? s.checkedEpochUtc))}</>;
}

/** The scenario fields the knobs read: the only ones they render again for (Task 4d). */
export const KNOBS_READS = [
  "atChecked",
  "checkedBy",
  "changed",
  "knobs",
  "values",
  "checked",
  "checkedEpochUtc",
  "eop",
  "presets",
] as const;

export const Knobs = memo(KnobsView, equalOn("scenario", KNOBS_READS));

/** A moment's icon, as its evaluator declares it (Task 6c fix 1). */
const MOMENT_ICON = {
  moon: svgMoon,
  timeline: svgTimeline,
  extend: svgPathExtend,
  stow: svgMinimize,
} as const;

function KnobsView({
  scenario,
  headingId,
  onKnob,
  onBack,
  onMoment,
}: {
  scenario: ScenarioPanelView;
  /** The section's heading id (its `aria-labelledby`). */
  headingId: string;
  onKnob: (id: string, value: KnobValue) => void;
  onBack: () => void;
  /** Takes the clock to one of the scenario's moments, paused, or sets its knobs. */
  onMoment: (moment: Moment) => void;
}) {
  const s = scenario;
  const timeMoved = s.changed.includes("time");
  const eop = s.eop;
  const jumpId = useId();
  const moments = s.presets && s.presets.length > 0 ? s.presets : undefined;
  const back = (
    <Button
      size="small"
      variant="text"
      startIcon={<Icon href={svgUndo} />}
      disabled={s.atChecked}
      onClick={onBack}
      className="fx-back-button"
    >
      Back to the checked setup
    </Button>
  );
  return (
    <div className="fx-knobs">
      <div className="fx-section-head fx-knobs-head">
        <Typography variant="subtitle-md" render={<h2 id={headingId} />}>
          Knobs
        </Typography>
        <span
          className={`fx-checked-chip${s.atChecked ? "" : " fx-off-checked-chip"}`}
          role="status"
          title={
            s.atChecked
              ? `The ${s.checkedBy} apply here`
              : `The ${s.checkedBy} apply at the checked setup`
          }
        >
          {s.atChecked ? (
            <Icon href={svgStatusSuccess} aria-hidden />
          ) : (
            <span className="fx-marker-dot" aria-hidden />
          )}
          {s.atChecked ? "At the checked setup" : "Off the checked setup"}
        </span>
        {/* Without moments, Back sits by the chip (Task 6c fix 1). */}
        {!moments && back}
      </div>
      {!s.atChecked && (
        <Typography
          variant="caption-lg"
          color="textSecondary"
          render={<p />}
          className="fx-moved"
        >
          {timeMoved ? (
            <MovedWithTime s={s} />
          ) : (
            movedText(movedFrom(s, s.checkedEpochUtc))
          )}
          . The checks re-run here.
        </Typography>
      )}
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
      {/* The time is set on the timeline under the globe (the owner,
          2026-11-06); the line above names it when it moved, and Back
          restores it. The scenario's moments jump it (Task 6c). */}
      {moments && (
        <div className="fx-knob fx-jump" role="group" aria-labelledby={jumpId}>
          <span id={jumpId} className="fx-knob-label">
            Jump to
          </span>
          <div className="fx-knob-control fx-jump-buttons">
            {moments.map((p) => (
              <Button
                key={p.id}
                size="small"
                variant="outlined"
                startIcon={<Icon href={MOMENT_ICON[p.icon ?? "timeline"]} />}
                onClick={() => onMoment(p)}
                title={
                  p.utcMs !== undefined
                    ? `Takes the clock to ${new Date(p.utcMs).toISOString().slice(11, 19)} UTC, paused${p.title ? `: ${p.title}` : ""}`
                    : (p.title ?? `Sets the knobs to ${p.label}`)
                }
              >
                {p.label}
              </Button>
            ))}
            {back}
          </div>
        </div>
      )}
      {/* Its Earth-orientation caution stays here (R8). */}
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
  );
}
