// The frame tree (R14 structure; R8 accuracy in every row; R16 walk the tree).
import { Button, Typography } from "@mui/material";
import { svgFitToView } from "@stratakit/icons/fit-to-view";
import { Tree } from "@stratakit/structures";
import { useMemo, useState } from "react";
import type { EdgeAccuracy, TreeNode } from "../tree.ts";
import { EDGE_LABEL, FAMILY_INFO, type Family, familyOf } from "./families.ts";
import { length, radians } from "./format.ts";

interface Row {
  node: TreeNode;
  family: Family;
  level: number;
  posinset: number;
  setsize: number;
  hasChildren: boolean;
}

/**
 * An edge's own accuracy for its row (C3: the edge's figure; composed
 * figures are the walk's): a number, "exact by definition" for a
 * convention, or why there isn't one.
 */
export function edgeAccuracyText(
  kind: TreeNode["edge"]["kind"],
  a: EdgeAccuracy,
): { text: string; unknown: boolean } {
  if (kind === "root") {
    return { text: "defines the frame", unknown: false };
  }
  if (a.byDefinition) {
    return { text: "exact by definition", unknown: false };
  }
  const parts: string[] = [];
  if (a.meters !== undefined) {
    parts.push(`±${length(a.meters)}`);
  }
  if (a.radians !== undefined) {
    parts.push(`±${radians(a.radians)}`);
  }
  if (parts.length > 0) {
    return { text: parts.join(", "), unknown: false };
  }
  return {
    text: a.note.startsWith("ballpark") ? "ballpark" : "not stated",
    unknown: true,
  };
}

/** Nodes at this level and deeper start collapsed (I7). */
const COLLAPSED_FROM = 3;

/** Every node at `COLLAPSED_FROM` or deeper with children: the tree's first state. */
function deepParents(tree: TreeNode): Set<string> {
  const out = new Set<string>();
  const walk = (n: TreeNode, level: number) => {
    if (level >= COLLAPSED_FROM && n.children.length > 0) {
      out.add(n.id);
    }
    n.children.forEach((c) => walk(c, level + 1));
  };
  walk(tree, 1);
  return out;
}

/** The tree as Tree.Root wants it: a flat list, children after their parent. */
function flatten(root: TreeNode, collapsed: ReadonlySet<string>): Row[] {
  const rows: Row[] = [];
  const walk = (
    node: TreeNode,
    level: number,
    posinset: number,
    setsize: number,
    parent: Family | undefined,
    shown: boolean,
  ) => {
    const family = familyOf(node, parent);
    if (shown) {
      rows.push({
        node,
        family,
        level,
        posinset,
        setsize,
        hasChildren: node.children.length > 0,
      });
    }
    node.children.forEach((child, i) =>
      walk(
        child,
        level + 1,
        i + 1,
        node.children.length,
        family,
        shown && !collapsed.has(node.id),
      ),
    );
  };
  walk(root, 1, 1, 1, undefined, true);
  return rows;
}

export function FrameTree({
  tree,
  selected,
  onPath,
  onSelect,
  onShow,
}: {
  tree: TreeNode;
  /** The selected node's id. */
  selected: string | undefined;
  /**
   * The highlighted path, root first, each node with its place on it (for
   * the connector's stagger): the selected frame's, or a selected result's
   * frames' (R14).
   */
  onPath: ReadonlyMap<string, number>;
  onSelect: (id: string | undefined) => void;
  onShow: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() =>
    deepParents(tree),
  );
  // The path is always shown: its collapsed ancestors open (not stored, so
  // collapsing again works once the path moves).
  const shown = useMemo(() => {
    const next = new Set(collapsed);
    for (const id of onPath.keys()) {
      next.delete(id);
    }
    return next;
  }, [collapsed, onPath]);
  const rows = useMemo(() => flatten(tree, shown), [tree, shown]);
  const anyCollapsed = shown.size > 0;
  return (
    <>
      <div className="fx-tree-tools">
        <Typography variant="caption-lg" color="textSecondary" render={<p />}>
          Each row is a frame and its edge to the parent: the edge&rsquo;s kind
          and its own accuracy. Select one to walk it.
        </Typography>
        <Button
          size="small"
          variant="text"
          onClick={() =>
            setCollapsed(anyCollapsed ? new Set() : deepParents(tree))
          }
        >
          {anyCollapsed ? "Expand all" : "Collapse"}
        </Button>
      </div>
      <Tree.Root className="fx-tree" aria-label="Frame tree">
        {rows.map(({ node, family, level, posinset, setsize, hasChildren }) => {
          const acc = edgeAccuracyText(node.edge.kind, node.edge.accuracy);
          const step = onPath.get(node.id);
          return (
            <Tree.Item
              key={node.id}
              aria-level={level}
              aria-posinset={posinset}
              aria-setsize={setsize}
              className={`fx-tree-item fx-family-${family}${step !== undefined ? " fx-on-path" : ""}`}
              style={
                step !== undefined ? { ["--i" as string]: step } : undefined
              }
              selected={node.id === selected}
              onSelectedChange={(v) => onSelect(v ? node.id : undefined)}
              {...(hasChildren && {
                expanded: !shown.has(node.id),
                onExpandedChange: (open: boolean) =>
                  setCollapsed((was) => {
                    const next = new Set(was);
                    if (open) {
                      next.delete(node.id);
                    } else {
                      next.add(node.id);
                    }
                    return next;
                  }),
              })}
              unstable_decorations={
                <span
                  className="fx-swatch"
                  role="img"
                  aria-label={FAMILY_INFO[family].label}
                />
              }
              label={node.label}
              description={
                <span className="fx-edge">
                  <span className="fx-edge-kind">
                    {EDGE_LABEL[node.edge.kind]}
                  </span>
                  <span
                    className={`fx-num${acc.unknown ? " fx-unbounded" : ""}`}
                  >
                    {acc.text}
                  </span>
                </span>
              }
              inlineActions={[
                <Tree.ItemAction
                  key="show"
                  label={`Show ${node.label} on the globe`}
                  icon={svgFitToView}
                  onClick={() => onShow(node.id)}
                />,
              ]}
            />
          );
        })}
      </Tree.Root>
    </>
  );
}

/** The tree's families, for the legend: each family's label and swatch. */
export function FamilyKey() {
  return (
    <ul className="fx-family-key" aria-label="Frame families">
      {(Object.keys(FAMILY_INFO) as Family[]).map((f) => (
        <li key={f}>
          <span className={`fx-swatch fx-family-${f}`} aria-hidden />
          <Typography variant="caption-lg" render={<span />}>
            {FAMILY_INFO[f].label}
          </Typography>
        </li>
      ))}
    </ul>
  );
}
