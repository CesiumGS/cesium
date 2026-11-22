import "./workPath.css";
import {
  Button,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronRight } from "@stratakit/icons/chevron-right";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgReCenter } from "@stratakit/icons/re-center";
import { svgSearch } from "@stratakit/icons/search";
import { Icon } from "@stratakit/mui";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { matchFocus } from "../dependencies.ts";
import { STAGE_NAMES, type WorkSnapshot } from "../work.ts";
import {
  countText,
  GROUP_PREFIX,
  type PathNode,
  type PathView as PathModel,
  pathTargetOf,
  pathViewOf,
  whyNotDone,
} from "../workPath.ts";
import { InlineText } from "./ItemText.tsx";
import {
  ItemRef,
  KindId,
  ReleasePicker,
  type WorkViewDef,
  type WorkViewProps,
} from "./Work.tsx";

/**
 * The Path view (CS-746; DESIGN.md, "The Path view"): only what lies
 * upstream of one target, a release, a milestone or an item, collapsed to
 * milestones and drawn with arrows. The longest remaining chain is the
 * spine along the top, gates are nodes of their own, and work that can
 * start now is marked. A sentence above answers "why isn't this done?".
 * The target lives in the URL: `focus=` for a milestone or an item,
 * otherwise the release picked (`release=`).
 */
export function PathView(p: WorkViewProps) {
  const { s, flight, proposals, release, releases, search, set } = p;
  const target = pathTargetOf(s, search.focus, release?.id);
  const model = useMemo(
    () =>
      target ? pathViewOf(s, target.id, { proposals, flight }) : undefined,
    [s, target?.id, proposals, flight],
  );
  const toRelease = (id: string) => set({ release: id, focus: undefined });
  const toTarget = (id: string) =>
    releases.some((r) => r.id === id) ||
    s.items.some((it) => it.id === id && it.release)
      ? toRelease(id)
      : set({ focus: id });

  const picked =
    target?.kind === "release"
      ? releases.find((r) => r.id === target.id)
      : undefined;

  return (
    <div className="work-path">
      <div className="work-path-head">
        <span className="work-path-head-label">Path to</span>
        <ReleasePicker
          releases={releases}
          release={picked}
          onRelease={toRelease}
        />
        <span className="work-path-head-or" aria-hidden="true">
          or
        </span>
        <TargetChooser s={s} onChoose={(id) => toTarget(id)} />
      </div>

      {!model ? (
        <div className="work-card">
          <Typography variant="body-md" render={<p />} className="work-empty">
            {search.focus
              ? `${search.focus} isn't on the board. Pick a release, or search for a milestone or item.`
              : "No release is open. Search for a milestone or item to see its path."}
          </Typography>
        </div>
      ) : (
        <PathBody
          p={p}
          model={model}
          onTarget={toTarget}
          onClear={
            target?.kind !== "release" && release
              ? () => toRelease(release.id)
              : undefined
          }
        />
      )}
    </div>
  );
}

function PathBody({
  p,
  model,
  onTarget,
  onClear,
}: {
  p: WorkViewProps;
  model: PathModel;
  onTarget: (id: string) => void;
  onClear?: () => void;
}) {
  const why = whyNotDone(model);
  const t = model.target;
  const onChain = model.spine.length > 1 && model.spineReady.length > 0;
  const startShown = (onChain ? model.spineReady : model.ready)
    .filter((id) => id !== t.id)
    .slice(0, 3);
  const name = t.short ?? t.id;
  return (
    <>
      <section
        className="work-card work-path-why"
        aria-labelledby="work-path-why-h"
      >
        <Typography
          variant="subtitle-md"
          render={<h2 />}
          id="work-path-why-h"
          className="work-path-why-h"
        >
          <span>Why isn't</span>{" "}
          <ItemRef id={t.id} title={t.title} className="work-path-why-ref" />{" "}
          <span>done?</span>
        </Typography>
        <Typography
          variant="body-md"
          render={<p />}
          className="work-path-why-text"
        >
          {why.chain} {why.gates} {why.start}
        </Typography>
        {startShown.length > 0 && (
          <div className="work-path-start">
            <Typography variant="caption-md" color="textSecondary">
              {onChain ? "Can start now on that chain" : "Can start now"}
            </Typography>
            <ul>
              {startShown.map((id) => (
                <li key={id}>
                  <span
                    className="work-swatch stage-ready"
                    aria-hidden="true"
                  />
                  <ItemRef id={id} />
                </li>
              ))}
              {(onChain ? model.spineReady : model.ready).length >
                startShown.length && (
                <li className="work-path-more">
                  and{" "}
                  {(onChain ? model.spineReady : model.ready).length -
                    startShown.length}{" "}
                  more, in the drawing below
                </li>
              )}
            </ul>
          </div>
        )}
        <Context model={model} onClear={onClear} p={p} />
      </section>

      <section
        className="work-card work-path-card"
        aria-labelledby="work-path-draw-h"
      >
        <header className="work-card-head">
          <span className="work-card-titles">
            <Typography
              variant="subtitle-md"
              render={<h2 />}
              id="work-path-draw-h"
            >
              What lies upstream of {name}
            </Typography>
            <Typography variant="caption-md" color="textSecondary">
              {model.nodes.length > 1
                ? `${countText(model.open.milestones, "milestone")} and ${countText(model.open.items, "work item")} open before it, upstream on the left. The longest chain runs along the top.`
                : "Nothing open lies before it."}
            </Typography>
          </span>
        </header>
        <Key />
        <Drawing
          key={`${model.target.id}:${p.proposals}`}
          model={model}
          selected={p.selected}
          onTarget={onTarget}
        />
        {model.loops.length > 0 && <Loops model={model} />}
        {p.scoped && (
          <Typography
            variant="caption-md"
            color="textSecondary"
            render={<p />}
            className="work-path-note"
          >
            The scope doesn't narrow a path: everything upstream of the target
            shows.
          </Typography>
        )}
      </section>
    </>
  );
}

/** Where the target sits, and the way back to the release. */
function Context({
  model,
  onClear,
  p,
}: {
  model: PathModel;
  onClear?: () => void;
  p: WorkViewProps;
}) {
  const t = model.target;
  const ms = t.milestones;
  if (!ms.length && !onClear && !t.proposed) {
    return null;
  }
  return (
    <Typography
      variant="caption-md"
      color="textSecondary"
      render={<p />}
      className="work-path-context"
    >
      {t.proposed && <span className="work-path-proposed">Proposed</span>}
      {ms.length > 0 && (
        <span>
          It is part of{" "}
          {ms.map((m, i) => (
            <span key={m}>
              {i > 0 && (i === ms.length - 1 ? " and " : ", ")}
              <ItemRef id={m} />
            </span>
          ))}
          .
        </span>
      )}
      {onClear && p.release && (
        <Button variant="text" size="small" onClick={onClear}>
          Back to the path to {p.release.short}
        </Button>
      )}
    </Typography>
  );
}

/** The key: one line, every mark named. */
function Key() {
  return (
    <ul className="work-path-key" aria-label="How to read the drawing">
      <li>
        <span className="work-path-key-spine" aria-hidden="true" />
        Longest chain
      </li>
      <li>
        <span className="work-path-key-arrow" aria-hidden="true" />
        Must be done first
      </li>
      <li>
        <span className="work-path-key-gate" aria-hidden="true" />
        Gate: a decision or an outside wait
      </li>
      <li>
        <span className="work-swatch stage-ready" aria-hidden="true" />
        Has work that can start now
      </li>
      <li>
        <span className="work-path-key-proposed" aria-hidden="true" />
        Proposed
      </li>
    </ul>
  );
}

// The drawing's grid, in CSS pixels. Positions come from the model's
// layers and lanes only, so nothing moves when a node opens.
const NODE_W = 228;
const NODE_H = 78;
const COL_GAP = 48;
const ROW_GAP = 14;
const PAD = 8;

const xOf = (n: PathNode) => PAD + n.layer * (NODE_W + COL_GAP);
const yOf = (n: PathNode) => PAD + n.lane * (NODE_H + ROW_GAP);

function Drawing({
  model,
  selected,
  onTarget,
}: {
  model: PathModel;
  selected?: string;
  onTarget: (id: string) => void;
}) {
  const [hot, setHot] = useState<string | undefined>();
  // Whether more of the drawing lies to the right: its edge fades.
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const check = () => {
    const el = scroller.current;
    setMore(!!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };
  useEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const markerId = useId().replace(/:/g, "");
  const nodeOf = useMemo(
    () => new Map(model.nodes.map((n) => [n.id, n])),
    [model],
  );
  const width = PAD * 2 + model.layers * NODE_W + (model.layers - 1) * COL_GAP;
  const height = PAD * 2 + model.lanes * NODE_H + (model.lanes - 1) * ROW_GAP;
  const leadsTo = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const e of model.edges) {
      out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
    }
    return out;
  }, [model]);

  return (
    <div
      ref={scroller}
      className={`work-path-scroll${more ? " more" : ""}`}
      tabIndex={-1}
      onScroll={check}
    >
      <div className="work-path-canvas" style={{ width, height }}>
        <svg
          className="work-path-arrows"
          width={width}
          height={height}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <marker
              id={`${markerId}-a`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 8 4 0 8Z" className="work-path-head-arrow" />
            </marker>
            <marker
              id={`${markerId}-s`}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0 8 4 0 8Z" className="work-path-head-spine" />
            </marker>
          </defs>
          {model.edges.map((e) => {
            const a = nodeOf.get(e.from);
            const b = nodeOf.get(e.to);
            if (!a || !b) {
              return null;
            }
            const x1 = xOf(a) + NODE_W;
            const y1 = yOf(a) + NODE_H / 2;
            const x2 = xOf(b) - 2;
            const y2 = yOf(b) + NODE_H / 2;
            const dx = Math.max(24, (x2 - x1) / 2);
            const on = hot === e.from || hot === e.to;
            return (
              <path
                key={`${e.from}>${e.to}`}
                d={`M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`}
                className={`work-path-edge${e.spine ? " spine" : ""}${on ? " hot" : ""}${hot && !on ? " dim" : ""}`}
                markerEnd={`url(#${markerId}-${e.spine ? "s" : "a"})`}
              />
            );
          })}
        </svg>
        <ul className="work-path-nodes" aria-label="The path, upstream first">
          {model.nodes.map((n) => (
            <NodeBox
              key={n.id}
              n={n}
              model={model}
              leadsTo={leadsTo.get(n.id) ?? []}
              selected={selected}
              hot={hot}
              setHot={setHot}
              onTarget={onTarget}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** What a node is, in a few words under its name. */
function metaOf(n: PathNode, model: PathModel): string {
  const ready = n.ready.length ? ` · ${n.ready.length} ready` : "";
  const flying = n.inFlight.length ? ` · ${n.inFlight.length} in progress` : "";
  switch (n.kind) {
    case "milestone": {
      const work = n.items.length;
      if (n.target && !work) {
        return "No open item left: its check is next";
      }
      const left = n.whole
        ? countText(work, "open item")
        : `${work} of its ${n.openTotal} open on this path`;
      return `${left}${ready}${flying}`;
    }
    case "decision":
    case "external": {
      const who =
        n.kind === "decision"
          ? n.gate?.who === "owner" || !n.gate?.who
            ? "Your decision"
            : `Decided by ${n.gate.who}`
          : `Waits on ${n.gate?.who ?? "an outside party"}`;
      return `${who} · ${n.gate?.answerable ? "open now" : "waits on items"}`;
    }
    case "release":
      return n.target
        ? "The target"
        : `An earlier release · ${countText(n.release?.milestones ?? 0, "milestone")} it needs`;
    case "group": {
      const to = n.id.slice(GROUP_PREFIX.length);
      return to === model.target.id
        ? `Each leads straight to ${model.target.short ?? to}`
        : "Nothing open before them";
    }
    default:
      return n.target
        ? `The target · ${STAGE_NAMES[n.stage]}`
        : STAGE_NAMES[n.stage];
  }
}

/** The node's line in full, for its tip: a gate's state in plain words. */
function metaTip(n: PathNode, model: PathModel): string {
  const line = metaOf(n, model);
  if (n.gate) {
    return line
      .replace(
        "open now",
        n.kind === "decision" ? "it can be answered now" : "it is open now",
      )
      .replace("waits on items", "it waits on other items first");
  }
  return n.ready.length
    ? `${line}. Has work that can start now: ${n.ready.length}.`
    : line;
}

function groupTitle(n: PathNode): string {
  const ms = (n.members ?? []).filter((m) => m.kind === "milestone").length;
  const rest = (n.members?.length ?? 0) - ms;
  return [ms && countText(ms, "milestone"), rest && countText(rest, "item")]
    .filter(Boolean)
    .join(" and ");
}

function NodeBox({
  n,
  model,
  leadsTo,
  selected,
  hot,
  setHot,
  onTarget,
}: {
  n: PathNode;
  model: PathModel;
  leadsTo: readonly string[];
  selected?: string;
  hot?: string;
  setHot: (id: string | undefined) => void;
  onTarget: (id: string) => void;
}) {
  const [at, setAt] = useState<HTMLElement | null>(null);
  const panelId = useId();
  // Reduced motion: the panel appears without growing in.
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLLIElement>(null);
  const opens =
    (n.kind === "milestone" && n.items.length > 0) || n.kind === "group";
  const isGate = n.kind === "decision" || n.kind === "external";
  const hasReady = n.ready.length > 0;
  const linked = hot === n.id;
  const leadsText = leadsTo
    .map((id) =>
      id.startsWith(GROUP_PREFIX)
        ? "a group below"
        : id === model.target.id
          ? `${model.target.short ?? id}, the target`
          : id,
    )
    .join(", ");
  const label = n.kind === "group" ? groupTitle(n) : `${n.id} ${n.title}`;
  return (
    <li
      ref={ref}
      className={[
        "work-path-node",
        `k-${n.kind === "item" ? "work" : n.kind === "group" ? "milestone" : n.kind}`,
        `stage-${n.stage.toLowerCase().replace(" ", "-")}`,
        n.spine ? "spine" : "",
        n.target ? "target" : "",
        isGate ? "gate" : "",
        n.kind === "group" ? "group" : "",
        n.proposed ? "proposed" : "",
        hasReady ? "has-ready" : "",
        n.id === selected ? "selected" : "",
        linked ? "hot" : "",
        at ? "open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ left: xOf(n), top: yOf(n), width: NODE_W, height: NODE_H }}
      onPointerEnter={() => setHot(n.id)}
      onPointerLeave={() => setHot(undefined)}
      onFocus={() => setHot(n.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHot(undefined);
        }
      }}
    >
      <span className="work-path-node-stage" aria-hidden="true" />
      <span className="work-path-node-body">
        <span className="work-path-node-name">
          {n.kind === "group" ? (
            <span className="work-path-group-title">{groupTitle(n)}</span>
          ) : (
            <ItemRef id={n.id} title={n.title} />
          )}
        </span>
        <span className="work-path-node-meta">
          {hasReady && (
            <span
              className="work-swatch stage-ready"
              title="Has work that can start now"
              aria-hidden="true"
            />
          )}
          <span className="work-path-node-meta-text" title={metaTip(n, model)}>
            {metaOf(n, model)}
          </span>
        </span>
        {leadsTo.length > 0 && (
          <span className="visually-hidden">
            . Must be done before {leadsText}.
          </span>
        )}
      </span>
      <span className="work-path-node-tools">
        {opens && (
          <IconButton
            size="small"
            label={`${at ? "Hide" : "Show"} ${n.kind === "group" ? `the ${groupTitle(n)}` : `the open items of ${n.id} on this path`}`}
            aria-expanded={!!at}
            aria-controls={at ? panelId : undefined}
            onClick={() => setAt(at ? null : ref.current)}
          >
            <Icon href={at ? svgChevronDown : svgChevronRight} />
          </IconButton>
        )}
        {!n.target && n.kind !== "group" && (
          <IconButton
            size="small"
            className="work-path-retarget"
            label={`Show the path to ${n.kind === "release" ? (n.release?.short ?? n.id) : n.id}`}
            onClick={() => onTarget(n.id)}
          >
            <Icon href={svgReCenter} />
          </IconButton>
        )}
      </span>
      {opens && (
        <Popover
          id={panelId}
          open={!!at}
          anchorEl={at}
          onClose={() => setAt(null)}
          transitionDuration={still ? 0 : "auto"}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            paper: {
              className: "work-path-pop",
              "aria-label": label,
              role: "region",
            } as object,
          }}
        >
          {n.kind === "group" ? (
            <GroupList
              n={n}
              model={model}
              onTarget={(id) => {
                setAt(null);
                onTarget(id);
              }}
            />
          ) : (
            <ItemList n={n} />
          )}
        </Popover>
      )}
    </li>
  );
}

/** A milestone's open items on the path, opened in place. */
function ItemList({ n }: { n: PathNode }) {
  const ready = new Set(n.ready);
  const flying = new Set(n.inFlight);
  return (
    <div className="work-path-pop-body">
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        {n.whole
          ? `Its ${countText(n.items.length, "open item")}`
          : `${n.items.length} of its ${n.openTotal} open items are on this path`}
        {n.ready.length ? `, ${n.ready.length} ready now` : ""}
      </Typography>
      <ul className="work-path-pop-list">
        {n.items.map((id) => (
          <li key={id}>
            <span
              className={`work-swatch ${ready.has(id) ? "stage-ready" : flying.has(id) ? "stage-in-flight" : "none"}`}
              title={
                ready.has(id)
                  ? "Ready: nothing it needs is open"
                  : flying.has(id)
                    ? "In progress"
                    : undefined
              }
              aria-hidden="true"
            />
            <ItemRef id={id} />
            {ready.has(id) && <span className="visually-hidden"> (ready)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A group's members, opened in place; each can become the target. */
function GroupList({
  n,
  model,
  onTarget,
}: {
  n: PathNode;
  model: PathModel;
  onTarget: (id: string) => void;
}) {
  return (
    <div className="work-path-pop-body">
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        Drawn as one. {metaOf(n, model)}
        {n.ready.length
          ? `; ${n.ready.length} of their items can start now`
          : ""}
        .
      </Typography>
      <ul className="work-path-pop-list members">
        {(n.members ?? []).map((m) => (
          <li key={m.id}>
            <span
              className={`work-swatch ${m.ready.length ? "stage-ready" : "none"}`}
              aria-hidden="true"
            />
            <span className="work-path-member">
              <ItemRef id={m.id} title={m.title} />
              <span className="work-path-member-meta">{metaOf(m, model)}</span>
            </span>
            <IconButton
              size="small"
              label={`Show the path to ${m.id}`}
              onClick={() => onTarget(m.id)}
            >
              <Icon href={svgReCenter} />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Milestones that wait on each other through their items: named, not drawn. */
function Loops({ model }: { model: PathModel }) {
  return (
    <div className="work-path-loops">
      <Typography variant="caption-md" color="textSecondary" render={<p />}>
        {model.loops.length === 1
          ? "One wait closes a loop"
          : `${model.loops.length} waits close loops`}
        : these wait on each other through their items, so the arrow is left out
        of the drawing.
      </Typography>
      <ul>
        {model.loops.map((l) => (
          <li key={`${l.from}>${l.to}`}>
            <LoopEnd id={l.from} model={model} />
            <span
              className="work-path-loop-arrow"
              aria-label="must be done before"
            >
              →
            </span>
            <LoopEnd id={l.to} model={model} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoopEnd({ id, model }: { id: string; model: PathModel }): ReactNode {
  if (id.startsWith(GROUP_PREFIX)) {
    const n = model.nodes.find((x) => x.id === id);
    return <span>{n ? groupTitle(n) : "a group"}</span>;
  }
  return <ItemRef id={id} />;
}

/** The view's own target search: any milestone or item, by ID or title. */
function TargetChooser({
  s,
  onChoose,
}: {
  s: WorkSnapshot;
  onChoose: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const found = useMemo(() => matchFocus(s, q, 8), [s, q]);
  const choose = (id: string) => {
    setQ("");
    onChoose(id);
    input.current?.focus();
  };
  return (
    <div className="work-path-chooser">
      <TextField
        size="small"
        type="search"
        placeholder="A milestone or item"
        value={q}
        inputRef={input}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && found[0]) {
            e.preventDefault();
            choose(found[0].id);
          } else if (e.key === "Escape" && q) {
            setQ("");
          } else if (e.key === "ArrowDown" && found.length) {
            e.preventDefault();
            document
              .getElementById(listId)
              ?.querySelector<HTMLButtonElement>("button")
              ?.focus();
          }
        }}
        className="work-path-chooser-field"
        slotProps={{
          htmlInput: {
            "aria-label": "Path to a milestone or item, by ID or title",
            "aria-controls": found.length ? listId : undefined,
          },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Icon href={svgSearch} />
              </InputAdornment>
            ),
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton
                  label="Clear"
                  size="small"
                  onClick={() => {
                    setQ("");
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
      {q.trim() && (
        <ul
          id={listId}
          className="work-path-chooser-list"
          aria-label="Matches"
          onKeyDown={(e) => {
            const items = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
            ];
            const i = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (e.key === "ArrowDown" && i < items.length - 1) {
              e.preventDefault();
              items[i + 1]!.focus();
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              (i > 0 ? items[i - 1]! : input.current)?.focus();
            } else if (e.key === "Escape") {
              setQ("");
              input.current?.focus();
            }
          }}
        >
          {found.length ? (
            found.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => choose(f.id)}>
                  <KindId id={f.id} />
                  <span className="work-path-chooser-title">
                    <InlineText text={f.title} />
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="work-path-chooser-none">
              <Typography variant="body-sm" color="textSecondary">
                No milestone or item matches.
              </Typography>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Mounted by the shell (DESIGN.md, "The view shell"). */
export const workView: WorkViewDef = {
  id: "path",
  label: "Path",
  question:
    "Why isn't it done: what lies upstream of a release, milestone or item",
  place: "roadmap",
  order: 20,
  proposals: true,
  Component: PathView,
};
