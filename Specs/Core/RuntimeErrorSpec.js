/*global defineSuite*/
defineSuite([
    'Core/RuntimeError'
], function(
    RuntimeError
) {
    "use strict";
    /*global it,expect*/

    var name = 'RuntimeError';
    var testMessage = 'Testing';

    it('name and message', function() {
        var e = new RuntimeError(testMessage);

        expect(e.name).toEqual(name);
        expect(e.message).toEqual(testMessage);
    });

    it('toString', function() {
        var e = new RuntimeError(testMessage).toString();

        expect(e.indexOf(name + ': ' + testMessage)).toEqual(0);
        expect(e.indexOf('Core/RuntimeErrorSpec.js')).toBeGreaterThan(0);
    });
});
