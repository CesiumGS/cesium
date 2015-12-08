/*global defineSuite*/
defineSuite([
        'Scene/Composite3DTileContentProvider',
        'Core/Cartesian3',
        'Core/Color',
        'Core/HeadingPitchRange',
        'Specs/Cesium3DTilesSpecHelper',
        'Specs/createScene'
    ], function(
        Composite3DTileContentProvider,
        Cartesian3,
        Color,
        HeadingPitchRange,
        Cesium3DTilesSpecHelper,
        createScene) {
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

    function verifyRenderComposite(tileset) {
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

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesSpecHelper.generateCompositeTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesSpecHelper.loadTileExpectError(scene, arrayBuffer, 'cmpt');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesSpecHelper.generateCompositeTileBuffer({
            version : 2
        });
        return Cesium3DTilesSpecHelper.loadTileExpectError(scene, arrayBuffer, 'cmpt');
    });

    it('throws with invalid inner tile content type', function() {
        var arrayBuffer = Cesium3DTilesSpecHelper.generateCompositeTileBuffer({
            tiles : [Cesium3DTilesSpecHelper.generateInstancedTileBuffer({
                magic : [120, 120, 120, 120]
            })]
        });
        return Cesium3DTilesSpecHelper.loadTileExpectError(scene, arrayBuffer, 'cmpt');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesSpecHelper.resolvesReadyPromise(scene, compositeUrl);
    });

    it('rejects readyPromise on error', function() {
        // Try loading a composite tile with an instanced tile that has an invalid url.
        // Expect promise to be rejected in Model, ModelInstanceCollection,
        // Instanced3DModel3DTileContentProvider, and Composite3DTileContentProvider.
        var arrayBuffer = Cesium3DTilesSpecHelper.generateCompositeTileBuffer({
            tiles : [Cesium3DTilesSpecHelper.generateInstancedTileBuffer({
                gltfFormat : 0
            })]
        });
        return Cesium3DTilesSpecHelper.rejectsReadyPromiseOnError(scene, arrayBuffer, 'cmpt');
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesSpecHelper.rejectsReadyPromiseOnFailedRequest('cmpt');
    });
    
    it('renders composite', function() {
        return Cesium3DTilesSpecHelper.loadTileset(scene, compositeUrl).then(verifyRenderComposite);
    });

    it('renders composite of composite', function() {
        return Cesium3DTilesSpecHelper.loadTileset(scene, compositeOfComposite).then(verifyRenderComposite);
    });

    it('destroys', function() {
        return Cesium3DTilesSpecHelper.tileDestroys(scene, compositeUrl);
    });
});
