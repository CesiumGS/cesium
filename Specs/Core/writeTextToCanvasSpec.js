defineSuite([
        'Core/writeTextToCanvas',
        'Core/Color'
    ], function(
        writeTextToCanvas,
        Color) {
    'use strict';

    it('returns undefined when text is blank', function() {
        var canvas = writeTextToCanvas('');

        expect(canvas).toBeUndefined();
    });

    it('throws when text is undefined', function() {
        expect(function() {
            writeTextToCanvas();
        }).toThrowDeveloperError();
    });

    it('sizes the canvas to fit the text', function() {
        var canvas1 = writeTextToCanvas('m');
        var canvas2 = writeTextToCanvas('mm');

        expect(canvas1.width).not.toEqual(canvas2.width);
        expect(canvas1.height).toEqual(canvas2.height);
    });

    it('allows the text to be either stroked or filled', function() {
        var row = 20;

        // exact pixel checks are problematic due to browser differences in how text is drawn
        // so walk pixels left-to-right and check the number of times that the pixel value changes
        // color, ignoring alpha.

        function getColorChangeCount(canvas) {
            var colorChangeCount = 0;

            var context = canvas.getContext('2d');

            var pixel = context.getImageData(0, row, 1, 1).data;

            var lastRed = pixel[0];
            var lastGreen = pixel[1];
            var lastBlue = pixel[2];

            for ( var column = 0; column < canvas.width; ++column) {
                pixel = context.getImageData(column, row, 1, 1).data;

                var red = pixel[0];
                var green = pixel[1];
                var blue = pixel[2];

                // round up pixels that have been subpixel anti-aliased
                if (red > 0 && red !== 255) {
                    red = 255;
                }
                if (green > 0 && green !== 255) {
                    green = 255;
                }
                if (blue > 0 && blue !== 255) {
                    blue = 255;
                }

                if (red !== lastRed || green !== lastGreen || blue !== lastBlue) {
                    ++colorChangeCount;
                }
                lastRed = red;
                lastGreen = green;
                lastBlue = blue;
            }
            return colorChangeCount;
        }

        var canvas1 = writeTextToCanvas('I', {
            font : '90px "Open Sans"',
            fill : true,
            fillColor : Color.RED,
            stroke : false
        });

        // canvas1 is filled, completely by the I on the left
        // and then has empty space on the right, so there
        // should only be one "edge": fill -> outside
        var count = getColorChangeCount(canvas1);
        expect(count === 1 || count === 2).toEqual(true);

        var canvas2 = writeTextToCanvas('I', {
            font : '90px "Open Sans"',
            fill : false,
            stroke : true,
            strokeColor : Color.BLUE
        });

        // canvas2 is stroked, so there should be three "edges": outline -> inside -> outline -> outside
        count = getColorChangeCount(canvas2);
        expect(count === 3 || count === 4).toEqual(true);
    });

    it('background color defaults to transparent', function() {
        var canvas = writeTextToCanvas('a', {
            font : '90px "Open Sans"'
        });

        var context = canvas.getContext('2d');
        var pixel = context.getImageData(0, 0, 1, 1).data;
        expect(pixel).toEqual([0,0,0,0]);
    });

    it('background can be set', function() {
        var canvas = writeTextToCanvas('a', {
            font : '90px "Open Sans"',
            backgroundColor : Color.RED
        });

        var context = canvas.getContext('2d');
        var pixel = context.getImageData(0, 0, 1, 1).data;
        expect(pixel).toEqual([255,0,0,255]);
    });

    it('border can be set', function() {
        var canvas1 = writeTextToCanvas('a', {
            font : '90px "Open Sans"',
            backgroundColor : Color.RED
        });

        var canvas2 = writeTextToCanvas('a', {
            font : '90px "Open Sans"',
            backgroundColor : Color.RED,
            padding : 2
        });

        expect(canvas2.width).toEqual(canvas1.width+4);
        expect(canvas2.height).toEqual(canvas1.height+4);
    });
});
