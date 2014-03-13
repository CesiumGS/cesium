/*global defineSuite*/
defineSuite([
         'Scene/Primitive',
         'Core/ExtentGeometry',
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/GeometryInstance',
         'Core/ColorGeometryInstanceAttribute',
         'Core/ShowGeometryInstanceAttribute',
         'Core/GeometryInstanceAttribute',
         'Core/ComponentDatatype',
         'Core/Cartesian3',
         'Core/Matrix4',
         'Core/Extent',
         'Core/Ellipsoid',
         'Core/PrimitiveType',
         'Core/BoxGeometry',
         'Renderer/ClearCommand',
         'Scene/MaterialAppearance',
         'Scene/PerInstanceColorAppearance',
         'Scene/SceneMode',
         'Scene/OrthographicFrustum',
         'Specs/render',
         'Specs/pick',
         'Specs/createContext',
         'Specs/destroyContext',
         'Specs/createFrameState',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         Primitive,
         ExtentGeometry,
         Geometry,
         GeometryAttribute,
         GeometryInstance,
         ColorGeometryInstanceAttribute,
         ShowGeometryInstanceAttribute,
         GeometryInstanceAttribute,
         ComponentDatatype,
         Cartesian3,
         Matrix4,
         Extent,
         Ellipsoid,
         PrimitiveType,
         BoxGeometry,
         ClearCommand,
         MaterialAppearance,
         PerInstanceColorAppearance,
         SceneMode,
         OrthographicFrustum,
         render,
         pick,
         createContext,
         destroyContext,
         createFrameState,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var frameState;
    var us;

    var ellipsoid;

    var extent1;
    var extent2;

    var extentInstance1;
    var extentInstance2;

    beforeAll(function() {
        context = createContext();
        frameState = createFrameState();

        us = context.getUniformState();
        us.update(context, frameState);

        ellipsoid = Ellipsoid.WGS84;
    });

    afterAll(function() {
        destroyContext(context);
    });

    beforeEach(function() {
        extent1 = Extent.fromDegrees(-80.0, 20.0, -70.0, 30.0);
        extent2 = Extent.fromDegrees(70.0, 20.0, 80.0, 30.0);

        var translation = Cartesian3.multiplyByScalar(Cartesian3.normalize(ellipsoid.cartographicToCartesian(extent1.getCenter())), 2.0);
        extentInstance1 = new GeometryInstance({
            geometry : new ExtentGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                ellipsoid : ellipsoid,
                extent : extent1
            }),
            modelMatrix : Matrix4.fromTranslation(translation),
            id : 'extent1',
            attributes : {
                color : new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
                show : new ShowGeometryInstanceAttribute(true)
            }
        });

        translation = Cartesian3.multiplyByScalar(Cartesian3.normalize(ellipsoid.cartographicToCartesian(extent2.getCenter())), 3.0);
        extentInstance2 = new GeometryInstance({
            geometry : new ExtentGeometry({
                vertexFormat : PerInstanceColorAppearance.VERTEX_FORMAT,
                ellipsoid : ellipsoid,
                extent : extent2
            }),
            modelMatrix : Matrix4.fromTranslation(translation),
            id : 'extent2',
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
        expect(primitive.releaseGeometryInstances).toEqual(true);
        expect(primitive.allow3DOnly).toEqual(false);
        expect(primitive.allowPicking).toEqual(true);
        expect(primitive.asynchronous).toEqual(true);
        expect(primitive.debugShowBoundingVolume).toEqual(false);
    });

    it('releases geometry instances when releaseGeometryInstances is true', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
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
            geometryInstances : [extentInstance1, extentInstance2],
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
            allow3DOnly : true,
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        primitive = primitive && primitive.destroy();
    });

    it('does not render when show is false', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
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
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
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

    it('does not render when allow3DOnly is true and the scene mode is SCENE2D', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.mode = SceneMode.SCENE2D;

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(0);

        frameState.mode = SceneMode.SCENE3D;
        primitive = primitive && primitive.destroy();
    });

    it('does not render when allow3DOnly is true and the scene mode is COLUMBUS_VIEW', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.mode = SceneMode.COLUMBUS_VIEW;

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
            allow3DOnly : true,
            asynchronous : false
        });

        var commands = [];
        primitive.update(context, frameState, commands);
        expect(commands.length).toEqual(2);

        primitive = primitive && primitive.destroy();
    });

    it('renders in Columbus view when allow3DOnly is false', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : false,
            asynchronous : false
        });

        frameState.mode = SceneMode.COLUMBUS_VIEW;
        frameState.morphTime = frameState.mode.morphTime;
        frameState.camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                                  1.0, 0.0, 0.0, 0.0,
                                                  0.0, 1.0, 0.0, 0.0,
                                                  0.0, 0.0, 0.0, 1.0);
        frameState.camera.update(frameState.mode, frameState.scene2D);

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewExtent(extent2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders in 2D when allow3DOnly is false', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : false,
            asynchronous : false
        });

        frameState.mode = SceneMode.SCENE2D;
        frameState.morphTime = frameState.mode.morphTime;
        frameState.camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                                  1.0, 0.0, 0.0, 0.0,
                                                  0.0, 1.0, 0.0, 0.0,
                                                  0.0, 0.0, 0.0, 1.0);
        var frustum = new OrthographicFrustum();
        frustum.right = Ellipsoid.WGS84.maximumRadius * Math.PI;
        frustum.left = -frustum.right;
        frustum.top = frustum.right;
        frustum.bottom = -frustum.top;
        frameState.camera.frustum = frustum;
        frameState.camera.update(frameState.mode, frameState.scene2D);

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewExtent(extent2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState = createFrameState(); // reset frame state
        primitive = primitive && primitive.destroy();
    });

    it('renders bounding volume with debugShowBoundingVolume', function() {
        var scene = createScene();
        scene.primitives.add(new Primitive({
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            asynchronous : false,
            debugShowBoundingVolume : true
        }));
        scene.camera.viewExtent(extent1);
        scene.initializeFrame();
        scene.render();
        var pixels = scene.context.readPixels();
        expect(pixels[0]).not.toEqual(0);
        expect(pixels[1]).toEqual(0);
        expect(pixels[2]).toEqual(0);
        expect(pixels[3]).toEqual(255);

        destroyScene(scene);
    });

    it('transforms to world coordinates', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewExtent(extent2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);

        primitive = primitive && primitive.destroy();
    });

    it('does not transform to world coordinates', function() {
        extentInstance2.modelMatrix = Matrix4.clone(extentInstance1.modelMatrix);
        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        frameState.camera.viewExtent(extent2);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        expect(primitive.modelMatrix).not.toEqual(Matrix4.IDENTITY);

        primitive = primitive && primitive.destroy();
    });

    it('get common per instance attributes', function() {
        extentInstance2.attributes.not_used = new GeometryInstanceAttribute({
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 1,
            value : [0.5]
        });

        var primitive = new Primitive({
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });
        primitive.update(context, frameState, []);

        var attributes = primitive.getGeometryInstanceAttributes('extent1');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();

        attributes = primitive.getGeometryInstanceAttributes('extent2');
        expect(attributes.color).toBeDefined();
        expect(attributes.show).toBeDefined();
        expect(attributes.not_used).not.toBeDefined();

        primitive = primitive && primitive.destroy();
    });

    it('modify color instance attribute', function() {
        var primitive = new Primitive({
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        var pixels = context.readPixels();
        expect(pixels).not.toEqual([0, 0, 0, 0]);

        var attributes = primitive.getGeometryInstanceAttributes('extent1');
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
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        render(context, frameState, primitive);
        expect(context.readPixels()).not.toEqual([0, 0, 0, 0]);

        var attributes = primitive.getGeometryInstanceAttributes('extent1');
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
            geometryInstances : [extentInstance1, extentInstance2],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        frameState.camera.viewExtent(extent1);
        us.update(context, frameState);

        var pickObject = pick(context, frameState, primitive);
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('extent1');

        frameState.camera.viewExtent(extent2);
        us.update(context, frameState);

        pickObject = pick(context, frameState, primitive);
        expect(pickObject.primitive).toEqual(primitive);
        expect(pickObject.id).toEqual('extent2');

        primitive = primitive && primitive.destroy();
    });

    it('does not pick when allowPicking is false', function() {
        var primitive = new Primitive({
            geometryInstances : [extentInstance1],
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            allowPicking : false,
            asynchronous : false
        });

        frameState.camera.viewExtent(extent1);
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
            geometryInstances : [extentInstance1, extentInstance2],
            allow3DOnly : true,
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
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        primitive.update(context, frameState, []);
        var attributes = primitive.getGeometryInstanceAttributes('extent1');

        expect(function() {
            attributes.color = undefined;
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes throws without id', function() {
        var primitive = new Primitive({
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
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
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
            asynchronous : false
        });

        expect(function() {
            primitive.getGeometryInstanceAttributes('extent1');
        }).toThrowDeveloperError();

        primitive = primitive && primitive.destroy();
    });

    it('getGeometryInstanceAttributes returns undefined if id does not exist', function() {
        var primitive = new Primitive({
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true,
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
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance()
        });

        frameState.camera.viewExtent(extent1);
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
            geometryInstances : extentInstance1,
            appearance : new PerInstanceColorAppearance(),
            allow3DOnly : true
        });

        primitive.update(context, frameState, []);

        primitive.destroy();
        expect(primitive.isDestroyed()).toEqual(true);
    });
}, 'WebGL');