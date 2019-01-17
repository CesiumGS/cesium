defineSuite([
        'Scene/Cesium3DTilesetHeatmap',
        'Scene/Cesium3DTile',
        'Scene/Cesium3DTileset',
        'Core/clone',
        'Core/Color',
        'Core/Math',
        'Core/Matrix4',
        'Scene/Cesium3DTileContentState',
        'Specs/createScene'
    ], function(
        Cesium3DTilesetHeatmap,
        Cesium3DTile,
        Cesium3DTileset,
        clone,
        Color,
        CesiumMath,
        Matrix4,
        Cesium3DTileContentState,
        createScene) {
    'use strict';

    var tileWithBoundingSphere = {
        geometricError : 1,
        refine : 'REPLACE',
        children : [],
        boundingVolume : {
            sphere: [0.0, 0.0, 0.0, 5.0]
        }
    };

    var mockTileset = {
        debugShowBoundingVolume : true,
        debugShowViewerRequestVolume : true,
        modelMatrix : Matrix4.IDENTITY,
        _geometricError : 2
    };

    var scene;
    beforeEach(function() {
        scene = createScene();
        scene.frameState.passes.render = true;
    });

    afterEach(function() {
        scene.destroyForSpecs();
    });

    function verifyColor(tileColor, expectedColor) {
        var diff = new Color (Math.abs(expectedColor.red   - tileColor.red),
                              Math.abs(expectedColor.green - tileColor.green),
                              Math.abs(expectedColor.blue  - tileColor.blue));

        var threshold = 0.01;
        expect(diff.red).toBeLessThan(threshold);
        expect(diff.green).toBeLessThan(threshold);
        expect(diff.blue).toBeLessThan(threshold);
    }

    it('destroys', function() {
        var heatmap = new Cesium3DTilesetHeatmap();
        expect(heatmap.isDestroyed()).toEqual(false);
        heatmap.destroy();
        expect(heatmap.isDestroyed()).toEqual(true);
    });

    it('resetMinMax', function() {
        var heatmap = new Cesium3DTilesetHeatmap('_centerZDepth');
        heatmap._min = -1;
        heatmap._max =  1;
        heatmap.resetMinMax(); // Preparing for next frame, previousMin/Max take current frame's values

        expect(heatmap._min).toBe(Number.MAX_VALUE);
        expect(heatmap._max).toBe(-Number.MAX_VALUE);
        expect(heatmap._previousMin).toBe(-1);
        expect(heatmap._previousMax).toBe( 1);
    });

    it('reference min max', function() {
        // _time uses a fixed reference min max by default.
        // The min/max determined over a frame aren't useful since we want an approx. min max for the scene resolve time.
        // This is usually set by the user for taking timing colorize diffs, but has a default window of [0..10]
        var variableName = '_time';
        var heatmap = new Cesium3DTilesetHeatmap(variableName);

        var setMin = 3;
        var setMax = 4;
        heatmap.setReferenceMinMax(setMin, setMax, variableName); // User wants to colorize to a fixed reference.

        heatmap._min = -1;
        heatmap._max =  1;
        heatmap.resetMinMax(); // Preparing for next frame, previousMin/Max always the reference values if they exist for the variable.

        expect(heatmap._min).toBe(Number.MAX_VALUE);
        expect(heatmap._max).toBe(-Number.MAX_VALUE);
        expect(heatmap._previousMin).toBe(setMin);
        expect(heatmap._previousMax).toBe(setMax);
    });

    it('expected color', function() {
        var heatmap = new Cesium3DTilesetHeatmap('_centerZDepth');

        var tile = new Cesium3DTile(mockTileset, '/some_url', tileWithBoundingSphere, undefined);
        tile._contentState = Cesium3DTileContentState.READY;
        tile.hasEmptyContent = false;
        var frameState = scene.frameState;
        tile._selectedFrame = frameState.frameNumber;
        var originalColor = tile._debugColor;

        // This is first frame, previousMin/Max are unititialized so no coloring occurs
        tile._centerZDepth = 1;
        heatmap.colorize(tile, frameState);
        tile._centerZDepth = -1;
        heatmap.colorize(tile, frameState);

        expect(heatmap._min).toBe(-1);
        expect(heatmap._max).toBe( 1);
        verifyColor(tile._debugColor, originalColor);

        // Preparing for next frame, previousMin/Max take current frame's values
        heatmap.resetMinMax();

        tile._centerZDepth = -1;
        heatmap.colorize(tile, frameState);

        var expectedColor = Color.BLACK;
        verifyColor(tile._debugColor, expectedColor);
    });
});
