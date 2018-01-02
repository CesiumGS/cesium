defineSuite([
        'Scene/Batched3DModel3DTileContent',
        'Core/Cartesian3',
        'Core/ClippingPlaneCollection',
        'Core/Color',
        'Core/HeadingPitchRange',
        'Core/HeadingPitchRoll',
        'Core/Plane',
        'Core/Transforms',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Batched3DModel3DTileContent,
        Cartesian3,
        ClippingPlaneCollection,
        Color,
        HeadingPitchRange,
        HeadingPitchRoll,
        Plane,
        Transforms,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTable/';
    var withBatchTableBinaryUrl = './Data/Cesium3DTiles/Batched/BatchedWithBatchTableBinary/';
    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';
    var translucentUrl = './Data/Cesium3DTiles/Batched/BatchedTranslucent/';
    var translucentOpaqueMixUrl = './Data/Cesium3DTiles/Batched/BatchedTranslucentOpaqueMix/';
    var withKHRMaterialsCommonUrl = './Data/Cesium3DTiles/Batched/BatchedWithKHRMaterialsCommon/';
    var withTransformBoxUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformBox/';
    var withTransformSphereUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformSphere/';
    var withTransformRegionUrl = './Data/Cesium3DTiles/Batched/BatchedWithTransformRegion/';
    var texturedUrl = './Data/Cesium3DTiles/Batched/BatchedTextured/';
    var compressedTexturesUrl = './Data/Cesium3DTiles/Batched/BatchedCompressedTextures/';
    var deprecated1Url = './Data/Cesium3DTiles/Batched/BatchedDeprecated1/';
    var deprecated2Url = './Data/Cesium3DTiles/Batched/BatchedDeprecated2/';
    var gltfZUpUrl = './Data/Cesium3DTiles/Batched/BatchedGltfZUp';

    function setCamera(longitude, latitude) {
        // One feature is located at the center, point the camera there
        var center = Cartesian3.fromRadians(longitude, latitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer({
            version : 2
        });
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('recognizes the legacy 20-byte header', function() {
        spyOn(Batched3DModel3DTileContent, '_deprecationWarning');
        return Cesium3DTilesTester.loadTileset(scene, deprecated1Url)
            .then(function(tileset) {
                expect(Batched3DModel3DTileContent._deprecationWarning).toHaveBeenCalled();
                Cesium3DTilesTester.expectRenderTileset(scene, tileset);
                var batchTable = tileset._root._content.batchTable;
                expect(batchTable.batchTableJson).toBeDefined();
                expect(batchTable.batchTableBinary).toBeUndefined();
            });
    });

    it('recognizes the legacy 24-byte header', function() {
        spyOn(Batched3DModel3DTileContent, '_deprecationWarning');
        return Cesium3DTilesTester.loadTileset(scene, deprecated2Url)
            .then(function(tileset) {
                expect(Batched3DModel3DTileContent._deprecationWarning).toHaveBeenCalled();
                Cesium3DTilesTester.expectRenderTileset(scene, tileset);
                var batchTable = tileset._root._content.batchTable;
                expect(batchTable.batchTableJson).toBeDefined();
                expect(batchTable.batchTableBinary).toBeUndefined();
            });
    });

    it('logs deprecation warning for use of BATCHID without prefixed underscore', function() {
        spyOn(Batched3DModel3DTileContent, '_deprecationWarning');
        return Cesium3DTilesTester.loadTileset(scene, deprecated1Url)
            .then(function(tileset) {
                expect(Batched3DModel3DTileContent._deprecationWarning).toHaveBeenCalled();
                Cesium3DTilesTester.expectRenderTileset(scene, tileset);
            });
    });

    it('throws with empty gltf', function() {
        // Expect to throw DeveloperError in Model due to invalid gltf magic
        var arrayBuffer = Cesium3DTilesTester.generateBatchedTileBuffer();
        Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'b3dm');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, withoutBatchTableUrl);
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

    it('renders with all features translucent', function() {
        return Cesium3DTilesTester.loadTileset(scene, translucentUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with a mix of opaque and translucent features', function() {
        return Cesium3DTilesTester.loadTileset(scene, translucentOpaqueMixUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with KHR_materials_common extension', function() {
        // Tests that the batchId attribute and CESIUM_RTC extension are handled correctly
        return Cesium3DTilesTester.loadTileset(scene, withKHRMaterialsCommonUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('renders with textures', function() {
        return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders with compressed textures', function() {
        return Cesium3DTilesTester.loadTileset(scene, compressedTexturesUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRender(scene, tileset);
        });
    });

    it('renders with a gltf z-up axis', function() {
        return Cesium3DTilesTester.loadTileset(scene, gltfZUpUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    function expectRenderWithTransform(url) {
        return Cesium3DTilesTester.loadTileset(scene, url).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);

            var newLongitude = -1.31962;
            var newLatitude = 0.698874;
            var newCenter = Cartesian3.fromRadians(newLongitude, newLatitude, 0.0);
            var newHPR = new HeadingPitchRoll();
            var newTransform = Transforms.headingPitchRollToFixedFrame(newCenter, newHPR);

            // Update tile transform
            tileset._root.transform = newTransform;
            scene.renderForSpecs();

            // Move the camera to the new location
            setCamera(newLongitude, newLatitude);
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    }

    it('renders with a tile transform and box bounding volume', function() {
        return expectRenderWithTransform(withTransformBoxUrl);
    });

    it('renders with a tile transform and sphere bounding volume', function() {
        return expectRenderWithTransform(withTransformSphereUrl);
    });

    it('renders with a tile transform and region bounding volume', function() {
        return Cesium3DTilesTester.loadTileset(scene, withTransformRegionUrl).then(function(tileset) {
            Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        });
    });

    it('picks with batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            tileset.show = false;
            expect(scene).toPickPrimitive(undefined);
            tileset.show = true;
            expect(scene).toPickAndCall(function(result) {
                expect(result).toBeDefined();
                expect(result.primitive).toBe(tileset);
                expect(result.content).toBe(content);
            });
        });
    });

    it('picks without batch table', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            tileset.show = false;
            expect(scene).toPickPrimitive(undefined);
            tileset.show = true;
            expect(scene).toPickAndCall(function(result) {
                expect(result).toBeDefined();
                expect(result.primitive).toBe(tileset);
                expect(result.content).toBe(content);
            });
        });
    });

    it('can get features and properties', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(content.featuresLength).toBe(10);
            expect(content.innerContents).toBeUndefined();
            expect(content.hasProperty(0, 'id')).toBe(true);
            expect(content.getFeature(0)).toBeDefined();
        });
    });

    it('throws when calling getFeature with invalid index', function() {
        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var content = tileset._root.content;
            expect(function(){
                content.getFeature(-1);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature(1000);
            }).toThrowDeveloperError();
            expect(function(){
                content.getFeature();
            }).toThrowDeveloperError();
        });
    });

    it('gets memory usage', function() {
        return Cesium3DTilesTester.loadTileset(scene, texturedUrl).then(function(tileset) {
            var content = tileset._root.content;

            // 10 buildings, 32 ushort indices and 24 vertices per building, 8 float components (position, normal, uv) and 1 ushort component (batchId) per vertex.
            // 10 * ((24 * (8 * 4 + 1 * 2)) + (36 * 2)) = 8880
            var geometryByteLength = 8880;

            // Texture is 128x128 RGBA bytes, not mipmapped
            var texturesByteLength = 65536;

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

    it('Updates model\'s clipping planes', function() {
        return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(function(tileset) {
            var tile = tileset._root;
            var content = tile.content;
            var model = content._model;

            expect(model.clippingPlanes).toBeDefined();
            expect(model.clippingPlanes.length).toBe(0);
            expect(model.clippingPlanes.enabled).toBe(false);

            tileset.clippingPlanes = new ClippingPlaneCollection({
                planes : [
                    new Plane(Cartesian3.UNIT_X, 0.0)
                ]
            });
            content.update(tileset, scene.frameState);

            expect(model.clippingPlanes).toBeDefined();
            expect(model.clippingPlanes.length).toBe(1);
            expect(model.clippingPlanes.enabled).toBe(true);

            tile._isClipped = false;
            content.update(tileset, scene.frameState);

            expect(model.clippingPlanes.enabled).toBe(false);

            tileset.clippingPlanes = undefined;

            expect(model.clippingPlanes).toBeDefined();
            expect(model.clippingPlanes.enabled).toBe(false);
        });
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, withoutBatchTableUrl);
    });

}, 'WebGL');
