/** @import Selection, { SelectionDelta } from "./Selection"; */
/** @import Vertex from "./Vertex"; */
/** @import Face from "./Face"; */

import TopologyComponents from "./TopologyComponents";

/** @type {Vertex[]} */
const scratchVerts = [];
/** @type {Face[]} */
const scratchFaces = [];

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
     * @type {Set<Vertex>} The vertices on the boundary of the selection. (Any vertex that is selected and is a member of a face that has at least one unselected vertex).
     */
    this._vertices = new Set();
    /**
     * @type {Set<Vertex>} Selected vertices adjacent to the boundary. (The vertices that would be the new boundary after shrink().)
     */
    this._innerVertices = new Set();
    /**
     * @type {Set<Vertex>} Unselected vertices adjacent to the boundary. (The vertices that would be the new boundary after grow().)
     */
    this._outerVertices = new Set();
    /**
     * @type {Set<Face>} The faces on the outer side of the selection boundary. That is, faces touching one or more boundary vertices and one or more outer vertices.
     */
    this._outerFaces = new Set();
    /**
     * @type {Set<Face>} The faces on the inner side of the selection boundary. That is, faces touching one or more boundary vertices and one or more inner vertices.
     */
    this._innerFaces = new Set();
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
      this._outerFaces.clear();
      this._innerFaces.clear();
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

  get innerFaces() {
    // Lazily compute the inner faces when requested.
    if (this._innerFaces.size === 0) {
      this.#computeInnerFaces();
    }
    return this._innerFaces;
  }

  get outerFaces() {
    // Lazily compute the outer faces when requested.
    if (this._outerFaces.size === 0) {
      this.#computeOuterFaces();
    }
    return this._outerFaces;
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

    // Invalidate the inner/outer face sets as well and allow them to be lazily recomputed when needed.
    this._outerFaces.clear();
    this._innerFaces.clear();
  }

  #computeBoundary() {
    this._vertices.clear();
    /** @type {Set<Face>} */
    const visitedFaces = new Set();

    const selected = this._selection.vertices;
    for (const vertex of selected) {
      scratchFaces.length = 0;

      for (const face of vertex.faces(scratchFaces)) {
        if (visitedFaces.has(face)) {
          continue;
        }
        visitedFaces.add(face);

        scratchVerts.length = 0;
        const faceVertices = face.vertices(scratchVerts);

        let hasUnselectedVert = false;
        for (const v of faceVertices) {
          if (!selected.has(v)) {
            hasUnselectedVert = true;
            break;
          }
        }

        // All verts of the face are selected, so no verts of the face are boundary verts.
        if (!hasUnselectedVert) {
          continue;
        }

        // All selected vertices of the face are part of the boundary now.
        for (const v of faceVertices) {
          if (selected.has(v)) {
            this._vertices.add(v);
          }
        }
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

  #computeInnerFaces() {
    this.#collectFacesOfBoundary(
      this._innerFaces,
      this.innerVertices,
      this.outerVertices,
    );
  }

  #computeOuterFaces() {
    this.#collectFacesOfBoundary(
      this._outerFaces,
      this.outerVertices,
      this.innerVertices,
    );
  }

  /**
   * Collect the inner or outer faces adjacent to the boundary vertices.
   *
   * @param {Set<Face>} target The set of faces to populate.
   * @param {Set<Vertex>} includedVerts A face qualifies if any of its vertices is in this set.
   * @param {Set<Vertex>} excludedVerts A vertex in this set proves the face cannot qualify. By definition of the boundary vertices, included and excluded vertices never coexist in a face.
   */
  #collectFacesOfBoundary(target, includedVerts, excludedVerts) {
    target.clear();
    for (const vertex of this.vertices) {
      scratchFaces.length = 0;

      for (const face of vertex.faces(scratchFaces)) {
        scratchVerts.length = 0;

        const faceVertices = face.vertices(scratchVerts);

        for (const v of faceVertices) {
          if (includedVerts.has(v)) {
            target.add(face);
            break;
          }
          if (excludedVerts.has(v)) {
            break;
          }
        }
      }
    }
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
