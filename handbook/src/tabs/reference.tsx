import "../reference.css";
import { TextField } from "@mui/material";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { count } from "../data.ts";
import { highlight } from "../highlight.ts";
import { C, CodeBlock, DataTable, Generated, Note, Page } from "../parts.tsx";
import {
  KINDS,
  Linker,
  declarationText,
  importLine,
  memberLines,
  parseDoc,
  parseInline,
  parseRoute,
  primaryKind,
  routeHash,
  searchSymbols,
  signatureText,
  summaryOf,
  tokenizeTypes,
  type RefGroup,
  type RefMember,
  type RefParam,
  type RefSignature,
  type RefSymbol,
  type Reference,
  type Route,
} from "../reference.ts";

/** How many rows a list draws before it offers more. */
const PAGE = 120;

const href = (id: string) => routeHash({ view: "symbol", id });
const groupHref = (id: string) => routeHash({ view: "group", id });

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

/** The reference's data, loaded when the tab first opens, so no other tab waits for it. */
function useReference(): Reference | Error | undefined {
  const [loaded, setLoaded] = useState<Reference | Error>();
  useEffect(() => {
    let live = true;
    import("../../generated/reference.json?raw")
      .then((module) => {
        if (live) {
          setLoaded(JSON.parse(module.default) as Reference);
        }
      })
      .catch((error: unknown) => {
        if (live) {
          setLoaded(error instanceof Error ? error : new Error(String(error)));
        }
      });
    return () => {
      live = false;
    };
  }, []);
  return loaded;
}

export function ApiReference() {
  const loaded = useReference();
  return (
    <Page
      title="API reference"
      status="current"
      lede={
        <>
          Every symbol the package exports, read from its TypeScript
          declarations and doc comments. They are grouped by the import that
          reaches them, then by area, so the surface reads a part at a time: the
          transform graph, its built-in and geo transforms, and clipping each
          have groups of their own in the core. Each page has the signature,
          parameters, class hierarchy, members and where it is defined.
        </>
      }
    >
      {loaded === undefined ? (
        <p role="status" className="ref-loading">
          Loading the reference…
        </p>
      ) : loaded instanceof Error ? (
        <Note title="The reference couldn't load">
          <p>
            It is generated: run <C>npm run handbook:data</C>. {loaded.message}
          </p>
        </Note>
      ) : (
        <>
          <Reader reference={loaded} />
          <Generated
            from={
              <>
                the entry points' declarations and doc comments, read with the
                TypeScript compiler (<C>node scripts/apiReference.mjs</C>, run
                by <C>npm run handbook:data</C>)
              </>
            }
          />
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ reader

function Reader({ reference }: { reference: Reference }) {
  const route = useRoute();
  const linker = useMemo(
    () =>
      new Linker(
        reference.symbols,
        reference.entries.map((e) => e.id),
      ),
    [reference],
  );
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<ReadonlySet<string>>(new Set());
  const deferred = useDeferredValue(query);
  const filtering = deferred.trim() !== "" || kinds.size > 0;

  const current = route.view === "symbol" ? linker.get(route.id) : undefined;
  const activeGroup = route.view === "group" ? route.id : current?.group;

  // The counts the index and chips show follow the query and kinds.
  const everywhere = useMemo(
    () => searchSymbols(reference.symbols, { query: deferred, kinds }),
    [reference, deferred, kinds],
  );
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { symbol } of everywhere) {
      counts.set(symbol.group, (counts.get(symbol.group) ?? 0) + 1);
    }
    return counts;
  }, [everywhere]);
  const matches = useMemo(
    () =>
      route.view === "group"
        ? everywhere.filter((m) => m.symbol.group === route.id)
        : everywhere,
    [everywhere, route],
  );
  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const scope = searchSymbols(reference.symbols, {
      query: deferred,
      kinds: new Set(),
      group: route.view === "group" ? route.id : undefined,
    });
    for (const { symbol } of scope) {
      counts.set(
        primaryKind(symbol),
        (counts.get(primaryKind(symbol)) ?? 0) + 1,
      );
    }
    return counts;
  }, [reference, deferred, route]);

  // A new page reads from its top, and focus follows a symbol's title.
  const top = useRef<HTMLDivElement>(null);
  const shown = useRef(routeHash(route));
  const routeKey = routeHash(route);
  useEffect(() => {
    if (shown.current === routeKey) {
      return;
    }
    shown.current = routeKey;
    top.current?.scrollIntoView({ block: "start" });
    document.getElementById("ref-title")?.focus({ preventScroll: true });
  }, [routeKey]);

  const search = (value: string) => {
    setQuery(value);
    if (route.view === "symbol") {
      location.hash = routeHash({ view: "all" });
    }
  };
  const toggleKind = (id: string) => {
    const next = new Set(kinds);
    if (!next.delete(id)) {
      next.add(id);
    }
    setKinds(next);
    if (route.view === "symbol") {
      location.hash = routeHash({ view: "all" });
    }
  };

  const group = reference.groups.find((g) => g.id === activeGroup);
  return (
    <div className="ref-layout">
      <Index
        reference={reference}
        counts={filtering ? groupCounts : undefined}
        active={activeGroup}
        onAll={route.view === "all"}
      />
      <div className="ref-main" ref={top}>
        <div className="ref-tools">
          {route.view !== "symbol" ? (
            <div className="api-chips" role="group" aria-label="Filter by kind">
              {KINDS.filter((k) => kindCounts.get(k.id)).map((k) => (
                <button
                  type="button"
                  key={k.id}
                  className="api-chip"
                  aria-pressed={kinds.has(k.id)}
                  onClick={() => toggleKind(k.id)}
                >
                  {k.label} ({kindCounts.get(k.id)})
                </button>
              ))}
            </div>
          ) : null}
          <div className="api-fields">
            <TextField
              size="small"
              type="search"
              label="Search names and members"
              value={query}
              onChange={(e) => search(e.target.value)}
            />
            <span aria-live="polite">
              {route.view === "symbol"
                ? `${count(reference.symbols.length)} symbols`
                : `${count(matches.length)} of ${count(
                    route.view === "group" && group
                      ? group.count
                      : reference.symbols.length,
                  )} symbols`}
            </span>
          </div>
        </div>
        {route.view === "symbol" ? (
          current ? (
            <SymbolPage
              symbol={current}
              linker={linker}
              reference={reference}
            />
          ) : (
            <Note title={`No symbol called ${route.id}`}>
              <p>
                It may have been renamed or removed. Search for it, or pick a
                group.
              </p>
            </Note>
          )
        ) : route.view === "group" && !group ? (
          <Note title={`No group called ${route.id}`}>
            <p>Pick a group from the list.</p>
          </Note>
        ) : filtering || route.view === "group" ? (
          <Results
            key={`${deferred}|${[...kinds].join()}|${routeKey}`}
            group={route.view === "group" ? group : undefined}
            matches={matches}
            linker={linker}
            reference={reference}
          />
        ) : (
          <Overview reference={reference} />
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- index

function Index({
  reference,
  counts,
  active,
  onAll,
}: {
  reference: Reference;
  /** Matches per group under a query or kind filter; the totals when absent. */
  counts?: Map<string, number>;
  active?: string;
  onAll: boolean;
}) {
  const sections = [
    ...reference.entries.map((entry) => ({
      key: entry.id,
      title: entry.title,
      path: entry.import,
      groups: reference.groups.filter((g) => g.entry === entry.id),
    })),
    {
      key: "",
      title: "Unmapped",
      path: "",
      groups: reference.groups.filter((g) => g.entry === ""),
    },
  ].filter((s) => s.groups.length > 0);
  const narrow = useNarrow();
  const nav = (
    <nav className="ref-index" aria-label="API groups">
      <a
        className="ref-index-all"
        href={routeHash({ view: "all" })}
        aria-current={onAll ? "page" : undefined}
      >
        All groups <span className="ref-count">{reference.symbols.length}</span>
      </a>
      {sections.map((section) => (
        <div className="ref-index-entry" key={section.key}>
          <h2>
            {section.title}
            {section.path ? <span>{section.path}</span> : null}
          </h2>
          <ul>
            {section.groups.map((g) => {
              const n = counts ? (counts.get(g.id) ?? 0) : g.count;
              return (
                <li key={g.id}>
                  <a
                    href={groupHref(g.id)}
                    aria-current={g.id === active ? "page" : undefined}
                    className={n === 0 ? "ref-index-empty" : undefined}
                  >
                    {g.title} <span className="ref-count">{n}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
  if (!narrow) {
    return nav;
  }
  // Beside the tab list there's no room for the index, so it folds.
  const group = reference.groups.find((g) => g.id === active);
  return (
    <details className="ref-index-fold" key={active ?? ""}>
      <summary>
        Groups{group ? `: ${group.title}` : ""}{" "}
        <span className="ref-count">{reference.groups.length}</span>
      </summary>
      {nav}
    </details>
  );
}

const NARROW = "(max-width: 1340px)";

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW).matches);
  useEffect(() => {
    const query = matchMedia(NARROW);
    const on = () => setNarrow(query.matches);
    query.addEventListener("change", on);
    return () => query.removeEventListener("change", on);
  }, []);
  return narrow;
}

// ---------------------------------------------------------------- overview

const kindWords = (symbols: RefSymbol[]) =>
  KINDS.map((k) => ({
    k,
    n: symbols.filter((s) => primaryKind(s) === k.id).length,
  }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.n} ${x.k.label.toLowerCase()}`)
    .join(", ");

/** Names worth showing first: classes, then functions, then the rest. */
const notable = (symbols: RefSymbol[], n: number) =>
  [...symbols]
    .sort(
      (a, b) =>
        KINDS.findIndex((k) => k.id === primaryKind(a)) -
        KINDS.findIndex((k) => k.id === primaryKind(b)),
    )
    .filter((s) => !s.parent)
    .slice(0, n);

function Overview({ reference }: { reference: Reference }) {
  return (
    <div className="ref-overview">
      {reference.entries.map((entry) => (
        <section key={entry.id} aria-labelledby={`ref-entry-${entry.id}`}>
          <h2 id={`ref-entry-${entry.id}`}>{entry.title}</h2>
          <p className="ref-entry-line">
            <C>{entry.import}</C>, {entry.count} symbols. {entry.blurb}
          </p>
          <ul className="ref-groups">
            {reference.groups
              .filter((g) => g.entry === entry.id)
              .map((g) => {
                const symbols = reference.symbols.filter(
                  (s) => s.group === g.id,
                );
                return (
                  <li key={g.id}>
                    <h3>
                      <a href={groupHref(g.id)}>{g.title}</a>{" "}
                      <span className="ref-count">{g.count}</span>
                    </h3>
                    <p>{g.blurb}</p>
                    <p className="ref-sample">
                      {notable(symbols, 6).map((s, i) => (
                        <Fragment key={s.id}>
                          {i > 0 ? ", " : ""}
                          <a href={href(s.id)}>{s.name}</a>
                        </Fragment>
                      ))}
                      {symbols.length > 6 ? ", …" : ""}
                    </p>
                    <p className="ref-kinds">{kindWords(symbols)}</p>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      {reference.unmapped.length > 0 ? (
        <Note title="Symbols without a group">
          <p>
            {reference.unmapped.join(", ")} match no rule in{" "}
            <C>scripts/apiGroups.mjs</C>.
          </p>
        </Note>
      ) : null}
    </div>
  );
}

// ----------------------------------------------------------------- results

function Results({
  group,
  matches,
  linker,
  reference,
}: {
  group?: RefGroup;
  matches: { symbol: RefSymbol; via?: string }[];
  linker: Linker;
  reference: Reference;
}) {
  const [limit, setLimit] = useState(PAGE);
  const entry = group
    ? reference.entries.find((e) => e.id === group.entry)
    : undefined;
  return (
    <div>
      {group ? (
        <header className="ref-group-head">
          <h2 id="ref-title" tabIndex={-1}>
            {group.title}
          </h2>
          <p>
            {entry ? (
              <>
                <C>{entry.import}</C>.{" "}
              </>
            ) : null}
            {group.blurb}
          </p>
        </header>
      ) : (
        <h2 className="ref-results-title" id="ref-title" tabIndex={-1}>
          Matches
        </h2>
      )}
      {matches.length === 0 ? (
        <p>No symbol matches. Clear a kind, or search for less.</p>
      ) : (
        <div className="table-wrap">
          <table className="ref-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Kind</th>
                <th scope="col">What it is</th>
              </tr>
            </thead>
            <tbody>
              {matches.slice(0, limit).map(({ symbol, via }) => (
                <tr key={symbol.id}>
                  <td>
                    <a className="ref-name" href={href(symbol.id)}>
                      {symbol.name}
                    </a>
                    {!group ? (
                      <span className="ref-where">
                        {where(symbol, reference)}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Kind symbol={symbol} />
                  </td>
                  <td>
                    {via ? (
                      <span className="ref-via">
                        has member <C>{via}</C>
                      </span>
                    ) : (
                      summaryOf(symbol.d)
                    )}
                    {symbol.dep !== undefined ? (
                      <span className="ref-badge ref-deprecated">
                        deprecated
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {matches.length > limit ? (
        <p>
          <button
            type="button"
            className="api-chip"
            onClick={() => setLimit(limit + PAGE)}
          >
            Show {Math.min(PAGE, matches.length - limit)} more (
            {matches.length - limit} left)
          </button>
        </p>
      ) : null}
    </div>
  );
}

const where = (symbol: RefSymbol, reference: Reference): string => {
  const entry = reference.entries.find((e) => e.id === symbol.entry);
  const group = reference.groups.find((g) => g.id === symbol.group);
  return `${entry?.title ?? symbol.entry} › ${group?.title ?? symbol.group}`;
};

function Kind({ symbol }: { symbol: RefSymbol }) {
  return (
    <>
      <span className={`ref-kind ref-kind-${primaryKind(symbol)}`}>
        {symbol.kind.replaceAll("+", " + ")}
      </span>
      {symbol.tier !== "-" ? (
        <span className={`ref-badge ref-tier-${symbol.tier}`}>
          {symbol.tier}
        </span>
      ) : null}
    </>
  );
}

// ----------------------------------------------------------- text with links

/** Code with the names of exported symbols as links. */
function Linked({
  text,
  linker,
  entry,
  kind,
  self,
}: {
  text: string;
  linker: Linker;
  entry: string;
  /** Highlight as TypeScript. */
  kind?: "ts";
  /** A symbol not to link to, on its own page. */
  self?: string;
}) {
  const resolve = (name: string) => {
    const id = linker.resolve(name, entry);
    return id === self ? undefined : id;
  };
  const link = (chunk: string, key: string) =>
    tokenizeTypes(chunk, resolve).map((token, i) =>
      token.id ? (
        <a className="ref-link" href={href(token.id)} key={`${key}${i}`}>
          {token.text}
        </a>
      ) : (
        token.text
      ),
    );
  if (kind === "ts") {
    return (
      <>
        {highlight(text, "ts").map((token, i) => {
          const inner =
            token.kind === "string" || token.kind === "comment"
              ? token.text
              : link(token.text, `${i}.`);
          return token.kind ? (
            <span className={`tk-${token.kind}`} key={i}>
              {inner}
            </span>
          ) : (
            <Fragment key={i}>{inner}</Fragment>
          );
        })}
      </>
    );
  }
  return <>{link(text, "")}</>;
}

/** A block of declarations, in a code surface, with links to other symbols. */
function Declaration({
  text,
  linker,
  entry,
  self,
}: {
  text: string;
  linker: Linker;
  entry: string;
  self: string;
}) {
  return (
    <div className="codeblock ref-code">
      <pre tabIndex={0}>
        <code>
          <Linked
            text={text}
            linker={linker}
            entry={entry}
            kind="ts"
            self={self}
          />
        </code>
      </pre>
    </div>
  );
}

function Inline({
  text,
  linker,
  entry,
}: {
  text: string;
  linker: Linker;
  entry: string;
}) {
  const target = (name: string) => {
    const root = name.split(/[.#(]/)[0]!;
    return linker.resolve(name, entry) ?? linker.resolve(root, entry);
  };
  return (
    <>
      {parseInline(text).map((token, i) => {
        if (token.kind === "text") {
          return <Fragment key={i}>{token.text}</Fragment>;
        }
        const id = target(token.kind === "link" ? token.target! : token.text);
        const body = token.kind === "code" ? <C>{token.text}</C> : token.text;
        return id ? (
          <a className="ref-link" href={href(id)} key={i}>
            {body}
          </a>
        ) : token.kind === "link" ? (
          <C key={i}>{token.text}</C>
        ) : (
          <Fragment key={i}>{body}</Fragment>
        );
      })}
    </>
  );
}

function Doc({
  text,
  linker,
  entry,
}: {
  text: string | undefined;
  linker: Linker;
  entry: string;
}) {
  if (!text) {
    return null;
  }
  return (
    <div className="ref-doc">
      {parseDoc(text).map((block, i) =>
        block.kind === "p" ? (
          <p key={i}>
            <Inline text={block.text} linker={linker} entry={entry} />
          </p>
        ) : block.kind === "ul" ? (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} linker={linker} entry={entry} />
              </li>
            ))}
          </ul>
        ) : (
          <CodeBlock key={i} code={block.text} language="ts" />
        ),
      )}
    </div>
  );
}

// ------------------------------------------------------------ symbol page

function SymbolPage({
  symbol,
  linker,
  reference,
}: {
  symbol: RefSymbol;
  linker: Linker;
  reference: Reference;
}) {
  const entry = reference.entries.find((e) => e.id === symbol.entry);
  const group = reference.groups.find((g) => g.id === symbol.group);
  const kinds = symbol.kind.split("+");
  const own = (symbol.members ?? []).filter((m) => !m.fromId);
  const inherited = (symbol.members ?? []).filter((m) => m.fromId);
  const parts = {
    statics: own.filter((m) => m.st),
    props: own.filter((m) => !m.st && m.k !== "method"),
    methods: own.filter((m) => !m.st && m.k === "method"),
  };
  const isCallable = (symbol.sigs?.length ?? 0) > 0;
  return (
    <article className="ref-symbol">
      <p className="ref-crumbs">
        <a href={routeHash({ view: "all" })}>All</a> ›{" "}
        {entry ? <span>{entry.title}</span> : null}
        {group ? (
          <>
            {" "}
            › <a href={groupHref(group.id)}>{group.title}</a>
          </>
        ) : null}
      </p>
      <h2 className="ref-title" id="ref-title" tabIndex={-1}>
        <code>{symbol.name}</code>
        <Kind symbol={symbol} />
      </h2>
      <dl className="ref-facts">
        <dt>Import</dt>
        <dd>
          <C>{importLine(symbol)}</C>
        </dd>
        <dt>Defined in</dt>
        <dd>
          <C>{symbol.src}</C>
        </dd>
      </dl>
      {symbol.dep !== undefined ? (
        <Note title="Deprecated">
          <p>{symbol.dep || "Don't use this in new code."}</p>
        </Note>
      ) : null}
      {symbol.tier === "internal" ? (
        <Note title="Internal">
          <p>
            Exported for the package's own entry points: not part of the
            supported surface.
          </p>
        </Note>
      ) : null}

      <Declaration
        text={declarationText(symbol)}
        linker={linker}
        entry={symbol.entry}
        self={symbol.id}
      />
      <Doc text={symbol.d} linker={linker} entry={symbol.entry} />
      {symbol.tags?.map(([name, value], i) => (
        <p key={i} className="ref-tag">
          <strong>{name}</strong>{" "}
          <Inline text={value} linker={linker} entry={symbol.entry} />
        </p>
      ))}
      {symbol.ex?.map((code, i) => (
        <Fragment key={i}>
          <h3>Example</h3>
          <CodeBlock code={code} language="ts" />
        </Fragment>
      ))}

      <Hierarchy symbol={symbol} linker={linker} />

      {isCallable ? (
        <Signatures
          title={symbol.sigs!.length > 1 ? "Overloads" : "Parameters"}
          signatures={symbol.sigs!}
          prefix={
            kinds.includes("function") ? `function ${symbol.name}` : symbol.name
          }
          linker={linker}
          entry={symbol.entry}
        />
      ) : null}
      {symbol.priv ? (
        <p className="ref-note">
          Its constructor isn't public: get one from a static member.
        </p>
      ) : symbol.ctors?.length ? (
        <Signatures
          title={symbol.ctors.length > 1 ? "Constructors" : "Constructor"}
          signatures={symbol.ctors}
          prefix={`new ${symbol.name}`}
          returns={false}
          linker={linker}
          entry={symbol.entry}
        />
      ) : null}

      {symbol.ns ? (
        <>
          <h3>Members ({symbol.ns.length})</h3>
          <ul className="ref-ns">
            {symbol.ns.map((id) => {
              const member = linker.get(id);
              return (
                <li key={id}>
                  <a href={href(id)}>
                    {member?.name.slice(symbol.name.length + 1)}
                  </a>
                  {member ? (
                    <span className="ref-kind ref-kind-small">
                      {member.kind}
                    </span>
                  ) : null}
                  <span className="ref-ns-doc">
                    {summaryOf(member?.d, 110)}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      {symbol.enum ? (
        <>
          <h3>Members</h3>
          <DataTable
            label={`${symbol.name} members`}
            columns={[
              { head: "Name", cell: (m) => <C>{m.n}</C> },
              { head: "Value", cell: (m) => (m.v ? <C>{m.v}</C> : "") },
              { head: "Description", cell: (m) => m.d ?? "" },
            ]}
            rows={symbol.enum}
          />
        </>
      ) : null}

      <MemberSection
        title="Static members"
        members={parts.statics}
        symbol={symbol}
        linker={linker}
      />
      <MemberSection
        title={kinds.includes("class") ? "Properties" : "Members"}
        members={parts.props}
        symbol={symbol}
        linker={linker}
      />
      <MemberSection
        title="Methods"
        members={parts.methods}
        symbol={symbol}
        linker={linker}
      />
      <Inherited members={inherited} linker={linker} />
    </article>
  );
}

function Hierarchy({ symbol, linker }: { symbol: RefSymbol; linker: Linker }) {
  const parents = [...(symbol.ext ?? []), ...(symbol.impl ?? [])];
  const children = [...(symbol.extBy ?? []), ...(symbol.implBy ?? [])];
  if (parents.length === 0 && children.length === 0) {
    return null;
  }
  // The chain of first-named parents up to the root, so a reader sees the lineage.
  const lineage: { text: string; id?: string }[] = [];
  const seen = new Set([symbol.id]);
  let at: RefSymbol | undefined = symbol;
  while (at) {
    const next: { t: string; id?: string } | undefined = at.ext?.[0];
    if (!next) {
      break;
    }
    lineage.unshift({ text: next.t, id: next.id });
    at = next.id && !seen.has(next.id) ? linker.get(next.id) : undefined;
    if (at) {
      seen.add(at.id);
    }
  }
  const label = (id: string) => (
    <>
      <a className="ref-link" href={href(id)}>
        {linker.get(id)?.name ?? id}
      </a>
      <span className="ref-kind ref-kind-small">
        {linker.get(id)?.kind ?? ""}
      </span>
    </>
  );
  return (
    <>
      <h3>Hierarchy</h3>
      <ul className="ref-tree">
        {lineage.map((node, i) => (
          <li key={i} style={{ paddingInlineStart: `${i * 1.25}em` }}>
            {node.id ? label(node.id) : <C>{node.text}</C>}
          </li>
        ))}
        <li
          className="ref-tree-here"
          style={{ paddingInlineStart: `${lineage.length * 1.25}em` }}
        >
          <strong>{symbol.name}</strong>
          {symbol.impl?.length ? (
            <span className="ref-tree-note">
              {" "}
              implements{" "}
              {symbol.impl.map((h, i) => (
                <Fragment key={h.t}>
                  {i > 0 ? ", " : ""}
                  {h.id ? (
                    <a className="ref-link" href={href(h.id)}>
                      {h.t}
                    </a>
                  ) : (
                    <C>{h.t}</C>
                  )}
                </Fragment>
              ))}
            </span>
          ) : null}
        </li>
        {children.map((id) => (
          <li
            key={id}
            style={{ paddingInlineStart: `${(lineage.length + 1) * 1.25}em` }}
          >
            {label(id)}
            <span className="ref-tree-note">
              {symbol.implBy?.includes(id) ? " implements it" : " extends it"}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Params({
  params,
  linker,
  entry,
}: {
  params: RefParam[];
  linker: Linker;
  entry: string;
}) {
  if (params.length === 0) {
    return null;
  }
  const defaults = params.some((p) => p.def !== undefined);
  const docs = params.some((p) => p.d);
  return (
    <DataTable
      label="Parameters"
      columns={[
        {
          head: "Parameter",
          cell: (p: RefParam) => (
            <C>
              {p.rest ? "..." : ""}
              {p.n}
              {p.o ? "?" : ""}
            </C>
          ),
        },
        {
          head: "Type",
          cell: (p: RefParam) => (
            <code className="ref-type">
              <Linked text={p.t} linker={linker} entry={entry} />
            </code>
          ),
        },
        ...(defaults
          ? [
              {
                head: "Default",
                cell: (p: RefParam) => (p.def ? <C>{p.def}</C> : ""),
              },
            ]
          : []),
        ...(docs
          ? [
              {
                head: "Description",
                cell: (p: RefParam) => p.d ?? "",
              },
            ]
          : []),
      ]}
      rows={params}
    />
  );
}

function Signatures({
  title,
  signatures,
  prefix,
  returns = true,
  linker,
  entry,
}: {
  title: string;
  signatures: RefSignature[];
  prefix: string;
  returns?: boolean;
  linker: Linker;
  entry: string;
}) {
  const anyParams = signatures.some((s) => s.p.length > 0);
  return (
    <>
      <h3>{title}</h3>
      {signatures.map((signature, i) => (
        <div className="ref-sig" key={i}>
          {signatures.length > 1 ? (
            <>
              <div className="codeblock ref-code">
                <pre tabIndex={0}>
                  <code>
                    <Linked
                      text={signatureText(prefix, signature, { returns })}
                      linker={linker}
                      entry={entry}
                      kind="ts"
                    />
                  </code>
                </pre>
              </div>
              <Doc text={signature.d} linker={linker} entry={entry} />
            </>
          ) : null}
          <Params params={signature.p} linker={linker} entry={entry} />
          {returns && signature.r !== undefined && signature.r !== "void" ? (
            <p className="ref-returns">
              <strong>Returns</strong>{" "}
              <code className="ref-type">
                <Linked text={signature.r} linker={linker} entry={entry} />
              </code>
              {signature.rd ? (
                <>
                  {" "}
                  <Inline text={signature.rd} linker={linker} entry={entry} />
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ))}
      {!anyParams && signatures.length === 1 ? (
        <p className="ref-note">Takes no parameters.</p>
      ) : null}
    </>
  );
}

function MemberSection({
  title,
  members,
  symbol,
  linker,
}: {
  title: string;
  members: RefMember[];
  symbol: RefSymbol;
  linker: Linker;
}) {
  if (members.length === 0) {
    return null;
  }
  return (
    <section className="ref-members" aria-label={title}>
      <h3>
        {title} <span className="ref-count">{members.length}</span>
      </h3>
      {members.map((member) => (
        <div className="ref-member" key={`${member.st ? "s" : ""}${member.n}`}>
          <div className="codeblock ref-code ref-member-code">
            <pre tabIndex={0}>
              <code>
                {memberLines(member).map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 ? "\n" : ""}
                    {member.st ? (
                      <span className="tk-keyword">static </span>
                    ) : null}
                    {member.ro && member.k !== "method" ? (
                      <span className="tk-keyword">readonly </span>
                    ) : null}
                    <Linked
                      text={line}
                      linker={linker}
                      entry={symbol.entry}
                      kind="ts"
                    />
                  </Fragment>
                ))}
              </code>
            </pre>
          </div>
          {member.dep !== undefined ? (
            <p className="ref-note">
              <span className="ref-badge ref-deprecated">deprecated</span>{" "}
              {member.dep}
            </p>
          ) : null}
          {member.from ? (
            <p className="ref-note">Declared on {member.from}.</p>
          ) : null}
          <Doc text={member.d} linker={linker} entry={symbol.entry} />
          {member.sigs?.map((signature, i) =>
            signature.p.some((p) => p.d || p.def !== undefined) ||
            signature.rd ||
            signature.d ? (
              <div key={i} className="ref-member-detail">
                {member.sigs!.length > 1 ? (
                  <Doc
                    text={signature.d}
                    linker={linker}
                    entry={symbol.entry}
                  />
                ) : null}
                <Params
                  params={signature.p}
                  linker={linker}
                  entry={symbol.entry}
                />
                {signature.rd ? (
                  <p className="ref-returns">
                    <strong>Returns</strong>{" "}
                    <Inline
                      text={signature.rd}
                      linker={linker}
                      entry={symbol.entry}
                    />
                  </p>
                ) : null}
              </div>
            ) : null,
          )}
        </div>
      ))}
    </section>
  );
}

function Inherited({
  members,
  linker,
}: {
  members: RefMember[];
  linker: Linker;
}) {
  if (members.length === 0) {
    return null;
  }
  const byParent = new Map<string, RefMember[]>();
  for (const member of members) {
    const list = byParent.get(member.fromId!) ?? [];
    list.push(member);
    byParent.set(member.fromId!, list);
  }
  return (
    <section className="ref-members" aria-label="Inherited members">
      <h3>
        Inherited <span className="ref-count">{members.length}</span>
      </h3>
      {[...byParent].map(([id, list]) => (
        <details key={id} className="ref-inherited">
          <summary>
            From <C>{linker.get(id)?.name ?? id}</C> ({list.length})
          </summary>
          <p>
            {list.map((member, i) => (
              <Fragment key={`${member.st ? "s" : ""}${member.n}`}>
                {i > 0 ? ", " : ""}
                <C>
                  {member.st ? "static " : ""}
                  {member.n}
                  {member.k === "method" ? "()" : ""}
                </C>
              </Fragment>
            ))}
          </p>
          <p>
            <a href={href(id)}>
              Their signatures and docs are on {linker.get(id)?.name ?? id}.
            </a>
          </p>
        </details>
      ))}
    </section>
  );
}
