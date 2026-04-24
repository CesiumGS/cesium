import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Math as CesiumMath,
  ContextLimits,
  ClippingPolygon,
  ClippingPolygonCollection,
  Intersect,
  OrientedBoundingBox,
  Rectangle,
  TileBoundingRegion,
  TileBoundingSphere,
  TileOrientedBoundingBox,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe("Scene/ClippingPolygonCollection", function () {
  const positions = Cartesian3.fromRadiansArray([
    -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
    -1.3193955980204217, 0.6988091578771254, -1.3193931220959367,
    0.698743632490865, -1.3194358224045408, 0.6987471965556998,
  ]);
  const positionsB = Cartesian3.fromRadiansArray([
    -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
    -1.3193931220959367, 0.698743632490865,
  ]);
  const positionsC = Cartesian3.fromRadiansArray([
    -1.3194369277314022 + 2,
    0.6988062530900625,
    -1.31941 + 2,
    0.69879,
    -1.3193931220959367 + 2,
    0.698743632490865,
  ]);

  it("default constructor", function () {
    const polygons = new ClippingPolygonCollection();
    expect(polygons.length).toEqual(0);
    expect(polygons.enabled).toBeTrue();
    expect(polygons.inverse).toBeFalse();
    expect(polygons.totalPositions).toBe(0);
  });

  it("gets the length of the list of polygons", function () {
    const polygons = new ClippingPolygonCollection();
    expect(polygons.length).toBe(0);

    const polygon = polygons.add(new ClippingPolygon({ positions }));
    polygons.add(new ClippingPolygon({ positions }));

    expect(polygons.length).toBe(2);

    polygons.remove(polygon);

    expect(polygons.length).toBe(1);
  });

  it("add adds a polygon to the collection", function () {
    const polygons = new ClippingPolygonCollection();
    polygons.add(new ClippingPolygon({ positions }));

    expect(polygons.length).toBe(1);
  });

  it("fires the polygonAdded event when a polygon is added", function () {
    const polygons = new ClippingPolygonCollection();
    const spy = jasmine.createSpy();
    polygons.polygonAdded.addEventListener(spy);

    let polygon = polygons.add(new ClippingPolygon({ positions }));
    expect(spy).toHaveBeenCalledWith(polygon, 0);

    polygon = polygons.add(new ClippingPolygon({ positions: positionsB }));
    expect(spy).toHaveBeenCalledWith(polygon, 1);
  });

  it("gets the polygon at an index", function () {
    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    let polygon = polygons.get(0);
    expect(polygon).toBe(polygonA);

    polygon = polygons.get(1);
    expect(polygon).toBe(polygonB);
  });

  it("contain checks if the collection contains a polygon", function () {
    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA],
    });

    expect(polygons.contains(polygonA)).toBeTrue();
    expect(polygons.contains(polygonB)).toBeFalse();
  });

  it("remove removes the first occurrence of a polygon", function () {
    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    let result = polygons.remove(polygonA);

    expect(polygons.contains(polygonA)).toBeFalse();
    expect(polygons.length).toBe(1);
    expect(polygons.get(0)).toEqual(polygonB);
    expect(result).toBeTrue();

    result = polygons.remove(polygonA);
    expect(result).toBeFalse();
  });

  it("remove fires polygonRemoved event", function () {
    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });

    const spy = jasmine.createSpy();
    polygons.polygonRemoved.addEventListener(spy);

    polygons.remove(polygon);
    expect(spy).toHaveBeenCalledWith(polygon, 0);
  });

  it("removeAll removes all of the polygons in the collection", function () {
    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    expect(polygons.length).toEqual(2);

    polygons.removeAll();

    expect(polygons.length).toBe(0);
  });

  it("removeAll fires polygonRemoved event", function () {
    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    const spy = jasmine.createSpy();
    polygons.polygonRemoved.addEventListener(spy);

    polygons.removeAll();

    expect(spy).toHaveBeenCalledWith(polygonA, 0);
    expect(spy).toHaveBeenCalledWith(polygonB, 1);
  });

  it("throws on update if float textures aren't supported", function () {
    spyOn(ClippingPolygonCollection, "isSupported").and.returnValue(false);

    const polygons = new ClippingPolygonCollection();

    const scene = createScene();
    scene.context._textureFloat = false;

    expect(() => {
      polygons.update(scene.frameState);
    }).toThrowError(
      "ClippingPolygonCollections are only supported for WebGL 2.",
    );

    scene.destroyForSpecs();
  });

  it("only creates textures and compute commands when polygons are added", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygons = new ClippingPolygonCollection();

    polygons.update(scene.frameState);

    expect(polygons.extentsTexture).toBeUndefined();
    expect(polygons.clippingTexture).toBeUndefined();
    expect(polygons._polygonsTexture).toBeUndefined();
    expect(polygons._signedDistanceComputeCommand).toBeUndefined();

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("creates textures and compute commands when polygons are added", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });

    polygons.update(scene.frameState);

    expect(polygons.extentsTexture).toBeDefined();
    expect(polygons.extentsTexture.width).toBeGreaterThan(0);
    expect(polygons.extentsTexture.height).toBeGreaterThan(0);

    expect(polygons.clippingTexture).toBeDefined();
    expect(polygons.clippingTexture.width).toBeGreaterThan(0);
    expect(polygons.clippingTexture.height).toBeGreaterThan(0);

    expect(polygons._polygonsTexture).toBeDefined();
    expect(polygons._polygonsTexture.width).toBeGreaterThan(0);
    expect(polygons._polygonsTexture.height).toBeGreaterThan(0);

    expect(polygons._signedDistanceComputeCommand).toBeDefined();

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("fills texture with packed polygon positions", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    const args = spy.calls.argsFor(spy.calls.count() - 2);
    const arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[0]).toBe(5); // number of positions
    expect(arrayBufferView[1]).toBe(0); // extents index
    // individual polygon extent
    expect(arrayBufferView[2]).toEqualEpsilon(
      0.6968641167123716,
      CesiumMath.EPSILON5,
    ); // south
    expect(arrayBufferView[3]).toEqualEpsilon(
      -1.3191630776640944,
      CesiumMath.EPSILON5,
    ); // west
    expect(arrayBufferView[4]).toEqualEpsilon(
      1.0 / 15167.51388028464,
      CesiumMath.EPSILON5,
    ); // north - south
    expect(arrayBufferView[5]).toEqualEpsilon(
      1.0 / 23143.30924645657,
      CesiumMath.EPSILON5,
    ); // east - west
    expect(arrayBufferView[6]).toEqualEpsilon(
      0.6969271302223206,
      CesiumMath.EPSILON10,
    ); // first position in spherical coordinates
    expect(arrayBufferView[7]).toEqualEpsilon(
      -1.3191630840301514,
      CesiumMath.EPSILON10,
    );
    expect(arrayBufferView[14]).toEqualEpsilon(
      0.6968677043914795,
      CesiumMath.EPSILON10,
    ); // last position in spherical coordinates
    expect(arrayBufferView[15]).toEqualEpsilon(
      -1.3191620111465454,
      CesiumMath.EPSILON10,
    );
    expect(arrayBufferView[16]).toBe(0); // padding

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("fills texture with packed extents", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    const args = spy.calls.argsFor(spy.calls.count() - 3); // extents are packed after polygon positions
    const arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[0]).toEqualEpsilon(
      0.6966992616653442,
      CesiumMath.EPSILON10,
    ); // south
    expect(arrayBufferView[1]).toEqualEpsilon(
      -1.3192710876464844,
      CesiumMath.EPSILON10,
    ); // west
    expect(arrayBufferView[2]).toEqualEpsilon(
      2527.9189453125,
      CesiumMath.EPSILON10,
    ); // 1 / (north - south)
    expect(arrayBufferView[3]).toEqualEpsilon(
      3857.21826171875,
      CesiumMath.EPSILON10,
    ); // 1 / (east - west)
    expect(arrayBufferView[4]).toBe(0); // padding
    expect(arrayBufferView[5]).toBe(0); // padding
    expect(arrayBufferView[6]).toBe(0); // padding
    expect(arrayBufferView[7]).toBe(0); // padding

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("Combines overlapping extents", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    let args = spy.calls.argsFor(spy.calls.count() - 2);
    let arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[1]).toBe(0); // polygonA extents index
    expect(arrayBufferView[17]).toBe(0); // polygonB extents index

    args = spy.calls.argsFor(spy.calls.count() - 3); // extents are packed after polygon positions
    arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[0]).toEqualEpsilon(
      0.6966992616653442,
      CesiumMath.EPSILON10,
    ); // south
    expect(arrayBufferView[1]).toEqualEpsilon(
      -1.3192710876464844,
      CesiumMath.EPSILON10,
    ); // west
    expect(arrayBufferView[2]).toEqualEpsilon(
      2527.9189453125,
      CesiumMath.EPSILON10,
    ); // 1 / (north - south)
    expect(arrayBufferView[3]).toEqualEpsilon(
      3857.21826171875,
      CesiumMath.EPSILON10,
    ); // 1 / (east - west)
    expect(arrayBufferView[4]).toBe(0); // padding
    expect(arrayBufferView[5]).toBe(0); // padding
    expect(arrayBufferView[6]).toBe(0); // padding
    expect(arrayBufferView[7]).toBe(0); // padding

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("Combines identical extents", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    const args = spy.calls.argsFor(spy.calls.count() - 2);
    const arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[1]).toBe(0); // polygonA extents index
    expect(arrayBufferView[17]).toBe(0); // polygonB extents index
  });

  it("Split distant polygons in separate extents", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsC });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    const args = spy.calls.argsFor(spy.calls.count() - 2);
    const arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[1]).toBe(0); // polygonA extents index
    expect(arrayBufferView[17]).toBe(1); // polygonB extents index
  });

  it("Combines transitively overlapping extents into a single group", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    // Three polygons spaced so A↔B and B↔C overlap after 250% padding,
    // but A↔C do not overlap directly. Added in order A, C, B so that
    // polygon B must bridge A and C transitively during the merge pass.
    const posA = Cartesian3.fromRadiansArray([
      -1.0, 0.5, -0.99, 0.5, -0.99, 0.51, -1.0, 0.51,
    ]);
    const posB = Cartesian3.fromRadiansArray([
      -0.97, 0.5, -0.96, 0.5, -0.96, 0.51, -0.97, 0.51,
    ]);
    const posC = Cartesian3.fromRadiansArray([
      -0.935, 0.5, -0.925, 0.5, -0.925, 0.51, -0.935, 0.51,
    ]);

    // Sanity check: A and C alone should be in separate groups
    const separatePolygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions: posA }),
        new ClippingPolygon({ positions: posC }),
      ],
    });
    separatePolygons.update(scene.frameState);
    expect(separatePolygons.extentsCount).toBe(2);
    separatePolygons.destroy();

    // Sanity check: A and B alone should be in same group
    const overlapPolygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions: posA }),
        new ClippingPolygon({ positions: posB }),
      ],
    });
    overlapPolygons.update(scene.frameState);
    expect(overlapPolygons.extentsCount).toBe(1);
    overlapPolygons.destroy();

    // With B bridging A and C, all three should merge into one group
    const polygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions: posA }),
        new ClippingPolygon({ positions: posC }),
        new ClippingPolygon({ positions: posB }),
      ],
    });
    polygons.update(scene.frameState);
    expect(polygons.extentsCount).toBe(1);

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("Pack polygons order by extents index", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });
    const polygonC = new ClippingPolygon({ positions: positionsC });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonC, polygonB],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    const args = spy.calls.argsFor(spy.calls.count() - 2);
    const arrayBufferView = args[8];

    // A, C, B -> A, B, C
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[0]).toBe(positions.length); // polygonA vertex count
    expect(arrayBufferView[1]).toBe(0); // polygonA extents index
    expect(arrayBufferView[16]).toBe(positionsB.length); // polygonB vertex count
    expect(arrayBufferView[17]).toBe(0); // polygonB extents index
    expect(arrayBufferView[28]).toBe(positionsC.length); // polygonC vertex count
    expect(arrayBufferView[29]).toBe(1); // polygonC extents index
  });

  it("does not perform texture updates if the polygons are unchanged", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });

    const gl = scene.frameState.context._gl;
    const spy = spyOn(gl, "texImage2D").and.callThrough();

    polygons.update(scene.frameState);

    const currentCount = spy.calls.count();

    polygons.update(scene.frameState);
    expect(spy.calls.count()).toEqual(currentCount);

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("provides a function for attaching the ClippingPolygonCollection to objects", function () {
    const polygon = new ClippingPolygon({ positions });
    const clippedObject1 = {
      polygons: undefined,
    };
    const clippedObject2 = {
      polygons: undefined,
    };

    const polygons1 = new ClippingPolygonCollection({
      polygons: [polygon],
      enabled: false,
    });

    ClippingPolygonCollection.setOwner(polygons1, clippedObject1, "polygons");
    expect(clippedObject1.polygons).toBe(polygons1);
    expect(polygons1._owner).toBe(clippedObject1);

    const polygons2 = new ClippingPolygonCollection({
      polygons: [polygon],
      enabled: false,
    });

    // Expect detached clipping polygons to be destroyed
    ClippingPolygonCollection.setOwner(polygons2, clippedObject1, "polygons");
    expect(polygons1.isDestroyed()).toBe(true);

    // Expect setting the same ClippingPolygonCollection again to not destroy the ClippingPolygonCollection
    ClippingPolygonCollection.setOwner(polygons2, clippedObject1, "polygons");
    expect(polygons2.isDestroyed()).toBe(false);

    // Expect failure when attaching one ClippingPolygonCollection to two objects
    expect(function () {
      ClippingPolygonCollection.setOwner(polygons2, clippedObject2, "polygons");
    }).toThrowDeveloperError();
  });

  it("getClippingDistanceTextureResolution works before textures are created", function () {
    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });
    const scene = createScene();
    // Set this to the minimum possible value so texture sizes can be consistently tested
    ContextLimits._maximumTextureSize = 64;

    const result =
      ClippingPolygonCollection.getClippingDistanceTextureResolution(
        polygons,
        new Cartesian2(),
      );
    expect(result.x).toBe(64);
    expect(result.y).toBe(64);

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("getClippingExtentsTextureResolution works before textures are created", function () {
    const polygon = new ClippingPolygon({ positions });
    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
    });
    const scene = createScene();
    // Set this to the minimum possible value so texture sizes can be consistently tested
    ContextLimits._maximumTextureSize = 64;

    const result =
      ClippingPolygonCollection.getClippingExtentsTextureResolution(
        polygons,
        new Cartesian2(),
      );
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);

    polygons.destroy();
    scene.destroyForSpecs();
  });

  it("computes intersections with bounding volumes", function () {
    const polygons = new ClippingPolygonCollection();
    let boundingVolume = new TileBoundingRegion({
      rectangle: Rectangle.fromCartesianArray(positions),
    });

    let intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.OUTSIDE);

    polygons.add(new ClippingPolygon({ positions }));
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const boundingSphere = BoundingSphere.fromPoints(positions);
    boundingVolume = new TileBoundingSphere(
      boundingSphere.center,
      boundingSphere.radius,
    );
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const box = OrientedBoundingBox.fromPoints(positions);
    boundingVolume = new TileOrientedBoundingBox(box.center, box.halfAxes);
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);
  });

  it("computes intersections with bounding volumes when inverse is true", function () {
    const polygons = new ClippingPolygonCollection({
      inverse: true,
    });
    let boundingVolume = new TileBoundingRegion({
      rectangle: Rectangle.fromCartesianArray(positions),
    });

    let intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INSIDE);

    polygons.add(new ClippingPolygon({ positions }));
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const boundingSphere = BoundingSphere.fromPoints(positions);
    boundingVolume = new TileBoundingSphere(
      boundingSphere.center,
      boundingSphere.radius,
    );
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const box = OrientedBoundingBox.fromPoints(positions);
    boundingVolume = new TileOrientedBoundingBox(box.center, box.halfAxes);
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);
  });

  it("returns OUTSIDE when no polygons intersect the bounding volume", function () {
    // Create positions far away from the original polygons
    const farPositions = Cartesian3.fromRadiansArray([
      -1.0, 0.5, -1.001, 0.5, -1.001, 0.501,
    ]);

    const polygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions }),
        new ClippingPolygon({ positions: positionsB }),
      ],
    });

    const boundingVolume = new TileBoundingRegion({
      rectangle: Rectangle.fromCartesianArray(farPositions),
    });

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.OUTSIDE);
  });

  it("returns INSIDE when inverse is true and no polygons intersect the bounding volume", function () {
    const farPositions = Cartesian3.fromRadiansArray([
      -1.0, 0.5, -1.001, 0.5, -1.001, 0.501,
    ]);

    const polygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions }),
        new ClippingPolygon({ positions: positionsB }),
      ],
      inverse: true,
    });

    const boundingVolume = new TileBoundingRegion({
      rectangle: Rectangle.fromCartesianArray(farPositions),
    });

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INSIDE);
  });

  it("returns INTERSECTING immediately when the first polygon intersects", function () {
    const polygonA = new ClippingPolygon({ positions });
    const polygonB = new ClippingPolygon({ positions: positionsB });

    const polygons = new ClippingPolygonCollection({
      polygons: [polygonA, polygonB],
    });

    const boundingVolume = new TileBoundingRegion({
      rectangle: Rectangle.fromCartesianArray(positions),
    });

    // Spy on computeRectangle to verify early return behavior
    const spyB = spyOn(polygonB, "computeRectangle").and.callThrough();

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    // Because the first polygon intersects, the second polygon's
    // computeRectangle should never be called (early return optimization)
    expect(spyB).not.toHaveBeenCalled();
  });

  it("returns INTERSECTING when only a later polygon intersects", function () {
    // Create a polygon far away that won't intersect
    const farPositions = Cartesian3.fromRadiansArray([
      -1.0, 0.5, -1.001, 0.5, -1.001, 0.501,
    ]);
    const nonIntersectingPolygon = new ClippingPolygon({
      positions: farPositions,
    });
    const intersectingPolygon = new ClippingPolygon({ positions });

    const polygons = new ClippingPolygonCollection({
      polygons: [nonIntersectingPolygon, intersectingPolygon],
    });

    const boundingVolume = new TileBoundingRegion({
      rectangle: Rectangle.fromCartesianArray(positions),
    });

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);
  });

  it("computes tile bounding rectangle once for multiple polygons using TileBoundingSphere", function () {
    const polygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions }),
        new ClippingPolygon({ positions: positionsB }),
      ],
    });

    const boundingSphere = BoundingSphere.fromPoints(positions);
    const boundingVolume = new TileBoundingSphere(
      boundingSphere.center,
      boundingSphere.radius,
    );

    const spy = spyOn(Rectangle, "fromBoundingSphere").and.callThrough();

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    // The tile bounding rectangle should be computed only once,
    // not once per polygon
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("computes tile bounding rectangle once for multiple polygons using TileOrientedBoundingBox", function () {
    const polygons = new ClippingPolygonCollection({
      polygons: [
        new ClippingPolygon({ positions }),
        new ClippingPolygon({ positions: positionsB }),
      ],
    });

    const box = OrientedBoundingBox.fromPoints(positions);
    const boundingVolume = new TileOrientedBoundingBox(
      box.center,
      box.halfAxes,
    );

    const spy = spyOn(Rectangle, "fromCartesianArray").and.callThrough();

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    // The oriented bounding box corners should be converted to a rectangle only once
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("default constructor sets quality to 1.0", function () {
    const polygons = new ClippingPolygonCollection();
    expect(polygons.quality).toBe(1.0);
  });

  it("constructor accepts a quality option", function () {
    const polygons = new ClippingPolygonCollection({ quality: 0.5 });
    expect(polygons.quality).toBe(0.5);
  });

  it("quality scales the clipping distance texture resolution", function () {
    const polygon = new ClippingPolygon({ positions });

    // Set this to the minimum possible value so texture sizes can be consistently tested
    ContextLimits._maximumTextureSize = 16384;

    const halfQuality = new ClippingPolygonCollection({
      polygons: [polygon],
      quality: 0.5,
    });
    const result05 =
      ClippingPolygonCollection.getClippingDistanceTextureResolution(
        halfQuality,
        new Cartesian2(),
      );
    expect(result05.x).toBe(2048);
    expect(result05.y).toBe(2048);

    const defaultQuality = new ClippingPolygonCollection({
      polygons: [polygon],
    });
    const result10 =
      ClippingPolygonCollection.getClippingDistanceTextureResolution(
        defaultQuality,
        new Cartesian2(),
      );
    expect(result10.x).toBe(4096);
    expect(result10.y).toBe(4096);

    const doubleQuality = new ClippingPolygonCollection({
      polygons: [polygon],
      quality: 2.0,
    });
    const result20 =
      ClippingPolygonCollection.getClippingDistanceTextureResolution(
        doubleQuality,
        new Cartesian2(),
      );
    // Clamped to maximumTextureSize
    expect(result20.x).toBeLessThanOrEqual(ContextLimits.maximumTextureSize);
    expect(result20.y).toBeLessThanOrEqual(ContextLimits.maximumTextureSize);
  });

  it("quality enforces a minimum texture size of 128", function () {
    const polygon = new ClippingPolygon({ positions });

    // Set this to the minimum possible value so texture sizes can be consistently tested
    ContextLimits._maximumTextureSize = 16384;

    const polygons = new ClippingPolygonCollection({
      polygons: [polygon],
      quality: 0.001,
    });
    const result =
      ClippingPolygonCollection.getClippingDistanceTextureResolution(
        polygons,
        new Cartesian2(),
      );
    expect(result.x).toBe(128);
    expect(result.y).toBe(128);
  });
});
