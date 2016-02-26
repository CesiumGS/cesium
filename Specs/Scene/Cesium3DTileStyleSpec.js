/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileStyle',
        'Core/Cartesian3',
        'Core/Color',
        'Core/HeadingPitchRange',
        'Renderer/ContextLimits',
        'Scene/Expression',
        'Specs/Cesium3DTilesTester',
        'Specs/createScene'
    ], function(
        Cesium3DTileStyle,
        Cartesian3,
        Color,
        HeadingPitchRange,
        ContextLimits,
        Expression,
        Cesium3DTilesTester,
        createScene) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    function MockTileset(styleEngine) {
        this.styleEngine = styleEngine;
    }

    var scene;
    var centerLongitude = -1.31968;
    var centerLatitude = 0.698874;

    var withoutBatchTableUrl = './Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/';

    it ('sets show value to default expression', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {

        });
        expect(style.show).toEqual(new Expression(styleEngine, 'true'));

        style = new Cesium3DTileStyle(tileset);
        expect(style.show).toEqual(new Expression(styleEngine, 'true'));
    });

    it ('sets show value to expression', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {
            show : 'true'
        });
        expect(style.show).toEqual(new Expression(styleEngine, 'true'));

        style = new Cesium3DTileStyle(tileset, {
            show : 'false'
        });
        expect(style.show).toEqual(new Expression(styleEngine, 'false'));

        style = new Cesium3DTileStyle(tileset, {
            show : '${height} * 10 >= 1000'
        });
        expect(style.show).toEqual(new Expression(styleEngine, '${height} * 10 >= 1000'));

        style = new Cesium3DTileStyle(new MockTileset(new MockStyleEngine()), {
            show : true
        });
        expect(style.show).toEqual(new Expression(styleEngine, 'true'));

        style = new Cesium3DTileStyle(new MockTileset(new MockStyleEngine()), {
            show : false
        });
        expect(style.show).toEqual(new Expression(styleEngine, 'false'));
    });

    it ('sets show to undefined if not a string or a boolean', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {
            show : 1
        });
        expect(style.show).toEqual(undefined);
    });

    it('renders translucent style when vertex texture fetch is not supported', function() {
        scene = createScene();

        // One building in each data set is always located in the center, so point the camera there
        var center = Cartesian3.fromRadians(centerLongitude, centerLatitude, 5.0);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 10.0));

        // Disable VTF
        var maximumVertexTextureImageUnits = ContextLimits.maximumVertexTextureImageUnits;
        ContextLimits._maximumVertexTextureImageUnits = 0;

        return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(function(tileset) {
            var showColor = scene.renderForSpecs();

            tileset.style = new Cesium3DTileStyle(tileset, {show : 'false'});
            var hideColor = scene.renderForSpecs();
            expect(hideColor).not.toEqual(showColor);
            expect(hideColor).toEqual([0, 0, 0, 255]);

            tileset.style = new Cesium3DTileStyle(tileset, {show : 'true'});
            var restoredShow = scene.renderForSpecs();
            expect(restoredShow).toEqual(showColor);

            // Re-enable VTF
            ContextLimits._maximumVertexTextureImageUnits = maximumVertexTextureImageUnits;

            scene.primitives.removeAll();

            scene.destroyForSpecs();
        });
    });
}, 'WebGL');