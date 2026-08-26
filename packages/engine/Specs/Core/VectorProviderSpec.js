import {
  BoundingSphere,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
  Cartesian3,
  Cartographic,
  defined,
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
        material: defined(options?.widthInMeters)
          ? new BufferPolylineMaterial({
              widthInMeters: options.widthInMeters,
            })
          : undefined,
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

  // The tile holding lat 40 runs from 33.75 to 45, so the polyline's last
  // segment lies wholly 5% of a tile below its bottom edge.
  const outsideV = -0.05;

  // Smallest tile V a segment of a line of the given width was packed at. Only a
  // line wide enough for its clip margin to reach the tile keeps its outside segment.
  function minPackedV(width, providerOptions, materialOptions) {
    const collection = new BufferPolylineCollection({
      primitiveCountMax: 1,
      vertexCountMax: 3,
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
    });
    const positions = new Float64Array(9);
    Cartesian3.pack(Cartesian3.fromDegrees(-95.0, 40.0), positions, 0);
    Cartesian3.pack(Cartesian3.fromDegrees(-95.0, 33.1875), positions, 3);
    Cartesian3.pack(Cartesian3.fromDegrees(-90.0, 33.1875), positions, 6);
    collection.add(
      {
        positions: positions,
        material: new BufferPolylineMaterial({
          width: width,
          ...materialOptions,
        }),
      },
      new BufferPolyline(),
    );

    const provider = new VectorProvider({
      tilingScheme: tilingScheme,
      ...providerOptions,
    });
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const texels = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    ).polylineSegmentTexels;

    // Segments are packed as [ax, ay, bx, by]; fill texels are -1.
    let minV = Number.POSITIVE_INFINITY;
    for (let i = 1; i < texels.length; i += 2) {
      if (texels[i] > -0.5) {
        minV = Math.min(minV, texels[i]);
      }
    }
    return minV;
  }

  it("returns hidden vector data with no collections", function () {
    const provider = new VectorProvider({ tilingScheme });
    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ),
    ).toEqual(jasmine.objectContaining({ show: false }));
  });

  it("returns packed lookup data for a tile overlapping a polyline", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );

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
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );

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

  it("widens the clip margin so a wide line just outside a tile is kept", function () {
    expect(minPackedV(1)).toBeGreaterThan(outsideV);
    expect(minPackedV(60)).toBeCloseTo(outsideV, 3);
  });

  it("measures the clip margin in ground meters when widths are in meters", function () {
    // The tile spans about 970 km east-west, so 5% of it is roughly 48 km.
    expect(minPackedV(60, { widthInMeters: true })).toBeGreaterThan(outsideV);
    expect(minPackedV(200000, { widthInMeters: true })).toBeCloseTo(
      outsideV,
      3,
    );
  });

  it("lets a material's width unit override the provider default", function () {
    // Inverts the two cases above: 60 reaches the tile only in pixels.
    expect(
      minPackedV(60, { widthInMeters: true }, { widthInMeters: false }),
    ).toBeCloseTo(outsideV, 3);
    expect(minPackedV(60, undefined, { widthInMeters: true })).toBeGreaterThan(
      outsideV,
    );
  });

  it("reports the tile's ground size for world-space widths", function () {
    const provider = new VectorProvider({ tilingScheme, widthInMeters: true });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );

    expect(data.hasMeterWidths).toBe(true);
    expect(data.hasPixelWidths).toBe(false);
    // A geographic tile is square in degrees, so away from the equator it is
    // narrower east-west than it is tall.
    expect(data.metersPerUv.x).toBeGreaterThan(0.0);
    expect(data.metersPerUv.x).toBeLessThan(data.metersPerUv.y);
  });

  it("reports both units for a tile mixing pixel and meter widths", function () {
    const provider = new VectorProvider({ tilingScheme });
    const pixelCollection = createPolylineCollection();
    const meterCollection = createPolylineCollection({ widthInMeters: true });
    provider.markForFrame(pixelCollection, 0, pixelCollection.heightReference);
    provider.markForFrame(meterCollection, 0, meterCollection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );

    expect(data.hasPixelWidths).toBe(true);
    expect(data.hasMeterWidths).toBe(true);
  });

  it("returns hidden vector data for a tile not overlapping any polyline", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(farPoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ),
    ).toEqual(jasmine.objectContaining({ show: false }));
  });

  it("stops returning data after a collection is removed", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);
    provider.remove(collection);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ),
    ).toEqual(jasmine.objectContaining({ show: false }));
  });

  it("reports whether a collection is being draped", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    expect(provider.has(collection)).toBe(false);

    provider.markForFrame(collection, 0, collection.heightReference);
    expect(provider.has(collection)).toBe(true);

    provider.remove(collection);
    expect(provider.has(collection)).toBe(false);
  });

  it("stops reporting a collection once it is pruned", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    // Commits frame 0, in which the collection was marked.
    provider.update(1);
    expect(provider.has(collection)).toBe(true);

    // Commits frame 1, in which it was not.
    provider.update(2);
    expect(provider.has(collection)).toBe(false);
  });

  it("keeps existing tile data when no dirty regions are recorded", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    provider.makeClean();

    provider.update();
    const updated = provider.updateTileData(
      xy.x,
      xy.y,
      level,
      context,
      data,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(updated).toBe(data);
  });

  it("re-bakes overlapping tiles after a collection's content changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    provider.makeClean();

    // Move the polyline; the collection becomes dirty.
    collection
      .get(0, new BufferPolyline())
      .setPositions(polylinePositions(-95.0, 41.0));

    provider.update();
    const updated = provider.updateTileData(
      xy.x,
      xy.y,
      level,
      context,
      data,
      HeightReference.CLAMP_TO_TERRAIN,
    );
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

    provider.markForFrame(collection, 0, collection.heightReference);
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
    const collection = createPolygonCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );

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
    const collection = createPolygonCollection({ withHole: true });
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
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
    const collection = createPolygonCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(farPoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ),
    ).toEqual(jasmine.objectContaining({ show: false }));
  });

  it("packs polylines and polygons into a shared primitive index space", function () {
    const provider = new VectorProvider({ tilingScheme });
    const polylines = createPolylineCollection();
    const polygons = createPolygonCollection();
    provider.markForFrame(polylines, 0, polylines.heightReference);
    provider.markForFrame(polygons, 0, polygons.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    const data = provider.requestTileData(
      xy.x,
      xy.y,
      level,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );

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

  it("bakes a terrain-clamped collection only for terrain targets", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection({
      heightReference: HeightReference.CLAMP_TO_TERRAIN,
    });
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ).show,
    ).toBe(true);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_3D_TILE,
      ).show,
    ).toBe(false);
  });

  it("bakes a 3D Tiles-clamped collection only for model targets", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection({
      heightReference: HeightReference.CLAMP_TO_3D_TILE,
    });
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ).show,
    ).toBe(false);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_3D_TILE,
      ).show,
    ).toBe(true);
  });

  it("bakes a ground-clamped collection for both terrain and model targets", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection({
      heightReference: HeightReference.CLAMP_TO_GROUND,
    });
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ).show,
    ).toBe(true);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_3D_TILE,
      ).show,
    ).toBe(true);
  });

  it("prunes a collection once a frame passes without it being marked", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const xy = tilingScheme.positionToTileXY(lineMidpoint, level);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ).show,
    ).toBe(true);

    // Commits frame 0, in which the collection was marked.
    provider.update(1);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ).show,
    ).toBe(true);

    // Commits frame 1, in which it was not.
    provider.update(2);
    expect(
      provider.requestTileData(
        xy.x,
        xy.y,
        level,
        context,
        HeightReference.CLAMP_TO_TERRAIN,
      ).show,
    ).toBe(false);
  });

  // Rectangles around the polyline midpoint and the far point, standing in for
  // the bounding region a model bakes.
  const nearRectangle = Rectangle.fromDegrees(-105.0, 35.0, -85.0, 45.0);
  const farRectangle = Rectangle.fromDegrees(90.0, -45.0, 110.0, -35.0);

  it("keeps baked rectangle data when only a non-overlapping collection changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    const near = createPolylineCollection();
    const far = createPolylineCollection({ longitude: 100.0, latitude: -40.0 });
    provider.markForFrame(near, 0, near.heightReference);
    provider.markForFrame(far, 0, far.heightReference);

    // Bake both regions, so each collection has an extracted snapshot.
    const data = provider.requestDataForRectangle(
      nearRectangle,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    provider.requestDataForRectangle(
      farRectangle,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(data.show).toBe(true);

    far
      .get(0, new BufferPolyline())
      .setPositions(polylinePositions(100.0, -41.0));
    provider.update();

    expect(
      provider.updateDataForRectangle(
        nearRectangle,
        context,
        data,
        HeightReference.CLAMP_TO_TERRAIN,
      ),
    ).toBe(data);
  });

  it("re-bakes rectangle data when an overlapping collection changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    const near = createPolylineCollection();
    provider.markForFrame(near, 0, near.heightReference);

    const data = provider.requestDataForRectangle(
      nearRectangle,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    near
      .get(0, new BufferPolyline())
      .setPositions(polylinePositions(-95.0, 41.0));
    provider.update();

    const updated = provider.updateDataForRectangle(
      nearRectangle,
      context,
      data,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(true);
  });

  it("re-bakes rectangle data when the rectangle changes", function () {
    const provider = new VectorProvider({ tilingScheme });
    const collection = createPolylineCollection();
    provider.markForFrame(collection, 0, collection.heightReference);

    const data = provider.requestDataForRectangle(
      nearRectangle,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(data.show).toBe(true);

    const shiftedRectangle = Rectangle.fromDegrees(-106.0, 35.0, -86.0, 45.0);
    const updated = provider.updateDataForRectangle(
      shiftedRectangle,
      context,
      data,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(updated).not.toBe(data);
    expect(Rectangle.equals(updated.rectangle, shiftedRectangle)).toBe(true);
  });

  it("re-bakes rectangle data when a collection it was baked from is removed", function () {
    const provider = new VectorProvider({ tilingScheme });
    const near = createPolylineCollection();
    provider.markForFrame(near, 0, near.heightReference);

    const data = provider.requestDataForRectangle(
      nearRectangle,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    provider.remove(near);

    const updated = provider.updateDataForRectangle(
      nearRectangle,
      context,
      data,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(false);
  });

  it("re-bakes rectangle data when a collection moves into the rectangle", function () {
    const provider = new VectorProvider({ tilingScheme });
    const far = createPolylineCollection({ longitude: 100.0, latitude: -40.0 });
    provider.markForFrame(far, 0, far.heightReference);

    const data = provider.requestDataForRectangle(
      nearRectangle,
      context,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(data.show).toBe(false);

    far
      .get(0, new BufferPolyline())
      .setPositions(polylinePositions(-95.0, 40.0));

    const updated = provider.updateDataForRectangle(
      nearRectangle,
      context,
      data,
      HeightReference.CLAMP_TO_TERRAIN,
    );
    expect(updated).not.toBe(data);
    expect(updated.show).toBe(true);
  });
});
