import { icon, type IconName } from "./icons.ts";
import {
  OPERATION_LABELS,
  PRIMITIVE_SPECS,
  describeDrop,
  dropRefusal,
  isStepLeaf,
  operandRole,
  pathTo,
  planDrop,
  type CsgTree,
  type DropPlan,
  type DropZone,
  type TreeNode,
} from "./tree.ts";
import { el } from "./ui.ts";

/**
 * The feature tree (plan §13.33): compact rows with a twisty, an icon for
 * the node's kind, the leaf's colour, its name (double-click to rename), a
 * badge for its role among a difference's operands (the first is the base,
 * the rest are cut from it) and an eye that leaves it out of the model
 * (suppresses it). Drag a row to reorder among its siblings or into another
 * operation: a line shows before or after a row, an outline shows "into" an
 * operation; a refused drop shows why, and a drop is one undoable edit.
 *
 * The drag is made of pointer events, not the browser's drag and drop, so it
 * has a label that says what the drop would mean and works the same with a
 * pen or a finger.
 */
export interface TreePanelHost {
  tree(): CsgTree;
  /** Selected ids; the last is the one the properties show. */
  selection(): readonly number[];
  select(id: number, mode: "replace" | "toggle" | "range"): void;
  /** How many faces the node made in the solid shown. */
  faces(node: TreeNode): number | undefined;
  swatch(leafId: number): string;
  setEnabled(node: TreeNode, enabled: boolean): void;
  rename(node: TreeNode, name: string): void;
  /** A drop, planned and described, as one edit. */
  drop(dragId: number, plan: DropPlan, label: string): void;
  /** Deletes a node (the Delete key on a row). */
  remove(id: number): void;
}

export interface TreePanel {
  element: HTMLElement;
  refresh(): void;
  /** Opens the node's name for editing. */
  rename(id: number): void;
  /** Opens the nodes above this one, so it can be seen. */
  reveal(id: number): void;
  dispose(): void;
}

const KIND_ICON: Record<string, IconName> = {
  box: "box",
  cylinder: "cylinder",
  sphere: "sphere",
  cone: "cone",
  torus: "torus",
  step: "step",
  union: "union",
  difference: "difference",
  intersection: "intersection",
};

export const nodeIcon = (node: TreeNode): IconName =>
  KIND_ICON[node.type === "leaf" ? node.kind : node.operation]!;

export function kindName(node: TreeNode): string {
  return node.type === "op"
    ? OPERATION_LABELS[node.operation]
    : isStepLeaf(node)
      ? "STEP part"
      : PRIMITIVE_SPECS[node.kind].label;
}

export function createTreePanel(host: TreePanelHost): TreePanel {
  const collapsed = new Set<number>();
  const list = el("div", {
    className: "csg-tree",
    role: "tree",
    ariaLabel: "Feature tree",
  });
  let renaming: number | undefined;
  let rangeAnchor: number | undefined;

  // ---- the drag
  interface Drag {
    id: number;
    startX: number;
    startY: number;
    live: boolean;
    row: HTMLElement;
    ghost?: HTMLElement;
    tip?: HTMLElement;
    target?: { id: number; zone: DropZone; plan: DropPlan };
  }
  let drag: Drag | undefined;
  let deferred = false;
  let suppressClick = false;
  const scroller = () => list.closest<HTMLElement>(".csg-panel-body");

  const clearIndicator = () => {
    for (const row of list.querySelectorAll("[data-drop]")) {
      row.removeAttribute("data-drop");
    }
  };
  const endDrag = () => {
    if (!drag) {
      return;
    }
    clearIndicator();
    drag.row.removeAttribute("data-dragging");
    drag.ghost?.remove();
    drag.tip?.remove();
    document.body.style.cursor = "";
    drag = undefined;
    if (deferred) {
      deferred = false;
      refresh();
    }
  };

  const zoneOf = (row: HTMLElement, node: TreeNode, y: number): DropZone => {
    const rect = row.getBoundingClientRect();
    const f = (y - rect.top) / rect.height;
    if (node.type === "op") {
      return f < 0.28 ? "before" : f > 0.72 ? "after" : "into";
    }
    return f < 0.5 ? "before" : "after";
  };

  const updateDrag = (event: PointerEvent) => {
    if (!drag) {
      return;
    }
    const tree = host.tree();
    const dragged = pathTo(tree, drag.id).at(-1)!;
    drag.ghost ??= document.body.appendChild(
      el("div", { className: "csg-ghost" }, dragged.name),
    );
    drag.ghost.style.left = `${event.clientX + 14}px`;
    drag.ghost.style.top = `${event.clientY + 10}px`;
    clearIndicator();
    drag.target = undefined;
    // Near the panel's edge the list scrolls under the pointer.
    const box = scroller();
    if (box) {
      const rect = box.getBoundingClientRect();
      if (event.clientY < rect.top + 24) {
        box.scrollTop -= 10;
      } else if (event.clientY > rect.bottom - 24) {
        box.scrollTop += 10;
      }
    }
    const row = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find(
        (e): e is HTMLElement =>
          e instanceof HTMLElement && e.classList.contains("csg-row"),
      );
    let text: string | undefined;
    let bad = false;
    if (row) {
      const id = Number(row.dataset.id);
      const node = pathTo(tree, id).at(-1);
      if (node) {
        const zone = zoneOf(row, node, event.clientY);
        const plan = planDrop(tree, drag.id, id, zone);
        if (plan) {
          row.dataset.drop = zone;
          drag.target = { id, zone, plan };
          text = describeDrop(tree, drag.id, plan);
        } else {
          text = dropRefusal(tree, drag.id, id, zone);
          bad = true;
        }
      }
    }
    document.body.style.cursor = drag.target ? "grabbing" : "not-allowed";
    if (text) {
      drag.tip ??= document.body.appendChild(
        el("div", { className: "csg-tip" }),
      );
      drag.tip.textContent = text;
      drag.tip.toggleAttribute("data-bad", bad);
      drag.tip.style.left = `${event.clientX + 14}px`;
      drag.tip.style.top = `${event.clientY + 34}px`;
    } else {
      drag.tip?.remove();
      drag.tip = undefined;
    }
  };

  const onMove = (event: PointerEvent) => {
    if (!drag) {
      return;
    }
    if (!drag.live) {
      if (
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5
      ) {
        return;
      }
      drag.live = true;
      drag.row.dataset.dragging = "";
    }
    updateDrag(event);
  };
  const onUp = (event: PointerEvent) => {
    const finished = drag;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey, true);
    if (finished?.live) {
      // The click that follows a drag's release is not a selection.
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
    }
    if (finished?.live && finished.target) {
      const label = `Move ${pathTo(host.tree(), finished.id).at(-1)!.name}`;
      const { id, target } = finished;
      endDrag();
      host.drop(id, target.plan, label);
    } else {
      endDrag();
    }
    event.stopPropagation();
  };
  const onCancel = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("keydown", onKey, true);
    endDrag();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
    }
  };

  // ---- the rows
  const visibleIds = (): number[] => {
    const ids: number[] = [];
    const visit = (node: TreeNode) => {
      ids.push(node.id);
      if (node.type === "op" && !collapsed.has(node.id)) {
        node.children.forEach(visit);
      }
    };
    visit(host.tree().root);
    return ids;
  };

  const startRename = (id: number) => {
    renaming = id;
    refresh();
    const input = list.querySelector<HTMLInputElement>(".csg-rename");
    input?.focus();
    input?.select();
  };

  function refresh() {
    if (drag?.live) {
      deferred = true;
      return;
    }
    const tree = host.tree();
    const selection = host.selection();
    const selected = new Set(selection);
    const primary = selection.at(-1);
    const above = new Set(
      primary === undefined
        ? []
        : pathTo(tree, primary)
            .slice(0, -1)
            .map((n) => n.id),
    );
    const rows: HTMLElement[] = [];
    const visit = (
      node: TreeNode,
      depth: number,
      parent?: TreeNode,
      index = 0,
    ) => {
      const faces = host.faces(node);
      const role =
        parent?.type === "op" ? operandRole(parent, index) : undefined;
      const open = node.type === "op" && !collapsed.has(node.id);
      const twisty = el(
        "button",
        {
          type: "button",
          className: "csg-twisty",
          tabIndex: -1,
          ariaLabel: open ? `Collapse ${node.name}` : `Expand ${node.name}`,
          onpointerdown: (e: Event) => e.stopPropagation(),
          onclick: (e: Event) => {
            e.stopPropagation();
            if (collapsed.has(node.id)) {
              collapsed.delete(node.id);
            } else {
              collapsed.add(node.id);
            }
            refresh();
          },
        },
        node.type === "op"
          ? icon(open ? "chevronDown" : "chevronRight", 12)
          : "",
      );
      if (node.type === "leaf") {
        twisty.dataset.leaf = "";
      }
      const eye = el(
        "button",
        {
          type: "button",
          className: "csg-mini csg-eye",
          tabIndex: -1,
          title: node.enabled
            ? "In the model. Click to suppress it (leave it out)"
            : "Suppressed: left out of the model. Click to put it back",
          ariaLabel: node.enabled
            ? `Suppress ${node.name}`
            : `Include ${node.name}`,
          onpointerdown: (e: Event) => e.stopPropagation(),
          onclick: (e: Event) => {
            e.stopPropagation();
            host.setEnabled(node, !node.enabled);
          },
        },
        icon(node.enabled ? "eye" : "eyeOff", 14),
      );
      const name =
        renaming === node.id
          ? el("input", {
              type: "text",
              className: "csg-rename",
              value: node.name,
              ariaLabel: "Name",
              onpointerdown: (e: Event) => e.stopPropagation(),
              onkeydown: (e: KeyboardEvent) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Escape") {
                  renaming = undefined;
                  refresh();
                }
              },
              onblur: (e: FocusEvent) => {
                if (renaming !== node.id) {
                  return;
                }
                renaming = undefined;
                const value = (e.target as HTMLInputElement).value.trim();
                if (value && value !== node.name) {
                  host.rename(node, value);
                } else {
                  refresh();
                }
              },
            })
          : el(
              "span",
              {
                className: "csg-name",
                title: `${node.name}: ${kindName(node)}`,
              },
              node.name,
            );
      const row = el(
        "div",
        {
          className: "csg-row",
          role: "treeitem",
          tabIndex:
            node.id === primary || (primary === undefined && depth === 0)
              ? 0
              : -1,
          ariaSelected: String(selected.has(node.id)),
          ariaLevel: String(depth + 1),
          ariaExpanded: node.type === "op" ? String(open) : undefined,
          ondblclick: (e: MouseEvent) => {
            e.preventDefault();
            startRename(node.id);
          },
        },
        twisty,
        el("span", { className: "csg-kind" }, icon(nodeIcon(node))),
        ...(node.type === "leaf"
          ? [
              el("span", {
                className: "csg-swatch",
                style: `background:${host.swatch(node.id)}`,
              }),
            ]
          : []),
        name,
        ...(role
          ? [
              el("span", {
                className: "csg-badge",
                textContent: role === "base" ? "base" : "cut",
                title:
                  role === "base"
                    ? "The base: everything after it is cut from this"
                    : "Cut from the base",
              }),
            ]
          : []),
        el(
          "span",
          { className: "csg-badge", title: "Faces it made in the solid" },
          faces === undefined ? "–" : String(faces),
        ),
        eye,
      );
      const roleBadge = role
        ? row.querySelector<HTMLElement>(".csg-badge")
        : null;
      if (roleBadge) {
        roleBadge.dataset.role = role!;
      }
      row.style.setProperty("--depth", String(depth));
      row.dataset.id = String(node.id);
      if (!node.enabled) {
        row.dataset.off = "";
      }
      if (above.has(node.id)) {
        row.dataset.under = "";
      }
      row.addEventListener("click", (e) => {
        if (renaming === node.id || suppressClick) {
          return;
        }
        const mode = e.shiftKey
          ? "range"
          : e.ctrlKey || e.metaKey
            ? "toggle"
            : "replace";
        if (mode === "range" && rangeAnchor !== undefined) {
          const ids = visibleIds();
          const a = ids.indexOf(rangeAnchor);
          const b = ids.indexOf(node.id);
          if (a >= 0 && b >= 0) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            host.select(ids[lo]!, "replace");
            for (const id of ids.slice(lo + 1, hi + 1)) {
              host.select(id, "toggle");
            }
            return;
          }
        }
        rangeAnchor = node.id;
        host.select(node.id, mode);
      });
      row.addEventListener("pointerdown", (e) => {
        if (
          e.button !== 0 ||
          renaming !== undefined ||
          node.id === tree.root.id
        ) {
          return;
        }
        drag = {
          id: node.id,
          startX: e.clientX,
          startY: e.clientY,
          live: false,
          row,
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onCancel);
        window.addEventListener("keydown", onKey, true);
      });
      row.addEventListener("keydown", (e) => {
        if (renaming !== undefined) {
          return;
        }
        const ids = visibleIds();
        const at = ids.indexOf(node.id);
        const go = (id: number | undefined) => {
          if (id !== undefined) {
            e.preventDefault();
            host.select(id, "replace");
            queueMicrotask(() =>
              list.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus(),
            );
          }
        };
        if (e.key === "ArrowDown") {
          go(ids[at + 1]);
        } else if (e.key === "ArrowUp") {
          go(ids[at - 1]);
        } else if (
          e.key === "ArrowLeft" &&
          node.type === "op" &&
          !collapsed.has(node.id)
        ) {
          e.preventDefault();
          collapsed.add(node.id);
          refresh();
        } else if (
          e.key === "ArrowRight" &&
          node.type === "op" &&
          collapsed.has(node.id)
        ) {
          e.preventDefault();
          collapsed.delete(node.id);
          refresh();
        } else if (e.key === "F2" || (e.key === "Enter" && e.shiftKey)) {
          e.preventDefault();
          startRename(node.id);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          host.select(node.id, e.ctrlKey ? "toggle" : "replace");
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          host.remove(node.id);
        }
      });
      rows.push(row);
      if (open && node.type === "op") {
        node.children.forEach((child, i) => visit(child, depth + 1, node, i));
      }
    };
    visit(tree.root, 0);
    const focused = list.contains(document.activeElement);
    list.replaceChildren(...rows);
    if (focused && renaming === undefined && primary !== undefined) {
      list
        .querySelector<HTMLElement>(`[data-id="${primary}"]`)
        ?.focus({ preventScroll: true });
    }
  }

  const element = el("div", { className: "csg-tree-wrap" }, list);
  return {
    element,
    refresh,
    rename: startRename,
    reveal: (id) => {
      let changed = false;
      for (const node of pathTo(host.tree(), id).slice(0, -1)) {
        changed = collapsed.delete(node.id) || changed;
      }
      if (changed) {
        refresh();
      }
      list
        .querySelector<HTMLElement>(`[data-id="${id}"]`)
        ?.scrollIntoView({ block: "nearest" });
    },
    dispose: () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      drag?.ghost?.remove();
      drag?.tip?.remove();
      document.body.style.cursor = "";
    },
  };
}
