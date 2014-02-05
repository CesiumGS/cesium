/*global defineSuite*/
defineSuite([
         'Scene/Model',
         'Specs/createScene',
         'Specs/destroyScene',
         'Core/defaultValue',
         'Core/Math',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Matrix4',
         'Core/BoundingSphere',
         'Core/Ellipsoid',
         'Core/Transforms'
     ], function(
         Model,
         createScene,
         destroyScene,
         defaultValue,
         CesiumMath,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Matrix4,
         BoundingSphere,
         Ellipsoid,
         Transforms) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

// TODO: Tests for all uniform semantics
// TODO: Tests for all uniform types

    var duckUrl = './Data/Models/duck/duck.json';
    var superMurdochUrl = './Data/Models/SuperMurdoch/SuperMurdoch.json';
    var animBoxesUrl = './Data/Models/anim-test-1-boxes/anim-test-1-boxes.json';
    var riggedFigureUrl = './Data/Models/rigged-figure-test/rigged-figure-test.json';

    var duckModel;
    var superMurdochModel;
    var animBoxesModel;
    var riggedFigureModel;

    var scene;
    var primitives;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.getPrimitives();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    function loadModel(url, options) {
        options = defaultValue(options, {});

        var ellipsoid = Ellipsoid.WGS84;
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 100.0)));

        var model = primitives.add(Model.fromGltf({
            url : url,
            modelMatrix : modelMatrix,
            show : false,
            scale : options.scale,
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
                var r = Math.max(worldBoundingSphere.radius, camera.frustum.near);
                camera.controller.lookAt(
                    new Cartesian3(0.0, -r, r),
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

    it('loads duck', function() {
        duckModel = loadModel(duckUrl);
    });

    it('fromGltf throws without options', function() {
        expect(function() {
            Model.fromGltf();
        }).toThrowDeveloperError();
    });

    it('fromGltf throws without options.url', function() {
        expect(function() {
            Model.fromGltf({});
        }).toThrowDeveloperError();
    });

    it('sets model properties', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 100.0)));

       expect(duckModel.gltf).toBeDefined();
       expect(duckModel.basePath).toEqual('./Data/Models/duck/');
       expect(duckModel.show).toEqual(false);
       expect(duckModel.modelMatrix).toEqual(modelMatrix);
       expect(duckModel.scale).toEqual(1.0);
       expect(duckModel.id).toEqual(duckUrl);
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
        expect(pick.id).toEqual(duckUrl);
        expect(pick.gltf.node).toEqual(duckModel.getNode('LOD3sp'));

        duckModel.show = false;
    });

    it('is picked with a new pick id', function() {
        var oldId = duckModel.id;
        duckModel.id = 'id';
        duckModel.show = true;
        duckModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(duckModel);
        expect(pick.id).toEqual('id');
        expect(pick.gltf.node).toEqual(duckModel.getNode('LOD3sp'));

        duckModel.id = oldId;
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

    it('getNode throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getNode('gltf-node-name');
        }).toThrowDeveloperError();
    });

    it('getNode throws when name is not provided', function() {
        expect(function() {
            return duckModel.getNode();
        }).toThrowDeveloperError();
    });

    it('getNode returns undefined when node does not exist', function() {
        expect(duckModel.getNode('name-of-node-that-does-not-exist')).not.toBeDefined();
    });

    it('getNode returns returns a node', function() {
        var node = duckModel.getNode('LOD3sp');
        expect(node).toBeDefined();
        expect(node.name).toEqual('LOD3sp');

        // Change node transform and render
        expect(duckModel._cesiumAnimationsDirty).toEqual(false);
        node.matrix = Matrix4.fromUniformScale(1.25);
        expect(duckModel._cesiumAnimationsDirty).toEqual(true);

        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        duckModel.show = true;
        duckModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        duckModel.show = false;

        expect(duckModel._cesiumAnimationsDirty).toEqual(false);
    });

    it('computeWorldBoundingSphere throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.computeWorldBoundingSphere();
        }).toThrowDeveloperError();
    });

    it('computeWorldBoundingSphere computes a bounding sphere', function() {
        var radius = duckModel.computeWorldBoundingSphere().radius;
        expect(radius).toEqualEpsilon(158.601, CesiumMath.EPSILON3);
    });

    it('computeWorldBoundingSphere uses a result parameter', function() {
        var result = new BoundingSphere();
        var sphere = duckModel.computeWorldBoundingSphere(result);
        expect(sphere).toBe(result);
        expect(sphere.radius).toEqualEpsilon(158.601, CesiumMath.EPSILON3);
    });

    it('destroys', function() {
        var m = loadModel(duckUrl);

        runs(function() {
            expect(m.isDestroyed()).toEqual(false);
            primitives.remove(m);
            expect(m.isDestroyed()).toEqual(true);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('loads superMurdoch', function() {
        superMurdochModel = loadModel(superMurdochUrl);
    });

    it('renders superMurdoch (many meshes, including translucent ones)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        superMurdochModel.show = true;
        superMurdochModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        superMurdochModel.show = false;
    });

    it('picks superMurdoch', function() {
        superMurdochModel.show = true;
        superMurdochModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(superMurdochModel);
        expect(pick.id).toEqual(superMurdochUrl);
        expect(pick.gltf.node).toBeDefined();

        superMurdochModel.show = false;
    });

    ///////////////////////////////////////////////////////////////////////////

    it('loads animBoxes', function() {
        animBoxesModel = loadModel(animBoxesUrl, {
            scale : 2.0
        });
    });

    it('renders animBoxes without animation', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        animBoxesModel.show = true;
        animBoxesModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        animBoxesModel.show = false;
    });

    ///////////////////////////////////////////////////////////////////////////

    it('loads riggedFigure', function() {
        riggedFigureModel = loadModel(riggedFigureUrl);
    });

    it('renders riggedFigure without animation', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        riggedFigureModel.show = true;
        riggedFigureModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        riggedFigureModel.show = false;
    });
}, 'WebGL');
