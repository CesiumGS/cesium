/*global defineSuite*/
defineSuite([
        'Scene/TileOrientedBoundingBox',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Matrix3',
        'Core/Rectangle',
        'Scene/Cesium3DTile',
        'Specs/createScene'
    ], function(
        TileOrientedBoundingBox,
        Cartesian3,
        Color,
        Matrix3,
        Rectangle,
        Cesium3DTile,
        createScene) {
    "use strict";

    var center = new Cartesian3(0.0, 0.0, 0.0);
    var halfAxes = Matrix3.fromScale(new Cartesian3(1.0, 1.0, 1.0), new Matrix3());

    it('can be instantiated with center and half-axes', function() {
        var tileBoundingVolume = new TileOrientedBoundingBox({center: center, halfAxes: halfAxes});
        expect(tileBoundingVolume).toBeDefined();
        expect(tileBoundingVolume.boundingVolume).toBeDefined();
    });

    it('can create debug volume', function() {
        var tileBoundingVolume = new TileOrientedBoundingBox({center: center, halfAxes: halfAxes});
        expect(tileBoundingVolume.createDebugVolume(Color.BLUE)).toBeDefined();
    });

    it('has distance 0 to camera if camera is inside', function() {
        var tileBoundingVolume = new TileOrientedBoundingBox({center: center, halfAxes: halfAxes});
        var scene = createScene();
        scene.frameState.camera.position = new Cartesian3(0.0, 0.0, 0.0);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(0.0);

        scene.frameState.camera.position = new Cartesian3(-0.5, -0.5, -0.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(0.0);
        scene.frameState.camera.position = new Cartesian3(0.5, 0.5, 0.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).toEqual(0.0);
    });

    it('has non-zero distance to camera if camera is outside box', function() {
        var tileBoundingVolume = new TileOrientedBoundingBox({center: center, halfAxes: halfAxes});
        var scene = createScene();
        scene.frameState.camera.position = new Cartesian3(0.6, 0.5, 0.5);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).not.toEqual(0.0);
        scene.frameState.camera.position = new Cartesian3(-0.5, -0.5, -0.6);
        expect(tileBoundingVolume.distanceToCamera(scene.frameState)).not.toEqual(0.0);
    });

});
