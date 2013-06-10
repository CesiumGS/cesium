/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlImage'
            ], function(
              CzmlImage) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var simpleImage = 'foo.png';

    var constantImageInterval = {
        image : 'foo.png'
    };

    it('unwrapInterval works without a source uri', function() {
        expect(CzmlImage.unwrapInterval(simpleImage)).toEqual(simpleImage);
        expect(CzmlImage.unwrapInterval(constantImageInterval)).toEqual(constantImageInterval.image);
    });

    it('unwrapInterval resolves link with sourceUri', function() {
        expect(CzmlImage.unwrapInterval(simpleImage, "http://www.agi.com")).toEqual("http://www.agi.com/foo.png");
        expect(CzmlImage.unwrapInterval(simpleImage, "http://www.agi.com/data.czml")).toEqual("http://www.agi.com/foo.png");
        expect(CzmlImage.unwrapInterval(simpleImage, "http://www.agi.com/subdir/data.czml")).toEqual("http://www.agi.com/subdir/foo.png");
        expect(CzmlImage.unwrapInterval(constantImageInterval, "http://www.agi.com/someQuery?a=1&b=3")).toEqual("http://www.agi.com/foo.png");
    });

    it('unwrapInterval works with absolute urls', function() {
        var url = 'http://example.invalid/someDir/some.png';
        expect(CzmlImage.unwrapInterval(url, "http://www.agi.com")).toEqual(url);
        expect(CzmlImage.unwrapInterval(url, "http://www.agi.com/data.czml")).toEqual(url);
        expect(CzmlImage.unwrapInterval(url, "http://www.agi.com/subdir/data.czml")).toEqual(url);

        var interval = {
            image : url
        };
        expect(CzmlImage.unwrapInterval(interval, "http://www.agi.com/someQuery?a=1&b=3")).toEqual(url);
    });

    it('unwrapInterval works with data urls', function() {
        var dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2Nk+M/wHwAEBgIA5agATwAAAABJRU5ErkJggg==';

        expect(CzmlImage.unwrapInterval(dataUrl, "http://www.agi.com")).toEqual(dataUrl);
        expect(CzmlImage.unwrapInterval(dataUrl, "http://www.agi.com/data.czml")).toEqual(dataUrl);
        expect(CzmlImage.unwrapInterval(dataUrl, "http://www.agi.com/data.czml")).toEqual(dataUrl);

        var interval = {
            image : dataUrl
        };
        expect(CzmlImage.unwrapInterval(interval, "http://www.agi.com/someQuery?a=1&b=3")).toEqual(dataUrl);
    });

    it('isSampled always returns false', function() {
        expect(CzmlImage.isSampled()).toEqual(false);
    });

    it('getValue always returns the passed in parameter.', function() {
        expect(CzmlImage.getValue(simpleImage)).toBe(simpleImage);
        expect(CzmlImage.getValue(constantImageInterval.image)).toBe(constantImageInterval.image);
    });
});
