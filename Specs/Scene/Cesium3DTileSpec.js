defineSuite([
        'Scene/Cesium3DTile',
        'Core/Cartesian3',
        'Core/clone',
        'Core/HeadingPitchRoll',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Rectangle',
        'Core/Transforms',
        'Scene/Cesium3DTileRefine',
        'Scene/TileBoundingRegion',
        'Scene/TileOrientedBoundingBox',
        'Specs/createScene'
    ], function(
        Cesium3DTile,
        Cartesian3,
        clone,
        HeadingPitchRoll,
        CesiumMath,
        Matrix3,
        Matrix4,
        Rectangle,
        Transforms,
        Cesium3DTileRefine,
        TileBoundingRegion,
        TileOrientedBoundingBox,
        createScene) {
    'use strict';

    var tileWithBoundingSphere = {
        geometricError : 1,
        refine : 'REPLACE',
        children : [],
        boundingVolume : {
            sphere: [0.0, 0.0, 0.0, 5.0]
        }
    };

    var tileWithContentBoundingSphere = {
        geometricError : 1,
        refine : 'REPLACE',
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
        refine : 'REPLACE',
        children : [],
        boundingVolume: {
            region : [-1.2, -1.2, 0.0, 0.0, -30, -34]
        }
    };

    var tileWithContentBoundingRegion = {
        geometricError : 1,
        refine : 'REPLACE',
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
        refine : 'REPLACE',
        children : [],
        boundingVolume: {
            box : [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
        }
    };

    var tileWithContentBoundingBox = {
        geometricError : 1,
        refine : 'REPLACE',
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

    var tileWithViewerRequestVolume = {
        geometricError : 1,
        refine : 'REPLACE',
        children : [],
        boundingVolume: {
            box : [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0]
        },
        viewerRequestVolume : {
            box : [0.0, 0.0, 1.0, 2.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 2.0]
        }
    };

    var mockTileset = {
        debugShowBoundingVolume : true,
        debugShowViewerRequestVolume : true,
        modelMatrix : Matrix4.IDENTITY,
        _geometricError : 2
    };

    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    function getTileTransform(longitude, latitude) {
        var transformCenter = Cartesian3.fromRadians(longitude, latitude, 0.0);
        var hpr = new HeadingPitchRoll();
        var transformMatrix = Transforms.headingPitchRollToFixedFrame(transformCenter, hpr);
        return Matrix4.pack(transformMatrix, new Array(16));
    }

    it('destroys', function() {
        var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
        expect(tile.isDestroyed()).toEqual(false);
        tile.destroy();
        expect(tile.isDestroyed()).toEqual(true);
    });

    it('throws if boundingVolume is undefined', function() {
        var tileWithoutBoundingVolume = clone(tileWithBoundingSphere, true);
        delete tileWithoutBoundingVolume.boundingVolume;
        expect(function() {
            return new Cesium3DTile(mockTileset, '/some_url', tileWithoutBoundingVolume, undefined);
        }).toThrowRuntimeError();
    });

    it('throws if boundingVolume does not contain a sphere, region, or box', function() {
        var tileWithoutBoundingVolume = clone(tileWithBoundingSphere, true);
        delete tileWithoutBoundingVolume.boundingVolume.sphere;
        expect(function() {
            return new Cesium3DTile(mockTileset, '/some_url', tileWithoutBoundingVolume, undefined);
        }).toThrowRuntimeError();
    });

    it('logs deprecation warning if refine is lowercase', function() {
        spyOn(Cesium3DTile, '_deprecationWarning');
        var header = clone(tileWithBoundingSphere, true);
        header.refine = 'replace';
        var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
        expect(tile.refine).toBe(Cesium3DTileRefine.REPLACE);
        expect(Cesium3DTile._deprecationWarning).toHaveBeenCalled();
    });

    it('logs deprecation warning if geometric error is undefined', function() {
        spyOn(Cesium3DTile, '_deprecationWarning');

        var geometricErrorMissing = clone(tileWithBoundingSphere, true);
        delete geometricErrorMissing.geometricError;

        var parent = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
        var child = new Cesium3DTile(mockTileset, '/some_url', geometricErrorMissing, parent);
        expect(child.geometricError).toBe(parent.geometricError);
        expect(child.geometricError).toBe(1);

        var tile = new Cesium3DTile(mockTileset, '/some_url', geometricErrorMissing, undefined);
        expect(tile.geometricError).toBe(mockTileset._geometricError);
        expect(tile.geometricError).toBe(2);

        expect(Cesium3DTile._deprecationWarning.calls.count()).toBe(2);
    });

    describe('bounding volumes', function() {
        it('returns the tile bounding volume if the content bounding volume is undefined', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
            expect(tile.boundingVolume).toBeDefined();
            expect(tile.contentBoundingVolume).toBe(tile.boundingVolume);
        });

        it('can have a bounding sphere', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
            var radius = tileWithBoundingSphere.boundingVolume.sphere[3];
            expect(tile.boundingVolume).toBeDefined();
            expect(tile.boundingVolume.boundingVolume.radius).toEqual(radius);
            expect(tile.boundingVolume.boundingVolume.center).toEqual(Cartesian3.ZERO);
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
            expect(tile.boundingVolume).toBeDefined();
            expect(tile.boundingVolume).toEqual(tbr);
        });

        it('can have a content bounding region', function() {
            var region = tileWithContentBoundingRegion.content.boundingVolume.region;
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithContentBoundingRegion, undefined);
            expect(tile.contentBoundingVolume).toBeDefined();
            var tbb = new TileBoundingRegion({
                rectangle: new Rectangle(region[0], region[1], region[2], region[3]),
                minimumHeight: region[4],
                maximumHeight: region[5]
            });
            expect(tile.contentBoundingVolume).toEqual(tbb);
        });

        it('can have an oriented bounding box', function() {
            var box = tileWithBoundingBox.boundingVolume.box;
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingBox, undefined);
            expect(tile.boundingVolume).toBeDefined();
            var center = new Cartesian3(box[0], box[1], box[2]);
            var halfAxes = Matrix3.fromArray(box, 3);
            var obb = new TileOrientedBoundingBox(center, halfAxes);
            expect(tile.boundingVolume).toEqual(obb);
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
            var boundingSphere = tile.boundingVolume.boundingVolume;
            var contentBoundingSphere = tile.contentBoundingVolume.boundingVolume;

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
            var boundingBox = tile.boundingVolume.boundingVolume;
            var contentBoundingBox = tile.contentBoundingVolume.boundingVolume;

            var boundingVolumeCenter = Cartesian3.fromRadians(centerLongitude, centerLatitude, 1.0);
            expect(boundingBox.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON7);
            expect(contentBoundingBox.center).toEqualEpsilon(boundingVolumeCenter, CesiumMath.EPSILON7);
        });

        it('tile transform does not affect bounding region', function() {
            var header = clone(tileWithContentBoundingRegion, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var boundingRegion = tile.boundingVolume;
            var contentBoundingRegion = tile.contentBoundingVolume;

            var region = header.boundingVolume.region;
            var rectangle = Rectangle.unpack(region);
            expect(boundingRegion.rectangle).toEqual(rectangle);
            expect(contentBoundingRegion.rectangle).toEqual(rectangle);
        });

        it('tile transform affects viewer request volume', function() {
            var header = clone(tileWithViewerRequestVolume, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var requestVolume = tile._viewerRequestVolume.boundingVolume;
            var requestVolumeCenter = Cartesian3.fromRadians(centerLongitude, centerLatitude, 1.0);
            expect(requestVolume.center).toEqualEpsilon(requestVolumeCenter, CesiumMath.EPSILON7);
        });

        it('tile transform changes', function() {
            var mockTileset = {
                modelMatrix : Matrix4.IDENTITY
            };
            var header = clone(tileWithBoundingSphere, true);
            header.transform = getTileTransform(centerLongitude, centerLatitude);
            var tile = new Cesium3DTile(mockTileset, '/some_url', header, undefined);
            var boundingSphere = tile.boundingVolume.boundingVolume;

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
        var scene;
        beforeEach(function() {
            scene = createScene();
            scene.frameState.passes.render = true;
        });

        afterEach(function() {
            scene.destroyForSpecs();
        });

        it('can be a bounding region', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingRegion, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('can be an oriented bounding box', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingBox, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('can be a bounding sphere', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugBoundingVolume).toBeDefined();
        });

        it('creates debug bounding volume for viewer request volume', function() {
            var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithViewerRequestVolume, undefined);
            tile.update(mockTileset, scene.frameState);
            expect(tile._debugViewerRequestVolume).toBeDefined();
        });
    });
}, 'WebGL');
