import {
  Math as CesiumMath,
  Color,
  Polygon3D,
  Polygon3DCollection,
} from "../../index.js";

const EPS = CesiumMath.EPSILON8;

describe("Polygon3DCollection", () => {
  const color = new Color();

  it("featureId", () => {
    const collection = new Polygon3DCollection();
    const polygon = new Polygon3D();

    collection.add({}, polygon);
    collection.add({}, polygon);
    collection.add({}, polygon);

    expect(Polygon3D.fromCollection(collection, 0, polygon).featureId).toBe(0);
    expect(Polygon3D.fromCollection(collection, 1, polygon).featureId).toBe(1);
    expect(Polygon3D.fromCollection(collection, 2, polygon).featureId).toBe(2);
  });

  it("positions", () => {
    const collection = new Polygon3DCollection();
    const polygon = new Polygon3D();

    const positions1 = new Float64Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const positions2 = new Float64Array([20, 21, 22, 23, 24, 25]);
    const positions3 = new Float64Array([30, 31, 32, 33, 34, 35, 36, 37, 38]);

    collection.add({ positions: positions1 }, polygon);
    collection.add({ positions: positions2 }, polygon);
    collection.add({ positions: positions3 }, polygon);

    Polygon3D.fromCollection(collection, 0, polygon);
    expect(polygon.getPositionCount(), 3);
    expect(polygon.getPositions(new Float64Array(9))).toEqualEpsilon(
      positions1,
      EPS,
    );

    Polygon3D.fromCollection(collection, 1, polygon);
    expect(polygon.getPositionCount(), 2);
    expect(polygon.getPositions(new Float64Array(6))).toEqualEpsilon(
      positions2,
      EPS,
    );

    Polygon3D.fromCollection(collection, 2, polygon);
    expect(polygon.getPositionCount(), 3);
    expect(polygon.getPositions(new Float64Array(9))).toEqualEpsilon(
      positions3,
      EPS,
    );
  });

  it("holes", () => {
    const collection = new Polygon3DCollection({
      maxPositionCount: 8,
      maxHoleCount: 3,
    });
    const polygon = new Polygon3D();

    const positions1 = new Float64Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const positions2 = new Float64Array([20, 21, 22, 23, 24, 25]);
    const positions3 = new Float64Array([30, 31, 32, 33, 34, 35, 36, 37, 38]);

    const holes2 = new Uint32Array([12, 24]);
    const holes3 = new Uint32Array([16]);

    collection.add({ positions: positions1 }, polygon);
    collection.add({ positions: positions2, holes: holes2 }, polygon);
    collection.add({ positions: positions3, holes: holes3 }, polygon);

    Polygon3D.fromCollection(collection, 0, polygon);
    expect(polygon.getHoleCount(), 0);

    Polygon3D.fromCollection(collection, 1, polygon);
    expect(polygon.getHoleCount(), 2);
    expect(polygon.getHoles(new Uint32Array(2))).toEqualEpsilon(holes2, EPS);

    Polygon3D.fromCollection(collection, 2, polygon);
    expect(polygon.getHoleCount(), 1);
    expect(polygon.getHoles(new Uint32Array(1))).toEqualEpsilon(holes3, EPS);
  });

  it("triangles", () => {
    const collection = new Polygon3DCollection({
      maxPositionCount: (24 + 30 + 15) / 3,
      maxHoleCount: 0,
      maxTriangleCount: 4,
    });
    const polygon = new Polygon3D();

    const positions1 = new Float64Array(24).fill(1);
    const positions2 = new Float64Array(30).fill(2);
    const positions3 = new Float64Array(15).fill(3);

    const triangles1 = new Uint32Array([0, 1, 2, 3, 4, 5]);
    const triangles2 = new Uint32Array([6, 7, 8]);
    const triangles3 = new Uint32Array([0, 2, 4]);

    collection.add({ positions: positions1, triangles: triangles1 }, polygon);
    collection.add({ positions: positions2, triangles: triangles2 }, polygon);
    collection.add({ positions: positions3, triangles: triangles3 }, polygon);

    Polygon3D.fromCollection(collection, 0, polygon);
    expect(polygon.getTriangleCount(), 2);
    expect(polygon.getTriangles(new Uint32Array(6))).toEqualEpsilon(
      triangles1,
      EPS,
    );

    Polygon3D.fromCollection(collection, 1, polygon);
    expect(polygon.getTriangleCount(), 1);
    expect(polygon.getTriangles(new Uint32Array(3))).toEqualEpsilon(
      triangles2,
      EPS,
    );

    Polygon3D.fromCollection(collection, 2, polygon);
    expect(polygon.getTriangleCount(), 1);
    expect(polygon.getTriangles(new Uint32Array(3))).toEqualEpsilon(
      triangles3,
      EPS,
    );
  });

  it("show", () => {
    const collection = new Polygon3DCollection();
    const polygon = new Polygon3D();

    collection.add({ show: true }, polygon);
    collection.add({ show: false }, polygon);

    expect(Polygon3D.fromCollection(collection, 0, polygon).show).toBe(true);
    expect(Polygon3D.fromCollection(collection, 1, polygon).show).toBe(false);
  });

  it("color", () => {
    const collection = new Polygon3DCollection();
    const polygon = new Polygon3D();

    collection.add({ color: Color.RED }, polygon);
    collection.add({ color: Color.GREEN }, polygon);
    collection.add({ color: Color.BLUE }, polygon);

    Polygon3D.fromCollection(collection, 0, polygon);
    expect(polygon.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    Polygon3D.fromCollection(collection, 1, polygon);
    expect(polygon.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    Polygon3D.fromCollection(collection, 2, polygon);
    expect(polygon.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });

  it("byteLength", () => {
    let collection = new Polygon3DCollection({
      maxFeatureCount: 1,
      maxVertexCount: 3,
      maxHoleCount: 0,
      maxTriangleCount: 1,
    });

    expect(collection.byteLength).toBe(40 + 72 + 12);

    collection = new Polygon3DCollection({
      maxFeatureCount: 128,
      maxVertexCount: 1024,
      maxHoleCount: 128,
      maxTriangleCount: 1024,
    });

    expect(collection.byteLength).toBe(5120 + 24576 + 512 + 12288);
  });
});
