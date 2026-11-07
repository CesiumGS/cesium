// What the page is waiting for (DESIGN.md principle 5, as the explorer's
// status strip): each item with its bytes while it fetches; once all is in,
// one quiet line. Missing data gives the one command; an error says what
// failed, with Retry. Nothing falls back silently.
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Typography,
} from "@mui/material";
import { svgRetry } from "@stratakit/icons/retry";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { Icon } from "@stratakit/mui";
import { bytesText, loadingSummary, type LoadItem } from "../page.ts";
import type { PanelActions } from "./model.ts";

function ItemRow({ item }: { item: LoadItem }) {
  const fraction =
    item.total !== undefined && item.total > 0
      ? (100 * (item.received ?? 0)) / item.total
      : undefined;
  return (
    <li className="dg-load-row">
      <span className="dg-load-name">{item.label}</span>
      <span className="dg-load-state dg-num">
        {item.state === "ready" ? (
          <>
            <Icon href={svgStatusSuccess} aria-hidden />
            {item.bytes !== undefined ? bytesText(item.bytes) : "ready"}
          </>
        ) : item.state === "fetching" ? (
          bytesText(item.received ?? 0, item.total)
        ) : item.state === "waiting" ? (
          <>
            <CircularProgress size={10} aria-hidden />
            waiting
          </>
        ) : (
          item.state
        )}
      </span>
      {item.state === "fetching" && (
        <LinearProgress
          className="dg-load-bar"
          aria-label={`${item.label}: ${bytesText(item.received ?? 0, item.total)}`}
          {...(fraction !== undefined
            ? { variant: "determinate", value: fraction }
            : { variant: "indeterminate" })}
        />
      )}
    </li>
  );
}

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** "All data ready: PROJ, 1 grid, 1 site's tiles, 21.4 MB." */
function readyLine(ready: readonly LoadItem[], bytes: number): string {
  const grids = ready.filter((i) => i.id.startsWith("grid:")).length;
  const sites = ready.filter((i) => i.id.startsWith("tiles:")).length;
  const parts = [
    ...(ready.some((i) => i.id === "proj") ? ["PROJ"] : []),
    ...(grids > 0 ? [count(grids, "grid")] : []),
    ...(sites > 0 ? [`tiles for ${count(sites, "site")}`] : []),
  ];
  return `All data ready: ${parts.join(", ")}${bytes > 0 ? `; ${bytesText(bytes)} fetched` : ""}.`;
}

export function Status({
  items,
  actions,
}: {
  items: readonly LoadItem[];
  actions: PanelActions;
}) {
  const summary = loadingSummary(items);
  if (summary.state === "error") {
    return (
      <Alert
        severity="error"
        className="dg-status"
        action={
          <Button
            size="small"
            onClick={() => actions.retry()}
            startIcon={<Icon href={svgRetry} aria-hidden />}
          >
            Retry
          </Button>
        }
      >
        {summary.items.map((i) => (
          <div key={i.id}>{i.detail}</div>
        ))}
      </Alert>
    );
  }
  if (summary.state === "missing") {
    const [first] = summary.items;
    const [say, command] = (first?.detail ?? "").split(": npm ");
    return (
      <Alert severity="warning" className="dg-status">
        <div>{say}:</div>
        {command !== undefined && (
          <code className="dg-code-block">npm {command}</code>
        )}
        <div className="dg-muted">
          It writes about 40 MB to the store outside the repository; nothing
          comes from Cesium ion.
        </div>
      </Alert>
    );
  }
  if (summary.state === "ready") {
    const ready = items.filter((i) => i.state === "ready");
    const bytes = ready.reduce((n, i) => n + (i.bytes ?? 0), 0);
    return (
      <Typography
        variant="body-sm"
        className="dg-status dg-status-ready dg-muted"
        component="p"
      >
        <Icon href={svgStatusSuccess} aria-hidden />
        {items.length === 0 ? "Starting" : readyLine(ready, bytes)}
      </Typography>
    );
  }
  return (
    <div className="dg-status" role="status" aria-live="polite">
      <Typography variant="body-sm" component="p" className="dg-status-head">
        Loading
      </Typography>
      <ul className="dg-load">
        {items
          .filter((i) => i.state !== "ready")
          .map((i) => (
            <ItemRow key={i.id} item={i} />
          ))}
      </ul>
      {items.some((i) => i.state === "ready") && (
        <Typography
          variant="caption-lg"
          component="p"
          className="dg-muted dg-status-done"
        >
          Ready:{" "}
          {items
            .filter((i) => i.state === "ready")
            .map((i) => i.label)
            .join(", ")}
          .
        </Typography>
      )}
    </div>
  );
}
