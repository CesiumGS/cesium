import {
  BoundingSphere,
  Cartesian3,
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
  const holePositions = Cartesian3.fromRadiansArray([
    -1.31942, 0.69879, -1.319405, 0.69879, -1.319412, 0.698763,
  ]);

  it("default constructor", function () {
    const polygons = new ClippingPolygonCollection();
    expect(polygons.length).toEqual(0);
    expect(polygons.enabled).toBeTrue();
    expect(polygons.inverse).toBeFalse();
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

  it("clippingPolygonsState encodes enabled, presence, and inverse", function () {
    const polygons = new ClippingPolygonCollection();
    expect(polygons.clippingPolygonsState).toBe(0);

    polygons.add(new ClippingPolygon({ positions }));
    expect(polygons.clippingPolygonsState).toBe(1);

    polygons.inverse = true;
    expect(polygons.clippingPolygonsState).toBe(-1);

    polygons.inverse = false;
    polygons.enabled = false;
    expect(polygons.clippingPolygonsState).toBe(0);
  });

  it("add adds a polygon to the collection", function () {
    const polygons = new ClippingPolygonCollection();
    polygons.add(new ClippingPolygon({ positions }));

    expect(polygons.length).toBe(1);
  });

  it("packs holes from constructor options into the backing collection", function () {
    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions, holes: [holePositions] })],
    });

    const buffer = polygons._bufferPolygonCollection;
    expect(buffer.holeCount).toBe(1);
    expect(buffer.vertexCount).toBe(positions.length + holePositions.length);
  });

  it("packs holes when a polygon is added", function () {
    const polygons = new ClippingPolygonCollection();
    polygons.add(new ClippingPolygon({ positions, holes: [holePositions] }));

    const buffer = polygons._bufferPolygonCollection;
    expect(buffer.holeCount).toBe(1);
    expect(buffer.vertexCount).toBe(positions.length + holePositions.length);
  });

  it("requestRectangleData packs textures for a polygon with a hole", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions, holes: [holePositions] })],
    });

    const data = polygons.requestRectangleData(
      Rectangle.MAX_VALUE,
      scene.context,
    );

    expect(data.polygonEdgeTexture).toBeDefined();

    ClippingPolygonCollection.releaseRectangleData(data);
    scene.destroyForSpecs();
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

  it("does not repack polygon data if the polygons are unchanged", function () {
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
    const packedData = polygons._vectorCollectionData;

    polygons.update(scene.frameState);
    expect(polygons._vectorCollectionData).toBe(packedData);

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

    // Attaching a new collection detaches the previous one from the owner.
    ClippingPolygonCollection.setOwner(polygons2, clippedObject1, "polygons");
    expect(clippedObject1.polygons).toBe(polygons2);
    expect(polygons2._owner).toBe(clippedObject1);

    // Setting the same ClippingPolygonCollection again is a no-op.
    ClippingPolygonCollection.setOwner(polygons2, clippedObject1, "polygons");
    expect(clippedObject1.polygons).toBe(polygons2);

    // Expect failure when attaching one ClippingPolygonCollection to two objects
    expect(function () {
      ClippingPolygonCollection.setOwner(polygons2, clippedObject2, "polygons");
    }).toThrowDeveloperError();
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

    // Spy on the rectangle getter to verify early return behavior. The
    // property is a non-configurable prototype getter, so shadow it with a
    // configurable own getter that can be spied on.
    const spyB = jasmine
      .createSpy("rectangle")
      .and.returnValue(polygonB.rectangle);
    Object.defineProperty(polygonB, "rectangle", {
      configurable: true,
      get: spyB,
    });

    const intersect =
      polygons.computeIntersectionWithBoundingVolume(boundingVolume);
    expect(intersect).toEqual(Intersect.INTERSECTING);

    // Because the first polygon intersects, the second polygon's
    // rectangle should never be accessed (early return optimization)
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

  it("requestRectangleData throws without a rectangle", function () {
    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions })],
    });
    const scene = createScene();

    expect(() => {
      polygons.requestRectangleData(undefined, scene.context);
    }).toThrowDeveloperError();

    scene.destroyForSpecs();
  });

  it("requestRectangleData throws without a context", function () {
    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions })],
    });

    expect(() => {
      polygons.requestRectangleData(Rectangle.MAX_VALUE, undefined);
    }).toThrowDeveloperError();
  });

  it("requestRectangleData packs textures for an overlapping rectangle", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions })],
    });

    const data = polygons.requestRectangleData(
      Rectangle.MAX_VALUE,
      scene.context,
    );

    expect(data.polygonEdgeTexture).toBeDefined();
    expect(data.polygonEdgeTexture.width).toBeGreaterThan(0);
    expect(data.polygonEdgeTexture.height).toBeGreaterThan(0);
    expect(data.polygonEdgePrimitiveIndicesTexture).toBeDefined();
    expect(data.polygonGridCellIndicesTexture).toBeDefined();
    expect(data.rectangle).toEqual(Rectangle.MAX_VALUE);

    ClippingPolygonCollection.releaseRectangleData(data);
    scene.destroyForSpecs();
  });

  it("requestRectangleData returns empty data for a non-overlapping rectangle", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions })],
    });

    // A rectangle (radians) on the far side of the globe from `positions`.
    const farRectangle = new Rectangle(2.0, -1.0, 2.5, -0.5);
    const data = polygons.requestRectangleData(farRectangle, scene.context);

    expect(data.polygonEdgeTexture).toBeUndefined();
    expect(data.rectangle).toEqual(farRectangle);

    scene.destroyForSpecs();
  });

  it("requestRectangleData returns empty data when there are no polygons", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygons = new ClippingPolygonCollection();

    const data = polygons.requestRectangleData(
      Rectangle.MAX_VALUE,
      scene.context,
    );

    expect(data.polygonEdgeTexture).toBeUndefined();

    scene.destroyForSpecs();
  });

  it("releaseRectangleData destroys the packed textures", function () {
    const scene = createScene();
    if (!scene.context.webgl2) {
      scene.destroyForSpecs();
      return;
    }

    const polygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions })],
    });

    const data = polygons.requestRectangleData(
      Rectangle.MAX_VALUE,
      scene.context,
    );
    const edgeTexture = data.polygonEdgeTexture;
    const gridCellIndicesTexture = data.polygonGridCellIndicesTexture;

    ClippingPolygonCollection.releaseRectangleData(data);

    expect(edgeTexture.isDestroyed()).toBe(true);
    expect(gridCellIndicesTexture.isDestroyed()).toBe(true);

    scene.destroyForSpecs();
  });
});
