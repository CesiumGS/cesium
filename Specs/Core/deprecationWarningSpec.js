/*global defineSuite*/
defineSuite([
        'Core/deprecationWarning'
    ], function(
        deprecationWarning) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,console*/

    it('logs a warning', function() {
        spyOn(console, 'log');

        deprecationWarning('identifier', 'message');
        deprecationWarning('identifier', 'message');
        deprecationWarning('another identifier', 'another message');

        expect(console.log.calls.count()).toEqual(2);
        expect(console.log.calls.argsFor(0)[0]).toBe('message');
        expect(console.log.calls.argsFor(1)[0]).toBe('another message');
    });

    it('throws without identifier', function() {
        expect(function() {
            deprecationWarning();
        }).toThrowDeveloperError();
    });

    it('throws without message', function() {
        expect(function() {
            deprecationWarning('identifier');
        }).toThrowDeveloperError();
    });
});