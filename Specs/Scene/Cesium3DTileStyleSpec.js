/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileStyle',
        'Scene/ConditionalExpression',
        'Scene/Expression'
    ], function(
        Cesium3DTileStyle,
        ConditionalExpression,
        Expression) {
    'use strict';

    function MockStyleEngine() {
    }

    MockStyleEngine.prototype.makeDirty = function() {
    };

    function MockTileset(styleEngine) {
        this.styleEngine = styleEngine;
    }

    var styleUrl = './Data/Cesium3DTiles/Style/style.json';

    it ('throws with undefined tileset', function() {
        expect(function () {
            return new Cesium3DTileStyle();
        }).toThrowDeveloperError();
    });

    it ('rejects readyPromise with undefined url', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var tileStyle = new Cesium3DTileStyle(tileset, 'invalid.json');

        return tileStyle.readyPromise.then(function(style) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileStyle.ready).toEqual(false);
            expect(error.statusCode).toEqual(404);
        });
    });

    it ('loads style from uri', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var tileStyle = new Cesium3DTileStyle(tileset, styleUrl);

        return tileStyle.readyPromise.then(function(style) {
            expect(style.show).toEqual(new Expression(styleEngine, '${id} < 100'));
            expect(style.color).toEqual(new Expression(styleEngine, 'color("red")'));
            expect(tileStyle.ready).toEqual(true);
        }).otherwise(function() {
            fail('should load style.json');
        });
    });

    it ('sets show value to default expression', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {
        });
        expect(style.show).toEqual(new Expression(styleEngine, 'true'));

        style = new Cesium3DTileStyle(tileset);
        expect(style.show).toEqual(new Expression(styleEngine, 'true'));
    });

    it ('sets color value to default expression', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {
        });

        style.readyPromise.then(function(s) {
            expect(s.color).toEqual(new Expression(styleEngine, 'color("#ffffff")'));
        });

        //
        //style = new Cesium3DTileStyle(tileset);
        //expect(style.color).toEqual(new Expression(styleEngine, 'color("#ffffff")'));
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

    it ('sets color value to expression', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {
            color : 'color("red")'
        });
        expect(style.color).toEqual(new Expression(styleEngine, 'color("red")'));

        style = new Cesium3DTileStyle(tileset, {
            color : 'rgba(30, 30, 30, 0.5)'
        });
        expect(style.color).toEqual(new Expression(styleEngine, 'rgba(30, 30, 30, 0.5)'));

        style = new Cesium3DTileStyle(tileset, {
            color : '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
        });
        expect(style.color).toEqual(new Expression(styleEngine, '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'));
    });

    it ('sets color value to conditional', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);
        var jsonExp = {
            conditional : {
                '${height} > 2' : 'color("cyan")',
                'true' : 'color("blue")'
            }
        };

        var style = new Cesium3DTileStyle(tileset, { color : jsonExp });
        expect(style.color).toEqual(new ConditionalExpression(styleEngine, jsonExp));
    });


    it ('sets color to undefined if not a string or conditional', function() {
        var styleEngine = new MockStyleEngine();
        var tileset = new MockTileset(styleEngine);

        var style = new Cesium3DTileStyle(tileset, {
            color : 1
        });
        expect(style.color).toEqual(undefined);
    });
});
