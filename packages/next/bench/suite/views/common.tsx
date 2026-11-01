import {
  Alert,
  AlertTitle,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgHelp } from "@stratakit/icons/help";
import { Icon } from "@stratakit/mui";
import { getRouteApi } from "@tanstack/react-router";
import {
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { bindChartsIn, CHART_CSS } from "../charts.mjs";
import { DIAGNOSE_CSS } from "../diagnose.mjs";
import { type Runs, store } from "../data.ts";
import { useTheme } from "../theme.tsx";

/**
 * What Dyno's views share (DESIGN.md): page anatomy (`Page`, `Section`),
 * pickers with Dyno's conventions (`Choice`, `Chips`), empty states,
 * help popovers, chart hosting, change formatting, the runs (the
 * router's root loader) and per-viewer stored state. Built on StrataKit
 * (MUI themed by @stratakit/mui).
 */

const rootApi = getRouteApi("__root__");

// The charts' own styles (shared with the CLI's standalone reports),
// diagnostics' (waterfalls, path segments) included.
const chartStyle = document.createElement("style");
chartStyle.textContent = CHART_CSS + DIAGNOSE_CSS;
document.head.append(chartStyle);

/** Every run's summary and the results index (loaded before any view). */
export function useRuns(): Runs {
  return rootApi.useLoaderData() as Runs;
}

/** Whether the resolved color scheme is dark (charts follow it). */
export const useDark = () => useTheme().scheme === "dark";

/**
 * Class names for a chart host outside the page's main element (a
 * dialog renders in a portal): the chart tokens and the color scheme.
 */
export function useChartTokens(): string {
  return `viz chart-tokens ${useTheme().scheme}`;
}

// ------------------------------------------------------------ page anatomy

/**
 * A view's page: its title (the page's h1), one sentence on what it
 * answers, actions on the right, an optional toolbar of filters, then
 * content. Details belong in `help`, not in the description.
 */
export function Page({
  title,
  description,
  actions,
  toolbar,
  help,
  back,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  help?: ReactNode;
  /** A link back up the hierarchy ("Runs", "Lab"), above the title. */
  back?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`page ${className ?? ""}`}>
      <header className="page-header">
        <div className="page-heading">
          {back && <div className="page-back">{back}</div>}
          <div className="page-title">
            <Typography variant="headline-sm" render={<h1 />}>
              {title}
            </Typography>
            {help && <Help>{help}</Help>}
          </div>
          {description && (
            <Typography variant="body-md" color="textSecondary" render={<p />}>
              {description}
            </Typography>
          )}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>
      {toolbar && <Toolbar>{toolbar}</Toolbar>}
      <div className="page-content">{children}</div>
    </div>
  );
}

/** A row of filters and pickers (left to right in choosing order). */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

/** A titled section of a page (an h2), with optional actions. */
export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <Typography variant="subtitle-md" render={<h2 />}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              {description}
            </Typography>
          )}
        </div>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** A "?" button that opens an explanation (for details pages don't lead with). */
export function Help({
  children,
  label = "About this page",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        label={label}
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <Icon href={svgHelp} />
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div className="help-popover">{children}</div>
      </Popover>
    </>
  );
}

/** What a view shows when it has nothing to show yet, and what to do. */
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Alert severity="info" className="empty" action={action}>
      <AlertTitle>{title}</AlertTitle>
      {children}
    </Alert>
  );
}

// ------------------------------------------------------------ controls

/**
 * One choice from a list (MUI Select with a visible label). Options are
 * values, or [value, label] pairs; an empty value is allowed ("none").
 */
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled,
  minWidth = 160,
}: {
  label: string;
  value: string | undefined;
  options: ReadonlyArray<string | readonly [string, string]>;
  onChange: (value: string) => void;
  disabled?: boolean;
  minWidth?: number;
}) {
  const id = useId();
  const pairs = options.map((o) =>
    typeof o === "string" ? ([o, o] as const) : o,
  );
  const known = value !== undefined && pairs.some(([v]) => v === value);
  return (
    <FormControl size="small" style={{ minWidth }} disabled={disabled}>
      <InputLabel id={id}>{label}</InputLabel>
      <Select
        labelId={id}
        label={label}
        value={known ? value : ""}
        displayEmpty
        onChange={(e) => onChange(String(e.target.value))}
      >
        {pairs.map(([v, text]) => (
          <MenuItem key={v || "␀"} value={v}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/**
 * Any number of options on (metrics, statuses): a non-exclusive toggle
 * button group (StrataKit's chips carry no selected state).
 */
export function Chips({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<readonly [string, string]>;
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
}) {
  return (
    <ToggleButtonGroup
      size="small"
      value={value}
      onChange={(_, next: string[]) => onChange(next)}
      aria-label={label}
      className="chips"
    >
      {options.map(([v, text]) => (
        // StrataKit's text toggle: a ToggleButton rendered as an outlined Button.
        <ToggleButton key={v} value={v} render={<Button variant="outlined" />}>
          {text}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

// ------------------------------------------------------------ charts and numbers

/**
 * A chart (or any HTML) from charts.mjs, which the CLI's reports share:
 * inserted as HTML, then given its tooltips and click handling. `onPick`
 * gets the x of a click on a plot (a run index, a path percentage).
 */
export function Chart({
  html,
  onPick,
  className,
}: {
  html: string;
  onPick?: (x: number, target: Element) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  useLayoutEffect(() => {
    const el = ref.current!;
    el.innerHTML = html;
    bindChartsIn(el);
  }, [html]);
  useLayoutEffect(() => {
    const el = ref.current!;
    const on = (e: Event) =>
      pick.current?.((e as CustomEvent).detail.x, e.target as Element);
    el.addEventListener("chart-click", on);
    return () => el.removeEventListener("chart-click", on);
  }, []);
  return <div ref={ref} className={className ?? "chart-host"} />;
}

/**
 * A candidate-over-baseline ratio in words: "1.5× faster", "12% more
 * memory", "no change" (within 2%). `lowerIsBetter` holds for times,
 * bytes and counts; `noun` names what the metric measures when "faster"
 * doesn't fit ("memory", "bytes", "requests").
 */
export function formatChange(
  ratio: number | undefined,
  {
    lowerIsBetter = true,
    noun,
  }: { lowerIsBetter?: boolean; noun?: string } = {},
): { text: string; tone: "better" | "worse" | "same" | "none" } {
  if (ratio === undefined || !Number.isFinite(ratio) || ratio <= 0) {
    return { text: "–", tone: "none" };
  }
  if (Math.abs(ratio - 1) < 0.02) {
    return { text: "no change", tone: "same" };
  }
  const better = lowerIsBetter ? ratio < 1 : ratio > 1;
  const tone = better ? "better" : "worse";
  if (!noun) {
    // Times: "8% faster" for small changes, "1.5× slower" for large ones.
    const factor = ratio < 1 ? 1 / ratio : ratio;
    const word = ratio < 1 === lowerIsBetter ? "faster" : "slower";
    const amount =
      factor < 1.2
        ? `${Math.round((factor - 1) * 100)}%`
        : `${factor.toFixed(factor < 10 ? 1 : 0)}×`;
    return { text: `${amount} ${word}`, tone };
  }
  const pct = Math.round(Math.abs(ratio - 1) * 100);
  return { text: `${pct}% ${ratio < 1 ? "less" : "more"} ${noun}`, tone };
}

// ------------------------------------------------------------ state

/** State remembered per viewer in localStorage (never shared). */
export function useStored<T>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => store.get(key, fallback));
  const set = useCallback(
    (next: T) => {
      store.set(key, next);
      setValue(next);
    },
    [key],
  );
  return [value, set];
}

export { toast } from "../toast.ts";
