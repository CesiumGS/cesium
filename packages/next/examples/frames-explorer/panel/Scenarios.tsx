// The scenarios' tab (spec "How the page works"), the page's first view: the
// strip, the scenario's question, its frame tree (the panel's hero, with an
// "Expand" view over the globe), its answer, its knobs and its proof, top
// to bottom in one scroll. Selecting a frame or an edge in the tree opens its
// detail in place under the diagram (the walk, the edge's kind and accuracy),
// never in a sheet (the owner, 2026-11-06).
import { Button, Typography } from "@mui/material";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { svgWindowExpand } from "@stratakit/icons/window-expand";
import { Icon } from "@stratakit/mui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { Proof } from "./Proof.tsx";
import { ScenarioAnswer } from "./ScenarioAnswer.tsx";
import { ScenarioStrip } from "./ScenarioStrip.tsx";
import { type DiagramSelection, TreeDiagram } from "./TreeDiagram.tsx";

/** The frames the docked diagram draws: what the scenario added, its answer's path and the selection (with their ancestors, `focusTree`). */
function keepSet(
  tree: TreeNode,
  s: ScenarioPanelView,
  selected: string | undefined,
  extra: readonly string[],
): Set<string> {
  const keep = new Set<string>([...extra, ...s.focus]);
  const walk = (n: TreeNode) => {
    if (n.added) {
      keep.add(n.id);
    }
    n.children.forEach(walk);
  };
  walk(tree);
  if (s.path) {
    [...s.path.up, s.path.ancestor, ...s.path.down].forEach((id) =>
      keep.add(id),
    );
  }
  if (selected !== undefined) {
    keep.add(selected);
  }
  return keep;
}

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
        {node.added ? ", added by this scenario" : ", built in"}
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

/** The whole tree, uncollapsed, in a dialog over the globe (Escape or Close dismiss it). */
function ExpandedTree({
  hud,
  tree,
  scenario,
  selected,
  onSelect,
  onClose,
}: {
  hud: HTMLElement;
  tree: TreeNode;
  scenario: ScenarioPanelView;
  selected: DiagramSelection | undefined;
  onSelect: (s: DiagramSelection | undefined) => void;
  onClose: () => void;
}) {
  const id = useId();
  const close = useRef<HTMLButtonElement>(null);
  const latest = useRef(onClose);
  latest.current = onClose;
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        latest.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return createPortal(
    <div className="fx-tree-dialog-scrim" onClick={onClose}>
      <div
        className="fx-hud fx-tree-dialog"
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
            <p className="fx-hud-muted">
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
        />
      </div>
    </div>,
    hud,
  );
}

export function Scenarios({
  model,
  scenario,
  actions,
  selection,
  setSelection,
  reference,
  setReference,
  resultFrames,
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
  /** While a result is selected (from Verification): the frames it uses. */
  resultFrames: readonly string[];
  hud: HTMLElement;
  onOpenResult: (id: string) => void;
}) {
  const ids = {
    tree: useId(),
    answer: useId(),
    knobs: useId(),
    proof: useId(),
  };
  const tree = model.tree;
  const [expandedView, setExpandedView] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);
  const closeExpanded = () => {
    setExpandedView(false);
    // Focus back to what opened it (I18's rule for the HUD).
    requestAnimationFrame(() =>
      expandButton.current?.focus({ preventScroll: true }),
    );
  };
  const diagramSelection: DiagramSelection | undefined =
    selection.kind === "node" || selection.kind === "edge"
      ? selection
      : selection.kind === "frame"
        ? { kind: "node", id: selection.id }
        : undefined;
  const select = (s: DiagramSelection | undefined) =>
    setSelection(s ?? { kind: "none" });
  const keep = useMemo(
    () => tree && keepSet(tree, scenario, diagramSelection?.id, resultFrames),
    [tree, scenario, diagramSelection?.id, resultFrames],
  );
  const extras: Record<string, ResultExtras> = {
    ...model.extras,
    ...scenario.liveExtras,
  };
  return (
    <div className="fx-tab-body fx-scenarios">
      <ScenarioStrip scenario={scenario} onSelect={actions.selectScenario} />
      <header className="fx-scenario-head">
        <Typography
          variant="headline-sm"
          render={<h2 />}
          className="fx-scenario-question"
        >
          {scenario.question}
        </Typography>
      </header>

      <section
        className="fx-section fx-tree-section"
        aria-labelledby={ids.tree}
      >
        <SectionHead
          id={ids.tree}
          title="The frame tree it builds"
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
            built in
          </li>
          <li>
            <span className="fx-key-glyph fx-key-added" aria-hidden />
            added by this scenario
          </li>
          {scenario.path && (
            <li>
              <span className="fx-key-line" aria-hidden />
              the answer&rsquo;s path
            </li>
          )}
        </ul>
        {tree && keep ? (
          <TreeDiagram
            tree={tree}
            path={scenario.path}
            keep={keep}
            selected={diagramSelection}
            onSelect={select}
            label={`The frame tree of ${scenario.title}`}
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

      <section className="fx-section" aria-labelledby={ids.knobs}>
        <SectionHead id={ids.knobs} title="Knobs" />
        <Knobs
          scenario={scenario}
          onKnob={actions.setKnob}
          onBack={actions.backToChecked}
          onPlay={actions.setPlaying}
        />
      </section>

      <section className="fx-section" aria-labelledby={ids.proof}>
        <SectionHead id={ids.proof} title="Proof" />
        <Proof
          rows={scenario.proof}
          extras={extras}
          atChecked={scenario.atChecked}
          onOpenResult={onOpenResult}
          onBack={actions.backToChecked}
        />
      </section>

      {expandedView && tree && (
        <ExpandedTree
          hud={hud}
          tree={tree}
          scenario={scenario}
          selected={diagramSelection}
          onSelect={select}
          onClose={closeExpanded}
        />
      )}
    </div>
  );
}
