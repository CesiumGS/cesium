import { Event } from "@cesium/engine";

/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import { MeshComponent } from "./MeshComponent"; */

/**
 * @typedef {object} SelectionChange
 * @property {ReadonlySet<MeshComponent>} added Components newly present in the selection.
 * @property {ReadonlySet<MeshComponent>} removed Components no longer present in the selection.
 */

/**
 * A container for a selection of mesh components (vertices, edges, faces).
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Selection {
  constructor() {
    /** @type {Set<Vertex>} */
    this._vertices = new Set();
    /** @type {Set<Edge>} */
    this._edges = new Set();
    /** @type {Set<Face>} */
    this._faces = new Set();

    /**
     * Raised after any public mutator changes the contents of this selection.
     *
     * Listeners receive a {@link SelectionChange} describing the components
     * added and removed by the mutation.
     * @type {Event<(change: SelectionChange) => void>}
     * @readonly
     */
    this.changed = new Event();
  }

  /** @type {ReadonlySet<Vertex>} */
  get vertices() {
    return this._vertices;
  }

  /** @type {ReadonlySet<Edge>} */
  get edges() {
    return this._edges;
  }

  /** @type {ReadonlySet<Face>} */
  get faces() {
    return this._faces;
  }

  /**
   * @param {MeshComponent} component
   * @returns {boolean}
   */
  has(component) {}

  /**
   * Returns the closure of this selection under vertex incidence: selected
   * vertices, plus the endpoints of selected edges, plus the rings of selected
   * faces, deduplicated.
   *
   * @returns {Set<Vertex>}
   */
  vertexClosure() {}

  /**
   * Adds the given components to the selection.
   * @param {Iterable<MeshComponent>} components
   */
  add(components) {}

  /**
   * Removes the given components from the selection.
   * @param {Iterable<MeshComponent>} components
   */
  remove(components) {}

  /**
   * For each component, adds it if it is not already in the selection, otherwise removes it.
   * @param {Iterable<MeshComponent>} components
   */
  toggle(components) {}

  /**
   * Replaces the current selection with the given components.
   * @param {Iterable<MeshComponent>} components
   */
  set(components) {}

  /**
   * Clears all selected components.
   */
  clear() {}
}

export default Selection;
