import "./workHealth.css";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgCheckmark } from "@stratakit/icons/checkmark";
import { svgCopy } from "@stratakit/icons/copy";
import { Icon } from "@stratakit/mui";
import { createContext, Fragment, useContext, useMemo } from "react";
import { toast } from "../toast.ts";
import {
  HEALTH_KIND_DEFS,
  HEALTH_KINDS,
  type HealthException,
  type HealthKind,
  healthInScope,
  healthOf,
  type Words,
} from "../workHealth.ts";
import {
  ItemRef,
  KindMark,
  ReservedText,
  type WorkViewDef,
  type WorkViewProps,
} from "./Work.tsx";

/** Each entity's title, so every ID the view shows carries it. */
const TitleContext = createContext<ReadonlyMap<string, string>>(new Map());

/** The release filter's value for every exception. */
const ALL = "all";

const SORT_WORDS: Record<"graph" | "signal" | "hitld", string> = {
  graph: "Graph rule: hitld work check will enforce it",
  signal: "Judgment signal",
  hitld: "Reported by hitld work check",
};

/**
 * The Health view (CS-745; DESIGN.md, "The Health view"): what is wrong in
 * the work graph, each with a proposed fix. It reads the whole graph,
 * proposals included, and leads with what needs the owner. Nothing is
 * applied from the page: a row copies a command or opens the file to edit.
 */
export function HealthView(p: WorkViewProps) {
  const { s, scoped, items, msInScope, selected, search } = p;
  const h = useMemo(() => healthOf(s), [s]);
  const titles = useMemo(
    () =>
      new Map(
        [...s.items, ...s.milestones, ...s.projects].map((x) => [
          x.id,
          x.title,
        ]),
      ),
    [s],
  );
  const inScope = useMemo(() => {
    const ids = new Set(items.map((i) => i.id));
    return (id: string) => ids.has(id) || msInScope(id);
  }, [items, msInScope]);
  const inView = scoped ? healthInScope(h, inScope) : h.exceptions;
  const filter =
    search.release && h.releases.some((r) => r.id === search.release)
      ? search.release
      : ALL;
  const shown =
    filter === ALL ? inView : inView.filter((e) => e.releases.includes(filter));
  const mine = shown.filter((e) => e.owner).length;
  const byKind = new Map<HealthKind, HealthException[]>();
  for (const e of shown) {
    byKind.set(e.kind, [...(byKind.get(e.kind) ?? []), e]);
  }
  // Kinds that find something, those that need the owner first.
  const found = HEALTH_KINDS.filter((k) => byKind.has(k)).sort(
    (a, b) =>
      Number(HEALTH_KIND_DEFS[b].owner) - Number(HEALTH_KIND_DEFS[a].owner),
  );
  const shortOf = new Map(h.releases.map((r) => [r.id, r.short]));
  const unread = new Map(h.unread.map((u) => [u.kind, u.why]));
  const clean = HEALTH_KINDS.filter((k) => !byKind.has(k) && !unread.has(k));
  const cleanTitle =
    filter === ALL
      ? "Nothing is wrong in the graph"
      : `Nothing touching ${h.releases.find((r) => r.id === filter)!.short} is wrong`;

  return (
    <TitleContext.Provider value={titles}>
      <div className="work-health">
        <div className="work-health-head">
          <div className="work-health-figures" aria-live="polite">
            <p className="work-health-figure">
              <span className={`work-health-num${shown.length ? " warn" : ""}`}>
                {shown.length}
              </span>
              <ReservedText
                className="work-health-unit"
                value={shown.length === 1 ? "exception" : "exceptions"}
                options={["exception", "exceptions"]}
              />
            </p>
            <p className="work-health-figure">
              <span className="work-health-num">{mine}</span>
              <ReservedText
                className="work-health-unit"
                value={mine === 1 ? "needs you" : "need you"}
                options={["needs you", "need you"]}
              />
            </p>
            <p className="work-health-figure">
              <span className="work-health-num">{shown.length - mine}</span>
              <span className="work-health-unit">for the run</span>
            </p>
          </div>
          <ReleaseFilter
            value={filter}
            releases={h.releases}
            counts={(id) =>
              id === ALL
                ? inView.length
                : inView.filter((e) => e.releases.includes(id)).length
            }
            onChange={(v) =>
              p.set({ release: v === ALL ? undefined : v }, true)
            }
          />
          <Typography
            variant="caption-md"
            color="textSecondary"
            render={<p />}
            className="work-health-note"
          >
            The whole graph, proposals included
            {scoped ? ", narrowed to the scope" : ""}. Nothing is changed from
            here: each fix says what to edit, and copies a command where one
            does it.
          </Typography>
        </div>

        <div className="work-dash">
          {found.length === 0 && (
            <section
              className="work-card span-12 work-health-clean-all"
              aria-labelledby="work-health-clean-h"
            >
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-health-clean-h"
              >
                {cleanTitle}
              </Typography>
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
              >
                None of the checks below finds an exception
                {scoped ? " in the scope" : ""}.
              </Typography>
            </section>
          )}

          {found.map((k) => (
            <KindSection
              key={k}
              kind={k}
              list={byKind.get(k)!}
              selected={selected}
              openItem={p.openItem}
              shortOf={shortOf}
            />
          ))}

          <section
            className="work-card span-12 work-health-checks"
            aria-labelledby="work-health-checks-h"
          >
            <header className="work-card-head">
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-health-checks-h"
              >
                {found.length ? "The other checks" : "The checks"}
              </Typography>
            </header>
            {clean.length > 0 && (
              <>
                <Typography
                  variant="caption-md"
                  color="textSecondary"
                  render={<h3 />}
                  className="work-health-checks-h"
                >
                  Clean
                </Typography>
                <ul className="work-health-clean">
                  {clean.map((k) => (
                    <li key={k} title={HEALTH_KIND_DEFS[k].rule}>
                      <Icon href={svgCheckmark} className="work-health-ok" />
                      <span>{HEALTH_KIND_DEFS[k].name}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {unread.size > 0 && (
              <>
                <Typography
                  variant="caption-md"
                  color="textSecondary"
                  render={<h3 />}
                  className="work-health-checks-h"
                >
                  Can't tell yet
                </Typography>
                <ul className="work-health-unread">
                  {[...unread].map(([k, why]) => (
                    <li key={k}>
                      <span className="work-health-unread-name">
                        {HEALTH_KIND_DEFS[k].name}
                      </span>
                      <span className="work-health-unread-why">{why}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </TitleContext.Provider>
  );
}

/** All, then each open release with its count: which exceptions show. */
function ReleaseFilter({
  value,
  releases,
  counts,
  onChange,
}: {
  value: string;
  releases: ReadonlyArray<{ id: string; short: string; proposed: boolean }>;
  counts: (id: string) => number;
  onChange: (v: string) => void;
}) {
  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={value}
      onChange={(_, v: string | null) => v && onChange(v)}
      aria-label="Exceptions touching a release"
      className="work-health-filter"
    >
      <ToggleButton
        value={ALL}
        aria-label={`Every exception, ${counts(ALL)}`}
        render={<Button variant="outlined" size="small" />}
      >
        All
        <span className="work-health-filter-n">{counts(ALL)}</span>
      </ToggleButton>
      {releases.map((r) => (
        <ToggleButton
          key={r.id}
          value={r.id}
          className={r.proposed ? "proposed" : undefined}
          aria-label={`Touching ${r.short}${r.proposed ? ", proposed" : ""}, ${counts(r.id)}`}
          render={
            <Button
              variant="outlined"
              size="small"
              title={`The exceptions that touch ${r.short}: its crossings, and those among its milestones`}
            />
          }
        >
          <KindMark kind="release" named={false} />
          {r.short}
          <span className="work-health-filter-n">{counts(r.id)}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** One kind's exceptions: its rule, whose they are, and a row each. */
function KindSection({
  kind,
  list,
  selected,
  openItem,
  shortOf,
}: {
  kind: HealthKind;
  list: readonly HealthException[];
  selected?: string;
  openItem: (id: string) => void;
  shortOf: ReadonlyMap<string, string>;
}) {
  const def = HEALTH_KIND_DEFS[kind];
  const hId = `work-health-${kind}-h`;
  return (
    <section className="work-card span-12" aria-labelledby={hId}>
      <header className="work-card-head work-health-kind-head">
        <span className="work-card-titles">
          <span className="work-health-kind-line">
            <span className="work-health-count" aria-hidden="true">
              {list.length}
            </span>
            <Typography variant="subtitle-md" render={<h2 />} id={hId}>
              <span className="visually-hidden">{list.length} </span>
              {def.name}
            </Typography>
            <span
              className={`work-health-who${def.owner ? " owner" : ""}`}
              title={
                def.owner
                  ? "The fix changes scope or a release: it is yours, and counts in Your move"
                  : "The run or the orchestrator can fix it: it doesn't count in Your move"
              }
            >
              {def.owner ? "Needs you" : "For the run"}
            </span>
          </span>
          <Typography variant="caption-md" color="textSecondary">
            {def.rule}{" "}
            <span className="work-health-sort">· {SORT_WORDS[def.sort]}</span>
          </Typography>
        </span>
      </header>
      <ul className="work-health-rows">
        {list.map((e) => (
          <Row
            key={e.key}
            e={e}
            selected={selected === e.id || selected === e.edit}
            openItem={openItem}
            shortOf={shortOf}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({
  e,
  selected,
  openItem,
  shortOf,
}: {
  e: HealthException;
  selected: boolean;
  openItem: (id: string) => void;
  /** Each release's short name: "beta.1". */
  shortOf: ReadonlyMap<string, string>;
}) {
  const known = /^CS-\d+$/.test(e.id);
  const titles = useContext(TitleContext);
  return (
    <li className={`work-health-row${selected ? " selected" : ""}`}>
      <div className="work-health-row-head">
        {known ? (
          <ItemRef
            id={e.id}
            title={titles.get(e.id)}
            className="work-health-entity"
          />
        ) : (
          <span className="work-health-entity">{e.id}</span>
        )}
        {e.releases.length > 0 && (
          <span className="work-health-releases">
            <KindMark kind="release" named={false} />
            {e.releases.map((r) => shortOf.get(r) ?? r).join(", ")}
          </span>
        )}
      </div>
      <p className="work-health-what">
        <WordsView words={e.what} />
      </p>
      <p className="work-health-fix">
        <span className="work-health-fix-label">Fix</span>
        <span>
          <WordsView words={e.fix} />
        </span>
      </p>
      {(e.command || e.edit) && (
        <div className="work-health-actions">
          {e.command && (
            <>
              <code className="work-health-command">{e.command}</code>
              <Button
                variant="outlined"
                size="small"
                className="work-health-copy"
                startIcon={<Icon href={svgCopy} />}
                onClick={(ev) => {
                  const code = ev.currentTarget.previousElementSibling;
                  navigator.clipboard.writeText(e.command!).then(
                    () => toast("Copied the command"),
                    () => {
                      // Refused: select it, so the keyboard's copy takes it.
                      if (code) {
                        getSelection()?.selectAllChildren(code);
                      }
                      toast(
                        "The browser refused to copy: the command is selected, so copy it with the keyboard",
                        "bad",
                      );
                    },
                  );
                }}
                aria-label={`Copy the command: ${e.command}`}
              >
                Copy command
              </Button>
            </>
          )}
          {e.edit && /^CS-\d+$/.test(e.edit) && (
            <Button
              variant="text"
              size="small"
              className="work-health-open"
              onClick={() => openItem(e.edit!)}
              title="Open it in the pane, with its file's path and Open in editor"
            >
              Open {e.edit}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/** A sentence with its IDs drawn as references, each with its title. */
function WordsView({ words }: { words: Words }) {
  const titles = useContext(TitleContext);
  return (
    <>
      {words.map((x, i) =>
        typeof x === "string" ? (
          <Fragment key={i}>{x}</Fragment>
        ) : (
          <ItemRef
            key={i}
            id={x.id}
            title={titles.get(x.id)}
            className="work-health-inline"
          />
        ),
      )}
    </>
  );
}

/** Mounted by the shell (DESIGN.md, "The view shell"). */
export const workView: WorkViewDef = {
  id: "health",
  label: "Health",
  question: "What is wrong in the work graph, and the fix for each",
  place: "page",
  order: 30,
  proposals: false,
  Component: HealthView,
};
