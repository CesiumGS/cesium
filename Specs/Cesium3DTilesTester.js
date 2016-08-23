/*global define*/
define([
        'Core/Color',
        'Core/defaultValue',
        'Scene/Cesium3DTileContentFactory',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileset',
        'Scene/TileBoundingSphere',
        'Specs/pollToPromise'
    ], function(
        Color,
        defaultValue,
        Cesium3DTileContentFactory,
        Cesium3DTileContentState,
        Cesium3DTileset,
        TileBoundingSphere,
        pollToPromise) {
    'use strict';

    function Cesium3DTilesTester() {
    }

    function expectRender(scene, tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    function expectRenderBlank(scene, tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    }

    Cesium3DTilesTester.expectRenderTileset = function(scene, tileset) {
        // Verify render before being picked
        expectRender(scene, tileset);

        // Change the color of the picked instance to yellow
        var picked = scene.pickForSpecs();
        expect(picked).toBeDefined();
        picked.color = Color.clone(Color.YELLOW, picked.color);

        // Expect the pixel color to be some shade of yellow
        var pixelColor = expectRender(scene, tileset);
        expect(pixelColor[0]).toBeGreaterThan(0);
        expect(pixelColor[1]).toBeGreaterThan(0);
        expect(pixelColor[2]).toEqual(0);
        expect(pixelColor[3]).toEqual(255);

        // Turn show off and on
        picked.show = false;
        expectRenderBlank(scene, tileset);
        picked.show = true;
        expectRender(scene, tileset);
    };

    Cesium3DTilesTester.waitForPendingRequests = function(scene, tileset) {
        return pollToPromise(function() {
            scene.renderForSpecs();
            var stats = tileset._statistics;
            return ((stats.numberOfPendingRequests === 0) && (stats.numberProcessing === 0));
        });
    };

    Cesium3DTilesTester.loadTileset = function(scene, url) {
        // Load all visible tiles
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : url
        }));

        return tileset.readyPromise.then(function() {
            return Cesium3DTilesTester.waitForPendingRequests(scene, tileset).then(function() {
                return tileset;
            });
        });
    };

    Cesium3DTilesTester.loadTileExpectError = function(scene, arrayBuffer, type) {
        var tileset = {};
        var tile = {
            contentBoundingVolume : new TileBoundingSphere()
        };
        var url = '';
        var content = Cesium3DTileContentFactory[type](tileset, tile, url);
        expect(function() {
            content.initialize(arrayBuffer);
            content.update(tileset, scene.frameState);
        }).toThrowDeveloperError();
    };

    // Use counter to prevent models from sharing the same cache key,
    // this fixes tests that load a model with the same invalid url
    var counter = 0;
    Cesium3DTilesTester.rejectsReadyPromiseOnError = function(scene, arrayBuffer, type) {
        var tileset = {
            baseUrl : counter++
        };
        var tile = {
            contentBoundingVolume : new TileBoundingSphere()
        };
        var url = '';
        var content = Cesium3DTileContentFactory[type](tileset, tile, url);
        content.initialize(arrayBuffer);
        content.update(tileset, scene.frameState);

        return content.readyPromise.then(function(content) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(content.state).toEqual(Cesium3DTileContentState.FAILED);
        });
    };

    Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest = function(type) {
        var tileset = {
            loadTileset : Cesium3DTileset.prototype.loadTileset
        };
        var tile = {
            contentBoundingVolume : new TileBoundingSphere()
        };
        var url = 'invalid';
        var content = Cesium3DTileContentFactory[type](tileset, tile, url);
        content.request();

        return content.readyPromise.then(function(content) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(content.state).toEqual(Cesium3DTileContentState.FAILED);
            expect(error.statusCode).toEqual(404);
        });
    };

    Cesium3DTilesTester.resolvesReadyPromise = function(scene, url) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            var content = tileset._root.content;
            return content.readyPromise.then(function(content) {
                expect(content.state).toEqual(Cesium3DTileContentState.READY);
            });
        });
    };

    Cesium3DTilesTester.tileDestroys = function(scene, url) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.isDestroyed()).toEqual(false);
            scene.primitives.remove(tileset);
            expect(content.isDestroyed()).toEqual(true);
        });
    };

    Cesium3DTilesTester.tileDestroysBeforeLoad = function(scene, url) {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : url
        }));
        scene.renderForSpecs();
        return tileset.readyPromise.then(function(tileset) {
            var content = tileset._root.content;
            scene.renderForSpecs(); // Request root
            scene.primitives.remove(tileset);

            return content.readyPromise.then(function(content) {
                fail('should not resolve');
            }).otherwise(function(error) {
                expect(content.state).toEqual(Cesium3DTileContentState.FAILED);
                return content;
            });
        });
    };

    Cesium3DTilesTester.generateBatchedTileBuffer = function(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [98, 51, 100, 109]);
        var version = defaultValue(options.version, 1);
        var featuresLength = defaultValue(options.featuresLength, 1);

        var headerByteLength = 20;
        var byteLength = headerByteLength;
        var buffer = new ArrayBuffer(byteLength);
        var view = new DataView(buffer);
        view.setUint8(0, magic[0]);
        view.setUint8(1, magic[1]);
        view.setUint8(2, magic[2]);
        view.setUint8(3, magic[3]);
        view.setUint32(4, version, true);          // version
        view.setUint32(8, byteLength, true);       // byteLength
        view.setUint32(12, featuresLength, true);  // featuresLength
        view.setUint32(16, 0, true);               // batchTableByteLength

        return buffer;
    };

    Cesium3DTilesTester.generateInstancedTileBuffer = function(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [105, 51, 100, 109]);
        var version = defaultValue(options.version, 1);

        var gltfFormat = defaultValue(options.gltfFormat, 1);
        var gltfUri = defaultValue(options.gltfUri, '');
        var gltfUriByteLength = gltfUri.length;

        var featuresLength = defaultValue(options.featuresLength, 1);
        var featureTableJSON = {
            INSTANCES_LENGTH : featuresLength,
            POSITION : new Array(featuresLength * 3).fill(0)
        };
        var featureTableJSONString = JSON.stringify(featureTableJSON);
        var featureTableJSONByteLength = featureTableJSONString.length;

        var headerByteLength = 32;
        var uriByteLength = gltfUri.length;
        var byteLength = headerByteLength + featureTableJSONByteLength + uriByteLength;
        var buffer = new ArrayBuffer(byteLength);
        var view = new DataView(buffer);
        view.setUint8(0, magic[0]);
        view.setUint8(1, magic[1]);
        view.setUint8(2, magic[2]);
        view.setUint8(3, magic[3]);
        view.setUint32(4, version, true);                        // version
        view.setUint32(8, byteLength, true);                     // byteLength
        view.setUint32(12, featureTableJSONByteLength, true);    // featureTableJSONByteLength
        view.setUint32(16, 0, true);                             // featureTableBinaryByteLength
        view.setUint32(20, 0, true);                             // batchTableJSONByteLength
        view.setUint32(24, 0, true);                             // batchTableBinaryByteLength
        view.setUint32(38, gltfFormat, true);                    // gltfFormat

        var i;
        var byteOffset = headerByteLength;
        for (i = 0; i < featureTableJSONByteLength; i++) {
            view.setUint8(byteOffset, featureTableJSONString.charCodeAt(i));
            byteOffset++;
        }
        for (i = 0; i < gltfUriByteLength; i++) {
            view.setUint8(byteOffset, gltfUri.charCodeAt(i));
            byteOffset++;
        }
        return buffer;
    };

    Cesium3DTilesTester.generatePointsTileBuffer = function(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [112, 110, 116, 115]);
        var version = defaultValue(options.version, 1);

        var headerByteLength = 24;
        var byteLength = headerByteLength;
        var buffer = new ArrayBuffer(byteLength);
        var view = new DataView(buffer);
        view.setUint8(0, magic[0]);
        view.setUint8(1, magic[1]);
        view.setUint8(2, magic[2]);
        view.setUint8(3, magic[3]);
        view.setUint32(4, version, true);          // version
        view.setUint32(8, byteLength, true);       // byteLength
        view.setUint32(12, 0, true);               // pointsLength
        view.setUint32(16, 0, true);               // batchTableJSONByteLength
        view.setUint32(20, 0, true);               // batchTableBinaryByteLength

        return buffer;
    };

    Cesium3DTilesTester.generateCompositeTileBuffer = function(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [99, 109, 112, 116]);
        var version = defaultValue(options.version, 1);
        var tiles = defaultValue(options.tiles, []);
        var tilesLength = tiles.length;

        var i;
        var tilesByteLength = 0;
        for (i = 0; i < tilesLength; ++i) {
            tilesByteLength += tiles[i].byteLength;
        }

        var headerByteLength = 16;
        var byteLength = headerByteLength + tilesByteLength;
        var buffer = new ArrayBuffer(byteLength);
        var uint8Array = new Uint8Array(buffer);
        var view = new DataView(buffer);
        view.setUint8(0, magic[0]);
        view.setUint8(1, magic[1]);
        view.setUint8(2, magic[2]);
        view.setUint8(3, magic[3]);
        view.setUint32(4, version, true);          // version
        view.setUint32(8, byteLength, true);       // byteLength
        view.setUint32(12, tilesLength, true);     // tilesLength

        var byteOffset = headerByteLength;
        for (i = 0; i < tilesLength; ++i) {
            var tile = new Uint8Array(tiles[i]);
            uint8Array.set(tile, byteOffset);
            byteOffset += tile.byteLength;
        }

        return buffer;
    };

    return Cesium3DTilesTester;
});
