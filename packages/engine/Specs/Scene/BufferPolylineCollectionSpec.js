import {
  Color,
  BufferPolyline,
  BufferPolylineCollection,
} from "../../index.js";

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
    expect(polyline.getPositions(positionsScratch)).toEqual(positions1);

    collection.get(1, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions2);

    collection.get(2, polyline);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions3);
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
    expect(polyline.getColor(color)).toEqual(Color.RED);
    collection.get(1, polyline);
    expect(polyline.getColor(color)).toEqual(Color.GREEN);
    collection.get(2, polyline);
    expect(polyline.getColor(color)).toEqual(Color.BLUE);
  });

  it("byteLength", () => {
    let collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 1,
    });

    expect(collection.byteLength).toBe(24 + 24);

    collection = new BufferPolylineCollection({
      primitiveCountMax: 128,
      vertexCountMax: 128,
    });

    expect(collection.byteLength).toBe((24 + 24) * 128);
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
    expect(polyline.getColor(color)).toEqual(Color.RED);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions1);

    dst.get(1, polyline);
    expect(polyline.getColor(color)).toEqual(Color.GREEN);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions2);

    dst.get(2, polyline);
    expect(polyline.getColor(color)).toEqual(Color.BLUE);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions3);
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
