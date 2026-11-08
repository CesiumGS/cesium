// @ts-check

import { Check, EventHelper, defined } from "@cesium/core";
import { createCommand, knockout } from "@cesium/widgets";
import Mesh from "../../Editor/Mesh.js";

/** @import { Command } from "@cesium/widgets"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshEditorGroup from "../../Editor/MeshEditorGroup.js"; */

/**
 * A visible row of an {@link EditorOutliner}. A row is reused for as long as
 * its item stays in the tree. Its properties other than <code>item</code> are
 * observable, and are updated when the tree changes.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorOutlinerRow
 * @property {Mesh|MeshEditorGroup} item The mesh or group the row shows.
 * @property {string} label The item's name, or "Mesh" or "Group" and a number if it doesn't have one.
 * @property {number} depth The item's depth in the tree. Items in the editor's root group are at depth 0.
 * @property {boolean} expandable Whether the item has children.
 * @property {boolean} expanded Whether the item's children are shown, if it has any.
 * @property {Mesh|undefined} mesh The row's mesh, if its item is a mesh.
 * @property {boolean} selectable Whether the row can be selected, which it can if it has a mesh.
 * @property {boolean} active Whether the row's mesh is active.
 */

/**
 * How {@link EditorOutlinerViewModel#select} changes the active meshes.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorOutlinerSelectOptions
 * @property {boolean} [toggle=false] Whether to keep the other active meshes, like Ctrl- or Cmd-clicking. Without <code>range</code>, toggles the row's mesh.
 * @property {boolean} [range=false] Whether to activate the meshes of the rows from the last row selected without <code>range</code> to this one, like Shift-clicking.
 */

/**
 * An item the view model has read from the editor.
 *
 * @typedef {object} TreeNode
 * @property {EditorOutlinerRow} row The item's row.
 * @property {ReadonlyArray<Mesh|MeshEditorGroup>} children The item's children when last read.
 * @ignore
 */

/**
 * The rows displayed by an {@link EditorOutliner}: the meshes and groups in a
 * {@link MeshEditor}'s hierarchy, starting with those in its
 * {@link MeshEditor#root} group, flattened in tree order, with the children
 * of collapsed groups left out. Groups in the root group start expanded, and
 * other groups start collapsed. Groups keep whether they're expanded when the
 * hierarchy changes, as long as they stay in it.
 * <p>
 * Selecting a mesh's row makes the mesh active in the editor. A row shows
 * whether its mesh is active, however that changed.
 * </p>
 *
 * @alias EditorOutlinerViewModel
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor The editor whose meshes are listed.
 */
class EditorOutlinerViewModel {
  /** @type {MeshEditor} */
  #editor;

  #eventHelper = new EventHelper();

  /**
   * The items in the editor's root group when last read.
   *
   * @type {ReadonlyArray<Mesh|MeshEditorGroup>}
   */
  #roots = [];

  /**
   * Every item read from the editor that's still in the tree, including the
   * children of collapsed groups, so they keep whether they're expanded.
   *
   * @type {Map<Mesh|MeshEditorGroup, TreeNode>}
   */
  #nodes = new Map();

  /**
   * The numbers in the labels of items without names, in the order the view
   * model first reads them. They don't change when other items are removed.
   *
   * @type {WeakMap<Mesh|MeshEditorGroup, number>}
   */
  #numbers = new WeakMap();

  #nextMeshNumber = 1;

  #nextGroupNumber = 1;

  /**
   * Whether each mesh shown in a row is active. Rows read these, so every row
   * showing a mesh updates when it changes.
   *
   * @type {WeakMap<Mesh, *>}
   */
  #meshActiveStates = new WeakMap();

  /**
   * The last row selected without <code>range</code>, where ranges start.
   *
   * @type {EditorOutlinerRow|undefined}
   */
  #anchor;

  /** @type {Command} */
  #toggleExpanded;

  /** @type {Command} */
  #select;

  /**
   * @param {MeshEditor} editor The editor whose meshes are listed.
   */
  constructor(editor) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    //>>includeEnd('debug');

    this.#editor = editor;

    /**
     * The visible rows, in tree order. Observable.
     *
     * @type {EditorOutlinerRow[]}
     */
    this.rows = [];

    /**
     * The row keyboard navigation starts from, if any. Cleared when the row
     * is hidden. Observable.
     *
     * @type {EditorOutlinerRow|undefined}
     */
    this.focusedRow = undefined;
    knockout.track(this, ["rows", "focusedRow"]);

    this.#toggleExpanded = createCommand(
      /** @param {EditorOutlinerRow} row */
      (row) => {
        this.#setExpanded(row, !row.expanded);
      },
    );

    this.#select = createCommand(
      /**
       * @param {EditorOutlinerRow} row
       * @param {EditorOutlinerSelectOptions} [options]
       */
      (row, options) => {
        this.#selectRow(row, options);
      },
    );

    this.#eventHelper.add(editor.meshGroupChanged, (group) => {
      this.#onTreeChanged(group === editor.root ? undefined : group);
    });

    this.#eventHelper.add(editor.meshActiveChanged, (mesh, active) => {
      this.#meshActiveStates.get(mesh)?.(active);
    });

    this.#onTreeChanged(undefined);
  }

  /**
   * The editor whose meshes are listed.
   *
   * @type {MeshEditor}
   * @readonly
   */
  get editor() {
    return this.#editor;
  }

  /**
   * Expands or collapses a row. Takes the {@link EditorOutlinerRow}.
   *
   * @type {Command}
   * @readonly
   */
  get toggleExpanded() {
    return this.#toggleExpanded;
  }

  /**
   * Selects a row, making its mesh active in the editor. Takes the
   * {@link EditorOutlinerRow} and, optionally,
   * {@link EditorOutlinerSelectOptions}. Without options, the row's mesh
   * becomes the only active mesh. Does nothing for a row that can't be
   * selected.
   *
   * @type {Command}
   * @readonly
   */
  get select() {
    return this.#select;
  }

  /**
   * Focuses a row and acts on it, as clicking it does: selects it if it can
   * be selected, and otherwise expands or collapses it.
   *
   * @param {EditorOutlinerRow} row The row.
   * @param {EditorOutlinerSelectOptions} [options] How to change the active meshes.
   */
  activate(row, options) {
    this.focusedRow = row;
    if (row.selectable) {
      this.#selectRow(row, options);
    } else {
      this.#setExpanded(row, !row.expanded);
    }
  }

  /**
   * Focuses the row after the focused one, or the first row if none is
   * focused.
   */
  focusNext() {
    this.#moveFocus(1);
  }

  /**
   * Focuses the row before the focused one, or the first row if none is
   * focused.
   */
  focusPrevious() {
    this.#moveFocus(-1);
  }

  /**
   * Focuses the first row.
   */
  focusFirst() {
    this.focusedRow = this.rows[0];
  }

  /**
   * Focuses the last row.
   */
  focusLast() {
    this.focusedRow = this.rows[this.rows.length - 1];
  }

  /**
   * Expands the focused row if it's collapsed, and otherwise focuses its
   * first child.
   */
  expandOrFocusChild() {
    const row = this.focusedRow;
    if (!defined(row) || !row.expandable) {
      return;
    }

    if (row.expanded) {
      this.#moveFocus(1);
    } else {
      this.#setExpanded(row, true);
    }
  }

  /**
   * Collapses the focused row if it's expanded, and otherwise focuses its
   * parent.
   */
  collapseOrFocusParent() {
    const row = this.focusedRow;
    if (!defined(row)) {
      return;
    }

    if (row.expandable && row.expanded) {
      this.#setExpanded(row, false);
    } else {
      this.focusedRow = this.#getParentRow(row) ?? row;
    }
  }

  /**
   * Expands every item in the tree.
   */
  expandAll() {
    /** @param {ReadonlyArray<Mesh|MeshEditorGroup>} items */
    const expand = (items) => {
      for (const item of items) {
        const node = this.#getNode(item);
        node.row.expanded = true;
        expand(node.children);
      }
    };
    expand(this.#roots);
    this.#updateRows();
  }

  /**
   * Collapses every item in the tree, including those not currently visible.
   */
  collapseAll() {
    for (const { row } of this.#nodes.values()) {
      row.expanded = false;
    }
    this.#updateRows();
  }

  /**
   * Re-reads a group and the items beneath it, or the whole tree for
   * <code>undefined</code>, then forgets items no longer in the tree and
   * updates the rows.
   *
   * @param {MeshEditorGroup|undefined} group The group whose children changed, or <code>undefined</code>.
   * @ignore
   */
  #onTreeChanged(group) {
    if (defined(group)) {
      // Skips groups not read yet, which are read when they're first shown.
      this.#reload(group);
    } else {
      this.#roots = this.#editor.root.children;
      for (const root of this.#roots) {
        this.#reload(root);
      }
    }

    this.#forgetRemovedItems();
    this.#updateRows();
  }

  /**
   * Re-reads an item, if it was read before, and the items beneath it that
   * were.
   *
   * @param {Mesh|MeshEditorGroup} item The item.
   * @ignore
   */
  #reload(item) {
    const node = this.#nodes.get(item);
    if (!defined(node)) {
      return;
    }

    this.#read(item, node);
    for (const child of node.children) {
      this.#reload(child);
    }
  }

  /**
   * Gets an item's node, reading the item if it hasn't been yet.
   *
   * @param {Mesh|MeshEditorGroup} item The item.
   * @returns {TreeNode} The item's node.
   * @ignore
   */
  #getNode(item) {
    let node = this.#nodes.get(item);
    if (!defined(node)) {
      node = { row: this.#createRow(item), children: [] };
      this.#nodes.set(item, node);
      this.#read(item, node);
    }
    return node;
  }

  /**
   * @param {Mesh|MeshEditorGroup} item The item.
   * @returns {EditorOutlinerRow} A new row for the item, with the default state.
   * @ignore
   */
  #createRow(item) {
    /** @type {EditorOutlinerRow} */
    const row = {
      item,
      label: "",
      depth: 0,
      expandable: false,
      // Items in the editor's root group start expanded.
      expanded: this.#roots.includes(item),
      mesh: undefined,
      selectable: false,
      active: false,
    };
    knockout.track(row, ["label", "depth", "expandable", "expanded", "mesh"]);
    knockout.defineProperty(row, "selectable", () => defined(row.mesh));
    knockout.defineProperty(
      row,
      "active",
      () => defined(row.mesh) && this.#getActiveState(row.mesh)(),
    );
    return row;
  }

  /**
   * Reads an item's label, mesh and children.
   *
   * @param {Mesh|MeshEditorGroup} item The item.
   * @param {TreeNode} node The item's node.
   * @ignore
   */
  #read(item, node) {
    const row = node.row;
    if (item instanceof Mesh) {
      node.children = [];
      row.mesh = item;
    } else {
      node.children = item.children;
      row.mesh = undefined;
    }
    row.label = item.name ?? this.#getDefaultLabel(item);
    row.expandable = node.children.length > 0;
  }

  /**
   * @param {Mesh|MeshEditorGroup} item The item.
   * @returns {string} "Mesh" or "Group" and the item's number, assigning the next one if it doesn't have one yet.
   * @ignore
   */
  #getDefaultLabel(item) {
    const isMesh = item instanceof Mesh;
    let number = this.#numbers.get(item);
    if (!defined(number)) {
      number = isMesh ? this.#nextMeshNumber++ : this.#nextGroupNumber++;
      this.#numbers.set(item, number);
    }
    return `${isMesh ? "Mesh" : "Group"} ${number}`;
  }

  /**
   * Gets whether a mesh is active, reading it from the editor the first time.
   *
   * @param {Mesh} mesh The mesh.
   * @returns {*} The observable state.
   * @ignore
   */
  #getActiveState(mesh) {
    let state = this.#meshActiveStates.get(mesh);
    if (!defined(state)) {
      const editor = this.#editor;
      state = knockout.observable(
        editor.hasMesh(mesh) && editor.isMeshActive(mesh),
      );
      this.#meshActiveStates.set(mesh, state);
    }
    return state;
  }

  /**
   * Selects a row's mesh, or the meshes of a range of rows. Does nothing for
   * a row that can't be selected.
   *
   * @param {EditorOutlinerRow} row The row.
   * @param {EditorOutlinerSelectOptions} [options] How to change the active meshes.
   * @ignore
   */
  #selectRow(row, options) {
    if (!this.#canSelect(row)) {
      return;
    }

    const toggle = options?.toggle ?? false;
    const rangeStart = options?.range ? this.#getVisibleAnchor() : undefined;
    if (defined(rangeStart)) {
      this.#selectRange(rangeStart, row, toggle);
      return;
    }

    this.#anchor = row;
    const mesh = /** @type {Mesh} */ (row.mesh);
    if (toggle) {
      this.#setMeshActive(mesh, !this.#editor.isMeshActive(mesh));
    } else {
      this.#setActiveMeshes([mesh]);
    }
  }

  /**
   * Activates the meshes of the rows from one row to another.
   *
   * @param {EditorOutlinerRow} start The row the range starts at.
   * @param {EditorOutlinerRow} end The row the range ends at.
   * @param {boolean} keepActive Whether to keep the other active meshes.
   * @ignore
   */
  #selectRange(start, end, keepActive) {
    const meshes = this.#getSelectableMeshesBetween(start, end);
    if (!keepActive) {
      this.#setActiveMeshes(meshes);
      return;
    }

    for (const mesh of meshes) {
      this.#setMeshActive(mesh, true);
    }
  }

  /**
   * @param {EditorOutlinerRow} start A visible row.
   * @param {EditorOutlinerRow} end Another visible row.
   * @returns {Mesh[]} The meshes of the rows from one to the other that can be selected.
   * @ignore
   */
  #getSelectableMeshesBetween(start, end) {
    const startIndex = this.rows.indexOf(start);
    const endIndex = this.rows.indexOf(end);
    return this.rows
      .slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1)
      .filter((row) => this.#canSelect(row))
      .map((row) => /** @type {Mesh} */ (row.mesh));
  }

  /**
   * @returns {EditorOutlinerRow|undefined} The row ranges start at, if it's visible.
   * @ignore
   */
  #getVisibleAnchor() {
    const anchor = this.#anchor;
    return defined(anchor) && this.rows.includes(anchor) ? anchor : undefined;
  }

  /**
   * @param {EditorOutlinerRow} row The row.
   * @returns {boolean} Whether the row has a mesh that's in the editor.
   * @ignore
   */
  #canSelect(row) {
    return row.selectable && this.#editor.hasMesh(row.mesh);
  }

  /**
   * Expands or collapses a row, if it has children.
   *
   * @param {EditorOutlinerRow} row The row.
   * @param {boolean} expanded Whether to expand it.
   * @ignore
   */
  #setExpanded(row, expanded) {
    if (!row.expandable) {
      return;
    }

    row.expanded = expanded;
    this.#updateRows();
  }

  /**
   * Moves the focus by a number of rows, staying on the first or last row
   * rather than going past it. Focuses the first row if none is focused.
   *
   * @param {number} offset The number of rows to move, negative to move up.
   * @ignore
   */
  #moveFocus(offset) {
    const index = this.rows.indexOf(this.focusedRow);
    if (index === -1) {
      this.focusFirst();
      return;
    }

    this.focusedRow = this.rows[index + offset] ?? this.focusedRow;
  }

  /**
   * @param {EditorOutlinerRow} row A visible row.
   * @returns {EditorOutlinerRow|undefined} The row's parent, or <code>undefined</code> for the row of an item in the editor's root group.
   * @ignore
   */
  #getParentRow(row) {
    // The parent is the closest row above at a lower depth.
    for (let index = this.rows.indexOf(row) - 1; index >= 0; index--) {
      if (this.rows[index].depth < row.depth) {
        return this.rows[index];
      }
    }
    return undefined;
  }

  /**
   * Makes the given meshes the only active meshes in the editor.
   *
   * @param {Mesh[]} meshes The meshes.
   * @ignore
   */
  #setActiveMeshes(meshes) {
    const active = new Set(meshes);
    for (const mesh of this.#editor.meshes) {
      this.#setMeshActive(mesh, active.has(mesh));
    }
  }

  /**
   * Makes a mesh active or inactive in the editor, and updates its rows.
   *
   * @param {Mesh} mesh The mesh.
   * @param {boolean} active Whether the mesh should be active.
   * @ignore
   */
  #setMeshActive(mesh, active) {
    const editor = this.#editor;
    if (editor.isMeshActive(mesh) === active) {
      return;
    }

    if (active) {
      editor.setMeshActive(mesh);
    } else {
      editor.setMeshInactive(mesh);
    }
    // meshActiveChanged isn't raised until the next frame, so update now.
    this.#meshActiveStates.get(mesh)?.(active);
  }

  /**
   * Forgets the items that can no longer be reached from the editor's root
   * group. Done after re-reading, rather than as children are removed, so an
   * item that moved to another parent isn't forgotten.
   *
   * @ignore
   */
  #forgetRemovedItems() {
    const reachable = new Set();
    /** @param {ReadonlyArray<Mesh|MeshEditorGroup>} items */
    const visit = (items) => {
      for (const item of items) {
        const node = this.#nodes.get(item);
        if (defined(node) && !reachable.has(item)) {
          reachable.add(item);
          visit(node.children);
        }
      }
    };
    visit(this.#roots);

    for (const item of this.#nodes.keys()) {
      if (!reachable.has(item)) {
        this.#nodes.delete(item);
      }
    }
  }

  /**
   * Flattens the expanded parts of the tree into the rows, and clears the
   * focus if the focused row is no longer visible.
   *
   * @ignore
   */
  #updateRows() {
    /** @type {EditorOutlinerRow[]} */
    const rows = [];
    /**
     * @param {ReadonlyArray<Mesh|MeshEditorGroup>} items
     * @param {number} depth
     */
    const addRows = (items, depth) => {
      for (const item of items) {
        const node = this.#getNode(item);
        const row = node.row;
        row.depth = depth;
        rows.push(row);
        if (row.expandable && row.expanded) {
          addRows(node.children, depth + 1);
        }
      }
    };
    addRows(this.#roots, 0);
    this.rows = rows;

    if (defined(this.focusedRow) && !rows.includes(this.focusedRow)) {
      this.focusedRow = undefined;
    }
  }

  /**
   * Stops listening to the editor.
   */
  destroy() {
    this.#eventHelper.removeAll();
  }
}

export default EditorOutlinerViewModel;
