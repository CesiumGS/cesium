import {
  BoundingSphere,
  Cartesian3,
  Color,
  ComponentDatatype,
  Matrix4,
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
  SceneMode,
} from "../../index.js";

describe("Scene/BufferPolylineCollection", () => {
  const materialRed = new BufferPolylineMaterial({ color: Color.RED });
  const materialGreen = new BufferPolylineMaterial({ color: Color.GREEN });
  const materialBlue = new BufferPolylineMaterial({ color: Color.BLUE });

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

  it("material", () => {
    const collection = new BufferPolylineCollection();
    const polyline = new BufferPolyline();
    const material = new BufferPolylineMaterial();

    collection.add({ material: materialRed }, polyline);

    collection.add({}, polyline);
    polyline.setMaterial(materialGreen);

    collection.get(0, polyline);
    expect(polyline.getMaterial(material).color).toEqual(Color.RED);
    collection.get(1, polyline);
    expect(polyline.getMaterial(material).color).toEqual(Color.GREEN);
  });

  it("byteLength", () => {
    let collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 1,
    });

    const polylineByteLength =
      BufferPolyline.Layout.__BYTE_LENGTH +
      3 * Float64Array.BYTES_PER_ELEMENT + // positions
      BufferPolylineMaterial.packedLength;

    expect(collection.byteLength).toBe(polylineByteLength);

    collection = new BufferPolylineCollection({
      primitiveCountMax: 128,
      vertexCountMax: 128,
    });

    expect(collection.byteLength).toBe(polylineByteLength * 128);
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

    src.add({ positions: positions1, material: materialRed }, polyline);
    src.add({ positions: positions2, material: materialGreen }, polyline);

    const dst = new BufferPolylineCollection({
      primitiveCountMax: 3,
      vertexCountMax: 9,
    });

    BufferPolylineCollection.clone(src, dst);

    expect(dst.primitiveCount).toBe(2);
    expect(dst.primitiveCountMax).toBe(3);

    dst.add({ positions: positions3, material: materialBlue }, polyline);

    expect(dst.primitiveCount).toBe(3);

    const material = new BufferPolylineMaterial();

    dst.get(0, polyline);
    expect(polyline.getMaterial(material).color).toEqual(Color.RED);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions1);

    dst.get(1, polyline);
    expect(polyline.getMaterial(material).color).toEqual(Color.GREEN);
    expect(polyline.getPositions(positionsScratch)).toEqual(positions2);

    dst.get(2, polyline);
    expect(polyline.getMaterial(material).color).toEqual(Color.BLUE);
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

  it("boundingVolume - dynamic", () => {
    const center = new Cartesian3(1000, 0, 0);

    const positions = Cartesian3.packArray(
      [
        Cartesian3.add(center, Cartesian3.UNIT_X, new Cartesian3()),
        Cartesian3.add(center, Cartesian3.UNIT_Y, new Cartesian3()),
        Cartesian3.add(center, Cartesian3.UNIT_Z, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_X, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_Y, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_Z, new Cartesian3()),
      ],
      new Float64Array(6 * 3),
    );

    const collection = new BufferPolylineCollection({
      primitiveCountMax: 2,
      vertexCountMax: 6,
    });

    const polyline = new BufferPolyline();

    collection.add({ positions: positions.slice(0, 9) }, polyline);
    collection.add({ positions: positions.slice(9, 18) }, polyline);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    expect(collection.boundingVolume.center).toEqual(center);
    expect(collection.boundingVolume.radius).toEqual(1);
  });

  it("boundingVolume - static", () => {
    // When bounding volume is specified in the constructor, it should not be
    // updated or otherwise managed by the collection.

    const center = new Cartesian3(1000, 0, 0);

    const positions = Cartesian3.packArray(
      [
        Cartesian3.add(center, Cartesian3.UNIT_X, new Cartesian3()),
        Cartesian3.add(center, Cartesian3.UNIT_Y, new Cartesian3()),
        Cartesian3.add(center, Cartesian3.UNIT_Z, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_X, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_Y, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_Z, new Cartesian3()),
      ],
      new Float64Array(6 * 3),
    );

    const collection = new BufferPolylineCollection({
      primitiveCountMax: 2,
      vertexCountMax: 6,
      boundingVolume: new BoundingSphere(Cartesian3.UNIT_Y, 128),
    });

    const polyline = new BufferPolyline();

    collection.add({ positions: positions.slice(0, 9) }, polyline);
    collection.add({ positions: positions.slice(9, 18) }, polyline);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    expect(collection.boundingVolume.center).toEqual(Cartesian3.UNIT_Y);
    expect(collection.boundingVolume.radius).toEqual(128);
  });

  it("positionDatatype", () => {
    const center = new Cartesian3(1000, 0, 0);

    const positions = Cartesian3.packArray(
      [
        Cartesian3.add(center, Cartesian3.UNIT_X, new Cartesian3()),
        Cartesian3.add(center, Cartesian3.UNIT_Y, new Cartesian3()),
        Cartesian3.add(center, Cartesian3.UNIT_Z, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_X, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_Y, new Cartesian3()),
        Cartesian3.subtract(center, Cartesian3.UNIT_Z, new Cartesian3()),
      ],
      new Int16Array(6 * 3),
    );

    const collection = new BufferPolylineCollection({
      positionDatatype: ComponentDatatype.SHORT,
      primitiveCountMax: 2,
      vertexCountMax: 6,
    });

    const polyline = new BufferPolyline();

    collection.add({ positions: positions.slice(0, 9) }, polyline);
    collection.add({ positions: positions.slice(9, 18) }, polyline);

    collection.get(0, polyline);
    expect(polyline.getPositions()).toEqual(positions.slice(0, 9));

    collection.get(1, polyline);
    expect(polyline.getPositions()).toEqual(positions.slice(9, 18));

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

    // Store positions as normalized int16 values in [-32767, 32767].
    // Local position (1.0, 0, 0) → raw int16 value 32767.
    // Local position (-1.0, 0, 0) → raw int16 value -32767.
    const positions = new Int16Array([
      32767,
      0,
      0, // (1, 0, 0) in local space → (1000, 0, 0) in world space
      -32767,
      0,
      0, // (-1, 0, 0) in local space → (-1000, 0, 0) in world space
      0,
      32767,
      0, // (0, 1, 0) in local space → (0, 1000, 0) in world space
    ]);

    const collection = new BufferPolylineCollection({
      positionDatatype: ComponentDatatype.SHORT,
      positionNormalized: true,
      modelMatrix,
      primitiveCountMax: 1,
      vertexCountMax: 3,
    });

    expect(collection.positionNormalized).toBe(true);
    expect(collection.positionDatatype).toBe(ComponentDatatype.SHORT);

    const polyline = new BufferPolyline();
    collection.add({ positions }, polyline);

    // getPositions() returns raw buffer values unchanged.
    collection.get(0, polyline);
    expect(polyline.getPositions()).toEqual(positions);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    // Bounding volume is computed in local space, then transformed by modelMatrix.
    expect(collection.boundingVolume.center.x).toBeCloseTo(0, 1);
    expect(collection.boundingVolume.center.y).toBeCloseTo(0, 1);
    expect(collection.boundingVolume.center.z).toBeCloseTo(0, 1);
    expect(collection.boundingVolume.radius).toBeCloseTo(scale, 0);
  });
});
