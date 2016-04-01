/*global defineSuite*/
defineSuite([
        'Scene/Primitive',
        'Core/BoundingSphere',
        'Core/BoxGeometry',
        'Core/Cartesian3',
        'Core/ColorGeometryInstanceAttribute',
        'Core/ComponentDatatype',
        'Core/defined',
        'Core/Ellipsoid',
        'Core/Geometry',
        'Core/GeometryAttribute',
        'Core/GeometryInstance',
        'Core/GeometryInstanceAttribute',
        'Core/Matrix4',
        'Core/PolygonGeometry',
        'Core/PrimitiveType',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/RuntimeError',
        'Core/ShowGeometryInstanceAttribute',
        'Core/Transforms',
        'Scene/Camera',
        'Scene/MaterialAppearance',
        'Scene/OrthographicFrustum',
        'Scene/PerInstanceColorAppearance',
        'Scene/SceneMode',
        'Specs/BadGeometry',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Primitive,
        BoundingSphere,
        BoxGeometry,
        Cartesian3,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        defined,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryInstanceAttribute,
        Matrix4,
        PolygonGeometry,
        PrimitiveType,
        Rectangle,
        RectangleGeometry,
        RuntimeError,
        ShowGeometryInstanceAttribute,
        Transforms,
        Camera,
        MaterialAppearance,
        OrthographicFrustum,
        PerInstanceColorAppearance,
        SceneMode,
        BadGeometry,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var context;

    var ellipsoid;

    var rectangle1;
    var rectangle2;

    var rectangleInstance1;
    var rectangleInstance2;

    var primitive;

    beforeAll(function() {
        scene = createScene();
        scene.primitives.destroyPrimitives = false;
        context = scene.context;
        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.morphTo3D(0);

        rectangle1 = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);
        rectangle2 = Rectangle.fromDegrees(70.0, 20.0, 80.0, 30.0);

        var translation = Cartesian3.multiplyByScalar(Cartesian3.normalize(ellipsoid.cartographicToCartesian(Rectangle.center(rectangle1)), new Cartesian3()), 2.0, new Cartesian3());
        rectangleInstance1 = new GeometryInstance({
            geometry : new RectangleGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                ellipsoid : ellipsoid,
                rectangle : rectangle1
            }),
            modelMatrix : Matrix4.fromTranslation(translation, new Matrix4()),
            id : 'rectangle1',
            attributes : {
                color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
                show : new ShowGeometryInstanceAttribute(true)
            }
        });

        translation = Cartesian3.multiplyByScalar(Cartesian3.normalize(ellipsoid.cartographicToCartesian(Rectangle.center(rectangle2)), new Cartesian3()), 3.0, new Cartesian3());
        rectangleInstance2 = new GeometryInstance({
            geometry : new RectangleGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                ellipsoid : ellipsoid,
                rectangle : rectangle2
            }),
            modelMatrix : Matrix4.fromTranslation(translation, new Matrix4()),
            id : 'rectangle2',
            attributes : {
                color : new ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 1.0),
                show : new ShowGeometryInstanceAttribute(true)
            }
        });
    });

    afterEach(function() {
        scene.primitives.removeAll();
        primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    it('default constructs', function() {
        primitive = new Primitive();
        expect(primitive.geometryInstances).not.toBeDefined();
        expect(primitive.appearance).not.toBeDefined();
        expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(primitive.show).toEqual(true);
        expect(primitive.vertexCacheOptimize).toEqual(false);
        expect(primitive.interleave).toEqual(false);
        expect(primitive.compressVertices).toEqual(true);
        expect(primitive.releaseGeometryInstances).toEqual(true);
        expect(primitive.allowPicking).toEqual(true);
        expect(primitive.cull).toEqual(true);
        expect(primitive.asynchronous).toEqual(true);
        expect(primitive.debugShowBoundingVolume).toEqual(false);
    });

    it('Constructs with options', function() {
        var geometryInstances = {};
        var appearance = {};
        var modelMatrix = Matrix4.fromUniformScale(5.0);

        primitive = new Primitive({
            geometryInstances : geometryInstances,
            appearance : appearance,
            modelMatrix : modelMatrix,
            show : false,
            vertexCacheOptimize : true,
            interleave : true,
            compressVertices : false,
            releaseGeometryInstances : false,
            allowPicking : false,
            cull : false,
            asynchronous : false,
            debugShowBoundingVolume : true
        });

        expect(primitive.geometryInstances).toEqual(geometryInstances);
        expect(primitive.appearance).toEqual(appearance);
        expect(primitive.modelMatrix).toEqual(modelMatrix);
        expect(primitive.show).toEqual(false);
        expect(primitive.vertexCacheOptimize).toEqual(true);
        expect(primitive.interleave).toEqual(true);
        expect(primitive.compressVertices).toEqual(false);
        expect(primitive.releaseGeometryInstances).toEqual(false);
        expect(primitive.allowPicking).toEqual(false);
        expect(primitive.cull).toEqual(false);
        expect(primitive.asynchronous).toEqual(false);
        expect(primitive.debugShowBoundingVolume).toEqual(true);
    });

    it('releases geometry instances when releaseGeometryInstances is true', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        scene.primitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstances).not.toBeDefined();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        scene.primitives.add(primitive);
        scene.renderForSpecs();
        expect(primitive.geometryInstances).toBeDefined();
    });

    it('adds afterRender promise to frame state', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            releaseGeometryInstances : false,
            asynchronous : false
        });

        scene.primitives.add(primitive);
        scene.renderForSpecs();

        return primitive.readyPromise.then(function(param) {
            expect(param.ready).toBe(true);
        });
    });

    it('does not render when geometryInstances is an empty array', function() {
        primitive = new Primitive({
            geometryInstances : [],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.commandList.length = 0;
        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render when show is false', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        primitive.update(frameState);
        expect(frameState.commandList.length).toBeGreaterThan(0);

        frameState.commandList.length = 0;
        primitive.show = false;
        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render other than for the color or pick pass', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.passes.render = false;
        frameState.passes.pick = false;

        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render when scene3DOnly is true and the scene mode is SCENE2D', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.mode = SceneMode.SCENE2D;
        frameState.scene3DOnly = true;

        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('does not render when scene3DOnly is true and the scene mode is COLUMBUS_VIEW', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.scene3DOnly = true;

        primitive.update(frameState);
        expect(frameState.commandList.length).toEqual(0);
    });

    it('renders in two passes for closed, translucent geometry', function() {
        primitive = new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : BoxGeometry.fromDimensions({
                    vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                    dimensions : new Cartesian3(500000.0, 500000.0, 500000.0)
                }),
                id : 'box',
                attributes : {
                    color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 0.5)
                }
            }),
            appearance : new PerInstanceColorAppearance({
                closed : true,
                translucent : true
            }),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.commandList.length = 0;

        // set scene3DOnly to true so that the geometry is not split due to the IDL
        frameState.scene3DOnly = true;
        scene.primitives.add(primitive);
        scene.render();
        expect(frameState.commandList.length).toEqual(2);
    });

    function verifyPrimitiveRender(primitive, rectangle) {
        scene.primitives.removeAll();
        if (defined(rectangle)){
            scene.camera.setView({ destination : rectangle });
        }
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);

        scene.primitives.add(primitive);
        expect(scene.renderForSpecs()).not.toEqual([0, 0, 0, 255]);
    }

    it('renders in Columbus view when scene3DOnly is false', function() {
        scene.frameState.scene3DOnly = false;
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.morphToColumbusView(0);
        verifyPrimitiveRender(primitive, rectangle1);
        verifyPrimitiveRender(primitive, rectangle2);
    });

    it('renders in 2D when scene3DOnly is false', function() {
        scene.frameState.scene3DOnly = false;
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.morphTo2D(0);
        verifyPrimitiveRender(primitive, rectangle1);
        verifyPrimitiveRender(primitive, rectangle2);
    });

    it('renders RTC', function() {
        var dimensions = new Cartesian3(400.0, 300.0, 500.0);
        var positionOnEllipsoid = Cartesian3.fromDegrees(-105.0, 45.0);
        var boxModelMatrix = Matrix4.multiplyByTranslation(
                Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
                new Cartesian3(0.0, 0.0, dimensions.z * 0.5), new Matrix4());

        var boxGeometry = BoxGeometry.createGeometry(BoxGeometry.fromDimensions({
            vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
            dimensions : dimensions
        }));

        var positions = boxGeometry.attributes.position.values;
        var newPositions = new Float32Array(positions.length);
        for (var i = 0; i < positions.length; ++i) {
            newPositions[i] = positions[i];
        }
        boxGeometry.attributes.position.values = newPositions;
        boxGeometry.attributes.position.componentDatatype = ComponentDatatype.FLOAT;

        BoundingSphere.transform(boxGeometry.boundingSphere, boxModelMatrix, boxGeometry.boundingSphere);

        var boxGeometryInstance = new GeometryInstance({
            geometry : boxGeometry,
            attributes : {
                color : new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 0.5)
            }
        });

        var primitive = new Primitive({
            geometryInstances : boxGeometryInstance,
            appearance : new PerInstanceColorAppearance({
                closed: true
            }),
            asynchronous : false,
            allowPicking : false,
            rtcCenter : boxGeometry.boundingSphere.center
        });

        // create test camera
        var camera = scene.camera;
        var testCamera = new Camera(scene);
        testCamera.viewBoundingSphere(boxGeometry.boundingSphere);
        scene._camera = testCamera;

        scene.frameState.scene3DOnly = true;
        verifyPrimitiveRender(primitive);

        scene._camera = camera;
    });

    it('RTC throws with more than one instance', function() {
        expect(function() {
            return new Primitive({
                geometryInstances : [rectangleInstance1, rectangleInstance2],
                appearance : new PerInstanceColorAppearance({
                    closed: true
                }),
                asynchronous : false,
                allowPicking : false,
                rtcCenter : Cartesian3.ZERO
            });
        }).toThrowDeveloperError();
    });

    it('RTC throws if the scene is not 3D only', function() {
        scene.frameState.scene3DOnly = false;
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance({
                closed: true
            }),
            asynchronous : false,
            allowPicking : false,
            rtcCenter : Cartesian3.ZERO
        });

        expect(function() {
            verifyPrimitiveRender(primitive);
        }).toThrowDeveloperError();
    });

    it('updates model matrix for one instance in 3D', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        primitive.update(frameState);
        var commands = frameState.commandList;
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(primitive.modelMatrix);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        primitive.update(frameState);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(modelMatrix);
    });

    it('updates model matrix for more than one instance in 3D with equal model matrices in 3D only scene', function() {
        var modelMatrix = Matrix4.fromUniformScale(2.0);
        rectangleInstance1.modelMatrix = modelMatrix;
        rectangleInstance2.modelMatrix = modelMatrix;

        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.scene3DOnly = true;

        var commands = frameState.commandList;
        commands.length = 0;
        primitive.update(frameState);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(modelMatrix);

        modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        primitive.update(frameState);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(modelMatrix);
    });

    it('computes model matrix when given one for a single instance and for the primitive in 3D only', function() {
        var instanceModelMatrix = Matrix4.fromUniformScale(2.0);

        var dimensions = new Cartesian3(400000.0, 300000.0, 500000.0);
        var positionOnEllipsoid = Cartesian3.fromDegrees(-105.0, 45.0);
        var primitiveModelMatrix = Matrix4.multiplyByTranslation(
            Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
            new Cartesian3(0.0, 0.0, dimensions.z * 0.5), new Matrix4());

        var boxGeometry = BoxGeometry.fromDimensions({
            vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
            dimensions : dimensions
        });
        var boxGeometryInstance = new GeometryInstance({
            geometry : boxGeometry,
            modelMatrix : instanceModelMatrix,
            attributes : {
                color : new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0)
            }
        });
        primitive = new Primitive({
            geometryInstances : boxGeometryInstance,
            modelMatrix : primitiveModelMatrix,
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                closed: true
            }),
            asynchronous : false
        });

        var expectedModelMatrix = Matrix4.multiplyTransformation(primitiveModelMatrix, instanceModelMatrix, new Matrix4());

        var frameState = scene.frameState;
        frameState.scene3DOnly = true;

        var commands = frameState.commandList;
        commands.length = 0;
        primitive.update(frameState);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(expectedModelMatrix);
    });

    it('update model matrix throws in Columbus view', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.scene3DOnly = false;

        var commands = frameState.commandList;
        commands.length = 0;
        primitive.update(frameState);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        expect(function() {
            primitive.update(frameState);
        }).toThrowDeveloperError();
    });

    it('update model matrix throws in 2D', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        frameState.mode = SceneMode.SCENE2D;
        frameState.scene3DOnly = false;

        var commands = frameState.commandList;
        primitive.update(frameState);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        expect(function() {
            primitive.update(frameState);
        }).toThrowDeveloperError();
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false,
            debugShowBoundingVolume : true
        });

        scene.primitives.add(primitive);
        scene.camera.setView({ destination : rectangle1 });
        var pixels = scene.renderForSpecs();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[2]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[3]).toEqual(255);
    });

    it('transforms to world coordinates', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        verifyPrimitiveRender(primitive, rectangle1);
        verifyPrimitiveRender(primitive, rectangle2);
        expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it('does not transform to world coordinates', function() {
        rectangleInstance2.modelMatrix = Matrix4.clone(rectangleInstance1.modelMatrix);
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.frameState.scene3DOnly = true;
        verifyPrimitiveRender(primitive, rectangle1);
        verifyPrimitiveRender(primitive, rectangle2);
        expect(primitive.modelMatrix).not.toEqual(Matrix4.IDENTITY);
        scene.frameState.scene3DOnly = true;
    });

    it('get common per instance attributes', function() {
        rectangleInstance2.attributes.not_used = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 1,
            value : [0.5]
        });

        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.primitives.add(primitive);
        scene.renderForSpecs();

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();

        attributes = primitive.getGeometryInstanceAttributes('rectangle2');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();
        expect(attributes.not_used).not.toBeDefined();
    });

    it('modify color instance attribute', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.camera.setView({ destination : rectangle1 });
        scene.primitives.add(primitive);
        var pixels = scene.renderForSpecs();
        expect(pixels).not.toEqual([0, 0, 0, 255]);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.color).toBeDefined();
        attributes.color = [255, 255, 255, 255];

        var newPixels = scene.renderForSpecs();
        expect(newPixels).not.toEqual([0, 0, 0, 255]);
        expect(newPixels).not.toEqual(pixels);
    });

    it('modify show instance attribute', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.primitives.add(primitive);
        scene.camera.setView({ destination : rectangle1 });
        var pixels = scene.renderForSpecs();
        expect(pixels).not.toEqual([0, 0, 0, 255]);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        var newPixels = scene.renderForSpecs();
        expect(newPixels).toEqual([0, 0, 0, 255]);
    });

    it('get bounding sphere from per instance attribute', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        verifyPrimitiveRender(primitive, rectangle1);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.boundingSphere).toBeDefined();
    });

    it('getGeometryInstanceAttributes returns same object each time', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        verifyPrimitiveRender(primitive, rectangle1);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        var attributes2 = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes).toBe(attributes2);
    });

    it('picking', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        verifyPrimitiveRender(primitive, rectangle1);

        var pickObject = scene.pickForSpecs();
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('rectangle1');

        verifyPrimitiveRender(primitive, rectangle2);

        pickObject = scene.pickForSpecs();
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('rectangle2');
    });

    it('does not pick when allowPicking is false', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1],
            appearance : new PerInstanceColorAppearance(),
            allowPicking : false,
            asynchronous : false
        });

        verifyPrimitiveRender(primitive, rectangle1);

        var pickObject = scene.pickForSpecs();
        expect(pickObject).not.toBeDefined();
    });

    it('does not cull when cull is false', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false,
            cull : false
        });

        var frameState = scene.frameState;
        frameState.commandList.length = 0;
        primitive.update(frameState);
        expect(frameState.commandList[0].cull).toEqual(false);
    });

    it('update throws when geometry primitive types are different', function() {
        primitive = new Primitive({
            geometryInstances : [
                new GeometryInstance({
                    geometry : new Geometry({
                        attributes : {
                            position : new GeometryAttribute({
                                componentDatatype : ComponentDatatype.FLOAT,
                                componentsPerAttribute : 3,
                                values : new Float32Array([1.0, 2.0, 3.0, 4.0])
                            })
                        },
                        primitiveType : PrimitiveType.LINES
                    })
                }),
                new GeometryInstance({
                    geometry : new Geometry({
                        attributes : {
                            position : new GeometryAttribute({
                                componentDatatype : ComponentDatatype.FLOAT,
                                componentsPerAttribute : 3,
                                values : new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
                            })
                        },
                        primitiveType : PrimitiveType.TRIANGLES
                    })
                })
            ],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;

        expect(function() {
            primitive.update(frameState);
        }).toThrowDeveloperError();
    });

    it('failed geometry rejects promise and throws on next update', function() {
        primitive = new Primitive({
            geometryInstances : [new GeometryInstance({
                geometry : new BadGeometry()
            })],
            appearance : new MaterialAppearance({
                materialSupport : MaterialAppearance.MaterialSupport.ALL
            }),
            compressVertices : false
        });

        scene.frameState.afterRender.length = 0;
        scene.primitives.add(primitive);

        return pollToPromise(function() {
            if (scene.frameState.afterRender.length > 0) {
                scene.frameState.afterRender[0]();
                return true;
            }
            scene.render();
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function() {
                fail('should not be called');
            }).otherwise(function(e) {
                expect(e).toBe(primitive._error);
                expect(function() {
                    scene.render();
                }).toThrowRuntimeError();
            });
        });
    });

    it('internally invalid asynchronous geometry resolves promise and sets ready', function() {
        primitive = new Primitive({
            geometryInstances : [new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                })
            })],
            appearance : new MaterialAppearance({
                materialSupport : MaterialAppearance.MaterialSupport.ALL
            }),
            compressVertices : false
        });

        scene.frameState.afterRender.length = 0;

        return pollToPromise(function() {
            if (scene.frameState.afterRender.length > 0) {
                scene.frameState.afterRender[0]();
                return true;
            }
            primitive.update(scene.frameState);
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
            });
        });
    });

    it('internally invalid synchronous geometry resolves promise and sets ready', function() {
        primitive = new Primitive({
            geometryInstances : [new GeometryInstance({
                geometry : PolygonGeometry.fromPositions({
                    positions : []
                })
            })],
            appearance : new MaterialAppearance({
                materialSupport : MaterialAppearance.MaterialSupport.ALL
            }),
            asynchronous : false,
            compressVertices : false
        });

        scene.frameState.afterRender.length = 0;

        return pollToPromise(function() {
            if (scene.frameState.afterRender.length > 0) {
                scene.frameState.afterRender[0]();
                return true;
            }
            primitive.update(scene.frameState);
            return false;
        }).then(function() {
            return primitive.readyPromise.then(function(arg) {
                expect(arg).toBe(primitive);
                expect(primitive.ready).toBe(true);
            });
        });
    });

    it('shader validation', function() {
        primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new MaterialAppearance({
                materialSupport : MaterialAppearance.MaterialSupport.ALL
            }),
            asynchronous : false,
            compressVertices : false
        });

        var frameState = scene.frameState;

        expect(function() {
            primitive.update(frameState);
        }).toThrowDeveloperError();
    });

    it('setting per instance attribute throws when value is undefined', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var frameState = scene.frameState;
        primitive.update(frameState);
        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();
    });

    it('can disable picking when asynchronous', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : true,
            allowPicking : false
        });

        var frameState = scene.frameState;
        frameState.afterRender.length = 0;
        scene.primitives.add(primitive);

        return pollToPromise(function() {
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            scene.render();
            return primitive.ready;
        }).then(function() {
            var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
            expect(function() {
                attributes.color = undefined;
            }).toThrowDeveloperError();
        });
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.primitives.add(primitive);
        scene.renderForSpecs();

        expect(function() {
            primitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes throws if update was not called', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        expect(function() {
            primitive.getGeometryInstanceAttributes('rectangle1');
        }).toThrowDeveloperError();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        scene.primitives.add(primitive);
        scene.renderForSpecs();

        expect(primitive.getGeometryInstanceAttributes('unknown')).not.toBeDefined();
    });

    it('isDestroyed', function() {
        primitive = new Primitive();
        expect(primitive.isDestroyed()).toEqual(false);
        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance({
                flat : true
            })
        });

        var frameState = scene.frameState;

        return pollToPromise(function() {
            primitive.update(frameState);
            if (frameState.afterRender.length > 0) {
                frameState.afterRender[0]();
            }
            return primitive.ready;
        }).then(function() {
            verifyPrimitiveRender(primitive, rectangle1);
        });
    });

    it('destroy before asynchonous pipeline is complete', function() {
        primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance()
        });

        var frameState = scene.frameState;
        primitive.update(frameState);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
