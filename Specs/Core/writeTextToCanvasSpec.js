/*global defineSuite */
defineSuite([
         'Core/writeTextToCanvas',
         'Core/Color'
     ], function(
         writeTextToCanvas,
         Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('returns undefined when text is blank', function() {
        var canvas = writeTextToCanvas('');

        expect(canvas).toBeUndefined();
    });

    it('throws when text is undefined', function() {
        expect(function() {
            writeTextToCanvas();
        }).toThrow();
    });

    it('sizes the canvas to fit the text', function() {
        var canvas1 = writeTextToCanvas('m');
        var canvas2 = writeTextToCanvas('mm');

        expect(canvas1.width).not.toEqual(canvas2.width);
        expect(canvas1.height).toEqual(canvas2.height);
    });

    it('allows the text to be either stroked or filled', function() {
        var canvas1 = writeTextToCanvas('m', {
            font : '30px Arial',
            fill : true,
            fillColor : Color.RED,
            stroke : false
        });
        var context1 = canvas1.getContext('2d');

        var canvas2 = writeTextToCanvas('m', {
            font : '30px Arial',
            fill : false,
            stroke : true,
            strokeColor : Color.BLUE
        });
        var context2 = canvas2.getContext('2d');

        expect(canvas1.width).toEqual(canvas2.width);
        expect(canvas1.height).toEqual(canvas2.height);

        var pixel;
        pixel = context1.getImageData(3, 1, 1, 1).data;
        expect(pixel).toEqual([255, 0, 0, 255]); //red

        pixel = context1.getImageData(3, 0, 1, 1).data;
        pixel = [].slice.call(pixel, 0, 3); //ignore alpha
        expect(pixel).toEqual([255, 0, 0]); //red

        pixel = context2.getImageData(3, 1, 1, 1).data;
        expect(pixel).toEqual([0, 0, 0, 0]); //transparent

        pixel = context2.getImageData(3, 0, 1, 1).data;
        pixel = [].slice.call(pixel, 0, 3); //ignore alpha
        expect(pixel).toEqual([0, 0, 255]); //blue
    });
});