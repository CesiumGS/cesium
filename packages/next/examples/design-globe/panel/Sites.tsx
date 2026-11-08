// The selected site's facts and the scale ladder (DESIGN.md "The sidebar"
// 3 and 5). The facts: "every country, done right": its CRS, heights (with
// the geoid model) and units, always shown; the rest of its frame as PROJ
// resolved it folded under "Frame details". The ladder: one row per site,
// smallest first, the whole row the button that flies there: its name,
// then its extent and rigid's error at its edge.
import { Badge, CircularProgress, Typography } from "@mui/material";
import { svgAirplane } from "@stratakit/icons/airplane";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgStatusWarning } from "@stratakit/icons/status-warning";
import { Icon } from "@stratakit/mui";
import { useId, useState } from "react";
import type { PanelActions, SiteView } from "./model.ts";

/** The selected site's frame: CRS, heights and units, and its details folded. */
export function SiteFacts({ site }: { site: SiteView }) {
  const { frame } = site;
  const [open, setOpen] = useState(false);
  const id = useId();
  if (frame === undefined) {
    return (
      <p className="dg-site-wait dg-muted" role="status">
        <CircularProgress size={10} aria-hidden />
        Resolving {site.name}'s frame through PROJ…
      </p>
    );
  }
  return (
    <section className="dg-section dg-site-facts" aria-labelledby={`${id}-h`}>
      <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
        Its frame
      </Typography>
      <dl className="dg-facts">
        <dt>CRS</dt>
        <dd>
          {frame.horizontal}
          <span className="dg-muted dg-num"> ({site.summary})</span>
        </dd>
        {frame.vertical !== undefined && (
          <>
            <dt>Heights</dt>
            <dd>{frame.vertical}</dd>
          </>
        )}
        <dt>Units</dt>
        <dd>{frame.units}</dd>
      </dl>
      {frame.fallback !== undefined && (
        <p className="dg-fallback">
          <Icon href={svgStatusWarning} aria-hidden />
          {frame.fallback}
        </p>
      )}
      <button
        type="button"
        className="dg-m-disclose"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Icon href={svgChevronDown} aria-hidden className="dg-m-caret" />
        Frame details
      </button>
      {open && (
        <div id={id} className="dg-m-more">
          <dl className="dg-facts">
            {frame.siteGrid !== undefined && (
              <>
                <dt>Site grid</dt>
                <dd className="dg-num">{frame.siteGrid}</dd>
              </>
            )}
            <dt>Operation</dt>
            <dd>{frame.accuracy}</dd>
            {frame.scale !== undefined && (
              <>
                <dt>Combined factor</dt>
                <dd className="dg-num">{frame.scale}</dd>
              </>
            )}
            {frame.parts !== undefined && (
              <>
                <dt>Rigid's error at the edge</dt>
                <dd className="dg-num">{frame.parts}</dd>
              </>
            )}
            {frame.credits.length > 0 && (
              <>
                <dt>Grids</dt>
                <dd>
                  {frame.credits.map((c) => (
                    <div key={c}>{c}</div>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}

export function Sites({
  sites,
  actions,
}: {
  sites: readonly SiteView[];
  actions: PanelActions;
}) {
  return (
    <section className="dg-section" aria-labelledby="dg-sites">
      <Typography variant="subtitle-md" render={<h2 id="dg-sites" />}>
        Sites, smallest first
      </Typography>
      <ul className="dg-sites">
        {sites.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`dg-site${s.selected ? " selected" : ""}`}
              aria-current={s.selected ? "true" : undefined}
              aria-label={`Fly to ${s.name}: ${s.row}${s.paired ? "" : "; rigid only"}${s.fallback !== undefined ? `; ${s.fallback}` : ""}`}
              onClick={() => actions.selectSite(s.id)}
            >
              <span className="dg-site-text">
                <span className="dg-site-name">{s.name}</span>
                <span className="dg-site-meta dg-num">{s.row}</span>
              </span>
              {!s.paired && (
                <Badge
                  variant="inline"
                  size="small"
                  className="dg-badge"
                  badgeContent="Rigid only"
                />
              )}
              {s.fallback !== undefined && (
                <Badge
                  variant="inline"
                  size="small"
                  color="warning"
                  className="dg-badge"
                  badgeContent={s.fallback}
                />
              )}
              <span className="dg-site-go" aria-hidden>
                {s.busy && s.selected ? (
                  <CircularProgress size={12} />
                ) : (
                  <Icon href={svgAirplane} />
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
