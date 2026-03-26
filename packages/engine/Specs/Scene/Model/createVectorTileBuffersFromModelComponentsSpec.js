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
  primitive.meshVector = options.meshVector;
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
  it("creates one point collection per mesh primitive and preserves local transforms", function () {
    const firstPrimitive = createPrimitive({
      primitiveType: PrimitiveType.POINTS,
      positions: new Float32Array([1.0, 2.0, 3.0]),
      indices: new Uint16Array([0]),
      meshVector: {
        vector: true,
        count: 1,
      },
      featureIds: new Uint16Array([7]),
    });

    const secondPrimitive = createPrimitive({
      primitiveType: PrimitiveType.POINTS,
      positions: new Float32Array([4.0, 5.0, 6.0]),
      indices: new Uint16Array([0]),
      meshVector: {
        vector: true,
        count: 1,
      },
      featureIds: new Uint16Array([9]),
    });

    const node = new ModelComponents.Node();
    node.translation = new Cartesian3(10.0, 20.0, 30.0);
    node.primitives.push(firstPrimitive, secondPrimitive);

    const vectorBuffers = createVectorTileBuffersFromModelComponents(
      createComponents(node),
    );

    expect(vectorBuffers.points).toBeDefined();
    expect(vectorBuffers.points.length).toBe(2);
    expect(vectorBuffers.polylines.length).toBe(0);
    expect(vectorBuffers.polygons.length).toBe(0);

    const firstCollection = vectorBuffers.points[0];
    const secondCollection = vectorBuffers.points[1];
    expect(firstCollection.primitiveCount).toBe(1);
    expect(secondCollection.primitiveCount).toBe(1);

    const expectedTransform = Matrix4.fromTranslation(
      node.translation,
      new Matrix4(),
    );
    expect(
      Matrix4.equals(
        firstCollection._vectorLocalModelMatrix,
        expectedTransform,
      ),
    ).toBe(true);
    expect(
      Matrix4.equals(
        secondCollection._vectorLocalModelMatrix,
        expectedTransform,
      ),
    ).toBe(true);

    const point = new BufferPoint();
    firstCollection.get(0, point);
    expect(point.getPosition(new Cartesian3())).toEqual(
      new Cartesian3(1.0, 2.0, 3.0),
    );
    expect(point.featureId).toBe(7);

    secondCollection.get(0, point);
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
      meshVector: {
        vector: true,
        count: 2,
      },
      featureIds: new Uint16Array([10, 11, 12, 13, 14]),
    });

    const node = new ModelComponents.Node();
    node.translation = new Cartesian3(5.0, 6.0, 7.0);
    node.primitives.push(primitive);

    const vectorBuffers = createVectorTileBuffersFromModelComponents(
      createComponents(node),
    );

    expect(vectorBuffers.points.length).toBe(0);
    expect(vectorBuffers.polylines).toBeDefined();
    expect(vectorBuffers.polylines.length).toBe(1);
    expect(vectorBuffers.polygons.length).toBe(0);

    const collection = vectorBuffers.polylines[0];
    expect(collection.primitiveCount).toBe(2);
    expect(
      Matrix4.equals(
        collection._vectorLocalModelMatrix,
        Matrix4.fromTranslation(node.translation, new Matrix4()),
      ),
    ).toBe(true);

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

  it("creates polygon collections from polygon attribute and index offsets", function () {
    const primitive = createPrimitive({
      primitiveType: PrimitiveType.TRIANGLES,
      positions: new Float32Array([
        0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 2.0, 0.0, 0.0, 3.0, 0.0,
        0.0, 2.0, 1.0, 0.0,
      ]),
      indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
      meshVector: {
        vector: true,
        count: 2,
        polygonAttributeOffsets: new Uint32Array([0, 3]),
        polygonIndicesOffsets: new Uint32Array([0, 3]),
      },
      featureIds: new Uint16Array([100, 100, 100, 200, 200, 200]),
    });

    const node = new ModelComponents.Node();
    node.primitives.push(primitive);

    const vectorBuffers = createVectorTileBuffersFromModelComponents(
      createComponents(node),
    );

    expect(vectorBuffers.points.length).toBe(0);
    expect(vectorBuffers.polylines.length).toBe(0);
    expect(vectorBuffers.polygons).toBeDefined();
    expect(vectorBuffers.polygons.length).toBe(1);

    const collection = vectorBuffers.polygons[0];
    expect(collection.primitiveCount).toBe(2);
    expect(collection.triangleCount).toBe(2);
    expect(collection.holeCount).toBe(0);

    const polygon = new BufferPolygon();
    collection.get(0, polygon);
    expect(Array.from(polygon.getPositions())).toEqual([
      0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0,
    ]);
    expect(Array.from(polygon.getTriangles())).toEqual([0, 1, 2]);
    expect(polygon.featureId).toBe(100);

    collection.get(1, polygon);
    expect(Array.from(polygon.getPositions())).toEqual([
      2.0, 0.0, 0.0, 3.0, 0.0, 0.0, 2.0, 1.0, 0.0,
    ]);
    expect(Array.from(polygon.getTriangles())).toEqual([0, 1, 2]);
    expect(polygon.featureId).toBe(200);
  });

  it("creates polygon holes when hole metadata is present", function () {
    const primitive = createPrimitive({
      primitiveType: PrimitiveType.TRIANGLES,
      positions: new Float32Array([
        0.0, 0.0, 0.0, 4.0, 0.0, 0.0, 4.0, 4.0, 0.0, 0.0, 4.0, 0.0, 1.0, 1.0,
        0.0, 2.0, 1.0, 0.0, 1.0, 2.0, 0.0,
      ]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
      meshVector: {
        vector: true,
        count: 1,
        polygonAttributeOffsets: new Uint32Array([0]),
        polygonIndicesOffsets: new Uint32Array([0]),
        polygonHoleCounts: new Uint32Array([1]),
        polygonHoleOffsets: new Uint32Array([4]),
      },
      featureIds: new Uint16Array([5, 5, 5, 5, 5, 5, 5]),
    });

    const node = new ModelComponents.Node();
    node.primitives.push(primitive);

    const vectorBuffers = createVectorTileBuffersFromModelComponents(
      createComponents(node),
    );
    const collection = vectorBuffers.polygons[0];

    expect(collection.primitiveCount).toBe(1);
    expect(collection.holeCount).toBe(1);
    expect(collection.triangleCount).toBe(2);

    const polygon = new BufferPolygon();
    collection.get(0, polygon);
    expect(polygon.holeCount).toBe(1);
    expect(Array.from(polygon.getHoles())).toEqual([4]);
    expect(Array.from(polygon.getTriangles())).toEqual([0, 1, 2, 0, 2, 3]);
    expect(polygon.featureId).toBe(5);
  });

  it("returns undefined when the model contains no vector primitives", function () {
    const node = new ModelComponents.Node();

    const vectorBuffers = createVectorTileBuffersFromModelComponents(
      createComponents(node),
    );

    expect(vectorBuffers).toBeUndefined();
  });
});
