import {
  Math as CesiumMath,
  Color,
  BufferPolyline,
  BufferPolylineCollection,
} from "../../index.js";

const EPS = CesiumMath.EPSILON8;

describe("BufferPolylineCollection", () => {
  const color = new Color();

  it("featureId", () => {
    const collection = new BufferPolylineCollection();
    const polyline = new BufferPolyline();

    collection.add({}, polyline);
    collection.add({}, polyline);
    collection.add({}, polyline);

    BufferPolyline.fromCollection(collection, 0, polyline);
    expect(polyline.featureId).toBe(0);
    BufferPolyline.fromCollection(collection, 1, polyline);
    expect(polyline.featureId).toBe(1);
    BufferPolyline.fromCollection(collection, 2, polyline);
    expect(polyline.featureId).toBe(2);
  });

  it("positions", () => {
    const collection = new BufferPolylineCollection();
    const polyline = new BufferPolyline();

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0, 0, 1, 1, 0, 1, 2]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1, 0, 2, 2]);
    const positionsScratch = new Float64Array(positions1.length);

    collection.add({ positions: positions1 }, polyline);
    collection.add({ positions: positions2 }, polyline);
    collection.add({ positions: positions3 }, polyline);

    BufferPolyline.fromCollection(collection, 0, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions1,
      EPS,
    );

    BufferPolyline.fromCollection(collection, 1, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions2,
      EPS,
    );

    BufferPolyline.fromCollection(collection, 2, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions3,
      EPS,
    );
  });

  it("show", () => {
    const collection = new BufferPolylineCollection();
    const polyline = new BufferPolyline();

    collection.add({ show: true }, polyline);
    collection.add({ show: false }, polyline);

    expect(BufferPolyline.fromCollection(collection, 0, polyline).show).toBe(
      true,
    );
    expect(BufferPolyline.fromCollection(collection, 1, polyline).show).toBe(
      false,
    );
  });

  it("color", () => {
    const collection = new BufferPolylineCollection();
    const polyline = new BufferPolyline();

    collection.add({ color: Color.RED }, polyline);
    collection.add({ color: Color.GREEN }, polyline);
    collection.add({ color: Color.BLUE }, polyline);

    BufferPolyline.fromCollection(collection, 0, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    BufferPolyline.fromCollection(collection, 1, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    BufferPolyline.fromCollection(collection, 2, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });

  it("byteLength", () => {
    let collection = new BufferPolylineCollection({
      maxFeatureCount: 1,
      maxVertexCount: 1,
    });

    expect(collection.byteLength).toBe(28 + 24);

    collection = new BufferPolylineCollection({
      maxFeatureCount: 128,
      maxVertexCount: 128,
    });

    expect(collection.byteLength).toBe((28 + 24) * 128);
  });

  it("clone", () => {
    const polyline = new BufferPolyline();

    const src = new BufferPolylineCollection({
      maxFeatureCount: 2,
      maxVertexCount: 6,
    });

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0, 0, 1, 1, 0, 1, 2]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1, 0, 2, 2]);
    const positionsScratch = new Float64Array(positions1.length);

    src.add({ positions: positions1, color: Color.RED }, polyline);
    src.add({ positions: positions2, color: Color.GREEN }, polyline);

    const dst = new BufferPolylineCollection({
      maxFeatureCount: 3,
      maxVertexCount: 9,
    });

    BufferPolylineCollection.clone(src, dst);

    expect(dst.featureCount).toBe(2);
    expect(dst.featureCountMax).toBe(3);

    dst.add({ positions: positions3, color: Color.BLUE }, polyline);

    expect(dst.featureCount).toBe(3);

    BufferPolyline.fromCollection(dst, 0, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions1,
      EPS,
    );

    BufferPolyline.fromCollection(dst, 1, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions2,
      EPS,
    );

    BufferPolyline.fromCollection(dst, 2, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions3,
      EPS,
    );
  });

  it("sort", () => {
    const collection = new BufferPolylineCollection({
      maxFeatureCount: 3,
      maxVertexCount: 6,
    });

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1]);

    const point = new BufferPolyline();
    collection.add({ positions: positions1 }, point);
    collection.add({ positions: positions2 }, point);
    collection.add({ positions: positions3 }, point);

    const remap = collection.sort((a, b) => a.vertexCount - b.vertexCount);

    expect(collection.featureCount).toBe(3);
    expect(collection.vertexCount).toBe(6);
    expect(remap).toEqual([2, 0, 1]);
    expect(collection.toJSON()).toEqual(
      [
        { featureId: 1, positions: [0, 1, 0] },
        { featureId: 2, positions: [0, 2, 0, 0, 2, 1] },
        { featureId: 0, positions: [0, 0, 0, 0, 0, 1, 0, 0, 2] },
      ].map(jasmine.objectContaining),
    );
  });
});
