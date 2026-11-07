import {
  Alert,
  Badge,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { svg3DObjectLarge } from "@stratakit/icons/3d-object";
import { svgChartBarLarge } from "@stratakit/icons/chart-bar";
import { svgChartLineLarge } from "@stratakit/icons/chart-line";
import { svgDashboardLarge } from "@stratakit/icons/dashboard";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgGlobeLarge } from "@stratakit/icons/globe";
import { svgHelpLarge } from "@stratakit/icons/help";
import { svgImageLarge } from "@stratakit/icons/image";
import { svgKeyboardLarge } from "@stratakit/icons/keyboard";
import { svgLayersLarge } from "@stratakit/icons/layers";
import { svgListLarge } from "@stratakit/icons/list";
import { svgModelCubeLarge } from "@stratakit/icons/model-cube";
import { svgMoonLarge } from "@stratakit/icons/moon";
import { svgNotificationsLarge } from "@stratakit/icons/notifications";
import { svgPlayCircleLarge } from "@stratakit/icons/play-circle";
import { svgSearchLarge } from "@stratakit/icons/search";
import { svgSunLarge } from "@stratakit/icons/sun";
import { Icon } from "@stratakit/mui";
import { unstable_NavigationRail as NavigationRail } from "@stratakit/structures";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { EXAMPLES } from "../../examples/index.ts";
import { HARNESSES } from "../../lab/pages.ts";
import { ALERT_METRICS, detectAlerts } from "./changepoints.mjs";
import { cellKey, cellTitle, runLabel, type Summary } from "./data.ts";
import logomark from "./assets/cesium-logomark.svg";
import wordmarkDark from "./assets/Cesium_Logo_Color_Overlay_Light.png";
import wordmarkLight from "./assets/Cesium_Logo_Color_Overlay.png";
import { IonTokenRailItem } from "./IonTokenSettings.tsx";
import { useTheme } from "./theme.tsx";
import { useRuns } from "./views/common.tsx";
import { FirstRun } from "./views/FirstRun.tsx";
import { worksWithoutRuns } from "./withoutRuns.ts";

/**
 * Dyno's shell (DESIGN.md): StrataKit's navigation rail in three groups
 * (results, scenes, workbench) with counts of what needs attention, a
 * command palette (Ctrl/⌘ K) over views, scenes, runs and Lab pages,
 * keyboard shortcuts (g then a letter; / to search; ? for the list), the
 * ion token every view uses (IonTokenSettings.tsx), the color scheme, and
 * messages after actions. Views render their own page
 * header (views/common.tsx `Page`) into the outlet.
 */

interface Destination {
  to: string;
  label: string;
  icon: string;
  /** g then this letter. */
  key: string;
}

const GROUPS: Destination[][] = [
  [
    { to: "/overview", label: "Overview", icon: svgDashboardLarge, key: "o" },
    { to: "/trends", label: "Trends", icon: svgChartLineLarge, key: "t" },
    { to: "/runs", label: "Runs", icon: svgListLarge, key: "r" },
    { to: "/alerts", label: "Alerts", icon: svgNotificationsLarge, key: "a" },
  ],
  [
    { to: "/scenes", label: "Scenes", icon: svgLayersLarge, key: "s" },
    { to: "/explorer", label: "Explorer", icon: svgGlobeLarge, key: "e" },
    { to: "/viewer", label: "Viewer", icon: svg3DObjectLarge, key: "v" },
    { to: "/images", label: "Images", icon: svgImageLarge, key: "i" },
    { to: "/examples", label: "Examples", icon: svgPlayCircleLarge, key: "x" },
  ],
  [
    { to: "/analysis", label: "Analysis", icon: svgChartBarLarge, key: "n" },
    { to: "/lab", label: "Lab", icon: svgModelCubeLarge, key: "l" },
  ],
];
const DESTINATIONS = GROUPS.flat();

/** The rail item a path belongs to (a run's report belongs to Runs). */
const destinationOf = (path: string) =>
  DESTINATIONS.find((d) => path === d.to || path.startsWith(`${d.to}/`)) ??
  (path === "/compare"
    ? DESTINATIONS.find((d) => d.to === "/runs")
    : undefined);

export function ShellPending() {
  return (
    <div className="shell-pending" role="status">
      <CircularProgress size={20} />
      <Typography variant="body-md">Loading runs…</Typography>
    </div>
  );
}

export function ShellError({ error }: { error: unknown }) {
  return (
    <Alert severity="error" className="shell-error">
      Dyno could not read the results ({String(error)}). It reads them through
      the dev server: run <code>npm run dev</code> in packages/next.
    </Alert>
  );
}

/** Things to look at: untriaged regressions, images to review. */
function useAttention(summaries: Summary[]): {
  alerts: number;
  images: number;
} {
  const [counts, setCounts] = useState({ alerts: 0, images: 0 });
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let triage: Record<string, { status: string }> = {};
      try {
        triage = await (await fetch("/bench-results/triage.json")).json();
      } catch {
        // Nothing triaged yet.
      }
      const alerts = detectAlerts(summaries, ALERT_METRICS).filter(
        (a) =>
          a.kind === "regression" && (triage[a.id]?.status ?? "new") === "new",
      );
      let images = 0;
      try {
        const list = await (
          await fetch("/bench-results/images/index.json")
        ).json();
        if (list.runs[0]) {
          const run = await (
            await fetch(`/bench-results/images/${list.runs[0]}`)
          ).json();
          images = run.checks.filter(
            (c: { status: string; approved?: boolean; review?: unknown }) =>
              (c.status === "changed" || c.status === "new") &&
              !c.approved &&
              !c.review,
          ).length;
        }
      } catch {
        // No image checks yet.
      }
      // One per change across scenes, as the Alerts view groups them.
      const groups = new Set(
        alerts.map(
          (a) =>
            `${a.metric}|${a.config}|${a.range.from.commit}|${a.range.to.commit}`,
        ),
      );
      if (!cancelled) {
        setCounts({ alerts: groups.size, images });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summaries]);
  return counts;
}

export function Shell() {
  const { summaries } = useRuns();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { choice, scheme, setChoice } = useTheme();
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem("dyno.rail") === "expanded",
  );
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [message, setMessage] = useState<{
    id: number;
    text: string;
    tone: string;
  }>();
  const main = useRef<HTMLElement>(null);
  const attention = useAttention(summaries);
  const active = destinationOf(path);

  useEffect(() => {
    const harness = path.startsWith("/lab/")
      ? HARNESSES.find((h) => `/lab/${h.id}` === path)
      : undefined;
    const example = path.startsWith("/examples/")
      ? EXAMPLES.find((x) => `/examples/${x.id}` === path)
      : undefined;
    const name = harness?.title ?? example?.title ?? active?.label;
    document.title = name ? `${name} · Dyno` : "Dyno";
  }, [path, active]);

  // Messages from any view (toast.ts).
  useEffect(() => {
    let next = 0;
    const on = (e: Event) => {
      const { message: text, tone } = (e as CustomEvent).detail;
      setMessage({ id: ++next, text, tone });
    };
    addEventListener("dyno:toast", on);
    return () => removeEventListener("dyno:toast", on);
  }, []);

  // Keyboard: Ctrl/⌘ K, g + letter, /, ?.
  useEffect(() => {
    let pendingG = 0;
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
        t.closest('[role="listbox"], [role="menu"], [role="dialog"]') !== null);
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      if (e.key === "?") {
        setShortcuts(true);
      } else if (e.key === "/") {
        const search = main.current?.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        if (search) {
          e.preventDefault();
          search.focus();
        }
      } else if (e.key === "g") {
        pendingG = Date.now();
      } else if (Date.now() - pendingG < 1200) {
        const d = DESTINATIONS.find((x) => x.key === e.key);
        if (d) {
          void navigate({ to: d.to });
        }
        pendingG = 0;
      }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [navigate]);

  const count = (to: string) =>
    to === "/alerts"
      ? attention.alerts
      : to === "/images"
        ? attention.images
        : 0;
  const nextChoice = {
    system: "light",
    light: "dark",
    dark: "system",
  } as const;

  return (
    <div className="shell">
      <NavigationRail.Root
        expanded={expanded}
        setExpanded={(v) => {
          setExpanded(v);
          localStorage.setItem("dyno.rail", v ? "expanded" : "collapsed");
        }}
        className="rail"
      >
        <NavigationRail.Header>
          <a
            href="#/overview"
            className="brand"
            aria-label="Cesium Dyno, overview"
          >
            {expanded ? (
              <>
                <img
                  src={scheme === "dark" ? wordmarkDark : wordmarkLight}
                  alt=""
                  className="brand-wordmark"
                />
                <span className="brand-name">Dyno</span>
              </>
            ) : (
              <img src={logomark} alt="" className="brand-mark" />
            )}
          </a>
          <NavigationRail.ToggleButton />
        </NavigationRail.Header>
        <NavigationRail.Content>
          <NavigationRail.List>
            <NavigationRail.ListItem>
              <NavigationRail.Button
                icon={svgSearchLarge}
                label="Go to… (Ctrl K)"
                onClick={() => setPalette(true)}
              />
            </NavigationRail.ListItem>
          </NavigationRail.List>
          {GROUPS.map((group, i) => (
            <div key={i} className="rail-group">
              <Divider role="presentation" />
              <NavigationRail.List>
                {group.map((d) => {
                  const n = count(d.to);
                  return (
                    <NavigationRail.ListItem key={d.to}>
                      <NavigationRail.Anchor
                        href={`#${d.to}`}
                        icon={
                          n && !expanded ? (
                            <Badge variant="dot" color="error">
                              <Icon href={d.icon} size="large" />
                            </Badge>
                          ) : (
                            d.icon
                          )
                        }
                        label={d.label}
                        active={active === d}
                        suffix={
                          n ? (
                            <Badge
                              badgeContent={n}
                              variant="inline"
                              color={d.to === "/alerts" ? "error" : "warning"}
                              size="small"
                              aria-label={`${n} to look at`}
                            />
                          ) : undefined
                        }
                      />
                    </NavigationRail.ListItem>
                  );
                })}
              </NavigationRail.List>
            </div>
          ))}
          <NavigationRail.Footer>
            <NavigationRail.List>
              <NavigationRail.ListItem>
                <NavigationRail.Anchor
                  href="#/start"
                  icon={svgHelpLarge}
                  label="Getting started"
                  active={path === "/start"}
                />
              </NavigationRail.ListItem>
              <NavigationRail.ListItem>
                <NavigationRail.Button
                  icon={svgKeyboardLarge}
                  label="Keyboard shortcuts (?)"
                  onClick={() => setShortcuts(true)}
                />
              </NavigationRail.ListItem>
              <IonTokenRailItem expanded={expanded} />
              <NavigationRail.ListItem>
                <NavigationRail.Button
                  icon={scheme === "dark" ? svgMoonLarge : svgSunLarge}
                  label={`Theme: ${choice} (switch to ${nextChoice[choice]})`}
                  onClick={() => setChoice(nextChoice[choice])}
                />
              </NavigationRail.ListItem>
            </NavigationRail.List>
          </NavigationRail.Footer>
        </NavigationRail.Content>
      </NavigationRail.Root>

      <main
        ref={main}
        className={`content viz ${scheme}`}
        aria-label={active?.label ?? "Dyno"}
      >
        {summaries.length || worksWithoutRuns(path) ? <Outlet /> : <FirstRun />}
      </main>

      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        summaries={summaries}
      />
      <Dialog open={shortcuts} onClose={() => setShortcuts(false)}>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogContent>
          <Table size="small" className="shortcuts">
            <TableBody>
              <TableRow>
                <TableCell>
                  <kbd>Ctrl</kbd> <kbd>K</kbd>
                </TableCell>
                <TableCell>
                  Go to a view, scene, run, example or Lab page
                </TableCell>
              </TableRow>
              {DESTINATIONS.map((d) => (
                <TableRow key={d.to}>
                  <TableCell>
                    <kbd>g</kbd> <kbd>{d.key}</kbd>
                  </TableCell>
                  <TableCell>{d.label}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>
                  <kbd>/</kbd>
                </TableCell>
                <TableCell>Search this page</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <kbd>?</kbd>
                </TableCell>
                <TableCell>This list</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
      <Snackbar
        key={message?.id}
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage(undefined)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={message?.tone === "bad" ? "error" : "success"}
          action={
            <IconButton label="Dismiss" onClick={() => setMessage(undefined)}>
              <Icon href={svgDismiss} />
            </IconButton>
          }
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </div>
  );
}

interface Item {
  label: string;
  kind: string;
  to: string;
  params?: Record<string, string>;
}

function CommandPalette({
  open,
  onClose,
  summaries,
}: {
  open: boolean;
  onClose: () => void;
  summaries: Summary[];
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const items = useMemo<Item[]>(() => {
    const out: Item[] = DESTINATIONS.map((d) => ({
      label: d.label,
      kind: "view",
      to: d.to,
    }));
    const scenes = new Map<string, string>();
    for (const s of summaries) {
      for (const c of s.scenes) {
        scenes.set(cellKey(c), cellTitle(c));
      }
    }
    for (const [scene, title] of scenes) {
      out.push({
        label: title,
        kind: "scene",
        to: "/scenes/$scene",
        params: { scene },
      });
    }
    for (const x of EXAMPLES) {
      out.push({
        label: x.title,
        kind: "example",
        to: "/examples/$id",
        params: { id: x.id },
      });
    }
    for (const h of HARNESSES) {
      out.push({
        label: h.title,
        kind: "Lab",
        to: "/lab/$id",
        params: { id: h.id },
      });
    }
    for (const s of [...summaries].reverse()) {
      out.push({
        label: runLabel(s),
        kind: "run",
        to: "/runs/$run",
        params: { run: s.name },
      });
    }
    return out;
  }, [summaries]);
  const q = query.trim().toLowerCase();
  const matches = (
    q
      ? items.filter((i) => `${i.label} ${i.kind}`.toLowerCase().includes(q))
      : items
  ).slice(0, 40);
  useEffect(() => setActive(0), [query, open]);
  const choose = (item?: Item) => {
    if (item) {
      onClose();
      setQuery("");
      void navigate({ to: item.to, params: item.params } as never);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Go to</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          type="search"
          placeholder="A view, a scene, a run or a Lab page"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(matches.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              choose(matches[active]);
            }
          }}
          slotProps={{ htmlInput: { "aria-label": "Go to" } }}
        />
        <div role="listbox" aria-label="Results" className="palette-list">
          {matches.map((item, i) => (
            <button
              key={`${item.kind}:${item.label}`}
              role="option"
              aria-selected={i === active}
              className="palette-item"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
            >
              <span>{item.label}</span>
              <Typography variant="caption-md" color="textSecondary">
                {item.kind}
              </Typography>
            </button>
          ))}
          {!matches.length && (
            <Typography variant="body-md" color="textSecondary">
              Nothing matches.
            </Typography>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
