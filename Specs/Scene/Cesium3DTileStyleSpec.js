/*global defineSuite*/
defineSuite([
        'Scene/Cesium3DTileStyle',
        'Core/Color',
        'Scene/ConditionsExpression',
        'Scene/Expression'
    ], function(
        Cesium3DTileStyle,
        Color,
        ConditionsExpression,
        Expression) {
    'use strict';

    function MockFeature() {
        this._properties = {};
    }

    MockFeature.prototype.addProperty = function(name, value) {
        this._properties[name] = value;
    };

    MockFeature.prototype.getProperty = function(name) {
        return this._properties[name];
    };

    var feature1 = new MockFeature();
    feature1.addProperty('ZipCode', '19341');
    feature1.addProperty('County', 'Chester');
    feature1.addProperty('YearBuilt', 1979);
    feature1.addProperty('Temperature', 78);
    feature1.addProperty('red', 38);
    feature1.addProperty('green', 255);
    feature1.addProperty('blue', 82);
    feature1.addProperty('volume', 128);
    feature1.addProperty('Height', 100);
    feature1.addProperty('Width', 20);
    feature1.addProperty('Depth', 20);
    feature1.addProperty('id', 11);
    feature1.addProperty('name', 'Hello');

    var feature2 = new MockFeature();
    feature2.addProperty('ZipCode', '19342');
    feature2.addProperty('County', 'Delaware');
    feature2.addProperty('YearBuilt', 1979);
    feature2.addProperty('Temperature', 92);
    feature2.addProperty('red', 255);
    feature2.addProperty('green', 30);
    feature2.addProperty('blue', 30);
    feature2.addProperty('volume', 50);
    feature2.addProperty('Height', 38);
    feature2.addProperty('id', 12);

    var styleUrl = './Data/Cesium3DTiles/Style/style.json';

    it ('rejects readyPromise with undefined url', function() {
        var tileStyle = new Cesium3DTileStyle('invalid.json');

        return tileStyle.readyPromise.then(function(style) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileStyle.ready).toEqual(false);
            expect(error.statusCode).toEqual(404);
        });
    });

    it ('loads style from uri', function() {
        var tileStyle = new Cesium3DTileStyle(styleUrl);

        return tileStyle.readyPromise.then(function(style) {
            expect(style.show).toEqual(new Expression('${id} < 100'));
            expect(style.color).toEqual(new Expression('color("red")'));
            expect(tileStyle.ready).toEqual(true);
        }).otherwise(function() {
            fail('should load style.json');
        });
    });

    it ('sets show value to default expression', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.show).toEqual(new Expression('true'));

        style = new Cesium3DTileStyle();
        expect(style.show).toEqual(new Expression('true'));
    });

    it ('sets color value to default expression', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.color).toEqual(new Expression('color("#ffffff")'));

        style = new Cesium3DTileStyle();
        expect(style.color).toEqual(new Expression('color("#ffffff")'));
    });

    it ('sets show value to expression', function() {
        var style = new Cesium3DTileStyle({
            show : 'true'
        });
        expect(style.show).toEqual(new Expression('true'));

        style = new Cesium3DTileStyle({
            show : 'false'
        });
        expect(style.show).toEqual(new Expression('false'));

        style = new Cesium3DTileStyle({
            show : '${height} * 10 >= 1000'
        });
        expect(style.show).toEqual(new Expression('${height} * 10 >= 1000'));

        style = new Cesium3DTileStyle({
            show : true
        });
        expect(style.show).toEqual(new Expression('true'));

        style = new Cesium3DTileStyle({
            show : false
        });
        expect(style.show).toEqual(new Expression('false'));
    });

    it ('sets show to undefined if not a string or a boolean', function() {
        var style = new Cesium3DTileStyle({
            show : 1
        });
        expect(style.show).toEqual(undefined);
    });

    it ('sets color value to expression', function() {
        var style = new Cesium3DTileStyle({
            color : 'color("red")'
        });
        expect(style.color).toEqual(new Expression('color("red")'));

        style = new Cesium3DTileStyle({
            color : 'rgba(30, 30, 30, 0.5)'
        });
        expect(style.color).toEqual(new Expression('rgba(30, 30, 30, 0.5)'));

        style = new Cesium3DTileStyle({
            color : '(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'
        });
        expect(style.color).toEqual(new Expression('(${height} * 10 >= 1000) ? rgba(0.0, 0.0, 1.0, 0.5) : color("blue")'));
    });

    it ('sets color value to conditional', function() {
        var jsonExp = {
            conditions : {
                '${height} > 2' : 'color("cyan")',
                'true' : 'color("blue")'
            }
        };

        var style = new Cesium3DTileStyle({
            color : jsonExp
        });
        expect(style.color).toEqual(new ConditionsExpression(jsonExp));
    });

    it ('sets color to undefined if not a string or conditional', function() {
        var style = new Cesium3DTileStyle({
            color : 1
        });
        expect(style.color).toEqual(undefined);
    });

    it ('throws on accessing color if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.color;
        }).toThrowDeveloperError();
    });

    it ('throws on accessing show if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.show;
        }).toThrowDeveloperError();
    });

    it ('sets meta properties', function() {
        var style = new Cesium3DTileStyle({
            meta : {
                description : '"Hello, ${name}"'
            }
        });
        expect(style.meta.description.evaluate(feature1)).toEqual("Hello, Hello");

        style = new Cesium3DTileStyle({
            meta : {
                featureColor : 'rgb(${red}, ${green}, ${blue})',
                volume : '${Height} * ${Width} * ${Depth}'
            }
        });
        expect(style.meta.featureColor.evaluate(feature1)).toEqual(Color.fromBytes(38, 255, 82));
        expect(style.meta.volume.evaluate(feature1)).toEqual(20 * 20 * 100);
    });

    it ('default meta has no properties', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.meta).toEqual({});

        style = new Cesium3DTileStyle({
            meta: {}
        });
        expect(style.meta).toEqual({});
    });

    it ('default meta has no properties', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.meta).toEqual({});

        style = new Cesium3DTileStyle({
            meta: {}
        });
        expect(style.meta).toEqual({});
    });

    it ('throws on accessing meta if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.meta;
        }).toThrowDeveloperError();
    });

    // Tests for examples from the style spec

    it ('applies default style', function() {
        var style = new Cesium3DTileStyle({
            "show" : "true",
            "color" : "color('#ffffff')"
        });

        expect(style.show.evaluate(undefined)).toEqual(true);
        expect(style.color.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it ('applies show style with variable', function() {
        var style = new Cesium3DTileStyle({
            "show" : "${ZipCode} === '19341'"
        });

        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.show.evaluate(feature2)).toEqual(false);
        expect(style.color.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it ('applies show style with regexp and variables', function() {
        var style = new Cesium3DTileStyle({
            "show" : "(regExp('^Chest').test(${County})) && (${YearBuilt} >= 1970)"
        });

        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.show.evaluate(feature2)).toEqual(false);
        expect(style.color.evaluate(undefined)).toEqual(Color.WHITE);
    });

    it ('applies color style variables', function() {
        var style = new Cesium3DTileStyle({
            "color" : "(${Temperature} > 90) ? color('red') : color('white')"
        });
        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.color.evaluate(feature1)).toEqual(Color.WHITE);
        expect(style.color.evaluate(feature2)).toEqual(Color.RED);
    });

    it ('applies color style with new color', function() {
        var style = new Cesium3DTileStyle({
            "color" : "rgba(${red}, ${green}, ${blue}, (${volume} > 100 ? 0.5 : 1.0))"
        });
        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.color.evaluate(feature1)).toEqual(new Color(38/255, 255/255, 82/255, 0.5));
        expect(style.color.evaluate(feature2)).toEqual(new Color(255/255, 30/255, 30/255, 1.0));
    });

    it ('applies color style that maps id to color', function() {
        var style = new Cesium3DTileStyle({
            "color" : {
                "expression" : "regExp('^1(\\d)').exec(${id})",
                "conditions" : {
                    "${expression} === '1'" : "color('#FF0000')",
                    "${expression} === '2'" : "color('#00FF00')",
                    "true" : "color('#FFFFFF')"
                }
            }
        });
        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.color.evaluate(feature1)).toEqual(Color.RED);
        expect(style.color.evaluate(feature2)).toEqual(Color.LIME);
    });

    it ('applies color style with complex conditional', function() {
        var style = new Cesium3DTileStyle({
            "color" : {
                "expression" : "${Height}",
                "conditions" : {
                    "(${expression} >= 1.0)  && (${expression} < 10.0)" : "color('#FF00FF')",
                    "(${expression} >= 10.0) && (${expression} < 30.0)" : "color('#FF0000')",
                    "(${expression} >= 30.0) && (${expression} < 50.0)" : "color('#FFFF00')",
                    "(${expression} >= 50.0) && (${expression} < 70.0)" : "color('#00FF00')",
                    "(${expression} >= 70.0) && (${expression} < 100.0)" : "color('#00FFFF')",
                    "(${expression} >= 100.0)" : "color('#0000FF')"
                }
            }
        });
        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.color.evaluate(feature1)).toEqual(Color.BLUE);
        expect(style.color.evaluate(feature2)).toEqual(Color.YELLOW);
    });

    it ('applies color style with conditional', function() {
        var style = new Cesium3DTileStyle({
            "color" : {
                "conditions" : {
                    "(${Height} >= 100.0)" : "color('#0000FF')",
                    "(${Height} >= 70.0)" : "color('#00FFFF')",
                    "(${Height} >= 50.0)" : "color('#00FF00')",
                    "(${Height} >= 30.0)" : "color('#FFFF00')",
                    "(${Height} >= 10.0)" : "color('#FF0000')",
                    "(${Height} >= 1.0)" : "color('#FF00FF')"
                }
            }
        });
        expect(style.show.evaluate(feature1)).toEqual(true);
        expect(style.color.evaluate(feature1)).toEqual(Color.BLUE);
        expect(style.color.evaluate(feature2)).toEqual(Color.YELLOW);
    });
});
