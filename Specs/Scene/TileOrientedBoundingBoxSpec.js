/*global defineSuite*/
defineSuite([
        'Scene/TileOrientedBoundingBox',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Intersect',
        'Core/Math',
        'Core/Matrix3',
        'Core/Plane',
        'Core/Rectangle',
        'Scene/Cesium3DTile',
        'Specs/createScene'
    ], function(
        TileOrientedBoundingBox,
        Cartesian3,
        Color,
        Intersect,
        CesiumMath,
        Matrix3,
        Plane,
        Rectangle,
        Cesium3DTile,
        createScene) {
    "use strict";

    var center = new Cartesian3(0.0, 0.0, 0.0);
    var halfAxes = Matrix3.fromScale(new Cartesian3(0.5, 0.5, 0.5), new Matrix3());
    var tileBoundingVolume = new TileOrientedBoundingBox({center: center, halfAxes: halfAxes});

    it('can be instantiated with center and half-axes', function() {
        expect(tileBoundingVolume).toBeDefined();
        expect(tileBoundingVolume.boundingVolume).toBeDefined();
    });

    it('can create debug volume', function() {
        expect(tileBoundingVolume.createDebugVolume(Color.BLUE)).toBeDefined();
    });

    it('has distance 0 to camera if camera is inside', function() {
        var scene = createScene();
        scene.frameState.camera.position = new Cartesian3(0.0, 0.0, 0.0);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(0.0);

        scene.frameState.camera.position = new Cartesian3(-0.5, -0.5, -0.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(0.0);
        scene.frameState.camera.position = new Cartesian3(0.5, 0.5, 0.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(0.0);
    });

    it('has correct distance to camera if camera is slightly outside box', function() {
        var eps6 = CesiumMath.EPSILON6;
        var scene = createScene();
        scene.frameState.camera.position = new Cartesian3(0.5 + eps6, 0.5, 0.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).not.toEqual(0.0);
        scene.frameState.camera.position = new Cartesian3(-0.5, -0.5, -0.5 - eps6);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).not.toEqual(0.0);
        scene.frameState.camera.position = new Cartesian3(100.5, 100.5, 100.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(Math.sqrt(30000.0));
    });

    it('has correct distance to camera for large distances', function() {
        var scene = createScene();
        scene.frameState.camera.position = new Cartesian3(2170456.713380141, -36351235.19646463, 28403328.27058654);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqualEpsilon(46183029.05370139, CesiumMath.EPSILON6);
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
