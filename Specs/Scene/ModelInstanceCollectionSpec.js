defineSuite([
        'Scene/ModelInstanceCollection',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Core/HeadingPitchRange',
        'Core/HeadingPitchRoll',
        'Core/JulianDate',
        'Core/Matrix4',
        'Core/PrimitiveType',
        'Core/Resource',
        'Core/Transforms',
        'Scene/Model',
        'Scene/ShadowMode',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        ModelInstanceCollection,
        BoundingSphere,
        Cartesian3,
        defaultValue,
        HeadingPitchRange,
        HeadingPitchRoll,
        JulianDate,
        Matrix4,
        PrimitiveType,
        Resource,
        Transforms,
        Model,
        ShadowMode,
        createScene,
        pollToPromise,
        when) {
    'use strict';

    var boxUrl = './Data/Models/Box/CesiumBoxTest.gltf';
    var cesiumAirUrl = './Data/Models/CesiumAir/Cesium_Air.gltf';
    var riggedFigureUrl = './Data/Models/rigged-figure-test/rigged-figure-test.gltf';
    var movingBoxUrl = './Data/Models/moving-box/moving-box.gltf';

    var scene;
    var boxRadius;

    beforeAll(function() {
        scene = createScene();

        return loadModel(boxUrl).then(function(model) {
            boxRadius = model.boundingSphere.radius;
            scene.primitives.remove(model);
        });
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function loadModel(url) {
        var model = scene.primitives.add(Model.fromGltf({
            url : url
        }));

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return model.ready;
        }).then(function() {
            return model;
        });
    }

    function loadCollection(options) {
        var collection = scene.primitives.add(new ModelInstanceCollection(options));

        return pollToPromise(function() {
            // Render scene to progressively load the model
            scene.renderForSpecs();
            return collection.ready;
        }).then(function() {
            zoomTo(collection, 0);
            return collection;
        });
    }

    function createInstances(count, heightOffset) {
        heightOffset = defaultValue(heightOffset, 0.0);

        var spacing = 20.0;
        var centerLongitude = -123.0744619;
        var centerLatitude = 44.0503706;
        var height = 5000.0 + heightOffset;

        var instances = [];
        for (var i = 0; i < count; ++i) {
            var instanceHeight = height + spacing * i;
            var position = Cartesian3.fromDegrees(centerLongitude, centerLatitude, instanceHeight);
            var heading = Math.PI/2.0;
            var pitch = 0.0;
            var roll = 0.0;
            var hpr = new HeadingPitchRoll(heading, pitch, roll);
            var modelMatrix = Transforms.headingPitchRollToFixedFrame(position, hpr);
            instances.push({
                modelMatrix : modelMatrix
            });
        }

        return instances;
    }

    function getBoundingSphere(instances, modelRadius) {
        var length = instances.length;
        var points = new Array(length);
        for (var i = 0; i < length; ++i) {
            var translation = new Cartesian3();
            Matrix4.getTranslation(instances[i].modelMatrix, translation);
            points[i] = translation;
        }
        var boundingSphere = new BoundingSphere();
        BoundingSphere.fromPoints(points, boundingSphere);
        boundingSphere.radius += modelRadius;
        return boundingSphere;
    }

    var centerScratch = new Cartesian3();

    function zoomTo(collection, instance) {
        var center = Matrix4.getTranslation(collection._instances[instance].modelMatrix, centerScratch);
        var camera = scene.camera;
        camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, 10.0));
    }

    function expectRender(collection, expectColor, time) {
        expectColor = defaultValue(expectColor, true);

        collection.show = false;
        expect(scene).toRender([0, 0, 0, 255]);
        collection.show = true;

        // Verify each instance
        var length = collection.length;
        for (var i = 0; i < length; ++i) {
            zoomTo(collection, i);
            if (expectColor) {
                expect({
                    scene : scene,
                    time : time
                }).notToRender([0, 0, 0, 255]);
            } else {
                expect({
                    scene : scene,
                    time : time
                }).toRender([0, 0, 0, 255]);
            }
        }
    }

    function verifyPickedInstance(collection, instanceId) {
        return function(result) {
            expect(result.primitive).toBe(collection);
            expect(result.modelMatrix).toBeDefined();
            expect(result.instanceId).toBe(instanceId);
            expect(result.model).toBe(collection._model);
        };
    }

    function expectPick(collection) {
        collection.show = false;
        expect(scene).notToPick();
        collection.show = true;

        // Verify each instance
        var length = collection.length;
        for (var i = 0; i < length; ++i) {
            zoomTo(collection, i);
            expect(scene).toPickAndCall(verifyPickedInstance(collection, i));
        }
    }

    it('throws if neither options.gltf nor options.url are provided', function() {
        expect(function() {
            return new ModelInstanceCollection();
        }).toThrowDeveloperError();
    });

    it('throws when both options.gltf and options.url are provided', function() {
        return loadModel(boxUrl).then(function(model) {
            expect(function() {
                return new ModelInstanceCollection({
                    url: boxUrl,
                    gltf: model.gltf
                });
            }).toThrowDeveloperError();
        });
    });

    it('sets properties', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expect(collection.ready).toEqual(true);
            expect(collection.show).toEqual(true);
            expect(collection.allowPicking).toEqual(true);
            expect(collection.length).toEqual(4);
            expect(collection.debugShowBoundingVolume).toEqual(false);
            expect(collection.debugWireframe).toEqual(false);
            expect(collection._dynamic).toEqual(false);
            expect(collection._cull).toEqual(true);
            expect(collection._model).toBeDefined();
            expect(collection._model.ready).toEqual(true);

            if (collection._instancingSupported) {
                expect(collection._model.cacheKey).toEqual(boxUrl + '#instanced');
            }
        });
    });

    it('renders from url', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('renders from Resource', function() {
        var resource = new Resource({
            url : boxUrl
        });

        return loadCollection({
            url : resource,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('renders from gltf', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('resolves readyPromise', function() {
        var collection = scene.primitives.add(new ModelInstanceCollection({
            url : boxUrl,
            instances : createInstances(4)
        }));

        return pollToPromise(function() {
            scene.renderForSpecs();
            return collection._model.ready;
        }).then(function() {
            scene.renderForSpecs();
            scene.renderForSpecs();
            return collection.readyPromise.then(function(collection) {
                expect(collection.ready).toEqual(true);
            });
        });
    });

    it('rejects readyPromise on error', function() {
        // Expect promise to be rejected in Model, then in ModelInstanceCollection.
        var collection = scene.primitives.add(new ModelInstanceCollection({
            url : 'invalid.gltf',
            instances : createInstances(4)
        }));

        collection.update(scene.frameState);

        return collection.readyPromise.then(function(collection) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(collection.ready).toEqual(false);
        });
    });

    it('renders one instance', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(1)
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('renders zero instances', function() {
        var collection = scene.primitives.add(new ModelInstanceCollection({
            url : boxUrl,
            instances : createInstances(0)
        }));

        // Collection never reaches the ready state due to returning early
        for (var i = 0; i < 10; ++i) {
            expectRender(collection, false);
            expect(collection.ready).toBe(false);
        }
    });

    it('renders 100 instances', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(100)
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('renders cesiumAir', function() {
        return loadCollection({
            url : cesiumAirUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('renders rigged figure', function() {
        return loadCollection({
            url : riggedFigureUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            console.log(collection);
            expectRender(collection);
        });
    });

    it('renders when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadCollection({
            url: boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('renders when dynamic is true', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4),
            dynamic : true
        }).then(function(collection) {
            expectRender(collection);
        });
    });

    it('verify bounding volume', function() {
        var instances = createInstances(4);
        return loadCollection({
            url : boxUrl,
            instances : instances
        }).then(function(collection) {
            var boundingSphere = getBoundingSphere(instances, boxRadius);
            expect(collection._boundingSphere.center).toEqual(boundingSphere.center);
            expect(collection._boundingSphere.radius).toEqual(boundingSphere.radius);
        });
    });

    it('renders bounding volume', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            collection.debugShowBoundingVolume = true;
            expectRender(collection);
        });
    });

    it('renders in wireframe', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            collection.debugWireframe = true;
            scene.renderForSpecs();
            expect(collection._drawCommands[0].primitiveType).toEqual(PrimitiveType.LINES);
        });
    });

    it('renders with animations', function() {
        // Test that all instances are being animated.
        // The moving box is in view on frame 1 and out of view by frame 5.
        return loadCollection({
            url : movingBoxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            collection.activeAnimations.addAll();

            // Render when animation is in view
            var time = JulianDate.now();
            expectRender(collection, true, time);

            // Render when animation is out of view
            time = JulianDate.addSeconds(time, 0.1, new JulianDate());
            expectRender(collection, false, time);
        });
    });

    it('renders with animations when instancing is disabled', function() {
        // Instance transforms are updated differently when instancing is disabled

        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadCollection({
            url : movingBoxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            collection.activeAnimations.addAll();

            // Render when animation is in view
            var time = JulianDate.now();
            expectRender(collection, true, time);

            // Render when animation is out of view
            time = JulianDate.addSeconds(time, 0.1, new JulianDate());
            expectRender(collection, false, time);

            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('renders two model instance collections that use the same cache key', function() {
        var collections = [];
        var promises = [];

        promises.push(loadCollection({
            url : boxUrl,
            instances : createInstances(2)
        }).then(function(collection) {
            collections.push(collection);
        }));

        promises.push(loadCollection({
            url : boxUrl,
            instances : createInstances(2, 1000.0)
        }).then(function(collection) {
            collections.push(collection);
        }));

        return when.all(promises).then(function() {
            var resourcesFirst = collections[0]._model._rendererResources;
            var resourcesSecond = collections[1]._model._rendererResources;
            var name;

            expect(collections[0]._model.cacheKey).toEqual(collections[1]._model.cacheKey);
            zoomTo(collections[0], 0);
            expectRender(collections[0]);
            zoomTo(collections[1], 0);
            expectRender(collections[1]);

            // Check that buffers are equal
            for (name in resourcesFirst.buffers) {
                if (resourcesFirst.buffers.hasOwnProperty(name)) {
                    expect(resourcesFirst.buffers[name]).toEqual(resourcesSecond.buffers[name]);
                }
            }

            // Check that programs are equal
            for (name in resourcesFirst.programs) {
                if (resourcesFirst.programs.hasOwnProperty(name)) {
                    expect(resourcesFirst.programs[name]).toEqual(resourcesSecond.programs[name]);
                }
            }

            if (collections[0]._instancingSupported) {
                // Check that vertex arrays are different, since each collection has a unique vertex buffer for instanced attributes.
                for (name in resourcesFirst.vertexArrays) {
                    if (resourcesFirst.vertexArrays.hasOwnProperty(name)) {
                        expect(resourcesFirst.vertexArrays[name]).not.toEqual(resourcesSecond.vertexArrays[name]);
                    }
                }
            }
        });
    });

    it('culls when out of view and cull is true', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4),
            cull : true
        }).then(function(collection) {
            scene.renderForSpecs();
            expect(scene.frustumCommandsList.length).not.toEqual(0);
            scene.camera.lookAt(new Cartesian3(100000.0, 0.0, 0.0), new HeadingPitchRange(0.0, 0.0, 10.0));
            scene.renderForSpecs();
            expect(scene.frustumCommandsList.length).toEqual(0);
        });
    });

    it('does not cull when out of view and cull is false', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4),
            cull : false
        }).then(function(collection) {
            scene.renderForSpecs();
            expect(scene.frustumCommandsList.length).not.toEqual(0);
            scene.camera.lookAt(new Cartesian3(100000.0, 0.0, 0.0), new HeadingPitchRange(0.0, 0.0, 10.0));
            scene.renderForSpecs();
            expect(scene.frustumCommandsList.length).not.toEqual(0);
        });
    });

    it('shadows', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            scene.renderForSpecs();
            expect(collection._shadows).toBe(ShadowMode.ENABLED);
            var drawCommand = collection._drawCommands[0];
            expect(drawCommand.castShadows).toBe(true);
            expect(drawCommand.receiveShadows).toBe(true);
            collection.shadows = ShadowMode.DISABLED;
            scene.renderForSpecs();

            // Expect commands to have been recreated
            drawCommand = collection._drawCommands[0];
            expect(drawCommand.castShadows).toBe(false);
            expect(drawCommand.receiveShadows).toBe(false);
        });
    });

    it('picks', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectPick(collection);
        });
    });

    it('picks when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectPick(collection);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('moves instance', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expect(scene).toPickAndCall(function(result) {
                var originalMatrix = result.modelMatrix;
                result.modelMatrix = Matrix4.IDENTITY;
                expect(scene).notToPick();
                result.modelMatrix = originalMatrix;
                expect(scene).toPickPrimitive(collection);
            });
        });
    });

    it('moves instance when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expect(scene).toPickAndCall(function(result) {
                var originalMatrix = result.modelMatrix;
                var originalRadius = collection._boundingSphere.radius;
                result.modelMatrix = Matrix4.IDENTITY;
                expect(scene).notToPick();
                expect(collection._boundingSphere.radius).toBeGreaterThan(originalRadius);
                result.modelMatrix = originalMatrix;
                expect(scene).toPickPrimitive(collection);
            });
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('renders in 2D', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
            scene.morphTo2D(0.0);
            expectRender(collection);
        });
    });

    it('renders in 2D when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
            scene.morphTo2D(0.0);
            expectRender(collection);

            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('renders in CV', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
            scene.morphToColumbusView(0.0);
            expectRender(collection);
        });
    });

    it('renders in CV when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expectRender(collection);
            scene.morphToColumbusView(0.0);
            expectRender(collection);

            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('does not render during morph', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4),
            cull : false
        }).then(function() {
            var commandList = scene.frameState.commandList;
            scene.renderForSpecs();
            expect(commandList.length).toBeGreaterThan(0);
            scene.morphToColumbusView(1.0);
            scene.renderForSpecs();
            expect(commandList.length).toBe(0);
        });
    });

    it('destroys', function() {
        return loadCollection({
            url : boxUrl,
            instances : createInstances(4)
        }).then(function(collection) {
            expect(collection.isDestroyed()).toEqual(false);
            scene.primitives.remove(collection);
            expect(collection.isDestroyed()).toEqual(true);
        });
    });

}, 'WebGL');
