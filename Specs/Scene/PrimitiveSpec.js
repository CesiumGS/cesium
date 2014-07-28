/*global defineSuite*/
defineSuite([
        'Scene/Primitive',
        'Core/BoxGeometry',
        'Core/Cartesian3',
        'Core/ColorGeometryInstanceAttribute',
        'Core/ComponentDatatype',
        'Core/Ellipsoid',
        'Core/Geometry',
        'Core/GeometryAttribute',
        'Core/GeometryInstance',
        'Core/GeometryInstanceAttribute',
        'Core/Matrix4',
        'Core/PrimitiveType',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/ShowGeometryInstanceAttribute',
        'Renderer/ClearCommand',
        'Scene/MaterialAppearance',
        'Scene/OrthographicFrustum',
        'Scene/PerInstanceColorAppearance',
        'Scene/SceneMode',
        'Specs/createContext',
        'Specs/createFrameState',
        'Specs/createScene',
        'Specs/destroyContext',
        'Specs/destroyScene',
        'Specs/pick',
        'Specs/render'
    ], function(
        Primitive,
        BoxGeometry,
        Cartesian3,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        Ellipsoid,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryInstanceAttribute,
        Matrix4,
        PrimitiveType,
        Rectangle,
        RectangleGeometry,
        ShowGeometryInstanceAttribute,
        ClearCommand,
        MaterialAppearance,
        OrthographicFrustum,
        PerInstanceColorAppearance,
        SceneMode,
        createContext,
        createFrameState,
        createScene,
        destroyContext,
        destroyScene,
        pick,
        render) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var us;

    var ellipsoid;

    var rectangle1;
    var rectangle2;

    var rectangleInstance1;
    var rectangleInstance2;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        us = context.uniformState;
        us.update(context, frameState);

        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
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

    it('default constructs', function() {
        var primitive = new Primitive();
        expect(primitive.geometryInstances).not.toBeDefined();
        expect(primitive.appearance).not.toBeDefined();
        expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(primitive.show).toEqual(true);
        expect(primitive.vertexCacheOptimize).toEqual(false);
        expect(primitive.interleave).toEqual(false);
        expect(primitive.releaseGeometryInstances).toEqual(true);
        expect(primitive.allowPicking).toEqual(true);
        expect(primitive.asynchronous).toEqual(true);
        expect(primitive.debugShowBoundingVolume).toEqual(false);
    });

    it('releases geometry instances when releaseGeometryInstances is true', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            releaseGeometryInstances : true,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        primitive.update(context, frameState, []);
        expect(primitive.geometryInstances).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('does not release geometry instances when releaseGeometryInstances is false', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            releaseGeometryInstances : false,
            asynchronous : false
        });

        expect(primitive.geometryInstances).toBeDefined();
        primitive.update(context, frameState, []);
        expect(primitive.geometryInstances).toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('does not render when geometryInstances is an empty array', function() {
        var primitive = new Primitive({
            geometryInstances : [],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        primitive = primitive && primitive.destroy();
    });

    it('does not render when show is false', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toBeGreaterThan(0);

        commands.length = 0;
        primitive.show = false;
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        primitive = primitive && primitive.destroy();
    });

    it('does not render other than for the color or pick pass', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
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
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
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
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
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

    it('renders in two passes for closed, translucent geometry', function() {
        var primitive = new Primitive({
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

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(2);

        primitive = primitive && primitive.destroy();
    });

    it('renders in Columbus view when scene3DOnly is false', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.scene3DOnly = false;
        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.morphTime = SceneMode.getMorphTime(frameState.mode);
        frameState.camera.update(frameState.mode);

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewRectangle(rectangle2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders in 2D when scene3DOnly is false', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
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

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewRectangle(rectangle2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('updates model matrix for one instance in 3D', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(modelMatrix);

        primitive = primitive && primitive.destroy();
    });

    it('does not update model matrix for more than one instance in 3D', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        primitive = primitive && primitive.destroy();
    });

    it('does not update model matrix in Columbus view', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.mode = SceneMode.COLUMBUS_VIEW;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('does not update model matrix in 2D', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.mode = SceneMode.SCENE2D;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        var modelMatrix = Matrix4.fromUniformScale(10.0);
        primitive.modelMatrix = modelMatrix;

        commands.length = 0;
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(1);
        expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        scene.primitives.add(new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false,
            debugShowBoundingVolume : true
        }));
        scene.camera.viewRectangle(rectangle1);
        scene.initializeFrame();
        scene.render();
        var pixels = scene.context.readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[2]).toBeGreaterThanOrEqualTo(0);
        expect(pixels[3]).toEqual(255);

        destroyScene(scene);
    });

    it('transforms to world coordinates', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewRectangle(rectangle2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);

        primitive = primitive && primitive.destroy();
    });

    it('does not transform to world coordinates', function() {
        rectangleInstance2.modelMatrix = Matrix4.clone(rectangleInstance1.modelMatrix);
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.scene3DOnly = true;
        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewRectangle(rectangle2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        expect(primitive.modelMatrix).not.toEqual(Matrix4.IDENTITY);

        primitive = primitive && primitive.destroy();
    });

    it('get common per instance attributes', function() {
        rectangleInstance2.attributes.not_used = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 1,
            value : [0.5]
        });

        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });
        primitive.update(context, frameState, []);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();

        attributes = primitive.getGeometryInstanceAttributes('rectangle2');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();
        expect(attributes.not_used).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('modify color instance attribute', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        var pixels = context.readPixels();
        expect(pixels).not.toEqual([0, 0, 0, 0]);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.color).toBeDefined();
        attributes.color = [255, 255, 255, 255];

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        var newPixels = context.readPixels();
        expect(newPixels).not.toEqual([0, 0, 0, 0]);
        expect(newPixels).not.toEqual(pixels);

        primitive = primitive && primitive.destroy();
    });

    it('modify show instance attribute', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');
        expect(attributes.show).toBeDefined();
        attributes.show = [0];

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        primitive = primitive && primitive.destroy();
    });

    it('picking', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        var pickObject = pick(context, frameState, primitive);
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('rectangle1');

        frameState.camera.viewRectangle(rectangle2);
        us.update(context, frameState);

        pickObject = pick(context, frameState, primitive);
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('rectangle2');

        primitive = primitive && primitive.destroy();
    });

    it('does not pick when allowPicking is false', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1],
            appearance : new PerInstanceColorAppearance(),
            allowPicking : false,
            asynchronous : false
        });

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        var pickObject = pick(context, frameState, primitive);
        expect(pickObject).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('update throws when geometry primitive types are different', function() {
        var primitive = new Primitive({
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

        expect(function() {
            primitive.update(context, frameState, []);
        }).toThrowDeveloperError();
    });

    it('shader validation', function() {
        var primitive = new Primitive({
            geometryInstances : [rectangleInstance1, rectangleInstance2],
            appearance : new MaterialAppearance({
                materialSupport : MaterialAppearance.MaterialSupport.ALL
            }),
            asynchronous : false
        });

        expect(function() {
            primitive.update(context, frameState, []);
        }).toThrowDeveloperError();
    });

    it('setting per instance attribute throws when value is undefined', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        primitive.update(context, frameState, []);
        var attributes = primitive.getGeometryInstanceAttributes('rectangle1');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        primitive.update(context, frameState, []);

        expect(function() {
            primitive.getGeometryInstanceAttributes();
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes throws if update was not called', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        expect(function() {
            primitive.getGeometryInstanceAttributes('rectangle1');
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false
        });

        primitive.update(context, frameState, []);

        expect(primitive.getGeometryInstanceAttributes('unknown')).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('isDestroyed', function() {
        var p = new Primitive();
        expect(p.isDestroyed()).toEqual(false);
        p.destroy();
        expect(p.isDestroyed()).toEqual(true);
    });

    it('renders when using asynchronous pipeline', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance()
        });

        frameState.camera.viewRectangle(rectangle1);
        us.update(context, frameState);

        waitsFor(function() {
            return render(context, frameState, primitive) > 0;
        });

        runs(function() {
            ClearCommand.ALL.execute(context);
            expect(context.readPixels()).toEqual([0, 0, 0, 0]);

            render(context, frameState, primitive);
            var pixels = context.readPixels();
            expect(pixels).not.toEqual([0, 0, 0, 0]);

            primitive = primitive && primitive.destroy();
        });
    });

    it('destroy before asynchonous pipeline is complete', function() {
        var primitive = new Primitive({
            geometryInstances : rectangleInstance1,
            appearance : new PerInstanceColorAppearance()
        });

        primitive.update(context, frameState, []);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });
}, 'WebGL');