/** @import Selection, { SelectionDelta } from "./Selection"; */
/** @import Vertex from "./Vertex"; */

import TopologyComponents from "./TopologyComponents";

/** @type {Vertex[]} */
const scratchVerts = [];

/**
 * A view of a Selection representing the vertices on the boundary of the selection, as well as the sets of vertices
 * adjacent to the boundary (the "inner" and "outer" rings). This is a readonly view - it does not modify the selection itself,
 * but can be used by a Selection to implement grow and shrink operations, or by operations that need boundary information (e.g. recomputing
 * vertex normals after translating a selection).
 */
class SelectionBoundary {
  /**
   * @param {Selection} selection The selection whose boundary this class represents.
   */
  constructor(selection) {
    this._selection = selection;
    /**
     * @type {Set<Vertex>} The vertices on the boundary of the selection.
     */
    this._vertices = new Set();
    /**
     * @type {Set<Vertex>} The vertices on the ring inside the selection boundary. (The vertices that would be the new boundary after shrink().)
     */
    this._innerVertices = new Set();
    /**
     * @type {Set<Vertex>} The vertices on the ring outside the selection boundary. (The vertices that would be the new boundary after grow().)
     */
    this._outerVertices = new Set();
    /**
     * @type {boolean} Whether or not the boundary is dirty and needs to be recomputed.
     */
    this._dirty = true;
    /**
     * @type {boolean} Whether to ignore selection changes (e.g. when the selection is modified internally via grow/shrink)
     */
    this._ignoreSelectionChange = false;

    // Note: the lifetime of the SelectionBoundary is expected to match the lifetime of the Selection, so we don't need to worry about explicitly unsubscribing from the event.
    this._unsubscribe = selection.changed.addEventListener((delta) => {
      if (this._ignoreSelectionChange) {
        return;
      }

      this._dirty = true;
      this._vertices.clear();
      this._innerVertices.clear();
      this._outerVertices.clear();
    });
  }

  get vertices() {
    // Lazily compute the boundary vertices when requested.
    // Note: while the inner and outer vertex sets can get away with using size as a heuristic for recomputation,
    // the boundary vertex set must be explicitly marked dirty when the selection changes, since a fully selected mesh
    // will have no boundary vertices - a valid state - and each get() would reiterate over the whole selection.
    if (this._dirty) {
      this.#computeBoundary();
      this._dirty = false;
    }
    return this._vertices;
  }

  get innerVertices() {
    // Lazily compute the inner vertices when requested.
    if (this._innerVertices.size === 0) {
      this.#computeInnerVertices();
    }
    return this._innerVertices;
  }

  get outerVertices() {
    // Lazily compute the outer vertices when requested.
    if (this._outerVertices.size === 0) {
      this.#computeOuterVertices();
    }
    return this._outerVertices;
  }

  /**
   * Expand the selection to neighboring components of the current boundary.
   */
  grow() {
    // Purposefully assigns using the getters, to ensure boundary and inner are fresh.
    this._innerVertices = this.vertices;
    this._vertices = this.outerVertices;
    this._outerVertices = new Set();
    this.#computeOuterVertices();
    this._dirty = false;

    this.#applySelectionChange((selection) =>
      selection.add(this.outerVertices),
    );
  }

  /**
   * Shrink the selection by removing components on the current boundary.
   */
  shrink() {
    // Purposefully assigns using the getters, to ensure boundary and inner are fresh.
    this._outerVertices = this.vertices;
    this._vertices = this.innerVertices;
    this._innerVertices = new Set();
    this.#computeInnerVertices();
    this._dirty = false;

    this.#applySelectionChange((selection) =>
      selection.remove(this.outerVertices),
    );
  }

  /**
   * Apply the changes to the selection based on the results of grow/shrink.
   *
   * Note: this triggers ~5 selection-changed events. Could be improved,
   * but grow/shrink isn't a per-frame operation, so probably not a big performance concern.
   * @param {function(Selection): void} apply
   */
  #applySelectionChange(apply) {
    this._ignoreSelectionChange = true;
    const oldSelectionLevel = this._selection.selectionLevel;
    this._selection.setSelectionLevel(TopologyComponents.VERTICES);
    apply(this._selection);
    this._selection.setSelectionLevel(oldSelectionLevel);
    this._ignoreSelectionChange = false;
  }

  #computeBoundary() {
    this._vertices.clear();

    for (const vertex of this._selection.vertices) {
      scratchVerts.length = 0;

      const neighbors = vertex.neighbors(scratchVerts);
      if (neighbors.some((n) => !this._selection.vertices.has(n))) {
        this._vertices.add(vertex);
      }
    }
  }

  #computeInnerVertices() {
    this.#collectNeighborsOfBoundary(this._innerVertices, (v) =>
      this._selection.vertices.has(v),
    );
  }

  #computeOuterVertices() {
    this.#collectNeighborsOfBoundary(
      this._outerVertices,
      (v) => !this._selection.vertices.has(v),
    );
  }

  /**
   *
   * @param {Set<Vertex>} target The set of vertices to populate.
   * @param {function(Vertex): boolean} predicate A filter function to determine membership in the target set.
   */
  #collectNeighborsOfBoundary(target, predicate) {
    target.clear();
    const boundary = this.vertices;
    for (const vertex of boundary) {
      scratchVerts.length = 0;

      for (const neighbor of vertex.neighbors(scratchVerts)) {
        if (!boundary.has(neighbor) && predicate(neighbor)) {
          target.add(neighbor);
        }
      }
    }
  }
}

export default SelectionBoundary;
