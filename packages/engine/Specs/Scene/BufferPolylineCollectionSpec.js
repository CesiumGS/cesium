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

    collection.get(0, polyline);
    expect(polyline.featureId).toBe(0);
    collection.get(1, polyline);
    expect(polyline.featureId).toBe(1);
    collection.get(2, polyline);
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

    collection.get(0, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions1,
      EPS,
    );

    collection.get(1, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions2,
      EPS,
    );

    collection.get(2, polyline);
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

    expect(collection.get(0, polyline).show).toBe(true);
    expect(collection.get(1, polyline).show).toBe(false);
  });

  it("color", () => {
    const collection = new BufferPolylineCollection();
    const polyline = new BufferPolyline();

    collection.add({ color: Color.RED }, polyline);
    collection.add({ color: Color.GREEN }, polyline);
    collection.add({ color: Color.BLUE }, polyline);

    collection.get(0, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    collection.get(1, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    collection.get(2, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });

  it("sizeInBytes", () => {
    let collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 1,
    });

    expect(collection.sizeInBytes).toBe(28 + 24);

    collection = new BufferPolylineCollection({
      primitiveCountMax: 128,
      vertexCountMax: 128,
    });

    expect(collection.sizeInBytes).toBe((28 + 24) * 128);
  });

  it("clone", () => {
    const polyline = new BufferPolyline();

    const src = new BufferPolylineCollection({
      primitiveCountMax: 2,
      vertexCountMax: 6,
    });

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0, 0, 1, 1, 0, 1, 2]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1, 0, 2, 2]);
    const positionsScratch = new Float64Array(positions1.length);

    src.add({ positions: positions1, color: Color.RED }, polyline);
    src.add({ positions: positions2, color: Color.GREEN }, polyline);

    const dst = new BufferPolylineCollection({
      primitiveCountMax: 3,
      vertexCountMax: 9,
    });

    BufferPolylineCollection.clone(src, dst);

    expect(dst.primitiveCount).toBe(2);
    expect(dst.primitiveCountMax).toBe(3);

    dst.add({ positions: positions3, color: Color.BLUE }, polyline);

    expect(dst.primitiveCount).toBe(3);

    dst.get(0, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions1,
      EPS,
    );

    dst.get(1, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions2,
      EPS,
    );

    dst.get(2, polyline);
    expect(polyline.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
    expect(polyline.getPositions(positionsScratch)).toEqualEpsilon(
      positions3,
      EPS,
    );
  });

  it("sort", () => {
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 3,
      vertexCountMax: 6,
    });

    const positions1 = new Float64Array([0, 0, 0, 0, 0, 1, 0, 0, 2]);
    const positions2 = new Float64Array([0, 1, 0]);
    const positions3 = new Float64Array([0, 2, 0, 0, 2, 1]);

    const point = new BufferPolyline();
    collection.add({ positions: positions1 }, point);
    collection.add({ positions: positions2 }, point);
    collection.add({ positions: positions3 }, point);

    const remap = collection.sort((a, b) => a.vertexCount - b.vertexCount);

    expect(collection.primitiveCount).toBe(3);
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
