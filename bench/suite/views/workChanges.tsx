import "./workChanges.css";
import {
  Button,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { Icon } from "@stratakit/mui";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeCommitRef,
  ChangesAnswer,
} from "../../../scripts/workBoard.mjs";
import { toast } from "../toast.ts";
import { kindsOf } from "../work.ts";
import {
  type Change,
  type ChangeNames,
  type ChangeSection,
  type ChangesView,
  changesInScope,
  changesOf,
  changesText,
  dayStart,
  pointQuery,
  readVisits,
  SECTION_DEFS,
  type Visit,
  WHY_SOURCE_NAMES,
  withVisit,
  writeVisits,
} from "../workChanges.ts";
import type { Words } from "../workHealth.ts";
import {
  ItemRef,
  ReservedText,
  type WorkViewDef,
  type WorkViewProps,
} from "./Work.tsx";

/** Every ID's title: the answer's own first (a dropped entity keeps its title), then the snapshot's. */
const TitleContext = createContext<(id: string) => string | undefined>(
  () => undefined,
);

type Mode = "visit" | "date" | "commit";

/** Rows a section shows before Show all. */
const FIRST_ROWS = 6;

const MODE_WORDS: Record<Mode, string> = {
  visit: "Last visit",
  date: "Date",
  commit: "Commit",
};

/** The figures at the head: plan changes gather Added, Dropped and Moved. */
const FIGURES: Array<{
  key: string;
  name: string;
  sections: ChangeSection[];
  jump: ChangeSection;
}> = [
  {
    key: "releases",
    name: "Release scope",
    sections: ["releases"],
    jump: "releases",
  },
  {
    key: "answered",
    name: "Decisions answered",
    sections: ["answered"],
    jump: "answered",
  },
  {
    key: "plan",
    name: "Plan changes",
    sections: ["added", "dropped", "moved"],
    jump: "added",
  },
  { key: "done", name: "Merged and done", sections: ["done"], jump: "done" },
];

// ------------------------------------------------------------- visits

/** The visits as they were when this page loaded: the point stays put while it is open. */
let visitsAtLoad: Visit[] | undefined;

const storage = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

function loadVisits(): Visit[] {
  visitsAtLoad ??= readVisits(storage());
  return visitsAtLoad;
}

// --------------------------------------------------------------- dates

const DAY_MS = 86_400_000;

/** "Thu 19 Nov, 21:35" in the viewer's own clock. */
function whenText(iso: string, withTime = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const day = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
  });
  return withTime
    ? `${day}, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
    : day;
}

/** "YYYY-MM-DD" of a moment in the viewer's own clock. */
function dayOf(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---------------------------------------------------------------- read

type Read =
  | { state: "reading"; kept?: ChangesAnswer }
  | { state: "read"; answer: ChangesAnswer }
  | { state: "refused"; error: string; reason?: string; kept?: ChangesAnswer };

/** The board's read of what changed since a point: `/work-api/changes.json`. */
function useChanges(query: string | undefined, head?: string): Read {
  const [read, setRead] = useState<Read>({ state: "reading" });
  useEffect(() => {
    if (!query) {
      return;
    }
    const ctl = new AbortController();
    setRead((r) => ({
      state: "reading",
      kept: r.state === "read" ? r.answer : r.kept,
    }));
    fetch(`/work-api/changes.json?${query}`, { signal: ctl.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as
          ChangesAnswer | { error?: string; reason?: string };
        if (!res.ok || !("base" in body)) {
          const err = body as { error?: string; reason?: string };
          setRead((r) => ({
            state: "refused",
            error:
              err.error ??
              `The board's read answered ${res.status}: see the dev server's log`,
            reason: err.reason,
            kept: r.state === "reading" ? r.kept : undefined,
          }));
          return;
        }
        setRead({ state: "read", answer: body });
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") {
          return;
        }
        setRead({
          state: "refused",
          error:
            "The board's read endpoint can't be reached: it runs on Dyno's dev server only",
        });
      });
    return () => ctl.abort();
    // The snapshot's commit moves when HEAD does: read again then.
  }, [query, head]);
  return read;
}

// ---------------------------------------------------------------- view

/**
 * The Since-you-last-looked view (CS-747; DESIGN.md, "The Since you last
 * looked view"): what changed in the plan since a point the viewer picks,
 * each change with the decision or reason behind it when the record has
 * one. Read from git through the board's endpoint; nothing is changed
 * from here.
 */
export function ChangesView(p: WorkViewProps) {
  const { s, scoped, items, msInScope, selected } = p;
  const visits = useMemo(loadVisits, []);
  const [mode, setMode] = useState<Mode>(visits.length ? "visit" : "date");
  const [visitAt, setVisitAt] = useState(0);
  const [day, setDay] = useState(() => dayOf(Date.now() - 7 * DAY_MS));
  const [draft, setDraft] = useState("");
  const [commit, setCommit] = useState("");
  const [commitError, setCommitError] = useState("");
  const visit = visits[visitAt];
  // A visit at a commit this branch doesn't have falls back to its time.
  const [visitByTime, setVisitByTime] = useState(false);

  const query =
    mode === "visit" && visit
      ? pointQuery(visitByTime ? { date: visit.at } : { commit: visit.commit })
      : mode === "commit"
        ? commit
          ? pointQuery({ commit })
          : undefined
        : day
          ? pointQuery({ date: dayStart(day) })
          : undefined;
  const read = useChanges(query, s.commit);
  useEffect(() => {
    if (
      read.state === "refused" &&
      mode === "visit" &&
      !visitByTime &&
      (read.reason === "ancestor" || read.reason === "commit")
    ) {
      setVisitByTime(true);
    }
  }, [read, mode, visitByTime]);

  // This visit is kept when the viewer leaves: the view, or the page.
  const headSha = useRef<string | undefined>(undefined);
  const answer = read.state === "read" ? read.answer : read.kept;
  if (answer) {
    headSha.current = answer.head.sha;
  }
  useEffect(() => {
    const keep = () => {
      if (headSha.current) {
        const store = storage();
        writeVisits(
          store,
          withVisit(readVisits(store), {
            commit: headSha.current,
            at: new Date().toISOString(),
          }),
        );
      }
    };
    addEventListener("pagehide", keep);
    return () => {
      removeEventListener("pagehide", keep);
      keep();
    };
  }, []);

  const kinds = useMemo(() => kindsOf(s), [s]);
  const names = useMemo((): ChangeNames => {
    const title = new Map(
      [...s.items, ...s.milestones, ...s.projects].map((x) => [x.id, x.title]),
    );
    const ms = new Map(s.items.map((i) => [i.id, i.milestones]));
    return {
      title: (id) => title.get(id),
      kind: (id) => kinds.get(id),
      milestones: (id) => ms.get(id),
    };
  }, [s, kinds]);
  const whole = useMemo(
    () => (answer ? changesOf(answer, names) : undefined),
    [answer, names],
  );
  const inScope = useMemo(() => {
    const ids = new Set(items.map((i) => i.id));
    return (id: string) => ids.has(id) || msInScope(id);
  }, [items, msInScope]);
  const v = whole && scoped ? changesInScope(whole, inScope) : whole;
  const titleOf = useMemo(() => {
    const own = new Map<string, string>();
    for (const e of answer?.entities ?? []) {
      const t = e.after?.title ?? e.before?.title;
      if (t) {
        own.set(e.id, t);
      }
    }
    return (id: string) => own.get(id) ?? names.title(id);
  }, [answer, names]);

  const sinceWords = !answer
    ? ""
    : mode === "visit" && visit
      ? whenText(visit.at)
      : mode === "date"
        ? whenText(dayStart(day), false)
        : `commit ${answer.base.short} (${whenText(answer.base.at, false)})`;

  const [showText, setShowText] = useState<string>();
  const copy = () => {
    if (!v) {
      return;
    }
    const text = changesText(v, sinceWords, (id) => titleOf(id) ?? id);
    navigator.clipboard.writeText(text).then(
      () => {
        setShowText(undefined);
        toast("Copied the summary");
      },
      () => {
        setShowText(text);
        toast(
          "The browser refused to copy: the summary is selected below, so copy it with the keyboard",
          "bad",
        );
      },
    );
  };

  const applyCommit = () => {
    const c = draft.trim().toLowerCase();
    if (!/^[0-9a-f]{7,40}$/.test(c)) {
      setCommitError("A commit is 7 to 40 hex digits");
      return;
    }
    setCommitError("");
    setCommit(c);
  };

  const jump = (section: ChangeSection) => {
    const h = document.getElementById(`work-changes-${section}-h`);
    if (!h) {
      return;
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    h.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    h.focus({ preventScroll: true });
  };

  const busy = read.state === "reading";
  const refused = read.state === "refused" ? read : undefined;
  const countOf = (ss: readonly ChangeSection[]) =>
    v
      ? v.sections
          .filter((x) => ss.includes(x.section))
          .reduce((n, x) => n + x.changes.length, 0)
      : 0;
  const shown = v?.sections.filter((x) => x.changes.length) ?? [];
  const quiet = v?.sections.filter((x) => !x.changes.length) ?? [];

  return (
    <TitleContext.Provider value={titleOf}>
      <div className="work-changes" aria-busy={busy}>
        <div className="work-changes-head">
          <div className="work-changes-point" role="group" aria-label="Since">
            <span className="work-changes-point-label" aria-hidden="true">
              Since
            </span>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              onChange={(_, m: Mode | null) => {
                if (m) {
                  setMode(m);
                  setVisitByTime(false);
                }
              }}
              aria-label="Compare from"
              className="work-changes-modes"
            >
              {(["visit", "date", "commit"] as const).map((m) => (
                <ToggleButton
                  key={m}
                  value={m}
                  render={<Button variant="outlined" size="small" />}
                >
                  {MODE_WORDS[m]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <div className="work-changes-point-input">
              {mode === "visit" &&
                (visits.length ? (
                  <Select
                    size="small"
                    value={String(visitAt)}
                    onChange={(e) => {
                      setVisitAt(Number(e.target.value));
                      setVisitByTime(false);
                    }}
                    className="work-changes-visit"
                    inputProps={{ "aria-label": "Which visit" }}
                  >
                    {visits.map((x, k) => (
                      <MenuItem key={x.commit} value={String(k)}>
                        <span className="work-changes-visit-when">
                          {whenText(x.at)}
                        </span>
                        <span className="work-changes-visit-sha">
                          {k === 0 ? "last" : "earlier"} ·{" "}
                          {x.commit.slice(0, 7)}
                        </span>
                      </MenuItem>
                    ))}
                  </Select>
                ) : (
                  <Typography
                    variant="body-sm"
                    color="textSecondary"
                    render={<p />}
                    className="work-changes-novisit"
                  >
                    No visit is kept in this browser yet: the next one starts
                    when you leave this view.
                  </Typography>
                ))}
              {mode === "date" && (
                <TextField
                  type="date"
                  size="small"
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="work-changes-date"
                  slotProps={{
                    htmlInput: {
                      "aria-label": "Since the start of this day",
                      max: dayOf(Date.now()),
                    },
                  }}
                />
              )}
              {mode === "commit" && (
                <form
                  className="work-changes-commit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyCommit();
                  }}
                >
                  <TextField
                    size="small"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="fdbe58f"
                    error={!!commitError}
                    slotProps={{
                      htmlInput: {
                        "aria-label": "Since this commit",
                        "aria-invalid": !!commitError,
                        "aria-describedby": "work-changes-commit-help",
                        spellCheck: false,
                        autoCapitalize: "off",
                        maxLength: 40,
                      },
                    }}
                  />
                  <Button type="submit" variant="outlined" size="small">
                    Compare
                  </Button>
                </form>
              )}
            </div>
            <Button
              variant="outlined"
              size="small"
              className="work-changes-copy"
              startIcon={<Icon href={svgCopy} />}
              onClick={copy}
              disabled={!v}
              title="A short summary for a status update, with titles in place of IDs"
            >
              Copy as text
            </Button>
          </div>
          <Typography
            variant="caption-md"
            color={commitError ? "error" : "textSecondary"}
            render={<p />}
            id="work-changes-commit-help"
            className="work-changes-point-note"
          >
            <PointNote
              mode={mode}
              commitError={commitError}
              hasVisit={!!visit}
              byTime={visitByTime}
            />
          </Typography>

          {showText !== undefined && (
            <SelectedText
              text={showText}
              onClose={() => setShowText(undefined)}
            />
          )}

          {answer && v && !v.began && (
            <>
              <dl className="work-changes-stats" aria-live="polite">
                {FIGURES.map((f) => {
                  const n = countOf(f.sections);
                  const parts =
                    f.key === "plan"
                      ? f.sections.map(
                          (x) => `${countOf([x])} ${SECTION_DEFS[x].one}`,
                        )
                      : undefined;
                  return (
                    <div key={f.key} className="work-changes-stat">
                      <dt>{f.name}</dt>
                      <dd>
                        {n > 0 ? (
                          <button
                            type="button"
                            className="work-changes-stat-value is-button"
                            onClick={() =>
                              jump(
                                f.sections.find((x) => countOf([x]) > 0) ??
                                  f.jump,
                              )
                            }
                            aria-label={`${n} ${f.name.toLowerCase()}: go to the list`}
                          >
                            {n}
                          </button>
                        ) : (
                          <span className="work-changes-stat-value zero">
                            0
                          </span>
                        )}
                        {parts && (
                          <span className="work-changes-stat-line">
                            {parts.join(" · ")}
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <Span answer={answer} view={v} scoped={scoped} />
            </>
          )}
        </div>

        <div className="work-dash">
          {!answer && busy && (
            <div className="work-loading span-12" role="status">
              <CircularProgress size={20} />
              <Typography variant="body-md">
                Reading the tracker's history…
              </Typography>
            </div>
          )}
          {refused && (
            <section
              className="work-card span-12 work-changes-refused"
              role="alert"
            >
              <Typography variant="subtitle-md" render={<h2 />}>
                {refused.reason
                  ? "That point can't be read"
                  : "The history can't be read"}
              </Typography>
              <Typography variant="body-sm" render={<p />}>
                {refused.error}.
                {refused.kept
                  ? " The changes below are from the point before."
                  : ""}
              </Typography>
            </section>
          )}
          {v?.began && (
            <section className="work-card span-12">
              <Typography variant="subtitle-md" render={<h2 />}>
                The tracker began after this point
              </Typography>
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
              >
                Everything in it is new since then, so nothing is listed. Pick a
                later date, or compare from its first commit.
              </Typography>
              {answer && answer.commits.length > 0 && !answer.truncated && (
                <div className="work-card-foot">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const first = answer.commits[answer.commits.length - 1]!;
                      setMode("commit");
                      setDraft(first.short.slice(0, 10));
                      setCommitError("");
                      setCommit(first.sha);
                    }}
                  >
                    Compare from its first commit,{" "}
                    {answer.commits[answer.commits.length - 1]!.short.slice(
                      0,
                      7,
                    )}
                  </Button>
                </div>
              )}
            </section>
          )}
          {v && !busy && !v.began && v.total === 0 && (
            <section
              className="work-card span-12 work-changes-none"
              aria-labelledby="work-changes-none-h"
            >
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-changes-none-h"
              >
                Nothing changed in the plan since {sinceWords}
              </Typography>
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
              >
                {answer!.base.sha === answer!.head.sha
                  ? "The branch is where it was then."
                  : `No commit since then changed a release, a decision, a milestone or an item${scoped ? " in the scope" : ""}.`}
                {mode === "visit" && visits[visitAt + 1]
                  ? " Your visits are kept one per commit, so the one before may show more."
                  : ""}
                {countOf(["filed"]) > 0
                  ? ` ${countOf(["filed"])} ${countOf(["filed"]) === 1 ? "proposal was" : "proposals were"} filed; they change nothing until committed.`
                  : ""}
              </Typography>
              {mode === "visit" && visits[visitAt + 1] && (
                <div className="work-card-foot">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setVisitAt(visitAt + 1);
                      setVisitByTime(false);
                    }}
                  >
                    Since the visit before, {whenText(visits[visitAt + 1]!.at)}
                  </Button>
                </div>
              )}
            </section>
          )}
          {v &&
            !v.began &&
            shown.map((x) => (
              <SectionCard
                key={x.section}
                section={x.section}
                changes={x.changes}
                selected={selected}
                startOpen={x.section !== "filed"}
              />
            ))}
          {v && !v.began && v.total > 0 && quiet.length > 0 && (
            <Typography
              variant="caption-md"
              color="textSecondary"
              render={<p />}
              className="work-changes-quiet span-12"
            >
              No change in{" "}
              {quiet
                .map((x) => SECTION_DEFS[x.section].name.toLowerCase())
                .join(", ")}
              .
            </Typography>
          )}
        </div>
      </div>
    </TitleContext.Provider>
  );
}

/** The line under the point picker: what the point is, or what is wrong with it. */
function PointNote({
  mode,
  commitError,
  hasVisit,
  byTime,
}: {
  mode: Mode;
  commitError: string;
  hasVisit: boolean;
  byTime: boolean;
}) {
  if (commitError) {
    return <>{commitError}: the short one in a commit's line is enough.</>;
  }
  if (mode === "visit") {
    return hasVisit ? (
      byTime ? (
        <>
          That visit was on a commit this branch doesn't have, so the changes
          are counted from its time.
        </>
      ) : (
        <>Kept in this browser when you leave the view, the last eight.</>
      )
    ) : (
      <>Until then, pick a date or a commit.</>
    );
  }
  if (mode === "date") {
    return <>From the start of that day, in your clock.</>;
  }
  return <>Any commit on this branch's history, 7 to 40 hex digits.</>;
}

/** The span compared: the two commits and how many commits changed the tracker. */
function Span({
  answer,
  view,
  scoped,
}: {
  answer: ChangesAnswer;
  view: ChangesView;
  scoped: boolean;
}) {
  const filed = view.sections.find((x) => x.section === "filed")!.changes
    .length;
  return (
    <Typography
      variant="caption-md"
      color="textSecondary"
      render={<p />}
      className="work-changes-span"
    >
      {answer.base.sha === answer.head.sha ? (
        <>
          At <CommitChip c={answer.head} /> (HEAD), as at that point
        </>
      ) : (
        <>
          From <CommitChip c={answer.base} /> to <CommitChip c={answer.head} />{" "}
          (HEAD): {view.commits} {view.commits === 1 ? "commit" : "commits"}{" "}
          changed the tracker
        </>
      )}
      {view.truncated ? ", and only the newest were read" : ""}
      {filed
        ? `; ${filed} ${filed === 1 ? "proposal" : "proposals"} filed`
        : ""}
      {scoped ? ". Narrowed to the scope" : ""}. Committed history only:
      uncommitted edits aren't counted.
    </Typography>
  );
}

function CommitChip({ c }: { c: ChangeCommitRef }) {
  return (
    <span className="work-changes-chip">
      <code>{c.short.slice(0, 7)}</code>
      <span className="work-changes-chip-when">{whenText(c.at)}</span>
    </span>
  );
}

/** When the browser refuses the clipboard: the summary, selected for the keyboard's copy. */
function SelectedText({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, [text]);
  return (
    <div className="work-changes-text">
      <textarea
        ref={ref}
        readOnly
        value={text}
        rows={Math.min(14, text.split("\n").length)}
        aria-label="The summary, selected: copy it with the keyboard"
      />
      <Button variant="text" size="small" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

function SectionCard({
  section,
  changes,
  selected,
  startOpen,
}: {
  section: ChangeSection;
  changes: readonly Change[];
  selected?: string;
  startOpen: boolean;
}) {
  const def = SECTION_DEFS[section];
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(startOpen);
  const hId = `work-changes-${section}-h`;
  const list = !open ? [] : all ? changes : changes.slice(0, FIRST_ROWS);
  const more = changes.length - FIRST_ROWS;
  return (
    <section
      className={`work-card span-12 work-changes-section s-${section}`}
      aria-labelledby={hId}
    >
      <header className="work-card-head">
        <span className="work-card-titles">
          <span className="work-changes-section-line">
            <span className="work-changes-count" aria-hidden="true">
              {changes.length}
            </span>
            <Typography
              variant="subtitle-md"
              render={<h2 />}
              id={hId}
              tabIndex={-1}
            >
              <span className="visually-hidden">{changes.length} </span>
              {def.name}
            </Typography>
          </span>
          <Typography variant="caption-md" color="textSecondary">
            {def.rule}
          </Typography>
        </span>
      </header>
      {list.length > 0 && (
        <ul className="work-changes-rows">
          {list.map((c) => (
            <Row
              key={c.key}
              c={c}
              selected={!!selected && c.ids.includes(selected)}
            />
          ))}
        </ul>
      )}
      {(!open || more > 0) && (
        <div className="work-card-foot">
          <Button
            variant="text"
            size="small"
            aria-expanded={open && (all || more <= 0)}
            onClick={() => {
              if (!open) {
                setOpen(true);
                setAll(true);
              } else {
                setAll(!all);
              }
            }}
          >
            <ReservedText
              value={
                !open
                  ? `Show the ${changes.length}`
                  : all
                    ? "Show fewer"
                    : `Show all ${changes.length}`
              }
              options={[
                `Show the ${changes.length}`,
                "Show fewer",
                `Show all ${changes.length}`,
              ]}
            />
          </Button>
        </div>
      )}
    </section>
  );
}

function Row({ c, selected }: { c: Change; selected: boolean }) {
  const title = useContext(TitleContext);
  return (
    <li className={`work-changes-row${selected ? " selected" : ""}`}>
      <div className="work-changes-row-head">
        <ItemRef
          id={c.id}
          title={title(c.id) ?? c.title}
          className="work-changes-entity"
        />
        {c.proposed && <span className="work-changes-proposed">Proposed</span>}
        {c.commit && (
          <span className="work-changes-when">
            <code>{c.commit.short.slice(0, 7)}</code>
            <span>{whenText(c.commit.at, false)}</span>
          </span>
        )}
      </div>
      <p className="work-changes-what">
        <WordsView words={c.what} />
        {c.commits ? (
          <span className="work-changes-n">
            {" "}
            · {c.commits} {c.commits === 1 ? "commit" : "commits"}
          </span>
        ) : null}
      </p>
      {c.answer && (
        <p className="work-changes-answer">
          <span className="work-changes-label">Answer</span>
          <span>
            <TextWithRefs text={c.answer} self={c.id} />
          </span>
        </p>
      )}
      <Why c={c} />
    </li>
  );
}

/** The reason behind a change, and where it was found; or plainly, that there is none. */
function Why({ c }: { c: Change }) {
  const title = useContext(TitleContext);
  const why = c.why;
  if (!why) {
    if (c.section === "done" && c.entity === "work") {
      return (
        <p className="work-changes-why none">
          <span className="work-changes-label">Why</span>
          <span>No merge decision on record.</span>
        </p>
      );
    }
    if (c.section === "answered") {
      return null; // the answer is its own record
    }
    return (
      <p className="work-changes-why none">
        <span className="work-changes-label">Why</span>
        <span>Not recorded: neither its record nor its commit says.</span>
      </p>
    );
  }
  return (
    <p className="work-changes-why">
      <span className="work-changes-label">Why</span>
      <span>
        {why.from === "decision" && why.decision && (
          <>
            On{" "}
            <ItemRef
              id={why.decision}
              title={title(why.decision)}
              className="work-changes-inline"
            />
            's answer:{" "}
          </>
        )}
        <TextWithRefs text={why.text} self={c.id} />{" "}
        <span className="work-changes-src">
          ({WHY_SOURCE_NAMES[why.from].toLowerCase()})
        </span>
      </span>
    </p>
  );
}

/** Free text (a reason, an answer, a subject) with every ID in it drawn as a reference with its title. */
function TextWithRefs({ text, self }: { text: string; self?: string }) {
  const title = useContext(TitleContext);
  const parts = text.split(/\b(CS-[1-9]\d*)\b/);
  return (
    <>
      {parts.map((x, i) =>
        i % 2 === 1 ? (
          <ItemRef
            key={i}
            id={x}
            // The row's own ID: its title heads the row.
            title={x === self ? "" : title(x)}
            className="work-changes-inline"
          />
        ) : (
          <Fragment key={i}>{x}</Fragment>
        ),
      )}
    </>
  );
}

/** A sentence with its IDs drawn as references, each with its title. */
function WordsView({ words }: { words: Words }) {
  const title = useContext(TitleContext);
  return (
    <>
      {words.map((x, i) =>
        typeof x === "string" ? (
          <Fragment key={i}>{x}</Fragment>
        ) : (
          <ItemRef
            key={i}
            id={x.id}
            title={title(x.id)}
            className="work-changes-inline"
          />
        ),
      )}
    </>
  );
}

/** Mounted by the shell (DESIGN.md, "The view shell"). */
export const workView: WorkViewDef = {
  id: "changes",
  label: "What changed",
  question:
    "What changed in the plan since your last visit, a date or a commit, and why",
  place: "page",
  order: 40,
  proposals: false,
  Component: ChangesView,
};
