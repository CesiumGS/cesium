import { icon } from "./icons.ts";
import { kindName, nodeIcon } from "./treePanel.ts";
import {
  OPERATIONS,
  OPERATION_LABELS,
  PRIMITIVE_SPECS,
  findNode,
  isStepLeaf,
  operandRole,
  type CsgTree,
  type LeafNode,
  type OpNode,
  type TreeNode,
} from "./tree.ts";
import { el, scrub, segmented, type Phase, type Scrub } from "./ui.ts";

/**
 * The properties panel (plan §13.33): only the selected node's own
 * parameters, as compact numeric fields whose labels scrub the value, with
 * units. A leaf has its parameters, its position and its rotation; an
 * operation has its kind and its operands in order (a difference's first is
 * the base); several selected nodes have a hint for the booleans in the
 * toolbar; nothing selected has the shortcuts.
 */
export interface FaceSection {
  /** "Face 9: plane, made by Upright". */
  text: string;
  /** The nodes from the one that made it up to the root, to select. */
  crumbs: TreeNode[];
  /** What push-pull would change, or why nothing. */
  pushPull: string;
}

export interface PropertiesHost {
  tree(): CsgTree;
  selection(): readonly number[];
  select(id: number, mode: "replace" | "toggle" | "range"): void;
  /** A leaf's parameters or placement changed. */
  edited(leaf: LeafNode, phase: Phase, label: string): void;
  rename(node: TreeNode, name: string): void;
  setOperation(node: OpNode, operation: OpNode["operation"]): void;
  face(): FaceSection | undefined;
  /** Whether the kernel in use can build this part. */
  note(node: TreeNode): string | undefined;
}

export interface Properties {
  element: HTMLElement;
  refresh(): void;
  /** Shows values changed by a drag in the view. */
  sync(): void;
}

const SHORTCUTS: ReadonlyArray<[readonly string[], string]> = [
  [["1", "…", "5"], "Add a box, cylinder, sphere, cone or torus"],
  [["U", "D", "I"], "Union, subtract (difference) or intersect the selection"],
  [["V", "P"], "Move and rotate gizmo, or push-pull a face"],
  [["G", "E", "W"], "Snap to grid, show edges, wireframe"],
  [["F", "⇧F", "⇧T", "⇧R", "⇧I"], "Fit, front, top, right, isometric"],
  [["Ctrl Z", "Ctrl Y"], "Undo, redo"],
  [["Del", "Ctrl D", "F2"], "Delete, duplicate, rename"],
  [["Alt"], "Held while dragging: free of the grid and snaps"],
];

function roleBadge(role: "base" | "cutter"): HTMLElement {
  const badge = el("span", {
    className: "csg-badge",
    textContent: role === "base" ? "base" : "cut",
  });
  badge.dataset.role = role;
  return badge;
}

export function createProperties(host: PropertiesHost): Properties {
  const element = el("div", { className: "csg-props-body" });
  let syncers: Array<() => void> = [];

  const refresh = () => {
    syncers = [];
    const tree = host.tree();
    const selection = host.selection();
    const nodes = selection
      .map((id) => findNode(tree, id))
      .filter((n): n is TreeNode => !!n);
    const parts: HTMLElement[] = [];
    if (nodes.length === 0) {
      parts.push(
        el(
          "p",
          { className: "csg-hint" },
          "Nothing selected. Click a node in the feature tree or a face of the solid. Select two or more nodes and a boolean in the toolbar combines them, the first selected being the base.",
        ),
        el("h4", {}, "Shortcuts"),
        el(
          "dl",
          { className: "csg-keys" },
          ...SHORTCUTS.flatMap(([keys, what]) => [
            el(
              "dt",
              {},
              ...keys.flatMap((k, i) => [
                ...(i ? [" "] : []),
                el("kbd", {}, k),
              ]),
            ),
            el("dd", {}, what),
          ]),
        ),
      );
    } else if (nodes.length > 1) {
      parts.push(
        el(
          "div",
          { className: "csg-title" },
          el("b", {}, `${nodes.length} nodes selected`),
        ),
        el(
          "ul",
          { className: "csg-operands" },
          ...nodes.map((node, i) =>
            el(
              "li",
              {
                onclick: () => host.select(node.id, "replace"),
                title:
                  i === 0
                    ? "Chosen first: the base of a subtraction"
                    : "Click to select only this",
              },
              el("span", { className: "csg-kind" }, icon(nodeIcon(node))),
              `${i + 1}. ${node.name}`,
            ),
          ),
        ),
        el(
          "p",
          { className: "csg-hint" },
          "Union, Subtract and Intersect in the toolbar group these nodes under a new operation, in this order: the first becomes the base that the others are cut from.",
        ),
      );
    } else {
      const node = nodes[0]!;
      const name = el("input", {
        type: "text",
        value: node.name,
        ariaLabel: "Name",
        title: "Rename",
        onchange: () => {
          const value = name.value.trim();
          if (value && value !== node.name) {
            host.rename(node, value);
          } else {
            name.value = node.name;
          }
        },
        onkeydown: (e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            name.blur();
          }
        },
      });
      parts.push(
        el(
          "div",
          { className: "csg-title" },
          el("span", { className: "csg-kind" }, icon(nodeIcon(node), 18)),
          name,
        ),
        el("p", { className: "csg-note" }, kindName(node)),
      );
      const note = host.note(node);
      if (note) {
        parts.push(el("p", { className: "csg-note csg-bad" }, note));
      }
      if (node.type === "op") {
        const operation = segmented(
          "Operation",
          OPERATIONS.map((op) => ({ value: op, label: OPERATION_LABELS[op] })),
          () => node.operation,
          (op) => host.setOperation(node, op),
        );
        parts.push(
          el(
            "div",
            { className: "csg-section" },
            el("h4", {}, "Operation"),
            operation.element,
          ),
          el(
            "p",
            { className: "csg-note" },
            node.operation === "difference"
              ? "The base minus everything after it. Drag operands in the tree to reorder them."
              : `The ${node.operation} of all its operands.`,
          ),
          el("h4", {}, "Operands"),
          node.children.length === 0
            ? el(
                "p",
                { className: "csg-hint" },
                "Empty. Drag nodes into it, or select it and add primitives.",
              )
            : el(
                "ul",
                { className: "csg-operands" },
                ...node.children.map((child, i) => {
                  const role = operandRole(node, i);
                  return el(
                    "li",
                    { onclick: () => host.select(child.id, "replace") },
                    el(
                      "span",
                      { className: "csg-kind" },
                      icon(nodeIcon(child)),
                    ),
                    el("span", { className: "csg-name" }, child.name),
                    ...(role ? [roleBadge(role)] : []),
                  );
                }),
              ),
        );
      } else {
        parts.push(...leafSections(node));
      }
    }
    const face = host.face();
    if (face) {
      parts.push(
        el("h4", {}, "Picked face"),
        el(
          "div",
          { className: "csg-face" },
          el("span", {}, face.text),
          el(
            "div",
            { className: "csg-crumbs", ariaLabel: "Path to the root" },
            ...face.crumbs.flatMap((node, i) => [
              ...(i > 0 ? ["‹"] : []),
              el(
                "button",
                {
                  type: "button",
                  title: `Select ${node.name}: its faces light up`,
                  onclick: () => host.select(node.id, "replace"),
                },
                node.name,
              ),
            ]),
          ),
          el("span", { className: "csg-note" }, face.pushPull),
        ),
      );
    }
    element.replaceChildren(...parts);
  };

  function leafSections(leaf: LeafNode): HTMLElement[] {
    const track = (s: Scrub, read: () => number) => {
      syncers.push(() => s.set(read()));
      return s.element;
    };
    const edit = (phase: Phase, label: string) =>
      host.edited(leaf, phase, label);
    const sections: HTMLElement[] = [];
    if (isStepLeaf(leaf)) {
      sections.push(
        el(
          "div",
          { className: "csg-section" },
          el("h4", {}, "STEP part"),
          el(
            "p",
            { className: "csg-note" },
            `${leaf.step.file}: ${leaf.step.size.map((v) => v.toFixed(3)).join(" × ")} m, centred on its bounds. Open CASCADE only.`,
          ),
        ),
      );
    } else {
      sections.push(
        el(
          "div",
          { className: "csg-section" },
          el("h4", {}, "Parameters"),
          el(
            "div",
            { className: "csg-props" },
            ...PRIMITIVE_SPECS[leaf.kind].params.map((spec) =>
              track(
                scrub({
                  label: spec.label,
                  value: leaf.params[spec.key]!,
                  step: spec.step,
                  min: spec.min,
                  unit: "m",
                  onChange: (value, phase) => {
                    leaf.params[spec.key] = value;
                    edit(
                      phase,
                      `Edit ${spec.label.toLowerCase()} of ${leaf.name}`,
                    );
                  },
                }),
                () => leaf.params[spec.key]!,
              ),
            ),
          ),
        ),
      );
    }
    const triple = (
      title: string,
      key: "translate" | "rotate",
      step: number,
      unit: string,
      verb: string,
    ) =>
      el(
        "div",
        { className: "csg-section" },
        el("h4", {}, title),
        el(
          "div",
          { className: "csg-triple" },
          ...(["x", "y", "z"] as const).map((axis, i) =>
            track(
              scrub({
                label: axis,
                value: leaf[key][i]!,
                step,
                unit,
                onChange: (value, phase) => {
                  leaf[key][i] = value;
                  edit(phase, `${verb} ${leaf.name}`);
                },
              }),
              () => leaf[key][i]!,
            ),
          ),
        ),
      );
    sections.push(
      triple("Position (m)", "translate", 0.01, "m", "Move"),
      triple("Rotation (°)", "rotate", 1, "°", "Rotate"),
    );
    return sections;
  }

  return {
    element,
    refresh,
    sync: () => syncers.forEach((sync) => sync()),
  };
}
