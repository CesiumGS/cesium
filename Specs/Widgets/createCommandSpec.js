/*global defineSuite*/
defineSuite([
        'Widgets/createCommand',
        'ThirdParty/knockout'
    ], function(
        createCommand,
        knockout) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var spyFunction;
    var spyFunctionReturnValue = 5;

    beforeEach(function() {
        spyFunction = jasmine.createSpy('spyFunction').andReturn(spyFunctionReturnValue);
    });

    it('works with default value of canExecute', function() {
        var command = createCommand(spyFunction);
        expect(command.canExecute).toBe(true);
        expect(command()).toBe(spyFunctionReturnValue);
        expect(spyFunction).toHaveBeenCalled();
    });

    it('throws when canExecute value is false', function() {
        var command = createCommand(spyFunction, false);
        expect(function() {
            command();
        }).toThrowDeveloperError();
        expect(spyFunction).not.toHaveBeenCalled();
    });

    it('throws without a func parameter', function() {
        expect(function() {
            return createCommand(undefined);
        }).toThrowDeveloperError();
    });

    it('works with custom canExecute observable', function() {
        var canExecute = knockout.observable(false);
        var command = createCommand(spyFunction, canExecute);

        expect(command.canExecute).toBe(false);
        expect(function() {
            command();
        }).toThrowDeveloperError();
        expect(spyFunction).not.toHaveBeenCalled();

        canExecute(true);

        expect(command.canExecute).toBe(true);
        expect(command()).toBe(spyFunctionReturnValue);
        expect(spyFunction).toHaveBeenCalled();
    });

    it('calls pre/post events', function() {
        var command = createCommand(spyFunction);
        var myArg = {};

        var beforeExecuteSpy = jasmine.createSpy('beforeExecute');
        command.beforeExecute.addEventListener(beforeExecuteSpy);

        var afterExecuteSpy = jasmine.createSpy('afterExecute');
        command.afterExecute.addEventListener(afterExecuteSpy);

        expect(command(myArg)).toBe(spyFunctionReturnValue);

        expect(beforeExecuteSpy.calls.length).toEqual(1);
        expect(beforeExecuteSpy).toHaveBeenCalledWith({
            cancel : false,
            args : [myArg]
        });

        expect(afterExecuteSpy.calls.length).toEqual(1);
        expect(afterExecuteSpy).toHaveBeenCalledWith(spyFunctionReturnValue);
    });

    it('cancels a command if beforeExecute sets cancel to true', function() {
        var command = createCommand(spyFunction);
        var myArg = {};

        var beforeExecuteSpy = jasmine.createSpy('beforeExecute').andCallFake(function(info) {
            info.cancel = true;
        });
        command.beforeExecute.addEventListener(beforeExecuteSpy);

        var afterExecuteSpy = jasmine.createSpy('afterExecute');
        command.afterExecute.addEventListener(afterExecuteSpy);

        expect(command(myArg)).toBeUndefined();

        expect(beforeExecuteSpy.calls.length).toEqual(1);
        expect(afterExecuteSpy).not.toHaveBeenCalled();
    });
});