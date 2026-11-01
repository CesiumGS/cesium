import "./alerts.css";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Alert,
  ALERT_METRICS,
  ALERT_STATES,
  detectAlerts,
} from "../changepoints.mjs";
import { lineChart } from "../charts.mjs";
import { CONDITION_METRICS, METRICS } from "../report.mjs";
import { catalog, cellKey, type Summary } from "../data.ts";
import type { AlertsSearch } from "../routes.tsx";
import { engineLabel } from "../engines.mjs";
import {
  Chart,
  Chips,
  Choice,
  Empty,
  Page,
  toast,
  useRuns,
} from "./common.tsx";

/**
 * Dyno's alerts (DESIGN.md, Results), after Perfherder's sheriffing:
 * every significant change point across runs (changepoints.mjs) as an
 * alert with its commit range, the series around it, and a triage state
 * (new, acknowledged, expected, invalid, fixed) with an owner and a note,
 * saved beside the results. Alerts that are one change (metric,
 * direction, configuration, machine, commits) across several scenes are
 * one card. New regressions come first.
 */

interface Triage {
  status: string;
  owner?: string;
  note?: string;
  updated?: string;
}
type TriageFile = Record<string, Triage>;
type Kind = NonNullable<AlertsSearch["kind"]>;
type BadgeColor = "success" | "warning" | "error" | "info" | "secondary";

const TRIAGE_URL = "/bench-results/triage.json";
const INFO = new Map(
  [...METRICS, ...CONDITION_METRICS].map((m) => [m[0], m] as const),
);
const DEFAULT_SHOWN = ["new", "acknowledged"];

/** The watched metrics as the subject of a sentence. */
const NAMES: Record<string, string> = {
  cpuP50: "CPU time per frame",
  gpuP50: "GPU time per frame",
  frameP95: "95th-percentile frame time",
  frameP999: "99.9th-percentile frame time",
  over100: "Hitches over 100 ms",
  firstContentMs: "Time to first content",
  settleMs: "Time to settle",
  requests: "Requests",
  bytes: "Bytes downloaded",
  heapBytes: "JS heap",
};
const nameOf = (metric: string) => {
  const name = NAMES[metric] ?? INFO.get(metric)?.[1] ?? metric;
  return name[0]!.toUpperCase() + name.slice(1);
};

/** Each triage state as a word and a color. */
const STATES: Record<string, [string, BadgeColor]> = {
  new: ["New", "info"],
  acknowledged: ["Acknowledged", "secondary"],
  expected: ["Expected", "secondary"],
  invalid: ["Invalid", "secondary"],
  fixed: ["Fixed", "success"],
};
const stateLabel = (s: string) => STATES[s]?.[0] ?? s;

const KINDS: Array<[Kind, string]> = [
  ["regression", "Regressions"],
  ["improvement", "Improvements"],
  ["all", "All"],
];

/** "Oct 31, 18:49" (lists); the ISO date goes in a tooltip. */
const shortDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** A change's size without its sign (the verb carries the direction). */
const pct = (change: number) => {
  const p = Math.abs(change - 1) * 100;
  return `${p < 10 ? p.toFixed(1).replace(/\.0$/, "") : Math.round(p)}%`;
};

/** A metric's value with its unit, at the precision the noise allows. */
function valueOf(metric: string, raw: number): string {
  const [, , unit, scale] = INFO.get(metric) ?? [metric, metric, "", 1];
  const v = raw / (scale as number);
  const text =
    Math.abs(v) >= 100
      ? Math.round(v).toLocaleString()
      : Math.abs(v) >= 10
        ? v.toFixed(1)
        : v.toFixed(2);
  return unit ? `${text} ${unit}` : text;
}

/** A scene and scenario's attributes, for "what the scenes share". */
function attributes(key: string): string[] {
  const [id, scenario = "cold-orbit"] = key.split("|");
  const scene = catalog.scenes.find((s) => s.id === id);
  if (!scene) {
    return [`scenario ${scenario}`];
  }
  const kinds = scene.layers.map(
    (l) => catalog.datasets.find((d) => d.id === l.dataset)?.kind ?? "?",
  );
  return [
    `scenario ${scenario}`,
    `group ${scene.group}`,
    typeof scene.globe === "object" ? "terrain" : `globe: ${scene.globe}`,
    scene.imagery ? "imagery" : "no imagery",
    ...new Set(kinds.map((k) => `${k} content`)),
    scene.layers.length > 1 ? "several layers" : "one layer",
  ];
}

/**
 * What the affected scenes share (Honeycomb BubbleUp): attributes much
 * more common among them than among every scene measured.
 */
function whatTheyShare(
  affected: string[],
  all: string[],
): Array<{ attribute: string; inside: number; outside: number }> {
  if (affected.length < 2 || all.length <= affected.length) {
    return [];
  }
  const share = (keys: string[], attr: string) =>
    keys.filter((k) => attributes(k).includes(attr)).length / keys.length;
  const attrs = new Set(affected.flatMap(attributes));
  return [...attrs]
    .map((attribute) => ({
      attribute,
      inside: share(affected, attribute),
      outside: share(all, attribute),
    }))
    .filter((x) => x.inside - x.outside >= 0.3)
    .sort((x, y) => y.inside - y.outside - (x.inside - x.outside))
    .slice(0, 4);
}

/** The series around an alert, with its change point marked. */
function seriesChart(a: Alert, summaries: Summary[]): string {
  const points: Array<[number, number]> = [];
  const names: string[] = [];
  let mark = -1;
  for (const s of summaries.filter((s) => s.hardware === a.hardware)) {
    const m = s.scenes.find(
      (c) => cellKey(c) === a.scene && c.config === a.config,
    )?.metrics[a.metric];
    if (!m) {
      continue;
    }
    if (s.name === a.range.to.run) {
      mark = names.length;
    }
    points.push([names.length, m.median]);
    names.push(
      `${shortDate(s.date)} · ${s.commit.slice(0, 7)}${s.note ? ` · ${s.note}` : ""}`,
    );
  }
  const [, , unit, scale] = INFO.get(a.metric) ?? [a.metric, a.metric, "", 1];
  return lineChart({
    title: `${nameOf(a.metric)}, ${a.title}`,
    xLabel: "run",
    unit,
    xNames: names,
    series: [
      {
        label: engineLabel(a.config),
        color: "var(--ink-2)",
        points: points.map(([x, y]) => [x, y / scale]),
      },
    ],
    refs: [
      { y: a.before.median / scale, label: "before", dash: "4 3" },
      { y: a.after.median / scale, label: "after", dash: "4 3" },
    ],
    marks:
      mark >= 0 ? [{ x: mark, label: "change point", short: "change" }] : [],
    yMin: Infinity,
    width: 900,
    height: 170,
  });
}

/**
 * Alerts grouped like Perfherder's alert summaries: one change (metric,
 * direction, configuration, machine, commit range) across the scenes it
 * shows in; triage applies to the whole group.
 */
interface Group {
  key: string;
  alerts: Alert[];
  lead: Alert;
}
function groups(list: Alert[]): Group[] {
  const map = new Map<string, Alert[]>();
  for (const a of list) {
    const key = `${a.metric}|${a.kind}|${a.config}|${a.hardware}|${a.range.from.commit}|${a.range.to.commit}`;
    map.set(key, [...(map.get(key) ?? []), a]);
  }
  return [...map].map(([key, alerts]) => {
    const sorted = [...alerts].sort(
      (x, y) => Math.abs(y.change - 1) - Math.abs(x.change - 1),
    );
    return { key, alerts: sorted, lead: sorted[0]! };
  });
}
const statusOf = (triage: TriageFile, a: Alert) =>
  triage[a.id]?.status ?? "new";
const groupStatus = (triage: TriageFile, g: Group) =>
  ALERT_STATES[
    Math.min(...g.alerts.map((a) => ALERT_STATES.indexOf(statusOf(triage, a))))
  ]!;

export function Alerts() {
  const { summaries } = useRuns();
  const kind: Kind = getRouteApi("/alerts").useSearch().kind ?? "regression";
  const navigate = useNavigate({ from: "/alerts" });
  const [shown, setShown] = useState(DEFAULT_SHOWN);

  // The triage file beside the results (absent until something is saved).
  const [triage, setTriage] = useState<TriageFile>();
  const latest = useRef<TriageFile>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let loaded: TriageFile = {};
      try {
        const res = await fetch(TRIAGE_URL);
        if (res.ok) {
          loaded = (await res.json()) as TriageFile;
        }
      } catch {
        // Nothing triaged yet.
      }
      if (!cancelled) {
        latest.current = loaded;
        setTriage(loaded);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Computed once the triage has loaded, so the loading state paints first.
  const ready = triage !== undefined;
  const alerts = useMemo(
    () => (ready ? detectAlerts(summaries, ALERT_METRICS) : []),
    [ready, summaries],
  );

  // The list is filtered and ordered by the triage as it was when the
  // filters last changed: a card stays in place after its triage is saved
  // (with "Saved" beside it) until the kind or statuses change.
  const filter = `${kind}|${shown.join(",")}`;
  const [listing, setListing] = useState({ filter, triage });
  if (
    listing.filter !== filter ||
    (listing.triage === undefined && triage !== undefined)
  ) {
    setListing({ filter, triage });
  }
  const list = useMemo(() => {
    const t = listing.triage ?? {};
    return groups(alerts.filter((a) => kind === "all" || a.kind === kind))
      .filter((g) => shown.includes(groupStatus(t, g)))
      .sort(
        (a, b) =>
          ALERT_STATES.indexOf(groupStatus(t, a)) -
            ALERT_STATES.indexOf(groupStatus(t, b)) ||
          b.lead.range.to.date.localeCompare(a.lead.range.to.date),
      );
  }, [alerts, kind, shown, listing.triage]);

  /** Applies one triage entry to alerts and saves the whole file. */
  const save = useCallback(async (ids: string[], entry: Triage) => {
    const next = { ...latest.current };
    for (const id of ids) {
      next[id] = entry;
    }
    latest.current = next;
    setTriage(next);
    try {
      const res = await fetch(TRIAGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const kindWord =
    kind === "regression"
      ? "regressions"
      : kind === "improvement"
        ? "improvements"
        : "changes";
  const alertCount = list.reduce((n, g) => n + g.alerts.length, 0);

  let content: ReactNode;
  if (!ready) {
    content = (
      <div className="alerts-loading" role="status">
        <CircularProgress size={20} />
        <Typography variant="body-sm" color="textSecondary">
          Finding change points across {summaries.length} runs…
        </Typography>
      </div>
    );
  } else if (!alerts.length) {
    content = (
      <Empty title="No alerts yet">
        Alerts need about six runs of a scene on the same machine (there{" "}
        {summaries.length === 1 ? "is 1 run" : `are ${summaries.length} runs`}{" "}
        so far). Run the suite a few more times from the repository root:{" "}
        <code>node packages/next/bench/suite/cli.mjs run</code>
      </Empty>
    );
  } else if (!list.length) {
    content = (
      <Empty
        title={`No ${kindWord} with these statuses`}
        action={
          <Button variant="outlined" onClick={() => setShown(ALERT_STATES)}>
            Show every status
          </Button>
        }
      >
        Everything here has been triaged, or the filters hide it.
      </Empty>
    );
  } else {
    content = (
      <ul className="alerts-list">
        {list.map((g) => (
          <li key={g.key}>
            <AlertCard
              group={g}
              status={groupStatus(triage, g)}
              triage={triage[g.lead.id]}
              summaries={summaries}
              save={save}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Page
      title="Alerts"
      description="Metrics that changed and stayed changed from one run to the next, to triage. New regressions come first."
      help={
        <>
          <p>
            Change points are found with E-Divisive means and a permutation test
            (p &lt; 0.05), per scene, configuration and machine. One change
            across several scenes is one alert.
          </p>
          <p>
            Triage is saved beside the results (<code>triage.json</code>).{" "}
            <code>cli.mjs alerts --fail-on-new</code> fails a nightly job on
            regressions nobody has triaged.
          </p>
        </>
      }
      toolbar={
        // Filters only once there is something to filter.
        alerts.length > 0 && (
          <>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={kind}
              aria-label="Direction"
              onChange={(_, v: Kind | null) =>
                v &&
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    kind: v === "regression" ? undefined : v,
                  }),
                  replace: true,
                })
              }
            >
              {KINDS.map(([v, label]) => (
                <ToggleButton
                  key={v}
                  value={v}
                  render={<Button variant="outlined" size="small" />}
                >
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Chips
              label="Statuses"
              options={ALERT_STATES.map((s) => [s, stateLabel(s)] as const)}
              value={shown}
              onChange={setShown}
            />
            <Typography
              variant="body-sm"
              color="textSecondary"
              aria-live="polite"
            >
              {list.length} {list.length === 1 ? "change" : "changes"} (
              {alertCount} of {alerts.length} alerts)
            </Typography>
          </>
        )
      }
    >
      {content}
    </Page>
  );
}

function AlertCard({
  group: g,
  status,
  triage,
  summaries,
  save,
}: {
  group: Group;
  /** The group's current triage state (its least advanced alert's). */
  status: string;
  triage: Triage | undefined;
  summaries: Summary[];
  save: (ids: string[], entry: Triage) => Promise<boolean>;
}) {
  const a = g.lead;
  const many = g.alerts.length > 1;
  const sizes = g.alerts.map((x) => Math.abs(x.change - 1));
  const lo = g.alerts[sizes.indexOf(Math.min(...sizes))]!.change;
  const span =
    many && pct(lo) !== pct(a.change)
      ? `${pct(lo)} to ${pct(a.change)}`
      : pct(a.change);
  const where = many ? `on ${g.alerts.length} scenes` : `on ${a.title}`;
  const verb = a.change > 1 ? "went up" : "went down";
  const [stateWord, stateColor] = STATES[status] ?? [status, "secondary"];

  const shared = useMemo(() => {
    const all = [
      ...new Set(
        summaries
          .filter((s) => s.hardware === a.hardware)
          .flatMap((s) =>
            s.scenes.filter((c) => c.config === a.config).map(cellKey),
          ),
      ),
    ];
    return whatTheyShare(
      g.alerts.map((x) => x.scene),
      all,
    );
  }, [g, a, summaries]);
  const chart = useMemo(() => seriesChart(a, summaries), [a, summaries]);

  // The form starts from the saved triage (or the group's state).
  const [form, setForm] = useState(() => ({
    status: triage?.status ?? status,
    owner: triage?.owner ?? "",
    note: triage?.note ?? "",
  }));
  const [saved, setSaved] = useState<"" | "saved" | "failed">("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const entry = {
      status: form.status,
      owner: form.owner.trim(),
      note: form.note.trim(),
      updated: new Date().toISOString(),
    };
    setSaving(true);
    const ok = await save(
      g.alerts.map((x) => x.id),
      entry,
    );
    setSaving(false);
    setSaved(ok ? "saved" : "failed");
    toast(
      ok
        ? `Marked ${stateLabel(entry.status).toLowerCase()}${many ? ` on ${g.alerts.length} scenes` : ""}`
        : "Could not save the triage. Is the dev server running?",
      ok ? "good" : "bad",
    );
  };

  const commit = (x: { commit: string; subject?: string; date: string }) => (
    <span title={`${x.subject ?? ""} (${x.date})`.trim()}>
      <code>{x.commit.slice(0, 7)}</code>
    </span>
  );
  const stats = (x: Alert) =>
    `p = ${x.p.toFixed(3)}, ${x.before.runs} runs before and ${x.after.runs} after`;

  return (
    <Card className="alert-card">
      <CardContent className="alert-card-content">
        <header className="alert-head">
          <div className="alert-badges">
            <Badge
              variant="inline"
              size="small"
              color={a.kind === "regression" ? "error" : "success"}
              badgeContent={
                a.kind === "regression" ? "Regression" : "Improvement"
              }
            />
            <Badge
              variant="inline"
              size="small"
              type="outlined"
              color={stateColor}
              badgeContent={stateWord}
            />
          </div>
          <Typography variant="subtitle-md" render={<h2 />}>
            {nameOf(a.metric)} {verb} {span} {where}
          </Typography>
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Between {commit(a.range.from)} and {commit(a.range.to)} (
            <span title={a.range.from.date}>
              {shortDate(a.range.from.date)}
            </span>{" "}
            to <span title={a.range.to.date}>{shortDate(a.range.to.date)}</span>
            ) · {engineLabel(a.config)} on {a.hardware}
          </Typography>
          {a.range.to.subject && (
            <Typography
              variant="body-sm"
              color="textSecondary"
              render={<p />}
              className="alert-subject"
            >
              Last commit: {a.range.to.subject}
            </Typography>
          )}
        </header>

        <div className="alert-body">
          <div className="alert-evidence">
            <Chart html={chart} className="alert-chart" />
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              {many ? `Largest change, ${a.title}: median ` : "Median "}
              {valueOf(a.metric, a.before.median)} before,{" "}
              {valueOf(a.metric, a.after.median)} after ({stats(a)}).
            </Typography>
            {shared.length > 0 && (
              <div className="alert-shared">
                <Typography variant="body-sm" render={<h3 />}>
                  What the affected scenes share
                </Typography>
                <ul>
                  {shared.map((x) => (
                    <li key={x.attribute}>
                      <Typography variant="body-sm">
                        <b>{x.attribute}</b>: {Math.round(x.inside * 100)}% of
                        affected scenes, {Math.round(x.outside * 100)}% of all
                      </Typography>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {many && (
              <div className="alert-scenes">
                <Table size="small" aria-label="Affected scenes">
                  <TableHead>
                    <TableRow>
                      <TableCell>Scene</TableCell>
                      <TableCell className="num">Change</TableCell>
                      <TableCell className="num">Before</TableCell>
                      <TableCell className="num">After</TableCell>
                      <TableCell className="num">p</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {g.alerts.map((x) => (
                      <TableRow key={x.id}>
                        <TableCell>{x.title}</TableCell>
                        <TableCell
                          className={`num ${
                            x.kind === "regression" ? "worse" : "better"
                          }`}
                        >
                          {x.change > 1 ? "up" : "down"} {pct(x.change)}
                        </TableCell>
                        <TableCell className="num">
                          {valueOf(x.metric, x.before.median)}
                        </TableCell>
                        <TableCell className="num">
                          {valueOf(x.metric, x.after.median)}
                        </TableCell>
                        <TableCell className="num">{x.p.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <form className="alert-triage" onSubmit={(e) => void submit(e)}>
            <Typography variant="body-sm" render={<h3 />}>
              Triage
            </Typography>
            <Choice
              label="Status"
              value={form.status}
              options={ALERT_STATES.map((s) => [s, stateLabel(s)] as const)}
              onChange={(v) => setForm({ ...form, status: v })}
            />
            <TextField
              label="Owner"
              size="small"
              value={form.owner}
              autoComplete="off"
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
            <TextField
              label="Note"
              size="small"
              multiline
              minRows={2}
              value={form.note}
              placeholder="What caused it, or a link to the issue"
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
            <div className="alert-save">
              <Button type="submit" color="primary" loading={saving}>
                Save triage
              </Button>
              <Typography
                variant="body-sm"
                color={saved === "failed" ? "error" : "textSecondary"}
                aria-live="polite"
              >
                {saved === "saved"
                  ? "Saved"
                  : saved === "failed"
                    ? "Not saved"
                    : ""}
              </Typography>
            </div>
          </form>
        </div>

        <nav className="alert-links" aria-label="Look closer">
          <Link
            render={
              <RouterLink
                to="/compare"
                search={{
                  a: a.range.from.run,
                  b: a.range.to.run,
                  config: a.config,
                }}
              />
            }
          >
            Compare the runs before and after
          </Link>
          <Link
            render={
              <RouterLink to="/runs/$run" params={{ run: a.range.to.run }} />
            }
          >
            Report of the run after
          </Link>
          <Link
            render={
              <RouterLink
                to="/trends"
                search={{ scene: many ? "*" : a.scene, cand: a.config }}
              />
            }
          >
            Open in Trends
          </Link>
        </nav>
      </CardContent>
    </Card>
  );
}
