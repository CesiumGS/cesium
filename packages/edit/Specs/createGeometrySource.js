import { Matrix4 } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryReader,
  VertexAttributeSemantic,
} from "@cesium/engine";

/**
 * A 2 x 2 square in the xy-plane, made of two triangles. Its overlay has 4
 * vertices, 5 edges and 2 triangles.
 */
export const square = {
  positions: [
    [-1.0, -1.0, 0.0],
    [1.0, -1.0, 0.0],
    [1.0, 1.0, 0.0],
    [-1.0, 1.0, 0.0],
  ],
  primitives: [
    [0, 1, 2],
    [0, 2, 3],
  ],
};

/**
 * Creates a geometry source that reads the given geometry.
 *
 * @param {object} geometry positions ([x, y, z] per vertex) and primitives (vertex indices per primitive).
 * @returns {object} The source, with an identity world matrix and a show property.
 */
function createGeometrySource(geometry) {
  const position = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.POSITION,
  });

  const copyInto = (values, result, offset = 0) => {
    values.forEach((value, i) => {
      result[offset + i] = value;
    });
    return result;
  };

  const geometryReader = new GeometryReader({
    availableAttributes: [position],
    createReadSession: () => ({
      vertexCount: () => geometry.positions.length,
      primitiveCount: () => geometry.primitives.length,
      primitiveVertexCount: (i) => geometry.primitives[i].length,
      primitiveReader: () => (i, result, offset) =>
        copyInto(geometry.primitives[i], result, offset),
      vertexAttributeReader: () => (i, result, offset) =>
        copyInto(geometry.positions[i], result, offset),
      destroy: () => {},
    }),
  });

  return {
    geometryReader,
    worldMatrix: Matrix4.clone(Matrix4.IDENTITY),
    show: true,
  };
}

export default createGeometrySource;
