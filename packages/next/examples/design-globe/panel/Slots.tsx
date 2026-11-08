// "Your own models" (DESIGN.md "Layout" 6; plan 4b Task 20): the two ion
// slots, drawn empty, each saying what an application must supply before
// its model can be placed as the sites above are. Nothing here loads.
import { Badge, Typography } from "@mui/material";
import { useId } from "react";
import { ION_SLOTS, SLOT_CODE } from "../slots.ts";

export function Slots() {
  const id = useId();
  return (
    <section className="dg-section" aria-labelledby={`${id}-h`}>
      <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
        Your own models
      </Typography>
      <p className="dg-muted dg-slots-lead">
        Cesium ion keeps no CRS for a model, so the app supplies four things
        before it can be placed as the sites above are.
      </p>
      <ul className="dg-slots">
        {ION_SLOTS.map((slot) => (
          <li
            key={slot.id}
            className="dg-slot"
            aria-labelledby={`${id}-${slot.id}`}
          >
            <div className="dg-slot-head">
              <span id={`${id}-${slot.id}`} className="dg-strong">
                {slot.name}
              </span>
              <Badge
                variant="inline"
                size="small"
                color="secondary"
                badgeContent="Empty"
              />
            </div>
            <span className="dg-muted dg-slot-source">
              {slot.source}. {slot.empty}
            </span>
            <dl className="dg-slot-needs">
              {slot.needs.map((n) => (
                <div key={n.what}>
                  <dt>{n.what}</dt>
                  <dd>{n.detail}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <p className="dg-muted dg-slots-lead">Then the app places it:</p>
      <code className="dg-code-block">{SLOT_CODE}</code>
    </section>
  );
}
