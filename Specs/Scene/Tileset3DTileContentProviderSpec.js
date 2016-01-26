/*global defineSuite*/
defineSuite([
        'Scene/Tileset3DTileContentProvider',
        'Core/Cartesian3',
        'Core/HeadingPitchRange',
        'Scene/Cesium3DTileContentState',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Tileset3DTileContentProvider,
        Cartesian3,
        HeadingPitchRange,
        Cesium3DTileContentState,
        Cesium3DTilesTester,
        createScene) {
    "use strict";

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var tilesetOfTilesetsUrl = './Data/Cesium3DTiles/Tilesets/TilesetOfTilesets/';

    beforeAll(function() {
        scene = createScene();

        // Point the camera at the center and far enough way to only load the root tile
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 100.0));
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.primitives.removeAll();
    });

    it('resolves readyPromise', function() {
        return Cesium3DTilesTester.resolvesReadyPromise(scene, tilesetOfTilesetsUrl);
    });

    it('rejects readyPromise on failed request', function() {
        return Cesium3DTilesTester.rejectsReadyPromiseOnFailedRequest('json');
    });

    it('destroys', function() {
        return Cesium3DTilesTester.tileDestroys(scene, tilesetOfTilesetsUrl);
    });

    it('destroys before loading finishes', function() {
        return Cesium3DTilesTester.tileDestroysBeforeLoad(scene, tilesetOfTilesetsUrl);
    });

});
