/** @import HalfEdge from "./HalfEdge"; */
/** @import Edge from "./Edge"; */
/** @import Vertex from "./Vertex"; */
/** @import { GeometryAttributeReader } from "@cesium/engine"; */

import MeshComponent from "./MeshComponent";
import TopologyComponents from "./TopologyComponents.js";
import { defined, DeveloperError, Cartesian3 } from "@cesium/engine";

/** @type {number[]} */
const scratchVertPos1 = [];
/** @type {number[]} */
const scratchVertPos2 = [];

/**
 * Face record for an EditableMesh.
 *
 * @extends MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Face extends MeshComponent {
  constructor() {
    super();

    /**
     * @type {HalfEdge | undefined}
     */
    this._halfEdge = undefined;

    /**
     * @type {Cartesian3}
     */
    this._normal = new Cartesian3(0, 0, 1);
  }

  get halfEdge() {
    return this._halfEdge;
  }

  set halfEdge(halfEdge) {
    this._halfEdge = halfEdge;
  }

  /**
   * Returns this face's normal (computed from its vertices using Newell's method. See {@link Face#recomputeNormal}).
   * @returns {Cartesian3}
   */
  get normal() {
    return this._normal;
  }

  /**
   * Returns the boundary edges of this face. Equivalent to
   * {@link Face#edges}.
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  lower(result) {
    return this.edges(result);
  }

  /**
   * Faces have no super-components; <code>result</code> is returned
   * unchanged.
   * @param {MeshComponent[]} result Destination array.
   * @returns {MeshComponent[]}
   */
  upper(result) {
    return result;
  }

  /**
   * @returns {TopologyComponents} {@link TopologyComponents.FACES}.
   */
  level() {
    return TopologyComponents.FACES;
  }

  /**
   * Returns the vertices that compose this face.
   * @param {Vertex[]} [result] Destination array.
   * @returns {Vertex[]}
   */
  vertices(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    this.#walkFaceRing((halfEdge) => {
      result.push(halfEdge.vertex);
    });

    return result;
  }

  /**
   * Returns the edges that compose this face.
   * @param {Edge[]} [result] Destination array.
   * @returns {Edge[]}
   */
  edges(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    this.#walkFaceRing((halfEdge) => {
      result.push(halfEdge.edge);
    });

    return result;
  }

  /**
   * Computes the Face's normal from its vertices using Newell's method
   * (which reduces to a standard cross product for triangles, but generalizes nicely to n-gons, even non-planar ones).
   *
   * @param {GeometryAttributeReader} vertexPositionReader The function to read vertex positions
   */
  recomputeNormal(vertexPositionReader) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    let nx = 0,
      ny = 0,
      nz = 0;
    this.#walkFaceRing((halfEdge) => {
      // Compute the cross product directly (rather than via Cartesian3 utilities) to avoid
      // unpacking arrays to Cartesian3s (as this function will be called for many faces during component translations)
      const a = vertexPositionReader(
        halfEdge.vertex.bufferIndex,
        scratchVertPos1,
      );
      const b = vertexPositionReader(
        halfEdge.next.vertex.bufferIndex,
        scratchVertPos2,
      );
      const dx = a[0] - b[0],
        dy = a[1] - b[1],
        dz = a[2] - b[2];
      const sx = a[0] + b[0],
        sy = a[1] + b[1],
        sz = a[2] + b[2];
      nx += dy * sz - dz * sy;
      ny += dz * sx - dx * sz;
      nz += dx * sy - dy * sx;
    });

    const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);

    this._normal.x = nx * invLen;
    this._normal.y = ny * invLen;
    this._normal.z = nz * invLen;
  }

  /**
   * Triangulation of this face as a flat array of vertex indices into the
   * face's vertex ring, with three indices per triangle.
   *
   * The current implementation is a simple fan triangulation rooted at the
   * first vertex. We could do better with earcut or other algorithms, but for now,
   * this suffices until we have a need for more complex triangulation. This is also faster.
   *
   * @returns {Uint32Array} Vertex indices, of length <code>(n - 2) * 3</code>
   *   for an n-vertex face.
   */
  triangleIndices() {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Face must have a half-edge.");
    }
    //>>includeEnd('debug');

    let vertexCount = 0;
    let currentHalfEdge = this._halfEdge;
    do {
      vertexCount++;
      currentHalfEdge = currentHalfEdge.next;
    } while (currentHalfEdge !== this._halfEdge);

    const triangleCount = Math.max(0, vertexCount - 2);
    const indices = new Uint32Array(triangleCount * 3);
    for (let i = 0; i < triangleCount; i++) {
      indices[i * 3] = 0;
      indices[i * 3 + 1] = i + 1;
      indices[i * 3 + 2] = i + 2;
    }
    return indices;
  }

  /**
   * @param {function(HalfEdge): void} callback
   */
  #walkFaceRing(callback) {
    let currentHalfEdge = this._halfEdge;
    do {
      callback(currentHalfEdge);
      currentHalfEdge = currentHalfEdge.next;
    } while (currentHalfEdge !== this._halfEdge);
  }
}

export default Face;
