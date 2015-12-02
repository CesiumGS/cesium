/*global defineSuite*/
defineSuite([
        'Scene/Batched3DModel3DTileContentProvider',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defaultValue',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/loadArrayBuffer',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileset',
        'Scene/Model',
        'Specs/createScene',
        'Specs/pollToPromise',
        'ThirdParty/when'
    ], function(
        Batched3DModel3DTileContentProvider,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        HeadingPitchRange,
        loadArrayBuffer,
        Cesium3DTileContentState,
        Cesium3DTileset,
        Model,
        createScene,
        pollToPromise,
        when) {
    "use strict";

    var scene;
    var centerLongitude = -1.31995;
    var centerLatitude = 0.69871;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';

    beforeAll(function() {
        scene = createScene();

        // One building in each data set is always located in the center, so point the camera there
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
        // Verify render before being picked
        verifyRender(tileset);

        // Change the color of the picked building to yellow
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
        var batchedTile = new Batched3DModel3DTileContentProvider(tileset, tile, url);
        expect(function() {
            batchedTile.initialize(arrayBuffer);
            batchedTile.update(tileset, scene.frameState);
        }).toThrowDeveloperError();
    }

    function generateTileBuffer(options) {
        // Procedurally generate the tile array buffer for testing purposes
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var magic = defaultValue(options.magic, [98, 51, 100, 109]);
        var version = defaultValue(options.version, 1);
        var batchLength = defaultValue(options.batchLength, 1);

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
        view.setUint32(12, batchLength, true);     // batchLength
        view.setUint32(16, 0, true);               // batchTableByteLength

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

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        loadTileExpectError(generateTileBuffer());
    });

    it('resolves readyPromise', function() {
        return loadTileset(withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            content.readyPromise.then(function(content) {
                verifyRenderTileset(tileset);
            });
        });
    });

    it('rejects readyPromise on failed request', function() {
        var tileset = {};
        var tile = {};
        var url = 'invalid.b3dm';
        var batchedTile = new Batched3DModel3DTileContentProvider(tileset, tile, url);
        batchedTile.request();

        return batchedTile.readyPromise.then(function(batchedTile) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(batchedTile.state).toEqual(Cesium3DTileContentState.FAILED);
            expect(error.statusCode).toEqual(404);
        });
    });

    it('renders with batch table', function() {
        return loadTileset(withBatchTableUrl).then(verifyRenderTileset);
    });

    it('renders without batch table', function() {
        return loadTileset(withoutBatchTableUrl).then(verifyRenderTileset);
    });

    it('throws when calling getModel with invalid index', function() {
        return loadTileset(withoutBatchTableUrl).then(function(tileset) {
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
        return loadTileset(withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.isDestroyed()).toEqual(false);
            content.destroy();
            expect(content.isDestroyed()).toEqual(true);
        });
    });
});
