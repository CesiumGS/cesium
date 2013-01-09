/*global defineSuite*/
defineSuite(['Core/Color'
         ], function(
             Color) {
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

    it('toCssColorString works', function() {
        expect(Color.fromCssColorString('WHITE').toCssColorString()).toEqual('rgba(255,255,255,1)');
        expect(Color.fromCssColorString('RED').toCssColorString()).toEqual('rgba(255,0,0,1)');
        expect(Color.fromCssColorString('BLUE').toCssColorString()).toEqual('rgba(0,0,255,1)');
        expect(new Color(0.1, 0.2, 0.3, 0.4).toCssColorString()).toEqual('rgba(25,51,76,0.4)');
    });

    it('fromCssColorString supports the #rgb format', function() {
        expect(Color.fromCssColorString('#f00')).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#0f0')).toEqual(new Color(0.0, 1.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#00f')).toEqual(new Color(0.0, 0.0, 1.0, 1.0));
    });

    it('fromCssColorString supports the #RGB format', function() {
        expect(Color.fromCssColorString('#F00')).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#0F0')).toEqual(new Color(0.0, 1.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#00F')).toEqual(new Color(0.0, 0.0, 1.0, 1.0));
    });

    it('fromCssColorString supports the #rrggbb format', function() {
        expect(Color.fromCssColorString('#ff0000')).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#00ff00')).toEqual(new Color(0.0, 1.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#0000ff')).toEqual(new Color(0.0, 0.0, 1.0, 1.0));
    });

    it('fromCssColorString supports the #RRGGBB format', function() {
        expect(Color.fromCssColorString('#FF0000')).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#00FF00')).toEqual(new Color(0.0, 1.0, 0.0, 1.0));
        expect(Color.fromCssColorString('#0000FF')).toEqual(new Color(0.0, 0.0, 1.0, 1.0));
    });

    it('fromCssColorString supports the rgb() format', function() {
        expect(Color.fromCssColorString('rgb(255, 0, 0)')).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(Color.fromCssColorString('rgb(0, 255, 0)')).toEqual(new Color(0.0, 1.0, 0.0, 1.0));
        expect(Color.fromCssColorString('rgb(0, 0, 255)')).toEqual(Color.fromCssColorString('BLUE'));
    });

    it('fromCssColorString supports the rgb%() format', function() {
        expect(Color.fromCssColorString('rgb(100%, 0, 0)')).toEqual(new Color(1.0, 0.0, 0.0, 1.0));
        expect(Color.fromCssColorString('rgb(0, 100%, 0)')).toEqual(new Color(0.0, 1.0, 0.0, 1.0));
        expect(Color.fromCssColorString('rgb(0, 0, 100%)')).toEqual(new Color(0.0, 0.0, 1.0, 1.0));
    });

    it('fromCssColorString supports the rgba() format', function() {
        expect(Color.fromCssColorString('rgba(255, 50%, 25%, 0.5)')).toEqual(new Color(1.0, 0.5, 0.25, 0.5));
    });

    it('fromCssColorString supports named colors', function() {
        expect(Color.fromCssColorString('red')).toEqual(Color.RED);
        expect(Color.fromCssColorString('green')).toEqual(Color.GREEN);
        expect(Color.fromCssColorString('blue')).toEqual(Color.BLUE);
    });

    it('fromCssColorString supports NAMED colors', function() {
        expect(Color.fromCssColorString('RED')).toEqual(Color.RED);
        expect(Color.fromCssColorString('GREEN')).toEqual(Color.GREEN);
        expect(Color.fromCssColorString('BLUE')).toEqual(Color.BLUE);
    });

    it('fromCssColorString supports the hsl() format', function() {
        expect(Color.fromCssColorString('hsl(360, 100%, 100%, 0.5)')).toEqual(Color.fromHsl(1, 1, 1, 0.5));
    });

    it('fromCssColorString supports the hsla() format', function() {
        expect(Color.fromCssColorString('hsla(360, 100%, 100%, 0.5)')).toEqual(Color.fromHsl(1, 1, 1, 0.5));
    });

    it('fromCssColorString can throw on unknown colors', function() {
        expect(Color.fromCssColorString('unknown', undefined, true)).toBeUndefined();
    });

    it('fromHSL works', function() {
        expect(Color.fromHsl(0, 1, 0.25)).toEqual(new Color(0.5, 0, 0));
        expect(Color.fromHsl(120 / 360, 1, 0.25)).toEqual(new Color(0, 0.5, 0));
        expect(Color.fromHsl(240 / 360, 1, 0.25)).toEqual(new Color(0, 0, 0.5));
        expect(Color.fromHsl(0, 0, 0.5)).toEqual(new Color(0.5, 0.5, 0.5));
    });
});
