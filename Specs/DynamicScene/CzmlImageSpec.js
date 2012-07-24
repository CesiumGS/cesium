/*global defineSuite*/
defineSuite([
             'DynamicScene/CzmlImage'
            ], function(
              CzmlImage) {
    "use strict";
    /*global it,expect*/

    var simpleImage = 'some Value';

    var constantImageInterval = {
        image : 'some other value'
    };

    it('unwrapInterval', function() {
        expect(CzmlImage.unwrapInterval(simpleImage)).toEqual(simpleImage);
        expect(CzmlImage.unwrapInterval(constantImageInterval)).toEqual(constantImageInterval.image);
    });

    it('isSampled', function() {
        expect(CzmlImage.isSampled()).toEqual(false);
    });

    it('getValue', function() {
        expect(CzmlImage.getValue(simpleImage)).toEqual(simpleImage);
        expect(CzmlImage.getValue(constantImageInterval.image)).toEqual(constantImageInterval.image);
    });
});
