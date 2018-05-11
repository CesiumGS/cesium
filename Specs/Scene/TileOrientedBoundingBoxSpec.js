defineSuite([
        'Scene/TileOrientedBoundingBox',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Intersect',
        'Core/Math',
        'Core/Matrix3',
        'Core/Plane',
        'Specs/createFrameState'
    ], function(
        TileOrientedBoundingBox,
        Cartesian3,
        Color,
        Intersect,
        CesiumMath,
        Matrix3,
        Plane,
        createFrameState) {
    'use strict';

    var center = new Cartesian3(0.0, 0.0, 0.0);
    var halfAxes = Matrix3.fromScale(new Cartesian3(0.5, 0.5, 0.5), new Matrix3());
    var tileBoundingVolume = new TileOrientedBoundingBox(center, halfAxes);

    var frameState = createFrameState();

    it('can be instantiated with center and half-axes', function() {
        expect(tileBoundingVolume.boundingVolume.center).toEqual(center);
        expect(tileBoundingVolume.boundingVolume.halfAxes).toEqual(halfAxes);
        expect(tileBoundingVolume.boundingSphere.center).toEqual(center);
        expect(tileBoundingVolume.boundingSphere.radius).toBeGreaterThan(0.5);
        expect(tileBoundingVolume.boundingSphere.radius).toBeLessThan(1.0);
    });

    it('createDebugVolume throws when color is undefined', function() {
        expect(function() {
            return tileBoundingVolume.createDebugVolume();
        }).toThrowDeveloperError();
    });

    it('can create debug volume', function() {
        expect(tileBoundingVolume.createDebugVolume(Color.BLUE)).toBeDefined();
    });

    it('distanceToCamera throws when frameState is undefined', function() {
        expect(function() {
            return tileBoundingVolume.distanceToCamera();
        }).toThrowDeveloperError();
    });

    it('has distance 0 to camera if camera is inside', function() {
        frameState.camera.position = new Cartesian3(0.0, 0.0, 0.0);
        expect(tileBoundingVolume.distanceToCamera(frameState)).toEqual(0.0);

        frameState.camera.position = new Cartesian3(-0.5, -0.5, -0.5);
        expect(tileBoundingVolume.distanceToCamera(frameState)).toEqual(0.0);
        frameState.camera.position = new Cartesian3(0.5, 0.5, 0.5);
        expect(tileBoundingVolume.distanceToCamera(frameState)).toEqual(0.0);
    });

    it('has correct distance to camera if camera is slightly outside box', function() {
        var eps6 = CesiumMath.EPSILON6;
        frameState.camera.position = new Cartesian3(0.5 + eps6, 0.5, 0.5);
        expect(tileBoundingVolume.distanceToCamera(frameState)).not.toEqual(0.0);
        frameState.camera.position = new Cartesian3(-0.5, -0.5, -0.5 - eps6);
        expect(tileBoundingVolume.distanceToCamera(frameState)).not.toEqual(0.0);
        frameState.camera.position = new Cartesian3(100.5, 100.5, 100.5);
        expect(tileBoundingVolume.distanceToCamera(frameState)).toEqual(Math.sqrt(30000.0));
    });

    it('has correct distance to camera for large distances', function() {
        frameState.camera.position = new Cartesian3(2170456.713380141, -36351235.19646463, 28403328.27058654);
        expect(tileBoundingVolume.distanceToCamera(frameState)).toEqualEpsilon(46183029.05370139, CesiumMath.EPSILON6);
    });

    it('intersectPlane throws when plane is undefined', function() {
        expect(function() {
            return tileBoundingVolume.intersectPlane();
        }).toThrowDeveloperError();
    });

    it('intersects plane', function() {
        var plane = new Plane(Cartesian3.UNIT_X, 0.0);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
        plane = new Plane(Cartesian3.UNIT_X, 0.5 - CesiumMath.EPSILON6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
        plane = new Plane(Cartesian3.UNIT_X, -0.5 + CesiumMath.EPSILON6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
    });

    it('does not intersect plane', function() {
        var eps6 = CesiumMath.EPSILON6;
        var plane = new Plane(Cartesian3.UNIT_X, 0.5 + eps6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.INSIDE);
        plane = new Plane(Cartesian3.UNIT_Y, 0.5 + eps6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.INSIDE);
        plane = new Plane(Cartesian3.UNIT_Z, 0.5 + eps6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.INSIDE);

        plane = new Plane(Cartesian3.UNIT_X, -0.5 - eps6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.OUTSIDE);
        plane = new Plane(Cartesian3.UNIT_Y, -0.5 - eps6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.OUTSIDE);
        plane = new Plane(Cartesian3.UNIT_Z, -0.5 - eps6);
        expect(tileBoundingVolume.intersectPlane(plane)).toEqual(Intersect.OUTSIDE);
    });

});
