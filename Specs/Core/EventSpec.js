/*global defineSuite*/
defineSuite([
        'Core/Event'
    ], function(
        Event) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var event;
    var spyListener;
    beforeEach(function() {
        event = new Event();
        spyListener = jasmine.createSpy('listener');
    });

    it('works with no scope', function() {
        var someValue = 123;

        event.addEventListener(spyListener);
        event.raiseEvent(someValue);

        expect(spyListener).toHaveBeenCalledWith(someValue);

        spyListener.calls.reset();

        event.removeEventListener(spyListener);
        event.raiseEvent(someValue);

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('works with scope', function() {
        var someValue = 123;
        var scope = {};

        event.addEventListener(spyListener, scope);
        event.raiseEvent(someValue);

        expect(spyListener).toHaveBeenCalledWith(someValue);
        expect(spyListener.calls.first().object).toBe(scope);

        spyListener.calls.reset();

        event.removeEventListener(spyListener, scope);
        event.raiseEvent(someValue);

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('can remove from withing a callback', function() {
        var doNothing = function(evt) {
        };

        var removeEventCb = function(evt) {
            event.removeEventListener(removeEventCb);
        };

        var doNothing2 = function(evt) {
        };

        event.addEventListener(doNothing);
        event.addEventListener(removeEventCb);
        event.addEventListener(doNothing2);
        event.raiseEvent();
        expect(event.numberOfListeners).toEqual(2);

        event.removeEventListener(doNothing);
        event.removeEventListener(doNothing2);
        expect(event.numberOfListeners).toEqual(0);
    });

    it('addEventListener and removeEventListener works with same function of different scopes', function() {
        var Scope = function() {
            this.timesCalled = 0;
        };

        Scope.prototype.myCallback = function() {
            this.timesCalled++;
        };

        var scope1 = new Scope();
        var scope2 = new Scope();

        event.addEventListener(Scope.prototype.myCallback, scope1);
        event.addEventListener(Scope.prototype.myCallback, scope2);
        event.raiseEvent();

        expect(scope1.timesCalled).toEqual(1);
        expect(scope2.timesCalled).toEqual(1);

        event.removeEventListener(Scope.prototype.myCallback, scope1);
        expect(event.numberOfListeners).toEqual(1);
        event.raiseEvent();

        expect(scope1.timesCalled).toEqual(1);
        expect(scope2.timesCalled).toEqual(2);

        event.removeEventListener(Scope.prototype.myCallback, scope2);
        expect(event.numberOfListeners).toEqual(0);
    });

    it('numberOfListeners returns the correct number', function() {
        var callback1 = function() {
        };

        var callback2 = function() {
        };

        expect(event.numberOfListeners).toEqual(0);

        event.addEventListener(callback1);
        expect(event.numberOfListeners).toEqual(1);

        event.addEventListener(callback2);
        expect(event.numberOfListeners).toEqual(2);

        event.removeEventListener(callback2);
        expect(event.numberOfListeners).toEqual(1);
    });

    it('removeEventListener indicates if the listener is registered with the event', function() {
        var callback = function() {
        };

        event.addEventListener(callback);
        expect(event.numberOfListeners).toEqual(1);

        expect(event.removeEventListener(callback)).toEqual(true);
        expect(event.numberOfListeners).toEqual(0);

        expect(event.removeEventListener(callback)).toEqual(false);
    });

    it('removeEventListener does not remove a registered listener of a different scope', function() {
        var myFunc = function() {
        };
        var scope = {};
        event.addEventListener(myFunc, scope);
        expect(event.removeEventListener(myFunc)).toEqual(false);
    });

    it('works with no listeners', function() {
        event.raiseEvent(123);
    });

    it('addEventListener returns a function allowing removal', function() {
        var someValue = 123;

        var remove = event.addEventListener(spyListener);
        event.raiseEvent(someValue);

        expect(spyListener).toHaveBeenCalledWith(someValue);
        spyListener.calls.reset();

        remove();
        event.raiseEvent(someValue);

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('addEventListener with scope returns a function allowing removal', function() {
        var someValue = 123;
        var scope = {};

        var remove = event.addEventListener(spyListener, scope);
        event.raiseEvent(someValue);

        expect(spyListener).toHaveBeenCalledWith(someValue);
        spyListener.calls.reset();

        remove();
        event.raiseEvent(someValue);

        expect(spyListener).not.toHaveBeenCalled();
    });

    it('addEventListener throws with undefined listener', function() {
        expect(function() {
            event.addEventListener(undefined);
        }).toThrowDeveloperError();
    });

    it('addEventListener throws with null listener', function() {
        expect(function() {
            event.addEventListener(null);
        }).toThrowDeveloperError();
    });

    it('addEventListener throws with non-function listener', function() {
        expect(function() {
            event.addEventListener({});
        }).toThrowDeveloperError();
    });

    it('removeEventListener throws with undefined listener', function() {
        expect(function() {
            event.removeEventListener(undefined);
        }).toThrowDeveloperError();
    });

    it('removeEventListener throws with null listener', function() {
        expect(function() {
            event.removeEventListener(null);
        }).toThrowDeveloperError();
    });
});