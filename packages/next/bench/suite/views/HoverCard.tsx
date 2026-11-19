import "./hoverCard.css";
import { Tooltip, useMediaQuery } from "@mui/material";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CARD_BLOCKERS,
  type CardBlocker,
  type CardSlip,
  ENTITY_KIND_NAMES,
  type InFlight,
  type Plan,
  type Stage,
  STAGE_NAMES,
  STAGES,
  segmentLabel,
  shortVersion,
  slipText,
  stageWords,
  type WorkCard,
  workCardOf,
  type WorkSnapshot,
} from "../work.ts";
import { useChartTokens } from "./common.tsx";
import { KindId, KindMark } from "./Work.tsx";

/**
 * The Work page's one hover card (CS-696; DESIGN.md, "The hover card"):
 * what a mark is and how far along, what holds it up, how much room it
 * has before its release moves, and what a click or a key does. The shell
 * (`HoverCard`) takes any content, so the Flow chart (CS-698) can mount it
 * with its own; `WorkHoverCard` fills it for a work item, a milestone, a
 * release, a project or a Projects cell.
 *
 * It opens on hover and on keyboard focus, beside its mark and never over
 * it (the popper flips and shifts along the mark's edge, never across
 * it), and closes on Escape or when the pointer or focus leaves. Its
 * opening fade is dropped under reduced motion.
 */

const slug = (st: Stage) => st.toLowerCase().replace(/\s+/g, "-");

/** Placements the card falls back to near the screen's edges, in order. */
const FALLBACKS = ["top-start", "right-start", "left-start", "bottom-end"];

/**
 * The shell: any content in a card about 320 px wide, beside its mark.
 * `keys` are single keys that act while the card is open (D for
 * dependencies); the child must take a ref and pointer and focus events.
 */
export function HoverCard({
  card,
  children,
  keys,
  placement = "bottom-start",
}: {
  card: ReactNode;
  children: ReactElement;
  /** Lower-case keys and what each does while the card is open. */
  keys?: Record<string, () => void>;
  placement?: "bottom-start" | "top-start" | "right-start" | "top";
}) {
  const [open, setOpen] = useState(false);
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  // The card renders in a portal, outside the page's theme: it takes it along.
  const theme = useChartTokens();
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || !keys) {
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      const act = keys[e.key.toLowerCase()];
      if (act) {
        e.preventDefault();
        setOpen(false);
        act();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, keys]);
  return (
    <Tooltip
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      title={card}
      placement={placement}
      enterDelay={300}
      enterNextDelay={120}
      leaveDelay={0}
      disableInteractive
      describeChild
      slotProps={{
        tooltip: { className: "hover-card-shell" },
        popper: {
          className: `hover-card-popper ${theme}`,
          modifiers: [
            { name: "offset", options: { offset: [0, 8] } },
            { name: "flip", options: { fallbackPlacements: FALLBACKS } },
            {
              name: "preventOverflow",
              options: { padding: 8, altAxis: false, tether: true },
            },
          ],
        },
        transition: still ? { timeout: 0 } : undefined,
      }}
    >
      {children}
    </Tooltip>
  );
}

/** What the card needs from the page: the snapshot, the plan, and its ways out. */
export interface WorkCardScope {
  s: WorkSnapshot;
  flight: InFlight;
  /** The Plan view's sequence, with its slots: the slip line measures on it. */
  plan?: Plan;
  /** Opens the Dependencies view on a milestone or item (the D key). */
  onDeps?: (id: string) => void;
}

const WorkCardContext = createContext<WorkCardScope | undefined>(undefined);

export function WorkCardProvider({
  value,
  children,
}: {
  value: WorkCardScope;
  children: ReactNode;
}) {
  return (
    <WorkCardContext.Provider value={value}>
      {children}
    </WorkCardContext.Provider>
  );
}

/** A short label of one bar segment, on hover and focus (CS-696). */
export function SegmentTip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const theme = useChartTokens();
  return (
    <Tooltip
      title={label}
      placement="top"
      enterDelay={80}
      disableInteractive
      slotProps={{
        tooltip: { className: "hover-seg-tip" },
        popper: { className: theme },
        transition: still ? { timeout: 0 } : undefined,
      }}
    >
      {children}
    </Tooltip>
  );
}

/**
 * A progress bar whose every segment names itself: "2 blocked: waiting
 * on CS-118 and CS-55". `focusable` makes each segment a stop for the
 * keyboard; inside a button (a Projects cell) it can't be, and the
 * button's card labels the colors instead.
 */
export function StageBar({
  s: given,
  items,
  flight: givenFlight,
  counts,
  className,
  focusable = false,
}: {
  /** The snapshot and work in flight; the page's card scope by default. */
  s?: WorkSnapshot;
  items: readonly string[];
  flight?: InFlight;
  counts: Record<Stage, number>;
  className?: string;
  focusable?: boolean;
}) {
  const scope = useContext(WorkCardContext);
  const s = given ?? scope?.s;
  const flight = givenFlight ?? scope?.flight;
  const order: Stage[] = ["Done", "In flight", "Ready", "Waiting", "Proposed"];
  return (
    <span
      className={`work-pbar-track${className ? ` ${className}` : ""}`}
      role={focusable ? "group" : undefined}
      aria-label={focusable ? "Progress by stage" : undefined}
      aria-hidden={focusable ? undefined : true}
    >
      {STAGES.filter((st) => counts[st] > 0)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((st) => {
          const label = s
            ? segmentLabel(s, st, items, flight)
            : `${counts[st]} ${STAGE_NAMES[st].toLowerCase()}`;
          return (
            <SegmentTip key={st} label={label}>
              <span
                className={`work-roadmap-seg stage-${slug(st)}`}
                style={{ flexGrow: counts[st] }}
                tabIndex={focusable ? 0 : undefined}
                role={focusable ? "img" : undefined}
                aria-label={focusable ? label : undefined}
              />
            </SegmentTip>
          );
        })}
    </span>
  );
}

/**
 * The card for one mark on the Work page. `items` and `release` describe a
 * set given outright (a Projects cell); `onDeps` overrides the D key (the
 * Dependencies view centers in place). Without the page's scope, or for an
 * ID the tracker doesn't know, the mark goes bare.
 */
export function WorkHoverCard({
  id,
  title,
  items,
  release,
  onDeps,
  click = "Click for details",
  placement,
  children,
}: {
  id: string;
  /** Its name, for a set the tracker has no entity for ("No project"). */
  title?: string;
  items?: readonly string[];
  release?: string;
  onDeps?: (id: string) => void;
  /** The footer's first part: what a click on the mark does. */
  click?: string;
  placement?: "bottom-start" | "top-start" | "right-start" | "top";
  children: ReactElement;
}) {
  const scope = useContext(WorkCardContext);
  // A project, or a set given outright, has no Dependencies view of its own.
  const own = !items && !!scope && !scope.s.projects.some((p) => p.id === id);
  const deps = own ? (onDeps ?? scope?.onDeps) : undefined;
  const keys = useMemo(
    () => (deps ? { d: () => deps(id) } : undefined),
    [deps, id],
  );
  if (!scope) {
    return children;
  }
  return (
    <HoverCard
      card={
        <LazyWorkCard
          scope={scope}
          id={id}
          title={title}
          items={items}
          release={release}
          footer={deps ? `${click} · D for dependencies` : click}
        />
      }
      keys={keys}
      placement={placement}
    >
      {children}
    </HoverCard>
  );
}

/** Builds the card only when it opens: a page has hundreds of marks. */
function LazyWorkCard({
  scope,
  id,
  title,
  items,
  release,
  footer,
}: {
  scope: WorkCardScope;
  id: string;
  title?: string;
  items?: readonly string[];
  release?: string;
  footer: string;
}) {
  const card = workCardOf(scope.s, id, {
    flight: scope.flight,
    plan: scope.plan,
    items,
    release,
    title,
  });
  return card ? <WorkCardBody card={card} footer={footer} /> : null;
}

/** The card's sections, each under a short label; what isn't known is left out. */
export function WorkCardBody({
  card,
  footer,
}: {
  card: WorkCard;
  footer?: string;
}) {
  const total = card.counts
    ? STAGES.reduce((n, st) => n + card.counts![st], 0)
    : 0;
  const owner = card.blockers.filter((b) => b.owner);
  const shown = card.blockers.slice(0, CARD_BLOCKERS);
  const more = card.blockers.length - shown.length;
  return (
    <div className="hover-card">
      <div className="hover-card-head">
        <KindMark kind={card.kind} />
        <span className="hover-card-title">{card.title}</span>
      </div>
      <div className="hover-card-facts">
        {card.kind === "project" ? (
          card.id && (
            <span className="hover-card-kind">
              {ENTITY_KIND_NAMES.project} {card.id}
            </span>
          )
        ) : (
          <KindId id={card.id} kind={card.kind} />
        )}
        <StateChip stage={card.stage} />
        {card.release && (
          <span className="hover-card-release">
            <KindMark kind="release" named={false} />
            {card.release.version}
          </span>
        )}
      </div>

      {card.counts && total > 1 && (
        <section className="hover-card-section">
          <h4>Progress</h4>
          <span className="work-pbar-track hover-card-bar" aria-hidden="true">
            {stageWords(card.counts).map(({ st }) => (
              <span
                key={st}
                className={`work-roadmap-seg stage-${slug(st)}`}
                style={{ flexGrow: card.counts![st] }}
              />
            ))}
          </span>
          <ul className="hover-card-words">
            {stageWords(card.counts).map((w) => (
              <li key={w.st}>
                <span
                  className={`work-swatch stage-${slug(w.st)}`}
                  aria-hidden="true"
                />
                {w.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {shown.length > 0 && (
        <section className="hover-card-section">
          <h4>Held up by</h4>
          <ul className="hover-card-blockers">
            {shown.map((b, k) => (
              <BlockerLine
                key={b.id}
                b={b}
                lead={
                  b.owner
                    ? k === 0
                      ? "Needs your answer"
                      : undefined
                    : k === owner.length
                      ? "Waiting on"
                      : undefined
                }
              />
            ))}
          </ul>
          {more > 0 && <p className="hover-card-more">+{more} more</p>}
        </section>
      )}

      {card.slip && (
        <section className="hover-card-section">
          <h4>Slip</h4>
          <p className="hover-card-slip">{slipText(card.slip)}</p>
          <SlipBar slip={card.slip} />
        </section>
      )}
      {card.note && <p className="hover-card-note">{card.note}</p>}
      {footer && <p className="hover-card-foot">{footer}</p>}
    </div>
  );
}

/** One state chip: the stage's fill as a swatch, its name in words. */
function StateChip({ stage }: { stage?: Stage }) {
  return (
    <span className="hover-card-chip">
      {stage && (
        <span
          className={`work-swatch stage-${slug(stage)}`}
          aria-hidden="true"
        />
      )}
      {stage ? STAGE_NAMES[stage] : "Dropped"}
    </span>
  );
}

function BlockerLine({ b, lead }: { b: CardBlocker; lead?: string }) {
  return (
    <li className={b.owner ? "owner" : undefined}>
      {lead && <span className="hover-card-lead">{lead}</span>}
      <span className="hover-card-blocker">
        <KindId id={b.id} kind={b.kind} />
        <span className="hover-card-blocker-title">{b.title}</span>
      </span>
    </li>
  );
}

/**
 * The slack against the release marker: the work up to the tightest
 * item's finish, its room hatched after it, and the release's finish as a
 * pole. Words carry the meaning; the bar only shows the proportion.
 */
function SlipBar({ slip }: { slip: CardSlip }) {
  const end = Math.max(slip.at, slip.latest, 1e-9);
  const pct = (v: number) => `${(Math.min(v, end) / end) * 100}%`;
  return (
    <span className="hover-slip" aria-hidden="true">
      <span className="hover-slip-done" style={{ width: pct(slip.finish) }} />
      {!slip.sets && (
        <span
          className="hover-slip-room"
          style={{
            left: pct(slip.finish),
            width: `calc(${pct(slip.latest)} - ${pct(slip.finish)})`,
          }}
        />
      )}
      <span className="hover-slip-pole" style={{ left: pct(slip.at) }} />
      <span
        className={`hover-slip-name${slip.at / end > 0.7 ? " end" : ""}`}
        style={{ left: pct(slip.at) }}
      >
        {shortVersion(slip.version)}
      </span>
    </span>
  );
}
