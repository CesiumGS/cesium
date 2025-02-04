import BoundingSphere from "../Core/BoundingSphere";
import VertexFormat from "../Core/VertexFormat";
import Ellipsoid from "../Core/Ellipsoid";
import Geometry from "../Core/Geometry";
import PrimitiveType from "../Core/PrimitiveType.js";
import FeatureGeometryPipeline from "./FeatureGeometryPipeline.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";

const createTrianglePrimitiveGeometry = (positions, indices) => {
  const length = positions.length;
  const flattenedPositions = new Array(length * 3);
  let index = 0;
  for (let i = 0; i < length; i++) {
    const p = positions[i];
    flattenedPositions[index++] = p.x;
    flattenedPositions[index++] = p.y;
    flattenedPositions[index++] = p.z;
  }

  // TODO: Better packing?
  const geometryOptions = {
    attributes: {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: flattenedPositions,
      }),

      // TODO: id attribute
    },
    indices: indices,
    primitiveType: PrimitiveType.TRIANGLES,
  };

  // TODO: Texture coordinates

  return new Geometry(geometryOptions);
};

const FeatureGeometryFactory = {
  /**
   * Computes the geometric representation of a polygon, including its vertices, indices, and a bounding sphere.
   * @param {FeatureGeometry} featureGeometry
   * @param {Object} [options] TODO
   */
  createGeometry(
    featureGeometry,
    {
      vertexFormat = VertexFormat.DEFAULT,
      ellipsoid = Ellipsoid.default,
      simplificationTolerance = 0,
    },
  ) {
    const { primitiveType, positions, area } = featureGeometry;
    const minArea = (simplificationTolerance * simplificationTolerance) / 2; // Area of triangle

    // Drop features which are too small to see
    if (area < minArea) {
      return;
    }

    // TODO: Drop holes... Should each ring be a new geometry?

    const projectedPositions =
      FeatureGeometryPipeline.projectEqualAngle(positions);

    // TODO: Simplify geometry

    // TODO: Do we need to account for clamping, offsets?
    const boundingSphere = BoundingSphere.fromPoints(positions);

    let attributes, indices;
    if (primitiveType === PrimitiveType.TRIANGLES) {
      indices = FeatureGeometryPipeline.triangulate(projectedPositions);

      // Drop triangles smaller than min area
      indices = FeatureGeometryPipeline.simplifyTriangles(
        positions,
        indices,
        minArea / 2.0,
        indices,
      );

      if (indices.length === 0) {
        return;
      }

      // TODO: Remove unused positions and remap

      let geometry = createTrianglePrimitiveGeometry(positions, indices);

      if (vertexFormat.normal) {
        geometry = GeometryPipeline.computeNormal(geometry);
      }

      attributes = geometry.attributes;
    }

    if (!vertexFormat.position) {
      delete attributes.position;
    }

    // TODO: Should we "tile" if big enough?

    return new Geometry({
      attributes,
      indices,
      primitiveType,
      boundingSphere,
    });
  },
};

export default FeatureGeometryFactory;
