/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileStyle',
        'Scene/Expression'
    ], function(
        Cesium3DTileStyle,
        Expression) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    function MockTileset(styleEngine) {
        this.styleEngine = styleEngine;
    }

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
});