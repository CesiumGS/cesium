/*global defineSuite*/
defineSuite([
        'Core/DeveloperError'
    ], function(
        DeveloperError) {
    'use strict';

    var name = 'DeveloperError';
    var testMessage = 'Testing';

    var e;
    beforeEach(function() {
        e = new DeveloperError(testMessage);
    });

    it('has a name property', function() {
        expect(e.name).toEqual(name);
    });

    it('has a message property', function() {
        expect(e.message).toEqual(testMessage);
    });

    it('has a stack property', function() {
        expect(e.stack).toContain('DeveloperErrorSpec.js');
    });

    it('has a working toString', function() {
        var str = new DeveloperError(testMessage).toString();

        expect(str).toContain(name + ': ' + testMessage);
        expect(str).toContain('Core/DeveloperErrorSpec.js');
    });
});
