/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTile',
        'Scene/TileOrientedBoundingBox',
        'Core/Cartesian3',
        'Core/defined',
        'Core/Rectangle',
        'Core/SphereOutlineGeometry',
        'Specs/createScene'
    ], function(
        Cesium3DTile,
        TileOrientedBoundingBox,
        Cartesian3,
        defined,
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

    var tileWithBoundingBox = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        boundingVolume: {
            box : [-1.2, -1.2, 0.0, 0.0, -30, -34]
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
                box : [-1.2, -1.2, 0, 0, -30, -34]
            }
        },
        boundingVolume: {
            box : [-1.2, -1.2, 0, 0, -30, -34]
        }
    };

    describe('bounding volumes', function() {
        it('can have a bounding sphere', function() {
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithBoundingSphere, undefined);
            var radius = tileWithBoundingSphere.boundingVolume.sphere[3];
            expect(tile._boundingVolume).toBeDefined();
            expect(tile._boundingVolume.radius).toEqual(radius);
            expect(tile._boundingVolume.center).toEqual(Cartesian3.ZERO);
        });

        it('can have a contents bounding sphere', function() {
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithContentsBoundingSphere, undefined);
            var radius = tileWithContentsBoundingSphere.content.boundingVolume.sphere[3];
            expect(tile._contentBoundingVolume).toBeDefined();
            expect(tile._contentBoundingVolume.radius).toEqual(radius);
            expect(tile._contentBoundingVolume.center).toEqual(Cartesian3.ZERO);
        });

        it('can have a bounding box', function() {
            var rectangle = tileWithBoundingBox.boundingVolume.box;
            var minimumHeight = tileWithBoundingBox.boundingVolume.box[4];
            var maximumHeight = tileWithBoundingBox.boundingVolume.box[5];
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithBoundingBox, undefined);
            expect(tile._tileBoundingBox).toBeDefined();
            expect(tile._tileBoundingBox.minimumHeight).toEqual(minimumHeight);
            expect(tile._tileBoundingBox.maximumHeight).toEqual(maximumHeight);
            expect(tile._tileBoundingBox.rectangle).toEqual(new Rectangle(rectangle[0], rectangle[1], rectangle[2], rectangle[3]));
        });

        it('can have a contents bounding box', function() {
            var box = tileWithContentsBoundingBox.content.boundingVolume.box;
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithContentsBoundingBox, undefined);
            expect(tile._contentBoundingVolume).toBeDefined();
            var tobb = new TileOrientedBoundingBox({
                rectangle: new Rectangle(box[0], box[1], box[2], box[3]),
                minimumHeight: box[4],
                maximumHeight: box[5]
            });
            expect(tile._contentBoundingVolume).toEqual(tobb);
        });
    });

    describe('debug bounding volumes', function() {
        it('can be a bounding box', function() {
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
