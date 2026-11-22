import { Typography } from "@mui/material";
import type { ReactNode } from "react";
import { ID_IN_TEXT } from "../work.ts";

/**
 * A work item's body as React elements: the markdown the tracker's items
 * use (## headings, paragraphs, - and 1. lists, fenced code, **bold**,
 * `code`), with the tracker's item IDs drawn by `itemLink`. Never
 * inserted as HTML, so nothing in a file can run on the page.
 */
export function ItemText({
  text,
  itemLink,
  known,
}: {
  text: string;
  /** A link to an item mentioned in the text. */
  itemLink: (id: string, key: number) => ReactNode;
  /** IDs the tracker has; others stay plain text. */
  known: ReadonlySet<string>;
}) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const inline = (s: string) => renderInline(s, itemLink, known);
  while (i < lines.length) {
    const line = lines[i]!;
    const key = blocks.length;
    if (line.trim() === "") {
      i++;
    } else if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        code.push(lines[i++]!);
      }
      i++;
      blocks.push(
        <pre key={key} className="item-text-code">
          {code.join("\n")}
        </pre>,
      );
    } else if (/^#{1,6} /.test(line)) {
      const depth = line.match(/^#+/)![0].length;
      blocks.push(
        <Typography
          key={key}
          variant={depth <= 2 ? "subtitle-md" : "body-md"}
          render={depth <= 2 ? <h3 /> : <h4 />}
          className="item-text-heading"
        >
          {inline(line.replace(/^#+ /, ""))}
        </Typography>,
      );
      i++;
    } else if (/^\s*([-*]|\d+\.) /.test(line)) {
      const ordered = /^\s*\d+\. /.test(line);
      const entries: Array<{ text: string; nested: string[] }> = [];
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i]!)) {
        const l = lines[i]!;
        const nested = /^\s{2,}/.test(l);
        const body = l.replace(/^\s*([-*]|\d+\.) /, "");
        if (nested && entries.length) {
          entries.at(-1)!.nested.push(body);
        } else {
          entries.push({ text: body, nested: [] });
        }
        i++;
        // A wrapped line continues the entry.
        while (
          i < lines.length &&
          /^\s{2,}\S/.test(lines[i]!) &&
          !/^\s*([-*]|\d+\.) /.test(lines[i]!)
        ) {
          const last = entries.at(-1)!;
          if (last.nested.length) {
            last.nested[last.nested.length - 1] += ` ${lines[i]!.trim()}`;
          } else {
            last.text += ` ${lines[i]!.trim()}`;
          }
          i++;
        }
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key} className="item-text-list">
          {entries.map((e, n) => (
            <li key={n}>
              {inline(e.text)}
              {e.nested.length > 0 && (
                <ul className="item-text-list">
                  {e.nested.map((x, m) => (
                    <li key={m}>{inline(x)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </List>,
      );
    } else {
      const para: string[] = [];
      while (
        i < lines.length &&
        lines[i]!.trim() !== "" &&
        !/^(#{1,6} |```|\s*([-*]|\d+\.) )/.test(lines[i]!)
      ) {
        para.push(lines[i++]!.trim());
      }
      blocks.push(
        <Typography key={key} variant="body-md" render={<p />}>
          {inline(para.join(" "))}
        </Typography>,
      );
    }
  }
  return <div className="item-text">{blocks}</div>;
}

/** A title or a line with its `code` and **bold** drawn, nothing else. */
export function InlineText({ text }: { text: string }) {
  return <>{renderInline(text, () => null, new Set())}</>;
}

/** `code`, **bold** and item IDs within a line. */
function renderInline(
  text: string,
  itemLink: (id: string, key: number) => ReactNode,
  known: ReadonlySet<string>,
): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let at = 0;
  const ids = (s: string) => {
    let from = 0;
    for (const m of s.matchAll(ID_IN_TEXT)) {
      const id = m[0];
      if (!known.has(id)) {
        continue;
      }
      out.push(s.slice(from, m.index));
      out.push(itemLink(id, out.length));
      from = m.index! + id.length;
    }
    out.push(s.slice(from));
  };
  for (const m of text.matchAll(pattern)) {
    ids(text.slice(at, m.index));
    if (m[1]) {
      out.push(<code key={out.length}>{m[1].slice(1, -1)}</code>);
    } else {
      out.push(<strong key={out.length}>{m[2]!.slice(2, -2)}</strong>);
    }
    at = m.index! + m[0].length;
  }
  ids(text.slice(at));
  return out.filter((x) => x !== "");
}
