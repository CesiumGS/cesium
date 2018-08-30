defineSuite([
        'Scene/ClassificationPrimitive',
        'Core/BoxGeometry',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/PolygonGeometry',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/ShowGeometryInstanceAttribute',
        'Core/Transforms',
        'Renderer/Pass',
        'Scene/InvertClassification',
        'Scene/MaterialAppearance',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Scene/ShadowVolumeAppearance',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        ClassificationPrimitive,
        BoxGeometry,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        destroyObject,
        Ellipsoid,
        GeometryInstance,
        PolygonGeometry,
        Rectangle,
        RectangleGeometry,
        ShowGeometryInstanceAttribute,
        Transforms,
        Pass,
        InvertClassification,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Primitive,
        ShadowVolumeAppearance,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;

    var ellipsoid;
    var rectangle;

    var depthColor;
    var boxColor;

    var boxInstance;
    var primitive;
    var depthPrimitive;

    beforeAll(function() {
        scene = createScene();
        scene.postProcessStages.fxaa.enabled = false;

        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
        this.pass = Pass.GLOBE;
    }

    MockGlobePrimitive.prototype.update = function(frameState) {
        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this.pass;
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
        scene.render(); // clear any afterRender commands

        rectangle = Rectangle.fromDegrees(-75.0, 25.0, -70.0, 30.0);

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

        var center = Rectangle.center(rectangle);
        var origin = ellipsoid.cartographicToCartesian(center);
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);

        var dimensions = new Cartesian3(1000000.0, 1000000.0, 1000000.0);

        var boxColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 1.0, 0.0, 1.0));
        boxColor = boxColorAttribute.value;
        boxInstance = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box',
            attributes : {
                color : boxColorAttribute
            }
        });
    });

    afterEach(function() {
        scene.groundPrimitives.removeAll();
        primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
    });

    it('default constructs', function() {
        primitive = new ClassificationPrimitive();
        expect(primitive.geometryInstances).not.toBeDefined();
        expect(primitive.show).toEqual(true);
        expect(primitive.vertexCacheOptimize).toEqual(false);
        expect(primitive.interleave).toEqual(false);
        expect(primitive.compressVertices).toEqual(true);
        expect(primitive.releaseGeometryInstances).toEqual(true);
        expect(primitive.allowPicking).toEqual(true);
        expect(primitive.asynchronous).toEqual(true);
        expect(primitive.debugShowBoundingVolume).toEqual(false);
        expect(primitive.debugShowShadowVolume).toEqual(false);
    });

    it('constructs with options', function() {
        var geometryInstances = [];

        primitive = new ClassificationPrimitive({
            geometryInstances : geometryInstances,
            show : false,
            vertexCacheOptimize : true,
            interleave : true,
            compressVertices : false,
            releaseGeometryInstances : false,
            allowPicking : false,
            asynchronous : false,
            debugShowBoundingVolume : true,
            debugShowShadowVolume : true
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
        expect(primitive.debugShowShadowVolume).toEqual(true);
    });

    it('releases geometry instances when releaseGeometryInstances is true', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        scene.groundPrimitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstances).not.toBeDefined();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        scene.groundPrimitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstances).toBeDefined();
    });

    it('adds afterRender promise to frame state', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
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
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
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
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
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

    it('becomes ready when show is false', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = scene.groundPrimitives.add(new ClassificationPrimitive({
            geometryInstances : boxInstance
        }));
        primitive.show = false;

        var ready = false;
        primitive.readyPromise.then(function() {
            ready = true;
        });

        return pollToPromise(function() {
            scene.render();
            return ready;
        }).then(function() {
            expect(ready).toEqual(true);
        });
    });

    it('does not render other than for the color or pick pass', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.passes.render = false;
        frameState.passes.pick = false;

        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    function verifyClassificationPrimitiveRender(primitive, color) {
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
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);
    });

    // Rendering in 2D/CV is broken:
    // https://github.com/AnalyticalGraphicsInc/cesium/issues/6308
    xit('renders in Columbus view when scene3DOnly is false', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        scene.morphToColumbusView(0);
        verifyClassificationPrimitiveRender(primitive, boxColor);
    });

    xit('renders in 2D when scene3DOnly is false', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        scene.morphTo2D(0);
        verifyClassificationPrimitiveRender(primitive, boxColor);
    });

    it('renders batched instances', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        var neCarto = Rectangle.northeast(rectangle);
        var nwCarto = Rectangle.northwest(rectangle);

        var ne = ellipsoid.cartographicToCartesian(neCarto);
        var nw = ellipsoid.cartographicToCartesian(nwCarto);

        var direction = Cartesian3.subtract(ne, nw, new Cartesian3());
        var distance = Cartesian3.magnitude(direction) * 0.25;
        Cartesian3.normalize(direction, direction);
        Cartesian3.multiplyByScalar(direction, distance, direction);

        var center = Rectangle.center(rectangle);
        var origin = ellipsoid.cartographicToCartesian(center);

        var origin1 = Cartesian3.add(origin, direction, new Cartesian3());
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(origin1);

        var dimensions = new Cartesian3(500000.0, 1000000.0, 1000000.0);

        var boxColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        var boxInstance1 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box1',
            attributes : {
                color : boxColorAttribute
            }
        });

        Cartesian3.negate(direction, direction);
        var origin2 = Cartesian3.add(origin, direction, new Cartesian3());
        modelMatrix = Transforms.eastNorthUpToFixedFrame(origin2);

        var boxInstance2 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box2',
            attributes : {
                color : boxColorAttribute
            }
        });

        primitive = new ClassificationPrimitive({
            geometryInstances : [boxInstance1, boxInstance2],
            asynchronous : false
        });
        verifyClassificationPrimitiveRender(primitive, boxColorAttribute.value);
    });

    it('renders with invert classification and an opaque color', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        scene.invertClassification = true;
        scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 1.0);

        depthPrimitive.pass = Pass.CESIUM_3D_TILE;
        boxInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        scene.camera.setView({ destination : rectangle });

        var invertedColor = new Array(4);
        invertedColor[0] = Color.floatToByte(Color.byteToFloat(depthColor[0]) * scene.invertClassificationColor.red);
        invertedColor[1] = Color.floatToByte(Color.byteToFloat(depthColor[1]) * scene.invertClassificationColor.green);
        invertedColor[2] = Color.floatToByte(Color.byteToFloat(depthColor[2]) * scene.invertClassificationColor.blue);
        invertedColor[3] = 255;

        scene.groundPrimitives.add(depthPrimitive);
        expect(scene).toRender(invertedColor);

        scene.groundPrimitives.add(primitive);
        expect(scene).toRender(boxColor);

        primitive.getGeometryInstanceAttributes('box').show = [0];
        expect(scene).toRender(depthColor);

        scene.invertClassification = false;
    });

    it('renders with invert classification and a translucent color', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        if (!InvertClassification.isTranslucencySupported(scene.context)) {
            return;
        }

        scene.invertClassification = true;
        scene.invertClassificationColor = new Color(0.25, 0.25, 0.25, 0.25);

        depthPrimitive.pass = Pass.CESIUM_3D_TILE;
        boxInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        scene.camera.setView({ destination : rectangle });

        var invertedColor = new Array(4);
        invertedColor[0] = Color.floatToByte(Color.byteToFloat(depthColor[0]) * scene.invertClassificationColor.red  * scene.invertClassificationColor.alpha);
        invertedColor[1] = Color.floatToByte(Color.byteToFloat(depthColor[1]) * scene.invertClassificationColor.green * scene.invertClassificationColor.alpha);
        invertedColor[2] = Color.floatToByte(Color.byteToFloat(depthColor[2]) * scene.invertClassificationColor.blue * scene.invertClassificationColor.alpha);
        invertedColor[3] = 255;

        scene.groundPrimitives.add(depthPrimitive);
        expect(scene).toRender(invertedColor);

        scene.groundPrimitives.add(primitive);
        expect(scene).toRender(boxColor);

        primitive.getGeometryInstanceAttributes('box').show = [0];
        expect(scene).toRender(depthColor);

        scene.invertClassification = false;
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
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
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
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
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        var attributes = primitive.getGeometryInstanceAttributes('box');
        expect(attributes.color).toBeDefined();
    });

    it('modify color instance attribute', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var newColor = [255, 255, 255, 255];
        var attributes = primitive.getGeometryInstanceAttributes('box');
        expect(attributes.color).toBeDefined();
        attributes.color = newColor;

        verifyClassificationPrimitiveRender(primitive, newColor);
    });

    it('modify show instance attribute', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        boxInstance.attributes.show = new ShowGeometryInstanceAttribute(true);

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        scene.groundPrimitives.destroyPrimitives = false;
        scene.groundPrimitives.removeAll();
        scene.groundPrimitives.destroyPrimitives = true;

        var attributes = primitive.getGeometryInstanceAttributes('box');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        verifyClassificationPrimitiveRender(primitive, depthColor);
    });

    it('get bounding sphere from per instance attribute', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        var attributes = primitive.getGeometryInstanceAttributes('box');
        expect(attributes.boundingSphere).toBeDefined();
    });

    it('getGeometryInstanceAttributes returns same object each time', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        var attributes = primitive.getGeometryInstanceAttributes('box');
        var attributes2 = primitive.getGeometryInstanceAttributes('box');
        expect(attributes).toBe(attributes2);
    });

    it('picking', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        expect(scene).toPickAndCall(function(result) {
            expect(result.id).toEqual('box');
        });
    });

    it('drill picking', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        expect(scene).toDrillPickAndCall(function(pickedObjects) {
            expect(pickedObjects.length).toEqual(2);
            expect(pickedObjects[0].primitive).toEqual(primitive);
            expect(pickedObjects[1].primitive).toEqual(depthPrimitive._primitive);
        });
    });

    it('does not pick when allowPicking is false', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            allowPicking : false,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        expect(scene).notToPick();
    });

    it('internally invalid asynchronous geometry resolves promise and sets ready', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
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
            for (var i = 0; i < frameState.afterRender.length; ++i) {
                frameState.afterRender[i]();
            }
            primitive.update(frameState);
            return primitive.ready;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
            });
        });
    });

    it('internally invalid synchronous geometry resolves promise and sets ready', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
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
            for (var i = 0; i < frameState.afterRender.length; ++i) {
                frameState.afterRender[i]();
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

    it('update throws when batched instance colors are different and no culling attributes are provided', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        var neCarto = Rectangle.northeast(rectangle);
        var nwCarto = Rectangle.northwest(rectangle);

        var ne = ellipsoid.cartographicToCartesian(neCarto);
        var nw = ellipsoid.cartographicToCartesian(nwCarto);

        var direction = Cartesian3.subtract(ne, nw, new Cartesian3());
        var distance = Cartesian3.magnitude(direction) * 0.25;
        Cartesian3.normalize(direction, direction);
        Cartesian3.multiplyByScalar(direction, distance, direction);

        var center = Rectangle.center(rectangle);
        var origin = ellipsoid.cartographicToCartesian(center);

        var origin1 = Cartesian3.add(origin, direction, new Cartesian3());
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(origin1);

        var dimensions = new Cartesian3(500000.0, 1000000.0, 1000000.0);

        var boxColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        var boxInstance1 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box1',
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0))
            }
        });

        Cartesian3.negate(direction, direction);
        var origin2 = Cartesian3.add(origin, direction, new Cartesian3());
        modelMatrix = Transforms.eastNorthUpToFixedFrame(origin2);

        var boxInstance2 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box2',
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 1.0, 1.0))
            }
        });

        primitive = new ClassificationPrimitive({
            geometryInstances : [boxInstance1, boxInstance2],
            asynchronous : false
        });

        expect(function() {
            verifyClassificationPrimitiveRender(primitive, boxColorAttribute.value);
        }).toThrowDeveloperError();
    });

    it('update throws when one batched instance color is undefined', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        var neCarto = Rectangle.northeast(rectangle);
        var nwCarto = Rectangle.northwest(rectangle);

        var ne = ellipsoid.cartographicToCartesian(neCarto);
        var nw = ellipsoid.cartographicToCartesian(nwCarto);

        var direction = Cartesian3.subtract(ne, nw, new Cartesian3());
        var distance = Cartesian3.magnitude(direction) * 0.25;
        Cartesian3.normalize(direction, direction);
        Cartesian3.multiplyByScalar(direction, distance, direction);

        var center = Rectangle.center(rectangle);
        var origin = ellipsoid.cartographicToCartesian(center);

        var origin1 = Cartesian3.add(origin, direction, new Cartesian3());
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(origin1);

        var dimensions = new Cartesian3(500000.0, 1000000.0, 1000000.0);

        var boxColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));
        var boxInstance1 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box1',
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0))
            }
        });

        Cartesian3.negate(direction, direction);
        var origin2 = Cartesian3.add(origin, direction, new Cartesian3());
        modelMatrix = Transforms.eastNorthUpToFixedFrame(origin2);

        var boxInstance2 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box2'
        });

        primitive = new ClassificationPrimitive({
            geometryInstances : [boxInstance1, boxInstance2],
            asynchronous : false
        });

        expect(function() {
            verifyClassificationPrimitiveRender(primitive, boxColorAttribute.value);
        }).toThrowDeveloperError();
    });

    it('update throws when no batched instance colors are given for a PerInstanceColorAppearance', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        var neCarto = Rectangle.northeast(rectangle);
        var nwCarto = Rectangle.northwest(rectangle);

        var ne = ellipsoid.cartographicToCartesian(neCarto);
        var nw = ellipsoid.cartographicToCartesian(nwCarto);

        var direction = Cartesian3.subtract(ne, nw, new Cartesian3());
        var distance = Cartesian3.magnitude(direction) * 0.25;
        Cartesian3.normalize(direction, direction);
        Cartesian3.multiplyByScalar(direction, distance, direction);

        var center = Rectangle.center(rectangle);
        var origin = ellipsoid.cartographicToCartesian(center);

        var origin1 = Cartesian3.add(origin, direction, new Cartesian3());
        var modelMatrix = Transforms.eastNorthUpToFixedFrame(origin1);

        var dimensions = new Cartesian3(500000.0, 1000000.0, 1000000.0);

        var boxInstance1 = new GeometryInstance({
            geometry : BoxGeometry.fromDimensions({
                dimensions : dimensions
            }),
            modelMatrix : modelMatrix,
            id : 'box1'
        });

        primitive = new ClassificationPrimitive({
            geometryInstances : [boxInstance1],
            asynchronous : false,
            appearance : new PerInstanceColorAppearance()
        });

        var boxColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(0.0, 1.0, 1.0, 1.0));

        expect(function() {
            verifyClassificationPrimitiveRender(primitive, boxColorAttribute.value);
        }).toThrowDeveloperError();
    });

    it('update throws when the given Appearance is incompatible with the geometry instance attributes', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : [boxInstance],
            asynchronous : false,
            appearance : new MaterialAppearance()
        });

        expect(function() {
            verifyClassificationPrimitiveRender(primitive, [255, 255, 255, 255]);
        }).toThrowDeveloperError();
    });

    it('update throws when an incompatible Appearance is set', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : [boxInstance],
            asynchronous : false,
            appearance : new PerInstanceColorAppearance()
        });

        scene.camera.setView({ destination : rectangle });
        scene.groundPrimitives.add(depthPrimitive);
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            expect(rgba[0]).toEqual(0);
        });

        scene.groundPrimitives.add(primitive);
        expect(scene).toRender([255, 255, 0, 255]);

        // become incompatible
        primitive.appearance = new MaterialAppearance();

        expect(function() {
            expect(scene).toRender([255, 255, 255, 255]);
        }).toThrowDeveloperError();
    });

    it('setting per instance attribute throws when value is undefined', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        var attributes = primitive.getGeometryInstanceAttributes('box');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();
    });

    it('can disable picking when asynchronous', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : true,
            allowPicking : false
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            primitive.update(frameState);
            for (var i = 0; i < frameState.afterRender.length; ++i) {
                frameState.afterRender[i]();
            }
            return primitive.ready;
        }).then(function() {
            var attributes = primitive.getGeometryInstanceAttributes('box');
            expect(function() {
                attributes.color = undefined;
            }).toThrowDeveloperError();
        });
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        expect(function() {
            primitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes throws if update was not called', function() {
        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        expect(function() {
            primitive.getGeometryInstanceAttributes('box');
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance,
            asynchronous : false
        });

        verifyClassificationPrimitiveRender(primitive, boxColor);

        expect(primitive.getGeometryInstanceAttributes('unknown')).not.toBeDefined();
    });

    it('isDestroyed', function() {
        primitive = new ClassificationPrimitive();
        expect(primitive.isDestroyed()).toEqual(false);
        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        if (!ClassificationPrimitive.isSupported(scene)) {
            return;
        }

        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            primitive.update(frameState);
            for (var i = 0; i < frameState.afterRender.length; ++i) {
                frameState.afterRender[i]();
            }
            return primitive.ready;
        }).then(function() {
            verifyClassificationPrimitiveRender(primitive, boxColor);
        });
    });

    it('destroy before asynchonous pipeline is complete', function() {
        primitive = new ClassificationPrimitive({
            geometryInstances : boxInstance
        });

        var frameState = scene.frameState;
        primitive.update(frameState);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });

}, 'WebGL');
