// The scenarios' tab (spec "How the page works"), the page's first view, top
// to bottom in one scroll, in Task 6c's order: the picker, the scenario's
// question, its knobs (under the question, owner: "the knobs are hard to
// find"), its frame tree (the panel's hero, with an "Expand" view over the
// globe), its answer, the route's steps and its checks. Selecting a frame or an edge in the tree opens its
// detail in place under the diagram (the walk, the edge's kind and accuracy),
// never in a sheet (the owner, 2026-11-06).
import { Button, Typography } from "@mui/material";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgWindowExpand } from "@stratakit/icons/window-expand";
import { Icon } from "@stratakit/mui";
import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TreeNode } from "../tree.ts";
import { ReferenceSelect, Walk, pathFromRoot } from "./Explore.tsx";
import { EDGE_LABEL, FAMILY_INFO, familyMap } from "./families.ts";
import { edgeAccuracyText } from "./FrameTree.tsx";
import { Knobs } from "./Knobs.tsx";
import type {
  PanelActions,
  PanelModel,
  Reference,
  ResultExtras,
  ScenarioPanelView,
  Selection,
} from "./model.ts";
import { designRoot } from "./designRoot.ts";
import { keepSet } from "./diagramFocus.ts";
import { equalOn, sameSet, useStable, useStableCallback } from "./memo.ts";
import { RouteSteps } from "./RouteSteps.tsx";
import { Checks } from "./Checks.tsx";
import { ScenarioAnswer } from "./ScenarioAnswer.tsx";
import { ScenarioStrip } from "./ScenarioStrip.tsx";
import {
  type DiagramSelection,
  type DiagramTargets,
  TreeDiagram,
} from "./TreeDiagram.tsx";

function SectionHead({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="fx-section-head">
      <Typography variant="subtitle-md" render={<h2 id={id} />}>
        {title}
      </Typography>
      {aside}
    </div>
  );
}

/** The selected frame's or edge's detail, in place under the diagram. */
function Detail({
  model,
  tree,
  selection,
  reference,
  setReference,
  actions,
  onSelect,
}: {
  model: PanelModel;
  tree: TreeNode;
  selection: DiagramSelection;
  reference: Reference;
  setReference: (r: Reference) => void;
  actions: PanelActions;
  onSelect: (s: DiagramSelection | undefined) => void;
}) {
  const path = pathFromRoot(tree, selection.id);
  const node = path.at(-1);
  const parent = path.at(-2);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [selection.id, selection.kind]);
  if (!node) {
    return null;
  }
  const families = familyMap(tree);
  const family = families.get(node.id) ?? "earth";
  const acc = edgeAccuracyText(node.edge.kind, node.edge.accuracy);
  const edge = parent && (
    <div className="fx-detail-edge">
      <p>
        <span className="fx-strong">
          {parent.label} → {node.label}
        </span>{" "}
        <span className="fx-edge-kind">{EDGE_LABEL[node.edge.kind]}</span>{" "}
        <span className={`fx-num${acc.unknown ? " fx-unbounded" : ""}`}>
          {acc.text}
        </span>
      </p>
      <Typography variant="body-sm" color="textSecondary" render={<p />}>
        {node.edge.detail}
      </Typography>
      <Typography variant="caption-lg" color="textSecondary" render={<p />}>
        {node.edge.accuracy.note}
      </Typography>
    </div>
  );
  return (
    <section
      className="fx-detail"
      aria-label={
        selection.kind === "edge"
          ? `The edge to ${node.label}`
          : `The frame ${node.label}`
      }
    >
      <div className="fx-detail-head">
        <h3 ref={title} tabIndex={-1} className="fx-detail-title">
          <span className={`fx-swatch fx-family-${family}`} aria-hidden />
          {selection.kind === "edge"
            ? `Edge ${parent?.label ?? ""} → ${node.label}`
            : node.label}
        </h3>
        <Button size="small" variant="text" onClick={() => onSelect(undefined)}>
          Close
        </Button>
      </div>
      <Typography variant="caption-lg" color="textSecondary" render={<p />}>
        {FAMILY_INFO[family].label}
        {node.app
          ? ", defined by your app (the public Frame API)"
          : node.added
            ? ", added by this scenario"
            : ", built in"}
        {node.edge.kind === "root" ? "; the tree's root" : ""}
      </Typography>
      {edge}
      {selection.kind === "edge" ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onSelect({ kind: "node", id: node.id })}
        >
          Show how {node.label}&rsquo;s accuracy composes
        </Button>
      ) : (
        <>
          <div className="fx-detail-tools">
            <ReferenceSelect
              reference={reference}
              setReference={setReference}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<Icon href={svgFitToView} />}
              onClick={() => actions.showOnGlobe({ frame: node.id })}
            >
              Show on globe
            </Button>
          </div>
          <Walk
            model={model}
            tree={tree}
            target={node.id}
            reference={reference}
            setReference={setReference}
            actions={actions}
          />
        </>
      )}
    </section>
  );
}

/** The whole tree, uncollapsed, in a dialog over the page (Escape or Close dismiss it). */
function ExpandedTree({
  hud,
  tree,
  scenario,
  selected,
  onSelect,
  onClose,
  targets,
}: {
  hud: HTMLElement;
  tree: TreeNode;
  scenario: ScenarioPanelView;
  targets: DiagramTargets | undefined;
  selected: DiagramSelection | undefined;
  onSelect: (s: DiagramSelection | undefined) => void;
  onClose: () => void;
}) {
  const id = useId();
  const close = useRef<HTMLButtonElement>(null);
  const latest = useRef(onClose);
  latest.current = onClose;
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        latest.current();
        return;
      }
      // Focus stays in the dialog (it is modal): Tab wraps at its ends.
      const el = dialog.current;
      if (e.key !== "Tab" || !el) {
        return;
      }
      const stops = [
        ...el.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const first = stops[0];
      const last = stops.at(-1);
      if (!el.contains(document.activeElement)) {
        e.preventDefault();
        first?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return createPortal(
    <div className="fx-tree-dialog-scrim" onClick={onClose}>
      <div
        ref={dialog}
        className="fx-tree-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fx-tree-dialog-head">
          <div>
            <h2 id={id} className="fx-tree-dialog-title">
              The whole frame tree
            </h2>
            <p className="fx-muted">
              {scenario.title}: every frame, built in and added
            </p>
          </div>
          <Button ref={close} variant="outlined" size="small" onClick={onClose}>
            Close
          </Button>
        </div>
        <TreeDiagram
          tree={tree}
          path={scenario.path}
          selected={selected}
          onSelect={onSelect}
          label={`The whole frame tree of ${scenario.title}`}
          targets={targets}
          data={scenario.data}
          fullLabels
        />
      </div>
    </div>,
    // At page level, as wide as the window allows (fix 2): inside the
    // design system's root, so its tokens and scheme apply.
    designRoot(hud, document.body),
  );
}

/**
 * "Checks ↓" (Task 6c; "Knobs and proof ↓" before the knobs moved up): shows
 * while the Checks section's head is below the tab's scroller, at the end of
 * a tall tab (owner, fix 1).
 */
function useChecksBelow(
  anchor: React.RefObject<HTMLElement | null>,
  checks: React.RefObject<HTMLElement | null>,
): boolean {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const el =
      anchor.current?.closest<HTMLElement>(".fx-scenarios-scroll") ?? null;
    if (!el) {
      return;
    }
    const measure = () => {
      const c = checks.current;
      setBelow(
        c !== null &&
          c.getBoundingClientRect().top >
            el.getBoundingClientRect().bottom - 40,
      );
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) {
      observer.observe(el.firstElementChild);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [anchor, checks]);
  return below;
}

/**
 * The tab, memoized (Task 4d): it reads the model's tree, its note, the
 * results' extras and the composed accuracy, and renders again only when
 * one of those, or the scenario, changed.
 */
/** The model fields the tab reads, with Detail and Walk (Task 4d). */
export const SCENARIOS_READS = [
  "tree",
  "treeNote",
  "extras",
  "composed",
] as const;

export const Scenarios = memo(ScenariosView, equalOn("model", SCENARIOS_READS));

function ScenariosView({
  model,
  scenario,
  actions,
  selection,
  setSelection,
  reference,
  setReference,
  hud,
  onOpenResult,
}: {
  model: PanelModel;
  scenario: ScenarioPanelView;
  actions: PanelActions;
  selection: Selection;
  setSelection: (s: Selection) => void;
  reference: Reference;
  setReference: (r: Reference) => void;
  hud: HTMLElement;
  onOpenResult: (id: string) => void;
}) {
  const ids = {
    tree: useId(),
    answer: useId(),
    knobs: useId(),
    route: useId(),
    checks: useId(),
  };
  const tree = model.tree;
  // Frames the app defines itself (the robot arm's joints, Task 7b) take
  // their own key row; "added by this scenario" stays for the others.
  const addedKinds = useMemo(() => {
    let app = false;
    let plain = false;
    const walk = (n: TreeNode) => {
      app ||= n.app === true;
      plain ||= n.added === true && n.app !== true;
      n.children.forEach(walk);
    };
    if (tree) {
      walk(tree);
    }
    return { app, plain };
  }, [tree]);
  const hasApp = addedKinds.app;
  const hasPlainAdded = addedKinds.plain;
  const [expandedView, setExpandedView] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const checksSection = useRef<HTMLElement>(null);
  const checksBelow = useChecksBelow(top, checksSection);
  const closeExpanded = () => {
    setExpandedView(false);
    // Focus back to what opened it (I18's rule for the HUD).
    requestAnimationFrame(() =>
      expandButton.current?.focus({ preventScroll: true }),
    );
  };
  const diagramSelection: DiagramSelection | undefined = useMemo(
    () =>
      selection.kind === "node" || selection.kind === "edge"
        ? selection
        : selection.kind === "frame"
          ? { kind: "node", id: selection.id }
          : undefined,
    [selection],
  );
  const select = useStableCallback((s: DiagramSelection | undefined) =>
    setSelection(s ?? { kind: "none" }),
  );
  const selectedId = diagramSelection?.id;
  // The frames the docked diagram draws: the same set while they're the
  // same, so its layout (and the route's dot) holds as values update.
  const keep = useStable(
    useMemo(
      () =>
        tree &&
        keepSet(
          tree,
          scenario,
          selectedId === undefined
            ? undefined
            : { kind: "node", id: selectedId },
        ),
      [tree, scenario, selectedId],
    ),
    sameSet,
  );
  const control = scenario.treeControl;
  const current = control ? String(scenario.values[control.knob]) : undefined;
  const drawIn = scenario.drawIn;
  const targets: DiagramTargets | undefined = useMemo(
    () =>
      control && current !== undefined
        ? {
            ids: new Set(control.options.map((o) => o.value)),
            current,
            label: (id: string) => `${control.verb} ${id}`,
            onPick: (id: string) => actions.setKnob(control.knob, id),
          }
        : drawIn !== undefined
          ? // A fixed frame to draw in (Task 6a fix 1): tagged, not a choice.
            {
              ids: new Set<string>(),
              current: drawIn,
              label: () => "",
              onPick: () => {},
            }
          : undefined,
    [control, current, drawIn, actions],
  );
  const extras: Record<string, ResultExtras> = useMemo(
    () => ({ ...model.extras, ...scenario.liveExtras }),
    [model.extras, scenario.liveExtras],
  );
  const pub = scenario.answer?.published;
  const published = useMemo(
    () =>
      pub && {
        checkId: pub.checkId,
        printed: pub.printed,
        unit: pub.unit,
      },
    [pub],
  );
  const toChecks = () =>
    checksSection.current?.scrollIntoView({
      block: "start",
      behavior:
        typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
  return (
    <div className="fx-scenarios-frame">
      <div className="fx-scenarios-scroll">
        <div className="fx-tab-body fx-scenarios">
          {/* The strip and the question stay in view as the tab scrolls. */}
          <div className="fx-scenario-top" ref={top}>
            <ScenarioStrip
              scenario={scenario}
              onSelect={actions.selectScenario}
            />
            <div className="fx-scenario-lead">
              <Typography
                variant="body-md"
                render={<h2 />}
                className="fx-scenario-question"
              >
                {scenario.question}
              </Typography>
            </div>
          </div>

          <div className="fx-scenario-body">
            <section className="fx-section" aria-labelledby={ids.knobs}>
              <Knobs
                scenario={scenario}
                headingId={ids.knobs}
                onKnob={actions.setKnob}
                onBack={actions.backToChecked}
                onMoment={actions.goToMoment}
              />
            </section>

            <section
              className="fx-section fx-tree-section"
              aria-labelledby={ids.tree}
            >
              <SectionHead
                id={ids.tree}
                title="The frame tree"
                aside={
                  tree && (
                    <Button
                      ref={expandButton}
                      size="small"
                      variant="outlined"
                      startIcon={<Icon href={svgWindowExpand} />}
                      onClick={() => setExpandedView(true)}
                    >
                      Expand
                    </Button>
                  )
                }
              />
              <ul className="fx-diagram-key" aria-label="Key">
                <li>
                  <span className="fx-key-glyph fx-key-built" aria-hidden />
                  frame (no data in it)
                </li>
                {(!hasApp || hasPlainAdded) && (
                  <li>
                    <span className="fx-key-glyph fx-key-added" aria-hidden />
                    added by this scenario
                  </li>
                )}
                {hasApp && (
                  <li>
                    <span className="fx-key-glyph fx-key-app" aria-hidden />
                    defined by your app
                  </li>
                )}
                {scenario.data && (
                  <li>
                    <span className="fx-key-card" aria-hidden />
                    data, pinned to its frame
                  </li>
                )}
                {control && (
                  <li>
                    <span className="fx-key-drawing" aria-hidden />
                    the frame you draw in (click a dashed one)
                  </li>
                )}
                {scenario.path && (
                  <li>
                    <span className="fx-key-line" aria-hidden />
                    {scenario.data ? "the data's route" : "the answer's route"}
                  </li>
                )}
              </ul>
              {scenario.diagramNote && (
                <Typography
                  variant="caption-lg"
                  color="textSecondary"
                  render={<p />}
                >
                  {scenario.diagramNote}
                </Typography>
              )}
              {tree && keep ? (
                <TreeDiagram
                  tree={tree}
                  path={scenario.path}
                  keep={keep}
                  selected={diagramSelection}
                  onSelect={select}
                  label={`The frame tree of ${scenario.title}`}
                  resetKey={scenario.id}
                  targets={targets}
                  data={scenario.data}
                />
              ) : (
                <Typography
                  variant="body-sm"
                  color="textSecondary"
                  render={<p />}
                  role="status"
                >
                  {model.treeNote}
                </Typography>
              )}
              {tree && diagramSelection && (
                <Detail
                  model={model}
                  tree={tree}
                  selection={diagramSelection}
                  reference={reference}
                  setReference={setReference}
                  actions={actions}
                  onSelect={select}
                />
              )}
            </section>

            <section className="fx-section" aria-labelledby={ids.answer}>
              <SectionHead id={ids.answer} title="The answer" />
              <ScenarioAnswer scenario={scenario} />
            </section>

            {scenario.route && (
              <section className="fx-section" aria-labelledby={ids.route}>
                <SectionHead id={ids.route} title="Route steps" />
                <RouteSteps steps={scenario.route} legs={scenario.routeLegs} />
              </section>
            )}

            <section
              className="fx-section"
              aria-labelledby={ids.checks}
              ref={checksSection}
            >
              <SectionHead id={ids.checks} title="Checks" />
              <Checks
                rows={scenario.checks}
                extras={extras}
                atChecked={scenario.atChecked}
                freshness={scenario.freshness}
                published={published}
                onOpenResult={onOpenResult}
                onBack={actions.backToChecked}
              />
            </section>
          </div>
        </div>
      </div>
      {/* Its own strip under the scroller, never over the content (fix 2). */}
      {checksBelow && (
        <div className="fx-more-below">
          <Button
            size="small"
            variant="outlined"
            className="fx-more-button"
            onClick={toChecks}
          >
            Checks ↓
          </Button>
        </div>
      )}

      {expandedView && tree && (
        <ExpandedTree
          hud={hud}
          tree={tree}
          scenario={scenario}
          targets={targets}
          selected={diagramSelection}
          onSelect={select}
          onClose={closeExpanded}
        />
      )}
    </div>
  );
}
