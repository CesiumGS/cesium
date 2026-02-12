import {
  Math as CesiumMath,
  Color,
  Polyline3D,
  Polyline3DCollection,
} from "../../index.js";

const EPS = CesiumMath.EPSILON8;

describe("Polyline3DCollection", () => {
  const color = new Color();

  it("featureId", () => {
    const collection = new Polyline3DCollection();
    const polyline = new Polyline3D();

    collection.add({}, polyline);
    collection.add({}, polyline);
    collection.add({}, polyline);

    Polyline3D.fromCollection(collection, 0, polyline);
    expect(polyline.featureId).toBe(0);
    Polyline3D.fromCollection(collection, 1, polyline);
    expect(polyline.featureId).toBe(1);
    Polyline3D.fromCollection(collection, 2, polyline);
    expect(polyline.featureId).toBe(2);
  });

  it("positions", () => {
    const collection = new Polyline3DCollection();
    const polyline = new Polyline3D();

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0, 0, 1, 1, 0, 1, 2]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1, 0, 2, 2]);
    const positionsScratch = new Float64Array(positions1.length);

    collection.add({ positions: positions1 }, polyline);
    collection.add({ positions: positions2 }, polyline);
    collection.add({ positions: positions3 }, polyline);

    Polyline3D.fromCollection(collection, 0, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions1,
      EPS,
    );

    Polyline3D.fromCollection(collection, 1, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions2,
      EPS,
    );

    Polyline3D.fromCollection(collection, 2, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions3,
      EPS,
    );
  });

  it("show", () => {
    const collection = new Polyline3DCollection();
    const polyline = new Polyline3D();

    collection.add({ show: true }, polyline);
    collection.add({ show: false }, polyline);

    expect(Polyline3D.fromCollection(collection, 0, polyline).show).toBe(true);
    expect(Polyline3D.fromCollection(collection, 1, polyline).show).toBe(false);
  });

  it("color", () => {
    const collection = new Polyline3DCollection();
    const polyline = new Polyline3D();

    collection.add({ color: Color.RED }, polyline);
    collection.add({ color: Color.GREEN }, polyline);
    collection.add({ color: Color.BLUE }, polyline);

    Polyline3D.fromCollection(collection, 0, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    Polyline3D.fromCollection(collection, 1, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    Polyline3D.fromCollection(collection, 2, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });

  it("byteLength", () => {
    let collection = new Polyline3DCollection({
      maxFeatureCount: 1,
      maxVertexCount: 1,
    });

    expect(collection.byteLength).toBe(28 + 24);

    collection = new Polyline3DCollection({
      maxFeatureCount: 128,
      maxVertexCount: 128,
    });

    expect(collection.byteLength).toBe((28 + 24) * 128);
  });

  it("clone", () => {
    const polyline = new Polyline3D();

    const src = new Polyline3DCollection({
      maxFeatureCount: 2,
      maxVertexCount: 6,
    });

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0, 0, 1, 1, 0, 1, 2]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1, 0, 2, 2]);
    const positionsScratch = new Float64Array(positions1.length);

    src.add({ positions: positions1, color: Color.RED }, polyline);
    src.add({ positions: positions2, color: Color.GREEN }, polyline);

    const dst = new Polyline3DCollection({
      maxFeatureCount: 3,
      maxVertexCount: 9,
    });

    Polyline3DCollection.clone(src, dst);

    expect(dst.featureCount).toBe(2);
    expect(dst.featureCountMax).toBe(3);

    dst.add({ positions: positions3, color: Color.BLUE }, polyline);

    expect(dst.featureCount).toBe(3);

    Polyline3D.fromCollection(dst, 0, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions1,
      EPS,
    );

    Polyline3D.fromCollection(dst, 1, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions2,
      EPS,
    );

    Polyline3D.fromCollection(dst, 2, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions3,
      EPS,
    );
  });
});
