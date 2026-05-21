import {
  BoundingSphere,
  Cartesian3,
  Color,
  ComponentDatatype,
  Matrix4,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolygonMaterial,
  SceneMode,
} from "../../index.js";

describe("Scene/BufferPolygonCollection", () => {
  const materialRed = new BufferPolygonMaterial({ color: Color.RED });
  const materialGreen = new BufferPolygonMaterial({ color: Color.GREEN });
  const materialBlue = new BufferPolygonMaterial({ color: Color.BLUE });

  it("featureId", () => {
    const collection = new BufferPolygonCollection();
    const polygon = new BufferPolygon();

    collection.add({}, polygon);
    collection.add({}, polygon);
    collection.add({}, polygon);

    expect(collection.get(0, polygon).featureId).toBe(0);
    expect(collection.get(1, polygon).featureId).toBe(1);
    expect(collection.get(2, polygon).featureId).toBe(2);
  });

  it("positions", () => {
    const collection = new BufferPolygonCollection();
    const polygon = new BufferPolygon();

    const positions1 = new Float64Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const positions2 = new Float64Array([20, 21, 22, 23, 24, 25, 26, 27, 28]);
    const positions3 = new Float64Array([
      30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
    ]);

    collection.add({ positions: positions1 }, polygon);
    collection.add({ positions: positions2 }, polygon);
    collection.add({ positions: positions3 }, polygon);

    collection.get(0, polygon);
    expect(polygon.vertexCount, 3);
    expect(polygon.getPositions()).toEqual(positions1);

    collection.get(1, polygon);
    expect(polygon.vertexCount, 3);
    expect(polygon.getPositions()).toEqual(positions2);

    collection.get(2, polygon);
    expect(polygon.vertexCount, 4);
    expect(polygon.getPositions()).toEqual(positions3);
  });

  it("outerPositions", () => {
    const collection = new BufferPolygonCollection();
    const polygon = new BufferPolygon();

    const positions = new Float64Array([
      ...createBoxPositions(2), // outer loop
      ...createBoxPositions(1), // hole
    ]);
    const holes = new Uint32Array([3]);

    collection.add({ positions, holes }, polygon);

    expect(polygon.vertexCount, 6);
    expect(polygon.holeCount, 1);
    expect(polygon.outerVertexCount, 3);
    expect(polygon.getPositions()).toEqual(positions);
    expect(polygon.getOuterPositions()).toEqual(createBoxPositions(2));
  });

  it("holes", () => {
    const collection = new BufferPolygonCollection({
      vertexCountMax: 12,
      holeCountMax: 1,
    });
    const polygon = new BufferPolygon();

    const positions1 = createBoxPositions(1);
    const positions2 = createBoxPositions(2);
    const positions3 = new Float64Array([
      ...createBoxPositions(2), // outer loop
      ...createBoxPositions(1), // hole
    ]);

    const holes3 = new Uint32Array([3]);

    collection.add({ positions: positions1 }, polygon);
    collection.add({ positions: positions2 }, polygon);
    collection.add({ positions: positions3, holes: holes3 }, polygon);

    collection.get(0, polygon);
    expect(polygon.holeCount, 0);

    collection.get(1, polygon);
    expect(polygon.holeCount, 0);

    collection.get(2, polygon);
    expect(polygon.holeCount, 1);
    expect(polygon.getHoles()).toEqual(holes3);
    expect(polygon.getHolePositions(0)).toEqual(createBoxPositions(1));
  });

  it("triangles", () => {
    const collection = new BufferPolygonCollection({
      vertexCountMax: (24 + 30 + 15) / 3,
      holeCountMax: 0,
      triangleCountMax: 4,
    });
    const polygon = new BufferPolygon();

    const positions1 = new Float64Array(24).fill(1);
    const positions2 = new Float64Array(30).fill(2);
    const positions3 = new Float64Array(15).fill(3);

    const triangles1 = new Uint32Array([0, 1, 2, 3, 4, 5]);
    const triangles2 = new Uint32Array([6, 7, 8]);
    const triangles3 = new Uint32Array([0, 2, 4]);

    collection.add({ positions: positions1, triangles: triangles1 }, polygon);
    collection.add({ positions: positions2, triangles: triangles2 }, polygon);
    collection.add({ positions: positions3, triangles: triangles3 }, polygon);

    collection.get(0, polygon);
    expect(polygon.triangleCount, 2);
    expect(polygon.getTriangles()).toEqual(triangles1);

    collection.get(1, polygon);
    expect(polygon.triangleCount, 1);
    expect(polygon.getTriangles()).toEqual(triangles2);

    collection.get(2, polygon);
    expect(polygon.triangleCount, 1);
    expect(polygon.getTriangles()).toEqual(triangles3);
  });

  it("show", () => {
    const collection = new BufferPolygonCollection();
    const polygon = new BufferPolygon();

    collection.add({ show: true }, polygon);
    collection.add({ show: false }, polygon);

    expect(collection.get(0, polygon).show).toBe(true);
    expect(collection.get(1, polygon).show).toBe(false);
  });

  it("material", () => {
    const collection = new BufferPolygonCollection();
    const polygon = new BufferPolygon();
    const material = new BufferPolygonMaterial();

    collection.add({ material: materialRed }, polygon);

    collection.add({}, polygon);
    polygon.setMaterial(materialGreen);

    collection.get(0, polygon);
    expect(polygon.getMaterial(material).color).toEqual(Color.RED);
    collection.get(1, polygon);
    expect(polygon.getMaterial(material).color).toEqual(Color.GREEN);
  });

  it("byteLength", () => {
    let collection = new BufferPolygonCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      holeCountMax: 1,
      triangleCountMax: 1,
    });

    const polygonByteLength =
      BufferPolygon.Layout.__BYTE_LENGTH +
      3 * 3 * Float64Array.BYTES_PER_ELEMENT + // positions
      1 * Uint16Array.BYTES_PER_ELEMENT + // holes
      3 * Uint16Array.BYTES_PER_ELEMENT + // indices
      BufferPolygonMaterial.packedLength;

    expect(collection.byteLength).toBe(polygonByteLength);

    collection = new BufferPolygonCollection({
      primitiveCountMax: 128,
      vertexCountMax: 128 * 3,
      holeCountMax: 128,
      triangleCountMax: 128,
    });

    expect(collection.byteLength).toBe(polygonByteLength * 128);
  });

  it("clone", () => {
    const polygon = new BufferPolygon();

    const src = new BufferPolygonCollection({
      primitiveCountMax: 2,
      vertexCountMax: 6,
      holeCountMax: 0,
      triangleCountMax: 4,
    });

    const positions1 = createBoxPositions(3);
    const positions2 = createBoxPositions(2.5);
    const positions3 = new Float64Array([
      ...createBoxPositions(3),
      ...createBoxPositions(0.5),
    ]);

    const holes3 = new Uint32Array([3]);

    const triangles1 = new Uint32Array([0, 1, 2, 2, 1, 3]);
    const triangles2 = new Uint32Array([2, 1, 3, 0, 1, 2]);
    const triangles3 = new Uint32Array([0, 1, 2, 2, 1, 3]); // hack: doesn't consider the hole.

    src.add(
      { positions: positions1, triangles: triangles1, material: materialRed },
      polygon,
    );

    src.add(
      {
        positions: positions2,
        triangles: triangles2,
        material: materialGreen,
      },
      polygon,
    );

    const dst = new BufferPolygonCollection({
      primitiveCountMax: 3,
      vertexCountMax: 12,
      holeCountMax: 1,
      triangleCountMax: 6,
    });

    BufferPolygonCollection.clone(src, dst);

    expect(dst.primitiveCount).toBe(2);
    expect(dst.primitiveCountMax).toBe(3);

    dst.add(
      {
        positions: positions3,
        holes: holes3,
        triangles: triangles3,
        material: materialBlue,
      },
      polygon,
    );

    expect(dst.primitiveCount).toBe(3);
    expect(dst.holeCount).toBe(1);
    expect(dst.triangleCount).toBe(6);

    const material = new BufferPolygonMaterial();

    dst.get(0, polygon);
    expect(polygon.getMaterial(material).color).toEqual(Color.RED);
    expect(polygon.getPositions()).toEqual(positions1);
    expect(polygon.holeCount).toBe(0);
    expect(polygon.triangleCount).toBe(2);

    dst.get(1, polygon);
    expect(polygon.getMaterial(material).color).toEqual(Color.GREEN);
    expect(polygon.getPositions()).toEqual(positions2);
    expect(polygon.holeCount).toBe(0);
    expect(polygon.triangleCount).toBe(2);

    dst.get(2, polygon);
    expect(polygon.getMaterial(material).color).toEqual(Color.BLUE);
    expect(polygon.getPositions()).toEqual(positions3);
    expect(polygon.holeCount).toBe(1);
    expect(polygon.triangleCount).toBe(2);
  });

  it("sort", () => {
    const collection = new BufferPolygonCollection({
      primitiveCountMax: 3,
      vertexCountMax: 8,
    });

    const positions1 = new Float64Array([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const positions2 = new Float64Array([20, 21, 22, 23, 24, 25]);
    const positions3 = new Float64Array([30, 31, 32, 33, 34, 35, 36, 37, 38]);

    const holes2 = new Uint32Array([12, 24]);
    const holes3 = new Uint32Array([16]);

    const triangles1 = new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const triangles2 = new Uint32Array([0, 1, 2]);
    const triangles3 = new Uint32Array([6, 7, 8, 0, 1, 2, 3, 4, 5]);

    const point = new BufferPolygon();
    collection.add({ positions: positions1, triangles: triangles1 }, point);
    collection.add(
      { positions: positions2, holes: holes2, triangles: triangles2 },
      point,
    );
    collection.add(
      { positions: positions3, holes: holes3, triangles: triangles3 },
      point,
    );

    const remap = collection.sort((a, b) => a.holeCount - b.holeCount);

    expect(collection.primitiveCount).toBe(3);
    expect(collection.vertexCount).toBe(8);
    expect(remap).toEqual([0, 2, 1]);
    expect(collection.toJSON()).toEqual(
      [
        { featureId: 0, positions: Array.from(positions1), holes: [] },
        {
          featureId: 2,
          positions: Array.from(positions3),
          holes: Array.from(holes3),
        },
        {
          featureId: 1,
          positions: Array.from(positions2),
          holes: Array.from(holes2),
        },
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

    const collection = new BufferPolygonCollection({
      primitiveCountMax: 2,
      vertexCountMax: 6,
    });

    const polygon = new BufferPolygon();

    collection.add({ positions: positions.slice(0, 9) }, polygon);
    collection.add({ positions: positions.slice(9, 18) }, polygon);
    collection._updateBoundingVolume();

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

    const collection = new BufferPolygonCollection({
      primitiveCountMax: 2,
      vertexCountMax: 6,
      boundingVolume: new BoundingSphere(Cartesian3.UNIT_Y, 128),
    });

    const polygon = new BufferPolygon();

    collection.add({ positions: positions.slice(0, 9) }, polygon);
    collection.add({ positions: positions.slice(9, 18) }, polygon);

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
      new Int32Array(6 * 3),
    );

    const collection = new BufferPolygonCollection({
      positionDatatype: ComponentDatatype.INT,
      primitiveCountMax: 2,
      vertexCountMax: 6,
    });

    const polygon = new BufferPolygon();

    collection.add({ positions: positions.slice(0, 9) }, polygon);
    collection.add({ positions: positions.slice(9, 18) }, polygon);

    collection.get(0, polygon);
    expect(polygon.getPositions()).toEqual(positions.slice(0, 9));

    collection.get(1, polygon);
    expect(polygon.getPositions()).toEqual(positions.slice(9, 18));

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

    // Store positions as normalized int16 in [-32767, 32767].
    const positions = new Int16Array([
      32767,
      0,
      0, // ( 1,  0, 0) local → ( 1000,     0, 0) world
      0,
      32767,
      0, // ( 0,  1, 0) local → (    0,  1000, 0) world
      0,
      0,
      32767, // ( 0,  0, 1) local → (    0,     0, 1000) world
    ]);

    const collection = new BufferPolygonCollection({
      positionDatatype: ComponentDatatype.SHORT,
      positionNormalized: true,
      modelMatrix,
      primitiveCountMax: 1,
      vertexCountMax: 3,
    });

    expect(collection.positionNormalized).toBe(true);
    expect(collection.positionDatatype).toBe(ComponentDatatype.SHORT);

    const polygon = new BufferPolygon();
    collection.add({ positions }, polygon);

    // getPositions() returns raw buffer values unchanged.
    collection.get(0, polygon);
    expect(polygon.getPositions()).toEqual(positions);

    collection.update({ mode: SceneMode.SCENE3D, passes: {} });

    // Bounding volume is computed in local space, then transformed by modelMatrix.
    // The 3 vertices span (1,0,0), (0,1,0), (0,0,1) → bounding sphere center
    // is at (0.5, 0.5, 0.5) in local space, radius ≈ 0.866.
    // World-space: center and radius both scaled by modelMatrix (× 1000).
    expect(collection.boundingVolume.center.x).toBeCloseTo(500, 0);
    expect(collection.boundingVolume.center.y).toBeCloseTo(500, 0);
    expect(collection.boundingVolume.center.z).toBeCloseTo(500, 0);
    expect(collection.boundingVolume.radius).toBeCloseTo(866, 0);
  });
});

/**
 * @param {number} scale
 * @returns {Float64Array}
 */
function createBoxPositions(scale) {
  // prettier-ignore
  return new Float64Array([
    scale, -scale, 0,
    -scale, -scale, 0,
    -scale, scale, 0,
  ]);
}
