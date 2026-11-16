import { Matrix4 } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryAttributeDomain,
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
 * @param {object} geometry positions ([x, y, z] per vertex), primitives (vertex indices per primitive), and optionally attributes: <code>{ descriptor, values }</code> with a value per vertex, or for per-corner attributes, an array of values per primitive. Values are numbers or arrays of numbers.
 * @returns {object} The source, with an identity world matrix and a show property.
 */
function createGeometrySource(geometry) {
  const position = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.POSITION,
  });
  const attributes = [
    { descriptor: position, values: geometry.positions },
    ...(geometry.attributes ?? []),
  ];
  const getAttribute = (descriptor) =>
    attributes.find((attribute) => attribute.descriptor.equals(descriptor));

  const copyInto = (value, result, offset = 0) => {
    [].concat(value).forEach((component, i) => {
      result[offset + i] = component;
    });
    return result;
  };

  const geometryReader = new GeometryReader({
    availableAttributes: attributes.map((attribute) => attribute.descriptor),
    createReadSession: () => ({
      vertexCount: () => geometry.positions.length,
      primitiveCount: () => geometry.primitives.length,
      primitiveVertexCount: (i) => geometry.primitives[i].length,
      cornerCount: () =>
        geometry.primitives.reduce(
          (sum, primitive) => sum + primitive.length,
          0,
        ),
      primitiveReader: () => (i, result, offset) =>
        copyInto(geometry.primitives[i], result, offset),
      vertexAttributeReader: (descriptor) => {
        const { values } = getAttribute(descriptor);
        return (i, result, offset) => copyInto(values[i], result, offset);
      },
      cornerAttributeReader: (descriptor) => {
        const { descriptor: available, values } = getAttribute(descriptor);
        if (available.domain === GeometryAttributeDomain.CORNER) {
          return (p, c, result, offset) =>
            copyInto(values[p][c], result, offset);
        }
        return (p, c, result, offset) =>
          copyInto(values[geometry.primitives[p][c]], result, offset);
      },
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
