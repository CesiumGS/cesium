import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  SegmentedControl,
  Slider,
  Text,
  TextField,
} from "@radix-ui/themes";
import { CheckIcon, Cross2Icon, GlobeIcon } from "@radix-ui/react-icons";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { Json } from "../data.ts";
import { Chips, Choice, Empty, Field, toast, Toolbar } from "./common.tsx";
import "./images.css";

/**
 * Dyno's Images view (plan §16.10), after Chromatic and Skia Gold: an
 * image-check run's changed and new checks first, as a queue; the
 * selected check with its baseline and new image side by side, a swipe,
 * a flicker toggle and the FLIP heatmap (and 1.x when the run checked
 * parity), approved or rejected here. Approving copies the image into
 * the baselines (the dev server, vite.config.ts).
 */

const ORDER = ["changed", "new", "timeout", "error", "pass", "unsupported"];
const SHOWN = ["changed", "new", "timeout", "error"];
const TONE: Record<string, "red" | "blue" | "green" | "gray"> = {
  changed: "red",
  error: "red",
  timeout: "red",
  new: "blue",
  pass: "green",
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

/** What the viewer saw happen to a check here (this page only). */
interface Outcome {
  ok: boolean;
  decision: string;
  message: string;
}

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

  if (index?.error) {
    return (
      <Empty title="Could not read the image checks.">{index.error}</Empty>
    );
  }
  if (!runs) {
    return <Text color="gray">Loading image checks…</Text>;
  }
  if (!runs.length) {
    return (
      <Empty title="No image checks yet.">
        Run <code>node packages/next/bench/suite/cli.mjs images --parity</code>{" "}
        (<code>--parity</code> compares with 1.x; <code>--update</code> approves
        the first baselines).
      </Empty>
    );
  }

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  // An explicitly picked check stays open even when filtered out.
  const selected = rows.find((r) => r.key === search.check) ?? visible[0];
  const pick = (key: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, check: key }), replace: true });

  return (
    <div className="images">
      <Toolbar>
        <Field label="Run">
          <Choice
            value={runName}
            options={runs}
            onChange={(r) =>
              navigate({
                search: (prev) => ({ ...prev, run: r, check: undefined }),
                replace: true,
              })
            }
          />
        </Field>
        <Chips
          label="Statuses shown"
          options={ORDER.map((s) => [s, s] as const)}
          value={shown}
          onChange={setShown}
        />
        {run ? (
          <Text size="2" color="gray">
            {run.rendererClass} · {new Date(run.date).toLocaleString()} ·{" "}
            {run.commit.slice(0, 7)}
            {run.dirty ? "*" : ""} · {count("pass")} unchanged,{" "}
            {count("changed")} changed, {count("new")} new,{" "}
            {count("unsupported")} unsupported
          </Text>
        ) : null}
      </Toolbar>
      {current?.error ? (
        <Empty title="Could not read this run.">{current.error}</Empty>
      ) : !run ? (
        <Text color="gray">Loading {runName}…</Text>
      ) : !visible.length && !selected ? (
        <Empty title="Nothing in this view.">
          {count("pass")
            ? `${count("pass")} checks unchanged; show "pass" to see them.`
            : "Show more statuses above."}
        </Empty>
      ) : (
        <Grid
          columns={{ initial: "1", lg: "minmax(220px, 300px) minmax(0, 1fr)" }}
          gap="3"
          align="start"
        >
          <nav className="queue" aria-label="Checks">
            {visible.map((row) => (
              <Card
                key={row.key}
                asChild
                size="1"
                className="queue-item"
                aria-current={row.key === selected?.key}
              >
                <button type="button" onClick={() => pick(row.key)}>
                  <Flex gap="2" align="center" mb="1">
                    <StatusBadge status={row.status} />
                    {outcomes[row.key]?.ok || row.review ? (
                      <Text size="1" color="gray">
                        {outcomes[row.key]?.decision ?? row.review.decision}d
                      </Text>
                    ) : null}
                  </Flex>
                  <Text as="div" size="2" weight="medium" truncate>
                    {row.title}
                  </Text>
                  <Text as="div" size="1" color="gray" truncate>
                    {row.id} · {row.config}
                    {row.flip ? ` · FLIP ${row.flip.mean.toFixed(4)}` : ""}
                  </Text>
                </button>
              </Card>
            ))}
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
        </Grid>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge color={TONE[status] ?? "gray"} variant="soft">
      {status}
    </Badge>
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
      ? ([["parity", `vs ${row.parity.config}`]] as Array<[Mode, string]>)
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
      : "Could not save: is the dev server running?";
    onOutcome({ ok, decision, message });
    toast(`${row.id}: ${message}`, ok ? "good" : "bad");
  };

  const reviewed = outcome
    ? outcome.message
    : row.review
      ? `${row.review.decision}d by ${row.review.by} ${new Date(row.review.at).toLocaleString()}${row.review.note ? `: ${row.review.note}` : ""}`
      : row.approved
        ? "approved"
        : "";

  return (
    <Card size="2" asChild>
      <article>
        <Flex gap="3" align="baseline" wrap="wrap" mb="2">
          <StatusBadge status={row.status} />
          <Text weight="bold">{row.title}</Text>
          <Text size="2" color="gray">
            {row.id} · {row.config}
          </Text>
          {row.flip ? (
            <Text size="2">
              FLIP {row.flip.mean.toFixed(4)} mean · {row.flip.p95.toFixed(4)}{" "}
              p95
            </Text>
          ) : null}
          {row.parity ? (
            <Text size="2" color="gray">
              parity vs {row.parity.config}: {row.parity.mean.toFixed(3)} mean{" "}
              {row.parity.within ? "✓ within §4 L2" : "✕ outside §4 L2"}
            </Text>
          ) : null}
          {row.message ? (
            <Text size="2" color="gray">
              {row.message}
            </Text>
          ) : null}
        </Flex>
        {now ? (
          <>
            <SegmentedControl.Root
              size="1"
              value={mode}
              onValueChange={(m) => setMode(m as Mode)}
              aria-label="View"
            >
              {modes.map(([m, label]) => (
                <SegmentedControl.Item key={m} value={m}>
                  {label}
                </SegmentedControl.Item>
              ))}
            </SegmentedControl.Root>
            <div className="viewer">
              {mode === "side" ? (
                <div className="side">
                  {before ? (
                    <figure>
                      <img src={before} alt="Baseline" />
                      <figcaption>
                        Baseline
                        {row.baseline?.approvedAt
                          ? ` · ${new Date(row.baseline.approvedAt).toLocaleDateString()}`
                          : ""}
                      </figcaption>
                    </figure>
                  ) : null}
                  <figure>
                    <img src={now} alt="New image" />
                    <figcaption>New</figcaption>
                  </figure>
                </div>
              ) : mode === "swipe" ? (
                <Swipe before={before} now={now} />
              ) : mode === "flicker" ? (
                <Flicker before={before} now={now} />
              ) : mode === "diff" ? (
                <div className="diff">
                  <img src={heat} alt="FLIP heatmap" />
                  <Text as="div" size="1" color="gray">
                    FLIP error per pixel (black none, yellow large).
                  </Text>
                </div>
              ) : (
                <div className="side">
                  <figure>
                    <img src={parity} alt="1.x" />
                    <figcaption>{row.parity.config}</figcaption>
                  </figure>
                  <figure>
                    <img src={parityHeat} alt="Parity heatmap" />
                    <figcaption>FLIP against it</figcaption>
                  </figure>
                </div>
              )}
            </div>
          </>
        ) : null}
        <Flex gap="2" align="center" wrap="wrap" mt="2">
          {row.image && row.status !== "pass" ? (
            <>
              <Box minWidth="240px">
                <TextField.Root
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why (optional)"
                  aria-label="Reason"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !saving) {
                      void review("approve");
                    }
                  }}
                />
              </Box>
              <Button disabled={saving} onClick={() => void review("approve")}>
                <CheckIcon />
                {row.status === "new"
                  ? "Approve as baseline"
                  : "Approve change"}
              </Button>
              <Button
                variant="soft"
                color="red"
                disabled={saving}
                onClick={() => void review("reject")}
              >
                <Cross2Icon />
                Reject
              </Button>
            </>
          ) : null}
          <Button variant="soft" color="gray" asChild>
            <Link to="/explorer" search={{ scene: row.scene, t: row.progress }}>
              <GlobeIcon />
              Open in the explorer
            </Link>
          </Button>
          <Text
            size="2"
            color={outcome && !outcome.ok ? "red" : "gray"}
            aria-live="polite"
          >
            {reviewed}
          </Text>
        </Flex>
      </article>
    </Card>
  );
}

/** The new image over the baseline, revealed from the slider rightward. */
function Swipe({ before, now }: { before: string; now: string }) {
  const [at, setAt] = useState(50);
  return (
    <div className="swipe">
      <div className="stack">
        <img src={before} alt="Baseline" />
        <div className="top" style={{ clipPath: `inset(0 0 0 ${at}%)` }}>
          <img src={now} alt="New image" />
        </div>
      </div>
      <Box maxWidth="960px" mt="2">
        <Slider
          size="1"
          value={[at]}
          onValueChange={([v]) => setAt(v ?? 50)}
          min={0}
          max={100}
          aria-label="Swipe between baseline and new"
        />
      </Box>
    </div>
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
  return (
    <div className="flicker">
      <img
        src={hold || on ? now : before}
        alt="Flicker between baseline and new"
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
      />
      <Text as="div" size="1" color="gray">
        Alternating baseline and new; hover to hold the new image.
      </Text>
    </div>
  );
}
