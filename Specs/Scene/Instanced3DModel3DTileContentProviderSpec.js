/*global defineSuite*/
defineSuite([
        'Scene/Instanced3DModel3DTileContentProvider',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defaultValue',
        'Core/HeadingPitchRange',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileset',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Instanced3DModel3DTileContentProvider,
        Cartesian3,
        Color,
        defaultValue,
        HeadingPitchRange,
        Cesium3DTileContentState,
        Cesium3DTileset,
        createScene,
        pollToPromise) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var gltfEmbeddedUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfEmbedded/';
    var gltfExternalUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfExternal/';
    var withBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/';

    beforeAll(function() {
        scene = createScene();

        // One instance in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));
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
        // Verify render before being picked
        verifyRender(tileset);

        // Change the color of the picked instance to yellow
        var picked = scene.pickForSpecs();
        expect(picked).toBeDefined();
        picked.color = Color.clone(Color.YELLOW, picked.color);

        // Expect the pixel color to be some shade of yellow
        var pixelColor = verifyRender(tileset);
        expect(pixelColor[0]).toBeGreaterThan(0);
        expect(pixelColor[1]).toBeGreaterThan(0);
        expect(pixelColor[2]).toEqual(0);
        expect(pixelColor[3]).toEqual(255);

        // Turn show off and on
        picked.show = false;
        verifyRenderBlank(tileset);
        picked.show = true;
        verifyRender(tileset);
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
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        expect(function() {
            instancedTile.initialize(arrayBuffer);
            instancedTile.update(tileset, scene.frameState);
        }).toThrowDeveloperError();
    }

    function generateTileBuffer(options) {
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

    it('throws with invalid magic', function() {
        loadTileExpectError(generateTileBuffer({
            magic : [120, 120, 120, 120]
        }));
    });

    it('throws with invalid format', function() {
        loadTileExpectError(generateTileBuffer({
            gltfFormat : 2
        }));
    });

    it('throws with invalid version', function() {
        loadTileExpectError(generateTileBuffer({
            version: 2
        }));
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        loadTileExpectError(generateTileBuffer());
    });

    it('resolves readyPromise', function() {
        return loadTileset(gltfEmbeddedUrl).then(function(tileset) {
            var content = tileset._root.content;
            content.readyPromise.then(function(content) {
                verifyRenderTileset(tileset);
            });
        });
    });

    it('rejects readyPromise on error', function() {
        // Try loading a tile with an invalid url.
        // Expect promise to be rejected in Model, then in ModelInstanceCollection, and
        // finally in Instanced3DModel3DTileContentProvider.
        var arrayBuffer = generateTileBuffer({
            gltfFormat : 0
        });

        var tileset = {url : ''};
        var tile = {};
        var url = '';
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        instancedTile.initialize(arrayBuffer);
        instancedTile.update(tileset, scene.frameState);

        return instancedTile.readyPromise.then(function(instancedTile) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(instancedTile.state).toEqual(Cesium3DTileContentState.FAILED);
        });
    });

    it('rejects readyPromise on failed request', function() {
        var tileset = {};
        var tile = {};
        var url = 'invalid.i3dm';
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        instancedTile.request();

        return instancedTile.readyPromise.then(function(instancedTile) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(instancedTile.state).toEqual(Cesium3DTileContentState.FAILED);
            expect(error.statusCode).toEqual(404);
        });
    });

    it('loads with no instances, but does not become ready', function() {
        var arrayBuffer = generateTileBuffer({
            instancesLength : 0
        });
        var tileset = {};
        var tile = {};
        var url = '';
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        instancedTile.initialize(arrayBuffer);
        // Expect the tile to never reach the ready state due to returning early in ModelInstanceCollection
        for (var i = 0; i < 10; ++i) {
            instancedTile.update(tileset, scene.frameState);
            expect(instancedTile.state).toEqual(Cesium3DTileContentState.PROCESSING);
        }
    });

    it('renders with embedded gltf', function() {
        return loadTileset(gltfEmbeddedUrl).then(verifyRenderTileset);
    });

    it('renders with external gltf', function() {
        return loadTileset(gltfExternalUrl).then(verifyRenderTileset);
    });

    it('renders with batch table', function() {
        return loadTileset(withBatchTableUrl).then(verifyRenderTileset);
    });

    it('renders without batch table', function() {
        return loadTileset(withoutBatchTableUrl).then(verifyRenderTileset);
    });

    it('renders when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadTileset(gltfEmbeddedUrl).then(function(tileset) {
            verifyRenderTileset(tileset);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('throws when calling getModel with invalid index', function() {
        return loadTileset(gltfEmbeddedUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getModel(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getModel(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getModel();
            }).toThrowDeveloperError();
        });
    });

    it('destroys', function() {
        return loadTileset(gltfEmbeddedUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.isDestroyed()).toEqual(false);
            content.destroy();
            expect(content.isDestroyed()).toEqual(true);
        });
    });
});
