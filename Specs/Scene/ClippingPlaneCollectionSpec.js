defineSuite([
        'Scene/ClippingPlaneCollection',
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

    var transform = new Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0));
    var boundingVolume  = new BoundingSphere(Cartesian3.ZERO, 1.0);

    it('default constructor', function() {
        clippingPlanes = new ClippingPlaneCollection();
        expect(clippingPlanes.planes).toEqual([]);
        expect(clippingPlanes.enabled).toEqual(true);
        expect(clippingPlanes.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(clippingPlanes.edgeColor).toEqual(Color.WHITE);
        expect(clippingPlanes.edgeWidth).toEqual(0.0);
        expect(clippingPlanes.combineClippingRegions).toEqual(true);
        expect(clippingPlanes._testIntersection).not.toBeUndefined();
    });

    it('transforms and packs planes into result paramter', function() {
        clippingPlanes = new ClippingPlaneCollection({
            planes : planes
        });

        var result = clippingPlanes.transformAndPackPlanes(transform);
        expect(result.length).toEqual(2);
        expect(result[0]).toEqual(new Cartesian4(1.0, 0.0, 0.0, -2.0));
        expect(result[1]).toEqual(new Cartesian4(0.0, 1.0, 0.0, -4.0));
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
        expect(result.planes[0]).toEqual(planes[0]);
        expect(result.planes[1]).toEqual(planes[1]);
        expect(result.enabled).toEqual(false);
        expect(result.modelMatrix).toEqual(transform);
        expect(result.edgeColor).toEqual(Color.RED);
        expect(result.edgeWidth).toEqual(0.0);
        expect(result.combineClippingRegions).toEqual(true);
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
        expect(result.planes).not.toBe(planes);
        expect(result.planes[0]).toEqual(planes[0]);
        expect(result.planes[1]).toEqual(planes[1]);
        expect(result.enabled).toEqual(false);
        expect(result.modelMatrix).toEqual(transform);
        expect(result.edgeColor).toEqual(Color.RED);
        expect(result.edgeWidth).toEqual(0.0);
        expect(result.combineClippingRegions).toEqual(true);
        expect(result._testIntersection).not.toBeUndefined();

        // Only allocate a new array if needed
        var previousPlanes = result.planes;
        clippingPlanes.clone(result);
        expect(result.planes).toBe(previousPlanes);
    });


    it('setting combineClippingRegions updates testIntersection function', function() {
        clippingPlanes = new ClippingPlaneCollection();
        var originalIntersectFunction = clippingPlanes._testIntersection;

        expect(clippingPlanes._testIntersection).not.toBeUndefined();

        clippingPlanes.combineClippingRegions = false;

        expect(clippingPlanes._testIntersection).not.toBe(originalIntersectFunction);
    });

    it('computes intersections with bounding volumes when combining clipping regions', function() {
        clippingPlanes = new ClippingPlaneCollection();

        var intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_X, 2.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.OUTSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_Y, 0.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INTERSECTING);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_Z, -1.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_Z, 0.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);
    });

    it('computes intersections with bounding volumes when not combining clipping regions', function() {
        clippingPlanes = new ClippingPlaneCollection({
            combineClippingRegions : false
        });

        var intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_Z, -1.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_Y, 2.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.OUTSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_X, 0.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.OUTSIDE);

        var plane = clippingPlanes.planes.pop();
        clippingPlanes.planes.pop();

        clippingPlanes.planes.push(plane);
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume);
        expect(intersect).toEqual(Intersect.INTERSECTING);
    });

    it('computes intersections applies optional transform to planes', function() {
        clippingPlanes = new ClippingPlaneCollection();

        var intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume, transform);
        expect(intersect).toEqual(Intersect.INSIDE);

        clippingPlanes.planes.push(new Plane(Cartesian3.UNIT_X, -1.0));
        intersect = clippingPlanes.computeIntersectionWithBoundingVolume(boundingVolume, transform);
        expect(intersect).not.toEqual(Intersect.INSIDE);
    });
});
