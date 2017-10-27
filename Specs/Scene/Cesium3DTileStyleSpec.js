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

    var frameState = {};

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

    it('rejects readyPromise with undefined url', function() {
        var tileStyle = new Cesium3DTileStyle('invalid.json');

        return tileStyle.readyPromise.then(function(style) {
            fail('should not resolve');
        }).otherwise(function(error) {
            expect(tileStyle.ready).toEqual(false);
            expect(error.statusCode).toEqual(404);
        });
    });

    it('loads style from uri', function() {
        var tileStyle = new Cesium3DTileStyle(styleUrl);

        return tileStyle.readyPromise.then(function(style) {
            expect(style.style).toEqual({
                show : '${id} < 100',
                color : "color('red')",
                pointSize : '${id} / 100'
            });
            expect(style.show).toEqual(new Expression('${id} < 100'));
            expect(style.color).toEqual(new Expression("color('red')"));
            expect(style.pointSize).toEqual(new Expression('${id} / 100'));
            expect(tileStyle.ready).toEqual(true);
        }).otherwise(function() {
            fail('should load style.json');
        });
    });

    it('sets show value to undefined if value not present', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.show).toBeUndefined();

        style = new Cesium3DTileStyle();
        expect(style.show).toBeUndefined();
    });

    it('sets color value to undefined if value not present', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.color).toBeUndefined();

        style = new Cesium3DTileStyle();
        expect(style.color).toBeUndefined();
    });

    it('sets pointSize value to undefined if value not present', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.pointSize).toBeUndefined();

        style = new Cesium3DTileStyle();
        expect(style.pointSize).toBeUndefined();
    });

    it('sets show value to expression', function() {
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

    it('sets show value to conditional', function() {
        var jsonExp = {
            conditions : [
                ['${height} > 2', 'false'],
                ['true', 'true']
            ]
        };

        var style = new Cesium3DTileStyle({
            show : jsonExp
        });
        expect(style.show).toEqual(new ConditionsExpression(jsonExp));
    });

    it('sets show expressions in setter', function() {
        var style = new Cesium3DTileStyle();

        var condExp = new ConditionsExpression({
            conditions : [
                ['${height} > 2', 'false'],
                ['true', 'true']
            ]
        });

        style.show = condExp;
        expect(style.show).toEqual(condExp);

        var exp = new Expression('false');
        style.show = exp;
        expect(style.show).toEqual(exp);
    });

    it('sets show values in setter', function() {
        var defines = {
            'showFactor': 10
        };
        var style = new Cesium3DTileStyle({ 'defines': defines });

        style.show = '${height} * ${showFactor} >= 1000';
        expect(style.show).toEqual(new Expression('${height} * ${showFactor} >= 1000', defines));

        style.show = false;
        expect(style.show).toEqual(new Expression('false'));

        var jsonExp = {
            conditions : [
                ['${height} > ${showFactor}', 'false'],
                ['true', 'true']
            ]
        };

        style.show = jsonExp;
        expect(style.show).toEqual(new ConditionsExpression(jsonExp, defines));

        style.show = undefined;
        expect(style.show).toBeUndefined();
    });

    it('sets color value to expression', function() {
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

    it('sets color value to conditional', function() {
        var jsonExp = {
            conditions : [
                ['${height} > 2', 'color("cyan")'],
                ['true', 'color("blue")']
            ]
        };

        var style = new Cesium3DTileStyle({
            color : jsonExp
        });
        expect(style.color).toEqual(new ConditionsExpression(jsonExp));
    });

    it('sets color expressions in setter', function() {
        var style = new Cesium3DTileStyle();

        var exp = new Expression('color("red")');
        style.color = exp;
        expect(style.color).toEqual(exp);

        var condExp = new ConditionsExpression({
            conditions : [
                ['${height} > 2', 'color("cyan")'],
                ['true', 'color("blue")']
            ]
        });

        style.color = condExp;
        expect(style.color).toEqual(condExp);

        style.color = undefined;
        expect(style.color).toBeUndefined();
    });

    it('sets color values in setter', function() {
        var defines = {
            'targetColor': 'red'
        };
        var style = new Cesium3DTileStyle({ 'defines': defines });

        style.color = 'color("${targetColor}")';
        expect(style.color).toEqual(new Expression('color("${targetColor}")', defines));

        var jsonExp = {
            conditions : [
                ['${height} > 2', 'color("cyan")'],
                ['true', 'color("${targetColor}")']
            ]
        };

        style.color = jsonExp;
        expect(style.color).toEqual(new ConditionsExpression(jsonExp, defines));
    });

    it('sets pointSize value to expression', function() {
        var style = new Cesium3DTileStyle({
            pointSize : '2'
        });
        expect(style.pointSize).toEqual(new Expression('2'));

        style = new Cesium3DTileStyle({
            pointSize : '${height} / 10'
        });
        expect(style.pointSize).toEqual(new Expression('${height} / 10'));

        style = new Cesium3DTileStyle({
            pointSize : 2
        });
        expect(style.pointSize).toEqual(new Expression('2'));
    });

    it('sets pointSize value to conditional', function() {
        var jsonExp = {
            conditions : [
                ['${height} > 2', '1.0'],
                ['true', '2.0']
            ]
        };

        var style = new Cesium3DTileStyle({
            pointSize : jsonExp
        });
        expect(style.pointSize).toEqual(new ConditionsExpression(jsonExp));
    });

    it('sets pointSize expressions in setter', function() {
        var style = new Cesium3DTileStyle();

        style.pointSize = 2;
        expect(style.pointSize).toEqual(new Expression('2'));

        var exp = new Expression('2');
        style.pointSize = exp;
        expect(style.pointSize).toEqual(exp);

        var condExp = new ConditionsExpression({
            conditions : [
                ['${height} > 2', '1.0'],
                ['true', '2.0']
            ]
        });

        style.pointSize = condExp;
        expect(style.pointSize).toEqual(condExp);

        style.pointSize = undefined;
        expect(style.pointSize).toBeUndefined();
    });

    it('sets pointSize values in setter', function() {
        var defines = {
            'targetPointSize': '2.0'
        };
        var style = new Cesium3DTileStyle({ 'defines': defines });

        style.pointSize = 2;
        expect(style.pointSize).toEqual(new Expression('2'));

        style.pointSize = '${targetPointSize} + 1.0';
        expect(style.pointSize).toEqual(new Expression('${targetPointSize} + 1.0', defines));

        var jsonExp = {
            conditions : [
                ['${height} > 2', '1.0'],
                ['true', '${targetPointSize}']
            ]
        };

        style.pointSize = jsonExp;
        expect(style.pointSize).toEqual(new ConditionsExpression(jsonExp, defines));
    });

    it('throws on accessing style if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.style;
        }).toThrowDeveloperError();
    });

    it('throws on accessing color if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.color;
        }).toThrowDeveloperError();
    });

    it('throws on accessing show if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.show;
        }).toThrowDeveloperError();
    });

    it('throws on accessing pointSize if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.pointSize;
        }).toThrowDeveloperError();
    });

    it('sets meta properties', function() {
        var style = new Cesium3DTileStyle({
            meta : {
                description : '"Hello, ${name}"'
            }
        });
        expect(style.meta.description.evaluate(frameState, feature1)).toEqual("Hello, Hello");

        style = new Cesium3DTileStyle({
            meta : {
                featureColor : 'rgb(${red}, ${green}, ${blue})',
                volume : '${Height} * ${Width} * ${Depth}'
            }
        });
        expect(style.meta.featureColor.evaluateColor(frameState, feature1)).toEqual(Color.fromBytes(38, 255, 82));
        expect(style.meta.volume.evaluate(frameState, feature1)).toEqual(20 * 20 * 100);
    });

    it('default meta has no properties', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.meta).toEqual({});

        style = new Cesium3DTileStyle({
            meta: {}
        });
        expect(style.meta).toEqual({});
    });

    it('default meta has no properties', function() {
        var style = new Cesium3DTileStyle({});
        expect(style.meta).toEqual({});

        style = new Cesium3DTileStyle({
            meta: {}
        });
        expect(style.meta).toEqual({});
    });

    it('throws on accessing meta if not ready', function() {
        var style = new Cesium3DTileStyle({});
        style._ready = false;

        expect(function() {
            return style.meta;
        }).toThrowDeveloperError();
    });

    // Tests for examples from the style spec

    it('applies default style', function() {
        var style = new Cesium3DTileStyle({
            "show" : "true",
            "color" : "color('#ffffff')",
            "pointSize" : "1.0"
        });

        expect(style.show.evaluate(frameState, undefined)).toEqual(true);
        expect(style.color.evaluateColor(frameState, undefined)).toEqual(Color.WHITE);
        expect(style.pointSize.evaluate(frameState, undefined)).toEqual(1.0);
    });

    it('applies show style with variable', function() {
        var style = new Cesium3DTileStyle({
            "show" : "${ZipCode} === '19341'"
        });

        expect(style.show.evaluate(frameState, feature1)).toEqual(true);
        expect(style.show.evaluate(frameState, feature2)).toEqual(false);
    });

    it('applies show style with regexp and variables', function() {
        var style = new Cesium3DTileStyle({
            "show" : "(regExp('^Chest').test(${County})) && (${YearBuilt} >= 1970)"
        });

        expect(style.show.evaluate(frameState, feature1)).toEqual(true);
        expect(style.show.evaluate(frameState, feature2)).toEqual(false);
    });

    it('applies show style with conditional', function() {
        var style = new Cesium3DTileStyle({
            "show" : {
                "conditions" : [
                    ["(${Height} >= 100.0)", "false"],
                    ["(${Height} >= 70.0)", "true"],
                    ["(${Height} >= 50.0)", "false"],
                    ["(${Height} >= 30.0)", "true"],
                    ["(${Height} >= 10.0)", "false"],
                    ["(${Height} >= 1.0)", "true"]
                ]
            }
        });
        expect(style.show.evaluate(frameState, feature1)).toEqual(false);
        expect(style.show.evaluate(frameState, feature2)).toEqual(true);
    });

    it('applies color style variables', function() {
        var style = new Cesium3DTileStyle({
            "color" : "(${Temperature} > 90) ? color('red') : color('white')"
        });
        expect(style.color.evaluateColor(frameState, feature1)).toEqual(Color.WHITE);
        expect(style.color.evaluateColor(frameState, feature2)).toEqual(Color.RED);
    });

    it('applies color style with new color', function() {
        var style = new Cesium3DTileStyle({
            "color" : "rgba(${red}, ${green}, ${blue}, (${volume} > 100 ? 0.5 : 1.0))"
        });
        expect(style.color.evaluateColor(frameState, feature1)).toEqual(new Color(38/255, 255/255, 82/255, 0.5));
        expect(style.color.evaluateColor(frameState, feature2)).toEqual(new Color(255/255, 30/255, 30/255, 1.0));
    });

    it('applies color style that maps id to color', function() {
        var style = new Cesium3DTileStyle({
            "defines" : {
                "id" : "regExp('^1(\\d)').exec(String(${id}))"
            },
            "color" : {
                "conditions" : [
                    ["${id} === '1'", "color('#FF0000')"],
                    ["${id} === '2'", "color('#00FF00')"],
                    ["true", "color('#FFFFFF')"]
                ]
            }
        });
        expect(style.color.evaluateColor(frameState, feature1)).toEqual(Color.RED);
        expect(style.color.evaluateColor(frameState, feature2)).toEqual(Color.LIME);
    });

    it('applies color style with conditional', function() {
        var style = new Cesium3DTileStyle({
            "color" : {
                "conditions" : [
                    ["(${Height} >= 100.0)", "color('#0000FF')"],
                    ["(${Height} >= 70.0)", "color('#00FFFF')"],
                    ["(${Height} >= 50.0)", "color('#00FF00')"],
                    ["(${Height} >= 30.0)", "color('#FFFF00')"],
                    ["(${Height} >= 10.0)", "color('#FF0000')"],
                    ["(${Height} >= 1.0)", "color('#FF00FF')"]
                ]
            }
        });
        expect(style.color.evaluateColor(frameState, feature1)).toEqual(Color.BLUE);
        expect(style.color.evaluateColor(frameState, feature2)).toEqual(Color.YELLOW);
    });

    it('applies pointSize style with variable', function() {
        var style = new Cesium3DTileStyle({
            "pointSize" : "${Temperature} / 10.0"
        });

        expect(style.pointSize.evaluate(frameState, feature1)).toEqual(7.8);
        expect(style.pointSize.evaluate(frameState, feature2)).toEqual(9.2);
    });

    it('applies pointSize style with regexp and variables', function() {
        var style = new Cesium3DTileStyle({
            "pointSize" : "(regExp('^Chest').test(${County})) ? 2.0 : 1.0"
        });

        expect(style.pointSize.evaluate(frameState, feature1)).toEqual(2.0);
        expect(style.pointSize.evaluate(frameState, feature2)).toEqual(1.0);
    });

    it('applies pointSize style with conditional', function() {
        var style = new Cesium3DTileStyle({
            "pointSize" : {
                "conditions" : [
                    ["(${Height} >= 100.0)", "6"],
                    ["(${Height} >= 70.0)", "5"],
                    ["(${Height} >= 50.0)", "4"],
                    ["(${Height} >= 30.0)", "3"],
                    ["(${Height} >= 10.0)", "2"],
                    ["(${Height} >= 1.0)", "1"]
                ]
            }
        });
        expect(style.pointSize.evaluate(frameState, feature1)).toEqual(6);
        expect(style.pointSize.evaluate(frameState, feature2)).toEqual(3);
    });

    it('applies with defines', function() {
        var style = new Cesium3DTileStyle({
            "defines" : {
                "halfHeight" : "${Height} / 2",
                "quarterHeight" : "${Height} / 4",
                "halfVolume" : "${volume} / 2"
            },
            "color" : {
                "conditions" : [
                    ["(${halfHeight} >= 25.0)", "color('red')"],
                    ["(${Height} >= 1.0)", "color('blue')"]
                ]
            },
            "show" : "(${quarterHeight} >= 20.0)",
            "pointSize" : "${halfVolume} + ${halfHeight}",
            "meta" : {
                "description" : "'Half height is ' + ${halfHeight}"
            }
        });

        expect(style.color.evaluateColor(frameState, feature1)).toEqual(Color.RED);
        expect(style.color.evaluateColor(frameState, feature2)).toEqual(Color.BLUE);
        expect(style.show.evaluate(frameState, feature1)).toEqual(true);
        expect(style.show.evaluate(frameState, feature2)).toEqual(false);
        expect(style.pointSize.evaluate(frameState, feature1)).toEqual(114);
        expect(style.pointSize.evaluate(frameState, feature2)).toEqual(44);
        expect(style.meta.description.evaluate(frameState, feature1)).toEqual('Half height is 50');
        expect(style.meta.description.evaluate(frameState, feature2)).toEqual('Half height is 19');
    });

    it('return undefined shader functions when the style is empty', function() {
        // The default color style is white, the default show style is true, and the default pointSize is 1.0,
        // but the generated generated shader functions should just be undefined. We don't want all the points to be white.
        var style = new Cesium3DTileStyle({});
        var colorFunction = style.getColorShaderFunction('getColor', '', {});
        var showFunction = style.getShowShaderFunction('getShow', '', {});
        var pointSizeFunction = style.getPointSizeShaderFunction('getPointSize', '', {});
        expect(colorFunction).toBeUndefined();
        expect(showFunction).toBeUndefined();
        expect(pointSizeFunction).toBeUndefined();
    });
});
