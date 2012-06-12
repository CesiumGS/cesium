/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlColor',
             'Core/Color',
            ], function(
              CzmlColor,
              Color) {
    "use strict";
    /*global it,expect*/

    var testColor1 = new Color(0.5, 0.5, 0.5, 0.5);
    var testColor3 = new Color(1.0, 1.0, 1.0, 1.0);

    var constantRgbaInterval = {
        rgba : [127.5, 127.5, 127.5, 127.5]
    };

    var constantRgbafInterval = {
        rgbaf : [0.5, 0.5, 0.5, 0.5]
    };

    var sampledRgbaInterval = {
        rgba : [0, 0, 0, 0, 0, 1, 255, 255, 255, 255]
    };

    var sampledRgbafInterval = {
        rgbaf : [0, 0, 0, 0, 0, 1, 1.0, 1.0, 1.0, 1.0]
    };

    var interpolationResult = [1.0, 1.0, 1.0, 1.0];

    it('unwrapInterval', function() {
        expect(CzmlColor.unwrapInterval(constantRgbaInterval)).toEqualArray(constantRgbafInterval.rgbaf);
        expect(CzmlColor.unwrapInterval(constantRgbafInterval)).toEqualArray(constantRgbafInterval.rgbaf);
        expect(CzmlColor.unwrapInterval(sampledRgbaInterval)).toEqualArray(sampledRgbafInterval.rgbaf);
        expect(CzmlColor.unwrapInterval(sampledRgbafInterval)).toEqualArray(sampledRgbafInterval.rgbaf);
    });

    it('isSampled', function() {
        expect(CzmlColor.isSampled(constantRgbaInterval.rgba)).toEqual(false);
        expect(CzmlColor.isSampled(constantRgbafInterval.rgbaf)).toEqual(false);
        expect(CzmlColor.isSampled(sampledRgbaInterval.rgba)).toEqual(true);
        expect(CzmlColor.isSampled(sampledRgbafInterval.rgbaf)).toEqual(true);
    });

    it('createValue', function() {
        expect(CzmlColor.createValue(constantRgbafInterval.rgbaf)).toEqual(testColor1);
    });

    it('createValueFromArray', function() {
        expect(CzmlColor.createValueFromArray(sampledRgbafInterval.rgbaf, 6)).toEqual(testColor3);
    });

    it('createValueFromInterpolationResult', function() {
        expect(CzmlColor.createValueFromInterpolationResult(interpolationResult)).toEqual(testColor3);
    });

    it('packValuesForInterpolation', function() {
        var sourceArray = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
        var destinationArray = [];
        var firstIndex = 0;
        var lastIndex = 1;
        CzmlColor.packValuesForInterpolation(sourceArray, destinationArray, firstIndex, lastIndex);
        expect(destinationArray).toEqualArray(sourceArray);
    });
});
