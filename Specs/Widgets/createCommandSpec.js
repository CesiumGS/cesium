/*global defineSuite*/
defineSuite(['Widgets/createCommand'
            ], function(
                    createCommand) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var myFuncCalled = false;
    var myFuncReturnValue = 5;
    var myFunc = function() {
        myFuncCalled = true;
        return myFuncReturnValue;
    };

    var myCanExeucteCalled = false;
    var myCanExecute = function() {
        myCanExeucteCalled = true;
        return true;
    };

    beforeEach(function() {
        myFuncCalled = false;
        myCanExeucteCalled = false;
    });

    it('createCommand works with default canExecute', function() {
        var command = createCommand(myFunc);
        expect(command.canExecute()).toBe(true);
        expect(command()).toBe(myFuncReturnValue);
    });

    it('createCommand works with custum canExecute', function() {
        var command = createCommand(myFunc, myCanExecute);
        expect(command()).toBe(myFuncReturnValue);
        expect(myFuncCalled).toBe(true);
        expect(myCanExeucteCalled).toBe(true);
    });

    it('created commands call pre/post events', function() {
        var command = createCommand(myFunc);
        var myArg = {};

        var beforeCalled = false;
        command.beforeExecute.addEventListener(function(info) {
            beforeCalled = true;
            expect(info.cancel).toEqual(false);
            expect(info.args.length).toEqual(1);
            expect(info.args[0]).toBe(myArg);
        });

        var afterCalled = false;
        command.afterExecute.addEventListener(function(result) {
            afterCalled = true;
            expect(result).toEqual(myFuncReturnValue);
        });

        expect(command(myArg)).toBe(myFuncReturnValue);
        expect(beforeCalled).toBe(true);
        expect(afterCalled).toBe(true);
    });

    it('beforeExecute can cancel a command', function() {
        var command = createCommand(myFunc);
        var myArg = {};

        var beforeCalled = false;
        command.beforeExecute.addEventListener(function(info) {
            beforeCalled = true;
            info.cancel = true;
        });

        var afterCalled = false;
        command.afterExecute.addEventListener(function(result) {
            afterCalled = true;
        });

        expect(command(myArg)).toBeUndefined();
        expect(myFuncCalled).toBe(false);
        expect(beforeCalled).toBe(true);
        expect(afterCalled).toBe(false);
    });

    it('createCommand throws is canExecute is false', function() {
        var command = createCommand(myFunc, function() {
            return false;
        });
        expect(function() {
            command();
        }).toThrow();
        expect(myFuncCalled).toBe(false);
    });

    it('createCommand throws without a func parameter', function() {
        expect(function() {
            return createCommand(undefined, myCanExecute);
        }).toThrow();
    });
});