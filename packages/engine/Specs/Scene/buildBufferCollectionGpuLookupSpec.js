import {
  BufferPolyline,
  BufferPolylineCollection,
  ComponentDatatype,
} from "../../index.js";

import { buildPolylineCollectionGpuLookup } from "../../Source/Scene/buildBufferCollectionGpuLookup.js";

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
});
