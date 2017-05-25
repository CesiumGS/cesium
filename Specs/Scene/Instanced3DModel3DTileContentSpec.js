/*global defineSuite*/
defineSuite([
        'Scene/Instanced3DModel3DTileContent',
        'Core/Cartesian3',
        'Core/Color',
        'Core/HeadingPitchRange',
        'Core/HeadingPitchRoll',
        'Core/Transforms',
        'Scene/Cesium3DTileContentState',
        'Scene/TileBoundingSphere',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Instanced3DModel3DTileContent,
        Cartesian3,
        Color,
        HeadingPitchRange,
        HeadingPitchRoll,
        Transforms,
        Cesium3DTileContentState,
        TileBoundingSphere,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var gltfExternalUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfExternal/';
    var withBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithBatchTable/';
    var withBatchTableBinaryUrl = './Data/Cesium3DTiles/Instanced/InstancedWithBatchTableBinary/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Instanced/InstancedWithoutBatchTable/';
    var orientationUrl = './Data/Cesium3DTiles/Instanced/InstancedOrientation/';
    var oct16POrientationUrl = './Data/Cesium3DTiles/Instanced/InstancedOct32POrientation/';
    var scaleUrl = './Data/Cesium3DTiles/Instanced/InstancedScale/';
    var scaleNonUniformUrl = './Data/Cesium3DTiles/Instanced/InstancedScaleNonUniform/';
    var rtcUrl = './Data/Cesium3DTiles/Instanced/InstancedRTC';
    var quantizedUrl = './Data/Cesium3DTiles/Instanced/InstancedQuantized/';
    var quantizedOct32POrientationUrl = './Data/Cesium3DTiles/Instanced/InstancedQuantizedOct32POrientation/';
    var withTransformUrl = './Data/Cesium3DTiles/Instanced/InstancedWithTransform/';
    var withBatchIdsUrl = './Data/Cesium3DTiles/Instanced/InstancedWithBatchIds/';
    var texturedUrl = './Data/Cesium3DTiles/Instanced/InstancedTextured/';
    var compressedTexturesUrl = './Data/Cesium3DTiles/Instanced/InstancedCompressedTextures/';
    var gltfZUpUrl = './Data/Cesium3DTiles/Instanced/InstancedGltfZUp';

    function setCamera(longitude, latitude) {
        // One instance is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 27.0));
    }

    beforeAll(function() {
        scene = createScene();
    });

    beforeEach(function() {
        scene.morphTo3D(0.0);
        setCamera(centerLongitude, centerLatitude);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws with invalid format', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat : 2
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            version : 2
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer();
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'i3dm');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, withoutBatchTableUrl);
    });

    it('rejects readyPromise on error', function() {
        // Try loading a tile with an invalid url.
        // Expect promise to be rejected in Model, then in ModelInstanceCollection, and
        // finally in Instanced3DModel3DTileContent.
        var arrayBuffer = Cesium3DTilesTester.generateInstancedTileBuffer({
            gltfFormat : 0,
            gltfUri : 'not-a-real-path'
        });
        return Cesium3DTilesTester.rejectsReadyPromiseOnError(scene, arrayBuffer, 'i3dm');
    });

    it('renders with external gltf', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with batch table binary', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableBinaryUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders without batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, orientationUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined Oct32P encoded orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, oct16POrientationUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined scale', function() {
        return Cesium3DTilesTester.loadTileset(scene, scaleUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined non-uniform scale', function() {
        return Cesium3DTilesTester.loadTileset(scene, scaleNonUniformUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with RTC_CENTER semantic', function() {
        return Cesium3DTilesTester.loadTileset(scene, rtcUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined quantized position', function() {
        return Cesium3DTilesTester.loadTileset(scene, quantizedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with feature defined quantized position and Oct32P encoded orientation', function() {
        return Cesium3DTilesTester.loadTileset(scene, quantizedOct32POrientationUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with batch ids', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchIdsUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with a gltf z-up axis', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfZUpUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with tile transform', function() {
        return Cesium3DTilesTester.loadTileset(scene, withTransformUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);

            var newLongitude = -1.31962;
            var newLatitude = 0.698874;
            var newCenter = Cartesian3.fromRadians(newLongitude, newLatitude, 10.0);
            var newTransform = Transforms.headingPitchRollToFixedFrame(newCenter, new HeadingPitchRoll());

            // Update tile transform
            tileset._root.transform = newTransform;

            // Move the camera to the new location
            setCamera(newLongitude, newLatitude);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with textures', function() {
        return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with compressed textures', function() {
        return Cesium3DTilesTester.loadTileset(scene, compressedTexturesUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders in 2D', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            tileset.maximumScreenSpaceError = 2.0;
            scene.morphTo2D(0.0);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders in 2D with tile transform', function() {
        return Cesium3DTilesTester.loadTileset(scene, withTransformUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            tileset.maximumScreenSpaceError = 2.0;
            scene.morphTo2D(0.0);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders in CV', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfExternalUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            scene.morphToColumbusView(0.0);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders in CV with tile transform', function() {
        return Cesium3DTilesTester.loadTileset(scene, withTransformUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            scene.morphToColumbusView(0.0);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders when instancing is disabled', function() {
        // Disable extension
        var instancedArrays = scene.context._instancedArrays;
        scene.context._instancedArrays = undefined;

        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            // Re-enable extension
            scene.context._instancedArrays = instancedArrays;
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(10000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('gets memory usage', function() {
        return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function(tileset) {
            var content = tileset._root.content;

            // Box model - 32 ushort indices and 24 vertices per building, 8 float components (position, normal, uv) per vertex.
            // (24 * 8 * 4) + (36 * 2) = 840
            var geometryByteLength = 840;

            // Texture is 211x211 RGBA bytes, but upsampled to 256x256 because the wrap mode is REPEAT
            var texturesByteLength = 262144;

            // One RGBA byte pixel per feature
            var batchTexturesByteLength = content.featuresLength * 4;
            var pickTexturesByteLength = content.featuresLength * 4;

            // Features have not been picked or colored yet, so the batch table contribution is 0.
            expect(content.geometryByteLength).toEqual(geometryByteLength);
            expect(content.texturesByteLength).toEqual(texturesByteLength);
            expect(content.batchTableByteLength).toEqual(0);

            // Color a feature and expect the texture memory to increase
            content.getFeature(0).color = Color.RED;
            scene.renderForSpecs();
            expect(content.geometryByteLength).toEqual(geometryByteLength);
            expect(content.texturesByteLength).toEqual(texturesByteLength);
            expect(content.batchTableByteLength).toEqual(batchTexturesByteLength);

            // Pick the tile and expect the texture memory to increase
            scene.pickForSpecs();
            expect(content.geometryByteLength).toEqual(geometryByteLength);
            expect(content.texturesByteLength).toEqual(texturesByteLength);
            expect(content.batchTableByteLength).toEqual(batchTexturesByteLength + pickTexturesByteLength);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
    });

}, 'WebGL');
