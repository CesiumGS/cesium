import "./results.css";
import {
  Button,
  Checkbox,
  IconButton,
  InputAdornment,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { Icon } from "@stratakit/mui";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import {
  type MouseEvent,
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { short, type Summary } from "../data.ts";
import { Page, useRuns, useStored } from "./common.tsx";
import {
  Change,
  dateOf,
  headline,
  pairOf,
  sceneCount,
  Status,
  VerdictStatus,
  verdictOf,
} from "./runParts.tsx";

/**
 * Runs (DESIGN.md): every run with its commit, note, hardware, verdict
 * and headline changes (candidate over baseline, geometric mean across
 * scenes), searchable and sortable (the sort is remembered per viewer).
 * A run opens its report; two selected runs open Compare.
 */

const route = getRouteApi("/runs");

type Headline = ReturnType<typeof headline>;
interface Row {
  s: Summary;
  cpu: Headline;
  settle: Headline;
  frame: Headline;
  scenes: number;
  text: string;
}

type SortKey = "when" | "cpu" | "settle" | "frame";
const SORTS: Record<SortKey, (r: Row) => number | string> = {
  when: (r) => r.s.date,
  cpu: (r) => r.cpu.ratio ?? NaN,
  settle: (r) => r.settle.ratio ?? NaN,
  frame: (r) => r.frame.ratio ?? NaN,
};
const CHANGE_COLUMNS: Array<[Exclude<SortKey, "when">, string]> = [
  ["cpu", "CPU per frame"],
  ["settle", "Time to settle"],
  ["frame", "Frame p95"],
];

export function Runs() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const setSearch = route.useNavigate();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const sortHint = useId();
  const query = useDeferredValue((search.q ?? "").trim().toLowerCase());
  const [sort, setSort] = useStored<{ key: SortKey; descending: boolean }>(
    "dyno.runsSort",
    { key: "when", descending: true },
  );
  // Up to two runs to compare, in the order they were picked.
  const [selected, setSelected] = useState<string[]>([]);

  const data = useMemo<Row[]>(
    () =>
      summaries.map((s) => ({
        s,
        cpu: headline(s, "cpuP50"),
        settle: headline(s, "settleMs"),
        frame: headline(s, "frameP95"),
        scenes: sceneCount(s),
        text: `${s.note ?? ""} ${s.subject ?? ""} ${s.tags.join(" ")} ${s.commit} ${s.branch ?? ""} ${s.hardware} ${s.configs.join(" ")}`.toLowerCase(),
      })),
    [summaries],
  );
  const rows = useMemo(() => {
    const value = SORTS[sort.key] ?? SORTS.when;
    return data
      .filter((r) => !query || r.text.includes(query))
      .sort((a, b) => {
        const x = value(a);
        const y = value(b);
        // Runs without a value go last either way.
        if (typeof x === "number" && Number.isNaN(x)) {
          return typeof y === "number" && Number.isNaN(y) ? 0 : 1;
        }
        if (typeof y === "number" && Number.isNaN(y)) {
          return -1;
        }
        const order = x < y ? -1 : x > y ? 1 : 0;
        return sort.descending ? -order : order;
      });
  }, [data, query, sort]);

  const toggle = (name: string) =>
    setSelected((now) =>
      now.includes(name)
        ? now.filter((n) => n !== name)
        : [...now, name].slice(-2),
    );
  // Older run as the baseline, newer as the candidate.
  const pair = selected
    .map((n) => summaries.find((s) => s.name === n)!)
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));
  const open = (e: MouseEvent, name: string) => {
    // Clicks on the row's own controls and links do their own thing.
    if ((e.target as Element).closest("a, button, input, label")) {
      return;
    }
    void navigate({ to: "/runs/$run", params: { run: name } });
  };
  const sortBy = (key: SortKey) =>
    setSort(
      sort.key === key
        ? { key, descending: !sort.descending }
        : { key, descending: key === "when" },
    );
  const header = (key: SortKey, label: string, align?: "right") => {
    const on = sort.key === key;
    const direction = on && sort.descending ? "desc" : "asc";
    return (
      <TableCell key={key} align={align} sortDirection={on ? direction : false}>
        <TableSortLabel
          active={on}
          direction={on ? direction : key === "when" ? "desc" : "asc"}
          onClick={() => sortBy(key)}
          aria-describedby={sortHint}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    );
  };

  return (
    <Page
      className="res-runs"
      title="Runs"
      description="Every run of the suite: open one for its report, or select two to compare."
      help={
        <>
          <p>
            Changes are each run's candidate configuration over its baseline
            (usually 2.0 over 1.x), as a geometric mean across scenes. Hover a
            change for the raw ratio.
          </p>
          <p>
            Notes and tags come from <code>--note</code> and <code>--tag</code>{" "}
            when running the suite. The verdict is the run's scorecard: its
            primary metric and guardrails.
          </p>
        </>
      }
      actions={
        <>
          <Typography
            variant="body-sm"
            color="textSecondary"
            className="res-select-hint"
            aria-live="polite"
          >
            {selected.length === 0
              ? "Select two runs to compare"
              : selected.length === 1
                ? "Select one more run"
                : "2 runs selected"}
          </Typography>
          {selected.length > 0 && (
            <Button variant="text" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          )}
          <Button
            color="primary"
            disabled={pair.length !== 2}
            onClick={() =>
              void navigate({
                to: "/compare",
                search: { a: pair[0]!.name, b: pair[1]!.name },
              })
            }
          >
            Compare runs
          </Button>
        </>
      }
      toolbar={
        <>
          <TextField
            type="search"
            size="small"
            label={<span className="res-visually-hidden">Search runs</span>}
            placeholder="Search notes, tags, commits, hardware"
            value={search.q ?? ""}
            inputRef={input}
            onChange={(e) =>
              void setSearch({
                search: { q: e.target.value || undefined },
                replace: true,
              })
            }
            className="res-search"
            slotProps={{
              input: {
                endAdornment: search.q ? (
                  <InputAdornment position="end">
                    <IconButton
                      label="Clear search"
                      size="small"
                      onClick={() => {
                        void setSearch({ search: {}, replace: true });
                        input.current?.focus();
                      }}
                    >
                      <Icon href={svgDismiss} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <Typography variant="body-sm" color="textSecondary">
            {rows.length === data.length
              ? `${data.length} runs`
              : `${rows.length} of ${data.length} runs`}
          </Typography>
        </>
      }
    >
      <span hidden id={sortHint}>
        change sort
      </span>
      {rows.length === 0 ? (
        <Typography variant="body-md" color="textSecondary" render={<p />}>
          No run matches “{search.q}”. Search looks in notes, tags, commit
          subjects and hashes, branches, hardware and configurations.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" className="res-table">
            <caption className="res-visually-hidden">
              Runs, {selected.length} of 2 selected for comparison
            </caption>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <span className="res-visually-hidden">Compare</span>
                </TableCell>
                {header("when", "When")}
                <TableCell>Note</TableCell>
                <TableCell>Commit</TableCell>
                <TableCell>Setup</TableCell>
                <TableCell>Verdict</TableCell>
                {CHANGE_COLUMNS.map(([key, label]) =>
                  header(key, label, "right"),
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const { s } = r;
                const on = selected.includes(s.name);
                const { base, cand } = pairOf(s);
                return (
                  <TableRow
                    key={s.name}
                    selected={on}
                    onClick={(e) => open(e, s.name)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={on}
                        onChange={() => toggle(s.name)}
                        slotProps={{
                          input: {
                            "aria-label": `Select the run of ${dateOf(s)} to compare`,
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell
                      render={<th scope="row" />}
                      className="res-nowrap"
                    >
                      <Link
                        render={
                          <RouterLink
                            to="/runs/$run"
                            params={{ run: s.name }}
                          />
                        }
                        title={s.date}
                      >
                        {dateOf(s)}
                      </Link>
                    </TableCell>
                    <TableCell className="res-note">
                      <div className="res-clamp">
                        {s.note || s.subject || (
                          <span className="none">No note</span>
                        )}
                      </div>
                      {(s.tags.length > 0 || !!s.sweep) && (
                        <Typography
                          variant="caption-md"
                          color="textSecondary"
                          render={<div />}
                        >
                          {[
                            ...new Set([
                              ...(s.sweep ? ["sweep"] : []),
                              ...s.tags,
                            ]),
                          ].join(", ")}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell className="res-nowrap">
                      <span className="res-mono" title={s.commit}>
                        {short(s)}
                      </span>
                      <Typography
                        variant="caption-md"
                        color="textSecondary"
                        render={<div />}
                        className="res-ellipsis"
                        title={s.branch}
                      >
                        {s.branch ?? ""}
                      </Typography>
                    </TableCell>
                    <TableCell className="res-setup">
                      {cand ? `${cand} vs ${base}` : base}
                      <Typography
                        variant="caption-md"
                        color="textSecondary"
                        render={<div />}
                        title={[s.hardware, s.browser]
                          .filter(Boolean)
                          .join(", ")}
                      >
                        {r.scenes} {r.scenes === 1 ? "scene" : "scenes"} ×{" "}
                        {s.repetitions} {s.repetitions === 1 ? "rep" : "reps"} ·{" "}
                        {s.hardware}
                      </Typography>
                    </TableCell>
                    <TableCell className="res-nowrap">
                      {s.sweep ? (
                        <Status tone="info">Sweep</Status>
                      ) : (
                        <VerdictStatus verdict={verdictOf(s)} />
                      )}
                    </TableCell>
                    {CHANGE_COLUMNS.map(([key]) => (
                      <TableCell key={key} align="right" className="num">
                        <Change
                          ratio={r[key].ratio}
                          detail={`geometric mean of ${r[key].scenes} scenes`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Page>
  );
}
