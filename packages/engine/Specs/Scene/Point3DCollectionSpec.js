import {
  Math as CesiumMath,
  Cartesian3,
  Color,
  Point3D,
  Point3DCollection,
} from "../../index.js";

const EPS = CesiumMath.EPSILON8;

describe("Point3DCollection", () => {
  const position = new Cartesian3();
  const color = new Color();

  it("featureId", () => {
    const collection = new Point3DCollection();
    const point = new Point3D();

    collection.add({}, point);
    collection.add({}, point);
    collection.add({}, point);

    expect(Point3D.fromCollection(collection, 0, point).featureId).toBe(0);
    expect(Point3D.fromCollection(collection, 1, point).featureId).toBe(1);
    expect(Point3D.fromCollection(collection, 2, point).featureId).toBe(2);
  });

  it("position", () => {
    const collection = new Point3DCollection();
    const point = new Point3D();

    collection.add({ position: Cartesian3.UNIT_X }, point);
    collection.add({ position: Cartesian3.UNIT_Y }, point);
    collection.add({ position: Cartesian3.UNIT_Z }, point);

    Point3D.fromCollection(collection, 0, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_X, EPS);

    Point3D.fromCollection(collection, 1, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Y, EPS);

    Point3D.fromCollection(collection, 2, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Z, EPS);
  });

  it("show", () => {
    const collection = new Point3DCollection();
    const point = new Point3D();

    collection.add({ show: true }, point);
    collection.add({ show: false }, point);

    expect(Point3D.fromCollection(collection, 0, point).show).toBe(true);
    expect(Point3D.fromCollection(collection, 1, point).show).toBe(false);
  });

  it("color", () => {
    const collection = new Point3DCollection();
    const point = new Point3D();

    collection.add({ color: Color.RED }, point);
    collection.add({ color: Color.GREEN }, point);
    collection.add({ color: Color.BLUE }, point);

    Point3D.fromCollection(collection, 0, point);
    expect(point.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    Point3D.fromCollection(collection, 1, point);
    expect(point.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    Point3D.fromCollection(collection, 2, point);
    expect(point.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });

  it("byteLength", () => {
    let collection = new Point3DCollection({
      maxFeatureCount: 1,
      maxVertexCount: 1,
    });

    expect(collection.byteLength).toBe(16 + 24);

    collection = new Point3DCollection({
      maxFeatureCount: 128,
      maxVertexCount: 128,
    });

    expect(collection.byteLength).toBe((16 + 24) * 128);
  });

  it("clone", () => {
    const point = new Point3D();

    const src = new Point3DCollection({
      maxFeatureCount: 2,
      maxVertexCount: 2,
    });

    src.add({ position: Cartesian3.UNIT_X, color: Color.RED }, point);
    src.add({ position: Cartesian3.UNIT_Y, color: Color.GREEN }, point);

    const dst = new Point3DCollection({
      maxFeatureCount: 3,
      maxVertexCount: 3,
    });

    Point3DCollection.clone(src, dst);

    expect(dst.featureCount).toBe(2);
    expect(dst.featureCountMax).toBe(3);

    dst.add({ position: Cartesian3.UNIT_Z, color: Color.BLUE }, point);

    expect(dst.featureCount).toBe(3);

    Point3D.fromCollection(dst, 0, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_X, EPS);
    expect(point.getColor(color)).toEqualEpsilon(Color.RED, EPS);
    Point3D.fromCollection(dst, 1, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Y, EPS);
    expect(point.getColor(color)).toEqualEpsilon(Color.GREEN, EPS);
    Point3D.fromCollection(dst, 2, point);
    expect(point.getPosition(position)).toEqualEpsilon(Cartesian3.UNIT_Z, EPS);
    expect(point.getColor(color)).toEqualEpsilon(Color.BLUE, EPS);
  });
});
