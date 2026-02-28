import { Color, BufferPolygon, BufferPolygonCollection } from "../../index.js";

describe("BufferPolygonCollection", () => {
  const color = new Color();

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

  it("color", () => {
    const collection = new BufferPolygonCollection();
    const polygon = new BufferPolygon();

    collection.add({ color: Color.RED }, polygon);
    collection.add({ color: Color.GREEN }, polygon);
    collection.add({ color: Color.BLUE }, polygon);

    collection.get(0, polygon);
    expect(polygon.getColor(color)).toEqual(Color.RED);
    collection.get(1, polygon);
    expect(polygon.getColor(color)).toEqual(Color.GREEN);
    collection.get(2, polygon);
    expect(polygon.getColor(color)).toEqual(Color.BLUE);
  });

  it("byteLength", () => {
    let collection = new BufferPolygonCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      holeCountMax: 0,
      triangleCountMax: 1,
    });

    expect(collection.byteLength).toBe(36 + 72 + 12);

    collection = new BufferPolygonCollection({
      primitiveCountMax: 128,
      vertexCountMax: 1024,
      holeCountMax: 128,
      triangleCountMax: 1024,
    });

    expect(collection.byteLength).toBe(4608 + 24576 + 512 + 12288);
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
      { positions: positions1, triangles: triangles1, color: Color.RED },
      polygon,
    );

    src.add(
      {
        positions: positions2,
        triangles: triangles2,
        color: Color.GREEN,
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
        color: Color.BLUE,
      },
      polygon,
    );

    expect(dst.primitiveCount).toBe(3);
    expect(dst.holeCount).toBe(1);
    expect(dst.triangleCount).toBe(6);

    dst.get(0, polygon);
    expect(polygon.getColor(color)).toEqual(Color.RED);
    expect(polygon.getPositions()).toEqual(positions1);
    expect(polygon.holeCount).toBe(0);
    expect(polygon.triangleCount).toBe(2);

    dst.get(1, polygon);
    expect(polygon.getColor(color)).toEqual(Color.GREEN);
    expect(polygon.getPositions()).toEqual(positions2);
    expect(polygon.holeCount).toBe(0);
    expect(polygon.triangleCount).toBe(2);

    dst.get(2, polygon);
    expect(polygon.getColor(color)).toEqual(Color.BLUE);
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
