/** @import Vertex from "./Vertex"; */
/** @import MeshComponent from "./MeshComponent"; */

import { Cartesian3, DeveloperError, defined } from "@cesium/engine";

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
    /** @type {Set<MeshComponent>} */
    for (const component of components) {
      if (this._components.has(component)) {
        continue;
      }

      this._components.add(component);
      this.#addToClosure(component);
    }
  }

  /**
   * Removes the given components from the selection.
   * @param {Iterable<MeshComponent>} components
   */
  remove(components) {
    /** @type {Set<MeshComponent>} */
    for (const component of components) {
      if (!this._components.has(component)) {
        continue;
      }
      this._components.delete(component);
      this.#removeFromClosure(component);
    }
  }

  /**
   * For each component, adds it if it is not already in the selection, otherwise removes it.
   * @param {Iterable<MeshComponent>} components
   */
  toggle(components) {
    for (const component of components) {
      if (this._components.has(component)) {
        this._components.delete(component);
        this.#removeFromClosure(component);
      } else {
        this._components.add(component);
        this.#addToClosure(component);
      }
    }
  }

  /**
   * Replaces the current selection with the given components.
   * @param {Iterable<MeshComponent>} components
   */
  set(components) {
    this.clear();
    this.add(components);
  }

  /**
   * Clears all selected components.
   */
  clear() {
    this._components.clear();
    this._vertexClosureCounts.clear();
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
