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
         'Core/Transforms',
         'Scene/ModelAnimationWrap'
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
         Transforms,
         ModelAnimationWrap) {
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

    it('adds and removes all animations', function() {
        var animations = animBoxesModel.activeAnimations;
        expect(animations.length).toEqual(0);

        var spyAdd = jasmine.createSpy('listener');
        animations.animationAdded.addEventListener(spyAdd);
        var a = animations.addAll();
        expect(animations.length).toEqual(2);
        expect(spyAdd.calls.length).toEqual(2);
        expect(spyAdd.calls[0].args[0]).toBe(animBoxesModel);
        expect(spyAdd.calls[0].args[1]).toBe(a[0]);
        expect(spyAdd.calls[1].args[0]).toBe(animBoxesModel);
        expect(spyAdd.calls[1].args[1]).toBe(a[1]);
        animations.animationAdded.removeEventListener(spyAdd);

        expect(animations.contains(a[0])).toEqual(true);
        expect(animations.get(0)).toEqual(a[0]);
        expect(animations.contains(a[1])).toEqual(true);
        expect(animations.get(1)).toEqual(a[1]);

        var spyRemove = jasmine.createSpy('listener');
        animations.animationRemoved.addEventListener(spyRemove);
        animations.removeAll();
        expect(animations.length).toEqual(0);
        expect(spyRemove.calls.length).toEqual(2);
        expect(spyRemove.calls[0].args[0]).toBe(animBoxesModel);
        expect(spyRemove.calls[0].args[1]).toBe(a[0]);
        expect(spyRemove.calls[1].args[0]).toBe(animBoxesModel);
        expect(spyRemove.calls[1].args[1]).toBe(a[1]);
        animations.animationRemoved.removeEventListener(spyRemove);
    });

    it('addAll throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.addAll();
        }).toThrowDeveloperError();
    });

    it('addAll throws when speedup is less than or equal to zero.', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.addAll({
                speedup : 0.0
            });
        }).toThrowDeveloperError();
    });

    it('adds and removes an animation', function() {
        var animations = animBoxesModel.activeAnimations;
        expect(animations.length).toEqual(0);

        var spyAdd = jasmine.createSpy('listener');
        animations.animationAdded.addEventListener(spyAdd);
        var a = animations.add({
            name : 'animation_0'
        });
        expect(a).toBeDefined();
        expect(a.name).toEqual('animation_0');
        expect(a.startTime).not.toBeDefined();
        expect(a.startOffset).toEqual(0.0);
        expect(a.stopTime).not.toBeDefined();
        expect(a.removeOnStop).toEqual(false);
        expect(a.speedup).toEqual(1.0);
        expect(a.reverse).toEqual(false);
        expect(a.wrap).toEqual(ModelAnimationWrap.CLAMP);
        expect(a.start).not.toBeDefined();
        expect(a.update).not.toBeDefined();
        expect(a.stop).not.toBeDefined();
        expect(spyAdd).toHaveBeenCalledWith(animBoxesModel, a);
        animations.animationAdded.removeEventListener(spyAdd);

        expect(animations.contains(a)).toEqual(true);
        expect(animations.get(0)).toEqual(a);

        var spyRemove = jasmine.createSpy('listener');
        animations.animationRemoved.addEventListener(spyRemove);
        expect(animations.remove(a)).toEqual(true);
        expect(animations.remove(a)).toEqual(false);
        expect(animations.remove()).toEqual(false);
        expect(animations.length).toEqual(0);
        expect(spyRemove).toHaveBeenCalledWith(animBoxesModel, a);
        animations.animationRemoved.removeEventListener(spyRemove);
    });

    it('add throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.add({
                name : 'animation_0'
            });
        }).toThrowDeveloperError();
    });

    it('add throws when name is invalid.', function() {
        expect(function() {
            return animBoxesModel.activeAnimations.add({
                name : 'animation-does-not-exist'
            });
        }).toThrowDeveloperError();
    });

    it('add throws when speedup is less than or equal to zero.', function() {
        expect(function() {
            return animBoxesModel.activeAnimations.add({
                name : 'animation_0',
                speedup : 0.0
            });
        }).toThrowDeveloperError();
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
