defineSuite([
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/FeatureDetection',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/Matrix4',
        'Core/OrthographicFrustum',
        'Core/PerspectiveFrustum',
        'Core/Ray',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/ShowGeometryInstanceAttribute',
        'Core/Transforms',
        'Scene/Cesium3DTileset',
        'Scene/Cesium3DTileStyle',
        'Scene/EllipsoidSurfaceAppearance',
        'Scene/Globe',
        'Scene/Primitive',
        'Scene/Scene',
        'Scene/SceneMode',
        'Specs/Cesium3DTilesTester',
        'Specs/createCanvas',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], 'Scene/Pick', function(
        Cartesian3,
        Cartographic,
        Ellipsoid,
        FeatureDetection,
        GeometryInstance,
        CesiumMath,
        Matrix4,
        OrthographicFrustum,
        PerspectiveFrustum,
        Ray,
        Rectangle,
        RectangleGeometry,
        ShowGeometryInstanceAttribute,
        Transforms,
        Cesium3DTileset,
        Cesium3DTileStyle,
        EllipsoidSurfaceAppearance,
        Globe,
        Primitive,
        Scene,
        SceneMode,
        Cesium3DTilesTester,
        createCanvas,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    var primitives;
    var camera;
    var largeRectangle = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
    var smallRectangle = Rectangle.fromDegrees(-0.0001, -0.0001, 0.0001, 0.0001);
    var offscreenRectangle = Rectangle.fromDegrees(-45.0, -1.0, -43.0, 1.0);
    var primitiveRay;
    var offscreenRay;

    beforeAll(function() {
        scene = createScene({
            canvas : createCanvas(10, 10)
        });
        primitives = scene.primitives;
        camera = scene.camera;

        camera.setView({
            destination : largeRectangle
        });
        primitiveRay = new Ray(camera.positionWC, camera.directionWC);

        camera.setView({
            destination : offscreenRectangle
        });
        offscreenRay = new Ray(camera.positionWC, camera.directionWC);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.mode = SceneMode.SCENE3D;
        scene.morphTime = SceneMode.getMorphTime(scene.mode);

        camera.setView({
            destination : largeRectangle
        });

        camera.frustum = new PerspectiveFrustum();
        camera.frustum.fov = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function() {
        primitives.removeAll();
        scene.globe = undefined;
    });

    function createRectangle(height, rectangle) {
        var e = new Primitive({
            geometryInstances: new GeometryInstance({
                geometry: new RectangleGeometry({
                    rectangle: rectangle,
                    vertexFormat: EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                    granularity: CesiumMath.toRadians(20.0),
                    height: height
                })
            }),
            appearance: new EllipsoidSurfaceAppearance({
                aboveGround: false
            }),
            asynchronous: false
        });

        primitives.add(e);

        return e;
    }

    function createLargeRectangle(height) {
        return createRectangle(height, largeRectangle);
    }

    function createSmallRectangle(height) {
        return createRectangle(height, smallRectangle);
    }

    function createTileset() {
        var url = 'Data/Cesium3DTiles/Batched/BatchedWithTransformBox/tileset.json';
        var options = {
            maximumScreenSpaceError : 0
        };
        return Cesium3DTilesTester.loadTileset(scene, url, options).then(function(tileset) {
            var cartographic = Rectangle.center(largeRectangle);
            var cartesian = Cartographic.toCartesian(cartographic);
            tileset.root.transform = Matrix4.IDENTITY;
            tileset.modelMatrix = Transforms.eastNorthUpToFixedFrame(cartesian);
            return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
        });
    }

    function createGlobe() {
        var globe = new Globe();
        scene.globe = globe;
        globe.depthTestAgainstTerrain = true;
        return pollToPromise(function() {
            scene.render();
            return globe.tilesLoaded;
        });
    }

    describe('pick', function() {
        it('does not pick undefined window positions', function() {
            expect(function() {
                scene.pick(undefined);
            }).toThrowDeveloperError();
        });

        it('picks a primitive', function() {
            if (FeatureDetection.isInternetExplorer()) {
                // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
                return;
            }

            var rectangle = createLargeRectangle(0.0);
            expect(scene).toPickPrimitive(rectangle);
        });

        it('picks a primitive with a modified pick search area', function() {
            if (FeatureDetection.isInternetExplorer()) {
                // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
                return;
            }

            camera.setView({
                destination : Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0)
            });

            var rectangle = createLargeRectangle(0.0);

            expect(scene).toPickPrimitive(rectangle, 7, 7, 5);
            expect(scene).notToPick(7, 7, 3);
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.show = false;

            expect(scene).notToPick();
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.appearance.material.uniforms.color.alpha = 0.0;

            expect(scene).notToPick();
        });

        it('picks the top primitive', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);

            expect(scene).toPickPrimitive(rectangle2);
        });

        it('picks in 2D', function() {
            scene.morphTo2D(0.0);
            camera.setView({ destination : largeRectangle });
            var rectangle = createLargeRectangle(0.0);
            scene.initializeFrame();
            expect(scene).toPickPrimitive(rectangle);
        });

        it('picks in 3D with orthographic projection', function() {
            var frustum = new OrthographicFrustum();
            frustum.aspectRatio = 1.0;
            frustum.width = 20.0;
            camera.frustum = frustum;

            // force off center update
            expect(frustum.projectionMatrix).toBeDefined();

            camera.setView({ destination : largeRectangle });
            var rectangle = createLargeRectangle(0.0);
            scene.initializeFrame();
            expect(scene).toPickPrimitive(rectangle);
        });
    });

    describe('drillPick', function() {
        it('drill picks a primitive with a modified pick search area', function() {
            if (FeatureDetection.isInternetExplorer()) {
                // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
                return;
            }

            camera.setView({
                destination : Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0)
            });

            var rectangle = createLargeRectangle(0.0);

            expect(scene).toDrillPickPrimitive(rectangle, 7, 7, 5);
            expect(scene).notToDrillPick(7, 7, 3);
        });

        it('does not drill pick undefined window positions', function() {
            expect(function() {
                scene.pick(undefined);
            }).toThrowDeveloperError();
        });

        it('drill picks multiple objects', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(rectangle2);
                expect(pickedObjects[1].primitive).toEqual(rectangle1);
            });
        });

        it('does not drill pick when show is false', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.show = false;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            });
        });

        it('does not drill pick when alpha is zero', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.appearance.material.uniforms.color.alpha = 0.0;

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(rectangle1);
            });
        });

        it('can drill pick batched Primitives with show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.0
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 1.0
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(false)
                }
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(2);
                expect(pickedObjects[0].primitive).toEqual(primitive);
                expect(pickedObjects[0].id).toEqual(3);
                expect(pickedObjects[1].primitive).toEqual(primitive);
                expect(pickedObjects[1].id).toEqual(1);
            });
        });

        it('can drill pick without ID', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
            });

            var instance1 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(primitive);
            });
        });

        it('can drill pick batched Primitives without show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.0
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 1.0
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(1);
                expect(pickedObjects[0].primitive).toEqual(primitive);
                expect(pickedObjects[0].id).toEqual(3);
            });
        });

        it('stops drill picking when the limit is reached.', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            var rectangle3 = createLargeRectangle(2.0);
            var rectangle4 = createLargeRectangle(3.0);

            expect(scene).toDrillPickAndCall(function(pickedObjects) {
                expect(pickedObjects.length).toEqual(3);
                expect(pickedObjects[0].primitive).toEqual(rectangle4);
                expect(pickedObjects[1].primitive).toEqual(rectangle3);
                expect(pickedObjects[2].primitive).toEqual(rectangle2);
            }, 3);
        });
    });

    function picksFromRayTileset(style) {
        return createTileset().then(function(tileset) {
            tileset.style = style;
            expect(scene).toPickFromRayAndCall(function(result) {
                var primitive = result.object.primitive;
                var position = result.position;

                expect(primitive).toBe(tileset);

                if (scene.context.depthTexture) {
                    var minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
                    var maximumHeight = minimumHeight + 20.0; // Rough height of tile
                    expect(position.x).toBeGreaterThan(minimumHeight);
                    expect(position.x).toBeLessThan(maximumHeight);
                    expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                    expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                }
            }, primitiveRay);
        });
    }

    describe('pickFromRay', function() {
        it('picks a tileset', function() {
            return picksFromRayTileset();
        });

        it('picks a translucent tileset', function() {
            var style = new Cesium3DTileStyle({
                color : 'color("white", 0.5)'
            });
            return picksFromRayTileset(style);
        });

        it('picks the globe', function() {
            return createGlobe().then(function() {
                expect(scene).toPickFromRayAndCall(function(result) {
                    expect(result.object).toBeUndefined();
                    expect(result.position).toBeDefined();
                    expect(result.position.x).toBeGreaterThan(Ellipsoid.WGS84.minimumRadius);
                    expect(result.position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                    expect(result.position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                }, primitiveRay);
            });
        });

        it('picks a primitive', function() {
            var rectangle = createSmallRectangle(0.0);
            expect(scene).toPickFromRayAndCall(function(result) {
                var primitive = result.object.primitive;
                var position = result.position;

                expect(primitive).toBe(rectangle);

                if (scene.context.depthTexture) {
                    var expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
                    expect(position).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON5);
                }
            }, primitiveRay);
        });

        it('returns undefined if no primitives are picked', function() {
            createLargeRectangle(0.0);
            expect(scene).toPickFromRayAndCall(function(result) {
                expect(result).toBeUndefined();
            }, offscreenRay);
        });

        it('does not pick primitives when show is false', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.show = false;
            expect(scene).toPickFromRayAndCall(function(result) {
                expect(result).toBeUndefined();
            }, primitiveRay);
        });

        it('does not pick primitives when alpha is zero', function() {
            var rectangle = createLargeRectangle(0.0);
            rectangle.appearance.material.uniforms.color.alpha = 0.0;
            expect(scene).toPickFromRayAndCall(function(result) {
                expect(result).toBeUndefined();
            }, primitiveRay);
        });

        it('picks the top primitive', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            expect(scene).toPickFromRayAndCall(function(result) {
                expect(result.object.primitive).toBe(rectangle2);
            }, primitiveRay);
        });

        it('excludes objects', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            var rectangle3 = createLargeRectangle(2.0);
            var rectangle4 = createLargeRectangle(3.0);
            rectangle4.show = false;

            expect(scene).toPickFromRayAndCall(function(result) {
                expect(result.object.primitive).toBe(rectangle1);
            }, primitiveRay, [rectangle2, rectangle3, rectangle4]);

            // Tests that rectangle4 does not get un-hidden
            expect(scene).toPickFromRayAndCall(function(result) {
                expect(result.object.primitive).toBe(rectangle3);
            }, primitiveRay);
        });

        it('throws if ray is undefined', function() {
            expect(function() {
                scene.pickFromRay(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            scene.morphTo2D(0.0);
            expect(function() {
                scene.pickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            scene.morphToColumbusView(0.0);
            expect(function() {
                scene.pickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });
    });

    describe('drillPickFromRay', function() {
        it('drill picks a primitive', function() {
            var rectangle = createSmallRectangle(0.0);
            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toBe(1);

                var primitive = results[0].object.primitive;
                var position = results[0].position;

                expect(primitive).toBe(rectangle);

                if (scene.context.depthTexture) {
                    var expectedPosition = Cartesian3.fromRadians(0.0, 0.0);
                    expect(position).toEqualEpsilon(expectedPosition, CesiumMath.EPSILON5);
                } else {
                    expect(position).toBeUndefined();
                }
            }, primitiveRay);
        });

        it('drill picks multiple primitives', function() {
            var rectangle1 = createSmallRectangle(0.0);
            var rectangle2 = createSmallRectangle(1.0);
            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toBe(2);

                // rectangle2 is picked before rectangle1
                expect(results[0].object.primitive).toBe(rectangle2);
                expect(results[1].object.primitive).toBe(rectangle1);

                if (scene.context.depthTexture) {
                    var rectangleCenter1 = Cartesian3.fromRadians(0.0, 0.0, 0.0);
                    var rectangleCenter2 = Cartesian3.fromRadians(0.0, 0.0, 1.0);
                    expect(results[0].position).toEqualEpsilon(rectangleCenter2, CesiumMath.EPSILON5);
                    expect(results[1].position).toEqualEpsilon(rectangleCenter1, CesiumMath.EPSILON5);
                } else {
                    expect(results[0].position).toBeUndefined();
                    expect(results[1].position).toBeUndefined();
                }
            }, primitiveRay);
        });

        it('does not drill pick when show is false', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.show = false;
            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(1);
                expect(results[0].object.primitive).toEqual(rectangle1);
            }, primitiveRay);
        });

        it('does not drill pick when alpha is zero', function() {
            var rectangle1 = createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            rectangle2.appearance.material.uniforms.color.alpha = 0.0;
            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(1);
                expect(results[0].object.primitive).toEqual(rectangle1);
            }, primitiveRay);
        });

        it('returns empty array if no primitives are picked', function() {
            createLargeRectangle(0.0);
            createLargeRectangle(1.0);
            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(0);
            }, offscreenRay);
        });

        it('can drill pick batched Primitives with show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.0
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 1.0
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(false)
                }
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(2);
                expect(results[0].object.primitive).toEqual(primitive);
                expect(results[0].object.id).toEqual(3);
                expect(results[1].object.primitive).toEqual(primitive);
                expect(results[1].object.id).toEqual(1);
            }, primitiveRay);
        });

        it('can drill pick without ID', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT
            });

            var instance1 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var instance2 = new GeometryInstance({
                geometry : geometry,
                attributes : {
                    show : new ShowGeometryInstanceAttribute(true)
                }
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(1);
                expect(results[0].object.primitive).toEqual(primitive);
            }, primitiveRay);
        });

        it('can drill pick batched Primitives without show attribute', function() {
            var geometry = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 0.0
            });

            var geometryWithHeight = new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(-50.0, -50.0, 50.0, 50.0),
                granularity : CesiumMath.toRadians(20.0),
                vertexFormat : EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                height : 1.0
            });

            var instance1 = new GeometryInstance({
                id : 1,
                geometry : geometry
            });

            var instance2 = new GeometryInstance({
                id : 2,
                geometry : geometry
            });

            var instance3 = new GeometryInstance({
                id : 3,
                geometry : geometryWithHeight
            });

            var primitive = primitives.add(new Primitive({
                geometryInstances : [instance1, instance2, instance3],
                asynchronous : false,
                appearance : new EllipsoidSurfaceAppearance()
            }));

            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(1);
                expect(results[0].object.primitive).toEqual(primitive);
                expect(results[0].object.id).toEqual(3);
            }, primitiveRay);
        });

        it('stops drill picking when the limit is reached.', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            var rectangle3 = createLargeRectangle(2.0);
            var rectangle4 = createLargeRectangle(3.0);

            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toEqual(3);
                expect(results[0].object.primitive).toEqual(rectangle4);
                expect(results[1].object.primitive).toEqual(rectangle3);
                expect(results[2].object.primitive).toEqual(rectangle2);
            }, primitiveRay, 3);
        });

        it('excludes objects', function() {
            createLargeRectangle(0.0);
            var rectangle2 = createLargeRectangle(1.0);
            var rectangle3 = createLargeRectangle(2.0);
            var rectangle4 = createLargeRectangle(3.0);
            var rectangle5 = createLargeRectangle(4.0);
            expect(scene).toDrillPickFromRayAndCall(function(results) {
                expect(results.length).toBe(2);
                expect(results[0].object.primitive).toBe(rectangle4);
                expect(results[1].object.primitive).toBe(rectangle2);
            }, primitiveRay, 2, [rectangle5, rectangle3]);
        });

        it('throws if ray is undefined', function() {
            expect(function() {
                scene.drillPickFromRay(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            scene.morphTo2D(0.0);
            expect(function() {
                scene.drillPickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            scene.morphToColumbusView(0.0);
            expect(function() {
                scene.drillPickFromRay(primitiveRay);
            }).toThrowDeveloperError();
        });
    });

    describe('sampleHeight', function() {
        it('samples height from tileset', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            var cartographic = new Cartographic(0.0, 0.0);
            return createTileset().then(function(tileset) {
                expect(scene).toSampleHeightAndCall(function(height) {
                    expect(height).toBeGreaterThan(0.0);
                    expect(height).toBeLessThan(20.0); // Rough height of tile
                }, cartographic);
            });
        });

        it('samples height from the globe', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            var cartographic = new Cartographic(0.0, 0.0);
            return createGlobe().then(function() {
                expect(scene).toSampleHeightAndCall(function(height) {
                    expect(height).toBeDefined();
                }, cartographic);
            });
        });

        it('samples height from primitive', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            var cartographic = new Cartographic(0.0, 0.0);
            expect(scene).toSampleHeightAndCall(function(height) {
                expect(height).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
            }, cartographic);
        });

        it('samples height from the top primitive', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            createSmallRectangle(1.0);
            var cartographic = new Cartographic(0.0, 0.0);
            expect(scene).toSampleHeightAndCall(function(height) {
                expect(height).toEqualEpsilon(1.0, CesiumMath.EPSILON3);
            }, cartographic);
        });

        it('returns undefined if no height is sampled', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            var cartographic = new Cartographic(1.0, 0.0);
            expect(scene).toSampleHeightAndCall(function(height) {
                expect(height).toBeUndefined();
            }, cartographic);
        });

        it('excludes objects', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            var rectangle2 = createSmallRectangle(1.0);
            var rectangle3 = createSmallRectangle(2.0);
            var cartographic = new Cartographic(0.0, 0.0);
            expect(scene).toSampleHeightAndCall(function(height) {
                expect(height).toEqualEpsilon(0.0, CesiumMath.EPSILON3);
            }, cartographic, [rectangle2, rectangle3]);
        });

        it('throws if position is undefined', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            expect(function() {
                scene.sampleHeight(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            scene.morphTo2D(0.0);
            var cartographic = new Cartographic(0.0, 0.0);
            expect(function() {
                scene.sampleHeight(cartographic);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            scene.morphToColumbusView(0.0);
            var cartographic = new Cartographic(0.0, 0.0);
            expect(function() {
                scene.sampleHeight(cartographic);
            }).toThrowDeveloperError();
        });

        it('throws if sampleHeight is not supported', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }
            // Disable extension
            var depthTexture = scene.context._depthTexture;
            scene.context._depthTexture = false;

            var cartographic = new Cartographic(0.0, 0.0);
            expect(function() {
                scene.sampleHeight(cartographic);
            }).toThrowDeveloperError();

            // Re-enable extension
            scene.context._depthTexture = depthTexture;
        });
    });

    describe('clampToHeight', function() {
        it('clamps to tileset', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            return createTileset().then(function(tileset) {
                expect(scene).toClampToHeightAndCall(function(position) {
                    var minimumHeight = Cartesian3.fromRadians(0.0, 0.0).x;
                    var maximumHeight = minimumHeight + 20.0; // Rough height of tile
                    expect(position.x).toBeGreaterThan(minimumHeight);
                    expect(position.x).toBeLessThan(maximumHeight);
                    expect(position.y).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                    expect(position.z).toEqualEpsilon(0.0, CesiumMath.EPSILON5);
                }, cartesian);
            });
        });

        it('clamps to the globe', function() {
            if (!scene.sampleHeightSupported) {
                return;
            }

            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            return createGlobe().then(function() {
                expect(scene).toClampToHeightAndCall(function(position) {
                    expect(position).toBeDefined();
                }, cartesian);
            });
        });

        it('clamps to primitive', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            expect(scene).toClampToHeightAndCall(function(cartesian) {
                var expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
                expect(cartesian).toEqualEpsilon(expectedCartesian, CesiumMath.EPSILON5);
            }, cartesian);
        });

        it('clamps to top primitive', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            createSmallRectangle(1.0);
            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            expect(scene).toClampToHeightAndCall(function(cartesian) {
                var expectedCartesian = Cartesian3.fromRadians(0.0, 0.0, 1.0);
                expect(cartesian).toEqualEpsilon(expectedCartesian, CesiumMath.EPSILON5);
            }, cartesian);
        });

        it('returns undefined if there was nothing to clamp to', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            var cartesian = Cartesian3.fromRadians(1.0, 0.0, 100000.0);
            expect(scene).toClampToHeightAndCall(function(cartesian) {
                expect(cartesian).toBeUndefined();
            }, cartesian);
        });

        it('excludes objects', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            createSmallRectangle(0.0);
            var rectangle2 = createSmallRectangle(1.0);
            var rectangle3 = createSmallRectangle(2.0);
            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            expect(scene).toClampToHeightAndCall(function(cartesian) {
                var expectedCartesian = Cartesian3.fromRadians(0.0, 0.0);
                expect(cartesian).toEqualEpsilon(expectedCartesian, CesiumMath.EPSILON5);
            }, cartesian, [rectangle2, rectangle3]);
        });

        it('throws if cartesian is undefined', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            expect(function() {
                scene.clampToHeight(undefined);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in 2D', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            scene.morphTo2D(0.0);
            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            expect(function() {
                scene.clampToHeight(cartesian);
            }).toThrowDeveloperError();
        });

        it('throws if scene camera is in CV', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }

            scene.morphToColumbusView(0.0);
            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            expect(function() {
                scene.clampToHeight(cartesian);
            }).toThrowDeveloperError();
        });

        it('throws if clampToHeight is not supported', function() {
            if (!scene.clampToHeightSupported) {
                return;
            }
            // Disable extension
            var depthTexture = scene.context._depthTexture;
            scene.context._depthTexture = false;

            var cartesian = Cartesian3.fromRadians(0.0, 0.0, 100000.0);
            expect(function() {
                scene.clampToHeight(cartesian);
            }).toThrowDeveloperError();

            // Re-enable extension
            scene.context._depthTexture = depthTexture;
        });
    });
}, 'WebGL');
