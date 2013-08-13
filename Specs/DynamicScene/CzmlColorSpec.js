/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlColor',
             'Core/Color'
            ], function(
              CzmlColor,
              Color) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var constantRgbaInterval = {
        rgba : [1, 2, 3, 4]
    };

    var constantRgbafInterval = {
        rgbaf : [Color.byteToFloat(1), Color.byteToFloat(2), Color.byteToFloat(3), Color.byteToFloat(4)]
    };

    var sampledRgbaInterval = {
        rgba : [0, 1, 2, 3, 4, 1, 5, 6, 7, 8]
    };

    var sampledRgbafInterval = {
        rgbaf : [0, Color.byteToFloat(1), Color.byteToFloat(2), Color.byteToFloat(3), Color.byteToFloat(4), 1, Color.byteToFloat(5), Color.byteToFloat(6), Color.byteToFloat(7), Color.byteToFloat(8)]
    };

    var color1 = new Color(sampledRgbafInterval.rgbaf[1], sampledRgbafInterval.rgbaf[2], sampledRgbafInterval.rgbaf[3], sampledRgbafInterval.rgbaf[4]);

    it('unwrapInterval', function() {
        expect(CzmlColor.unwrapInterval(constantRgbaInterval)).toEqual(constantRgbafInterval.rgbaf);
        expect(CzmlColor.unwrapInterval(constantRgbafInterval)).toEqual(constantRgbafInterval.rgbaf);
        expect(CzmlColor.unwrapInterval(sampledRgbaInterval)).toEqual(sampledRgbafInterval.rgbaf);
        expect(CzmlColor.unwrapInterval(sampledRgbafInterval)).toEqual(sampledRgbafInterval.rgbaf);
    });

    it('isSampled', function() {
        expect(CzmlColor.isSampled(sampledRgbaInterval.rgba)).toEqual(true);
        expect(CzmlColor.isSampled(sampledRgbafInterval.rgbaf)).toEqual(true);
    });

    it('getValue', function() {
        expect(CzmlColor.getValue(constantRgbafInterval.rgbaf)).toEqual(color1);
    });
});
