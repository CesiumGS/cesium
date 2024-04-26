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
    -1.3194369277314022,
    0.6988062530900625,
    -1.31941,
    0.69879,
    -1.3193955980204217,
    0.6988091578771254,
    -1.3193931220959367,
    0.698743632490865,
    -1.3194358224045408,
    0.6987471965556998,
  ]);
  const positionsB = Cartesian3.fromRadiansArray([
    -1.3194369277314022,
    0.6988062530900625,
    -1.31941,
    0.69879,
    -1.3193931220959367,
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
      "ClippingPolygonCollections are only supported for WebGL 2."
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
    expect(arrayBufferView[2]).toEqualEpsilon(
      0.6969271302223206,
      CesiumMath.EPSILON10
    ); // first position in spherical coordinates
    expect(arrayBufferView[3]).toEqualEpsilon(
      -1.3191630840301514,
      CesiumMath.EPSILON10
    );
    expect(arrayBufferView[10]).toEqualEpsilon(
      0.6968677043914795,
      CesiumMath.EPSILON10
    ); // last position in spherical coordinates
    expect(arrayBufferView[11]).toEqualEpsilon(
      -1.3191620111465454,
      CesiumMath.EPSILON10
    );
    expect(arrayBufferView[12]).toBe(0); // padding

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
      0.6958641409873962,
      CesiumMath.EPSILON10
    ); // south
    expect(arrayBufferView[1]).toEqualEpsilon(
      -1.3201631307601929,
      CesiumMath.EPSILON10
    ); // west
    expect(arrayBufferView[2]).toEqualEpsilon(
      484.0434265136719,
      CesiumMath.EPSILON10
    ); // 1 / (north - south)
    expect(arrayBufferView[3]).toEqualEpsilon(
      489.4261779785156,
      CesiumMath.EPSILON10
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
    expect(arrayBufferView[13]).toBe(0); // polygonB extents index

    args = spy.calls.argsFor(spy.calls.count() - 3); // extents are packed after polygon positions
    arrayBufferView = args[8];
    expect(arrayBufferView).toBeDefined();
    expect(arrayBufferView[0]).toEqualEpsilon(
      0.6958641409873962,
      CesiumMath.EPSILON10
    ); // south
    expect(arrayBufferView[1]).toEqualEpsilon(
      -1.3201631307601929,
      CesiumMath.EPSILON10
    ); // west
    expect(arrayBufferView[2]).toEqualEpsilon(
      484.0434265136719,
      CesiumMath.EPSILON10
    ); // north - south
    expect(arrayBufferView[3]).toEqualEpsilon(
      489.4261779785156,
      CesiumMath.EPSILON10
    ); // east - west
    expect(arrayBufferView[4]).toBe(0); // padding
    expect(arrayBufferView[5]).toBe(0); // padding
    expect(arrayBufferView[6]).toBe(0); // padding
    expect(arrayBufferView[7]).toBe(0); // padding

    polygons.destroy();
    scene.destroyForSpecs();
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

    const result = ClippingPolygonCollection.getClippingDistanceTextureResolution(
      polygons,
      new Cartesian2()
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

    const result = ClippingPolygonCollection.getClippingExtentsTextureResolution(
      polygons,
      new Cartesian2()
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

    let intersect = polygons.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.OUTSIDE);

    polygons.add(new ClippingPolygon({ positions }));
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const boundingSphere = BoundingSphere.fromPoints(positions);
    boundingVolume = new TileBoundingSphere(
      boundingSphere.center,
      boundingSphere.radius
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

    let intersect = polygons.computeIntersectionWithBoundingVolume(
      boundingVolume
    );
    expect(intersect).toEqual(Intersect.INSIDE);

    polygons.add(new ClippingPolygon({ positions }));
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const boundingSphere = BoundingSphere.fromPoints(positions);
    boundingVolume = new TileBoundingSphere(
      boundingSphere.center,
      boundingSphere.radius
    );
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    const box = OrientedBoundingBox.fromPoints(positions);
    boundingVolume = new TileOrientedBoundingBox(box.center, box.halfAxes);
    intersect = polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);
  });
});
