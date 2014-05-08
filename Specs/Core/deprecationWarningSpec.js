/*global defineSuite*/
defineSuite([
         'Core/deprecationWarning'
     ], function(
         deprecationWarning) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor,console*/

    it('logs a warning', function() {
        var consoleLog = console.log;
        var spy = jasmine.createSpy('listener');
        console.log = spy;

        deprecationWarning('identifier', 'message');
        deprecationWarning('identifier', 'message');
        deprecationWarning('another identifier', 'another message');

        expect(spy.calls.length).toEqual(2);
        expect(spy.calls[0].args[0]).toBe('message');
        expect(spy.calls[1].args[0]).toBe('another message');

        console.log = consoleLog;
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