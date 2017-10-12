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
        'Scene/PerInstanceColorAppearance',
        'Scene/Primitive',
        'Specs/createScene',
        'Specs/pollToPromise'
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
        PerInstanceColorAppearance,
        Primitive,
        createScene,
        pollToPromise) {
    'use strict';

    var tilesetRectangle = Rectangle.fromDegrees(-0.01, -0.01, 0.01, 0.01);

    var vectorGeometryAll = './Data/Cesium3DTiles/Vector/VectorTileGeometryAll';
    var vectorGeometryAllBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTileGeometryAllBatchedChildren';
    var vectorGeometryAllBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryAllBatchedChildrenWithBatchTable';
    var vectorGeometryAllWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryAllWithBatchTable';
    var vectorGeometryBoxes = './Data/Cesium3DTiles/Vector/VectorTileGeometryBoxes';
    var vectorGeometryBoxesBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTileGeometryBoxesBatchedChildren';
    var vectorGeometryBoxesBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryBoxesBatchedChildrenWithBatchTable';
    var vectorGeometryBoxesWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryBoxesWithBatchTable';
    var vectorGeometryCylinders = './Data/Cesium3DTiles/Vector/VectorTileGeometryCylinders';
    var vectorGeometryCylindersBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTileGeometryCylindersBatchedChildren';
    var vectorGeometryCylindersBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryCylindersBatchedChildrenWithBatchTable';
    var vectorGeometryCylindersWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryCylindersWithBatchTable';
    var vectorGeometryEllipsoids = './Data/Cesium3DTiles/Vector/VectorTileGeometryEllipsoids';
    var vectorGeometryEllipsoidsBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTileGeometryEllipsoidsBatchedChildren';
    var vectorGeometryEllipsoidsBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryEllipsoidsBatchedChildrenWithBatchTable';
    var vectorGeometryEllipsoidsWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometryEllipsoidsWithBatchTable';
    var vectorGeometrySpheres = './Data/Cesium3DTiles/Vector/VectorTileGeometrySpheres';
    var vectorGeometrySpheresBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTileGeometrySpheresBatchedChildren';
    var vectorGeometrySpheresBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometrySpheresBatchedChildrenWithBatchTable';
    var vectorGeometrySpheresWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileGeometrySpheresWithBatchTable';
    var vectorMesh = './Data/Cesium3DTiles/Vector/VectorTileMesh';
    var vectorMeshBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTileMeshBatchedChildren';
    var vectorMeshBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileMeshBatchedChildrenWithBatchTable';
    var vectorMeshWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTileMeshWithBatchTable';
    var vectorPoints = './Data/Cesium3DTiles/Vector/VectorTilePoints';
    var vectorPointsBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildren';
    var vectorPointsBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePointsBatchedChildrenWithBatchTable';
    var vectorPointsWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePointsWithBatchTable';
    var vectorPolygons = './Data/Cesium3DTiles/Vector/VectorTilePolygons';
    var vectorPolygonsBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildren';
    var vectorPolygonsBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolygonsBatchedChildrenWithBatchTable';
    var vectorPolygonsWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolygonsWithBatchTable';
    var vectorPolylines = './Data/Cesium3DTiles/Vector/VectorTilePolylines';
    var vectorPolylinesBatchedChildren = './Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildren';
    var vectorPolylinesBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolylinesBatchedChildrenWithBatchTable';
    var vectorPolylinesWithBatchTable = './Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchTable';

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
        return pollToPromise(function() {
            scene.renderForSpecs();
            return tileset.tilesLoaded;
        }).then(function() {
            return tileset;
        });
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

            result.pointColor = Color.clone(Color.YELLOW, result.color);

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
            pointColor : 'rgba(0, 0, 255, 1.0)'
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

    it('renders meshes', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorMesh
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched meshes', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorMeshBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders meshes with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorMeshWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched meshes with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorMeshBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders boxes', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryBoxes
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched boxes', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryBoxesBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders boxes with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryBoxesWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched boxes with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryBoxesBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryCylinders
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched cylinders', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryCylindersBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryCylindersWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched cylinders with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryCylindersBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryEllipsoids
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched ellipsoids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryEllipsoidsBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryEllipsoidsWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched ellipsoids with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryEllipsoidsBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometrySpheres
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched spheres', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometrySpheresBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometrySpheresWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched spheres with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometrySpheresBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryAll
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched all geometries', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryAllBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryAllWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched all geometries with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : vectorGeometryAllBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });
});
