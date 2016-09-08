/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTile',
        'Scene/TileBoundingRegion',
        'Scene/TileOrientedBoundingBox',
        'Core/Cartesian3',
        'Core/clone',
        'Core/defined',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/SphereOutlineGeometry',
        'Core/Transforms',
        'Specs/createScene'
    ], function(
        Cesium3DTile,
        TileBoundingRegion,
        TileOrientedBoundingBox,
        Cartesian3,
        clone,
        defined,
        CesiumMath,
        Matrix3,
        Matrix4,
        Rectangle,
        SphereOutlineGeometry,
        Transforms,
        createScene) {
    'use strict';

    var tileWithBoundingSphere = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        boundingVolume : {
            sphere: [0.0, 0.0, 0.0, 5.0]
        }
    };

    var tileWithContentBoundingSphere = {
        geometricError : 1,
        refine : 'replace',
        content : {
            url : '0/0.b3dm',
            boundingVolume : {
                sphere: [0.0, 0.0, 1.0, 5.0]
            }
        },
        children : [],
        boundingVolume : {
            sphere: [0.0, 0.0, 1.0, 5.0]
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

    var tileWithContentBoundingRegion = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        content : {
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

    var tileWithContentBoundingBox = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        content : {
            url : '0/0.b3dm',
            boundingVolume : {
                box : [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0]
            }
        },
        boundingVolume: {
            box : [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0]
        }
    };

    var tileWithInvalidExtension = {
        geometricError : 1,
        refine : 'replace',
        children : [],
        content : {
            url : '0/0.xxxx'
        },
        boundingVolume: {
            box : [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
        }
    };

    var mockTileset = {
        debugShowBoundingVolume : true,
        modelMatrix : Matrix4.IDENTITY
    };

    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    function getTileTransform(longitude, latitude) {
        var transformCenter = Cartesian3.fromRadians(longitude, latitude, 0.0);
        var transformMatrix = Transforms.headingPitchRollToFixedFrame(transformCenter, 0.0, 0.0, 0.0);
        return Matrix4.pack(transformMatrix, new Array(16));
    }

    it('throws if content has an unsupported extension', function() {
        expect(function() {
            return new Cesium3DTile(mockTileset, '/some_url', tileWithInvalidExtension, undefined);
        }).toThrowDeveloperError();
    });

    it('destroys', function() {
        var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
        expect(tile.isDestroyed()).toEqual(false);
        tile.destroy();
        expect(tile.isDestroyed()).toEqual(true);
    });

    describe('bounding volumes', function() {
        it('can have a bounding sphere', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
            var radius = tileWithBoundingSphere.boundingVolume.sphere[3];
            expect(tile.contentBoundingVolume).toBeDefined();
            expect(tile.contentBoundingVolume.boundingVolume.radius).toEqual(radius);
            expect(tile.contentBoundingVolume.boundingVolume.center).toEqual(Cartesian3.ZERO);
        });

        it('can have a content bounding sphere', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithContentBoundingSphere, undefined);
            var radius = tileWithContentBoundingSphere.content.boundingVolume.sphere[3];
            expect(tile.contentBoundingVolume).toBeDefined();
            expect(tile.contentBoundingVolume.boundingVolume.radius).toEqual(radius);
            expect(tile.contentBoundingVolume.boundingVolume.center).toEqual(new Cartesian3(0.0, 0.0, 1.0));
        });

        it('can have a bounding region', function() {
            var box = tileWithBoundingRegion.boundingVolume.region;
            var rectangle = new Rectangle(box[0], box[1], box[2], box[3]);
            var minimumHeight = tileWithBoundingRegion.boundingVolume.region[4];
            var maximumHeight = tileWithBoundingRegion.boundingVolume.region[5];
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingRegion, undefined);
            var tbr = new TileBoundingRegion({rectangle: rectangle, minimumHeight: minimumHeight, maximumHeight: maximumHeight});
            expect(tile.contentBoundingVolume).toBeDefined();
            expect(tile.contentBoundingVolume).toEqual(tbr);
        });

        it('can have a content bounding region', function() {
            var region = tileWithContentBoundingRegion.content.boundingVolume.region;
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithContentBoundingRegion, undefined);
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
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingBox, undefined);
            expect(tile.contentBoundingVolume).toBeDefined();
            var center = new Cartesian3(box[0], box[1], box[2]);
            var halfAxes = Matrix3.fromArray(box, 3);
            var obb = new TileOrientedBoundingBox(center, halfAxes);
            expect(tile.contentBoundingVolume).toEqual(obb);
        });

        it('can have a content oriented bounding box', function() {
            var box = tileWithContentBoundingBox.boundingVolume.box;
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithContentBoundingBox, undefined);
            expect(tile.contentBoundingVolume).toBeDefined();
            var center = new Cartesian3(box[0], box[1], box[2]);
            var halfAxes = Matrix3.fromArray(box, 3);
            var obb = new TileOrientedBoundingBox(center, halfAxes);
            expect(tile.contentBoundingVolume).toEqual(obb);
        });

        it('tile transform affects bounding sphere', function() {
            var header = clone(tileWithContentBoundingSphere, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var boundingSphere = tile._boundingVolume.boundingVolume;
            var contentBoundingSphere = tile._contentBoundingVolume.boundingVolume;

            var boundingVolumeCenter = Cartesian3.fromRadians(centerLongitude, centerLatitude, 1.0);
            expect(boundingSphere.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON4);
            expect(boundingSphere.radius).toEqual(5.0); // No change

            expect(contentBoundingSphere.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON4);
            expect(contentBoundingSphere.radius).toEqual(5.0); // No change
        });

        it('tile transform affects oriented bounding box', function() {
            var header = clone(tileWithContentBoundingBox, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var boundingBox = tile._boundingVolume.boundingVolume;
            var contentBoundingBox = tile._contentBoundingVolume.boundingVolume;

            var boundingVolumeCenter = Cartesian3.fromRadians(centerLongitude, centerLatitude, 1.0);
            expect(boundingBox.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON7);
            expect(contentBoundingBox.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON7);
        });

        it('tile transform does not affect bounding region', function() {
            var header = clone(tileWithContentBoundingRegion, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var boundingRegion = tile._boundingVolume;
            var contentBoundingRegion = tile._contentBoundingVolume;

            var region = header.boundingVolume.region;
            var rectangle = Rectangle.unpack(region);
            expect(boundingRegion.rectangle).toEqual(rectangle);
            expect(contentBoundingRegion.rectangle).toEqual(rectangle);
        });

        it('tile transform changes', function() {
            var mockTileset = {
                modelMatrix : Matrix4.IDENTITY
            };
            var header = clone(tileWithBoundingSphere, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var boundingSphere = tile._boundingVolume.boundingVolume;

            // Check the original transform
            var boundingVolumeCenter = Cartesian3.fromRadians(centerLongitude, centerLatitude);
            expect(boundingSphere.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON7);

            // Change the transform
            var newLongitude = -1.012;
            var newLatitude = 0.698874;
            tile.transform = getTileTransform(newLongitude, newLatitude);
            tile.updateTransform();

            // Check the new transform
            var newCenter = Cartesian3.fromRadians(newLongitude, newLatitude);
            expect(boundingSphere.center).toEqualEpsilon(newCenter, CesiumMath.EPSILON7);
        });
    });

    describe('debug bounding volumes', function() {
        it('can be a bounding region', function() {
            var scene = createScene();
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingRegion, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('can be an oriented bounding box', function() {
            var scene = createScene();
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingBox, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('can be a bounding sphere', function() {
            var scene = createScene();
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });
    });
}, 'WebGL');
