/*global defineSuite*/
defineSuite([
        'Core/RuntimeError'
    ], function(
        RuntimeError) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var name = 'RuntimeError';
    var testMessage = 'Testing';

    var e;
    beforeEach(function() {
        e = new RuntimeError(testMessage);
    });

    it('has a name property', function() {
        expect(e.name).toEqual(name);
    });

    it('has a message property', function() {
        expect(e.message).toEqual(testMessage);
    });

    it('has a stack property', function() {
        expect(e.stack).toContain('RuntimeErrorSpec.js');
    });

    it('has a working toString', function() {
        var str = new RuntimeError(testMessage).toString();

        expect(str).toContain(name + ': ' + testMessage);
        expect(str).toContain('Core/RuntimeErrorSpec.js');
    });
});
