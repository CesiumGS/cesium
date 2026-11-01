import {
  Badge,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { svgCheckmark } from "@stratakit/icons/checkmark";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgGlobe } from "@stratakit/icons/globe";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import type { Json } from "../data.ts";
import { engineLabel } from "../engines.mjs";
import { Chips, Choice, Empty, Page, toast } from "./common.tsx";
import "./images.css";

/**
 * Dyno's Images view (DESIGN.md: Images), after Chromatic and Skia Gold:
 * an image-check run's changed and new checks first, as a queue; the
 * selected check with its baseline and new image side by side, a swipe,
 * a flicker toggle and the FLIP heatmap (and 1.x when the run checked
 * parity), approved or rejected here. Approving copies the image into
 * the baselines (the dev server, vite.config.ts).
 */

const ORDER = ["changed", "new", "timeout", "error", "pass", "unsupported"];
const SHOWN = ["changed", "new", "timeout", "error"];
/** Each status as a word and a color (never color alone). */
const STATUS: Record<
  string,
  [string, "error" | "warning" | "info" | "success" | "secondary"]
> = {
  changed: ["Changed", "error"],
  new: ["New", "info"],
  timeout: ["Timed out", "warning"],
  error: ["Error", "error"],
  pass: ["Unchanged", "success"],
  unsupported: ["Unsupported", "secondary"],
};

const route = getRouteApi("/images");

/** A fetch's result for one key (a run name), so a new key reads as loading. */
type Loaded<T> = { key: string; value?: T; error?: string };

async function json(url: string): Promise<Json> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`${url}: ${r.status}`);
  }
  return r.json();
}

/** A run's date from its file name ("2026-11-01T06-22-49-259Z.json"). */
function runDate(name: string): Date | undefined {
  const iso = name
    .replace(/\.json$/, "")
    .replace(/T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z$/, "T$1:$2:$3.$4Z");
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
const listDate = (d: Date) =>
  d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const runLabel = (name: string) => {
  const d = runDate(name);
  return d ? listDate(d) : name;
};

/** What the viewer saw happen to a check here (this page only). */
interface Outcome {
  ok: boolean;
  decision: string;
  message: string;
}

const HELP = (
  <>
    <p>
      Image checks render each scene at fixed places on its camera path and
      compare the result with the approved baseline for this GPU class, using
      FLIP (0 identical, 1 completely different).
    </p>
    <p>
      <b>Changed</b> checks differ from their baseline beyond the threshold;
      <b> new</b> checks have no baseline yet. Approving makes the new image the
      baseline; rejecting records that the change needs a fix.
    </p>
    <p>
      Run checks with{" "}
      <code>node packages/next/bench/suite/cli.mjs images --parity</code>;{" "}
      <code>--parity</code> also compares 2.0 with 1.x.
    </p>
  </>
);

export function Images() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/images" });
  const [index, setIndex] = useState<Loaded<string[]>>();
  const [loaded, setLoaded] = useState<Loaded<Json>>();
  const [shown, setShown] = useState<string[]>(SHOWN);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});

  useEffect(() => {
    let cancelled = false;
    json("/bench-results/images/index.json").then(
      (i: { runs: string[] }) => {
        if (!cancelled) {
          setIndex({ key: "", value: i.runs });
        }
      },
      (e: unknown) => {
        if (!cancelled) {
          setIndex({ key: "", error: String(e) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const runs = index?.value;
  const runName =
    search.run && runs?.includes(search.run) ? search.run : runs?.[0];

  useEffect(() => {
    if (!runName) {
      return;
    }
    let cancelled = false;
    json(`/bench-results/images/${runName}`).then(
      (run) => {
        if (!cancelled) {
          setLoaded({ key: runName, value: run });
        }
      },
      (e: unknown) => {
        if (!cancelled) {
          setLoaded({ key: runName, error: String(e) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [runName]);

  const current = loaded?.key === runName ? loaded : undefined;
  const run: Json = current?.value;
  const rows: Json[] = useMemo(() => run?.checks ?? [], [run]);
  const visible = useMemo(
    () =>
      rows
        .filter((r) => shown.includes(r.status))
        .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status)),
    [rows, shown],
  );

  const page = (children: ReactNode, toolbar?: ReactNode) => (
    <Page
      className="image-checks"
      title="Images"
      description="Image checks that changed or are new, to approve or reject."
      help={HELP}
      toolbar={toolbar}
    >
      {children}
    </Page>
  );

  if (index?.error) {
    return page(
      <Empty title="Could not read the image checks.">
        {index.error}. Check that the dev server is running and the results
        directory is readable.
      </Empty>,
    );
  }
  if (!runs) {
    return page(<Loading text="Loading image checks…" />);
  }
  if (!runs.length) {
    return page(
      <Empty title="No image checks yet.">
        Run <code>node packages/next/bench/suite/cli.mjs images --parity</code>{" "}
        (<code>--update</code> approves the first baselines).
      </Empty>,
    );
  }

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  // An explicitly picked check stays open even when filtered out.
  const selected = rows.find((r) => r.key === search.check) ?? visible[0];
  const pick = (key: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, check: key }), replace: true });
  const date = run ? new Date(run.date) : undefined;

  const toolbar = (
    <>
      <Choice
        label="Run"
        value={runName}
        minWidth={200}
        options={runs.map((r) => [r, runLabel(r)] as const)}
        onChange={(r) =>
          navigate({
            search: (prev) => ({ ...prev, run: r, check: undefined }),
            replace: true,
          })
        }
      />
      <Chips
        label="Statuses shown"
        options={ORDER.map(
          (s) =>
            [
              s,
              run ? `${STATUS[s]![0]} (${count(s)})` : STATUS[s]![0],
            ] as const,
        )}
        value={shown}
        onChange={setShown}
      />
      {run && date ? (
        <Tooltip title={run.date}>
          <Typography variant="body-sm" color="textSecondary">
            {run.rendererClass} · {run.commit.slice(0, 7)}
            {run.dirty ? "*" : ""}
            {run.subject ? ` · ${run.subject}` : ""}
          </Typography>
        </Tooltip>
      ) : null}
    </>
  );

  return page(
    current?.error ? (
      <Empty title="Could not read this run.">
        {current.error}. Pick another run, or run the image checks again.
      </Empty>
    ) : !run ? (
      <Loading text={`Loading the run of ${runLabel(runName!)}…`} />
    ) : !visible.length && !selected ? (
      <Empty title="Nothing to review in this run.">
        {count("pass")
          ? `${count("pass")} ${count("pass") === 1 ? "check is" : "checks are"} unchanged; show “Unchanged” to see them.`
          : "Show more statuses above."}
      </Empty>
    ) : (
      <div className="image-checks-layout">
        <nav className="image-checks-queue" aria-label="Checks">
          <Typography variant="caption-lg" color="textSecondary" render={<p />}>
            {visible.length} {visible.length === 1 ? "check" : "checks"}
          </Typography>
          <List dense disablePadding>
            {visible.map((row) => {
              const outcome = outcomes[row.key];
              const decided = outcome?.ok
                ? outcome.decision
                : row.review?.decision;
              return (
                <ListItemButton
                  key={row.key}
                  selected={row.key === selected?.key}
                  aria-current={row.key === selected?.key ? "true" : undefined}
                  onClick={() => void pick(row.key)}
                  className="image-checks-item"
                >
                  <span className="image-checks-item-top">
                    <StatusBadge status={row.status} />
                    {decided ? (
                      <Typography variant="caption-lg" color="textSecondary">
                        {decided === "approve" ? "Approved" : "Rejected"}
                      </Typography>
                    ) : null}
                  </span>
                  <Typography
                    variant="body-md"
                    className="image-checks-item-title"
                  >
                    {row.title}
                  </Typography>
                  <Typography
                    variant="caption-lg"
                    color="textSecondary"
                    className="image-checks-item-meta"
                  >
                    {row.id} · {engineLabel(row.config)}
                    {row.flip ? ` · FLIP ${row.flip.mean.toFixed(3)}` : ""}
                  </Typography>
                </ListItemButton>
              );
            })}
          </List>
        </nav>
        {selected ? (
          <Check
            key={`${runName}|${selected.key}`}
            runName={runName!}
            run={run}
            row={selected}
            outcome={outcomes[selected.key]}
            onOutcome={(o) =>
              setOutcomes((prev) => ({ ...prev, [selected.key]: o }))
            }
          />
        ) : null}
      </div>
    ),
    toolbar,
  );
}

function Loading({ text }: { text: string }) {
  return (
    <div className="image-checks-loading" role="status">
      <CircularProgress size={16} />
      <Typography variant="body-md" color="textSecondary">
        {text}
      </Typography>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const [word, color] = STATUS[status] ?? [status, "secondary"];
  return (
    <Badge variant="inline" size="small" color={color} badgeContent={word} />
  );
}

type Mode = "side" | "swipe" | "flicker" | "diff" | "parity";

/** One check: its numbers, the viewer and the review. */
function Check({
  runName,
  run,
  row,
  outcome,
  onOutcome,
}: {
  runName: string;
  run: Json;
  row: Json;
  outcome: Outcome | undefined;
  onOutcome: (o: Outcome) => void;
}) {
  const now: string = row.image ? run.assets + row.image : "";
  const before: string = row.baseline ? run.baselines + row.baseline.file : "";
  const heat: string = row.heatmap ? run.assets + row.heatmap : "";
  const parity: string = row.parity ? run.assets + row.parity.image : "";
  const parityHeat: string = row.parity ? run.assets + row.parity.heatmap : "";
  const modes: Array<[Mode, string]> = [
    ...(before
      ? ([
          ["side", "Side by side"],
          ["swipe", "Swipe"],
          ["flicker", "Flicker"],
          ...(heat ? [["diff", "Difference"]] : []),
        ] as Array<[Mode, string]>)
      : ([["side", "New image"]] as Array<[Mode, string]>)),
    ...(parity
      ? ([["parity", `Against ${engineLabel(row.parity.config)}`]] as Array<
          [Mode, string]
        >)
      : []),
  ];
  const [mode, setMode] = useState<Mode>("side");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const review = async (decision: "approve" | "reject") => {
    setSaving(true);
    let ok = false;
    try {
      const res = await fetch("/bench-results/images/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run: runName, key: row.key, decision, note }),
      });
      ok = res.ok;
    } catch {
      // Network error: reported below like a failed save.
    }
    setSaving(false);
    const message = ok
      ? decision === "approve"
        ? "Approved: the new image is the baseline."
        : "Rejected: the change needs a fix."
      : "Could not save the review. Check that the dev server is running, then try again.";
    onOutcome({ ok, decision, message });
    toast(`${row.id}: ${message}`, ok ? "good" : "bad");
  };

  const reviewed = outcome
    ? outcome.message
    : row.review
      ? `${row.review.decision === "approve" ? "Approved" : "Rejected"} by ${row.review.by}, ${listDate(new Date(row.review.at))}${row.review.note ? `: ${row.review.note}` : ""}`
      : row.approved
        ? "Approved."
        : "";
  const reviewable = row.image && row.status !== "pass";

  return (
    <article className="image-check" aria-labelledby="image-check-title">
      <header className="image-check-header">
        <div className="image-check-heading">
          <StatusBadge status={row.status} />
          <Typography
            variant="subtitle-lg"
            render={<h2 />}
            id="image-check-title"
          >
            {row.title}
          </Typography>
        </div>
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          {row.id} · {engineLabel(row.config)}
          {row.flip ? (
            <>
              {" · "}
              <Tooltip title="FLIP against the baseline: 0 identical, 1 completely different">
                <span className="num">
                  FLIP {row.flip.mean.toFixed(4)} mean,{" "}
                  {row.flip.p95.toFixed(4)} p95
                </span>
              </Tooltip>
            </>
          ) : null}
          {row.message ? ` · ${row.message}` : ""}
        </Typography>
        {row.parity ? (
          <Typography variant="body-sm" color="textSecondary" render={<p />}>
            Parity with {engineLabel(row.parity.config)}: FLIP{" "}
            <span className="num">{row.parity.mean.toFixed(3)}</span> mean,{" "}
            <span className={row.parity.within ? "better" : "worse"}>
              {row.parity.within ? "within" : "outside"} the parity threshold
            </span>
          </Typography>
        ) : null}
      </header>

      {now ? (
        <>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, m: Mode | null) => {
              if (m) {
                setMode(m);
              }
            }}
            aria-label="Compare by"
            className="image-check-modes"
          >
            {modes.map(([m, label]) => (
              <ToggleButton
                key={m}
                value={m}
                render={<Button variant="outlined" size="small" />}
              >
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <div className="image-check-viewer">
            {mode === "side" ? (
              <div className="image-check-side">
                {before ? (
                  <figure>
                    <img src={before} alt="Baseline" />
                    <figcaption>
                      Baseline
                      {row.baseline?.approvedAt
                        ? `, approved ${listDate(new Date(row.baseline.approvedAt))}`
                        : ""}
                    </figcaption>
                  </figure>
                ) : null}
                <figure>
                  <img src={now} alt="New image" />
                  <figcaption>New image</figcaption>
                </figure>
              </div>
            ) : mode === "swipe" ? (
              <Swipe before={before} now={now} />
            ) : mode === "flicker" ? (
              <Flicker before={before} now={now} />
            ) : mode === "diff" ? (
              <figure className="image-check-single">
                <img src={heat} alt="FLIP heatmap against the baseline" />
                <figcaption>
                  FLIP error per pixel: black none, yellow large.
                </figcaption>
              </figure>
            ) : (
              <div className="image-check-side">
                <figure>
                  <img src={parity} alt={engineLabel(row.parity.config)} />
                  <figcaption>{engineLabel(row.parity.config)}</figcaption>
                </figure>
                <figure>
                  <img src={parityHeat} alt="FLIP heatmap against it" />
                  <figcaption>
                    FLIP against {engineLabel(row.parity.config)}
                  </figcaption>
                </figure>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="image-check-review">
        {reviewable ? (
          <>
            <TextField
              size="small"
              label="Reason (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !saving) {
                  void review("approve");
                }
              }}
              className="image-check-reason"
            />
            <Button
              color="primary"
              disabled={saving}
              onClick={() => void review("approve")}
              startIcon={<Icon href={svgCheckmark} />}
            >
              {row.status === "new" ? "Approve as baseline" : "Approve change"}
            </Button>
            <Button
              variant="outlined"
              disabled={saving}
              onClick={() => void review("reject")}
              startIcon={<Icon href={svgDismiss} />}
            >
              Reject
            </Button>
          </>
        ) : null}
        <Button
          variant="text"
          render={
            <Link
              to="/explorer"
              search={{ scene: row.scene, t: row.progress }}
            />
          }
          nativeButton={false}
          startIcon={<Icon href={svgGlobe} />}
        >
          Open in the explorer
        </Button>
        {saving ? <CircularProgress size={16} aria-label="Saving" /> : null}
      </div>
      <Typography
        variant="body-sm"
        render={<p />}
        className={`image-check-outcome ${outcome && !outcome.ok ? "worse" : ""}`}
        aria-live="polite"
      >
        {reviewed}
      </Typography>
    </article>
  );
}

/** The new image over the baseline, revealed from the slider rightward. */
function Swipe({ before, now }: { before: string; now: string }) {
  const [at, setAt] = useState(50);
  return (
    <figure className="image-check-single">
      <div className="image-check-stack">
        <img src={before} alt="Baseline" />
        <div
          className="image-check-top"
          style={{ clipPath: `inset(0 0 0 ${at}%)` }}
        >
          <img src={now} alt="New image" />
        </div>
      </div>
      <Slider
        size="small"
        value={at}
        onChange={(_, v) => setAt(v as number)}
        min={0}
        max={100}
        aria-label="Swipe between the baseline and the new image"
        getAriaValueText={(v) => `${v}% baseline`}
      />
      <figcaption>
        Baseline on the left of the line, new image on the right.
      </figcaption>
    </figure>
  );
}

/** Baseline and new alternating every half second; hover holds the new. */
function Flicker({ before, now }: { before: string; now: string }) {
  const [on, setOn] = useState(false);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold) {
      return;
    }
    const timer = window.setInterval(() => setOn((x) => !x), 500);
    return () => clearInterval(timer);
  }, [hold]);
  const showing = hold || on ? "New image" : "Baseline";
  return (
    <figure className="image-check-single">
      <img
        src={hold || on ? now : before}
        alt={`Flicker between the baseline and the new image (now: ${showing})`}
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
      />
      <figcaption>
        {showing}. Alternates every half second; hover to hold the new image.
      </figcaption>
    </figure>
  );
}
