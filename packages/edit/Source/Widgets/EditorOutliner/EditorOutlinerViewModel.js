// @ts-check

import { Check, EventHelper, defined } from "@cesium/core";
import { createCommand, knockout } from "@cesium/widgets";

/** @import { Command } from "@cesium/widgets"; */
/** @import Mesh from "../../Editor/Mesh.js"; */
/** @import MeshEditor from "../../Editor/MeshEditor.js"; */
/** @import MeshTreeProvider from "./MeshTreeProvider.js"; */

/**
 * A visible row of an {@link EditorOutliner}. A row is reused for as long as
 * its item stays in the tree. Its properties other than <code>item</code> are
 * observable, and are updated when the tree changes.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @typedef {object} EditorOutlinerRow
 * @property {*} item The provider's item.
 * @property {string} label The item's label.
 * @property {number} depth The item's depth in the tree. Root items are at depth 0.
 * @property {boolean} expandable Whether the item has children.
 * @property {boolean} expanded Whether the item's children are shown, if it has any.
 * @property {Mesh|undefined} mesh The mesh that selecting the row item selects, if any.
 */

/**
 * An item the view model has read from the provider.
 *
 * @typedef {object} TreeNode
 * @property {EditorOutlinerRow} row The item's row.
 * @property {ReadonlyArray<*>} children The item's children when last read.
 * @ignore
 */

/**
 * The rows displayed by an {@link EditorOutliner}: the items of a
 * {@link MeshTreeProvider}, flattened in tree order, with the children of
 * collapsed items left out. Root items start expanded, and other items start
 * collapsed. Items keep whether they're expanded when the tree changes, as
 * long as they stay in it.
 *
 * @alias EditorOutlinerViewModel
 * @constructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @param {MeshEditor} editor The editor whose meshes are listed.
 * @param {MeshTreeProvider} provider The tree to display.
 */
class EditorOutlinerViewModel {
  /** @type {MeshEditor} */
  #editor;

  /** @type {MeshTreeProvider} */
  #provider;

  #eventHelper = new EventHelper();

  /**
   * The root items when last read.
   *
   * @type {ReadonlyArray<*>}
   */
  #roots = [];

  /**
   * Every item read from the provider that's still in the tree, including the
   * children of collapsed items, so they keep whether they're expanded.
   *
   * @type {Map<*, TreeNode>}
   */
  #nodes = new Map();

  /** @type {Command} */
  #toggleExpanded;

  /**
   * @param {MeshEditor} editor The editor whose meshes are listed.
   * @param {MeshTreeProvider} provider The tree to display.
   */
  constructor(editor, provider) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("editor", editor);
    Check.typeOf.object("provider", provider);
    //>>includeEnd('debug');

    this.#editor = editor;
    this.#provider = provider;

    /**
     * The visible rows, in tree order. Observable.
     *
     * @type {EditorOutlinerRow[]}
     */
    this.rows = [];
    knockout.track(this, ["rows"]);

    this.#toggleExpanded = createCommand(
      /** @param {EditorOutlinerRow} row */
      (row) => {
        if (!row.expandable) {
          return;
        }

        row.expanded = !row.expanded;
        this.#updateRows();
      },
    );

    this.#eventHelper.add(provider.changed, (item) => {
      this.#onTreeChanged(item);
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
   * The tree being displayed.
   *
   * @type {MeshTreeProvider}
   * @readonly
   */
  get provider() {
    return this.#provider;
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
   * Expands every item in the tree.
   */
  expandAll() {
    /** @param {ReadonlyArray<*>} items */
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
   * Re-reads an item and the items beneath it, or the whole tree for
   * <code>undefined</code>, then forgets items no longer in the tree and
   * updates the rows.
   *
   * @param {*} item The item that changed, or <code>undefined</code>.
   * @ignore
   */
  #onTreeChanged(item) {
    if (!defined(item)) {
      this.#roots = this.#provider.getChildren();

      for (const root of this.#roots) {
        this.#reload(root);
      }
    } else if (this.#nodes.has(item)) {
      this.#reload(item);
    } else {
      // Not read yet, so it'll be read when it's first shown.
      return;
    }

    this.#forgetRemovedItems();
    this.#updateRows();
  }

  /**
   * Re-reads an item, if it was read before, and the items beneath it that
   * were.
   *
   * @param {*} item The item.
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
   * @param {*} item The item.
   * @returns {TreeNode} The item's node.
   * @ignore
   */
  #getNode(item) {
    let node = this.#nodes.get(item);
    if (!defined(node)) {
      /** @type {EditorOutlinerRow} */
      const row = {
        item,
        label: "",
        depth: 0,
        expandable: false,
        // Root items start expanded.
        expanded: this.#roots.includes(item),
        mesh: undefined,
      };
      knockout.track(row, ["label", "depth", "expandable", "expanded", "mesh"]);
      node = { row, children: [] };
      this.#nodes.set(item, node);
      this.#read(item, node);
    }
    return node;
  }

  /**
   * Reads an item's label, mesh and children from the provider.
   *
   * @param {*} item The item.
   * @param {TreeNode} node The item's node.
   * @ignore
   */
  #read(item, node) {
    const provider = this.#provider;
    const row = node.row;
    node.children = provider.getChildren(item);
    row.label = provider.getLabel(item);
    row.mesh = provider.getMesh(item);
    row.expandable = node.children.length > 0;
  }

  /**
   * Forgets the items that can no longer be reached from the root items.
   * Done after re-reading, rather than as children are removed, so an item
   * that moved to another parent isn't forgotten.
   *
   * @ignore
   */
  #forgetRemovedItems() {
    const reachable = new Set();
    /** @param {ReadonlyArray<*>} items */
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
   * Flattens the expanded parts of the tree into the rows.
   *
   * @ignore
   */
  #updateRows() {
    /** @type {EditorOutlinerRow[]} */
    const rows = [];
    /**
     * @param {ReadonlyArray<*>} items
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
  }

  /**
   * Stops listening to the provider. Doesn't destroy the provider.
   */
  destroy() {
    this.#eventHelper.removeAll();
  }
}

export default EditorOutlinerViewModel;
