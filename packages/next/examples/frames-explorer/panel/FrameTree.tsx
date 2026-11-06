// The frame tree (R14 structure; R8 accuracy in every row; R16 walk the tree).
import { Typography } from "@mui/material";
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

/** An edge's accuracy for its row: a number, or why there isn't one. */
export function edgeAccuracyText(
  kind: TreeNode["edge"]["kind"],
  a: EdgeAccuracy,
): { text: string; unknown: boolean } {
  if (kind === "root") {
    return { text: "defines the frame", unknown: false };
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

/** The tree as Tree.Root wants it: a flat list, children after their parent. */
function flatten(
  root: TreeNode,
  collapsed: ReadonlySet<string>,
): { rows: Row[]; families: Map<string, Family> } {
  const rows: Row[] = [];
  const families = new Map<string, Family>();
  const walk = (
    node: TreeNode,
    level: number,
    posinset: number,
    setsize: number,
    parent: Family | undefined,
    shown: boolean,
  ) => {
    const family = familyOf(node, parent);
    families.set(node.id, family);
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
  return { rows, families };
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
  /** Every node on the selected node's path to the root. */
  onPath: ReadonlySet<string>;
  onSelect: (id: string | undefined) => void;
  onShow: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const { rows } = useMemo(() => flatten(tree, collapsed), [tree, collapsed]);
  return (
    <Tree.Root className="fx-tree" aria-label="Frame tree">
      {rows.map(({ node, family, level, posinset, setsize, hasChildren }) => {
        const acc = edgeAccuracyText(node.edge.kind, node.edge.accuracy);
        const isSelected = node.id === selected;
        const path = !isSelected && onPath.has(node.id);
        return (
          <Tree.Item
            key={node.id}
            aria-level={level}
            aria-posinset={posinset}
            aria-setsize={setsize}
            className={`fx-tree-item${path ? " fx-on-path" : ""}`}
            selected={isSelected}
            onSelectedChange={(v) => onSelect(v ? node.id : undefined)}
            {...(hasChildren && {
              expanded: !collapsed.has(node.id),
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
                className={`fx-swatch fx-family-${family}`}
                role="img"
                aria-label={FAMILY_INFO[family].label}
              />
            }
            label={node.label}
            description={
              <span className="fx-edge">
                <span className="fx-chip">{EDGE_LABEL[node.edge.kind]}</span>
                <span className={`fx-num${acc.unknown ? " fx-unbounded" : ""}`}>
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
