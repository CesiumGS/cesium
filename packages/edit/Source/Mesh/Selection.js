/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import MeshComponent from "./MeshComponent"; */

import { Cartesian3, DeveloperError, Event, defined } from "@cesium/engine";

/**
 * Per-type added/removed arrays that describe a single mutation of a
 * {@link Selection}'s closures.
 *
 * @typedef {object} SelectionDelta
 * @property {{ added: Vertex[], removed: Vertex[] }} vertices
 * @property {{ added: Edge[], removed: Edge[] }} edges
 * @property {{ added: Face[], removed: Face[] }} faces
 */

/**
 * A selection of mesh components, organized into per-type sets:
 * vertices, edges, and faces.
 *
 * Adding a component implies its sub-components (an edge implies its
 * endpoints; a face implies its boundary edges and ring vertices) and any
 * higher component whose sub-components are now all selected (e.g. all
 * three vertices of a triangle pull in the triangle's edges and the
 * triangle itself).
 *
 * Removing a component drops any higher component containing it, and any
 * sub-components no surviving super-component still requires. Explicit
 * removal is not undone by re-implication from surviving sub-components,
 * so the per-type sets are primary state - they can't be reconstructed
 * from a single "explicit picks" set.
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
     * Raised after a public mutation that changed the selection. Listeners
     * receive a {@link SelectionDelta} describing the added and
     * removed components per type.
     * @type {Event<(delta: SelectionDelta) => void>}
     */
    this._changed = new Event();
  }

  /** @type {Event<(delta: SelectionDelta) => void>} */
  get changed() {
    return this._changed;
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
   * Total number of components across all three closures.
   * @type {number}
   */
  get size() {
    return this._vertices.size + this._edges.size + this._faces.size;
  }

  /**
   * Whether the given component is in the closure for its type.
   * @param {MeshComponent} component
   * @returns {boolean}
   */
  has(component) {
    return (
      this._vertices.has(/** @type {Vertex} */ (component)) ||
      this._edges.has(/** @type {Edge} */ (component)) ||
      this._faces.has(/** @type {Face} */ (component))
    );
  }

  /**
   * Mean of {@link Vertex#position} over the selected vertices, in model
   * space. Could be cached if it becomes a bottleneck.
   *
   * @param {Cartesian3} result
   * @returns {Cartesian3 | undefined} The centroid, or <code>undefined</code> if no vertices are selected.
   */
  localCentroid(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(result)) {
      throw new DeveloperError("result is required");
    }
    //>>includeEnd('debug');

    const closureSize = this._vertices.size;
    if (closureSize === 0) {
      return undefined;
    }

    Cartesian3.clone(Cartesian3.ZERO, result);
    for (const vertex of this._vertices) {
      Cartesian3.add(result, vertex.position, result);
    }
    return Cartesian3.divideByScalar(result, closureSize, result);
  }

  /**
   * Adds the given components to the selection.
   * @param {Iterable<MeshComponent>} components
   */
  add(components) {
    const delta = newDelta();
    this.#addAll(components, delta);
    this.#notify(delta);
  }

  /**
   * Removes the given components from the selection, cascading to any
   * higher components containing them and any sub-components no longer
   * required.
   * @param {Iterable<MeshComponent>} components
   */
  remove(components) {
    const delta = newDelta();
    this.#removeAll(components, delta);
    this.#notify(delta);
  }

  /**
   * Removes selected components and adds unselected ones, splitting against
   * the state at the start of the call. Removals are applied first, then
   * additions.
   * @param {Iterable<MeshComponent>} components
   */
  toggle(components) {
    /** @type {MeshComponent[]} */
    const toRemove = [];
    /** @type {MeshComponent[]} */
    const toAdd = [];
    for (const component of components) {
      if (this.has(component)) {
        toRemove.push(component);
      } else {
        toAdd.push(component);
      }
    }
    const delta = newDelta();
    this.#removeAll(toRemove, delta);
    this.#addAll(toAdd, delta);
    this.#notify(delta);
  }

  /**
   * Replaces the current selection with the given components. The emitted
   * event reflects the diff between the previous and new selection.
   * @param {Iterable<MeshComponent>} components
   */
  set(components) {
    const oldVertices = this._vertices;
    const oldEdges = this._edges;
    const oldFaces = this._faces;
    this._vertices = new Set();
    this._edges = new Set();
    this._faces = new Set();

    // Re-add against fresh sets; we only want the resulting state, so
    // throw away the per-step delta and diff against the old sets below.
    this.#addAll(components, newDelta());

    const delta = newDelta();
    diffSets(oldVertices, this._vertices, delta.vertices);
    diffSets(oldEdges, this._edges, delta.edges);
    diffSets(oldFaces, this._faces, delta.faces);
    this.#notify(delta);
  }

  /**
   * Clears the selection.
   */
  clear() {
    if (
      this._vertices.size === 0 &&
      this._edges.size === 0 &&
      this._faces.size === 0
    ) {
      return;
    }

    const delta = newDelta();

    for (const v of this._vertices) {
      delta.vertices.removed.push(v);
    }

    for (const e of this._edges) {
      delta.edges.removed.push(e);
    }

    for (const f of this._faces) {
      delta.faces.removed.push(f);
    }

    this._vertices.clear();
    this._edges.clear();
    this._faces.clear();
    this.#notify(delta);
  }

  /**
   * Adds the given components in three passes: vertices, then edges
   * implied by the new vertex set, then faces implied by it. Processing
   * the inputs as a group lets each candidate edge or face be tested only
   * once, no matter how many of the inputs would have produced it.
   *
   * @param {Iterable<MeshComponent>} components
   * @param {SelectionDelta} delta
   */
  #addAll(components, delta) {
    const scratch = [];

    // Pass 1: vertices.
    /** @type {Vertex[]} */
    const newVertices = [];
    for (const component of components) {
      for (const v of component.vertices(scratch)) {
        if (!this._vertices.has(v)) {
          this._vertices.add(v);
          newVertices.push(v);
          delta.vertices.added.push(v);
        }
      }
    }

    // Pass 2: edges. Candidates are the inputs' own edges plus the
    // incident edges of any newly-added vertex - the only edges that
    // could newly have all endpoints selected.
    /** @type {Set<Edge>} */
    const edgeCandidates = new Set();

    for (const component of components) {
      for (const e of component.edges(scratch)) {
        edgeCandidates.add(e);
      }
    }

    for (const v of newVertices) {
      for (const e of v.edges(scratch)) {
        edgeCandidates.add(e);
      }
    }

    for (const e of edgeCandidates) {
      if (this._edges.has(e)) {
        continue;
      }

      if (allInSet(e.vertices(scratch), this._vertices)) {
        this._edges.add(e);
        delta.edges.added.push(e);
      }
    }

    // Pass 3: faces. Same shape, against ring vertices.
    /** @type {Set<Face>} */
    const faceCandidates = new Set();

    for (const component of components) {
      for (const f of component.faces(scratch)) {
        faceCandidates.add(f);
      }
    }

    for (const v of newVertices) {
      for (const f of v.faces(scratch)) {
        faceCandidates.add(f);
      }
    }

    for (const f of faceCandidates) {
      if (this._faces.has(f)) {
        continue;
      }

      if (allInSet(f.vertices(scratch), this._vertices)) {
        this._faces.add(f);
        delta.faces.added.push(f);
      }
    }
  }

  /**
   * Removes the given components in three passes: faces first, then
   * edges, then vertices. Each later pass tests its candidates against
   * the state left by the earlier passes, so a single pass is enough.
   *
   * @param {Iterable<MeshComponent>} components
   * @param {SelectionDelta} delta
   */
  #removeAll(components, delta) {
    const scratch = [];

    // Pass 1: faces. Drop any face an input is or is part of.
    /** @type {Set<Face>} */
    const faceCandidates = new Set();

    for (const component of components) {
      for (const f of component.faces(scratch)) {
        faceCandidates.add(f);
      }
    }

    for (const f of faceCandidates) {
      if (this._faces.has(f)) {
        this._faces.delete(f);
        delta.faces.removed.push(f);
      }
    }

    // Pass 2: edges. Drop unless still required by a surviving face.
    /** @type {Set<Edge>} */
    const edgeCandidates = new Set();

    for (const component of components) {
      for (const e of component.edges(scratch)) {
        edgeCandidates.add(e);
      }
    }

    for (const e of edgeCandidates) {
      if (!this._edges.has(e)) {
        continue;
      }

      if (!anyInSet(e.faces(scratch), this._faces)) {
        this._edges.delete(e);
        delta.edges.removed.push(e);
      }
    }

    // Pass 3: vertices. Drop unless still required by a surviving edge.
    /** @type {Set<Vertex>} */
    const vertexCandidates = new Set();

    for (const component of components) {
      for (const v of component.vertices(scratch)) {
        vertexCandidates.add(v);
      }
    }

    for (const v of vertexCandidates) {
      if (!this._vertices.has(v)) {
        continue;
      }

      if (!anyInSet(v.edges(scratch), this._edges)) {
        this._vertices.delete(v);
        delta.vertices.removed.push(v);
      }
    }
  }

  /**
   * @param {SelectionDelta} delta
   */
  #notify(delta) {
    if (
      delta.vertices.added.length === 0 &&
      delta.vertices.removed.length === 0 &&
      delta.edges.added.length === 0 &&
      delta.edges.removed.length === 0 &&
      delta.faces.added.length === 0 &&
      delta.faces.removed.length === 0
    ) {
      return;
    }
    this._changed.raiseEvent(delta);
  }
}

/** @returns {SelectionDelta} */
function newDelta() {
  return {
    vertices: { added: [], removed: [] },
    edges: { added: [], removed: [] },
    faces: { added: [], removed: [] },
  };
}

/**
 * @template T
 * @param {Iterable<T>} items
 * @param {Set<T>} set
 * @returns {boolean}
 */
function allInSet(items, set) {
  for (const item of items) {
    if (!set.has(item)) {
      return false;
    }
  }
  return true;
}

/**
 * @template T
 * @param {Iterable<T>} items
 * @param {Set<T>} set
 * @returns {boolean}
 */
function anyInSet(items, set) {
  for (const item of items) {
    if (set.has(item)) {
      return true;
    }
  }
  return false;
}

/**
 * @template T
 * @param {Set<T>} oldSet
 * @param {Set<T>} newSet
 * @param {{ added: T[], removed: T[] }} out
 */
function diffSets(oldSet, newSet, out) {
  for (const item of newSet) {
    if (!oldSet.has(item)) {
      out.added.push(item);
    }
  }
  for (const item of oldSet) {
    if (!newSet.has(item)) {
      out.removed.push(item);
    }
  }
}

export default Selection;
