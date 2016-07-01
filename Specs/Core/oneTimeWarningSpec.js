/*global defineSuite*/
defineSuite([
        'Core/oneTimeWarning'
    ], function(
        oneTimeWarning) {
    "use strict";

    it('logs a warning', function() {
        spyOn(console, 'log');

        oneTimeWarning('oneTime-identifier', 'message');
        oneTimeWarning('oneTime-identifier');
        oneTimeWarning('another oneTime-identifier');

        expect(console.log.calls.count()).toEqual(2);
        expect(console.log.calls.argsFor(0)[0]).toBe('message');
        expect(console.log.calls.argsFor(1)[0]).toBe('another oneTime-identifier');
    });

    it('throws without identifier', function() {
        expect(function() {
            oneTimeWarning();
        }).toThrowDeveloperError();
    });
});
