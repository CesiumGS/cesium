/*global defineSuite*/
defineSuite([
        'Scene/GroundPrimitive',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/ComponentDatatype',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/Geometry',
        'Core/GeometryAttribute',
        'Core/GeometryInstance',
        'Core/GeometryInstanceAttribute',
        'Core/PolygonGeometry',
        'Core/PrimitiveType',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/RuntimeError',
        'Core/ShowGeometryInstanceAttribute',
        'Core/Transforms',
        'Renderer/ClearCommand',
        'Scene/MaterialAppearance',
        'Scene/OrthographicFrustum',
        'Scene/Pass',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Scene/SceneMode',
        'Specs/BadGeometry',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/pick',
        'Specs/pollToPromise',
        'Specs/render'
    ], function(
        GroundPrimitive,
        Cartesian2,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        destroyObject,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryInstanceAttribute,
        PolygonGeometry,
        PrimitiveType,
        Rectangle,
        RectangleGeometry,
        RuntimeError,
        ShowGeometryInstanceAttribute,
        Transforms,
        ClearCommand,
        MaterialAppearance,
        OrthographicFrustum,
        Pass,
        PerInstanceColorAppearance,
        Primitive,
        SceneMode,
        BadGeometry,
        createContext,
        createFrameState,
        createScene,
        pick,
        pollToPromise,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,fail*/

    var scene;
    var context;
    var frameState;
    var us;

    var ellipsoid;
    var rectangle;

    var depthColor;
    var rectColor;

    var rectangleInstance;
    var depthPrimitive;

    beforeAll(function() {
        scene = createScene();
        scene.fxaa = false;

        context = scene.context;
        frameState = scene.frameState;
        us = context.frameState;

        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    var MockGlobePrimitive = function(primitive) {
        this._primitive = primitive;
    };

    MockGlobePrimitive.prototype.update = function(context, frameState, commandList) {
        var startLength = commandList.length;
        this._primitive.update(context, frameState, commandList);

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
                translucent : false
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
        scene.primitives.removeAll();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
    });

    it('default constructs', function() {
        var primitive = new GroundPrimitive();
        expect(primitive.geometryInstance).not.toBeDefined();
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
        var geometryInstance = {};
        var appearance = {};

        var primitive = new GroundPrimitive({
            geometryInstance : geometryInstance,
            show : false,
            vertexCacheOptimize : true,
            interleave : true,
            compressVertices : false,
            releaseGeometryInstances : false,
            allowPicking : false,
            asynchronous : false,
            debugShowBoundingVolume : true
        });

        expect(primitive.geometryInstance).toEqual(geometryInstance);
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
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(primitive.geometryInstance).toBeDefined();
        scene.primitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstance).not.toBeDefined();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(primitive.geometryInstance).toBeDefined();
        scene.primitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstance).toBeDefined();
    });

    it('adds afterRender promise to frame state', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        scene.primitives.add(primitive);
        scene.renderForSpecs();

        return primitive.readyPromise.then(function(param) {
            expect(param.ready).toBe(true);
        });
    });

    it('does not render when geometryInstance is undefined', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : undefined,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        primitive = primitive && primitive.destroy();
    });

    it('does not render when show is false', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        var frameState = createFrameState();

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(frameState.afterRender.length).toEqual(1);
        frameState.afterRender[0]();
        primitive.update(context, frameState, commands);
        expect(commands.length).toBeGreaterThan(0);

        commands.length = 0;
        primitive.show = false;
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        primitive = primitive && primitive.destroy();
    });

    it('does not render other than for the color or pick pass', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        var frameState = createFrameState();
        frameState.passes.render = false;
        frameState.passes.pick = false;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        frameState.passes.render = true;
        frameState.passes.pick = false;

        primitive = primitive && primitive.destroy();
    });

    function verifyGroundPrimitiveRender(primitive, color) {
        scene.camera.viewRectangle(rectangle);

        scene.primitives.add(depthPrimitive);
        var pixels = scene.renderForSpecs();
        expect(pixels).not.toEqual([0, 0, 0, 0]);
        expect(pixels[0]).toEqual(0);

        scene.primitives.add(primitive);
        pixels = scene.renderForSpecs();
        expect(pixels).toEqual(color);
    }

    it('renders in 3D', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it('renders in Columbus view when scene3DOnly is false', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        scene.morphToColumbusView(0);
        verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it('renders in 2D when scene3DOnly is false', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        scene.morphTo2D(0);
        verifyGroundPrimitiveRender(primitive, rectColor);
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        if (!context.fragmentDepth) {
            return;
        }

        scene.primitives.add(new Primitive({
            geometryInstances : rectangleInstance,
            asynchronous : false,
            debugShowBoundingVolume : true
        }));
        scene.camera.viewRectangle(rectangle);
        var pixels = scene.renderForSpecs();
        expect(pixels[1]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[1]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[2]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[3]).toEqual(255);
    });

    it('get per instance attributes', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.color).toBeDefined();
    });

    it('modify color instance attribute', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        scene.primitives.destroyPrimitives = false;
        scene.primitives.removeAll();
        scene.primitives.destroyPrimitives = true;

        var newColor = [255, 255, 255, 255];
        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.color).toBeDefined();
        attributes.color = newColor;

        verifyGroundPrimitiveRender(primitive, newColor);
    });

    it('modify show instance attribute', function() {
        if (!context.fragmentDepth) {
            return;
        }

        rectangleInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        scene.primitives.destroyPrimitives = false;
        scene.primitives.removeAll();
        scene.primitives.destroyPrimitives = true;

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        verifyGroundPrimitiveRender(primitive, depthColor);
    });

    it('get bounding sphere from per instance attribute', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.boundingSphere).toBeDefined();
    });

    it('getGeometryInstanceAttributes returns same object each time', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        var attributes2 = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes).toBe(attributes2);
    });

    it('picking', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var pickObject = scene.pick(new Cartesian2(0, 0));
        expect(pickObject.id).toEqual('rectangle');
    });

    it('does not pick when allowPicking is false', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            allowPicking : false,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var pickObject = scene.pick(new Cartesian2(0, 0));
        expect(pickObject).not.toBeDefined();
    });

    it('internally invalid asynchronous geometry resolves promise and sets ready', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                })
            }),
            compressVertices : false
        });

        frameState = createFrameState();

        return pollToPromise(function() {
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
                return true;
            }
            primitive.update(context, frameState, []);
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
                primitive = primitive && primitive.destroy();
            });
        });
    });

    it('internally invalid synchronous geometry resolves promise and sets ready', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                })
            }),
            asynchronous : false,
            compressVertices : false
        });

        frameState = createFrameState();

        return pollToPromise(function() {
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
                return true;
            }
            primitive.update(context, frameState, []);
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
                primitive = primitive && primitive.destroy();
            });
        });
    });

    it('setting per instance attribute throws when value is undefined', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();
    });

    it('can disable picking when asynchronous', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : true,
            allowPicking : false
        });

        frameState = createFrameState();

        return pollToPromise(function() {
            primitive.update(context, frameState, []);
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            return primitive.ready;
        }).then(function() {
            var attributes = primitive.getGeometryInstanceAttributes('rectangle');
            expect(function() {
                attributes.color = undefined;
            }).toThrowDeveloperError();

            primitive = primitive && primitive.destroy();
        });
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(function() {
            primitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes throws if update was not called', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        expect(function() {
            primitive.getGeometryInstanceAttributes('rectangle');
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(primitive.getGeometryInstanceAttributes('unknown')).not.toBeDefined();
    });

    it('isDestroyed', function() {
        var p = new GroundPrimitive();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        if (!context.fragmentDepth) {
            return;
        }

        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance
        });

        frameState = createFrameState();

        return pollToPromise(function() {
            primitive.update(context, frameState, []);
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            return primitive.ready;
        }).then(function() {
            verifyGroundPrimitiveRender(primitive, rectColor);
        });
    });

    it('destroy before asynchonous pipeline is complete', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance
        });

        frameState = createFrameState();
        primitive.update(context, frameState, []);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });
}, 'WebGL');