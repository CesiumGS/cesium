/*global defineSuite*/
defineSuite([
        'Core/definedNotNull'
    ], function(
        definedNotNull) {
    "use strict";
    /*global jasmine,it,expect*/

    it('works', function() {
        expect(definedNotNull(0)).toEqual(true);
        expect(definedNotNull(undefined)).toEqual(false);
        expect(definedNotNull(null)).toEqual(false);
    });
});