import {
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolyline,
  BufferPolylineCollection,
  ComponentDatatype,
} from "../../index.js";

import {
  buildPolygonCollectionGpuLookup,
  buildPolylineCollectionGpuLookup,
} from "../../Source/Scene/buildBufferCollectionGpuLookup.js";

describe("Scene/buildBufferCollectionGpuLookup", function () {
  it("builds lookup data for polyline collections", function () {
    const collection = new BufferPolylineCollection({
      positionDatatype: ComponentDatatype.INT,
    });
    const polyline = new BufferPolyline();

    collection.add(
      {
        positions: new Int32Array([
          -1000, 0, -1000, -1000, 0, 1000, -1000, 1000, 1000,
        ]),
      },
      polyline,
    );

    const lookup = buildPolylineCollectionGpuLookup(collection);
    expect(lookup).toBeDefined();
    expect(lookup.kind).toBe("polylines");
    expect(lookup.segmentTextureWidth).toBeGreaterThan(0);
    expect(lookup.segmentTextureHeight).toBeGreaterThan(0);
    expect(lookup.gridCellIndices[0]).toBeGreaterThan(0);
    expect(lookup.quadPositions.length).toBe(12);
  });

  it("builds lookup data for polygon collections on arbitrary planes", function () {
    const collection = new BufferPolygonCollection({
      positionDatatype: ComponentDatatype.INT,
      primitiveCountMax: 1,
      vertexCountMax: 3,
      triangleCountMax: 1,
    });
    const polygon = new BufferPolygon();

    collection.add(
      {
        positions: new Int32Array([
          -1000, -1000, -1000, -1000, -1000, 2000, -1000, 2000, -1000,
        ]),
        triangles: new Uint16Array([0, 1, 2]),
      },
      polygon,
    );

    const lookup = buildPolygonCollectionGpuLookup(collection);
    expect(lookup).toBeDefined();
    expect(lookup.kind).toBe("polygons");
    expect(lookup.segmentTextureWidth).toBeGreaterThan(0);
    expect(lookup.segmentTextureHeight).toBeGreaterThan(0);
    expect(lookup.gridCellIndices[0]).toBe(1);
    expect(lookup.gridCellIndices[1]).toBe(1);
    expect(lookup.quadPositions.length).toBe(12);
  });
});
