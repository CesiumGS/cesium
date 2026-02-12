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
    const point = new BufferPoint();

    const src = new BufferPointCollection({
      maxFeatureCount: 2,
      maxVertexCount: 2,
    });

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

    BufferPoint.fromCollection(dst, 0, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_X, EPS);
    expect(point.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    BufferPoint.fromCollection(dst, 1, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Y, EPS);
    expect(point.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    BufferPoint.fromCollection(dst, 2, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Z, EPS);
    expect(point.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });
});
