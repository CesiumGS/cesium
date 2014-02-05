/*global defineSuite*/
defineSuite([
         'Scene/Model',
         'Specs/createScene',
         'Specs/destroyScene',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Transforms'
     ], function(
         Model,
         createScene,
         destroyScene,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Transforms) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var primitives;
    var duckModel;

    // waitsFor does not work inside beforeAll.
    it('initialize suite', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 0.0)));

        scene = createScene();
        primitives = scene.getPrimitives();
        duckModel = primitives.add(Model.fromGltf({
            url : './Data/Models/duck/duck.json',
            modelMatrix : modelMatrix,
            show : false
        }));

        var duckReadyToRender = false;
        duckModel.readyToRender.addEventListener(function(model) {
            duckReadyToRender = true;

            var worldBoundingSphere = duckModel.computeWorldBoundingSphere();
            var center = worldBoundingSphere.center;
            var transform = Transforms.eastNorthUpToFixedFrame(center);

            // View in east-north-up frame
            var camera = scene.getCamera();
            camera.transform = transform;
            camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

            var controller = scene.getScreenSpaceCameraController();
            controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
            controller.enableTilt = false;

            // Zoom in
            camera.controller.lookAt(
                new Cartesian3(0.0, -worldBoundingSphere.radius, worldBoundingSphere.radius),
                Cartesian3.ZERO,
                Cartesian3.UNIT_Z);
        });

        waitsFor(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return duckReadyToRender;
        }, 'duckModel.readyToRender', 10000);
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('renders the duck', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        duckModel.show = true;
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        duckModel.show = false;
    });

}, 'WebGL');
