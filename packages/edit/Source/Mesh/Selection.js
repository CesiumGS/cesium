/** @import Vertex from "./Vertex"; */
/** @import MeshComponent from "./MeshComponent"; */

import { Cartesian3, DeveloperError, Event, defined } from "@cesium/engine";

/**
 * A container for a selection of mesh components (vertices, edges, faces).
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Selection {
  constructor() {
    /** @type {Set<MeshComponent>} */
    this._components = new Set();

    /**
     * Reference counts per closure vertex - i.e. the number of currently-selected
     * components incident to each vertex. The keys of this map are the current
     * vertex closure of the selection.
     * @type {Map<Vertex, number>}
     */
    this._vertexClosureCounts = new Map();

    /**
     * Raised after a public mutation that produced any change to the
     * selection. Listeners receive two arrays of {@link MeshComponent}: the
     * components that were added and the components that were removed in
     * this mutation. Either array may be empty but the event is only raised
     * when at least one of them is non-empty.
     * @type {Event<(added: MeshComponent[], removed: MeshComponent[]) => void>}
     */
    this._changed = new Event();
  }

  /** @type {Event<(added: MeshComponent[], removed: MeshComponent[]) => void>} */
  get changed() {
    return this._changed;
  }

  /** @type {ReadonlySet<MeshComponent>} */
  get components() {
    return this._components;
  }

  /** @type {number} */
  get size() {
    return this._components.size;
  }

  /**
   * @param {MeshComponent} component
   * @returns {boolean}
   */
  has(component) {
    return this._components.has(component);
  }

  /**
   * Returns the closure of this selection under vertex incidence: selected
   * vertices, plus the endpoints of selected edges, plus the rings of selected
   * faces, deduplicated.
   *
   * @returns {IterableIterator<Vertex>}
   */
  vertexClosure() {
    return this._vertexClosureCounts.keys();
  }

  /**
   * The number of distinct vertices in {@link Selection#vertexClosure}.
   * @type {number}
   */
  get vertexClosureSize() {
    return this._vertexClosureCounts.size;
  }

  /**
   * Computes the centroid of the vertex closure in model space coordinates
   * (i.e. the mean of {@link Vertex#position} over {@link Selection#vertexClosure}).
   * Could potentially be cached and invalidated on selection change if this becomes a performance bottleneck.
   *
   * @param {Cartesian3} [result]
   * @returns {Cartesian3 | undefined} The centroid, or <code>undefined</code> if the closure is empty.
   */
  localCentroid(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(result)) {
      throw new DeveloperError("result is required");
    }
    //>>includeEnd('debug');

    const closureSize = this._vertexClosureCounts.size;
    if (closureSize === 0) {
      return undefined;
    }

    Cartesian3.clone(Cartesian3.ZERO, result);
    for (const vertex of this._vertexClosureCounts.keys()) {
      Cartesian3.add(result, vertex.position, result);
    }
    return Cartesian3.divideByScalar(result, closureSize, result);
  }

  /**
   * Adds the given components to the selection.
   * @param {Iterable<MeshComponent>} components
   */
  add(components) {
    const added = [];
    for (const component of components) {
      if (this._components.has(component)) {
        continue;
      }

      this._components.add(component);
      this.#addToClosure(component);
      added.push(component);
    }
    if (added.length > 0) {
      this._changed.raiseEvent(added, []);
    }
  }

  /**
   * Removes the given components from the selection.
   * @param {Iterable<MeshComponent>} components
   */
  remove(components) {
    const removed = [];
    for (const component of components) {
      if (!this._components.has(component)) {
        continue;
      }
      this._components.delete(component);
      this.#removeFromClosure(component);
      removed.push(component);
    }
    if (removed.length > 0) {
      this._changed.raiseEvent([], removed);
    }
  }

  /**
   * For each component, adds it if it is not already in the selection, otherwise removes it.
   * @param {Iterable<MeshComponent>} components
   */
  toggle(components) {
    const added = [];
    const removed = [];
    for (const component of components) {
      if (this._components.has(component)) {
        this._components.delete(component);
        this.#removeFromClosure(component);
        removed.push(component);
      } else {
        this._components.add(component);
        this.#addToClosure(component);
        added.push(component);
      }
    }
    if (added.length > 0 || removed.length > 0) {
      this._changed.raiseEvent(added, removed);
    }
  }

  /**
   * Replaces the current selection with the given components.
   * @param {Iterable<MeshComponent>} components
   */
  set(components) {
    const incoming = new Set(components);
    const added = [];
    const removed = [];
    for (const component of this._components) {
      if (!incoming.has(component)) {
        removed.push(component);
      }
    }
    for (const component of incoming) {
      if (!this._components.has(component)) {
        added.push(component);
      }
    }
    for (const component of removed) {
      this._components.delete(component);
      this.#removeFromClosure(component);
    }
    for (const component of added) {
      this._components.add(component);
      this.#addToClosure(component);
    }
    if (added.length > 0 || removed.length > 0) {
      this._changed.raiseEvent(added, removed);
    }
  }

  /**
   * Clears all selected components.
   */
  clear() {
    if (this._components.size === 0) {
      return;
    }
    const removed = Array.from(this._components);
    this._components.clear();
    this._vertexClosureCounts.clear();
    this._changed.raiseEvent([], removed);
  }

  /**
   * @param {MeshComponent} component
   */
  #addToClosure(component) {
    for (const vertex of component.vertices()) {
      const count = this._vertexClosureCounts.get(vertex) ?? 0;
      this._vertexClosureCounts.set(vertex, count + 1);
    }
  }

  /**
   * @param {MeshComponent} component
   */
  #removeFromClosure(component) {
    for (const vertex of component.vertices()) {
      const count = this._vertexClosureCounts.get(vertex) - 1;
      if (count === 0) {
        this._vertexClosureCounts.delete(vertex);
        continue;
      }

      this._vertexClosureCounts.set(vertex, count);
    }
  }
}

export default Selection;
