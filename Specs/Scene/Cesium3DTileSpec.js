/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTile',
        'Scene/TileBoundingRegion',
        'Scene/TileOrientedBoundingBox',
        'Core/Cartesian3',
        'Core/defined',
        'Core/Matrix3',
        'Core/Rectangle',
        'Core/SphereOutlineGeometry',
        'Specs/createScene'
    ], function(
        Cesium3DTile,
        TileBoundingRegion,
        TileOrientedBoundingBox,
        Cartesian3,
        defined,
        Matrix3,
        Rectangle,
        SphereOutlineGeometry,
        createScene) {
    "use strict";

    var tileWithBoundingSphere = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        boundingVolume : {
            sphere: [0.0, 0.0, 0.0, 5.0]
        }
    };

    var tileWithContentsBoundingSphere = {
        geometricError : 1,
        refine : 'replace',
        content : {
            batchSize: 1,
            url : '0/0.b3dm',
            boundingVolume : {
                sphere: [0.0, 0.0, 0.0, 5.0]
            }
        },
            children : [],
            boundingVolume : {
            sphere: [0.0, 0.0, 0.0, 5.0]
        }
    };

    var tileWithBoundingRegion = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        boundingVolume: {
            region : [-1.2, -1.2, 0.0, 0.0, -30, -34]
        }
    };

    var tileWithContentsBoundingRegion = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        content : {
            batchSize: 1,
            url : '0/0.b3dm',
            boundingVolume : {
                region : [-1.2, -1.2, 0, 0, -30, -34]
            }
        },
        boundingVolume: {
            region : [-1.2, -1.2, 0, 0, -30, -34]
        }
    };

    var tileWithBoundingBox = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        boundingVolume: {
            box : [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
        }
    };

    var tileWithContentsBoundingBox = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        content : {
            batchSize: 1,
            url : '0/0.b3dm',
            boundingVolume : {
                box : [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
            }
        },
        boundingVolume: {
            box : [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
        }
    };

    describe('bounding volumes', function() {
        it('can have a bounding sphere', function() {
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithBoundingSphere, undefined);
            var radius = tileWithBoundingSphere.boundingVolume.sphere[3];
            expect(tile.contentsBoundingVolume).toBeDefined();
            expect(tile.contentsBoundingVolume.boundingVolume.radius).toEqual(radius);
            expect(tile.contentsBoundingVolume.boundingVolume.center).toEqual(Cartesian3.ZERO);
        });

        it('can have a contents bounding sphere', function() {
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithContentsBoundingSphere, undefined);
            var radius = tileWithContentsBoundingSphere.content.boundingVolume.sphere[3];
            expect(tile.contentsBoundingVolume).toBeDefined();
            expect(tile.contentsBoundingVolume.boundingVolume.radius).toEqual(radius);
            expect(tile.contentsBoundingVolume.boundingVolume.center).toEqual(Cartesian3.ZERO);
        });

        it('can have a bounding region', function() {
            var box = tileWithBoundingRegion.boundingVolume.region;
            var rectangle = new Rectangle(box[0], box[1], box[2], box[3]);
            var minimumHeight = tileWithBoundingRegion.boundingVolume.region[4];
            var maximumHeight = tileWithBoundingRegion.boundingVolume.region[5];
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithBoundingRegion, undefined);
            var tbr = new TileBoundingRegion({rectangle: rectangle, minimumHeight: minimumHeight, maximumHeight: maximumHeight});
            expect(tile.contentsBoundingVolume).toBeDefined();
            expect(tile.contentsBoundingVolume).toEqual(tbr);
        });

        it('can have a contents bounding region', function() {
            var region = tileWithContentsBoundingRegion.content.boundingVolume.region;
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithContentsBoundingRegion, undefined);
            expect(tile._contentBoundingVolume).toBeDefined();
            var tbb = new TileBoundingRegion({
                rectangle: new Rectangle(region[0], region[1], region[2], region[3]),
                minimumHeight: region[4],
                maximumHeight: region[5]
            });
            expect(tile._contentBoundingVolume).toEqual(tbb);
        });

        it('can have an oriented bounding box', function() {
            var box = tileWithBoundingBox.boundingVolume.box;
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithBoundingBox, undefined);
            expect(tile.contentsBoundingVolume).toBeDefined();
            var center = new Cartesian3(box[0], box[1], box[2]);
            var halfAxes = Matrix3.fromArray(box, 3);
            var obb = new TileOrientedBoundingBox({
                center: center,
                halfAxes: halfAxes
            });
            expect(tile.contentsBoundingVolume).toEqual(obb);
        });

        it('can have a contents oriented bounding box', function() {
            var box = tileWithContentsBoundingBox.boundingVolume.box;
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithContentsBoundingBox, undefined);
            expect(tile.contentsBoundingVolume).toBeDefined();
            var center = new Cartesian3(box[0], box[1], box[2]);
            var halfAxes = Matrix3.fromArray(box, 3);
            var obb = new TileOrientedBoundingBox({
                center: center,
                halfAxes: halfAxes
            });
            expect(tile.contentsBoundingVolume).toEqual(obb);
        });
    });

    describe('debug bounding volumes', function() {
        it('can be a bounding region', function() {
            var scene = createScene();
            var mockTileset = {
                debugShowBoundingVolume: true
            };
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingRegion, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('can be an oriented bounding box', function() {
            var scene = createScene();
            var mockTileset = {
                debugShowBoundingVolume: true
            };
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingBox, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('can be a bounding sphere', function() {
            var scene = createScene();
            var mockTileset = {
                debugShowBoundingVolume: true
            };
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });
    });

});
