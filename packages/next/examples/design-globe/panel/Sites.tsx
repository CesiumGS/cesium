// The portfolio (DESIGN.md "Sites"): a scale ladder, smallest first, the
// corridor last. Each row: the name and place, then its CRS codes and the
// grids its height system reads; Fly to. The selected site opens under its
// row: "every country, done right" (its CRS, units, height system and grid
// credits, as PROJ resolved them), then one line of the story.
import { Badge, Button, CircularProgress, Typography } from "@mui/material";
import { svgAirplane } from "@stratakit/icons/airplane";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { svgStatusWarning } from "@stratakit/icons/status-warning";
import { Icon } from "@stratakit/mui";
import type { PanelActions, SiteView } from "./model.ts";

function SiteDetail({ site }: { site: SiteView }) {
  const { frame, story } = site;
  if (frame === undefined) {
    return (
      <p className="dg-site-wait dg-muted" role="status">
        <CircularProgress size={10} aria-hidden />
        Resolving its frame through PROJ…
      </p>
    );
  }
  return (
    <div className="dg-site-detail">
      <dl className="dg-facts">
        <dt>CRS</dt>
        <dd>{frame.horizontal}</dd>
        {frame.vertical !== undefined && (
          <>
            <dt>Heights</dt>
            <dd>{frame.vertical}</dd>
          </>
        )}
        <dt>Units</dt>
        <dd>{frame.units}</dd>
        <dt>Operation</dt>
        <dd>{frame.accuracy}</dd>
        {frame.scale !== undefined && (
          <>
            <dt>Combined factor</dt>
            <dd className="dg-num">{frame.scale}</dd>
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
      {frame.fallback !== undefined && (
        <p className="dg-fallback">
          <Icon href={svgStatusWarning} aria-hidden />
          {frame.fallback}
        </p>
      )}
      {story !== undefined && (
        <p className={`dg-story${story.acceptable ? " ok" : " bad"}`}>
          <span className="dg-num">
            {story.extent}; rigid is {story.edgeError} off at its edge
            {story.cause}.
          </span>{" "}
          {story.acceptable && <Icon href={svgStatusSuccess} aria-hidden />}
          {story.verdict}
        </p>
      )}
    </div>
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
          <li
            key={s.id}
            className={`dg-site${s.selected ? " selected" : ""}`}
            aria-current={s.selected ? "true" : undefined}
          >
            <div className="dg-site-head">
              <div className="dg-site-name">
                <span className="dg-strong">{s.name}</span>
                <span className="dg-muted dg-site-place">{s.place}</span>
              </div>
              <Button
                size="small"
                variant={s.selected ? "outlined" : "text"}
                onClick={() => actions.selectSite(s.id)}
                startIcon={
                  s.busy && s.selected ? (
                    <CircularProgress size={12} aria-hidden />
                  ) : (
                    <Icon href={svgAirplane} aria-hidden />
                  )
                }
                aria-label={`Fly to ${s.name}`}
              >
                Fly to
              </Button>
            </div>
            <div className="dg-site-meta dg-muted dg-num">
              {s.summary}
              {s.fallback !== undefined && (
                <Badge
                  variant="inline"
                  size="small"
                  color="warning"
                  className="dg-badge"
                  badgeContent={s.fallback}
                />
              )}
              {!s.paired && <span className="dg-site-one"> · rigid only</span>}
            </div>
            {s.selected && <SiteDetail site={s} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
