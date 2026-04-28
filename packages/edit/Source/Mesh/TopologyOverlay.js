// @ts-check

import {
  BufferPoint,
  BufferPointCollection,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolyline,
  BufferPolylineCollection,
  Cartesian3,
  destroyObject,
} from "@cesium/engine";

/** @import Vertex from "./Vertex"; */
/** @import Edge from "./Edge"; */
/** @import Face from "./Face"; */
/** @import Scene from "@cesium/engine"; */

/**
 * Overlay layer to help visualize an {@link EditableMesh}'s topology in edit mode,
 * plus enables picking of mesh components by participating in picking passes.
 *
 * The overlay owns three {@link BufferPrimitiveCollection}s:
 * <ul>
 *   <li>A {@link BufferPointCollection} with one point per vertex.</li>
 *   <li>A {@link BufferPolylineCollection} with one polyline per edge.</li>
 *   <li>A {@link BufferPolygonCollection} with one polygon per face.</li>
 * </ul>
 *
 * The {@link Vertex}, {@link Edge}, or {@link Face} object is used directly
 * as the pickObject for each primitive, so a {@link Scene#pick} hit on the
 * overlay returns the corresponding mesh component.
 *
 * @private
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class TopologyOverlay {
  /**
   * @param {Vertex[]} vertices
   * @param {Edge[]} edges
   * @param {Face[]} faces
   */
  constructor(vertices, edges, faces) {
    // Pre-pass faces to compute exact buffer capacities. Each face contributes
    // one polygon with positions = its vertex ring and triangles = its fan
    // triangulation. Cache per-face vertex counts and triangulations so the
    // build pass doesn't have to recompute them, and track the maximum face
    // vertex count so the build pass can reuse a single scratch position
    // buffer sized to the largest face.
    const faceCount = faces.length;
    /** @type {Uint32Array} */
    const faceVertexCounts = new Uint32Array(faceCount);
    /** @type {Uint32Array[]} */
    const faceTriangulations = new Array(faceCount);
    let totalFaceVertexCount = 0;
    let totalFaceTriangleCount = 0;
    let maxFaceVertexCount = 0;
    for (let i = 0; i < faceCount; i++) {
      const face = faces[i];
      const faceVertexCount = face.vertexCount;
      const faceTriangles = face.triangleIndices();
      faceVertexCounts[i] = faceVertexCount;
      faceTriangulations[i] = faceTriangles;
      totalFaceVertexCount += faceVertexCount;
      totalFaceTriangleCount += faceTriangles.length / 3;
      if (faceVertexCount > maxFaceVertexCount) {
        maxFaceVertexCount = faceVertexCount;
      }
    }

    const vertexCount = vertices.length;
    const edgeCount = edges.length;

    /** @type {BufferPointCollection} */
    this._points = new BufferPointCollection({
      primitiveCountMax: vertexCount,
      allowPicking: true,
    });

    /** @type {BufferPolylineCollection} */
    this._polylines = new BufferPolylineCollection({
      primitiveCountMax: edgeCount,
      vertexCountMax: edgeCount * 2,
      allowPicking: true,
    });

    /** @type {BufferPolygonCollection} */
    this._polygons = new BufferPolygonCollection({
      primitiveCountMax: faceCount,
      vertexCountMax: totalFaceVertexCount,
      triangleCountMax: totalFaceTriangleCount,
      allowPicking: true,
    });
    this._polygons.show = false;

    const scratchPoint = new BufferPoint();
    for (let i = 0; i < vertexCount; i++) {
      const vertex = vertices[i];
      this._points.add(
        {
          position: vertex.position,
          pickObject: vertex,
        },
        scratchPoint,
      );
    }

    const edgePositions = new Float64Array(6);
    const scratchPolyline = new BufferPolyline();
    for (let i = 0; i < edgeCount; i++) {
      const edge = edges[i];
      const halfEdge = edge.halfEdge;
      Cartesian3.pack(halfEdge.vertex.position, edgePositions, 0);
      Cartesian3.pack(halfEdge.next.vertex.position, edgePositions, 3);
      this._polylines.add(
        {
          positions: edgePositions,
          pickObject: edge,
        },
        scratchPolyline,
      );
    }

    const facePositions = new Float64Array(maxFaceVertexCount * 3);
    const scratchPolygon = new BufferPolygon();
    for (let i = 0; i < faceCount; i++) {
      const face = faces[i];
      const faceVertexCount = faceVertexCounts[i];
      face.forEachVertex((vertex, j) => {
        Cartesian3.pack(vertex.position, facePositions, j * 3);
      });
      this._polygons.add(
        {
          positions: facePositions.subarray(0, faceVertexCount * 3),
          triangles: faceTriangulations[i],
          pickObject: face,
        },
        scratchPolygon,
      );
    }
  }

  /**
   * Adds the overlay's buffer-primitive collections to the given scene's
   * primitive collection so they participate in render and pick passes.
   *
   * @param {Scene} scene
   */
  addToScene(scene) {
    scene.primitives.add(this._points);
    scene.primitives.add(this._polylines);
    scene.primitives.add(this._polygons);
  }

  /**
   * Removes the overlay's buffer-primitive collections from the given scene's
   * primitive collection without destroying them.
   *
   * @param {Scene} scene
   */
  removeFromScene(scene) {
    scene.primitives.remove(this._points);
    scene.primitives.remove(this._polylines);
    scene.primitives.remove(this._polygons);
  }

  /**
   * Releases the GPU resources held by the underlying buffer collections.
   */
  destroy() {
    this._points.destroy();
    this._polylines.destroy();
    this._polygons.destroy();
    return destroyObject(this);
  }
}

export default TopologyOverlay;
