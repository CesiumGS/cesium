/*global defineSuite*/
defineSuite([
        'Scene/Model',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartesian4',
        'Core/defaultValue',
        'Core/FeatureDetection',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix4',
        'Core/PrimitiveType',
        'Core/Transforms',
        'Scene/ModelAnimationLoop',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        Model,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        defaultValue,
        FeatureDetection,
        JulianDate,
        CesiumMath,
        Matrix4,
        PrimitiveType,
        Transforms,
        ModelAnimationLoop,
        createScene,
        pollToPromise,
        when) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,WebGLRenderingContext*/

    var boxUrl = './Data/Models/Box/CesiumBoxTest.gltf';
    var texturedBoxUrl = './Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf';
    var texturedBoxSeparateUrl = './Data/Models/Box-Textured-Separate/CesiumTexturedBoxTest.gltf';
    var texturedBoxCustomUrl = './Data/Models/Box-Textured-Custom/CesiumTexturedBoxTest.gltf';
    var cesiumAirUrl = './Data/Models/CesiumAir/Cesium_Air.gltf';
    var animBoxesUrl = './Data/Models/anim-test-1-boxes/anim-test-1-boxes.gltf';
    var riggedFigureUrl = './Data/Models/rigged-figure-test/rigged-figure-test.gltf';

    var texturedBoxModel;
    var cesiumAirModel;
    var animBoxesModel;
    var riggedFigureModel;

    var scene;
    var primitives;

    beforeAll(function() {
        scene = createScene();
        primitives = scene.primitives;

        var modelPromises = [];
        modelPromises.push(loadModel(texturedBoxUrl).then(function(model) {
            texturedBoxModel = model;
        }));
        modelPromises.push(loadModel(cesiumAirUrl, {
            minimumPixelSize : 1,
            asynchronous : false
        }).then(function(model) {
            cesiumAirModel = model;
        }));
        modelPromises.push(loadModel(animBoxesUrl, {
            scale : 2.0
        }).then(function(model) {
            animBoxesModel = model;
        }));
        modelPromises.push(loadModel(riggedFigureUrl).then(function(model) {
            riggedFigureModel = model;
        }));

        return when.all(modelPromises);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function addZoomTo(model) {
        model.zoomTo = function() {
            var camera = scene.camera;
            var r = Math.max(model.boundingSphere.radius, camera.frustum.near);
            camera.lookAt( Matrix4.multiplyByPoint(model.modelMatrix, model.boundingSphere.center, new Cartesian3()), new Cartesian3(r, -r, -r));
        };
    }

    function loadModel(url, options) {
        options = defaultValue(options, {});

        var model = primitives.add(Model.fromGltf({
            url : url,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            scale : options.scale,
            minimumPixelSize : options.minimumPixelSize,
            id : url,        // for picking tests
            asynchronous : options.asynchronous,
            releaseGltfJson : options.releaseGltfJson,
            cacheKey : options.cacheKey
        }));
        addZoomTo(model);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return model.ready;
        }, { timeout: 10000 }).then(function() {
            return model;
        });
    }

    function verifyRender(model) {
        expect(model.ready).toBe(true);
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        model.show = true;
        model.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        model.show = false;
    }

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
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0));

       expect(texturedBoxModel.gltf).toBeDefined();
       expect(texturedBoxModel.basePath).toEqual('./Data/Models/Box-Textured/');
       expect(texturedBoxModel.show).toEqual(false);
       expect(texturedBoxModel.modelMatrix).toEqual(modelMatrix);
       expect(texturedBoxModel.scale).toEqual(1.0);
       expect(texturedBoxModel.minimumPixelSize).toEqual(0.0);
       expect(texturedBoxModel.id).toEqual(texturedBoxUrl);
       expect(texturedBoxModel.allowPicking).toEqual(true);
       expect(texturedBoxModel.activeAnimations).toBeDefined();
       expect(texturedBoxModel.ready).toEqual(true);
       expect(texturedBoxModel.asynchronous).toEqual(true);
       expect(texturedBoxModel.releaseGltfJson).toEqual(false);
       expect(texturedBoxModel.cacheKey).toEndWith('Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf');
       expect(texturedBoxModel.debugShowBoundingVolume).toEqual(false);
       expect(texturedBoxModel.debugWireframe).toEqual(false);
    });

    it('renders', function() {
        verifyRender(texturedBoxModel);
    });

    it('resolves readyPromise', function() {
        return texturedBoxModel.readyPromise.then(function(model) {
            verifyRender(model);
        });
    });

    it('renders from glTF', function() {
        // Simulate using procedural glTF as opposed to loading it from a file
        var model = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false
        }));
        addZoomTo(model);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return model.ready;
        }, { timeout: 10000 }).then(function() {
            verifyRender(model);
            primitives.remove(model);
        });
    });

    it('Applies the right render state', function() {
        // Simulate using procedural glTF as opposed to loading it from a file
        var model = primitives.add(new Model({
            gltf : texturedBoxModel.gltf
        }));

        spyOn(scene.context, 'createRenderState').and.callThrough();

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return model.ready;
        }, { timeout : 10000 }).then(function() {
            var rs = {
                frontFace : WebGLRenderingContext.CCW,
                cull : {
                    enabled : true,
                    face : WebGLRenderingContext.BACK
                },
                lineWidth : 1.0,
                polygonOffset : {
                    enabled : false,
                    factor : 0.0,
                    units : 0.0
                },
                scissorTest : {
                    enabled : false,
                    rectangle : {
                        x : 0.0,
                        y : 0.0,
                        width : 0.0,
                        height : 0.0
                    }
                },
                depthRange : {
                    near : 0.0,
                    far : 1.0
                },
                depthTest : {
                    enabled : true,
                    func : WebGLRenderingContext.LESS
                },
                colorMask : {
                    red : true,
                    green : true,
                    blue : true,
                    alpha : true
                },
                depthMask : true,
                blending : {
                    enabled : false,
                    color : {
                        red : 0.0,
                        green : 0.0,
                        blue : 0.0,
                        alpha : 0.0
                    },
                    equationRgb : WebGLRenderingContext.FUNC_ADD,
                    equationAlpha : WebGLRenderingContext.FUNC_ADD,
                    functionSourceRgb : WebGLRenderingContext.ONE,
                    functionSourceAlpha : WebGLRenderingContext.ONE,
                    functionDestinationRgb : WebGLRenderingContext.ZERO,
                    functionDestinationAlpha : WebGLRenderingContext.ZERO
                }
            };

            expect(scene.context.createRenderState).toHaveBeenCalledWith(rs);
            primitives.remove(model);
        });
    });

    it('renders bounding volume', function() {
        texturedBoxModel.debugShowBoundingVolume = true;
        verifyRender(texturedBoxModel);
        texturedBoxModel.debugShowBoundingVolume = false;
    });

    it('renders in wireframe', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        texturedBoxModel.show = true;
        texturedBoxModel.debugWireframe = true;
        texturedBoxModel.zoomTo();
        scene.renderForSpecs();

        var commands = texturedBoxModel._nodeCommands;
        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            expect(commands[i].command.primitiveType).toEqual(PrimitiveType.LINES);
        }

        texturedBoxModel.show = false;
        texturedBoxModel.debugWireframe = false;
    });

    it('getNode throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getNode('gltf-node-name');
        }).toThrowDeveloperError();
    });

    it('getNode throws when name is not provided', function() {
        expect(function() {
            return texturedBoxModel.getNode();
        }).toThrowDeveloperError();
    });

    it('getNode returns undefined when node does not exist', function() {
        expect(texturedBoxModel.getNode('name-of-node-that-does-not-exist')).not.toBeDefined();
    });

    it('getNode returns a node', function() {
        var node = texturedBoxModel.getNode('Mesh');
        expect(node).toBeDefined();
        expect(node.name).toEqual('Mesh');
        expect(node.id).toEqual('Geometry-mesh002Node');
        expect(node.show).toEqual(true);

        // Change node transform and render
        expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(false);
        node.matrix = Matrix4.fromUniformScale(1.01, new Matrix4());
        expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(true);

        verifyRender(texturedBoxModel);

        expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(false);

        node.matrix = Matrix4.fromUniformScale(1.0, new Matrix4());
    });

    it('getMesh throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getMesh('gltf-mesh-name');
        }).toThrowDeveloperError();
    });

    it('getMesh throws when name is not provided', function() {
        expect(function() {
            return texturedBoxModel.getMesh();
        }).toThrowDeveloperError();
    });

    it('getMesh returns undefined when mesh does not exist', function() {
        expect(texturedBoxModel.getMesh('name-of-mesh-that-does-not-exist')).not.toBeDefined();
    });

    it('getMesh returns returns a mesh', function() {
        var mesh = texturedBoxModel.getMesh('Mesh');
        expect(mesh).toBeDefined();
        expect(mesh.name).toEqual('Mesh');
        expect(mesh.id).toEqual('Geometry-mesh002');
        expect(mesh.materials[0].name).toEqual('Texture');
    });

    it('getMaterial throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.getMaterial('gltf-material-name');
        }).toThrowDeveloperError();
    });

    it('getMaterial throws when name is not provided', function() {
        expect(function() {
            return texturedBoxModel.getMaterial();
        }).toThrowDeveloperError();
    });

    it('getMaterial returns undefined when mesh does not exist', function() {
        expect(texturedBoxModel.getMaterial('name-of-material-that-does-not-exist')).not.toBeDefined();
    });

    it('getMaterial returns returns a material', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(material).toBeDefined();
        expect(material.name).toEqual('Texture');
        expect(material.id).toEqual('Effect-Texture');
    });

    it('ModelMaterial.setValue throws when name is not provided', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(function() {
            material.setValue();
        }).toThrowDeveloperError();
    });

    it('ModelMaterial.setValue sets a scalar parameter', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        material.setValue('shininess', 12.34);
        expect(material.getValue('shininess')).toEqual(12.34);
    });

    it('ModelMaterial.setValue sets a Cartesian4 parameter', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        var specular = new Cartesian4(0.25, 0.5, 0.75, 1.0);
        material.setValue('specular', specular);
        expect(material.getValue('specular')).toEqual(specular);
    });

    it('ModelMaterial.getValue throws when name is not provided', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(function() {
            material.getValue();
        }).toThrowDeveloperError();
    });

    it('ModelMaterial.getValue returns undefined when parameter does not exist', function() {
        var material = texturedBoxModel.getMaterial('Texture');
        expect(material.getValue('name-of-parameter-that-does-not-exist')).not.toBeDefined();
    });

    it('boundingSphere throws when model is not loaded', function() {
        var m = new Model();
        expect(function() {
            return m.boundingSphere;
        }).toThrowDeveloperError();
    });

    it('boundingSphere returns the bounding sphere', function() {
        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, -0.25, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(0.75, CesiumMath.EPSILON3);
    });

    it('boundingSphere returns the bounding sphere when scale property is set', function() {
        var originalScale = texturedBoxModel.scale;
        texturedBoxModel.scale = 10;

        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, -2.5, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(7.5, CesiumMath.EPSILON3);

        texturedBoxModel.scale = originalScale;
    });

    it('boundingSphere returns the bounding sphere when modelMatrix has non-uniform scale', function() {
        var originalMatrix = Matrix4.clone(texturedBoxModel.modelMatrix);
        Matrix4.multiplyByScale(texturedBoxModel.modelMatrix, new Cartesian3(2, 5, 10), texturedBoxModel.modelMatrix);

        var boundingSphere = texturedBoxModel.boundingSphere;
        expect(boundingSphere.center).toEqualEpsilon(new Cartesian3(0.0, -1.25, 0.0), CesiumMath.EPSILON3);
        expect(boundingSphere.radius).toEqualEpsilon(7.5, CesiumMath.EPSILON3);

        texturedBoxModel.modelMatrix = originalMatrix;
    });

    it('destroys', function() {
        return loadModel(boxUrl).then(function(m) {
            expect(m.isDestroyed()).toEqual(false);
            primitives.remove(m);
            expect(m.isDestroyed()).toEqual(true);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('renders texturedBoxCustom (all uniform semantics)', function() {
        return loadModel(texturedBoxCustomUrl).then(function(m) {
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

            m.show = true;
            m.zoomTo();
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
            primitives.remove(m);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('renders textured box with external resources: .glsl, .bin, and .png files', function() {
        return loadModel(texturedBoxSeparateUrl).then(function(m) {
            expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

            m.show = true;
            m.zoomTo();
            expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

            primitives.remove(m);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('loads cesiumAir', function() {
        expect(cesiumAirModel.minimumPixelSize).toEqual(1);
        expect(cesiumAirModel.asynchronous).toEqual(false);
    });

    it('renders cesiumAir (has translucency)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
        cesiumAirModel.show = false;
    });

    it('renders cesiumAir with per-node show (root)', function() {
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        var commands = cesiumAirModel._nodeCommands;
        var i;
        var length;

        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        cesiumAirModel.getNode('Cesium_Air').show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        length = commands.length;
        for (i = 0; i < length; ++i) {
            expect(commands[i].show).toEqual(false);
        }

        cesiumAirModel.getNode('Cesium_Air').show = true;
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);

        length = commands.length;
        for (i = 0; i < length; ++i) {
            expect(commands[i].show).toEqual(true);
        }

        cesiumAirModel.show = false;
    });

    it('renders cesiumAir with per-node show (non-root)', function() {
        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var commands = cesiumAirModel._nodeCommands;
        var i;
        var length;

        var commandsPropFalse = 0;
        var commandsPropTrue = 0;

        cesiumAirModel.getNode('Prop').show = false;
        scene.renderForSpecs();

        length = commands.length;
        for (i = 0; i < length; ++i) {
            commandsPropFalse += commands[i].show ? 1 : 0;
        }

        cesiumAirModel.getNode('Prop').show = true;
        scene.renderForSpecs();

        length = commands.length;
        for (i = 0; i < length; ++i) {
            commandsPropTrue += commands[i].show ? 1 : 0;
        }

        cesiumAirModel.show = false;

        // Prop node has one mesh with two primitives
        expect(commandsPropFalse).toEqual(commandsPropTrue - 2);
    });

    it('picks cesiumAir', function() {
        if (FeatureDetection.isInternetExplorer()) {
            // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
            return;
        }

        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(cesiumAirModel);
        expect(pick.id).toEqual(cesiumAirUrl);
        expect(pick.node).toBeDefined();
        expect(pick.mesh).toBeDefined();

        cesiumAirModel.show = false;
    });

    it('cesiumAir is picked with a new pick id', function() {
        if (FeatureDetection.isInternetExplorer()) {
            // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
            return;
        }

        var oldId = cesiumAirModel.id;
        cesiumAirModel.id = 'id';
        cesiumAirModel.show = true;
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick.primitive).toEqual(cesiumAirModel);
        expect(pick.id).toEqual('id');

        cesiumAirModel.id = oldId;
        cesiumAirModel.show = false;
    });

    it('cesiumAir is not picked (show === false)', function() {
        cesiumAirModel.zoomTo();

        var pick = scene.pick(new Cartesian2(0, 0));
        expect(pick).not.toBeDefined();
    });

    ///////////////////////////////////////////////////////////////////////////

    it('renders animBoxes without animation', function() {
        verifyRender(animBoxesModel);
    });

    it('adds and removes all animations', function() {
        var animations = animBoxesModel.activeAnimations;
        expect(animations.length).toEqual(0);

        var spyAdd = jasmine.createSpy('listener');
        animations.animationAdded.addEventListener(spyAdd);
        var a = animations.addAll();
        expect(animations.length).toEqual(2);
        expect(spyAdd.calls.count()).toEqual(2);
        expect(spyAdd.calls.argsFor(0)[0]).toBe(animBoxesModel);
        expect(spyAdd.calls.argsFor(0)[1]).toBe(a[0]);
        expect(spyAdd.calls.argsFor(1)[0]).toBe(animBoxesModel);
        expect(spyAdd.calls.argsFor(1)[1]).toBe(a[1]);
        animations.animationAdded.removeEventListener(spyAdd);

        expect(animations.contains(a[0])).toEqual(true);
        expect(animations.get(0)).toEqual(a[0]);
        expect(animations.contains(a[1])).toEqual(true);
        expect(animations.get(1)).toEqual(a[1]);

        var spyRemove = jasmine.createSpy('listener');
        animations.animationRemoved.addEventListener(spyRemove);
        animations.removeAll();
        expect(animations.length).toEqual(0);
        expect(spyRemove.calls.count()).toEqual(2);
        expect(spyRemove.calls.argsFor(0)[0]).toBe(animBoxesModel);
        expect(spyRemove.calls.argsFor(0)[1]).toBe(a[0]);
        expect(spyRemove.calls.argsFor(1)[0]).toBe(animBoxesModel);
        expect(spyRemove.calls.argsFor(1)[1]).toBe(a[1]);
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
        expect(a.delay).toEqual(0.0);
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

        return pollToPromise(function() {
            scene.renderForSpecs(time);
            time = JulianDate.addSeconds(time, 1.0, time, new JulianDate());
            return stopped;
        }, { timeout : 10000 }).then(function() {
            expect(spyStart).toHaveBeenCalledWith(animBoxesModel, a);

            expect(spyUpdate.calls.count()).toEqual(4);
            expect(spyUpdate.calls.argsFor(0)[0]).toBe(animBoxesModel);
            expect(spyUpdate.calls.argsFor(0)[1]).toBe(a);
            expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON14);
            expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON14);

            expect(spyStop).toHaveBeenCalledWith(animBoxesModel, a);
            expect(animations.length).toEqual(0);
            animBoxesModel.show = false;
        });
    });

    it('Animates with a delay', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));

        var animations = animBoxesModel.activeAnimations;
        var a = animations.add({
            name : 'animation_1',
            startTime : time,
            delay : 1.0
        });

        var spyStart = jasmine.createSpy('listener');
        a.start.addEventListener(spyStart);

        animBoxesModel.show = true;
        scene.renderForSpecs(time); // Does not fire start
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));

        expect(spyStart.calls.count()).toEqual(1);

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
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate())); // Does not fire update

        expect(spyUpdate.calls.count()).toEqual(2);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON14);
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
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));

        expect(spyUpdate.calls.count()).toEqual(3);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON14);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.5, CesiumMath.EPSILON14);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON14);
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
        scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));
        scene.renderForSpecs(JulianDate.addSeconds(time, 3.0, new JulianDate()));

        expect(spyUpdate.calls.count()).toEqual(4);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(3.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(2.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(1.708, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(0.708, CesiumMath.EPSILON3);
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
            scene.renderForSpecs(JulianDate.addSeconds(time, i, new JulianDate()));
        }

        expect(spyUpdate.calls.count()).toEqual(8);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(0.291, CesiumMath.EPSILON3); // Repeat with duration of ~3.7
        expect(spyUpdate.calls.argsFor(5)[2]).toEqualEpsilon(1.291, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(6)[2]).toEqualEpsilon(2.291, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(7)[2]).toEqualEpsilon(3.291, CesiumMath.EPSILON3);
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
            scene.renderForSpecs(JulianDate.addSeconds(time, i, new JulianDate()));
        }

        expect(spyUpdate.calls.count()).toEqual(8);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(2.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(3.0, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(3.416, CesiumMath.EPSILON3); // Mirror repeat with duration of 3.6
        expect(spyUpdate.calls.argsFor(5)[2]).toEqualEpsilon(2.416, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(6)[2]).toEqualEpsilon(1.416, CesiumMath.EPSILON3);
        expect(spyUpdate.calls.argsFor(7)[2]).toEqualEpsilon(0.416, CesiumMath.EPSILON3);
        expect(animations.remove(a)).toEqual(true);
        animBoxesModel.show = false;
    });

    it('Animates and renders', function() {
        return loadModel(animBoxesUrl, {
            scale : 2.0
        }).then(function(m) {
            var node = m.getNode('inner_box');
            var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
            var animations = m.activeAnimations;
            var a = animations.add({
                name : 'animation_1',
                startTime : time
            });

            expect(node.matrix).toEqual(Matrix4.IDENTITY);
            var previousMatrix = Matrix4.clone(node.matrix);

            m.zoomTo();

            for (var i = 1; i < 4; ++i) {
                var t = JulianDate.addSeconds(time, i, new JulianDate());
                expect(scene.renderForSpecs(t)).toEqual([0, 0, 0, 255]);

                m.show = true;
                expect(scene.renderForSpecs(t)).not.toEqual([0, 0, 0, 255]);
                m.show = false;

                expect(node.matrix).not.toEqual(previousMatrix);
                previousMatrix = Matrix4.clone(node.matrix);
            }

            expect(animations.remove(a)).toEqual(true);
            primitives.remove(m);
        });
    });

    ///////////////////////////////////////////////////////////////////////////

    it('renders riggedFigure without animation', function() {
        verifyRender(riggedFigureModel);
    });

    it('renders riggedFigure with animation (skinning)', function() {
        var time = JulianDate.fromDate(new Date('January 1, 2014 12:00:00 UTC'));
        var animations = riggedFigureModel.activeAnimations;
        animations.addAll({
            startTime : time
        });

        riggedFigureModel.zoomTo();

        for (var i = 0; i < 6; ++i) {
            var t = JulianDate.addSeconds(time, 0.25 * i, new JulianDate());
            expect(scene.renderForSpecs(t)).toEqual([0, 0, 0, 255]);

            riggedFigureModel.show = true;
            expect(scene.renderForSpecs(t)).not.toEqual([0, 0, 0, 255]);
            riggedFigureModel.show = false;
        }

        animations.removeAll();
        riggedFigureModel.show = false;
    });

    it('should load a model where WebGL shader optimizer removes an attribute (linux)', function() {
        var url = './Data/Models/test-shader-optimize/test-shader-optimize.gltf';
        var m = loadModel(url);
    });

    it('releaseGltfJson releases glTFJSON when constructed with fromGltf', function() {
        return loadModel(boxUrl, {
            releaseGltfJson : true
        }).then(function(m) {
            expect(m.releaseGltfJson).toEqual(true);
            expect(m.gltf).not.toBeDefined();

            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('releaseGltfJson releases glTF JSON when constructed with Model constructor function', function() {
        var m = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            releaseGltfJson : true,
            asynchronous : true
        }));
        addZoomTo(m);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return m.ready;
        }, { timeout : 10000 }).then(function() {
            expect(m.releaseGltfJson).toEqual(true);
            expect(m.gltf).not.toBeDefined();

            verifyRender(m);
            primitives.remove(m);
        });
    });

    it('Models are cached with fromGltf (1/2)', function() {
        var key = 'a-cache-key';

        // This cache for this model is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();

        var modelRendererResourceCache = scene.context.cache.modelRendererResourceCache;
        expect(modelRendererResourceCache[key]).not.toBeDefined();

        // Use a custom cache key to avoid conflicting with previous tests
        var promise = loadModel(boxUrl, {
            cacheKey : key
        });

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(false);

        // This is a cache hit, but the JSON request is still pending.
        // In the test below, the cache hit occurs after the request completes.
        var promise2 = loadModel(boxUrl, {
            cacheKey : key
        });

        expect(gltfCache[key].count).toEqual(2);

        return when.all([promise, promise2], function(models) {
            var m = models[0];
            var m2 = models[1];

            // Render scene to progressively load the model
            scene.renderForSpecs();

            // glTF JSON cache set ready once the JSON was downloaded
            expect(gltfCache[key].ready).toEqual(true);

            expect(modelRendererResourceCache[key]).toBeDefined();
            expect(modelRendererResourceCache[key].count).toEqual(2);
            expect(modelRendererResourceCache[key].ready).toEqual(true);

            verifyRender(m);
            verifyRender(m2);

            primitives.remove(m);
            expect(gltfCache[key].count).toEqual(1);
            expect(modelRendererResourceCache[key].count).toEqual(1);

            primitives.remove(m2);
            expect(gltfCache[key]).not.toBeDefined();
            expect(modelRendererResourceCache[key]).not.toBeDefined();
        });
    });

    it('Models are cached with fromGltf (2/2)', function() {
        var key = 'a-cache-key';

        // This cache for this model is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();

        // Use a custom cache key to avoid conflicting with previous tests
        var promise = loadModel(boxUrl, {
            cacheKey : key
        });
        var m2;

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(false);

        return promise.then(function(m) {
            // Render scene to progressively load the model
            scene.renderForSpecs();

            // Cache hit after JSON request completed.
            var m2;
            loadModel(boxUrl, {
                cacheKey : key
            }).then(function(model) {
                m2 = model;
            });

            expect(gltfCache[key].ready).toEqual(true);
            expect(gltfCache[key].count).toEqual(2);

            verifyRender(m);
            verifyRender(m2);

            primitives.remove(m);
            expect(gltfCache[key].count).toEqual(1);

            primitives.remove(m2);
            expect(gltfCache[key]).not.toBeDefined();
        });
    });

    it('Cache with a custom cacheKey the Model Constructor (1/2)', function() {
        var key = 'a-cache-key';

        // This cache for this model is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();

        var modelRendererResourceCache = scene.context.cache.modelRendererResourceCache;
        expect(modelRendererResourceCache[key]).not.toBeDefined();

        var m = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key,
            asynchronous : true
        }));
        addZoomTo(m);

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(true);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();

            expect(modelRendererResourceCache[key]).toBeDefined();
            expect(modelRendererResourceCache[key].count).toEqual(1);
            expect(modelRendererResourceCache[key].ready).toEqual(m.ready);

            return m.ready;
        }, { timeout : 10000 }).then(function() {
            verifyRender(m);

            primitives.remove(m);
            expect(gltfCache[key]).not.toBeDefined();
            expect(modelRendererResourceCache[key]).not.toBeDefined();
        });
    });

    it('Cache with a custom cacheKey when using the Model Constructor (2/2)', function() {
        var key = 'a-cache-key';
        var key3 = 'another-cache-key';

        // This cache for these keys is initially empty
        var gltfCache = Model._gltfCache;
        expect(gltfCache[key]).not.toBeDefined();
        expect(gltfCache[key3]).not.toBeDefined();

        var modelRendererResourceCache = scene.context.cache.modelRendererResourceCache;
        expect(modelRendererResourceCache[key]).not.toBeDefined();
        expect(modelRendererResourceCache[key3]).not.toBeDefined();

        var m = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key,
            asynchronous : true
        }));
        addZoomTo(m);

        expect(gltfCache[key]).toBeDefined();
        expect(gltfCache[key].count).toEqual(1);
        expect(gltfCache[key].ready).toEqual(true);

        // Should be cache hit.  Not need to provide glTF.
        var m2 = primitives.add(new Model({
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key,
            asynchronous : true
        }));
        addZoomTo(m2);

        expect(gltfCache[key].count).toEqual(2);

        // Should be cache miss.
        var m3 = primitives.add(new Model({
            gltf : texturedBoxModel.gltf,
            modelMatrix : Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(0.0, 0.0, 100.0)),
            show : false,
            cacheKey : key3,
            asynchronous : true
        }));
        addZoomTo(m3);

        expect(gltfCache[key3]).toBeDefined();
        expect(gltfCache[key3].count).toEqual(1);
        expect(gltfCache[key3].ready).toEqual(true);

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();

            if (m.ready && m2.ready && m3.ready) {
                expect(modelRendererResourceCache[key]).toBeDefined();
                expect(modelRendererResourceCache[key].count).toEqual(2);

                expect(modelRendererResourceCache[key3]).toBeDefined();
                expect(modelRendererResourceCache[key3].count).toEqual(1);

                return true;
            }

            return false;
        }, { timeout : 10000 }).then(function() {
            verifyRender(m);
            verifyRender(m2);
            verifyRender(m3);

            primitives.remove(m);
            primitives.remove(m2);
            expect(gltfCache[key]).not.toBeDefined();
            expect(modelRendererResourceCache[key]).not.toBeDefined();

            primitives.remove(m3);
            expect(gltfCache[key3]).not.toBeDefined();
            expect(modelRendererResourceCache[key3]).not.toBeDefined();
        });
    });

}, 'WebGL');