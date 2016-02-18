/*global defineSuite*/
defineSuite([
        'Core/PinBuilder',
        'Core/buildModuleUrl',
        'Core/Color',
        'Core/defined',
        'ThirdParty/when'
    ], function(
        PinBuilder,
        buildModuleUrl,
        Color,
        defined,
        when) {
    'use strict';

    function getPinColor(canvas) {
        var context2D = canvas.getContext("2d");
        var data = context2D.getImageData(64, 5, 1, 1).data;
        return Color.fromBytes(data[0], data[1], data[2]);
    }

    function getIconColor(canvas) {
        var context2D = canvas.getContext("2d");
        var data = context2D.getImageData(64, 32, 1, 1).data;
        return Color.fromBytes(data[0], data[1], data[2]);
    }

    it('fromColor creates icon of correct color', function() {
        var builder = new PinBuilder();
        var canvas = builder.fromColor(Color.GREEN, 128);
        expect(getPinColor(canvas)).toEqual(Color.GREEN);
    });

    it('fromText creates icon of correct color with symbol', function() {
        var builder = new PinBuilder();
        //Solid square icon
        var canvas = builder.fromText('\u25A0', Color.BLUE, 128);
        expect(getPinColor(canvas)).toEqual(Color.BLUE);
        expect(getIconColor(canvas)).toEqual(Color.WHITE);
    });

    it('fromUrl creates icon of correct color with symbol', function() {
        var builder = new PinBuilder();

        //Solid square icon
        return when(builder.fromUrl(buildModuleUrl('Assets/Textures/maki/square.png'), Color.RED, 128), function(canvas) {
            expect(getPinColor(canvas)).toEqual(Color.RED);
            expect(getIconColor(canvas)).toEqual(Color.WHITE);
        });
    });

    it('fromMakiIconId creates icon of correct color with symbol', function() {
        var builder = new PinBuilder();

        //Solid square icon
        return when(builder.fromMakiIconId('square', Color.YELLOW, 128), function(canvas) {
            expect(getPinColor(canvas)).toEqual(Color.YELLOW);
            expect(getIconColor(canvas)).toEqual(Color.WHITE);
        });
    });

    it('caches and returns existing canvas', function() {
        var builder = new PinBuilder();
        var canvas = builder.fromColor(Color.GREEN, 128);
        var canvas2 = builder.fromColor(Color.GREEN, 128);
        expect(canvas).toBe(canvas2);
    });

    it('fromColor throws without color', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromColor(undefined, 128);
        }).toThrowDeveloperError();
    });

    it('fromColor throws without size', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromColor(Color.RED, undefined);
        }).toThrowDeveloperError();
    });

    it('fromText throws without text', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromText(undefined, Color.RED, 128);
        }).toThrowDeveloperError();
    });

    it('fromText throws without color', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromText('text', undefined, 128);
        }).toThrowDeveloperError();
    });

    it('fromText throws without size', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromText('text', Color.RED, undefined);
        }).toThrowDeveloperError();
    });

    it('fromUrl throws without url', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromUrl(undefined, Color.RED, 128);
        }).toThrowDeveloperError();
    });

    it('fromUrl throws without color', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromUrl('http://someUrl.invalid/some.png', undefined, 128);
        }).toThrowDeveloperError();
    });

    it('fromUrl throws without size', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromUrl('http://someUrl.invalid/some.png', Color.RED, undefined);
        }).toThrowDeveloperError();
    });

    it('fromMakiIconId throws without id', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromMakiIconId(undefined, Color.RED, 128);
        }).toThrowDeveloperError();
    });

    it('fromMakiIconId throws without color', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromMakiIconId('hospital', undefined, 128);
        }).toThrowDeveloperError();
    });

    it('fromMakiIconId throws without size', function() {
        var builder = new PinBuilder();
        expect(function() {
            builder.fromMakiIconId('hospital', Color.RED, undefined);
        }).toThrowDeveloperError();
    });
});
