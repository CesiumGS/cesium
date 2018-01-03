defineSuite([
        'Core/ClippingPlaneCollection',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/Color',
        'Core/Intersect',
        'Core/Matrix4',
        'Core/Plane'
    ], function(
        ClippingPlaneCollection,
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Color,
        Intersect,
        Matrix4,
        Plane) {
    'use strict';

    var clippingPlanes;
    var planes = [
        new Plane(Cartesian3.UNIT_X, 1.0),
        new Plane(Cartesian3.UNIT_Y, 2.0)
    ];

    var transform = new Matrix4.fromTranslation(new Cartesian3(1.0, 3.0, 2.0));
    var boundingVolume  = new BoundingSphere(Cartesian3.ZERO, 1.0);

    it('default constructor', function() {
        clippingPlanes = new ClippingPlaneCollection();
        expect(clippingPlanes._planes).toEqual([]);
        expect(clippingPlanes.enabled).toEqual(true);
        expect(clippingPlanes.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(clippingPlanes.edgeColor).toEqual(Color.WHITE);
        expect(clippingPlanes.edgeWidth).toEqual(0.0);
        expect(clippingPlanes.unionClippingRegions).toEqual(false);
        expect(clippingPlanes._testIntersection).not.toBeUndefined();
    });

    it('gets the length of the list of planes in the collection', function() {
        clippingPlanes = new ClippingPlaneCollection();

        expect(clippingPlanes.length).toBe(0);

        clippingPlanes._planes = planes.slice();

        expect(clippingPlanes.length).toBe(2);

        clippingPlanes._planes.push(new Plane(Cartesian3.UNIT_Z, -1.0));

        expect(clippingPlanes.length).toBe(3);

        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        expect(clippingPlanes.length).toBe(2);
    });

    it('add adds a plane to the collection', function() {
        clippingPlanes = new ClippingPlaneCollection();
        clippingPlanes.add(planes[0]);

        expect(clippingPlanes.length).toBe(1);
        expect(clippingPlanes._planes[0]).toBe(planes[0]);
    });

    it('add throws developer error if the added plane exceeds the maximum number of planes', function() {
        clippingPlanes = new ClippingPlaneCollection();
        clippingPlanes._planes = new Array(ClippingPlaneCollection.MAX_CLIPPING_PLANES);

        expect(function() {
            clippingPlanes.add(new Plane(Cartesian3.UNIT_Z, -1.0));
        }).toThrowDeveloperError();
    });

    it('gets the plane at an index', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        var plane = clippingPlanes.get(0);
        expect(plane).toBe(planes[0]);

        plane = clippingPlanes.get(1);
        expect(plane).toBe(planes[1]);

        plane = clippingPlanes.get(2);
        expect(plane).toBeUndefined();
    });

    it('contain checks if the collection contains a plane', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        expect(clippingPlanes.contains(planes[0])).toBe(true);
        expect(clippingPlanes.contains(new Plane(Cartesian3.UNIT_Y, 2.0))).toBe(true);
        expect(clippingPlanes.contains(new Plane(Cartesian3.UNIT_Z, 3.0))).toBe(false);
    });

    it('remove removes and the first occurrence of a plane', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        expect(clippingPlanes.contains(planes[0])).toBe(true);

        var result = clippingPlanes.remove(planes[0]);

        expect(clippingPlanes.contains(planes[0])).toBe(false);
        expect(clippingPlanes.length).toBe(1);
        expect(clippingPlanes.get(0)).toEqual(planes[1]);
        expect(result).toBe(true);

        result = clippingPlanes.remove(planes[0]);
        expect(result).toBe(false);
    });

    it('transforms and packs planes into result parameter', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        var result = clippingPlanes.transformAndPackPlanes(transform);
        expect(result.length).toEqual(2);
        expect(result[0]).toEqual(new Cartesian4(1.0, 0.0, 0.0, 0.0));
        expect(result[1]).toEqual(new Cartesian4(0.0, 1.0, 0.0, -1.0));
    });

    it('transforms and packs planes with no result parameter creates new array', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        var result = clippingPlanes.transformAndPackPlanes(transform);
        expect(result.length).toEqual(2);
        expect(result[0]).toBeInstanceOf(Cartesian4);
        expect(result[1]).toBeInstanceOf(Cartesian4);
    });

    it('clone without a result parameter returns new identical copy', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes,
            enabled : false,
            edgeColor : Color.RED,
            modelMatrix : transform
        });

        var result = clippingPlanes.clone();
        expect(result).not.toBe(clippingPlanes);
        expect(result._planes[0]).toEqual(planes[0]);
        expect(result._planes[1]).toEqual(planes[1]);
        expect(result.enabled).toEqual(false);
        expect(result.modelMatrix).toEqual(transform);
        expect(result.edgeColor).toEqual(Color.RED);
        expect(result.edgeWidth).toEqual(0.0);
        expect(result.unionClippingRegions).toEqual(false);
        expect(result._testIntersection).not.toBeUndefined();
    });

    it('clone stores copy in result parameter', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes,
            enabled : false,
            edgeColor : Color.RED,
            modelMatrix : transform
        });
        var result = new ClippingPlaneCollection();
        var copy = clippingPlanes.clone(result);
        expect(copy).toBe(result);
        expect(result._planes).not.toBe(planes);
        expect(result._planes[0]).toEqual(planes[0]);
        expect(result._planes[1]).toEqual(planes[1]);
        expect(result.enabled).toEqual(false);
        expect(result.modelMatrix).toEqual(transform);
        expect(result.edgeColor).toEqual(Color.RED);
        expect(result.edgeWidth).toEqual(0.0);
        expect(result.unionClippingRegions).toEqual(false);
        expect(result._testIntersection).not.toBeUndefined();

        // Only allocate a new array if needed
        var previousPlanes = result._planes;
        clippingPlanes.clone(result);
        expect(result._planes).toBe(previousPlanes);
    });

    it('setting unionClippingRegions updates testIntersection function', function() {
        clippingPlanes = new ClippingPlaneCollection();
        var originalIntersectFunction = clippingPlanes._testIntersection;

        expect(clippingPlanes._testIntersection).not.toBeUndefined();

        clippingPlanes.unionClippingRegions = true;

        expect(clippingPlanes._testIntersection).not.toBe(originalIntersectFunction);
    });

    it('computes intersections with bounding volumes when clipping regions are combined with an intersect operation', function() {
        clippingPlanes = new ClippingPlaneCollection();

        var intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_X, -2.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.OUTSIDE);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_Y, 0.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INTERSECTING);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_Z, 1.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_Z, 0.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);
    });

    it('computes intersections with bounding volumes when clipping planes are combined with a union operation', function() {
        clippingPlanes = new ClippingPlaneCollection({
            unionClippingRegions : true
        });

        var intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_Z, 1.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        var temp = new Plane(Cartesian3.UNIT_Y, -2.0);
        clippingPlanes.add(temp);
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.OUTSIDE);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_X, 0.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.OUTSIDE);

        clippingPlanes.remove(temp);
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INTERSECTING);
    });

    it('computes intersections applies optional transform to planes', function() {
        clippingPlanes = new ClippingPlaneCollection();

        var intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume, transform);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.add(new Plane(Cartesian3.UNIT_X, -1.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume, transform);
        expect(intersect).not.toEqual(Intersect.INSIDE);
    });
});
