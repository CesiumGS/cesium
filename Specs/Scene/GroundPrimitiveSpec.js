/*global defineSuite*/
defineSuite([
        'Scene/GroundPrimitive',
        'Core/Cartesian3',
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
        'Scene/PrimitiveCollection',
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
        Cartesian3,
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
        PrimitiveCollection,
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
        context = createContext();
        frameState = createFrameState();

        us = context.uniformState;
        us.update(context, frameState);

        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        context.destroyForSpecs();
    });

    var MockGlobePrimitive = function(primitive) {
        this._primitive = primitive;
    };

    MockGlobePrimitive.prototype.update = function(context, frameState, commandList) {
        var tempCommandList = [];
        this._primitive.update(context, frameState, tempCommandList);

        for (var i = 0; i < tempCommandList.length; ++i) {
            var command = tempCommandList[i];
            command.pass = Pass.GLOBE;
            commandList.push(command);
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
        //Since we don't create a scene, we need to manually clean out the frameState.afterRender array before each test.
        frameState.afterRender.length = 0;

        rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);

        var depthColorAttribute = new ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 1.0);
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

        var rectColorAttribute = new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0);
        rectColor = rectColorAttribute.value;
        rectangleInstance = new GeometryInstance({
            geometry : new RectangleGeometry({
                ellipsoid : ellipsoid,
                rectangle : rectangle
            }),
            id : 'rectangle',
            attributes : {
                color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
                show : new ShowGeometryInstanceAttribute(true)
            }
        });
    });

    afterEach(function() {
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
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(primitive.geometryInstance).toBeDefined();
        primitive.update(context, frameState, []);
        expect(frameState.afterRender.length).toEqual(1);
        frameState.afterRender[0]();
        expect(primitive.geometryInstance).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(primitive.geometryInstance).toBeDefined();
        primitive.update(context, frameState, []);
        expect(frameState.afterRender.length).toEqual(1);
        frameState.afterRender[0]();
        expect(primitive.geometryInstance).toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('adds afterRender promise to frame state', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        primitive.update(context, frameState, []);
        expect(frameState.afterRender.length).toEqual(1);
        frameState.afterRender[0]();

        return primitive.readyPromise.then(function(param) {
            expect(param.ready).toBe(true);
            primitive = primitive && primitive.destroy();
        });
    });

    it('does not render when geometryInstance is undefined', function() {
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
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

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
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        frameState.passes.render = false;
        frameState.passes.pick = false;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        frameState.passes.render = true;
        frameState.passes.pick = false;

        primitive = primitive && primitive.destroy();
    });

    it('does not render when scene3DOnly is true and the scene mode is SCENE2D', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        frameState.mode = SceneMode.SCENE2D;
        frameState.scene3DOnly = true;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        frameState.mode = SceneMode.SCENE3D;
        primitive = primitive && primitive.destroy();
    });

    it('does not render when scene3DOnly is true and the scene mode is COLUMBUS_VIEW', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.scene3DOnly = true;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        frameState.mode = SceneMode.SCENE3D;
        primitive = primitive && primitive.destroy();
    });

    function verifyGroundPrimitiveRender(primitive, color) {
        frameState.camera.viewRectangle(rectangle);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, depthPrimitive);
        var pixels = context.readPixels();
        expect(pixels).not.toEqual([0, 0, 0, 0]);
        expect(pixels[0]).toEqual(0);

        render(context, frameState, primitive);
        expect(frameState.afterRender.length).toBeGreaterThan(0);
        for (var i = 0; i < frameState.afterRender.length; ++i) {
            frameState.afterRender[i]();
        }
        render(context, frameState, primitive);

        pixels = context.readPixels();
        expect(pixels).toEqual(color);
    }

    it('renders in 3D', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders in Columbus view when scene3DOnly is false', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        frameState.scene3DOnly = false;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.morphTime = SceneMode.getMorphTime(frameState.mode);
        frameState.camera.update(frameState.mode);

        verifyGroundPrimitiveRender(primitive, rectColor);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders in 2D when scene3DOnly is false', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        frameState.scene3DOnly = false;
        frameState.mode = SceneMode.SCENE2D;
        frameState.morphTime = SceneMode.getMorphTime(frameState.mode);

        var frustum = new OrthographicFrustum();
        frustum.right = Ellipsoid.WGS84.maximumRadius * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right;
        frustum.bottom = -frustum.top;
        frameState.camera.frustum = frustum;
        frameState.camera.update(frameState.mode);

        verifyGroundPrimitiveRender(primitive, rectColor);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
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
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('modify color instance attribute', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var newColor = [255, 255, 255, 255];
        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.color).toBeDefined();
        attributes.color = newColor;

        verifyGroundPrimitiveRender(primitive, newColor);

        primitive = primitive && primitive.destroy();
    });

    it('modify show instance attribute', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        verifyGroundPrimitiveRender(primitive, depthColor);

        primitive = primitive && primitive.destroy();
    });

    it('get bounding sphere from per instance attribute', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes.boundingSphere).toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes returns same object each time', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');
        var attributes2 = primitive.getGeometryInstanceAttributes('rectangle');
        expect(attributes).toBe(attributes2);

        primitive = primitive && primitive.destroy();
    });

    it('picking', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var primitives = new PrimitiveCollection();
        primitives.add(depthPrimitive);
        primitives.add(primitive);

        var pickObject = pick(context, frameState, primitives);
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('rectangle');

        primitives = primitives && primitives.destroy();
    });

    it('does not pick when allowPicking is false', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            allowPicking : false,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var primitives = new PrimitiveCollection();
        primitives.add(depthPrimitive);
        primitives.add(primitive);

        var pickObject = pick(context, frameState, primitives);
        expect(pickObject).not.toBeDefined();

        primitives = primitives && primitives.destroy();
    });


    it('internally invalid asynchronous geometry resolves promise and sets ready', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                })
            }),
            compressVertices : false
        });

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
            });
        });
    });

    it('internally invalid synchronous geometry resolves promise and sets ready', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                })
            }),
            asynchronous : false,
            compressVertices : false
        });

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
            });
        });
    });

    it('setting per instance attribute throws when value is undefined', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('can disable picking when asynchronous', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : true,
            allowPicking : false
        });

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
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(function() {
            primitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
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
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance,
            asynchronous : false
        });

        verifyGroundPrimitiveRender(primitive, rectColor);

        expect(primitive.getGeometryInstanceAttributes('unknown')).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('isDestroyed', function() {
        var p = new GroundPrimitive();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance
        });

        frameState.camera.viewRectangle(rectangle);
        us.update(context, frameState);

        return pollToPromise(function() {
            primitive.update(context, frameState, []);
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            return primitive.ready;
        }).then(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, depthPrimitive);
            var pixels = context.readPixels();
            expect(pixels).not.toEqual([0, 0, 0, 0]);
            expect(pixels[0]).toEqual(0);

            render(context, frameState, primitive);
            pixels = context.readPixels();
            expect(pixels).toEqual(rectColor);

            primitive = primitive && primitive.destroy();
        });
    });

    it('destroy before asynchonous pipeline is complete', function() {
        var primitive = new GroundPrimitive({
            geometryInstance : rectangleInstance
        });

        primitive.update(context, frameState, []);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });
}, 'WebGL');