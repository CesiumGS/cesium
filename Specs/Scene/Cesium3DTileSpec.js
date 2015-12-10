/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTile',
        'Core/Cartesian3',
        'Core/defined',
        'Core/OrientedBoundingBox',
        'Core/Rectangle',
        'Core/SphereOutlineGeometry',
        'Specs/createContext',
        'Specs/createFrameState'
    ], function(
        Cesium3DTile,
        Cartesian3,
        defined,
        OrientedBoundingBox,
        Rectangle,
        SphereOutlineGeometry,
        createContext,
        createFrameState) {
    "use strict";

    describe('bounding volumes', function() {
        var tileWithBoundingSphere = {
            "geometricError" : 1,
            "refine" : "replace",
             "children" : [],
             boundingVolume : {
                 "sphere": [0.0, 0.0, 0.0, 5.0]
             }
        };

        var tileWithContentsBoundingSphere = {
            "geometricError" : 1,
            "refine" : "replace",
            "content" : {
                "batchSize": 1,
                "url" : "0/0.b3dm",
                 boundingVolume : {
                     "sphere": [0.0, 0.0, 0.0, 5.0]
                 }
             },
             "children" : [],
             boundingVolume : {
                 "sphere": [0.0, 0.0, 0.0, 5.0]
             }
        };

        it('can have a bounding sphere', function() {
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithBoundingSphere, undefined);
            expect(defined(tile._tileBoundingSphere)).toEqual(true);
            expect(tile._tileBoundingSphere.radius).toEqual(5.0);
            expect(tile._tileBoundingSphere.center.equals(Cartesian3.ZERO)).toEqual(true);
        });

        it('can have a contents bounding sphere', function() {
            var tile = new Cesium3DTile(undefined, '/some_url', tileWithContentsBoundingSphere, undefined);
            expect(defined(tile._contentsBoundingSphere)).toEqual(true);
            expect(tile._contentsBoundingSphere.radius).toEqual(5.0);
            expect(tile._contentsBoundingSphere.center.equals(Cartesian3.ZERO)).toEqual(true);
        });

        it('can have a bounding box', function() {
            var rectangle = [-1.2, -1.2, 0.0, 0.0];
            var tileInfo = {
                "geometricError" : 1,
                "refine" : "replace",
                 "children" : [],
                 boundingVolume: {
                    "box" : [rectangle[0], rectangle[1], rectangle[2], rectangle[3], -30, -34]
                 }
            };

            var tile = new Cesium3DTile(undefined, '/some_url', tileInfo, undefined);
            expect(defined(tile._tileBoundingBox)).toEqual(true);
            expect(tile._tileBoundingBox.minimumHeight).toEqual(-30);
            expect(tile._tileBoundingBox.maximumHeight).toEqual(-34);
            expect(tile._tileBoundingBox.rectangle.equals(new Rectangle(rectangle[0], rectangle[1], rectangle[2], rectangle[3]))).toEqual(true);
        });

        it('can have a contents bounding box', function() {
            var box = [-1.2, -1.2, 0, 0, -30, -34];
            var tileInfo = {
                "geometricError" : 1,
                "refine" : "replace",
                "children" : [],
                "content" : {
                    "batchSize": 1,
                        "url" : "0/0.b3dm",
                        boundingVolume : {
                            "box" : box
                        }
                     },
                 boundingVolume: {
                     "box" : box
                 }
            };

            var tile = new Cesium3DTile(undefined, '/some_url', tileInfo, undefined);
            expect(defined(tile._contentsOrientedBoundingBox)).toEqual(true);
            var obb = OrientedBoundingBox.fromRectangle(new Rectangle(box[0], box[1], box[2], box[3]), box[4], box[5]);
            expect(tile._contentsOrientedBoundingBox.equals(obb)).toEqual(true);
        });
    });

    describe('debug bounding volumes', function() {
        var tileWithBoundingSphere = {
            "geometricError" : 1,
            "refine" : "replace",
             "children" : [],
             boundingVolume : {
                 "sphere": [0.0, 0.0, 0.0, 5.0]
             }
        };

        var tileWithBoundingBox = {
            "geometricError" : 1,
            "refine" : "replace",
             "children" : [],
             boundingVolume: {
                 "box" : [-1.2, -1.2, 0, 0, -30, -34]
             }
        };

        it('can be a bounding box', function() {
            var context = createContext();
            var frameState = createFrameState(context, undefined, undefined, undefined);
            var fakeTileset = {
                debugShowBoundingVolume: true
            };
            var tile = new Cesium3DTile(fakeTileset, '/some_url', tileWithBoundingBox, undefined);
            tile.update(fakeTileset, frameState);
            expect(defined(tile._debugBoundingVolume)).toEqual(true);
            expect(tile._debugBoundingVolume._boundingSpheres.length).not.toEqual(0);
        });

        it('can be a bounding sphere', function() {
            var context = createContext();
            var frameState = createFrameState(context, undefined, undefined, undefined);
            var fakeTileset = {
                debugShowBoundingVolume: true
            };
            var tile = new Cesium3DTile(fakeTileset, '/some_url', tileWithBoundingSphere, undefined);
            tile.update(fakeTileset, frameState);
            expect(defined(tile._debugBoundingVolume)).toEqual(true);
            expect(tile._debugBoundingVolume._boundingSpheres.length).not.toEqual(0);
        });
    });

});
