import { Event } from "../../Source/Cesium.js";

describe("Core/Event", function () {
  let event;
  let spyListener;
  beforeEach(function () {
    event = new Event();
    spyListener = jasmine.createSpy("listener");
  });

  it("works with no scope", function () {
    const someValue = 123;

    event.addEventListener(spyListener);
    event.raiseEvent(someValue);

    expect(spyListener).toHaveBeenCalledWith(someValue);

    spyListener.calls.reset();

    event.removeEventListener(spyListener);
    event.raiseEvent(someValue);

    expect(spyListener).not.toHaveBeenCalled();
  });

  it("works with scope", function () {
    const someValue = 123;
    const scope = {};

    event.addEventListener(spyListener, scope);
    event.raiseEvent(someValue);

    expect(spyListener).toHaveBeenCalledWith(someValue);
    expect(spyListener.calls.first().object).toBe(scope);

    spyListener.calls.reset();

    event.removeEventListener(spyListener, scope);
    event.raiseEvent(someValue);

    expect(spyListener).not.toHaveBeenCalled();
  });

  it("can remove from within a callback", function () {
    const doNothing = function (evt) {};

    const removeEventCb = function (evt) {
      event.removeEventListener(removeEventCb);
    };

    const doNothing2 = function (evt) {};

    event.addEventListener(doNothing);
    event.addEventListener(removeEventCb);
    event.addEventListener(doNothing2);
    event.raiseEvent();
    expect(event.numberOfListeners).toEqual(2);

    event.removeEventListener(doNothing);
    event.removeEventListener(doNothing2);
    expect(event.numberOfListeners).toEqual(0);
  });

  it("can remove multiple listeners within a callback", function () {
    const removeEvent0 = event.addEventListener(function () {
      removeEvent0();
    });
    event.addEventListener(function () {});
    const removeEvent2 = event.addEventListener(function () {
      removeEvent2();
    });
    event.addEventListener(function () {});
    const removeEvent4 = event.addEventListener(function () {
      removeEvent4();
    });
    event.addEventListener(function () {});
    const removeEvent6 = event.addEventListener(function () {
      removeEvent6();
    });
    event.addEventListener(function () {});
    const removeEvent8 = event.addEventListener(function () {
      removeEvent8();
    });
    event.addEventListener(function () {});

    expect(event.numberOfListeners).toEqual(10);
    event.raiseEvent();
    expect(event.numberOfListeners).toEqual(5);
    event.raiseEvent();
    expect(event.numberOfListeners).toEqual(5);
  });

  it("addEventListener and removeEventListener works with same function of different scopes", function () {
    const Scope = function () {
      this.timesCalled = 0;
    };

    Scope.prototype.myCallback = function () {
      this.timesCalled++;
    };

    const scope1 = new Scope();
    const scope2 = new Scope();

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

  it("numberOfListeners returns the correct number", function () {
    const callback1 = function () {};

    const callback2 = function () {};

    expect(event.numberOfListeners).toEqual(0);

    event.addEventListener(callback1);
    expect(event.numberOfListeners).toEqual(1);

    event.addEventListener(callback2);
    expect(event.numberOfListeners).toEqual(2);

    event.removeEventListener(callback2);
    expect(event.numberOfListeners).toEqual(1);
  });

  it("removeEventListener indicates if the listener is registered with the event", function () {
    const callback = function () {};

    event.addEventListener(callback);
    expect(event.numberOfListeners).toEqual(1);

    expect(event.removeEventListener(callback)).toEqual(true);
    expect(event.numberOfListeners).toEqual(0);

    expect(event.removeEventListener(callback)).toEqual(false);
  });

  it("removeEventListener does not remove a registered listener of a different scope", function () {
    const myFunc = function () {};
    const scope = {};
    event.addEventListener(myFunc, scope);
    expect(event.removeEventListener(myFunc)).toEqual(false);
  });

  it("works with no listeners", function () {
    event.raiseEvent(123);
  });

  it("addEventListener returns a function allowing removal", function () {
    const someValue = 123;

    const remove = event.addEventListener(spyListener);
    event.raiseEvent(someValue);

    expect(spyListener).toHaveBeenCalledWith(someValue);
    spyListener.calls.reset();

    remove();
    event.raiseEvent(someValue);

    expect(spyListener).not.toHaveBeenCalled();
  });

  it("addEventListener with scope returns a function allowing removal", function () {
    const someValue = 123;
    const scope = {};

    const remove = event.addEventListener(spyListener, scope);
    event.raiseEvent(someValue);

    expect(spyListener).toHaveBeenCalledWith(someValue);
    spyListener.calls.reset();

    remove();
    event.raiseEvent(someValue);

    expect(spyListener).not.toHaveBeenCalled();
  });

  it("addEventListener throws with undefined listener", function () {
    expect(function () {
      event.addEventListener(undefined);
    }).toThrowDeveloperError();
  });

  it("addEventListener throws with null listener", function () {
    expect(function () {
      event.addEventListener(null);
    }).toThrowDeveloperError();
  });

  it("addEventListener throws with non-function listener", function () {
    expect(function () {
      event.addEventListener({});
    }).toThrowDeveloperError();
  });

  it("removeEventListener throws with undefined listener", function () {
    expect(function () {
      event.removeEventListener(undefined);
    }).toThrowDeveloperError();
  });

  it("removeEventListener throws with null listener", function () {
    expect(function () {
      event.removeEventListener(null);
    }).toThrowDeveloperError();
  });
});
