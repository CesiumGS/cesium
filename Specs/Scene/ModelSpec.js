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
    var superMurdochModel;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.getPrimitives();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    function loadModel(url) {
        var ellipsoid = Ellipsoid.WGS84;
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 0.0)));

        var model = primitives.add(Model.fromGltf({
            url : url,
            modelMatrix : modelMatrix,
            show : false
        }));

        var readyToRender = false;
        model.readyToRender.addEventListener(function(model) {
            readyToRender = true;

            model.zoomTo = function() {
                var worldBoundingSphere = model.computeWorldBoundingSphere();
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
            };
        });

        waitsFor(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return readyToRender;
        }, url + ' readyToRender', 10000);

        return model;
    }

    it('loads duck.json', function() {
        duckModel = loadModel('./Data/Models/duck/duck.json');
    });

    it('loads SuperMurdochModel.json', function() {
        superMurdochModel = loadModel('./Data/Models/SuperMurdoch/SuperMurdoch.json');
    });

    it('renders the duck', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        duckModel.show = true;
        duckModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        duckModel.show = false;
    });

    it('renders SuperMurdoch (many meshes, including translucent ones)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        superMurdochModel.show = true;
        superMurdochModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        superMurdochModel.show = false;
    });

}, 'WebGL');
