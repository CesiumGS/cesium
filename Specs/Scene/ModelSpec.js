/*global defineSuite*/
defineSuite([
         'Scene/Model',
         'Specs/createScene',
         'Specs/destroyScene',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Transforms'
     ], function(
         Model,
         createScene,
         destroyScene,
         Cartesian2,
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
            show : false,
            id : url        // for picking tests
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

    it('sets model properties', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 0.0)));

       expect(duckModel.gltf).toBeDefined();
       expect(duckModel.basePath).toEqual('./Data/Models/duck/');
       expect(duckModel.show).toEqual(false);
       expect(duckModel.modelMatrix).toEqual(modelMatrix);
       expect(duckModel.scale).toEqual(1.0);
       expect(duckModel.id).toEqual('./Data/Models/duck/duck.json');
       expect(duckModel.allowPicking).toEqual(true);
       expect(duckModel.activeAnimations).toBeDefined();
       expect(duckModel.debugShowBoundingVolume).toEqual(false);
       expect(duckModel.debugWireframe).toEqual(false);
    });

    it('renders', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        duckModel.show = true;
        duckModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        duckModel.show = false;
    });

    it('renders bounding volume', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        duckModel.show = true;
        duckModel.debugShowBoundingVolume = true;
        duckModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        duckModel.show = false;
        duckModel.debugShowBoundingVolume = false;
    });

    it('renders in wireframe', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        duckModel.show = true;
        duckModel.debugWireframe = true;
        duckModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        duckModel.show = false;
        duckModel.debugWireframe = false;
    });

    it('is picked', function() {
        duckModel.show = true;
        duckModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(duckModel);
        expect(pick.id).toEqual('./Data/Models/duck/duck.json');
        expect(pick.gltf.node).toEqual(duckModel.getNode('LOD3sp'));

        duckModel.show = false;
    });

    it('is not picked (show === false)', function() {
        duckModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

// TODO: be able to set allowPicking?
    xit('is not picked (allowPicking === false)', function() {
        duckModel.show = true;
        duckModel.allowPicking = false;
        duckModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();

        duckModel.show = false;
        duckModel.allowPicking = true;
    });

    it('renders SuperMurdoch (many meshes, including translucent ones)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        superMurdochModel.show = true;
        superMurdochModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        superMurdochModel.show = false;
    });

    it('picks SuperMurdoch', function() {
        superMurdochModel.show = true;
        superMurdochModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(superMurdochModel);
        expect(pick.id).toEqual('./Data/Models/SuperMurdoch/SuperMurdoch.json');
        expect(pick.gltf.node).toBeDefined();

        superMurdochModel.show = false;
    });

}, 'WebGL');
