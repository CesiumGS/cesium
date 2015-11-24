/*global defineSuite*/
defineSuite([
        'Scene/Instanced3DModel3DTileContentProvider',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defaultValue',
        'Core/defined',
        'Core/HeadingPitchRange',
        'Core/loadArrayBuffer',
        'Scene/Cesium3DTileContentState',
        'Scene/Cesium3DTileset',
        'Specs/createCanvas',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        Instanced3DModel3DTileContentProvider,
        Cartesian3,
        Color,
        defaultValue,
        defined,
        HeadingPitchRange,
        loadArrayBuffer,
        Cesium3DTileContentState,
        Cesium3DTileset,
        createCanvas,
        createScene,
        pollToPromise) {
    "use strict";

    var scene;

    beforeAll(function() {
        scene = createScene();

        // One instance in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(-1.31995, 0.69871, 5.0);
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

    function loadTileExpectProcessing(url) {
        var tileset = {};
        var tile = {};
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        return loadArrayBuffer(url).then(function(arrayBuffer) {
            instancedTile.initialize(arrayBuffer);
            // Expect to stay in the processing state
            for (var i = 0; i < 10; ++i) {
                instancedTile.update(tileset, scene.frameState);
                expect(instancedTile.state).toEqual(Cesium3DTileContentState.PROCESSING);
            }
        });
    }

    function loadTileExpectError(url) {
        var tileset = {};
        var tile = {};
        var instancedTile = new Instanced3DModel3DTileContentProvider(tileset, tile, url);
        return loadArrayBuffer(url).then(function(arrayBuffer) {
            expect(function() {
                instancedTile.initialize(arrayBuffer);
                instancedTile.update(tileset, scene.frameState);
            }).toThrowDeveloperError();
        });
    }

    it('throws with invalid magic', function() {
        return loadTileExpectError('./Data/Tiles3D/instanced/instancedInvalidMagic/instancedInvalidMagic.i3dm');
    });

    it('throws with invalid format', function() {
        return loadTileExpectError('./Data/Tiles3D/instanced/instancedInvalidGltfFormat/instancedInvalidGltfFormat.i3dm');
    });

    it('throws with invalid version', function() {
        return loadTileExpectError('./Data/Tiles3D/instanced/instancedInvalidVersion/instancedInvalidVersion.i3dm');
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError due to invalid glTF magic
        return loadTileExpectError('./Data/Tiles3D/instanced/instancedEmptyGltf/instancedEmptyGltf.i3dm');
    });

    it('loads with no instances, but does not become ready', function() {
        // Expect the tile to never reach the ready state due to returning early in ModelInstanceCollection
        return loadTileExpectProcessing('./Data/Tiles3D/instanced/instancedNoInstances/instancedNoInstances.i3dm');
    });

    it('renders with embedded gltf', function() {
        return loadTileset('./Data/Tiles3D/instanced/instancedGltfEmbedded/').then(verifyRenderTileset);
    });

    it('renders with external gltf', function() {
        return loadTileset('./Data/Tiles3D/instanced/instancedGltfExternal/').then(verifyRenderTileset);
    });

    it('renders with batch table', function() {
        return loadTileset('./Data/Tiles3D/instanced/instancedWithBatchTable/').then(verifyRenderTileset);
    });

    it('renders without batch table', function() {
        return loadTileset('./Data/Tiles3D/instanced/instancedWithoutBatchTable/').then(verifyRenderTileset);
    });

    it('renders when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return loadTileset('./Data/Tiles3D/instanced/instancedWithoutBatchTable/').then(function(tileset) {
            verifyRenderTileset(tileset);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });
});
