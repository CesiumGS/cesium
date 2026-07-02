import {
  BoundingSphere,
  BufferPolyline,
  BufferPolylineCollection,
  Cartesian3,
  Cartographic,
  GeographicTilingScheme,
  HeightReference,
  Math as CesiumMath,
  Rectangle,
  VectorProvider,
} from "../../index.js";

describe("Core/VectorProvider", function () {
  const tilingScheme = new GeographicTilingScheme();
  const level = 4;

  // A short polyline across the central United States (lon -100 to -90, lat 40).
  const lineMidpoint = Cartographic.fromDegrees(-95.0, 40.0);
  // A point on the opposite side of the globe, far from the polyline.
  const farPoint = Cartographic.fromDegrees(100.0, -40.0);

  function createPolylineCollection() {
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
    });
    const positions = new Float64Array(9);
    Cartesian3.pack(Cartesian3.fromDegrees(-100.0, 40.0), positions, 0);
    Cartesian3.pack(Cartesian3.fromDegrees(-95.0, 40.0), positions, 3);
    Cartesian3.pack(Cartesian3.fromDegrees(-90.0, 40.0), positions, 6);
    collection.add({ positions: positions }, new BufferPolyline());
    return collection;
  }

  it("returns undefined with no collections", function () {
    const provider = new VectorProvider({ tilingScheme });
    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level)).toBeUndefined();
  });

  it("returns packed lookup data for a tile overlapping a polyline", function () {
    const provider = new VectorProvider({ tilingScheme });
    provider.add(createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level);

    expect(data.segmentTexels).toBeInstanceOf(Float32Array);
    expect(data.gridCellIndices).toBeInstanceOf(Uint32Array);
    expect(data.widths.length).toBeGreaterThan(0);
    expect(data.colors.length).toBeGreaterThan(0);

    // Grid header: [gridWidth, gridHeight, ...per-cell end offsets].
    const gridWidth = data.gridCellIndices[0];
    const gridHeight = data.gridCellIndices[1];
    expect(gridWidth).toBeGreaterThan(0);
    expect(gridHeight).toBeGreaterThan(0);
    expect(data.gridCellIndices.length).toBe(gridWidth * gridHeight + 2);

    // At least one real segment texel was packed (fill value is -1).
    let packedCount = 0;
    for (let i = 0; i < data.segmentTexels.length; i++) {
      if (data.segmentTexels[i] >= 0.0) {
        packedCount++;
      }
    }
    expect(packedCount).toBeGreaterThan(0);
  });

  it("clips segments to the tile UV domain plus a small margin", function () {
    const provider = new VectorProvider({ tilingScheme });
    provider.add(createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level);

    // Real coordinates stay within the tile expanded by the clip margin; fill
    // texels are -1, so values below -0.5 are skipped.
    const maxMargin = 0.01;
    for (let i = 0; i < data.segmentTexels.length; i++) {
      const value = data.segmentTexels[i];
      if (value > -0.5) {
        expect(value).toBeGreaterThanOrEqual(-maxMargin - CesiumMath.EPSILON6);
        expect(value).toBeLessThanOrEqual(
          1.0 + maxMargin + CesiumMath.EPSILON6,
        );
      }
    }
  });

  it("returns undefined for a tile not overlapping any polyline", function () {
    const provider = new VectorProvider({ tilingScheme });
    provider.add(createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(farPoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level)).toBeUndefined();
  });

  it("stops returning data after a collection is removed", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.add(collection);
    provider.remove(collection);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level)).toBeUndefined();
  });

  it("raises the changed event when a collection is added or removed", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    const listener = jasmine.createSpy("changed");
    provider.changed.addEventListener(listener);

    provider.add(collection);
    expect(listener).toHaveBeenCalledTimes(1);

    // Adding the same collection again is a no-op and must not raise.
    provider.add(collection);
    expect(listener).toHaveBeenCalledTimes(1);

    provider.remove(collection);
    expect(listener).toHaveBeenCalledTimes(2);

    // Removing an unregistered collection is a no-op and must not raise.
    provider.remove(collection);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("records no dirty rectangle for a collection whose bounds are not yet computed", function () {
    const provider = new VectorProvider({ tilingScheme });
    // Without an explicit bounding volume, a collection's volume has zero radius
    // until first rendered, so it contributes no region.
    const collection = createPolylineCollection();

    provider.add(collection);
    expect(provider._dirtyRectangles.length).toBe(0);
  });

  it("records and clears a dirty rectangle for a collection with a local region", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
      boundingVolume: new BoundingSphere(
        Cartesian3.fromDegrees(-95.0, 40.0),
        100000.0,
      ),
    });

    provider.add(collection);
    expect(provider._dirtyRectangles.length).toBe(1);

    provider.makeClean();
    expect(provider._dirtyRectangles.length).toBe(0);

    provider.remove(collection);
    expect(provider._dirtyRectangles.length).toBe(1);
  });

  it("splits an antimeridian-crossing region into two dirty rectangles", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
      boundingVolume: new BoundingSphere(
        Cartesian3.fromDegrees(180.0, 0.0),
        100000.0,
      ),
    });

    provider.add(collection);
    const rectangles = provider._dirtyRectangles;
    expect(rectangles.length).toBe(2);
    // Each half is a valid (east >= west) rectangle abutting the seam.
    expect(rectangles[0].east).toBeGreaterThanOrEqual(rectangles[0].west);
    expect(rectangles[1].east).toBeGreaterThanOrEqual(rectangles[1].west);
    expect(rectangles[0].east).toEqualEpsilon(
      CesiumMath.PI,
      CesiumMath.EPSILON9,
    );
    expect(rectangles[1].west).toEqualEpsilon(
      -CesiumMath.PI,
      CesiumMath.EPSILON9,
    );
  });

  it("represents a near-global region as a single full-extent rectangle", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
      boundingVolume: new BoundingSphere(
        Cartesian3.fromDegrees(0.0, 0.0),
        10000000.0,
      ),
    });

    provider.add(collection);
    const rectangles = provider._dirtyRectangles;
    expect(rectangles.length).toBe(1);
    expect(rectangles[0].west).toEqualEpsilon(
      Rectangle.MAX_VALUE.west,
      CesiumMath.EPSILON9,
    );
    expect(rectangles[0].east).toEqualEpsilon(
      Rectangle.MAX_VALUE.east,
      CesiumMath.EPSILON9,
    );
  });
});
