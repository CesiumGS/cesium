defineSuite([
        'Scene/Vector3DTileContent',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/combine',
        'Core/destroyObject',
        'Core/Ellipsoid',
        'Core/GeometryInstance',
        'Core/Math',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/RectangleGeometry',
        'Core/Transforms',
        'Renderer/Pass',
        'Scene/Cesium3DTileBatchTable',
        'Scene/Cesium3DTileset',
        'Scene/Cesium3DTileStyle',
        'Scene/ClassificationType',
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Vector3DTileContent,
        BoundingSphere,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        combine,
        destroyObject,
        Ellipsoid,
        GeometryInstance,
        CesiumMath,
        Matrix4,
        Rectangle,
        RectangleGeometry,
        Transforms,
        Pass,
        Cesium3DTileBatchTable,
        Cesium3DTileset,
        Cesium3DTileStyle,
        ClassificationType,
        PerInstanceColorAppearance,
        Primitive,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var tilesetRectangle = Rectangle.fromDegrees(-0.01, -0.01, 0.01, 0.01);
    var combinedRectangle = Rectangle.fromDegrees(-0.02, -0.01, 0.02, 0.01);

    var vectorPoints = './Data/Cesium3DTiles/Vector/VectorTilePoints/tileset.json';
    var vectorPointsBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildren/tileset.json';
    var vectorPointsBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildrenWithBatchTable/tileset.json';
    var vectorPointsWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchTable/tileset.json';
    var vectorPointsWithBatchIds = './Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchIds/tileset.json';

    var vectorPolygons = './Data/Cesium3DTiles/Vector/VectorTilePolygons/tileset.json';
    var vectorPolygonsBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildren/tileset.json';
    var vectorPolygonsBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildrenWithBatchTable/tileset.json';
    var vectorPolygonsWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchTable/tileset.json';
    var vectorPolygonsWithBatchIds = './Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchIds/tileset.json';

    var vectorPolylines = './Data/Cesium3DTiles/Vector/VectorTilePolylines/tileset.json';
    var vectorPolylinesBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildren/tileset.json';
    var vectorPolylinesBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildrenWithBatchTable/tileset.json';
    var vectorPolylinesWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchTable/tileset.json';
    var vectorPolylinesWithBatchIds = './Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchIds/tileset.json';

    var vectorCombined = './Data/Cesium3DTiles/Vector/VectorTileCombined/tileset.json';
    var vectorCombinedWithBatchIds = './Data/Cesium3DTiles/Vector/VectorTileCombinedWithBatchIds/tileset.json';

    var scene;
    var rectangle;
    var depthPrimitive;
    var tileset;

    var ellipsoid = Ellipsoid.WGS84;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function MockGlobePrimitive(primitive) {
        this._primitive = primitive;
        this.pass = Pass.CESIUM_3D_TILE;
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
        rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);

        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 1.0));
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
    });

    afterEach(function() {
        scene.primitives.removeAll();
        depthPrimitive = depthPrimitive && !depthPrimitive.isDestroyed() && depthPrimitive.destroy();
        tileset = tileset && !tileset.isDestroyed() && tileset.destroy();
    });

    function loadTileset(tileset) {
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)), new Cartesian3(0.0, 0.0, 0.01));
        return Cesium3DTilesTester.waitForTilesLoaded(scene, tileset);
    }

    function expectPick(scene) {
        expect(scene).toPickAndCall(function(result) {
            expect(result).toBeDefined();

            result.color = Color.clone(Color.YELLOW, result.color);

            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Turn show off and on
            result.show = false;
            expect(scene).toRender([255, 0, 0, 255]);
            result.show = true;
            expect(scene).toRenderAndCall(function (rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });
        });
    }

    function verifyPick(scene) {
        var center = Rectangle.center(tilesetRectangle);
        var ulRect = new Rectangle(tilesetRectangle.west, center.latitude, center.longitude, tilesetRectangle.north);
        var urRect = new Rectangle(center.longitude, center.longitude, tilesetRectangle.east, tilesetRectangle.north);
        var llRect = new Rectangle(tilesetRectangle.west, tilesetRectangle.south, center.longitude, center.latitude);
        var lrRect = new Rectangle(center.longitude, tilesetRectangle.south, tilesetRectangle.east, center.latitude);

        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPick(scene);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(urRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPick(scene);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(llRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPick(scene);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPick(scene);
    }

    function expectRender(scene, color) {
        var center = Rectangle.center(tilesetRectangle);
        var ulRect = new Rectangle(tilesetRectangle.west, center.latitude, center.longitude, tilesetRectangle.north);
        var urRect = new Rectangle(center.longitude, center.longitude, tilesetRectangle.east, tilesetRectangle.north);
        var llRect = new Rectangle(tilesetRectangle.west, tilesetRectangle.south, center.longitude, center.latitude);
        var lrRect = new Rectangle(center.longitude, tilesetRectangle.south, tilesetRectangle.east, center.latitude);

        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(urRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(llRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
    }

    function verifyRender(tileset, scene) {
        tileset.style = undefined;
        expectRender(scene, [255, 255, 255, 255]);

        tileset.style = new Cesium3DTileStyle({
            show : 'false'
        });
        expectRender(scene, [255, 0, 0, 255]);
        tileset.style = new Cesium3DTileStyle({
            show : 'true'
        });
        expectRender(scene, [255, 255, 255, 255]);

        tileset.style = new Cesium3DTileStyle({
            color : 'rgba(0, 0, 255, 1.0)'
        });
        expectRender(scene, [0, 0, 255, 255]);
    }

    function expectPickPoints(scene) {
        expect(scene).toPickAndCall(function(result) {
            expect(result).toBeDefined();

            result.color = Color.clone(Color.YELLOW, result.color);

            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });

            // Turn show off and on
            result.show = false;
            expect(scene).toRender([0, 0, 0, 255]);
            result.show = true;
            expect(scene).toRenderAndCall(function (rgba) {
                expect(rgba[0]).toBeGreaterThan(0);
                expect(rgba[1]).toBeGreaterThan(0);
                expect(rgba[2]).toEqual(0);
                expect(rgba[3]).toEqual(255);
            });
        });
    }

    function verifyPickPoints(scene) {
        var center = Rectangle.center(tilesetRectangle);
        var ulRect = new Rectangle(tilesetRectangle.west, center.latitude, center.longitude, tilesetRectangle.north);
        var urRect = new Rectangle(center.longitude, center.longitude, tilesetRectangle.east, tilesetRectangle.north);
        var llRect = new Rectangle(tilesetRectangle.west, tilesetRectangle.south, center.longitude, center.latitude);
        var lrRect = new Rectangle(center.longitude, tilesetRectangle.south, tilesetRectangle.east, center.latitude);

        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPickPoints(scene);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(urRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPickPoints(scene);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(llRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPickPoints(scene);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)), new Cartesian3(0.0, 0.0, 5.0));
        expectPickPoints(scene);
    }

    function expectRenderPoints(scene, callback) {
        var center = Rectangle.center(tilesetRectangle);
        var ulRect = new Rectangle(tilesetRectangle.west, center.latitude, center.longitude, tilesetRectangle.north);
        var urRect = new Rectangle(center.longitude, center.longitude, tilesetRectangle.east, tilesetRectangle.north);
        var llRect = new Rectangle(tilesetRectangle.west, tilesetRectangle.south, center.longitude, center.latitude);
        var lrRect = new Rectangle(center.longitude, tilesetRectangle.south, tilesetRectangle.east, center.latitude);

        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall(callback);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(urRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall(callback);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(llRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall(callback);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall(callback);
    }

    function verifyRenderPoints(tileset, scene) {
        tileset.style = undefined;
        expectRenderPoints(scene, function(rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
        });

        tileset.style = new Cesium3DTileStyle({
            show : 'false'
        });
        expectRender(scene, [0, 0, 0, 255]);
        tileset.style = new Cesium3DTileStyle({
            show : 'true'
        });
        expectRenderPoints(scene, function(rgba) {
            expect(rgba[0]).toBeGreaterThan(0);
            expect(rgba[1]).toBeGreaterThan(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
        });

        tileset.style = new Cesium3DTileStyle({
            color : 'rgba(0, 0, 255, 1.0)'
        });
        expectRenderPoints(scene, function(rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toBeGreaterThan(0);
            expect(rgba[3]).toEqual(255);
        });
    }

    function expectRenderPolylines(scene, color) {
        var center = Rectangle.center(tilesetRectangle);
        var ulRect = new Rectangle(tilesetRectangle.west, center.latitude, center.longitude, tilesetRectangle.north);
        var urRect = new Rectangle(center.longitude, center.longitude, tilesetRectangle.east, tilesetRectangle.north);
        var llRect = new Rectangle(tilesetRectangle.west, tilesetRectangle.south, center.longitude, center.latitude);
        var lrRect = new Rectangle(center.longitude, tilesetRectangle.south, tilesetRectangle.east, center.latitude);

        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.northwest(ulRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.northeast(urRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.southwest(llRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.southeast(lrRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
    }

    function verifyRenderPolylines(tileset, scene) {
        tileset.style = undefined;
        expectRenderPolylines(scene, [255, 255, 255, 255]);

        tileset.style = new Cesium3DTileStyle({
            show : 'false'
        });
        expectRenderPolylines(scene, [0, 0, 0, 255]);
        tileset.style = new Cesium3DTileStyle({
            show : 'true'
        });
        expectRenderPolylines(scene, [255, 255, 255, 255]);

        tileset.style = new Cesium3DTileStyle({
            color : 'rgba(0, 0, 255, 1.0)'
        });
        expectRenderPolylines(scene, [0, 0, 255, 255]);
    }

    function expectRenderCombined(scene, color) {
        var width = combinedRectangle.width;
        var step = width / 3;

        var west = combinedRectangle.west;
        var north = combinedRectangle.north;
        var south = combinedRectangle.south;

        var polygonRect = new Rectangle(west, south, west + step, north);
        var polylineRect = new Rectangle(west + step, south, west + step * 2, north);
        var pointRect = new Rectangle(west + step * 2, south, west + step * 3, north);

        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(polygonRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRender(color);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.northeast(polylineRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall(function(rgba) {
            for (var i = 0; i < color.length; ++i) {
                if (color[i] === 0) {
                    expect(rgba[i]).toEqual(0);
                } else {
                    expect(rgba[i]).toBeGreaterThan(0);
                }
            }
        });
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(pointRect)), new Cartesian3(0.0, 0.0, 5.0));
        expect(scene).toRenderAndCall(function(rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            if (!(color[0] === 255 && color[1] === 0 && color[2] === 0 && color[3] === 255)) {
                expect(rgba).not.toEqual([255, 0, 0, 255]);
            }
        });
    }

    function verifyRenderCombined(tileset, scene) {
        tileset.style = undefined;
        expectRenderCombined(scene, [255, 255, 255, 255]);

        tileset.style = new Cesium3DTileStyle({
            show : 'false'
        });
        expectRenderCombined(scene, [255, 0, 0, 255]);
        tileset.style = new Cesium3DTileStyle({
            show : 'true'
        });
        expectRenderCombined(scene, [255, 255, 255, 255]);

        tileset.style = new Cesium3DTileStyle({
            color : 'rgba(0, 0, 255, 1.0)'
        });
        expectRenderCombined(scene, [0, 0, 255, 255]);
    }

    it('renders points', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPoints
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPoints(tileset, scene);
            verifyPickPoints(scene);
        });
    });

    it('renders batched points', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPointsBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPoints(tileset, scene);
            verifyPickPoints(scene);
        });
    });

    it('renders points with a batch table', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPointsWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPoints(tileset, scene);
            verifyPickPoints(scene);
        });
    });

    it('renders batched points with a batch table', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPointsBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPoints(tileset, scene);
            verifyPickPoints(scene);
        });
    });

    it('renders points with batch ids', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPointsWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPoints(tileset, scene);
            verifyPickPoints(scene);
        });
    });

    it('renders polygons', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygons
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched polygons', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders polygons with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched polygons with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders polygons with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders polylines', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolylines
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPolylines(tileset, scene);
        });
    });

    it('renders batched polylines', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolylinesBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPolylines(tileset, scene);
        });
    });

    it('renders polylines with a batch table', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolylinesWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPolylines(tileset, scene);
        });
    });

    it('renders batched polylines with a batch table', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolylinesBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPolylines(tileset, scene);
        });
    });

    it('renders polylines with batch ids', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolylinesWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderPolylines(tileset, scene);
        });
    });

    it('renders combined tile', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorCombined
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderCombined(tileset, scene);
        });
    });

    it('renders combined tile with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorCombinedWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRenderCombined(tileset, scene);
        });
    });

    it('renders with debug color', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorCombined,
            debugColorizeTiles : true
        }));
        return loadTileset(tileset).then(function() {
            var width = combinedRectangle.width;
            var step = width / 3;

            var west = combinedRectangle.west;
            var north = combinedRectangle.north;
            var south = combinedRectangle.south;
            var rect = new Rectangle(west, south, west + step, north);

            scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(rect)), new Cartesian3(0.0, 0.0, 5.0));
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([255, 255, 255, 255]);
                expect(rgba).not.toEqual([255, 0, 0, 255]);
            });
        });
    });

    it('renders with different classification types', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsBatchedChildren,
            classificationType : ClassificationType.CESIUM_3D_TILE
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);

            scene.primitives.remove(tileset);

            tileset = scene.primitives.add(new Cesium3DTileset({
                url : vectorPolygonsBatchedChildren,
                classificationType : ClassificationType.TERRAIN
            }));
            return loadTileset(tileset).then(function(tileset) {
                depthPrimitive.pass = Pass.GLOBE;
                verifyRender(tileset, scene);
                verifyPick(scene);

                scene.primitives.remove(tileset);

                tileset = scene.primitives.add(new Cesium3DTileset({
                    url : vectorPolygonsBatchedChildren,
                    classificationType : ClassificationType.BOTH
                }));
                return loadTileset(tileset).then(function(tileset) {
                    verifyRender(tileset, scene);
                    verifyPick(scene);
                    depthPrimitive.pass = Pass.CESIUM_3D_TILE;
                    verifyRender(tileset, scene);
                    verifyPick(scene);
                });
            });
        });
    });

    it('can get features and properties', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            var content = tileset.root.content;
            expect(content.featuresLength).toBe(1);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'name')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorPolygonsWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            var content = tileset.root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            version : 2
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws with empty feature table', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            defineFeatureTable : false
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws without region', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            defineRegion : false,
            polygonsLength : 1
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('throws without all batch ids', function() {
        var arrayBuffer = Cesium3DTilesTester.generateVectorTileBuffer({
            polygonsLength : 1,
            pointsLength : 1,
            polylinesLength : 1,
            polygonBatchIds : [1],
            pointBatchIds : [0]
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'vctr');
    });

    it('destroys', function() {
        var tileset = new Cesium3DTileset({
            url : vectorCombined
        });
        expect(tileset.isDestroyed()).toEqual(false);
        tileset.destroy();
        expect(tileset.isDestroyed()).toEqual(true);
    });

}, 'WebGL');
