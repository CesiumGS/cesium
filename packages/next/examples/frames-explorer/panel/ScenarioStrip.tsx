// The scenario picker (the owner, fix 1: "scenarios should probably just be
// a dropdown, that horizontal scroll is annoying"). StrataKit's select
// (MUI's Select as @stratakit/mui themes it): a full-width "Scenario" field
// showing the current scenario's title; its list gives each scenario's
// title with its question as a quieter second line, the current one in the
// design system's selected state, scrolling vertically if it must. The
// component gives it its keyboard use and its accessible name.
import {
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
} from "@mui/material";
import { useId } from "react";
import type { ScenarioId } from "../scenarios/spec.ts";
import type { ScenarioPanelView } from "./model.ts";

export function ScenarioStrip({
  scenario,
  onSelect,
}: {
  scenario: ScenarioPanelView;
  onSelect: (id: ScenarioId) => void;
}) {
  const id = useId();
  return (
    <FormControl size="small" fullWidth className="fx-scenario-picker">
      <InputLabel id={`${id}-label`}>Scenario</InputLabel>
      <Select
        labelId={`${id}-label`}
        label="Scenario"
        value={scenario.id}
        renderValue={() => scenario.title}
        onChange={(e) => {
          const next = e.target.value as ScenarioId;
          if (next !== scenario.id) {
            onSelect(next);
          }
        }}
        MenuProps={{ slotProps: { paper: { className: "fx-scenario-menu" } } }}
      >
        {scenario.strip.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            <ListItemText primary={s.title} secondary={s.question} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
