defineSuite([
        'Scene/Geometry3DTileContent',
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
        Geometry3DTileContent,
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

    var geometryAll = './Data/Cesium3DTiles/Geometry/GeometryTileAll/tileset.json';
    var geometryAllBatchedChildren = './Data/Cesium3DTiles/Geometry/GeometryTileAllBatchedChildren/tileset.json';
    var geometryAllBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileAllBatchedChildrenWithBatchTable/tileset.json';
    var geometryAllWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileAllWithBatchTable/tileset.json';
    var geometryAllWithBatchIds = './Data/Cesium3DTiles/Geometry/GeometryTileAllWithBatchIds/tileset.json';

    var geometryBoxes = './Data/Cesium3DTiles/Geometry/GeometryTileBoxes/tileset.json';
    var geometryBoxesBatchedChildren = './Data/Cesium3DTiles/Geometry/GeometryTileBoxesBatchedChildren/tileset.json';
    var geometryBoxesBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileBoxesBatchedChildrenWithBatchTable/tileset.json';
    var geometryBoxesWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileBoxesWithBatchTable/tileset.json';
    var geometryBoxesWithBatchIds = './Data/Cesium3DTiles/Geometry/GeometryTileBoxesWithBatchIds/tileset.json';

    var geometryCylinders = './Data/Cesium3DTiles/Geometry/GeometryTileCylinders/tileset.json';
    var geometryCylindersBatchedChildren = './Data/Cesium3DTiles/Geometry/GeometryTileCylindersBatchedChildren/tileset.json';
    var geometryCylindersBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileCylindersBatchedChildrenWithBatchTable/tileset.json';
    var geometryCylindersWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileCylindersWithBatchTable/tileset.json';
    var geometryCylindersWithBatchIds = './Data/Cesium3DTiles/Geometry/GeometryTileCylindersWithBatchIds/tileset.json';

    var geometryEllipsoids = './Data/Cesium3DTiles/Geometry/GeometryTileEllipsoids/tileset.json';
    var geometryEllipsoidsBatchedChildren = './Data/Cesium3DTiles/Geometry/GeometryTileEllipsoidsBatchedChildren/tileset.json';
    var geometryEllipsoidsBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileEllipsoidsBatchedChildrenWithBatchTable/tileset.json';
    var geometryEllipsoidsWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileEllipsoidsWithBatchTable/tileset.json';
    var geometryEllipsoidsWithBatchIds = './Data/Cesium3DTiles/Geometry/GeometryTileEllipsoidsWithBatchIds/tileset.json';

    var geometrySpheres = './Data/Cesium3DTiles/Geometry/GeometryTileSpheres/tileset.json';
    var geometrySpheresBatchedChildren = './Data/Cesium3DTiles/Geometry/GeometryTileSpheresBatchedChildren/tileset.json';
    var geometrySpheresBatchedChildrenWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileSpheresBatchedChildrenWithBatchTable/tileset.json';
    var geometrySpheresWithBatchTable = './Data/Cesium3DTiles/Geometry/GeometryTileSpheresWithBatchTable/tileset.json';
    var geometrySpheresWithBatchIds = './Data/Cesium3DTiles/Geometry/GeometryTileSpheresWithBatchIds/tileset.json';

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

    it('renders boxes', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryBoxes
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched boxes', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryBoxesBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders boxes with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryBoxesWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched boxes with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryBoxesBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders boxes with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryBoxesWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryCylinders
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched cylinders', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryCylindersBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryCylindersWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched cylinders with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryCylindersBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryCylindersWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryEllipsoids
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched ellipsoids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryEllipsoidsBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryEllipsoidsWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched ellipsoids with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryEllipsoidsBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryEllipsoidsWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometrySpheres
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched spheres', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometrySpheresBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometrySpheresWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched spheres with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometrySpheresBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometrySpheresWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryAll
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched all geometries', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryAllBatchedChildren
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryAllWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched all geometries with a batch table', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryAllBatchedChildrenWithBatchTable
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with batch ids', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryAllWithBatchIds
        }));
        return loadTileset(tileset).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with debug color', function() {
        scene.primitives.add(depthPrimitive);
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryAllWithBatchTable,
            debugColorizeTiles : true
        }));
        return loadTileset(tileset).then(function(tileset) {
            var center = Rectangle.center(tilesetRectangle);
            var ulRect = new Rectangle(tilesetRectangle.west, center.latitude, center.longitude, tilesetRectangle.north);
            var urRect = new Rectangle(center.longitude, center.longitude, tilesetRectangle.east, tilesetRectangle.north);
            var llRect = new Rectangle(tilesetRectangle.west, tilesetRectangle.south, center.longitude, center.latitude);
            var lrRect = new Rectangle(center.longitude, tilesetRectangle.south, tilesetRectangle.east, center.latitude);

            scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(ulRect)), new Cartesian3(0.0, 0.0, 5.0));
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([0, 0, 0, 255]);
                expect(rgba).not.toEqual([255, 255, 255, 255]);
            });
            scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(urRect)), new Cartesian3(0.0, 0.0, 5.0));
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([0, 0, 0, 255]);
                expect(rgba).not.toEqual([255, 255, 255, 255]);
            });
            scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(llRect)), new Cartesian3(0.0, 0.0, 5.0));
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([0, 0, 0, 255]);
                expect(rgba).not.toEqual([255, 255, 255, 255]);
            });
            scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(lrRect)), new Cartesian3(0.0, 0.0, 5.0));
            expect(scene).toRenderAndCall(function(rgba) {
                expect(rgba).not.toEqual([0, 0, 0, 255]);
                expect(rgba).not.toEqual([255, 255, 255, 255]);
            });
        });
    });

    it('can get features and properties', function() {
        tileset = scene.primitives.add(new Cesium3DTileset({
            url : geometryBoxesWithBatchTable
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
            url : geometryBoxesWithBatchTable
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
        var arrayBuffer = Cesium3DTilesTester.generateGeometryTileBuffer({
            version : 2
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'geom');
    });

    it('throws with empty feature table', function() {
        var arrayBuffer = Cesium3DTilesTester.generateGeometryTileBuffer({
            defineFeatureTable : false
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'geom');
    });

    it('throws without all batch ids', function() {
        var arrayBuffer = Cesium3DTilesTester.generateGeometryTileBuffer({
            boxesLength : 1,
            cylindersLength : 1,
            ellipsoidsLength : 1,
            spheresLength : 1,
            boxBatchIds : [1],
            cylinderBatchIds : [0],
            ellipsoidBatchIds : [2]
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'geom');
    });

    it('destroys', function() {
        var tileset = new Cesium3DTileset({
            url : geometryBoxesWithBatchTable
        });
        expect(tileset.isDestroyed()).toEqual(false);
        tileset.destroy();
        expect(tileset.isDestroyed()).toEqual(true);
    });

}, 'WebGL');
