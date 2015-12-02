/*global defineSuite*/
defineSuite([
        'Scene/Composite3DTileContentProvider',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defaultValue',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/loadArrayBuffer',
        'Scene/Cesium3DTileContentProviderFactory',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileset',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Composite3DTileContentProvider,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        HeadingPitchRange,
        loadArrayBuffer,
        Cesium3DTileContentProviderFactory,
        Cesium3DTileContentState,
        Cesium3DTileset,
        createScene,
        pollToPromise) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var compositeUrl = './Data/Cesium3DTiles/Composite/Composite/';
    var compositeOfComposite = './Data/Cesium3DTiles/Composite/CompositeOfComposite/';

    beforeAll(function() {
        scene = createScene();

        // One item in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    function verifyRender(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    function verifyRenderBlank(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    }

    function verifyRenderTileset(tileset) {
        verifyRender(tileset);

        // Change the color of the picked building to yellow
        var pickedBuilding = scene.pickForSpecs();
        expect(pickedBuilding).toBeDefined();
        pickedBuilding.color = Color.clone(Color.YELLOW, pickedBuilding.color);

        // Expect building to be some shade of yellow
        var pixelColor = verifyRender(tileset);
        expect(pixelColor[0]).toBeGreaterThan(0);
        expect(pixelColor[1]).toBeGreaterThan(0);
        expect(pixelColor[2]).toEqual(0);
        expect(pixelColor[3]).toEqual(255);

        // Both a building and instance are located at the center, hide the building and pick the instance
        pickedBuilding.show = false;
        var pickedInstance = scene.pickForSpecs();
        expect(pickedInstance).toBeDefined();
        expect(pickedInstance).not.toEqual(pickedBuilding);
        pickedInstance.color = Color.clone(Color.GREEN, pickedInstance.color);

        // Expect instance to be some shade of green
        pixelColor = verifyRender(tileset);
        expect(pixelColor[0]).toEqual(0);
        expect(pixelColor[1]).toBeGreaterThan(0);
        expect(pixelColor[2]).toEqual(0);
        expect(pixelColor[3]).toEqual(255);

        // Hide the instance, and expect the render to be blank
        pickedInstance.show = false;
        verifyRenderBlank(tileset);
    }

    function loadTileset(url) {
        var tileset = scene.primitives.add(new Cesium3DTileset({
            url : url
        }));

        return pollToPromise(function() {
            // Render scene to progressively load the content
            scene.renderForSpecs();
            return tileset.ready && (tileset._root.isReady());
        }).then(function() {
            return tileset;
        });
    }

    function loadTileExpectError(arrayBuffer) {
        var tileset = {};
        var tile = {};
        var url = '';
        var instancedTile = new Composite3DTileContentProvider(tileset, tile, url, Cesium3DTileContentProviderFactory);
        expect(function() {
            instancedTile.initialize(arrayBuffer);
            instancedTile.update(tileset, scene.frameState);
        }).toThrowDeveloperError();
    }

    function generateInstancedTileBuffer(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [105, 51, 100, 109]);
        var version = defaultValue(options.version, 1);
        var gltfFormat = defaultValue(options.gltfFormat, 1);
        var instancesLength = defaultValue(options.instancesLength, 1);

        var headerByteLength = 28;
        var instancesByteLength = instancesLength * 16;
        var byteLength = headerByteLength + instancesByteLength;
        var buffer = new ArrayBuffer(byteLength);
        var view = new DataView(buffer);
        view.setUint8(0, magic[0]);
        view.setUint8(1, magic[1]);
        view.setUint8(2, magic[2]);
        view.setUint8(3, magic[3]);
        view.setUint32(4, version, true);          // version
        view.setUint32(8, byteLength, true);       // byteLength
        view.setUint32(12, 0, true);               // batchTableByteLength
        view.setUint32(16, 0, true);               // gltfByteLength
        view.setUint32(20, gltfFormat, true);      // gltfFormat
        view.setUint32(24, instancesLength, true); // instancesLength

        var byteOffset = headerByteLength;
        for (var j = 0; j < instancesLength; ++j) {
            view.setFloat64(byteOffset, centerLongitude, true);
            view.setFloat64(byteOffset + 8, centerLatitude, true);
            byteOffset += 16;
        }

        return buffer;
    }

    function generateTileBuffer(options) {
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
    }

    it('throws with invalid magic', function() {
        loadTileExpectError(generateTileBuffer({
            magic : [120, 120, 120, 120]
        }));
    });

    it('throws with invalid version', function() {
        loadTileExpectError(generateTileBuffer({
            version: 2
        }));
    });

    it('throws with invalid inner tile content type', function() {
        loadTileExpectError(generateTileBuffer({
            tiles : [generateInstancedTileBuffer({
                magic : [120, 120, 120, 120]
            })]
        }));
    });

    it('resolves readyPromise', function() {
        return loadTileset(compositeUrl).then(function(tileset) {
            var content = tileset._root.content;
            content.readyPromise.then(function(content) {
                verifyRenderTileset(tileset);
            });
        });
    });

    it('rejects readyPromise on error', function() {
        // Try loading a composite tile with an instanced tile that has an invalid url.
        // Expect promise to be rejected in Model, ModelInstanceCollection,
        // Instanced3DModel3DTileContentProvider, and Composite3DTileContentProvider.
        var arrayBuffer = generateTileBuffer({
            tiles : [generateInstancedTileBuffer({
                gltfFormat : 0
            })]
        });

        var tileset = {};
        var tile = {};
        var url = '';
        var compositeTile = new Composite3DTileContentProvider(tileset, tile, url, Cesium3DTileContentProviderFactory);
        compositeTile.initialize(arrayBuffer);
        compositeTile.update(tileset, scene.frameState);

        return compositeTile.readyPromise.then(function(compositeTile) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(compositeTile.state).toEqual(Cesium3DTileContentState.FAILED);
        });
    });

    it('rejects readyPromise on failed request', function() {
        var tileset = {};
        var tile = {};
        var url = 'invalid.b3dm';
        var compositeTile = new Composite3DTileContentProvider(tileset, tile, url, Cesium3DTileContentProviderFactory);
        compositeTile.request();

        return compositeTile.readyPromise.then(function(compositeTile) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(compositeTile.state).toEqual(Cesium3DTileContentState.FAILED);
            expect(error.statusCode).toEqual(404);
        });
    });
    
    it('renders composite', function() {
        return loadTileset(compositeUrl).then(verifyRenderTileset);
    });

    it('renders composite of composite', function() {
        return loadTileset(compositeOfComposite).then(verifyRenderTileset);
    });

    it('destroys', function() {
        return loadTileset(compositeUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.isDestroyed()).toEqual(false);
            content.destroy();
            expect(content.isDestroyed()).toEqual(true);
        });
    });
});
