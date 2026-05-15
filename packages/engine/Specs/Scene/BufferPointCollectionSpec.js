import {
  BoundingSphere,
  Cartesian3,
  Color,
  ComponentDatatype,
  Matrix4,
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  SceneMode,
} from "../../index.js";

describe("Scene/BufferPointCollection", () => {
  const position = new Cartesian3();

  const materialRed = new BufferPointMaterial({ color: Color.RED });
  const materialGreen = new BufferPointMaterial({ color: Color.GREEN });
  const materialBlue = new BufferPointMaterial({ color: Color.BLUE });

  it("featureId", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({}, point);
    collection.add({}, point);
    collection.add({}, point);

    expect(collection.get(0, point).featureId).toBe(0);
    expect(collection.get(1, point).featureId).toBe(1);
    expect(collection.get(2, point).featureId).toBe(2);
  });

  it("position", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({ position: Cartesian3.UNIT_X }, point);
    collection.add({ position: Cartesian3.UNIT_Y }, point);
    collection.add({ position: Cartesian3.UNIT_Z }, point);

    collection.get(0, point);
    expect(point.getPosition(position)).toEqual(Cartesian3.UNIT_X);

    collection.get(1, point);
    expect(point.getPosition(position)).toEqual(Cartesian3.UNIT_Y);

    collection.get(2, point);
    expect(point.getPosition(position)).toEqual(Cartesian3.UNIT_Z);
  });

  it("show", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();

    collection.add({ show: true }, point);
    collection.add({ show: false }, point);

    expect(collection.get(0, point).show).toBe(true);
    expect(collection.get(1, point).show).toBe(false);
  });

  it("material", () => {
    const collection = new BufferPointCollection();
    const point = new BufferPoint();
    const material = new BufferPointMaterial();

    collection.add({ material: materialRed }, point);

    collection.add({}, point);
    point.setMaterial(materialGreen);

    collection.get(0, point);
    expect(point.getMaterial(material).color).toEqual(Color.RED);
    collection.get(1, point);
    expect(point.getMaterial(material).color).toEqual(Color.GREEN);
  });

  it("byteLength", () => {
    let collection = new BufferPointCollection({ primitiveCountMax: 1 });

    const pointByteLength =
      BufferPoint.Layout.__BYTE_LENGTH +
      3 * Float64Array.BYTES_PER_ELEMENT + // positions
      BufferPointMaterial.packedLength;

    expect(collection.byteLength).toBe(pointByteLength);

    collection = new BufferPointCollection({ primitiveCountMax: 128 });

    expect(collection.byteLength).toBe(pointByteLength * 128);
  });

  it("clone", () => {
    const src = new BufferPointCollection({ primitiveCountMax: 2 });

    const point = new BufferPoint();
    src.add({ position: Cartesian3.UNIT_X, material: materialRed }, point);
    src.add({ position: Cartesian3.UNIT_Y, material: materialGreen }, point);

    const dst = new BufferPointCollection({ primitiveCountMax: 3 });

    BufferPointCollection.clone(src, dst);

    expect(dst.primitiveCount).toBe(2);
    expect(dst.primitiveCountMax).toBe(3);

    dst.add({ position: Cartesian3.UNIT_Z, material: materialBlue }, point);

    expect(dst.primitiveCount).toBe(3);
    expect(dst.toJSON()).toEqual(
      [
        {
          position: [1, 0, 0],
          material: jasmine.objectContaining({ color: "#ff0000" }),
        },
        {
          position: [0, 1, 0],
          material: jasmine.objectContaining({ color: "#008000" }),
        },
        {
          position: [0, 0, 1],
          material: jasmine.objectContaining({ color: "#0000ff" }),
        },
      ].map(jasmine.objectContaining),
    );
  });

  it("sort", () => {
    const collection = new BufferPointCollection({ primitiveCountMax: 3 });
    const point = new BufferPoint();

    collection.add({ position: new Cartesian3(3, 0, 0) }, point);
    collection.add({ position: new Cartesian3(1, 0, 0) }, point);
    collection.add({ position: new Cartesian3(2, 0, 0) }, point);

    const positionA = new Cartesian3();
    const positionB = new Cartesian3();

    const remap = collection.sort((a, b) => {
      return a.getPosition(positionA).x - b.getPosition(positionB).x;
    });

    expect(collection.primitiveCount).toBe(3);
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

  it("boundingVolume - dynamic", () => {
    const center = new Cartesian3(1000, 0, 0);

    const positions = [
      Cartesian3.add(center, Cartesian3.UNIT_X, new Cartesian3()),
      Cartesian3.add(center, Cartesian3.UNIT_Y, new Cartesian3()),
      Cartesian3.add(center, Cartesian3.UNIT_Z, new Cartesian3()),
      Cartesian3.subtract(center, Cartesian3.UNIT_X, new Cartesian3()),
      Cartesian3.subtract(center, Cartesian3.UNIT_Y, new Cartesian3()),
      Cartesian3.subtract(center, Cartesian3.UNIT_Z, new Cartesian3()),
    ];

    const collection = new BufferPointCollection({ primitiveCountMax: 6 });
    const point = new BufferPoint();

    collection.add({ position: positions[0] }, point);
    collection.add({ position: positions[1] }, point);
    collection.add({ position: positions[2] }, point);
    collection.add({ position: positions[3] }, point);
    collection.add({ position: positions[4] }, point);
    collection.add({ position: positions[5] }, point);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    expect(collection.boundingVolume.center).toEqual(center);
    expect(collection.boundingVolume.radius).toEqual(1);
  });

  it("boundingVolume - static", () => {
    // When bounding volume is specified in the constructor, it should not be
    // updated or otherwise managed by the collection.

    const collection = new BufferPointCollection({
      primitiveCountMax: 3,
      boundingVolume: new BoundingSphere(Cartesian3.UNIT_Y, 128),
    });
    const point = new BufferPoint();

    collection.add({ position: Cartesian3.UNIT_X }, point);
    collection.add({ position: Cartesian3.UNIT_Y }, point);
    collection.add({ position: Cartesian3.UNIT_Z }, point);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    expect(collection.boundingVolume.center).toEqual(Cartesian3.UNIT_Y);
    expect(collection.boundingVolume.radius).toEqual(128);
  });

  it("positionDatatype", () => {
    const center = new Cartesian3(1000, 0, 0);

    const positions = [
      Cartesian3.add(center, Cartesian3.UNIT_X, new Cartesian3()),
      Cartesian3.subtract(center, Cartesian3.UNIT_X, new Cartesian3()),
    ];

    const collection = new BufferPointCollection({
      primitiveCountMax: 3,
      positionDatatype: ComponentDatatype.INT,
    });

    const point = new BufferPoint();

    collection.add({ position: positions[0] }, point);
    collection.add({ position: positions[1] }, point);

    collection.get(0, point);
    expect(point.getPosition()).toEqual(new Cartesian3(1001, 0, 0));

    collection.get(1, point);
    expect(point.getPosition()).toEqual(new Cartesian3(999, 0, 0));

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    expect(collection.boundingVolume.center).toEqual(center);
    expect(collection.boundingVolume.radius).toEqual(1);
  });

  it("positionNormalized", () => {
    // Normalized int16 values: 32767 represents 1.0 in local space.
    // modelMatrix scales local space by 1000 along each axis.
    const scale = 1000;
    const modelMatrix = Matrix4.fromScale(
      new Cartesian3(scale, scale, scale),
      new Matrix4(),
    );

    // Raw int16 position values representing normalized coordinates.
    // Value 16384 ≈ 0.5 in local space → 500 in world space.
    const rawPosition = new Cartesian3(16384, 0, 0);

    const collection = new BufferPointCollection({
      primitiveCountMax: 1,
      positionDatatype: ComponentDatatype.SHORT,
      positionNormalized: true,
      modelMatrix,
    });

    expect(collection.positionNormalized).toBe(true);
    expect(collection.positionDatatype).toBe(ComponentDatatype.SHORT);

    const point = new BufferPoint();
    collection.add({ position: rawPosition }, point);

    // getPosition() returns the raw buffer value unchanged.
    collection.get(0, point);
    expect(point.getPosition().x).toBe(16384);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    // Bounding volume is computed from de-normalized local positions,
    // then transformed by modelMatrix.
    const expectedWorldX = (16384 / 32767) * scale;
    expect(collection.boundingVolume.center.x).toBeCloseTo(expectedWorldX, 0);
  });
});
