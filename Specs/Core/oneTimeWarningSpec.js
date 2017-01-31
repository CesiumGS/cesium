/*global defineSuite*/
defineSuite([
        'Core/oneTimeWarning'
    ], function(
        oneTimeWarning) {
    "use strict";

    it('logs a warning', function() {
        spyOn(console, 'warn');

        oneTimeWarning('oneTime-identifier', 'message');
        oneTimeWarning('oneTime-identifier');
        oneTimeWarning('another oneTime-identifier');

        expect(console.warn.calls.count()).toEqual(2);
        expect(console.warn.calls.argsFor(0)[0]).toBe('message');
        expect(console.warn.calls.argsFor(1)[0]).toBe('another oneTime-identifier');
    });

    it('throws without identifier', function() {
        expect(function() {
            oneTimeWarning();
        }).toThrowDeveloperError();
    });
});
