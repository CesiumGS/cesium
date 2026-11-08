import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useState, type ReactNode } from "react";
import { data, day } from "./data.ts";
import { highlight, LANGUAGE_NAMES, type CodeLanguage } from "./highlight.ts";
import { SOURCES, STALE_AFTER_DAYS, type SourceId } from "./sources.ts";

/** How far a tab's content goes. Shown at the top of each tab. */
export type Status = "current" | "sketch" | "stub";

const STATUS_TEXT: Record<Status, string> = {
  current: "Accurate today",
  sketch: "Sketch: true as far as it goes",
  stub: "Stub: mostly to be written",
};

export function Page({
  title,
  status,
  lede,
  children,
}: {
  title: string;
  status: Status;
  lede: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="page">
      <header className="page-head">
        <h1 tabIndex={-1} id="page-title">
          {title}
        </h1>
        <p className={`status status-${status}`}>{STATUS_TEXT[status]}</p>
        <p className="lede">{lede}</p>
      </header>
      {children}
    </article>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** A code name. */
export const C = ({ children }: { children: ReactNode }) => (
  <code className="code">{children}</code>
);

/** A line saying where a figure's numbers come from. */
export function Generated({ from }: { from: ReactNode }) {
  const { commit, commitDate, dirty } = data.meta;
  return (
    <p className="provenance">
      Generated from {from} at commit {commit}
      {dirty ? " plus uncommitted changes" : ""}, {day(commitDate)}.
    </p>
  );
}

/** A line saying what written content rests on. */
export function Written({ from, on }: { from: ReactNode; on: string }) {
  return (
    <p className="provenance">
      Written from {from}, checked {day(on)}.
    </p>
  );
}

export function Figure({
  caption,
  label,
  scroll = false,
  children,
}: {
  caption: ReactNode;
  /** What a screen reader hears for a figure that is a picture. */
  label?: string;
  /** A wide drawing: it scrolls on a phone rather than shrinking past reading. */
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="figure">
      {scroll ? (
        <div
          className="figure-scroll"
          tabIndex={0}
          role="group"
          aria-label={label ?? "Diagram"}
        >
          {children}
        </div>
      ) : (
        children
      )}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export interface Column<Row> {
  head: string;
  cell: (row: Row) => ReactNode;
  numeric?: boolean;
}

export function DataTable<Row>({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: Column<Row>[];
  rows: readonly Row[];
}) {
  return (
    <TableContainer
      className="table-wrap"
      tabIndex={0}
      role="group"
      aria-label={label}
    >
      <Table size="small" aria-label={label}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.head} align={c.numeric ? "right" : "left"}>
                {c.head}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell
                  key={c.head}
                  align={c.numeric ? "right" : "left"}
                  className={c.numeric ? "num" : undefined}
                >
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** A note set apart from the text: what's missing or disputed. */
export function Note({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="note">
      <h3>{title}</h3>
      {children}
    </aside>
  );
}

/** Steps in order, wrapping on narrow screens. */
export function Flow({
  label,
  steps,
}: {
  label: string;
  steps: { title: string; body: ReactNode; aside?: ReactNode }[];
}) {
  return (
    <ol className="flow" aria-label={label}>
      {steps.map((s) => (
        <li key={s.title}>
          <h3>{s.title}</h3>
          <div className="flow-body">{s.body}</div>
          {s.aside ? <p className="flow-aside">{s.aside}</p> : null}
        </li>
      ))}
    </ol>
  );
}

/** An inline citation: a named link to the source. */
/** A block of code: real, selectable text, with its edges plain. */
export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: CodeLanguage;
}) {
  const name = LANGUAGE_NAMES[language];
  return (
    <div className="codeblock">
      {name ? (
        <div className="codeblock-head">
          <span>{name}</span>
          <CopyButton text={code} />
        </div>
      ) : null}
      <pre tabIndex={0}>
        <code>
          {highlight(code, language).map((token, i) =>
            token.kind ? (
              <span className={`tk-${token.kind}`} key={i}>
                {token.text}
              </span>
            ) : (
              token.text
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // A page opened from a file may have no clipboard API.
      const area = document.createElement("textarea");
      area.value = text;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="codeblock-copy" type="button" onClick={copy}>
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function Cite({ id }: { id: SourceId }) {
  const source = SOURCES[id];
  return (
    <a className="cite" href={source.url} target="_blank" rel="noreferrer">
      {source.short}
    </a>
  );
}

const daysSince = (iso: string) =>
  Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

/** The sources a tab cites, each with what it states and when it was read. */
export function Sources({ ids }: { ids: SourceId[] }) {
  return (
    <Section title="Sources">
      <ul className="sources">
        {ids.map((id) => {
          const s = SOURCES[id];
          const stale = daysSince(s.checked) > STALE_AFTER_DAYS;
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <span className="source-meta">
                {"pageDate" in s ? ` ${s.pageDate}. ` : " "}
                Read {day(s.checked)}.{"note" in s ? ` ${s.note}` : ""}
              </span>
              {stale ? (
                <span className="source-stale">
                  {" "}
                  Recheck: read over {STALE_AFTER_DAYS} days ago.
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
