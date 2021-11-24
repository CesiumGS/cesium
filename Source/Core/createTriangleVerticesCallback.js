import Cartesian3 from "./Cartesian3.js";

/**
 * Small helper function
 * @param {Float32Array} vertices
 * @param {Uint16Array | Uint32Array} indices
 * @param {TerrainEncoding} encoding
 * @return {Function}
 */
export default function createTriangleVerticesCallback(
  vertices,
  indices,
  encoding
) {
  /**
   *
   * @param {Number} triIdx
   * @param {Cartesian3} v0
   * @param {Cartesian3} v1
   * @param {Cartesian3} v2
   */
  function triangleVerticesCallback(triIdx, v0, v1, v2, traceDetails) {
    encoding.decodePosition(vertices, indices[triIdx * 3], v0);
    encoding.decodePosition(vertices, indices[triIdx * 3 + 1], v1);
    encoding.decodePosition(vertices, indices[triIdx * 3 + 2], v2);

    if (traceDetails) {
      if (!traceDetails.trianglesTested) {
        traceDetails.trianglesTested = [];
      }
      traceDetails.trianglesTested.push({
        idx: triIdx,
        positions: [
          Cartesian3.clone(v0),
          Cartesian3.clone(v1),
          Cartesian3.clone(v2),
        ],
      });
    }
  }

  return triangleVerticesCallback;
}
