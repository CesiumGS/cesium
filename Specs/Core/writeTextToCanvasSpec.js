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
        var canvas1 = writeTextToCanvas('I', {
            font : '30px Arial bold',
            fill : true,
            fillColor : Color.RED,
            stroke : false
        });
        var context1 = canvas1.getContext('2d');

        var canvas2 = writeTextToCanvas('I', {
            font : '30px Arial bold',
            fill : false,
            stroke : true,
            strokeColor : Color.BLUE
        });
        var context2 = canvas2.getContext('2d');

        var row = 5;

        // exact pixel checks are problematic due to browser differences in how text is drawn
        // so walk pixels left-to-right and check the number of times that the pixel value changes
        // color, ignoring alpha.

        function getColorChangeCount(context) {
            var colorChangeCount = 0;
            var lastPixel;
            var pixel;

            for ( var column = 0; column < canvas1.width; ++column) {
                pixel = context1.getImageData(column, row, 1, 1).data;

                if (typeof lastPixel !== 'undefined') {
                    if (pixel[0] !== lastPixel[0] || pixel[1] !== lastPixel[1] || pixel[2] !== lastPixel[2]) {
                        ++colorChangeCount;
                    }
                }
                lastPixel = pixel;
            }
            return colorChangeCount;
        }

        // context1 is filled, so there should only be two "edges"
        expect(getColorChangeCount(context1)).toEqual(2);

        // context1 is stroked, so there should be four "edges"
        expect(getColorChangeCount(context2)).toEqual(2);
    });
});