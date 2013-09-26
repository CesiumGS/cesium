/*global defineSuite*/
defineSuite(['Core/IauOrientationParameters'], function(IauOrientationParameters) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor throws without rightAscension', function() {
        expect(function() {
            return new IauOrientationParameters();
        }).toThrow();
    });

    it('constructor throws without declination', function() {
        expect(function() {
            return new IauOrientationParameters(1.0);
        }).toThrow();
    });

    it('constructor throws without rotation', function() {
        expect(function() {
            return new IauOrientationParameters(1.0, 2.0);
        }).toThrow();
    });

    it('constructor throws without rotationRate', function() {
        expect(function() {
            return new IauOrientationParameters(1.0, 2.0, 3.0);
        }).toThrow();
    });

    it('constructs', function() {
        var rightAscension = 1.0;
        var declination = 2.0;
        var rotation = 3.0;
        var rotationRate = 4.0;

        var param = new IauOrientationParameters(rightAscension, declination, rotation, rotationRate);
        expect(param.rightAscension).toEqual(rightAscension);
        expect(param.declination).toEqual(declination);
        expect(param.rotation).toEqual(rotation);
        expect(param.rotationRate).toEqual(rotationRate);
    });
});
