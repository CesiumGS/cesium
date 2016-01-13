/*global defineSuite*/
defineSuite([
        'Scene/Composite3DTileContentProvider',
        'Core/Cartesian3',
        'Core/Color',
        'Core/HeadingPitchRange',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Composite3DTileContentProvider,
        Cartesian3,
        Color,
        HeadingPitchRange,
        Cesium3DTilesTester,
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

    function expectRender(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        var pixelColor = scene.renderForSpecs();
        expect(pixelColor).not.toEqual([0, 0, 0, 255]);
        return pixelColor;
    }

    function expectRenderBlank(tileset) {
        tileset.show = false;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
        tileset.show = true;
        expect(scene.renderForSpecs()).toEqual([0, 0, 0, 255]);
    }

    function expectRenderComposite(tileset) {
        expectRender(tileset);

        // Change the color of the picked building to yellow
        var pickedBuilding = scene.pickForSpecs();
        expect(pickedBuilding).toBeDefined();
        pickedBuilding.color = Color.clone(Color.YELLOW, pickedBuilding.color);

        // Expect building to be some shade of yellow
        var pixelColor = expectRender(tileset);
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
        pixelColor = expectRender(tileset);
        expect(pixelColor[0]).toEqual(0);
        expect(pixelColor[1]).toBeGreaterThan(0);
        expect(pixelColor[2]).toEqual(0);
        expect(pixelColor[3]).toEqual(255);

        // Hide the instance, and expect the render to be blank
        pickedInstance.show = false;
        expectRenderBlank(tileset);
    }

    it('throws with invalid magic', function() {
        var arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
            magic : [120, 120, 120, 120]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'cmpt');
    });

    it('throws with invalid version', function() {
        var arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
            version : 2
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'cmpt');
    });

    it('throws with invalid inner tile content type', function() {
        var arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
            tiles : [Cesium3DTilesTester.generateInstancedTileBuffer({
                magic : [120, 120, 120, 120]
            })]
        });
        return Cesium3DTilesTester.loadTileExpectError(scene, arrayBuffer, 'cmpt');
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, compositeUrl);
    });

    it('rejects readyPromise on error', function() {
        // Try loading a composite tile with an instanced tile that has an invalid url.
        // Expect promise to be rejected in Model, ModelInstanceCollection,
        // Instanced3DModel3DTileContentProvider, and Composite3DTileContentProvider.
        var arrayBuffer = Cesium3DTilesTester.generateCompositeTileBuffer({
            tiles : [Cesium3DTilesTester.generateInstancedTileBuffer({
                gltfFormat : 0
            })]
        });
        return Cesium3DTilesTester.rejectsReadyPromiseOnError(scene, arrayBuffer, 'cmpt');
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('cmpt');
    });
    
    it('renders composite', function() {
        return Cesium3DTilesTester.loadTileset(scene, compositeUrl).then(expectRenderComposite);
    });

    it('renders composite of composite', function() {
        return Cesium3DTilesTester.loadTileset(scene, compositeOfComposite).then(expectRenderComposite);
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, compositeUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, compositeUrl);
    });

}, 'WebGL');
