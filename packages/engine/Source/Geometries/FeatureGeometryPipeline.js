import earcut from "earcut";
import Cartesian2 from "../Core/Cartesian2";
import Cartesian3 from "../Core/Cartesian3";
import Stereographic from "../Core/Stereographic";

// See https://pro.arcgis.com/en/pro-app/latest/tool-reference/cartography/understanding-conflict-resolution-and-generalization.htm
// Data Generalization Workflow:
//  Reduce feature count:
//    - aggregate polygons
//    - merge divided lines
//  Reduce feature complexity:
//    - simply lines and polygons
//    - smooth lines and polygons
//  Resolve visual conflicts:
//    - detect collisions
//    - propagate displacement
//    - clustering?

const scratchDistanceA = new Cartesian3();
const scratchDistanceB = new Cartesian3();
const scratchSimplifyArray = new Array();

const FeatureGeometryPipeline = {
  /**
   *
   * @param {Cartesian3[]} positions
   */
  projectEqualAngle(positions) {
    return Stereographic.fromCartesianArray(positions);
  },

  // Triangle area
  computeTriangleArea3d(p1, p2, p3) {
    const a = Cartesian3.subtract(p1, p2, scratchDistanceA);
    const b = Cartesian3.subtract(p1, p3, scratchDistanceB);
    const axb = Cartesian3.cross(a, b, scratchDistanceA);
    return Cartesian3.magnitude(axb) / 2.0;
  },

  /**
   * Triangulate a 2D geometry so it can be meshed.
   *
   * @param {Cartesian3[]} positions Cartesian2 array containing the vertices of the polygon
   * @param {number[]} indices Index array representing triangles that fill the polygon
   * @param {number} minimumArea in meters squared
   * @param {number[]} result TODO
   * @returns {number[]} simplified index array with positions removed
   */
  simplifyTriangles(positions, indices, minArea, result) {
    scratchSimplifyArray.length = 0;

    let i0, i1, i2, p0, p1, p2, area;
    for (let i = 0; i < indices.length; i += 3) {
      i0 = indices[i];
      i1 = indices[i + 1];
      i2 = indices[i + 2];

      p0 = positions[i0];
      p1 = positions[i1];
      p2 = positions[i2];

      area = FeatureGeometryPipeline.computeTriangleArea3d(p0, p1, p2);

      if (area >= minArea) {
        scratchSimplifyArray.push(i0);
        scratchSimplifyArray.push(i1);
        scratchSimplifyArray.push(i2);
      }
    }

    result.length = scratchSimplifyArray.length;
    for (let i = 0; i < scratchSimplifyArray.length; i++) {
      result[i] = scratchSimplifyArray[i];
    }

    return result;
  },

  /**
   * Triangulate a 2D geometry so it can be meshed
   *
   * @param {Cartesian2[]} positions Cartesian2 array containing the vertices of the polygon
   * @param {number[]} [holes] An array of the staring indices of the holes.
   * @returns {number[]} Index array representing triangles that fill the polygon
   */
  triangulate(positions, holes) {
    const flattenedPositions = Cartesian2.packArray(positions);
    return earcut(flattenedPositions, holes, 2);
  },
};

export default FeatureGeometryPipeline;
