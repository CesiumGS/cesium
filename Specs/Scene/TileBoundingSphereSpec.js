defineSuite([
        'Scene/TileBoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Intersect',
        'Core/Math',
        'Core/Plane',
        'Specs/createFrameState'
    ], function(
        TileBoundingSphere,
        Cartesian3,
        Color,
        Intersect,
        CesiumMath,
        Plane,
        createFrameState) {
    'use strict';

    var tileBoundingSphere = new TileBoundingSphere(new Cartesian3(0.0, 0.0, 0.0), 1.0);
    var frameState = createFrameState();

    it('can be instantiated with center and radius', function() {
        var center = new Cartesian3(0.0, 0.0, 0.0);
        var radius = 1.0;
        var tbs = new TileBoundingSphere(center, radius);
        expect(tbs).toBeDefined();
        expect(tbs.boundingVolume).toBeDefined();
        expect(tbs.boundingSphere).toBeDefined();
        expect(tbs.center).toEqual(center);
        expect(tbs.radius).toEqual(radius);
    });

    it('createDebugVolume throws when color is undefined', function() {
        expect(function() {
            return tileBoundingSphere.createDebugVolume();
        }).toThrowDeveloperError();
    });

    it('can create a debug volume', function() {
        var debugVolume = tileBoundingSphere.createDebugVolume(Color.BLUE);
        expect(debugVolume).toBeDefined();
    });

    it('distanceToCamera throws when frameState is undefined', function() {
        expect(function() {
            return tileBoundingSphere.distanceToCamera();
        }).toThrowDeveloperError();
    });

    it('distance to camera is 0 when camera is inside bounding sphere', function() {
        frameState.camera.position = new Cartesian3(0.0, 0.0, 0.0);
        expect(tileBoundingSphere.distanceToCamera(frameState)).toEqual(0.0);
    });

    it('distance to camera is correct when camera is outside bounding region', function() {
        frameState.camera.position = new Cartesian3(0.0, 2.0, 0.0);
        expect(tileBoundingSphere.distanceToCamera(frameState)).toEqual(1.0);
    });

    it('intersectPlane throws when plane is undefined', function() {
        expect(function() {
            return tileBoundingSphere.intersectPlane();
        }).toThrowDeveloperError();
    });

    it('intersects plane', function() {
        var normal = new Cartesian3(0.0, 0.0, 1.0);
        var plane = new Plane(normal, CesiumMath.EPSILON6);
        expect(tileBoundingSphere.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
    });

});
