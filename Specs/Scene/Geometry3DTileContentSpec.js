import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { ColorGeometryInstanceAttribute } from '../../Source/Cesium.js';
import { destroyObject } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { GeometryInstance } from '../../Source/Cesium.js';
import { Rectangle } from '../../Source/Cesium.js';
import { RectangleGeometry } from '../../Source/Cesium.js';
import { Pass } from '../../Source/Cesium.js';
import { RenderState } from '../../Source/Cesium.js';
import { Cesium3DTileset } from '../../Source/Cesium.js';
import { Cesium3DTileStyle } from '../../Source/Cesium.js';
import { ClassificationType } from '../../Source/Cesium.js';
import { PerInstanceColorAppearance } from '../../Source/Cesium.js';
import { Primitive } from '../../Source/Cesium.js';
import { StencilConstants } from '../../Source/Cesium.js';
import Cesium3DTilesTester from '../Cesium3DTilesTester.js';
import createScene from '../createScene.js';

describe('Scene/Geometry3DTileContent', function() {

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
    var tileset;
    var globePrimitive;
    var tilesetPrimitive;
    var reusableGlobePrimitive;
    var reusableTilesetPrimitive;
    var depthColor;

    var ellipsoid = Ellipsoid.WGS84;

    function createPrimitive(rectangle, pass) {
        var renderState;
        if (pass === Pass.CESIUM_3D_TILE) {
            renderState = RenderState.fromCache({
                stencilTest : StencilConstants.setCesium3DTileBit(),
                stencilMask : StencilConstants.CESIUM_3D_TILE_MASK,
                depthTest : {
                    enabled : true
                }
            });
        }
        var depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(new Color(1.0, 0.0, 0.0, 1.0));
        depthColor = depthColorAttribute.value;
        return new Primitive({
            geometryInstances : new GeometryInstance({
                geometry : new RectangleGeometry({
                    ellipsoid : Ellipsoid.WGS84,
                    rectangle : rectangle
                }),
                id : 'depth rectangle',
                attributes : {
                    color : depthColorAttribute
                }
            }),
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true,
                renderState : renderState
            }),
            asynchronous : false
        });
    }

    function MockPrimitive(primitive, pass) {
        this._primitive = primitive;
        this._pass = pass;
        this.show = true;
    }

    MockPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        var commandList = frameState.commandList;
        var startLength = commandList.length;
        this._primitive.update(frameState);

        for (var i = startLength; i < commandList.length; ++i) {
            var command = commandList[i];
            command.pass = this._pass;
        }
    };

    MockPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    MockPrimitive.prototype.destroy = function() {
        return destroyObject(this);
    };

    beforeAll(function() {
        scene = createScene();

        rectangle = Rectangle.fromDegrees(-40.0, -40.0, 40.0, 40.0);
        reusableGlobePrimitive = createPrimitive(rectangle, Pass.GLOBE);
        reusableTilesetPrimitive = createPrimitive(rectangle, Pass.CESIUM_3D_TILE);
    });

    afterAll(function() {
        reusableGlobePrimitive.destroy();
        reusableTilesetPrimitive.destroy();
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        // wrap rectangle primitive so it gets executed during the globe pass and 3D Tiles pass to lay down depth
        globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
        tilesetPrimitive = new MockPrimitive(reusableTilesetPrimitive, Pass.CESIUM_3D_TILE);
        scene.camera.lookAt(ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)), new Cartesian3(0.0, 0.0, 0.01));
    });

    afterEach(function() {
        scene.primitives.removeAll();
        globePrimitive = globePrimitive && !globePrimitive.isDestroyed() && globePrimitive.destroy();
        tilesetPrimitive = tilesetPrimitive && !tilesetPrimitive.isDestroyed() && tilesetPrimitive.destroy();
        tileset = tileset && !tileset.isDestroyed() && tileset.destroy();
    });

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

    it('renders on 3D Tiles', function() {
        scene.primitives.add(globePrimitive);
        scene.primitives.add(tilesetPrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxes, {
            classificationType : ClassificationType.CESIUM_3D_TILE
        }).then(function(tileset) {
            globePrimitive.show = false;
            tilesetPrimitive.show = true;
            verifyRender(tileset, scene);
            verifyPick(scene);
            globePrimitive.show = true;
            tilesetPrimitive.show = false;
            expectRender(scene, depthColor);
            globePrimitive.show = true;
            tilesetPrimitive.show = true;
        });
    });

    it('renders on globe', function() {
        scene.primitives.add(globePrimitive);
        scene.primitives.add(tilesetPrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxes, {
            classificationType : ClassificationType.TERRAIN
        }).then(function(tileset) {
            globePrimitive.show = false;
            tilesetPrimitive.show = true;
            expectRender(scene, depthColor);
            globePrimitive.show = true;
            tilesetPrimitive.show = false;
            verifyRender(tileset, scene);
            verifyPick(scene);
            globePrimitive.show = true;
            tilesetPrimitive.show = true;
        });
    });

    it('renders on 3D Tiles and globe', function() {
        scene.primitives.add(globePrimitive);
        scene.primitives.add(tilesetPrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxes, {
            classificationType : ClassificationType.BOTH
        }).then(function(tileset) {
            globePrimitive.show = false;
            tilesetPrimitive.show = true;
            verifyRender(tileset, scene);
            verifyPick(scene);
            globePrimitive.show = true;
            tilesetPrimitive.show = false;
            verifyRender(tileset, scene);
            verifyPick(scene);
            globePrimitive.show = true;
            tilesetPrimitive.show = true;
        });
    });

    it('renders boxes', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxes).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched boxes', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxesBatchedChildren).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders boxes with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxesWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched boxes with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxesBatchedChildrenWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders boxes with batch ids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxesWithBatchIds).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryCylinders).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched cylinders', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryCylindersBatchedChildren).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryCylindersWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched cylinders with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryCylindersBatchedChildrenWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders cylinders with batch ids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryCylindersWithBatchIds).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryEllipsoids).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched ellipsoids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryEllipsoidsBatchedChildren).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryEllipsoidsWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched ellipsoids with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryEllipsoidsBatchedChildrenWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders ellipsoids with batch ids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryEllipsoidsWithBatchIds).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometrySpheres).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched spheres', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometrySpheresBatchedChildren).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometrySpheresWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched spheres with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometrySpheresBatchedChildrenWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders spheres with batch ids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometrySpheresWithBatchIds).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryAll).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched all geometries', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryAllBatchedChildren).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryAllWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders batched all geometries with a batch table', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryAllBatchedChildrenWithBatchTable).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with batch ids', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryAllWithBatchIds).then(function(tileset) {
            verifyRender(tileset, scene);
            verifyPick(scene);
        });
    });

    it('renders all geometries with debug color', function() {
        scene.primitives.add(globePrimitive);
        return Cesium3DTilesTester.loadTileset(scene, geometryAllWithBatchTable, {
            debugColorizeTiles : true
        }).then(function(tileset) {
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
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxesWithBatchTable).then(function(tileset) {
            var content = tileset.root.content;
            expect(content.featuresLength).toBe(1);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'name')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, geometryBoxesWithBatchTable).then(function(tileset) {
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
