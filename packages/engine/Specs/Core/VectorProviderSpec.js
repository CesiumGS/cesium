import {
  BoundingSphere,
  BufferPolygon,
  BufferPolygonCollection,
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
import createContext from "../../../../Specs/createContext.js";

describe("Core/VectorProvider", function () {
  const tilingScheme = new GeographicTilingScheme();
  const level = 4;

  let context;

  beforeAll(() => {
    context = createContext();
  });

  // A short polyline across the central United States (lon -100 to -90, lat 40).
  const lineMidpoint = Cartographic.fromDegrees(-95.0, 40.0);
  // A point on the opposite side of the globe, far from the polyline.
  const farPoint = Cartographic.fromDegrees(100.0, -40.0);

  function createPolylineCollection(options) {
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      heightReference:
        options?.heightReference ?? HeightReference.CLAMP_TO_TERRAIN,
    });
    collection.add(
      {
        positions: polylinePositions(
          options?.longitude ?? -95.0,
          options?.latitude ?? 40.0,
        ),
      },
      new BufferPolyline(),
    );
    return collection;
  }

  // Positions for a polyline centered on the given coordinate, spanning ten
  // degrees of longitude.
  function polylinePositions(longitudeDegrees, latitudeDegrees) {
    const positions = new Float64Array(9);
    Cartesian3.pack(
      Cartesian3.fromDegrees(longitudeDegrees - 5.0, latitudeDegrees),
      positions,
      0,
    );
    Cartesian3.pack(
      Cartesian3.fromDegrees(longitudeDegrees, latitudeDegrees),
      positions,
      3,
    );
    Cartesian3.pack(
      Cartesian3.fromDegrees(longitudeDegrees + 5.0, latitudeDegrees),
      positions,
      6,
    );
    return positions;
  }

  // Repositions a collection's polyline, marking the collection dirty.
  function movePolyline(collection, longitudeDegrees, latitudeDegrees) {
    collection
      .get(0, new BufferPolyline())
      .setPositions(polylinePositions(longitudeDegrees, latitudeDegrees));
  }

  // Collections register by being marked for baking each frame. Specs stay
  // within one frame, so a constant frame number keeps them from being pruned.
  function select(provider, collection) {
    provider.markForBaking(collection, 0, collection.heightReference);
    return collection;
  }

  it("returns hidden vector data with no collections", function () {
    const provider = new VectorProvider({ tilingScheme });
    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level, context)).toEqual(
      jasmine.objectContaining({ show: false }),
    );
  });

  it("returns packed lookup data for a tile overlapping a polyline", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);

    expect(data.polylineSegmentTexels).toBeInstanceOf(Float32Array);
    expect(data.polylineGridCellIndices).toBeInstanceOf(Uint32Array);
    expect(data.widths.length).toBeGreaterThan(0);
    expect(data.colors.length).toBeGreaterThan(0);

    // Grid header: [gridWidth, gridHeight, ...per-cell end offsets].
    const gridWidth = data.polylineGridCellIndices[0];
    const gridHeight = data.polylineGridCellIndices[1];
    expect(gridWidth).toBeGreaterThan(0);
    expect(gridHeight).toBeGreaterThan(0);
    expect(data.polylineGridCellIndices.length).toBe(
      gridWidth * gridHeight + 2,
    );

    // At least one real segment texel was packed (fill value is -1).
    let packedCount = 0;
    for (let i = 0; i < data.polylineSegmentTexels.length; i++) {
      if (data.polylineSegmentTexels[i] >= 0.0) {
        packedCount++;
      }
    }
    expect(packedCount).toBeGreaterThan(0);
  });

  it("clips segments to the tile UV domain plus a small margin", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);

    // Real coordinates stay within the tile expanded by the clip margin; fill
    // texels are -1, so values below -0.5 are skipped.
    const maxMargin = 0.01;
    for (let i = 0; i < data.polylineSegmentTexels.length; i++) {
      const value = data.polylineSegmentTexels[i];
      if (value > -0.5) {
        expect(value).toBeGreaterThanOrEqual(-maxMargin - CesiumMath.EPSILON6);
        expect(value).toBeLessThanOrEqual(
          1.0 + maxMargin + CesiumMath.EPSILON6,
        );
      }
    }
  });

  it("returns hidden vector data for a tile not overlapping any polyline", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(farPoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level, context)).toEqual(
      jasmine.objectContaining({ show: false }),
    );
  });

  it("stops returning data after a collection is removed", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    select(provider, collection);
    provider.remove(collection);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level, context)).toEqual(
      jasmine.objectContaining({ show: false }),
    );
  });

  it("keeps existing tile data when no dirty regions are recorded", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolylineCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);
    provider.makeClean();

    provider.update();
    const updated = provider.updateTileData(xy.x, xy.y, level, context, data);
    expect(updated).toBe(data);
  });

  it("re-bakes overlapping tiles after a collection's content changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    select(provider, collection);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);
    provider.makeClean();

    // Move the polyline; the collection becomes dirty.
    movePolyline(collection, -95.0, 41.0);

    provider.update();
    const updated = provider.updateTileData(xy.x, xy.y, level, context, data);
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(true);
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

    select(provider, collection);
    expect(provider._dirtyRectangles.length).toBe(1);

    provider.makeClean();
    expect(provider._dirtyRectangles.length).toBe(0);

    provider.remove(collection);
    expect(provider._dirtyRectangles.length).toBe(1);
  });

  // A quad around the polyline midpoint (lon -100 to -90, lat 35 to 45),
  // with a hole in its middle (lon -97 to -93, lat 38 to 42).
  function createPolygonCollection(options) {
    const collection = new BufferPolygonCollection({
      primitiveCountMax: 1,
      vertexCountMax: 8,
      holeCountMax: 1,
      triangleCountMax: 8,
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
    });
    const positions = new Float64Array(24);
    Cartesian3.pack(Cartesian3.fromDegrees(-100.0, 35.0), positions, 0);
    Cartesian3.pack(Cartesian3.fromDegrees(-90.0, 35.0), positions, 3);
    Cartesian3.pack(Cartesian3.fromDegrees(-90.0, 45.0), positions, 6);
    Cartesian3.pack(Cartesian3.fromDegrees(-100.0, 45.0), positions, 9);
    Cartesian3.pack(Cartesian3.fromDegrees(-97.0, 38.0), positions, 12);
    Cartesian3.pack(Cartesian3.fromDegrees(-93.0, 38.0), positions, 15);
    Cartesian3.pack(Cartesian3.fromDegrees(-93.0, 42.0), positions, 18);
    Cartesian3.pack(Cartesian3.fromDegrees(-97.0, 42.0), positions, 21);
    const holes = options?.withHole ? new Uint32Array([4]) : undefined;
    const vertexCount = options?.withHole ? 8 : 4;
    collection.add(
      {
        positions: positions.subarray(0, vertexCount * 3),
        holes: holes,
      },
      new BufferPolygon(),
    );
    return collection;
  }

  it("returns packed polygon lookup data for a tile overlapping a polygon", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolygonCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);

    expect(data.show).toBe(true);
    expect(data.polygonEdgeTexels).toBeInstanceOf(Float32Array);
    expect(data.polygonGridCellIndices).toBeInstanceOf(Uint32Array);
    expect(data.colors.length).toBeGreaterThan(0);

    // Grid header: [gridWidth, gridHeight, ...per-cell end offsets].
    const gridWidth = data.polygonGridCellIndices[0];
    const gridHeight = data.polygonGridCellIndices[1];
    expect(gridWidth).toBeGreaterThan(0);
    expect(gridHeight).toBeGreaterThan(0);
    expect(data.polygonGridCellIndices.length).toBe(gridWidth * gridHeight + 2);

    // At least one real edge texel was packed (fill value is -1).
    let packedCount = 0;
    for (let i = 0; i < data.polygonEdgeTexels.length; i++) {
      if (data.polygonEdgeTexels[i] >= 0.0) {
        packedCount++;
      }
    }
    expect(packedCount).toBeGreaterThan(0);

    // No polyline data was packed.
    expect(data.polylineSegmentTexture).toBeUndefined();

    // Every cell's edges must balance to even parity along any horizontal
    // line: count crossings for a probe through the cell center.
    const cellCount = gridWidth * gridHeight;
    for (let cell = 0; cell < cellCount; cell++) {
      const start = cell === 0 ? 0 : data.polygonGridCellIndices[cell + 1];
      const end = data.polygonGridCellIndices[cell + 2];
      const cellY = Math.floor(cell / gridWidth);
      const probeY = (cellY + 0.5) / gridHeight;
      let crossings = 0;
      for (let e = start; e < end; e++) {
        const ay = data.polygonEdgeTexels[e * 4 + 1];
        const by = data.polygonEdgeTexels[e * 4 + 3];
        if (ay > probeY !== by > probeY) {
          crossings++;
        }
      }
      expect(crossings % 2).toBe(0);
    }
  });

  // Even-odd ray cast against the packed edges of the cell containing
  // (uvX, uvY): returns the number of +x crossings.
  function countRayCrossings(data, uvX, uvY) {
    const gridWidth = data.polygonGridCellIndices[0];
    const gridHeight = data.polygonGridCellIndices[1];
    const cellX = Math.min(Math.floor(uvX * gridWidth), gridWidth - 1);
    const cellY = Math.min(Math.floor(uvY * gridHeight), gridHeight - 1);
    const cell = cellX + cellY * gridWidth;
    const start = cell === 0 ? 0 : data.polygonGridCellIndices[cell + 1];
    const end = data.polygonGridCellIndices[cell + 2];

    let crossings = 0;
    for (let e = start; e < end; e++) {
      const ax = data.polygonEdgeTexels[e * 4];
      const ay = data.polygonEdgeTexels[e * 4 + 1];
      const bx = data.polygonEdgeTexels[e * 4 + 2];
      const by = data.polygonEdgeTexels[e * 4 + 3];
      if (ay > uvY !== by > uvY) {
        const t = (uvY - ay) / (by - ay);
        if (uvX < ax + t * (bx - ax)) {
          crossings++;
        }
      }
    }
    return crossings;
  }

  it("packs hole rings so interior fragments resolve to even parity", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolygonCollection({ withHole: true }));

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);
    expect(data.show).toBe(true);

    const tileRectangle = tilingScheme.tileXYToRectangle(xy.x, xy.y, level);
    function toUv(lonDegrees, latDegrees) {
      return {
        x:
          (CesiumMath.toRadians(lonDegrees) - tileRectangle.west) /
          (tileRectangle.east - tileRectangle.west),
        y:
          (CesiumMath.toRadians(latDegrees) - tileRectangle.south) /
          (tileRectangle.north - tileRectangle.south),
      };
    }

    // (-95, 40) lies inside the hole: even parity, outside the fill.
    const holePoint = toUv(-95.0, 40.0);
    expect(countRayCrossings(data, holePoint.x, holePoint.y) % 2).toBe(0);

    // (-98.5, 40) lies between the hole and the outer ring: odd parity.
    const fillPoint = toUv(-98.5, 40.0);
    expect(countRayCrossings(data, fillPoint.x, fillPoint.y) % 2).toBe(1);
  });

  it("returns hidden vector data for a tile not overlapping any polygon", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolygonCollection());

    const xy = tilingScheme.positionToTileXY(farPoint, level);
    expect(provider.requestTileData(xy.x, xy.y, level, context)).toEqual(
      jasmine.objectContaining({ show: false }),
    );
  });

  it("packs polylines and polygons into a shared primitive index space", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolylineCollection());
    select(provider, createPolygonCollection());

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(xy.x, xy.y, level, context);

    expect(data.show).toBe(true);
    expect(data.polylineSegmentTexels).toBeInstanceOf(Float32Array);
    expect(data.polygonEdgeTexels).toBeInstanceOf(Float32Array);

    // One polyline primitive + one polygon primitive share the space.
    expect(data.primitiveCount).toBe(2);

    // Polygon edges reference a primitive index beyond the polyline's.
    let maxPolygonPrimitive = -1;
    for (let i = 0; i < data.polygonEdgePrimitiveIndicesTexels.length; i++) {
      maxPolygonPrimitive = Math.max(
        maxPolygonPrimitive,
        data.polygonEdgePrimitiveIndicesTexels[i],
      );
    }
    expect(maxPolygonPrimitive).toBe(1);
  });

  function requestShowForTarget(provider, targetHeightReference) {
    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    return provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      targetHeightReference,
    ).show;
  }

  it("bakes a terrain-clamped collection only for terrain targets", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(
      provider,
      createPolylineCollection({
        heightReference: HeightReference.CLAMP_TO_TERRAIN,
      }),
    );

    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_TERRAIN),
    ).toBe(true);
    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_3D_TILE),
    ).toBe(false);
  });

  it("bakes a 3D Tiles-clamped collection only for model targets", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(
      provider,
      createPolylineCollection({
        heightReference: HeightReference.CLAMP_TO_3D_TILE,
      }),
    );

    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_TERRAIN),
    ).toBe(false);
    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_3D_TILE),
    ).toBe(true);
  });

  it("bakes a ground-clamped collection for both terrain and model targets", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(
      provider,
      createPolylineCollection({
        heightReference: HeightReference.CLAMP_TO_GROUND,
      }),
    );

    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_TERRAIN),
    ).toBe(true);
    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_3D_TILE),
    ).toBe(true);
  });

  it("prunes a collection once a frame passes without it being marked", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForBaking(collection, 0, collection.heightReference);

    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_TERRAIN),
    ).toBe(true);

    // Commits frame 0, in which the collection was marked.
    provider.update(1);
    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_TERRAIN),
    ).toBe(true);

    // Commits frame 1, in which it was not.
    provider.update(2);
    expect(
      requestShowForTarget(provider, HeightReference.CLAMP_TO_TERRAIN),
    ).toBe(false);
  });

  // Rectangles around the polyline midpoint and the far point, standing in for
  // the bounding region a model bakes.
  const nearRectangle = Rectangle.fromDegrees(-105.0, 35.0, -85.0, 45.0);
  const farRectangle = Rectangle.fromDegrees(90.0, -45.0, 110.0, -35.0);

  it("keeps baked rectangle data when only a non-overlapping collection changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    select(provider, createPolylineCollection());
    const far = select(
      provider,
      createPolylineCollection({ longitude: 100.0, latitude: -40.0 }),
    );

    // Bake both regions, so each collection has an extracted snapshot.
    const data = provider.requestDataForRectangle(nearRectangle, context);
    provider.requestDataForRectangle(farRectangle, context);
    expect(data.show).toBe(true);

    movePolyline(far, 100.0, -41.0);
    provider.update();

    expect(provider.updateDataForRectangle(nearRectangle, context, data)).toBe(
      data,
    );
  });

  it("re-bakes rectangle data when an overlapping collection changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    const near = select(provider, createPolylineCollection());

    const data = provider.requestDataForRectangle(nearRectangle, context);
    movePolyline(near, -95.0, 41.0);
    provider.update();

    const updated = provider.updateDataForRectangle(
      nearRectangle,
      context,
      data,
    );
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(true);
  });

  it("re-bakes rectangle data when a collection it was baked from is removed", function () {
    const provider = new VectorProvider({ tilingScheme });
    const near = select(provider, createPolylineCollection());

    const data = provider.requestDataForRectangle(nearRectangle, context);
    provider.remove(near);

    const updated = provider.updateDataForRectangle(
      nearRectangle,
      context,
      data,
    );
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(false);
  });

  it("re-bakes rectangle data when a collection moves into the rectangle", function () {
    const provider = new VectorProvider({ tilingScheme });
    const far = select(
      provider,
      createPolylineCollection({ longitude: 100.0, latitude: -40.0 }),
    );

    const data = provider.requestDataForRectangle(nearRectangle, context);
    expect(data.show).toBe(false);

    movePolyline(far, -95.0, 40.0);

    const updated = provider.updateDataForRectangle(
      nearRectangle,
      context,
      data,
    );
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(true);
  });
});
