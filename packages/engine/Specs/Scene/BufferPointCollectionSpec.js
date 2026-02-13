import {
  Math as CesiumMath,
  Cartesian3,
  Color,
  BufferPoint,
  BufferPointCollection,
} from "../../index.js";

const EPS = CesiumMath.EPSILON8;

describe("BufferPointCollection", () => {
  const position = new Cartesian3();
  const color = new Color();

  it("featureId", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({}, point);
    collection.add({}, point);
    collection.add({}, point);

    expect(BufferPoint.fromCollection(collection, 0, point).featureId).toBe(0);
    expect(BufferPoint.fromCollection(collection, 1, point).featureId).toBe(1);
    expect(BufferPoint.fromCollection(collection, 2, point).featureId).toBe(2);
  });

  it("position", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({ position: Cartesian3.UNIT_X }, point);
    collection.add({ position: Cartesian3.UNIT_Y }, point);
    collection.add({ position: Cartesian3.UNIT_Z }, point);

    BufferPoint.fromCollection(collection, 0, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_X, EPS);

    BufferPoint.fromCollection(collection, 1, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Y, EPS);

    BufferPoint.fromCollection(collection, 2, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Z, EPS);
  });

  it("show", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({ show: true }, point);
    collection.add({ show: false }, point);

    expect(BufferPoint.fromCollection(collection, 0, point).show).toBe(true);
    expect(BufferPoint.fromCollection(collection, 1, point).show).toBe(false);
  });

  it("color", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({ color: Color.RED }, point);
    collection.add({ color: Color.GREEN }, point);
    collection.add({ color: Color.BLUE }, point);

    BufferPoint.fromCollection(collection, 0, point);
    expect(point.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    BufferPoint.fromCollection(collection, 1, point);
    expect(point.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    BufferPoint.fromCollection(collection, 2, point);
    expect(point.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });

  it("byteLength", () => {
    let collection = new BufferPointCollection({
      maxFeatureCount: 1,
      maxVertexCount: 1,
    });

    expect(collection.byteLength).toBe(16 + 24);

    collection = new BufferPointCollection({
      maxFeatureCount: 128,
      maxVertexCount: 128,
    });

    expect(collection.byteLength).toBe((16 + 24) * 128);
  });

  it("clone", () => {
    const src = new BufferPointCollection({
      maxFeatureCount: 2,
      maxVertexCount: 2,
    });

    const point = new BufferPoint();
    src.add({ position: Cartesian3.UNIT_X, color: Color.RED }, point);
    src.add({ position: Cartesian3.UNIT_Y, color: Color.GREEN }, point);

    const dst = new BufferPointCollection({
      maxFeatureCount: 3,
      maxVertexCount: 3,
    });

    BufferPointCollection.clone(src, dst);

    expect(dst.featureCount).toBe(2);
    expect(dst.featureCountMax).toBe(3);

    dst.add({ position: Cartesian3.UNIT_Z, color: Color.BLUE }, point);

    expect(dst.featureCount).toBe(3);
    expect(dst.toJSON()).toEqual(
      [
        { position: [1, 0, 0], color: "#ff0000" },
        { position: [0, 1, 0], color: "#008000" },
        { position: [0, 0, 1], color: "#0000ff" },
      ].map(jasmine.objectContaining),
    );
  });

  it("sort", () => {
    const collection = new BufferPointCollection({
      maxFeatureCount: 3,
      maxVertexCount: 3,
    });

    const point = new BufferPoint();
    collection.add({ position: new Cartesian3(3, 0, 0) }, point);
    collection.add({ position: new Cartesian3(1, 0, 0) }, point);
    collection.add({ position: new Cartesian3(2, 0, 0) }, point);

    const positionA = new Cartesian3();
    const positionB = new Cartesian3();

    const remap = collection.sort((a, b) => {
      return a.getPosition(positionA).x - b.getPosition(positionB).x;
    });

    expect(collection.featureCount).toBe(3);
    expect(collection.vertexCount).toBe(3);
    expect(remap).toEqual([2, 0, 1]);
    expect(collection.toJSON()).toEqual(
      [
        { featureId: 1, position: [1, 0, 0] },
        { featureId: 2, position: [2, 0, 0] },
        { featureId: 0, position: [3, 0, 0] },
      ].map(jasmine.objectContaining),
    );
  });
});
