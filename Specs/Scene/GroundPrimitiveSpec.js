/*global defineSuite*/
defineSuite([
        'Scene/GroundPrimitive',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/destroyObject',
        'Core/DistanceDisplayConditionGeometryInstanceAttribute',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/HeadingPitchRange',
        'Core/Math',
        'Core/PolygonGeometry',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/ShowGeometryInstanceAttribute',
        'Renderer/Pass',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        GroundPrimitive,
        Color,
        ColorGeometryInstanceAttribute,
        destroyObject,
        DistanceDisplayConditionGeometryInstanceAttribute,
        Ellipsoid,
        GeometryInstance,
        HeadingPitchRange,
        CesiumMath,
        PolygonGeometry,
        Rectangle,
        RectangleGeometry,
        ShowGeometryInstanceAttribute,
        Pass,
        PerInstanceColorAppearance,
        Primitive,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var context;

    var ellipsoid;
    var rectangle;

    var depthColor;
    var rectColor;

    var rectangleInstance;
    var primitive;
    var depthPrimitive;

    beforeAll(function() {
        scene = createScene();
        scene.fxaa = false;

        context = scene.context;

        ellipsoid = Ellipsoid.WGS84;
        return GroundPrimitive.initializeTerrainHeights();
    });

    afterAll(function() {
        scene.destroyForSpecs();

        // Leave ground primitive uninitialized
        GroundPrimitive._initialized = false;
        GroundPrimitive._initPromise = undefined;
        GroundPrimitive._terrainHeights = undefined;
    });

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
    }
    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = Pass.GLOBE;
        }
    };

    MockGlobePrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockGlobePrimitive.prototype.destroy = function() {
        this._primitive.destroy();
        return destroyObject(this);
    };

    beforeEach(function() {
        scene.morphTo3D(0);

        rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);

        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 1.0, 1.0));
        depthColor = depthColorAttribute.value;
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : ellipsoid,
                    rectangle : rectangle
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthPrimitive = new MockGlobePrimitive(primitive);

        var rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 0.0, 1.0));
        rectColor = rectColorAttribute.value;
        rectangleInstance = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : rectangle
            }),
            id : 'rectangle',
            attributes : {
                color : rectColorAttribute
            }
        });
    });

    afterEach(function() {
        scene.groundPrimitives.removeAll();
        primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
    });

    it('default constructs', function() {
        primitive = new GroundPrimitive();
        expect(primitive.geometryInstances).not.toBeDefined();
        expect(primitive.show).toEqual(true);
        expect(primitive.vertexCacheOptimize).toEqual(false);
        expect(primitive.interleave).toEqual(false);
        expect(primitive.compressVertices).toEqual(true);
        expect(primitive.releaseGeometryInstances).toEqual(true);
        expect(primitive.allowPicking).toEqual(true);
        expect(primitive.asynchronous).toEqual(true);
        expect(primitive.debugShowBoundingVolume).toEqual(false);
    });

    it('constructs with options', function() {
        var geometryInstances = [];

        primitive = new GroundPrimitive({
            geometryInstances : geometryInstances,
            show : false,
            vertexCacheOptimize : true,
            interleave : true,
            compressVertices : false,
            releaseGeometryInstances : false,
            allowPicking : false,
            asynchronous : false,
            debugShowBoundingVolume : true
        });

        expect(primitive.geometryInstances).toEqual(geometryInstances);
        expect(primitive.show).toEqual(false);
        expect(primitive.vertexCacheOptimize).toEqual(true);
        expect(primitive.interleave).toEqual(true);
        expect(primitive.compressVertices).toEqual(false);
        expect(primitive.releaseGeometryInstances).toEqual(false);
        expect(primitive.allowPicking).toEqual(false);
        expect(primitive.asynchronous).toEqual(false);
        expect(primitive.debugShowBoundingVolume).toEqual(true);
    });

    it('releases geometry instances when releaseGeometryInstances is true', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        scene.groundPrimitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstances).not.toBeDefined();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        scene.groundPrimitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstances).toBeDefined();
    });

    it('adds afterRender promise to frame state', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        scene.groundPrimitives.add(primitive);
        scene.renderForSpecs();

        return primitive.readyPromise.then(function(param) {
            expect(param.ready).toBe(true);
        });
    });

    it('does not render when geometryInstances is undefined', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : undefined,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.commandList.length = 0;

        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render when show is false', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        var frameState = scene.frameState;

        frameState.commandList.length = 0;
        primitive.update(frameState);
        expect(frameState.afterRender.length).toEqual(1);

        frameState.afterRender[0]();
        frameState.commandList.length = 0;
        primitive.update(frameState);
        expect(frameState.commandList.length).toBeGreaterThan(0);

        frameState.commandList.length = 0;
        primitive.show = false;
        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render other than for the color or pick pass', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.passes.render = false;
        frameState.passes.pick = false;

        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    function verifyGroundPrimitiveRender(primitive, color) {
        scene.camera.setView({ destination : rectangle });

        scene.groundPrimitives.add(depthPrimitive);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            expect(rgba[0]).toEqual(0);
        });

        scene.groundPrimitives.add(primitive);
        expect(scene).toRender(color);
    }

    it('renders in 3D', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it('renders in Columbus view when scene3DOnly is false', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        scene.morphToColumbusView(0);
        verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it('renders in 2D when scene3DOnly is false', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        scene.morphTo2D(0);
        verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it('renders batched instances', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        var rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        var rectangleInstance1 = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : new Rectangle(rectangle.west, rectangle.south, rectangle.east, (rectangle.north + rectangle.south) * 0.5)
            }),
            id : 'rectangle1',
            attributes : {
                color : rectColorAttribute
            }
        });
        var rectangleInstance2 = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : new Rectangle(rectangle.west, (rectangle.north + rectangle.south) * 0.5, rectangle.east, rectangle.north)
            }),
            id : 'rectangle2',
            attributes : {
                color : rectColorAttribute
            }
        });

        primitive = new GroundPrimitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            asynchronous : false
        });
        verifyGroundPrimitiveRender(primitive, rectColorAttribute.value);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false,
            debugShowBoundingVolume : true
        });

        scene.groundPrimitives.add(primitive);
        scene.camera.setView({ destination : rectangle });
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[2]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[3]).toEqual(255);
        });
    });

    it('renders shadow volume with debugShowShadowVolume', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false,
            debugShowShadowVolume : true
        });

        scene.groundPrimitives.add(primitive);
        scene.camera.setView({ destination : rectangle });
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[1]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[2]).toBeGreaterThanOrEqualTo(0);
            expect(rgba[3]).toEqual(255);
        });
    });

    it('get per instance attributes', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.color).toBeDefined();
    });

    it('modify color instance attribute', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var newColor = [255, 255, 255, 255];
        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.color).toBeDefined();
        attributes.color = newColor;

        verifyGroundPrimitiveRender(primitive, newColor);
    });

    it('modify show instance attribute', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        rectangleInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        verifyGroundPrimitiveRender(primitive, depthColor);
    });

    it('renders with distance display condition per instance attribute', function() {
        if (!context.floatingPointTexture) {
            return;
        }

        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        var near = 10000.0;
        var far = 1000000.0;
        var rect = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 0.0, 1.0, 1.0));
        depthColor = depthColorAttribute.value;
        var primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : ellipsoid,
                    rectangle : rectangle
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });

        // wrap rectangle primitive so it gets executed during the globe pass to lay down depth
        depthPrimitive = new MockGlobePrimitive(primitive);

        var rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 0.0, 1.0));
        var rectInstance = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : rectangle
            }),
            id : 'rect',
            attributes : {
                color : rectColorAttribute,
                distanceDisplayCondition : new DistanceDisplayConditionGeometryInstanceAttribute(near, far)
            }
        });

        primitive = new GroundPrimitive({
            geometryInstances : rectInstance,
            asynchronous : false
        });

        scene.groundPrimitives.add(depthPrimitive);
        scene.groundPrimitives.add(primitive);
        scene.camera.setView({ destination : rect });
        scene.renderForSpecs();

        var boundingSphere = primitive.getGeometryInstanceAttributes('rect').boundingSphere;
        var center = boundingSphere.center;
        var radius = boundingSphere.radius;

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius));
        expect(scene).toRender([0, 0, 255, 255]);

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near + 1.0));
        expect(scene).notToRender([0, 0, 255, 255]);

        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + far + 1.0));
        expect(scene).toRender([0, 0, 255, 255]);
    });

    it('get bounding sphere from per instance attribute', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.boundingSphere).toBeDefined();
    });

    it('getGeometryInstanceAttributes returns same object each time', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        var attributes2 = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes).toBe(attributes2);
    });

    it('picking', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.id).toEqual('rectangle');
        });
    });

    it('does not pick when allowPicking is false', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            allowPicking : false,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(scene).notToPick();
    });

    it('internally invalid asynchronous geometry resolves promise and sets ready', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                }),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(Color.RED)
                }
            }),
            compressVertices : false
        });

        var frameState = scene.frameState;
        frameState.afterRender.length = 0;
        return pollToPromise(function() {
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
                return true;
            }
            primitive.update(frameState);
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
            });
        });
    });

    it('internally invalid synchronous geometry resolves promise and sets ready', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                }),
                attributes: {
                    color: ColorGeometryInstanceAttribute.fromColor(Color.RED)
                }
            }),
            asynchronous : false,
            compressVertices : false
        });

        var frameState = scene.frameState;
        frameState.afterRender.length = 0;
        return pollToPromise(function() {
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
                return true;
            }
            primitive.update(frameState);
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
            });
        });
    });

    it('update throws when batched instance colors are different', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        var rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        var rectangleInstance1 = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : new Rectangle(rectangle.west, rectangle.south, rectangle.east, (rectangle.north + rectangle.south) * 0.5)
            }),
            id : 'rectangle1',
            attributes : {
                color : rectColorAttribute
            }
        });
        rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 0.0, 1.0));
        var rectangleInstance2 = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : new Rectangle(rectangle.west, (rectangle.north + rectangle.south) * 0.5, rectangle.east, rectangle.north)
            }),
            id : 'rectangle2',
            attributes : {
                color : rectColorAttribute
            }
        });

        primitive = new GroundPrimitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            asynchronous : false
        });

        expect(function() {
            verifyGroundPrimitiveRender(primitive, rectColorAttribute.value);
        }).toThrowDeveloperError();
    });

    it('update throws when one batched instance color is undefined', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        var rectColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        var rectangleInstance1 = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : new Rectangle(rectangle.west, rectangle.south, rectangle.east, (rectangle.north + rectangle.south) * 0.5)
            }),
            id : 'rectangle1',
            attributes : {
                color : rectColorAttribute
            }
        });
        var rectangleInstance2 = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : new Rectangle(rectangle.west, (rectangle.north + rectangle.south) * 0.5, rectangle.east, rectangle.north)
            }),
            id : 'rectangle2'
        });

        primitive = new GroundPrimitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            asynchronous : false
        });

        expect(function() {
            verifyGroundPrimitiveRender(primitive, rectColorAttribute.value);
        }).toThrowDeveloperError();
    });

    it('setting per instance attribute throws when value is undefined', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();
    });

    it('can disable picking when asynchronous', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : true,
            allowPicking : false
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            primitive.update(frameState);
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            return primitive.ready;
        }).then(function() {
            var attributes = primitive.getGeometryInstanceAttributes('rectangle');
            expect(function() {
                attributes.color = undefined;
            }).toThrowDeveloperError();
        });
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(function() {
            primitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes throws if update was not called', function() {
        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        expect(function() {
            primitive.getGeometryInstanceAttributes('rectangle');
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(primitive.getGeometryInstanceAttributes('unknown')).not.toBeDefined();
    });

    it('isDestroyed', function() {
        primitive = new GroundPrimitive();
        expect(primitive.isDestroyed()).toEqual(false);
        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            primitive.update(frameState);
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            return primitive.ready;
        }).then(function() {
            verifyGroundPrimitiveRender(primitive, rectColor);
        });
    });

    it('destroy before asynchonous pipeline is complete', function() {
        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance
        });

        var frameState = scene.frameState;
        primitive.update(frameState);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });

    it('creating a synchronous primitive throws if initializeTerrainHeights wasn\'t called', function() {
        // Make it seem like initializeTerrainHeights was never called
        var initPromise = GroundPrimitive._initPromise;
        GroundPrimitive._initPromise = undefined;
        GroundPrimitive._initialized = false;

        primitive = new GroundPrimitive({
            geometryInstances : rectangleInstance,
            asynchronous : false
        });

        if (GroundPrimitive.isSupported(scene)) {
            expect(function() {
                primitive.update(scene.frameState);
            }).toThrowDeveloperError();
        }

        // Set back to initialized state
        GroundPrimitive._initPromise = initPromise;
        GroundPrimitive._initialized = true;
    });
}, 'WebGL');
