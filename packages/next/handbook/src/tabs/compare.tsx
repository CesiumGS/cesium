import { TextField } from "@mui/material";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
  API_GROUPS,
  API_ROWS,
  type ApiGap,
  isBreaking,
  type ApiRow,
} from "../apiMap.ts";
import { count, data } from "../data.ts";
import { C, CodeBlock, Note, Page, Section, Written } from "../parts.tsx";
import { snippetText, TASKS } from "../snippets.ts";

/** A row's kind: its status, with "not in 2.0" split by why. */
type Kind =
  | "later"
  | "unknown"
  | "design"
  | "changed"
  | "renamed"
  | "covered"
  | "same"
  | "new";

const KINDS: { id: Kind; label: string; short: string; mark: string }[] = [
  { id: "later", label: "Not built yet", short: "Not built yet", mark: "○" },
  {
    id: "unknown",
    label: "Not built, no plan says",
    short: "No plan says",
    mark: "?",
  },
  { id: "design", label: "Gone by design", short: "By design", mark: "×" },
  {
    id: "changed",
    label: "Changed behaviour",
    short: "Changed",
    mark: "≠",
  },
  { id: "renamed", label: "Renamed", short: "Renamed", mark: "→" },
  {
    id: "covered",
    label: "Covered another way",
    short: "Covered",
    mark: "≈",
  },
  { id: "same", label: "Same", short: "Same", mark: "=" },
  { id: "new", label: "New in 2.0", short: "New", mark: "+" },
];

const kindOf = (row: ApiRow): Kind =>
  row.status === "absent" ? (row.gap ?? "unknown") : row.status;

const rowsOf = (kind: Kind) => API_ROWS.filter((r) => kindOf(r) === kind);

/** What a row with no 2.0 names says on that side, when it says nothing else. */
const NO_NAMES: Record<ApiGap, string> = {
  later: "Not built yet",
  unknown: "Not built, and no plan says",
  design: "Gone by design",
};

/** A row's 1.x names, with its family spelled out. */
function oldNames(row: ApiRow): string[] {
  const named = (row.old ?? []).map((n) => n.split(".")[0]!);
  const family = row.family ? new RegExp(row.family) : undefined;
  const members = family ? data.oneX.names.filter((n) => family.test(n)) : [];
  return [...new Set([...named, ...members])];
}

/** How 1.x's public names fall across the mapping. */
function share() {
  const known = new Set(data.oneX.names);
  const mapped = new Set<string>();
  const counterpart = new Set<string>();
  for (const row of API_ROWS) {
    for (const name of oldNames(row)) {
      if (known.has(name)) {
        mapped.add(name);
        if (row.status !== "absent") {
          counterpart.add(name);
        }
      }
    }
  }
  // A name with no counterpart counts once, under its first row's reason.
  const gaps: Record<ApiGap, Set<string>> = {
    design: new Set(),
    later: new Set(),
    unknown: new Set(),
  };
  const counted = new Set<string>();
  for (const row of API_ROWS) {
    if (row.gap) {
      for (const name of oldNames(row)) {
        if (mapped.has(name) && !counterpart.has(name) && !counted.has(name)) {
          counted.add(name);
          gaps[row.gap].add(name);
        }
      }
    }
  }
  return {
    total: data.oneX.total,
    mapped: mapped.size,
    counterpart: counterpart.size,
    absent: mapped.size - counterpart.size,
    design: gaps.design.size,
    later: gaps.later.size,
    unknown: gaps.unknown.size,
    missing: data.oneX.names.filter((n) => !mapped.has(n)),
  };
}

function Badge({ row }: { row: ApiRow }) {
  const kind = KINDS.find((k) => k.id === kindOf(row))!;
  return (
    <span className={`api-badge api-${kind.id}`}>
      <span aria-hidden="true">{kind.mark}</span> {kind.label}
    </span>
  );
}

/** A note's `backticks` as code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(`[^`]+`)/)
        .map((part, i) =>
          part.startsWith("`") ? (
            <C key={i}>{part.slice(1, -1)}</C>
          ) : (
            <Fragment key={i}>{part}</Fragment>
          ),
        )}
    </>
  );
}

/** A 2.0 name, with the entry point it's imported from. */
function Name({ name }: { name: string }) {
  const [entry, bare] = name.includes(":")
    ? name.split(":")
    : [undefined, name];
  return (
    <span className="api-name">
      <C>{bare}</C>
      {entry ? <span className="api-entry">/{entry}</span> : null}
    </span>
  );
}

function Names({
  names,
  more,
  moreLabel,
}: {
  names: readonly string[];
  more?: readonly string[];
  moreLabel?: string;
}) {
  const shown = names.slice(0, 6);
  const rest = [...names.slice(6), ...(more ?? [])];
  return (
    <>
      <span className="api-names-list">
        {shown.map((n) => (
          <Name name={n} key={n} />
        ))}
      </span>
      {rest.length > 0 ? (
        <details className="api-more">
          <summary>{moreLabel ?? `and ${count(rest.length)} more`}</summary>
          <span className="api-names-list">
            {rest.map((n) => (
              <Name name={n} key={n} />
            ))}
          </span>
        </details>
      ) : null}
    </>
  );
}

function Row({ row }: { row: ApiRow }) {
  const named = row.old ?? [];
  const known = new Set(named.map((n) => n.split(".")[0]!));
  const family = oldNames(row).filter((n) => !known.has(n));
  const nextWords =
    row.nextLabel ??
    (row.gap && (row.next ?? []).length === 0 ? NO_NAMES[row.gap] : undefined);
  return (
    <tr className={`api-row api-edge-${row.status}`}>
      <td data-label="1.x">
        <Names
          names={named}
          more={family}
          {...(row.familyLabel
            ? { moreLabel: `${row.familyLabel}: ${count(family.length)}` }
            : {})}
        />
      </td>
      <td data-label="2.0">
        {nextWords ? (
          <p className="api-next">
            <Inline text={nextWords} />
          </p>
        ) : null}
        <Names
          names={row.next ?? []}
          more={row.supporting ?? []}
          moreLabel={`and ${count((row.supporting ?? []).length)} related names`}
        />
      </td>
      <td data-label="Status">
        <Badge row={row} />
      </td>
      <td data-label="What changes">
        <Inline text={row.note} />
        {row.inFlight ? (
          <p className="api-flight">
            <strong>Under way, not merged:</strong>{" "}
            <Inline text={row.inFlight} />
          </p>
        ) : null}
        {row.source ? <p className="api-source">{row.source}</p> : null}
        {row.snippet ? (
          <p className="api-source">
            <a
              href={`#task-${row.snippet}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(`task-${row.snippet}`)
                  ?.scrollIntoView();
              }}
            >
              See it side by side
            </a>
          </p>
        ) : null}
      </td>
    </tr>
  );
}

type Filter = Kind | "breaking" | "all";

const matches = (row: ApiRow, filter: Filter) =>
  filter === "all" ||
  (filter === "breaking" ? isBreaking(row) : kindOf(row) === filter);

function Summary({
  filter,
  group,
  choose,
}: {
  filter: Filter;
  group: string;
  choose: (filter: Filter, group: string) => void;
}) {
  const cell = (id: string, status: Kind) =>
    API_ROWS.filter((r) => r.group === id && kindOf(r) === status).length;
  return (
    <div
      className="table-wrap"
      tabIndex={0}
      role="group"
      aria-label="Rows of the comparison by group and status"
    >
      <table className="api-matrix">
        <thead>
          <tr>
            <th scope="col">Group</th>
            {KINDS.map((s) => (
              <th scope="col" key={s.id}>
                <span className={`api-badge api-${s.id}`}>
                  <span aria-hidden="true">{s.mark}</span> {s.short}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {API_GROUPS.map((g) => (
            <tr key={g.id}>
              <th scope="row">{g.title}</th>
              {KINDS.map((s) => {
                const n = cell(g.id, s.id);
                return (
                  <td key={s.id}>
                    {n > 0 ? (
                      <button
                        type="button"
                        className={`api-count api-${s.id}`}
                        aria-pressed={filter === s.id && group === g.id}
                        aria-label={`${g.title}, ${s.label}: ${n}`}
                        onClick={() => {
                          choose(s.id, g.id);
                          document.getElementById("api-rows")?.scrollIntoView();
                        }}
                      >
                        {n}
                      </button>
                    ) : (
                      <span className="api-zero" aria-label="None">
                        –
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Task({ id }: { id: string }) {
  const task = TASKS.find((t) => t.id === id)!;
  const group = API_GROUPS.find((g) => g.id === task.group)!;
  const old = snippetText(`${id}.1x.txt`);
  const next = task.noNext ? "" : snippetText(`${id}.next.ts`);
  return (
    <section className="task" id={`task-${id}`}>
      <h3>{task.title}</h3>
      <p>
        {task.note} <span className="api-source">In: {group.title}.</span>
      </p>
      <div className="task-sides">
        <div>
          <p className="task-side">1.x</p>
          <CodeBlock language="js" code={old} />
        </div>
        <div>
          <p className="task-side">2.0</p>
          {task.noNext ? (
            <div className="task-none">{task.noNext}</div>
          ) : (
            <CodeBlock language="ts" code={next} />
          )}
        </div>
      </div>
    </section>
  );
}

export function Compare() {
  const [filter, setFilter] = useState<Filter>("breaking");
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const s = useMemo(share, []);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return API_ROWS.filter(
      (row) =>
        matches(row, filter) &&
        (group === "all" || row.group === group) &&
        (q === "" ||
          [
            ...oldNames(row),
            ...(row.next ?? []),
            ...(row.supporting ?? []),
            row.note,
          ].some((text) => text.toLowerCase().includes(q))),
    );
  }, [filter, group, query]);
  const breaking = API_ROWS.filter(isBreaking).length;
  const percent = Math.round((100 * s.mapped) / s.total);
  const choices: { id: Filter; label: ReactNode; n: number }[] = [
    { id: "breaking", label: "Breaking", n: breaking },
    ...KINDS.map((st) => ({
      id: st.id as Filter,
      label: (
        <>
          <span aria-hidden="true">{st.mark}</span> {st.label}
        </>
      ),
      n: rowsOf(st.id).length,
    })),
    { id: "all", label: "All", n: API_ROWS.length },
  ];
  return (
    <Page
      title="1.x to 2.0 API"
      status="current"
      lede={
        <>
          Code written against CesiumJS {data.oneX.version} won't run on 2.0
          without changes. {count(breaking)} of the {count(API_ROWS.length)}{" "}
          areas below break it, and the overall shape changes: picks and queries
          are asynchronous, math is typed arrays, and Entities and DataSources
          aren't built.
        </>
      }
    >
      <Section title="The picture">
        <ul className="api-stats">
          <li>
            <strong>{count(s.counterpart)}</strong> of 1.x's {count(s.total)}{" "}
            public names have a 2.0 counterpart, and nearly all of those work
            differently
          </li>
          <li>
            <strong>{count(s.absent)}</strong> aren't in 2.0: {count(s.later)}{" "}
            not built yet, {count(s.design)} by design, and {count(s.unknown)}{" "}
            where no plan says
          </li>
          <li>
            <strong>{percent}%</strong> of 1.x's public names have a row here (
            {count(s.mapped)} of {count(s.total)}). Many share a row with their
            family, so a row isn't a study of each name
          </li>
        </ul>
        <Summary
          filter={filter}
          group={group}
          choose={(f, g) => {
            setFilter(f);
            setGroup(g);
          }}
        />
        <p className="provenance">
          Counts are rows of the mapping below. 1.x's names come from its source
          at version {data.oneX.version}, leaving out what its docs mark
          private; 2.0's come from <C>api/surface.txt</C>. A test fails when a
          2.0 name here no longer exists, or an exported one has no row. The
          mapping itself is by hand, in <C>handbook/src/apiMap.ts</C>.
        </p>
        <Note title="What the gaps mean">
          <ul>
            <li>
              <strong>Not built yet:</strong> a plan or spec leaves it for
              later, or says how it would go in. That isn't a promise that it
              will be built.
            </li>
            <li>
              <strong>Not built, no plan says:</strong> it isn't in 2.0, and no
              plan or spec says what happens to it.
            </li>
            <li>
              <strong>Gone by design:</strong> a plan chooses not to have it.
            </li>
            <li>
              <strong>Covered another way:</strong> 2.0 can do this today, in a
              different form. Your code still changes.
            </li>
          </ul>
        </Note>
      </Section>

      <Section title="Every area, breaking changes first">
        <div className="api-filters" id="api-rows">
          <div className="api-chips" role="group" aria-label="Filter by status">
            {choices.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`api-chip${c.id !== "breaking" && c.id !== "all" ? ` api-${c.id}` : ""}`}
                aria-pressed={filter === c.id}
                onClick={() => setFilter(c.id)}
              >
                {c.label} ({c.n})
              </button>
            ))}
          </div>
          <div className="api-fields">
            <TextField
              select
              size="small"
              label="Group"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              slotProps={{ select: { native: true } }}
            >
              <option value="all">All groups</option>
              {API_GROUPS.map((g) => (
                <option value={g.id} key={g.id}>
                  {g.title}
                </option>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Search names and notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span aria-live="polite">
              {shown.length} of {API_ROWS.length} rows
            </span>
          </div>
        </div>
        {shown.length > 0 ? (
          <div className="api-table-wrap">
            <table className="api-table">
              <thead>
                <tr>
                  <th scope="col">1.x</th>
                  <th scope="col">2.0</th>
                  <th scope="col">Status</th>
                  <th scope="col">What changes for you</th>
                </tr>
              </thead>
              {API_GROUPS.filter((g) =>
                shown.some((r) => r.group === g.id),
              ).map((g) => (
                <tbody key={g.id}>
                  <tr className="api-group">
                    <th colSpan={4} scope="colgroup">
                      {g.title}
                    </th>
                  </tr>
                  {KINDS.flatMap((kind) =>
                    shown.filter(
                      (r) => r.group === g.id && kindOf(r) === kind.id,
                    ),
                  ).map((row) => (
                    <Row row={row} key={row.note} />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        ) : (
          <p>
            No row matches. Try <strong>All</strong>, or a shorter search.
          </p>
        )}
        <Written
          from={
            <>
              the code under <C>src/</C> and <C>widgets/</C>, 1.x's source, and
              the plans each row cites
            </>
          }
          on="2026-11-08"
        />
      </Section>

      <Section title="The same task, side by side">
        <p>
          Each 2.0 side compiles against the real types as part of a test, so it
          fails when the API changes. Each 1.x side has its names checked
          against 1.x's source. The ion token is a placeholder.
        </p>
        {TASKS.map((t) => (
          <Task id={t.id} key={t.id} />
        ))}
      </Section>
    </Page>
  );
}
