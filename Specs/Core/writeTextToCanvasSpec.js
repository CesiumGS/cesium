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
        var row = 5;

        // exact pixel checks are problematic due to browser differences in how text is drawn
        // so walk pixels left-to-right and check the number of times that the pixel value changes
        // color, ignoring alpha.

        function getColorChangeCount(canvas) {
            var colorChangeCount = 0;
            var lastPixel;
            var pixel;

            var context = canvas.getContext('2d');

            for ( var column = 0; column < canvas.width; ++column) {
                pixel = context.getImageData(column, row, 1, 1).data;

                if (typeof lastPixel !== 'undefined') {
                    if (pixel[0] !== lastPixel[0] || pixel[1] !== lastPixel[1] || pixel[2] !== lastPixel[2]) {
                        ++colorChangeCount;
                    }
                }
                lastPixel = pixel;
            }
            return colorChangeCount;
        }

        var canvas1 = writeTextToCanvas('I', {
            font : '90px "Open Sans"',
            fill : true,
            fillColor : Color.RED,
            stroke : false
        });

        // canvas1 is filled, so there should only be two "edges"
        expect(getColorChangeCount(canvas1)).toEqual(2);

        var canvas2 = writeTextToCanvas('I', {
            font : '90px "Open Sans"',
            fill : false,
            stroke : true,
            strokeColor : Color.BLUE
        });

        // canvas2 is stroked, so there should be four "edges"
        expect(getColorChangeCount(canvas2)).toEqual(4);
    });
});