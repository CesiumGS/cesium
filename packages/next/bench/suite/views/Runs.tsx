import { Code, Flex, Table, Text, TextField } from "@radix-ui/themes";
import {
  CaretDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useMemo } from "react";
import { ratio } from "../stats.mjs";
import { cellKey, geomean, short, type Summary, when } from "../data.ts";
import { Lede, useRuns, useStored } from "./common.tsx";
import { FirstRun } from "./FirstRun.tsx";

/**
 * Runs, the experiment log (plan §16.9): every run with its commit, note,
 * hardware and headline ratios (candidate over baseline, geometric mean
 * across scenes), searchable and sortable; a row opens the run's report.
 */

const route = getRouteApi("/runs");

/** Candidate over baseline for one run and metric (geomean of scenes). */
function headline(s: Summary, key: string): number | undefined {
  const base = s.baseline ?? (s.configs.includes("1.x") ? "1.x" : s.configs[0]);
  const cand = s.candidate ?? s.configs.find((c) => c !== base);
  if (!cand) {
    return undefined;
  }
  const ratios: number[] = [];
  for (const cell of s.scenes.filter((c) => c.config === cand)) {
    const b = s.scenes.find(
      (c) => cellKey(c) === cellKey(cell) && c.config === base,
    );
    const r =
      b && ratio(b.metrics[key]?.values ?? [], cell.metrics[key]?.values ?? []);
    if (r?.value) {
      ratios.push(r.value);
    }
  }
  return geomean(ratios);
}

function Ratio({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return <Text color="gray">–</Text>;
  }
  const better = value < 0.95;
  const worse = value > 1.05;
  return (
    <Text color={better ? "green" : worse ? "red" : "gray"}>
      {better ? "▼ " : worse ? "▲ " : ""}×{value.toFixed(2)}
    </Text>
  );
}

interface Row {
  s: Summary;
  cpu?: number;
  settle?: number;
  frame?: number;
  text: string;
}
const COLUMNS: Array<[string, string, (r: Row) => number | string]> = [
  ["when", "When", (r) => r.s.date],
  ["cpu", "CPU / frame", (r) => r.cpu ?? Infinity],
  ["settle", "Settle", (r) => r.settle ?? Infinity],
  ["frame", "Frame p95", (r) => r.frame ?? Infinity],
];

export function Runs() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const setSearch = route.useNavigate();
  const navigate = useNavigate();
  const query = useDeferredValue((search.q ?? "").trim().toLowerCase());
  const [sort, setSort] = useStored("dyno.runsSort", {
    key: "when",
    descending: true,
  });

  const data = useMemo<Row[]>(
    () =>
      summaries.map((s) => ({
        s,
        cpu: headline(s, "cpuP50"),
        settle: headline(s, "settleMs"),
        frame: headline(s, "frameP95"),
        text: `${s.note ?? ""} ${s.subject ?? ""} ${s.tags.join(" ")} ${s.commit} ${s.branch ?? ""} ${s.hardware}`.toLowerCase(),
      })),
    [summaries],
  );
  const rows = useMemo(() => {
    const value = (COLUMNS.find((c) => c[0] === sort.key) ?? COLUMNS[0]!)[2];
    return data
      .filter((r) => !query || r.text.includes(query))
      .sort((a, b) => {
        const x = value(a);
        const y = value(b);
        const order = x < y ? -1 : x > y ? 1 : 0;
        return sort.descending ? -order : order;
      });
  }, [data, query, sort]);

  if (!summaries.length) {
    return <FirstRun />;
  }
  const open = (name: string) =>
    void navigate({ to: "/report", search: { run: name } });
  const header = (key: string) => {
    const [, label] = COLUMNS.find((c) => c[0] === key)!;
    const on = sort.key === key;
    return (
      <Table.ColumnHeaderCell
        justify={key === "when" ? "start" : "end"}
        aria-sort={on ? (sort.descending ? "descending" : "ascending") : "none"}
      >
        <button
          className="sort"
          onClick={() =>
            setSort(
              on
                ? { key, descending: !sort.descending }
                : { key, descending: key === "when" },
            )
          }
        >
          {label}
          {on ? sort.descending ? <CaretDownIcon /> : <CaretUpIcon /> : null}
        </button>
      </Table.ColumnHeaderCell>
    );
  };
  return (
    <>
      <Lede>
        Ratios are each run's candidate over its baseline (geometric mean across
        scenes; ▼ better, ▲ worse). Notes and tags come from <Code>--note</Code>{" "}
        and <Code>--tag</Code>; click a row for its report, a column heading to
        sort.
      </Lede>
      <Flex gap="3" align="center" mb="3">
        <TextField.Root
          type="search"
          placeholder="Search notes, tags, commits, hardware"
          aria-label="Search runs"
          value={search.q ?? ""}
          onChange={(e) =>
            void setSearch({
              search: { q: e.target.value || undefined },
              replace: true,
            })
          }
          style={{ minWidth: 320 }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
        <Text size="2" color="gray">
          {rows.length} of {data.length} runs
        </Text>
      </Flex>
      <Table.Root variant="surface" size="1" className="runs-table">
        <Table.Header>
          <Table.Row>
            {header("when")}
            <Table.ColumnHeaderCell>Commit</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Note</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Hardware</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell justify="end">
              Scenes × configs × reps
            </Table.ColumnHeaderCell>
            {header("cpu")}
            {header("settle")}
            {header("frame")}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map(({ s, cpu, settle, frame }) => (
            <Table.Row
              key={s.name}
              className="clickable"
              tabIndex={0}
              onClick={() => open(s.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  open(s.name);
                }
              }}
            >
              <Table.Cell>{when(s)}</Table.Cell>
              <Table.Cell>
                <Code variant="ghost">{short(s)}</Code>
                <Text as="div" size="1" color="gray">
                  {s.branch ?? ""}
                </Text>
              </Table.Cell>
              <Table.Cell>
                {s.note || s.subject || ""}
                {s.tags.length > 0 && (
                  <Text as="div" size="1" color="gray">
                    {s.tags.join(", ")}
                  </Text>
                )}
              </Table.Cell>
              <Table.Cell>
                {s.hardware}
                <Text as="div" size="1" color="gray">
                  {s.browser ?? ""}
                </Text>
              </Table.Cell>
              <Table.Cell justify="end">
                {new Set(s.scenes.map((c) => cellKey(c))).size} ×{" "}
                {s.configs.join(", ")} × {s.repetitions}
              </Table.Cell>
              <Table.Cell justify="end">
                <Ratio value={cpu} />
              </Table.Cell>
              <Table.Cell justify="end">
                <Ratio value={settle} />
              </Table.Cell>
              <Table.Cell justify="end">
                <Ratio value={frame} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </>
  );
}
