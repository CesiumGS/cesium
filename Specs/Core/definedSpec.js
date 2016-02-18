/*global defineSuite*/
defineSuite([
        'Core/defined'
    ], function(
        defined) {
    'use strict';

    it('works for defined value', function() {
        expect(defined(0)).toEqual(true);
    });

    it('works for null value', function() {
        expect(defined(null)).toEqual(false);
    });

    it('works for undefined value', function() {
        expect(defined(undefined)).toEqual(false);
    });
});
