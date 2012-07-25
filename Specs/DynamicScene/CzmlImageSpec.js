/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlImage'
            ], function(
              CzmlImage) {
    "use strict";
    /*global it,expect*/

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
        expect(CzmlImage.unwrapInterval(constantImageInterval, "http://www.agi.com/someQuery?a=1&b=3")).toEqual("http://www.agi.com/foo.png");
    });

    it('isSampled always returns false', function() {
        expect(CzmlImage.isSampled()).toEqual(false);
    });

    it('getValue always returns the passed in parameter.', function() {
        expect(CzmlImage.getValue(simpleImage)).toBe(simpleImage);
        expect(CzmlImage.getValue(constantImageInterval.image)).toBe(constantImageInterval.image);
    });
});
