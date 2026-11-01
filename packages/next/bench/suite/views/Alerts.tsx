import {
  Badge,
  Button,
  Flex,
  SegmentedControl,
  Table,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import {
  type FormEvent,
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
import {
  Chart,
  Chips,
  Choice,
  Empty,
  Lede,
  toast,
  useRuns,
} from "./common.tsx";

/**
 * Dyno's alerts (plan §16.9, Detect), after Perfherder's sheriffing: every
 * significant change point across runs (changepoints.mjs) as an alert with
 * its commit range, the series around it, and a triage state (new,
 * acknowledged, expected, invalid, fixed) with an owner and a note, saved
 * beside the results. New regressions come first.
 */

interface Triage {
  status: string;
  owner?: string;
  note?: string;
  updated?: string;
}
type TriageFile = Record<string, Triage>;
type Kind = NonNullable<AlertsSearch["kind"]>;

const TRIAGE_URL = "/bench-results/triage.json";
const INFO = new Map(
  [...METRICS, ...CONDITION_METRICS].map((m) => [m[0], m] as const),
);
const DEFAULT_SHOWN = ["new", "acknowledged"];

/** A scene and scenario's attributes, for "what differs". */
function attributes(key: string): string[] {
  const [id, scenario = "cold-orbit"] = key.split("|");
  const scene = catalog.scenes.find((s) => s.id === id);
  if (!scene) {
    return [`scenario: ${scenario}`];
  }
  const kinds = scene.layers.map(
    (l) => catalog.datasets.find((d) => d.id === l.dataset)?.kind ?? "?",
  );
  return [
    `scenario: ${scenario}`,
    `group ${scene.group}`,
    `globe: ${typeof scene.globe === "object" ? "terrain" : scene.globe}`,
    scene.imagery ? "with imagery" : "no imagery",
    ...new Set(kinds.map((k) => `content: ${k}`)),
    scene.layers.length > 1 ? "several layers" : "one layer",
  ];
}

/**
 * What the affected scenes share (Honeycomb BubbleUp): attributes much
 * more common among them than among every scene measured.
 */
function whatDiffers(affected: string[], all: string[]): string[] {
  if (affected.length < 2 || all.length <= affected.length) {
    return [];
  }
  const share = (keys: string[], attr: string) =>
    keys.filter((k) => attributes(k).includes(attr)).length / keys.length;
  const attrs = new Set(affected.flatMap(attributes));
  return [...attrs]
    .map((a) => ({ a, inside: share(affected, a), outside: share(all, a) }))
    .filter((x) => x.inside - x.outside >= 0.3)
    .sort((x, y) => y.inside - y.outside - (x.inside - x.outside))
    .slice(0, 4)
    .map(
      (x) =>
        `${x.a}: ${Math.round(x.inside * 100)}% of affected scenes vs ${Math.round(x.outside * 100)}% of all`,
    );
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
      `${new Date(s.date).toLocaleDateString()} · ${s.commit.slice(0, 7)}${s.note ? ` · ${s.note}` : ""}`,
    );
  }
  const [, , unit, scale] = INFO.get(a.metric) ?? [a.metric, a.metric, "", 1];
  return lineChart({
    title: "Series",
    xLabel: "run",
    unit,
    xNames: names,
    series: [
      {
        label: a.config,
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
 * direction, configuration, hardware, commit range) across the scenes it
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
const pctOf = (change: number) =>
  `${change > 1 ? "+" : ""}${((change - 1) * 100).toFixed(1)}%`;

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

  // Computed once the triage has loaded, so "Loading…" paints first.
  const ready = triage !== undefined;
  const alerts = useMemo(
    () => (ready ? detectAlerts(summaries, ALERT_METRICS) : []),
    [ready, summaries],
  );

  // The list is filtered and ordered by the triage as it was when the
  // filters last changed: a card stays in place after its triage is saved
  // (with "Saved" beside it) until the kind or states change.
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

  return (
    <div className="alerts">
      <Lede>
        Found with E-Divisive means and a permutation test (p &lt; 0.05) per
        scene, configuration and hardware, grouped per change.{" "}
        <code>cli.mjs alerts --fail-on-new</code> fails a nightly job on
        untriaged regressions.
      </Lede>
      <Flex align="center" gap="3" wrap="wrap" mb="3">
        <SegmentedControl.Root
          size="1"
          value={kind}
          aria-label="Kind"
          onValueChange={(v) =>
            navigate({
              search: (prev) => ({
                ...prev,
                kind: v === "regression" ? undefined : (v as Kind),
              }),
              replace: true,
            })
          }
        >
          <SegmentedControl.Item value="regression">
            Regressions
          </SegmentedControl.Item>
          <SegmentedControl.Item value="improvement">
            Improvements
          </SegmentedControl.Item>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
        </SegmentedControl.Root>
        <Chips
          label="States"
          options={ALERT_STATES.map((s) => [s, s] as const)}
          value={shown}
          onChange={setShown}
        />
        {ready && (
          <Text size="2" color="gray">
            {list.length} changes (
            {list.reduce((n, g) => n + g.alerts.length, 0)} of {alerts.length}{" "}
            alerts)
          </Text>
        )}
      </Flex>
      {triage === undefined ? (
        <Lede>Computing change points…</Lede>
      ) : !alerts.length ? (
        <Empty title="No change points yet.">
          Alerts need at least 6 runs of a scene on the same hardware; run the
          suite a few more times:{" "}
          <code>node packages/next/bench/suite/cli.mjs run</code>
        </Empty>
      ) : !list.length ? (
        <Empty title="Nothing in this view.">
          Turn on more states above, or pick another kind.
        </Empty>
      ) : (
        list.map((g) => (
          <AlertCard
            key={g.key}
            group={g}
            status={groupStatus(triage, g)}
            triage={triage[g.lead.id]}
            summaries={summaries}
            save={save}
          />
        ))
      )}
    </div>
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
  const [, name] = INFO.get(a.metric) ?? [a.metric, a.metric];
  const changes = g.alerts.map((x) => x.change);
  const span =
    g.alerts.length > 1
      ? `${pctOf(Math.min(...changes))} to ${pctOf(Math.max(...changes))}`
      : pctOf(a.change);

  const differs = useMemo(() => {
    const all = [
      ...new Set(
        summaries
          .filter((s) => s.hardware === a.hardware)
          .flatMap((s) =>
            s.scenes.filter((c) => c.config === a.config).map(cellKey),
          ),
      ),
    ];
    return whatDiffers(
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
  const [saved, setSaved] = useState("");
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
    setSaved(ok ? "Saved" : "Not saved");
    toast(
      ok
        ? `Alert ${entry.status}${g.alerts.length > 1 ? ` (${g.alerts.length} scenes)` : ""}`
        : "Could not save: is the dev server running?",
      ok ? "good" : "bad",
    );
  };

  const at = (x: { commit: string; subject?: string; date: string }) => (
    <>
      <code>{x.commit.slice(0, 7)}</code> {x.subject ?? ""}{" "}
      <span className="muted">({new Date(x.date).toLocaleString()})</span>
    </>
  );
  const stats = (x: Alert) =>
    `p ${x.p.toFixed(3)} · ${x.before.runs} runs before, ${x.after.runs} after`;

  return (
    <article className={`alert ${a.kind}`}>
      <header>
        <span className="kind">
          {a.kind === "regression" ? "▲ Regression" : "▼ Improvement"}
        </span>
        <b>
          {name} {span}
        </b>{" "}
        <span>
          {a.config} ·{" "}
          {g.alerts.length === 1 ? a.title : `${g.alerts.length} scenes`}
        </span>
        <span className="muted">
          {a.hardware} ·{" "}
          <Badge
            size="1"
            variant="soft"
            color={status === "new" ? undefined : "gray"}
            className="status-tag"
          >
            {status}
          </Badge>
        </span>
      </header>
      <div className="range">
        Between {at(a.range.from)} and {at(a.range.to)}
      </div>
      {differs.length > 0 && (
        <div className="differs">
          <b>What the affected scenes share:</b> {differs.join(" · ")}
        </div>
      )}
      {g.alerts.length > 1 ? (
        <details className="scenes">
          <summary>Scenes (largest change first)</summary>
          <Table.Root size="1" variant="ghost">
            <Table.Body>
              {g.alerts.map((x) => (
                <Table.Row key={x.id}>
                  <Table.Cell>{x.title}</Table.Cell>
                  <Table.Cell>{pctOf(x.change)}</Table.Cell>
                  <Table.Cell className="muted">{stats(x)}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </details>
      ) : (
        <div className="muted">{stats(a)}</div>
      )}
      <div className="body">
        <div className="chart">
          <Chart html={chart} />
          {g.alerts.length > 1 && (
            <div className="muted">
              Series of {a.title}, the largest change.
            </div>
          )}
        </div>
        <form className="triage" onSubmit={(e) => void submit(e)}>
          <label>
            Status
            <Choice
              label="Status"
              value={form.status}
              options={ALERT_STATES}
              onChange={(v) => setForm({ ...form, status: v })}
            />
          </label>
          <label>
            Owner
            <TextField.Root
              size="2"
              value={form.owner}
              autoComplete="off"
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            />
          </label>
          <label>
            Note
            <TextArea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
          <div className="row">
            <Button type="submit" size="2" loading={saving}>
              Save
            </Button>
            <Text
              size="2"
              color={saved === "Not saved" ? "red" : "gray"}
              aria-live="polite"
            >
              {saved}
            </Text>
          </div>
          <div className="row links">
            <Button asChild size="1" variant="soft" color="gray">
              <Link to="/report" search={{ run: a.range.to.run }}>
                Report after the change
              </Link>
            </Button>
            <Button asChild size="1" variant="soft" color="gray">
              <Link
                to="/compare"
                search={{
                  a: a.range.from.run,
                  b: a.range.to.run,
                  config: a.config,
                }}
              >
                Compare the two runs
              </Link>
            </Button>
            <Button asChild size="1" variant="soft" color="gray">
              <Link
                to="/workspace"
                search={{
                  scene: g.alerts.length > 1 ? "*" : a.scene,
                  cand: a.config,
                }}
              >
                Open in the workspace
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </article>
  );
}
