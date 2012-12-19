/*global defineSuite*/
defineSuite(['Core/Color'], function(Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('Constructing without arguments produces expected defaults', function() {
        var v = new Color();
        expect(v.red).toEqual(1.0);
        expect(v.green).toEqual(1.0);
        expect(v.blue).toEqual(1.0);
        expect(v.alpha).toEqual(1.0);
    });

    it('Constructing with arguments sets property values', function() {
        var v = new Color(0.1, 0.2, 0.3, 0.4);
        expect(v.red).toEqual(0.1);
        expect(v.green).toEqual(0.2);
        expect(v.blue).toEqual(0.3);
        expect(v.alpha).toEqual(0.4);
    });

    it('fromBytes without arguments produces expected defaults', function() {
        var v = new Color();
        expect(v.red).toEqual(1.0);
        expect(v.green).toEqual(1.0);
        expect(v.blue).toEqual(1.0);
        expect(v.alpha).toEqual(1.0);
    });

    it('fromBytes with arguments sets property values', function() {
        var v = Color.fromBytes(0, 255, 51, 102);
        expect(v.red).toEqual(0.0);
        expect(v.green).toEqual(1.0);
        expect(v.blue).toEqual(0.2);
        expect(v.alpha).toEqual(0.4);
    });

    it('byteToFloat works in all cases', function() {
        expect(Color.byteToFloat(0)).toEqual(0);
        expect(Color.byteToFloat(255)).toEqual(1.0);
        expect(Color.byteToFloat(127)).toEqual(127 / 255);
    });

    it('floatToByte works in all cases', function() {
        expect(Color.floatToByte(0)).toEqual(0);
        expect(Color.floatToByte(1.0)).toEqual(255);
        expect(Color.floatToByte(127 / 255)).toEqual(127);
    });

    it('clone with no parameters returns a new identical copy.', function() {
        var v = new Color(0.1, 0.2, 0.3, 0.4);
        var v2 = v.clone();
        expect(v).toEqual(v2);
        expect(v === v2).toEqual(false);
    });

    it('clone with a parameter modifies the parameter.', function() {
        var v = new Color(0.1, 0.2, 0.3, 0.4);
        var v2 = new Color();
        var v3 = v.clone(v2);
        expect(v).toEqual(v2);
        expect(v3 === v2).toEqual(true);
    });

    it('equals works', function() {
        var v = new Color(0.1, 0.2, 0.3, 0.4);
        var v2 = new Color(0.1, 0.2, 0.3, 0.4);
        var v3 = new Color(0.1, 0.2, 0.3, 0.5);
        var v4 = new Color(0.1, 0.2, 0.5, 0.4);
        var v5 = new Color(0.1, 0.5, 0.3, 0.4);
        var v6 = new Color(0.5, 0.2, 0.3, 0.4);
        expect(v.equals(v2)).toEqual(true);
        expect(v.equals(v3)).toEqual(false);
        expect(v.equals(v4)).toEqual(false);
        expect(v.equals(v5)).toEqual(false);
        expect(v.equals(v6)).toEqual(false);
    });

    it('equalsEpsilon works', function() {
        var v = new Color(0.1, 0.2, 0.3, 0.4);
        var v2 = new Color(0.1, 0.2, 0.3, 0.4);
        var v3 = new Color(0.1, 0.2, 0.3, 0.5);
        var v4 = new Color(0.1, 0.2, 0.5, 0.4);
        var v5 = new Color(0.1, 0.5, 0.3, 0.4);
        var v6 = new Color(0.5, 0.2, 0.3, 0.4);
        expect(v.equalsEpsilon(v2, 0.0)).toEqual(true);
        expect(v.equalsEpsilon(v3, 0.0)).toEqual(false);
        expect(v.equalsEpsilon(v4, 0.0)).toEqual(false);
        expect(v.equalsEpsilon(v5, 0.0)).toEqual(false);
        expect(v.equalsEpsilon(v6, 0.0)).toEqual(false);

        expect(v.equalsEpsilon(v2, 0.1)).toEqual(true);
        expect(v.equalsEpsilon(v3, 0.1)).toEqual(true);
        expect(v.equalsEpsilon(v4, 0.2)).toEqual(true);
        expect(v.equalsEpsilon(v5, 0.3)).toEqual(true);
        expect(v.equalsEpsilon(v6, 0.4)).toEqual(true);
    });

    it('toCSSColor works', function() {
        expect(Color.WHITE.toCSSColor()).toEqual('rgba(255,255,255,1)');
        expect(Color.RED.toCSSColor()).toEqual('rgba(255,0,0,1)');
        expect(Color.BLUE.toCSSColor()).toEqual('rgba(0,0,255,1)');
        expect(new Color(0.1, 0.2, 0.3, 0.4).toCSSColor()).toEqual('rgba(25,51,76,0.4)');
    });

    it('fromCSSColor supports the #rgb format', function() {
        expect(Color.fromCSSColor('#f00')).toEqual(Color.RED);
        expect(Color.fromCSSColor('#0f0')).toEqual(Color.GREEN);
        expect(Color.fromCSSColor('#00f')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the #RGB format', function() {
        expect(Color.fromCSSColor('#F00')).toEqual(Color.RED);
        expect(Color.fromCSSColor('#0F0')).toEqual(Color.GREEN);
        expect(Color.fromCSSColor('#00F')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the #rrggbb format', function() {
        expect(Color.fromCSSColor('#ff0000')).toEqual(Color.RED);
        expect(Color.fromCSSColor('#00ff00')).toEqual(Color.GREEN);
        expect(Color.fromCSSColor('#0000ff')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the #RRGGBB format', function() {
        expect(Color.fromCSSColor('#FF0000')).toEqual(Color.RED);
        expect(Color.fromCSSColor('#00FF00')).toEqual(Color.GREEN);
        expect(Color.fromCSSColor('#0000FF')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the rgb() format', function() {
        expect(Color.fromCSSColor('rgb(255, 0, 0)')).toEqual(Color.RED);
        expect(Color.fromCSSColor('rgb(0, 255, 0)')).toEqual(Color.GREEN);
        expect(Color.fromCSSColor('rgb(0, 0, 255)')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the rgb%() format', function() {
        expect(Color.fromCSSColor('rgb(100%, 0, 0)')).toEqual(Color.RED);
        expect(Color.fromCSSColor('rgb(0, 100%, 0)')).toEqual(Color.GREEN);
        expect(Color.fromCSSColor('rgb(0, 0, 100%)')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the rgba() format', function() {
        expect(Color.fromCSSColor('rgba(255, 50%, 25%, 0.5)')).toEqual(new Color(1.0, 0.5, 0.25, 0.5));
    });

    it('fromCSSColor supports named colors', function() {
        expect(Color.fromCSSColor('red')).toEqual(Color.RED);
        expect(Color.fromCSSColor('green')).toEqual(Color.fromCSSColor('#008000'));
        expect(Color.fromCSSColor('blue')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports NAMED colors', function() {
        expect(Color.fromCSSColor('RED')).toEqual(Color.RED);
        expect(Color.fromCSSColor('GREEN')).toEqual(Color.fromCSSColor('#008000'));
        expect(Color.fromCSSColor('BLUE')).toEqual(Color.BLUE);
    });

    it('fromCSSColor supports the hsl() format', function() {
        expect(Color.fromCSSColor('hsl(360, 100%, 100%, 0.5)')).toEqual(Color.fromHSL(1, 1, 1, 0.5));
    });

    it('fromCSSColor supports the hsla() format', function() {
        expect(Color.fromCSSColor('hsla(360, 100%, 100%, 0.5)')).toEqual(Color.fromHSL(1, 1, 1, 0.5));
    });

    it('fromCSSColor can return a default value on unknown colors', function() {
        expect(Color.fromCSSColor('unknown', Color.GREEN)).toEqual(Color.GREEN);
    });

    it('fromCSSColor can throw on unknown colors', function() {
        expect(function() {Color.fromCSSColor('unknown', undefined, true);}).toThrow();
    });

    it('fromHSL works', function() {
        expect(Color.fromHSL(0, 1, 0.25)).toEqual(new Color(0.5, 0, 0));
        expect(Color.fromHSL(120 / 360, 1, 0.25)).toEqual(new Color(0, 0.5, 0));
        expect(Color.fromHSL(240 / 360, 1, 0.25)).toEqual(new Color(0, 0, 0.5));
        expect(Color.fromHSL(0, 0, 0.5)).toEqual(new Color(0.5, 0.5, 0.5));
    });
});
