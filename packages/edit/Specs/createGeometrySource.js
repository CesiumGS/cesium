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
 * @param {object} geometry positions ([x, y, z] per vertex), primitives (vertex indices per primitive), and optionally edges (an edge index per vertex of each primitive, like primitives) and attributes: <code>{ descriptor, values }</code> with a value per element of the attribute's domain. Values are numbers or arrays of numbers.
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
  const counts = {
    [GeometryAttributeDomain.VERTEX]: geometry.positions.length,
    [GeometryAttributeDomain.CORNER]: geometry.primitives.flat().length,
    [GeometryAttributeDomain.FACE]: geometry.primitives.length,
    [GeometryAttributeDomain.EDGE]: geometry.edges
      ? Math.max(...geometry.edges.flat()) + 1
      : 0,
  };

  const copyInto = (value, result, offset = 0) => {
    [].concat(value).forEach((component, i) => {
      result[offset + i] = component;
    });
    return result;
  };

  const geometryReader = new GeometryReader({
    availableAttributes: attributes.map((attribute) => attribute.descriptor),
    createReadSession: () => ({
      elementCount: (domain) => counts[domain],
      primitiveVertexCount: (i) => geometry.primitives[i].length,
      primitiveReader: () => (i, result, offset, edgeResult, edgeOffset) => {
        if (edgeResult && geometry.edges) {
          copyInto(geometry.edges[i], edgeResult, edgeOffset);
        }
        return copyInto(geometry.primitives[i], result, offset);
      },
      attributeReader: (descriptor) => {
        const { values } = getAttribute(descriptor);
        return (i, result, offset) => copyInto(values[i], result, offset);
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
