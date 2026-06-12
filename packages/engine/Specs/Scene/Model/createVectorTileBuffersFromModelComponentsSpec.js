import {
  BufferPoint,
  BufferPolygon,
  BufferPolyline,
  Cartesian3,
  IndexDatatype,
  Matrix4,
  ModelComponents,
  PrimitiveType,
  VertexAttributeSemantic,
  createVectorTileBuffersFromModelComponents,
} from "../../../index.js";

function createPositionAttribute(positions) {
  const attribute = new ModelComponents.Attribute();
  attribute.semantic = VertexAttributeSemantic.POSITION;
  attribute.count = positions.length / 3;
  attribute.typedArray = positions;
  return attribute;
}

function createFeatureIdAttribute(featureIds) {
  const attribute = new ModelComponents.Attribute();
  attribute.semantic = VertexAttributeSemantic.FEATURE_ID;
  attribute.setIndex = 0;
  attribute.count = featureIds.length;
  attribute.typedArray = featureIds;
  return attribute;
}

function createFeatureIdSet(featureCount) {
  const featureIdSet = new ModelComponents.FeatureIdAttribute();
  featureIdSet.featureCount = featureCount;
  featureIdSet.setIndex = 0;
  featureIdSet.positionalLabel = "featureId_0";
  return featureIdSet;
}

function createIndices(typedArray) {
  const indices = new ModelComponents.Indices();
  indices.count = typedArray.length;
  indices.typedArray = typedArray;

  if (typedArray instanceof Uint8Array) {
    indices.indexDatatype = IndexDatatype.UNSIGNED_BYTE;
  } else if (typedArray instanceof Uint16Array) {
    indices.indexDatatype = IndexDatatype.UNSIGNED_SHORT;
  } else {
    indices.indexDatatype = IndexDatatype.UNSIGNED_INT;
  }

  return indices;
}

function createPrimitive(options) {
  const primitive = new ModelComponents.Primitive();
  primitive.primitiveType = options.primitiveType;
  primitive.polygon = options.polygon;
  primitive.attributes.push(createPositionAttribute(options.positions));

  if (options.featureIds) {
    primitive.attributes.push(createFeatureIdAttribute(options.featureIds));
    primitive.featureIds.push(
      createFeatureIdSet(Math.max(...options.featureIds) + 1),
    );
  }

  if (options.indices) {
    primitive.indices = createIndices(options.indices);
  }

  return primitive;
}

function createComponents(rootNode) {
  const components = new ModelComponents.Components();
  components.scene = new ModelComponents.Scene();
  components.scene.nodes.push(rootNode);
  return components;
}

describe("Scene/Model/createVectorTileBuffersFromModelComponents", function () {
  const mockTileContent = { tileset: { featureIdLabel: "featureId_0" } };

  it("creates one point collection per mesh primitive and preserves local transforms", function () {
    const firstPrimitive = createPrimitive({
      primitiveType: PrimitiveType.POINTS,
      positions: new Float32Array([1.0, 2.0, 3.0]),
      indices: new Uint16Array([0]),
      featureIds: new Uint16Array([7]),
    });

    const secondPrimitive = createPrimitive({
      primitiveType: PrimitiveType.POINTS,
      positions: new Float32Array([4.0, 5.0, 6.0]),
      indices: new Uint16Array([0]),
      featureIds: new Uint16Array([9]),
    });

    const node = new ModelComponents.Node();
    node.translation = new Cartesian3(10.0, 20.0, 30.0);
    node.primitives.push(firstPrimitive, secondPrimitive);

    const { collections, collectionLocalMatrices } =
      createVectorTileBuffersFromModelComponents(
        mockTileContent,
        createComponents(node),
      );

    expect(collections.length).toBe(2);

    expect(collections[0].primitiveCount).toBe(1);
    expect(collections[1].primitiveCount).toBe(1);

    const expectedTransform = Matrix4.fromTranslation(
      node.translation,
      new Matrix4(),
    );

    expect(collectionLocalMatrices[0]).toEqual(expectedTransform);
    expect(collectionLocalMatrices[1]).toEqual(expectedTransform);

    const point = new BufferPoint();
    collections[0].get(0, point);
    expect(point.getPosition(new Cartesian3())).toEqual(
      new Cartesian3(1.0, 2.0, 3.0),
    );
    expect(point.featureId).toBe(7);

    collections[1].get(0, point);
    expect(point.getPosition(new Cartesian3())).toEqual(
      new Cartesian3(4.0, 5.0, 6.0),
    );
    expect(point.featureId).toBe(9);
  });

  it("splits line strips using primitive restart values", function () {
    const primitive = createPrimitive({
      primitiveType: PrimitiveType.LINE_STRIP,
      positions: new Float32Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0, 3.0, 0.0, 0.0, 4.0, 0.0,
        0.0,
      ]),
      indices: new Uint32Array([0, 1, 2, 0xffffffff, 2, 3, 4]),
      featureIds: new Uint16Array([10, 11, 12, 13, 14]),
    });

    const node = new ModelComponents.Node();
    node.translation = new Cartesian3(5.0, 6.0, 7.0);
    node.primitives.push(primitive);

    const { collections, collectionLocalMatrices } =
      createVectorTileBuffersFromModelComponents(
        mockTileContent,
        createComponents(node),
      );

    expect(collections.length).toBe(1);

    const collection = collections[0];
    expect(collection.primitiveCount).toBe(2);
    expect(collectionLocalMatrices[0]).toEqual(
      Matrix4.fromTranslation(node.translation, new Matrix4()),
    );

    const polyline = new BufferPolyline();
    collection.get(0, polyline);
    expect(Array.from(polyline.getPositions())).toEqual([
      0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 2.0, 0.0, 0.0,
    ]);
    expect(polyline.featureId).toBe(10);

    collection.get(1, polyline);
    expect(Array.from(polyline.getPositions())).toEqual([
      2.0, 0.0, 0.0, 3.0, 0.0, 0.0, 4.0, 0.0, 0.0,
    ]);
    expect(polyline.featureId).toBe(12);
  });

  it("creates polygon collections from EXT_mesh_polygon", function () {
    // prettier-ignore
    const loopIndices = new Uint32Array([
      0, 1, 2, 3,
      4, 5, 6, 7
    ]);
    const primitive = createPrimitive({
      primitiveType: PrimitiveType.LINE_LOOP,
      // prettier-ignore
      positions: new Float32Array([
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,

        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        0.0, 2.0, 0.0,
        1.0, 2.0, 0.0,
      ]),
      indices: loopIndices,
      polygon: {
        count: 2,
        loopIndices,
        loopIndicesOffsets: new Uint32Array([0, 4]),
        // prettier-ignore
        triangleIndices: new Uint32Array([
          0, 1, 2,
          2, 1, 3,

          4, 5, 6,
          6, 5, 7
        ]),
        triangleIndicesOffsets: new Uint32Array([0, 6]),
      },
      featureIds: new Uint16Array([100, 100, 100, 100, 200, 200, 200, 200]),
    });

    const node = new ModelComponents.Node();
    node.primitives.push(primitive);

    const { collections } = createVectorTileBuffersFromModelComponents(
      mockTileContent,
      createComponents(node),
    );

    expect(collections.length).toBe(1);

    const collection = collections[0];
    expect(collection.primitiveCount).toBe(2);
    expect(collection.triangleCount).toBe(4);
    expect(collection.holeCount).toBe(0);

    const polygon = new BufferPolygon();
    collection.get(0, polygon);
    // prettier-ignore
    expect(Array.from(polygon.getPositions())).toEqual([
      0.0, 0.0, 0.0,
      1.0, 0.0, 0.0,
      0.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
    ]);
    expect(Array.from(polygon.getTriangles())).toEqual([0, 1, 2, 2, 1, 3]);
    expect(polygon.featureId).toBe(100);

    collection.get(1, polygon);
    // prettier-ignore
    expect(Array.from(polygon.getPositions())).toEqual([
      0.0, 1.0, 0.0,
      1.0, 1.0, 0.0,
      0.0, 2.0, 0.0,
      1.0, 2.0, 0.0,
    ]);
    // indices in BufferPolygon are relative to the current polygon's positions.
    expect(Array.from(polygon.getTriangles())).toEqual([0, 1, 2, 2, 1, 3]);
    expect(polygon.featureId).toBe(200);
  });

  it("creates polygon collections with holes from EXT_mesh_polygon", function () {
    // prettier-ignore
    const loopIndices = new Uint32Array([
      0, 1, 2, 3,
      0xffffffff,
      4, 5, 6, 7
    ]);

    const primitive = createPrimitive({
      primitiveType: PrimitiveType.LINE_LOOP,
      // prettier-ignore
      positions: new Float32Array([
        0.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        1.0, 1.0, 0.0,

        0.25, .25, 0.0,
        0.75, 0.25, 0.0,
        0.25, 0.75, 0.0,
        0.75, 0.75, 0.0,
      ]),
      indices: loopIndices,
      polygon: {
        count: 1,
        loopIndices,
        loopIndicesOffsets: new Uint32Array([0]),
        // prettier-ignore
        triangleIndices: new Uint32Array([
          0, 1, 5,
          0, 5, 4,
          0, 4, 2,
          1, 3, 5,
          2, 4, 6,
          2, 6, 3,
          3, 6, 7,
          3, 7, 5
        ]),
        triangleIndicesOffsets: new Uint32Array([0]),
      },
      featureIds: new Uint16Array([5, 5, 5, 5, 5, 5, 5, 5]),
    });

    const node = new ModelComponents.Node();
    node.primitives.push(primitive);

    const { collections } = createVectorTileBuffersFromModelComponents(
      mockTileContent,
      createComponents(node),
    );

    expect(collections.length).toBe(1);

    const collection = collections[0];

    expect(collection.primitiveCount).toBe(1);
    expect(collection.holeCount).toBe(1);
    expect(collection.triangleCount).toBe(8);

    const polygon = new BufferPolygon();
    collection.get(0, polygon);
    expect(polygon.holeCount).toBe(1);
    expect(Array.from(polygon.getHoles())).toEqual([4]);
    expect(polygon.getTriangles().length).toEqual(8 * 3);
    expect(polygon.featureId).toBe(5);
  });

  it("returns empty result when the model contains no vector primitives", function () {
    const node = new ModelComponents.Node();

    const { collections, collectionLocalMatrices } =
      createVectorTileBuffersFromModelComponents(
        mockTileContent,
        createComponents(node),
      );

    expect(collections).toEqual([]);
    expect(collectionLocalMatrices).toEqual([]);
  });
});
