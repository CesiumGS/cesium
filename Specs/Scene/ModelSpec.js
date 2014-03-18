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
         'Core/Event',
         'Core/JulianDate',
         'Core/PrimitiveType',
         'Scene/ModelAnimationLoop'
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
         Event,
         JulianDate,
         PrimitiveType,
         ModelAnimationLoop) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var duckUrl = './Data/Models/duck/duck.json';
    var customDuckUrl = './Data/Models/customDuck/duck.json';
    var cesiumAirUrl = './Data/Models/CesiumAir/CesiumAir.json';
    var animBoxesUrl = './Data/Models/anim-test-1-boxes/anim-test-1-boxes.json';
    var riggedFigureUrl = './Data/Models/rigged-figure-test/rigged-figure-test.json';

    var duckModel;
    var customDuckModel;
    var cesiumAirModel;
    var animBoxesModel;
    var riggedFigureModel;

    var scene;
    var primitives;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.primitives;
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

            // Always use initial bounding sphere, ignoring animations
            var worldBoundingSphere = model.computeWorldBoundingSphere();

            model.zoomTo = function() {
                var center = worldBoundingSphere.center;
                var transform = Transforms.eastNorthUpToFixedFrame(center);

                // View in east-north-up frame
                var camera = scene.camera;
                camera.transform = transform;
                camera.constrainedAxis = Cartesian3.UNIT_Z;

                var controller = scene.screenSpaceCameraController;
                controller.ellipsoid = Ellipsoid.UNIT_SPHERE;
                controller.enableTilt = false;

                // Zoom in
                var r = Math.max(worldBoundingSphere.radius, camera.frustum.near);
                camera.lookAt(
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
        scene.renderForSpecs();

        var commands = duckModel._renderCommands;
        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            expect(commands[i].primitiveType).toEqual(PrimitiveType.LINES);
        }

        duckModel.show = false;
        duckModel.debugWireframe = false;
    });

    it('is picked', function() {
        duckModel.show = true;
        duckModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(duckModel);
        expect(pick.id).toEqual(duckUrl);
        expect(pick.node).toEqual(duckModel.getNode('LOD3sp'));
        expect(pick.mesh).toEqual(duckModel.getMesh('LOD3spShape'));

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

        duckModel.id = oldId;
        duckModel.show = false;
    });

    it('is not picked (show === false)', function() {
        duckModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
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

    it('getMesh throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getMesh('gltf-mesh-name');
        }).toThrowDeveloperError();
    });

    it('getMesh throws when name is not provided', function() {
        expect(function() {
            return duckModel.getMesh();
        }).toThrowDeveloperError();
    });

    it('getMesh returns undefined when mesh does not exist', function() {
        expect(duckModel.getNode('name-of-mesh-that-does-not-exist')).not.toBeDefined();
    });

    it('getMesh returns returns a mesh', function() {
        var mesh = duckModel.getMesh('LOD3spShape');
        expect(mesh).toBeDefined();
        expect(mesh.name).toEqual('LOD3spShape');
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

    it('loads customDuck', function() {
        customDuckModel = loadModel(customDuckUrl);
    });

    it('renders customDuckModel (NPOT textures and all uniform semantics)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        customDuckModel.show = true;
        customDuckModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        customDuckModel.show = false;
    });

    ///////////////////////////////////////////////////////////////////////////

    it('loads cesiumAir', function() {
        cesiumAirModel = loadModel(cesiumAirUrl);
    });

    it('renders cesiumAir (has translucency)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        cesiumAirModel.show = false;
    });

    it('picks cesiumAir', function() {
        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(cesiumAirModel);
        expect(pick.id).toEqual(cesiumAirUrl);
        expect(pick.node).toBeDefined();
        expect(pick.mesh).toBeDefined();

        cesiumAirModel.show = false;
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
        expect(function() {
            return animBoxesModel.activeAnimations.addAll({
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
            name : 'animation_1'
        });
        expect(a).toBeDefined();
        expect(a.name).toEqual('animation_1');
        expect(a.startTime).not.toBeDefined();
        expect(a.startOffset).toEqual(0.0);
        expect(a.stopTime).not.toBeDefined();
        expect(a.removeOnStop).toEqual(false);
        expect(a.speedup).toEqual(1.0);
        expect(a.reverse).toEqual(false);
        expect(a.loop).toEqual(ModelAnimationLoop.NONE);
        expect(a.start).toBeDefined();
        expect(a.update).toBeDefined();
        expect(a.stop).toBeDefined();
        expect(spyAdd).toHaveBeenCalledWith(animBoxesModel, a);
        animations.animationAdded.removeEventListener(spyAdd);

        expect(animations.contains(a)).toEqual(true);
        expect(animations.get(0)).toEqual(a);

        var spyRemove = jasmine.createSpy('listener');
        animations.animationRemoved.addEventListener(spyRemove);
        expect(animations.remove(a)).toEqual(true);
        expect(animations.remove(a)).toEqual(false);
        expect(animations.remove()).toEqual(false);
        expect(animations.contains(a)).toEqual(false);
        expect(animations.length).toEqual(0);
        expect(spyRemove).toHaveBeenCalledWith(animBoxesModel, a);
        animations.animationRemoved.removeEventListener(spyRemove);
    });

    it('add throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.add({
                name : 'animation_1'
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
                name : 'animation_1',
                speedup : 0.0
            });
        }).toThrowDeveloperError();
    });

    it('get throws without an index', function() {
        var m = new Model();
        expect(function() {
            return m.activeAnimations.get();
        }).toThrowDeveloperError();
    });

    it('contains(undefined) returns false', function() {
        expect(animBoxesModel.activeAnimations.contains(undefined)).toEqual(false);
    });

    it('raises animation start, update, and stop events when removeOnStop is true', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            removeOnStop : true
        });

        var spyStart = jasmine.createSpy('listener');
        a.start.addEventListener(spyStart);

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        var stopped = false;
        a.stop.addEventListener(function(model, animation) {
            stopped = true;
        });
        var spyStop = jasmine.createSpy('listener');
        a.stop.addEventListener(spyStop);

        animBoxesModel.show = true;

        waitsFor(function() {
            scene.renderForSpecs(time);
            time = time.addSeconds(1.0, time);
            return stopped;
        }, 'raises animation start, update, and stop events when removeOnStop is true', 10000);

        runs(function() {
            expect(spyStart).toHaveBeenCalledWith(animBoxesModel, a);

            expect(spyUpdate.calls.length).toEqual(4);
            expect(spyUpdate.calls[0].args[0]).toBe(animBoxesModel);
            expect(spyUpdate.calls[0].args[1]).toBe(a);
            expect(spyUpdate.calls[0].args[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls[1].args[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls[2].args[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls[3].args[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

            expect(spyStop).toHaveBeenCalledWith(animBoxesModel, a);
            expect(animations.length).toEqual(0);
            animBoxesModel.show = false;
        });
    });

    it('Animates with a startOffset', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));

        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            startOffset : 1.0
        });

        var spyStart = jasmine.createSpy('listener');
        a.start.addEventListener(spyStart);

        animBoxesModel.show = true;
        scene.renderForSpecs(time); // Does not fire start
        scene.renderForSpecs(time.addSeconds(1.0));

        expect(spyStart.calls.length).toEqual(1);

        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with an explicit stopTime', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var stopTime = JulianDate.fromDate(new Date('January 1, 2014 12:00:01 UTC'));

        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            stopTime : stopTime
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        scene.renderForSpecs(time);
        scene.renderForSpecs(time.addSeconds(1.0));
        scene.renderForSpecs(time.addSeconds(2.0)); // Does not fire update

        expect(spyUpdate.calls.length).toEqual(2);
        expect(spyUpdate.calls[0].args[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(spyUpdate.calls[1].args[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with a speedup', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            speedup : 1.5
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        scene.renderForSpecs(time);
        scene.renderForSpecs(time.addSeconds(1.0));
        scene.renderForSpecs(time.addSeconds(2.0));

        expect(spyUpdate.calls.length).toEqual(3);
        expect(spyUpdate.calls[0].args[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(spyUpdate.calls[1].args[2]).toEqualEpsilon(1.5, CesiumMath.EPSILON14);
        expect(spyUpdate.calls[2].args[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON14);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates in reverse', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            reverse : true
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        scene.renderForSpecs(time);
        scene.renderForSpecs(time.addSeconds(1.0));
        scene.renderForSpecs(time.addSeconds(2.0));
        scene.renderForSpecs(time.addSeconds(3.0));

        expect(spyUpdate.calls.length).toEqual(4);
        expect(spyUpdate.calls[0].args[2]).toEqualEpsilon(3.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[1].args[2]).toEqualEpsilon(2.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[2].args[2]).toEqualEpsilon(1.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[3].args[2]).toEqualEpsilon(0.708, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with REPEAT', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            loop : ModelAnimationLoop.REPEAT
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        for (var i = 0; i < 8; ++i) {
            scene.renderForSpecs(time.addSeconds(i));
        }

        expect(spyUpdate.calls.length).toEqual(8);
        expect(spyUpdate.calls[0].args[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[1].args[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[2].args[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[3].args[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[4].args[2]).toEqualEpsilon(0.291, CesiumMath.EPSILON3); // Repeat with duration of ~3.7
        expect(spyUpdate.calls[5].args[2]).toEqualEpsilon(1.291, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[6].args[2]).toEqualEpsilon(2.291, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[7].args[2]).toEqualEpsilon(3.291, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates with MIRRORED_REPEAT', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            loop : ModelAnimationLoop.MIRRORED_REPEAT
        });

        var spyUpdate = jasmine.createSpy('listener');
        a.update.addEventListener(spyUpdate);

        animBoxesModel.show = true;
        for (var i = 0; i < 8; ++i) {
            scene.renderForSpecs(time.addSeconds(i));
        }

        expect(spyUpdate.calls.length).toEqual(8);
        expect(spyUpdate.calls[0].args[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[1].args[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[2].args[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[3].args[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[4].args[2]).toEqualEpsilon(3.416, CesiumMath.EPSILON3); // Mirror repeat with duration of 3.6
        expect(spyUpdate.calls[5].args[2]).toEqualEpsilon(2.416, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[6].args[2]).toEqualEpsilon(1.416, CesiumMath.EPSILON3);
        expect(spyUpdate.calls[7].args[2]).toEqualEpsilon(0.416, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates and renders', function() {
        var node = animBoxesModel.getNode('Geometry-mesh020Node');
        var matrix;

        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time
        });

        animBoxesModel.zoomTo();

        for (var i = 0; i < 4; ++i) {
            var t = time.addSeconds(i);
            expect(scene.renderForSpecs(t)).toEqual([0, 0, 0, 255]);

            animBoxesModel.show = true;
            expect(scene.renderForSpecs(t)).not.toEqual([0, 0, 0, 255]);
            animBoxesModel.show = false;
        }

        expect(animations.remove(a)).toEqual(true);
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

    it('renders riggedFigure with animation (skinning)', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = riggedFigureModel.activeAnimations;
        animations.addAll({
            startTime : time
        });

        riggedFigureModel.zoomTo();

        for (var i = 0; i < 6; ++i) {
            var t = time.addSeconds(0.25 * i);
            expect(scene.renderForSpecs(t)).toEqual([0, 0, 0, 255]);

            riggedFigureModel.show = true;
            expect(scene.renderForSpecs(t)).not.toEqual([0, 0, 0, 255]);
            riggedFigureModel.show = false;
        }

        animations.removeAll();
        riggedFigureModel.show = false;
    });
}, 'WebGL');
