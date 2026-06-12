/** @import HalfEdge from "./HalfEdge"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import { GeometryAttributeReader } from "@cesium/engine"; */

import { defined, DeveloperError, Math as CesiumMath } from "@cesium/engine";
import TopologyComponents from "./TopologyComponents.js";
import MeshComponent from "./MeshComponent";

/** @type {number[]} */
const scratchCenterPos = [];
/** @type {number[]} */
const scratchNextPos = [];
/** @type {number[]} */
const scratchPrevPos = [];

/**
 * Vertex record for an EditableMesh.
 *
 * @extends MeshComponent
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Vertex extends MeshComponent {
  /**
   * @param {number} bufferIndex The index of this vertex in the underlying geometry buffer at the time the mesh was built.
   */
  constructor(bufferIndex) {
    super();

    /**
     * @type {HalfEdge | undefined}
     */
    this._halfEdge = undefined;

    /**
     * Index of this vertex in the underlying geometry buffer.
     * Currently treated as fixed for the lifetime of the vertex; once the GeometryAccessor exposes
     * a mapping from original to edited indices, this will be updated to track that mapping.
     * @type {number}
     */
    this._bufferIndex = bufferIndex;
  }

  get halfEdge() {
    return this._halfEdge;
  }

  set halfEdge(halfEdge) {
    this._halfEdge = halfEdge;
  }

  get bufferIndex() {
    return this._bufferIndex;
  }

  /**
   * @returns {TopologyComponents} {@link TopologyComponents.VERTICES}.
   */
  level() {
    return TopologyComponents.VERTICES;
  }

  /**
   * MeshComponent method to return the vertices that are part of this component. For a vertex, this is just itself.
   * @param {Vertex[]} result Destination array.
   * @returns {Vertex[]}
   */
  lower(result) {
    return result;
  }

  /**
   * Returns the edges incident to this vertex. Equivalent to
   * {@link Vertex#edges}.
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  upper(result) {
    return this.edges(result);
  }

  /**
   * Returns the edges that are incident to this vertex.
   * @param {Edge[]} result Destination array.
   * @returns {Edge[]}
   */
  edges(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    this.#walkEdges((halfEdge) => {
      result.push(halfEdge.edge);
    });
    return result;
  }

  /**
   * Returns the faces that are incident to this vertex.
   * @param {Face[]} result Destination array.
   * @returns {Face[]}
   */
  faces(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    this.#walkEdges((halfEdge) => {
      // Boundary half-edges have no face; skip them.
      if (defined(halfEdge.face)) {
        result.push(halfEdge.face);
      }
    });
    return result;
  }

  /**
   * Returns the vertices that are connected to this vertex by an edge.
   * @param {Vertex[]} result Destination array
   * @returns {Vertex[]} The vertices that are connected to this vertex by an edge.
   */
  neighbors(result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    this.#walkEdges((halfEdge) => {
      result.push(halfEdge.twin.vertex);
    });
    return result;
  }

  /**
   * Computes the normal at this vertex by averaging the normals of the incident faces.
   * Weights this average according to the angle between the edges of each face at this vertex,
   * so that faces with a sharper angle at the vertex contribute more to the normal.
   *
   * @param {GeometryAttributeReader} vertexPositionReader The function to read vertex positions.
   * @param {number[]} result Array to hold the resulting normal.
   * @returns {number[]} The resulting normal
   */
  computeNormal(vertexPositionReader, result) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(this._halfEdge)) {
      throw new DeveloperError("Vertex must have a half-edge.");
    }
    //>>includeEnd('debug');

    const center = vertexPositionReader(this.bufferIndex, scratchCenterPos);
    let nx = 0,
      ny = 0,
      nz = 0;

    this.#walkEdges((halfEdge) => {
      const face = halfEdge.face;
      // Boundary half-edges have no face and contribute nothing to the normal.
      if (!defined(face)) {
        return;
      }

      // The two face vertices adjacent to `this` within `face`:
      //   next: where halfEdge points
      //   prev: origin of the half-edge whose .next is halfEdge
      // This is necessary because we've avoided storing an explicit prev half-edge to save memory.
      const nextVertex = halfEdge.next.vertex;
      let prevHalfEdge = halfEdge.next;
      while (prevHalfEdge.next !== halfEdge) {
        prevHalfEdge = prevHalfEdge.next;
      }
      const prevVertex = prevHalfEdge.vertex;

      const nextPos = vertexPositionReader(
        nextVertex.bufferIndex,
        scratchNextPos,
      );
      const prevPos = vertexPositionReader(
        prevVertex.bufferIndex,
        scratchPrevPos,
      );

      const ax = nextPos[0] - center[0],
        ay = nextPos[1] - center[1],
        az = nextPos[2] - center[2];
      const bx = prevPos[0] - center[0],
        by = prevPos[1] - center[1],
        bz = prevPos[2] - center[2];

      const invLenA = 1 / Math.sqrt(ax * ax + ay * ay + az * az);
      const invLenB = 1 / Math.sqrt(bx * bx + by * by + bz * bz);
      const weight = CesiumMath.acosClamped(
        (ax * bx + ay * by + az * bz) * invLenA * invLenB,
      );

      const n = face.normal;
      nx += n.x * weight;
      ny += n.y * weight;
      nz += n.z * weight;
    });

    const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
    result[0] = nx * invLen;
    result[1] = ny * invLen;
    result[2] = nz * invLen;
    return result;
  }

  /**
   * Walks the outgoing half-edges around this vertex (those whose origin is this vertex),
   * invoking <code>callback</code> for each.
   * @param {function(HalfEdge): void} callback
   */
  #walkEdges(callback) {
    let currentHalfEdge = this._halfEdge;
    do {
      callback(currentHalfEdge);
      currentHalfEdge = currentHalfEdge.twin.next;
    } while (currentHalfEdge !== this._halfEdge);
  }
}

export default Vertex;
