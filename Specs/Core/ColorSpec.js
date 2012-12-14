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
        expect(Color.WHITE.equals(Color.fromCSSColor('#fFf'))).toBe(true);
        expect(Color.RED.equals(Color.fromCSSColor('#F00'))).toBe(true);
        expect(Color.BLUE.equals(Color.fromCSSColor('#00f'))).toBe(true);
        expect(new Color(1.0/15, 2.0/15, 3.0/15).equalsEpsilon(Color.fromCSSColor('#123'), 1/30)).toBe(true);
    });

    it('fromCSSColor supports the #rrggbb format', function() {
        expect(Color.WHITE.equals(Color.fromCSSColor('#ffFFff'))).toBe(true);
        expect(Color.RED.equals(Color.fromCSSColor('#Ff0000'))).toBe(true);
        expect(Color.BLUE.equals(Color.fromCSSColor('#0000ff'))).toBe(true);
        expect(new Color(1.0/255, 2.0/255, 3.0/255).equalsEpsilon(Color.fromCSSColor('#010203'), 1/510)).toBe(true);
    });

    it('fromCSSColor supports the rgb() format', function() {
        expect(Color.WHITE.equals(Color.fromCSSColor('rgb(255, 100%, 255)'))).toBe(true);
        expect(Color.RED.equals(Color.fromCSSColor('rgb(255, 0, 0)'))).toBe(true);
        expect(Color.BLUE.equals(Color.fromCSSColor('rgb(0, 0, 255)'))).toBe(true);
        expect(new Color(1.0, 0.5, 0.25).equalsEpsilon(Color.fromCSSColor('rgb(255, 50%, 25%)'), 1/510)).toBe(true);
    });

    it('fromCSSColor supports the rgba() format', function() {
        expect(Color.WHITE.equals(Color.fromCSSColor('rgba(255, 100%, 255, 1)'))).toBe(true);
        expect(Color.RED.equals(Color.fromCSSColor('rgba(255, 0, 0, 1)'))).toBe(true);
        expect(Color.BLUE.equals(Color.fromCSSColor('rgba(0, 0, 255, 1)'))).toBe(true);
        expect(new Color(1.0, 0.5, 0.25, 0.5).equalsEpsilon(Color.fromCSSColor('rgb(255, 50%, 25%, 0.5)'), 1/510)).toBe(true);
    });

    it('fromCSSColor does not support named colors', function() {
        expect(function() { Color.fromCSSColor('red'); }).toThrow();
    });

    it('fromCSSColor does not support hsl/hsla formats', function() {
        expect(function() { Color.fromCSSColor('hsl(0, 10%, 10%)'); }).toThrow();
        expect(function() { Color.fromCSSColor('hsla(0, 10%, 10%, 0.5)'); }).toThrow();
    });
});
