/*global defineSuite*/
defineSuite([
        'Core/ScreenSpaceEventHandler',
        'Core/Cartesian2',
        'Core/KeyboardEventModifier',
        'Core/ScreenSpaceEventType'
    ], function(
        ScreenSpaceEventHandler,
        Cartesian2,
        KeyboardEventModifier,
        ScreenSpaceEventType) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    // create a mock document object to add events to so they are callable.
    var MockDoc = function() {
        this._callbacks = {
            keydown : [],
            mousemove : [],
            mouseup : [],
            mousedown : [],
            dblclick : [],
            mousewheel : [],
            touchstart : [],
            touchmove : [],
            touchend : []
        };
        this.disableRootEvents = true;
    };

    MockDoc.prototype.getBoundingClientRect = function() {
        return {
            left : 0,
            top : 0,
            width : 0,
            height : 0
        };
    };

    MockDoc.prototype.addEventListener = function(name, callback, bubble) {
        if (name === 'DOMMouseScroll') {
            name = 'mousewheel';
        }

        if (this._callbacks[name]) {
            this._callbacks[name].push(callback);
        }
    };

    MockDoc.prototype.removeEventListener = function(name, callback) {
        if (name === 'DOMMouseScroll') {
            name = 'mousewheel';
        }

        var callbacks = this._callbacks[name];
        var index = -1;
        for ( var i = 0; i < callbacks.length; i++) {
            if (callbacks[i] === callback) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    };

    function emptyStub() {
    }

    MockDoc.prototype.fireEvents = function(name, args) {
        var callbacks = this._callbacks[name];
        if (!callbacks) {
            return;
        }

        args.preventDefault = emptyStub;
        for ( var i = 0; i < callbacks.length; i++) {
            if (callbacks[i]) {
                callbacks[i](args);
            }
        }
    };

    MockDoc.prototype.getNumRegistered = function() {
        var count = 0;
        for ( var name in this._callbacks) {
            if (this._callbacks.hasOwnProperty(name) && this._callbacks[name]) {
                count += this._callbacks[name].length;
            }
        }
        return count;
    };

    var element;
    var handler;

    beforeEach(function() {
        element = new MockDoc();
        handler = new ScreenSpaceEventHandler(element);
    });

    afterEach(function() {
        handler = !handler.isDestroyed() && handler.destroy();
    });

    it('setting mouse events require an action', function() {
        expect(function() {
            handler.setInputAction();
        }).toThrowDeveloperError();
    });

    it('setting mouse events require a type', function() {
        expect(function() {
            handler.setInputAction(function() {
            });
        }).toThrowDeveloperError();
    });

    it('getting mouse events require a type', function() {
        expect(function() {
            handler.getInputAction();
        }).toThrowDeveloperError();
    });

    it('removing mouse events require a type', function() {
        expect(function() {
            handler.removeInputAction();
        }).toThrowDeveloperError();
    });

    it('mouse right down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_DOWN);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_DOWN)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_DOWN);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse right up', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_UP);
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_UP)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_UP);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse right click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_CLICK);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_CLICK)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 2,
            clientY : 2
        });
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse left down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_DOWN);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_DOWN)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_DOWN);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse left up', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_UP);
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_UP)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_UP);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse left click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_CLICK);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_CLICK)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 2,
            clientY : 2
        });
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse middle down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_DOWN);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_DOWN)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_DOWN);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse middle up', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_UP);
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_UP)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_UP);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse middle click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_CLICK);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_CLICK)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_CLICK);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 2,
            clientY : 2
        });
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse left double click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 0,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse right double click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 2,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse middle double click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 2,
            clientY : 2
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('mouse move', function() {
        var actualMove = {
            startPosition : new Cartesian2(0, 0),
            endPosition : new Cartesian2(0, 0)
        };
        var expectedMove = {
            startPosition : new Cartesian2(1, 1),
            endPosition : new Cartesian2(2, 2)
        };

        var mouseMove = function(movement) {
            actualMove.startPosition = Cartesian2.clone(movement.startPosition, new Cartesian2());
            actualMove.endPosition = Cartesian2.clone(movement.endPosition, new Cartesian2());
        };

        handler.setInputAction(mouseMove, ScreenSpaceEventType.MOUSE_MOVE);
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 2,
            clientY : 2
        });
        expect(actualMove).toEqual(expectedMove);

        expect(handler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE)).toEqual(mouseMove);

        handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 2,
            clientY : 2
        });
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 3,
            clientY : 3
        });

        expect(actualMove).toEqual(expectedMove);
    });

    it('mouse wheel', function() {
        var actualDelta = 0;
        var expectedDelta = -120;

        var mouseWheel = function(delta) {
            actualDelta = delta;
        };

        handler.setInputAction(mouseWheel, ScreenSpaceEventType.WHEEL);
        element.fireEvents('mousewheel', {
            wheelDelta : -120
        });
        expect(actualDelta).toEqual(expectedDelta);

        expect(handler.getInputAction(ScreenSpaceEventType.WHEEL)).toEqual(mouseWheel);

        handler.removeInputAction(ScreenSpaceEventType.WHEEL);
        element.fireEvents('mousewheel', {
            wheelDelta : -360
        });

        expect(actualDelta).toEqual(expectedDelta);
    });

    it('modified mouse right down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_DOWN, KeyboardEventModifier.SHIFT);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 1,
            clientY : 1,
            shiftKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_DOWN, KeyboardEventModifier.SHIFT)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_DOWN, KeyboardEventModifier.SHIFT);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 2,
            clientY : 2,
            shiftKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse right up', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_UP, KeyboardEventModifier.SHIFT);
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 1,
            clientY : 1,
            shiftKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_UP, KeyboardEventModifier.SHIFT)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_UP, KeyboardEventModifier.SHIFT);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 2,
            clientY : 2,
            shiftKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse right click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_CLICK, KeyboardEventModifier.SHIFT);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 1,
            clientY : 1,
            shiftKey : true
        });
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 1,
            clientY : 1,
            shiftKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_CLICK, KeyboardEventModifier.SHIFT)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_CLICK, KeyboardEventModifier.SHIFT);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 2,
            clientY : 2,
            shiftKey : true
        });
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 2,
            clientY : 2,
            shiftKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse left down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_DOWN, KeyboardEventModifier.ALT);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 1,
            clientY : 1,
            altKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_DOWN, KeyboardEventModifier.ALT)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_DOWN, KeyboardEventModifier.ALT);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 2,
            clientY : 2,
            altKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse left up', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_UP, KeyboardEventModifier.ALT);
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 1,
            clientY : 1,
            altKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_UP, KeyboardEventModifier.ALT)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_UP, KeyboardEventModifier.ALT);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 2,
            clientY : 2,
            altKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse left click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_CLICK, KeyboardEventModifier.ALT);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 1,
            clientY : 1,
            altKey : true
        });
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 1,
            clientY : 1,
            altKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_CLICK, KeyboardEventModifier.ALT)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK, KeyboardEventModifier.ALT);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 2,
            clientY : 2,
            altKey : true
        });
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 2,
            clientY : 2,
            altKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse middle down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_DOWN, KeyboardEventModifier.CTRL);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_DOWN, KeyboardEventModifier.CTRL)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_DOWN, KeyboardEventModifier.CTRL);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse middle up', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_UP, KeyboardEventModifier.CTRL);
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_UP, KeyboardEventModifier.CTRL)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_UP, KeyboardEventModifier.CTRL);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse middle click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_CLICK, KeyboardEventModifier.CTRL)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse left double click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.LEFT_DOUBLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 0,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK, KeyboardEventModifier.CTRL)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 0,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse right double click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.RIGHT_DOUBLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 2,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK, KeyboardEventModifier.CTRL)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 2,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse middle double click', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(mouseDown, ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, KeyboardEventModifier.CTRL)).toEqual(mouseDown);

        handler.removeInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, KeyboardEventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('modified mouse move', function() {
        var actualMove = {
            startPosition : new Cartesian2(0, 0),
            endPosition : new Cartesian2(0, 0)
        };
        var expectedMove = {
            startPosition : new Cartesian2(1, 1),
            endPosition : new Cartesian2(2, 2)
        };

        var mouseMove = function(movement) {
            actualMove.startPosition = Cartesian2.clone(movement.startPosition, new Cartesian2());
            actualMove.endPosition = Cartesian2.clone(movement.endPosition, new Cartesian2());
        };

        handler.setInputAction(mouseMove, ScreenSpaceEventType.MOUSE_MOVE, KeyboardEventModifier.CTRL);
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });
        expect(actualMove).toEqual(expectedMove);

        expect(handler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, KeyboardEventModifier.CTRL)).toEqual(mouseMove);

        handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE, KeyboardEventModifier.CTRL);
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });
        element.fireEvents('mousemove', {
            button : 1,
            clientX : 3,
            clientY : 3,
            ctrlKey : true
        });

        expect(actualMove).toEqual(expectedMove);
    });

    it('modified mouse wheel', function() {
        var actualDelta = 0;
        var expectedDelta = -120;

        var mouseWheel = function(delta) {
            actualDelta = delta;
        };

        handler.setInputAction(mouseWheel, ScreenSpaceEventType.WHEEL, KeyboardEventModifier.CTRL);
        element.fireEvents('mousewheel', {
            wheelDelta : -120,
            ctrlKey : true
        });
        expect(actualDelta).toEqual(expectedDelta);

        expect(handler.getInputAction(ScreenSpaceEventType.WHEEL, KeyboardEventModifier.CTRL)).toEqual(mouseWheel);

        handler.removeInputAction(ScreenSpaceEventType.WHEEL, KeyboardEventModifier.CTRL);
        element.fireEvents('mousewheel', {
            wheelDelta : -360,
            ctrlKey : true
        });

        expect(actualDelta).toEqual(expectedDelta);
    });

    it('touch', function() {
        var startPosition;
        var endPosition;
        var callback = function(event) {
            startPosition = Cartesian2.clone(event.position, new Cartesian2());
        };
        var callbackMove = function(event) {
            startPosition = Cartesian2.clone(event.startPosition, new Cartesian2());
            endPosition = Cartesian2.clone(event.endPosition, new Cartesian2());
        };

        handler.setInputAction(callback, ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(callbackMove, ScreenSpaceEventType.MOUSE_MOVE);
        handler.setInputAction(callback, ScreenSpaceEventType.LEFT_UP);

        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_DOWN)).toEqual(callback);
        expect(handler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE)).toEqual(callbackMove);
        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_UP)).toEqual(callback);

        element.fireEvents('touchstart', {
            touches : [{
                clientX : 1,
                clientY : 1
            }]
        });
        expect(startPosition).toEqual(new Cartesian2(1, 1));

        element.fireEvents('touchmove', {
            touches : [{
                clientX : 2,
                clientY : 2
            }]
        });
        expect(startPosition).toEqual(new Cartesian2(1, 1));
        expect(endPosition).toEqual(new Cartesian2(2, 2));

        element.fireEvents('touchend', {
            touches : [],
            changedTouches : [{
                clientX : 3,
                clientY : 3
            }]
        });
        expect(startPosition).toEqual(new Cartesian2(3, 3));
    });

    it('pinch', function() {
        var pinching = false;
        var pinchStartCallback = function() {
            pinching = true;
        };
        var pinchEndCallback = function() {
            pinching = false;
        };
        var movement;
        var pinchMoveCallback = function(event) {
            movement = event;
        };

        handler.setInputAction(pinchStartCallback, ScreenSpaceEventType.PINCH_START);
        handler.setInputAction(pinchMoveCallback, ScreenSpaceEventType.PINCH_MOVE);
        handler.setInputAction(pinchEndCallback, ScreenSpaceEventType.PINCH_END);

        expect(handler.getInputAction(ScreenSpaceEventType.PINCH_START)).toEqual(pinchStartCallback);
        expect(handler.getInputAction(ScreenSpaceEventType.PINCH_MOVE)).toEqual(pinchMoveCallback);
        expect(handler.getInputAction(ScreenSpaceEventType.PINCH_END)).toEqual(pinchEndCallback);

        var touches = [{
            clientX : 2,
            clientY : 2,
            identifier : 0
        }];
        element.fireEvents('touchstart', { touches : touches });
        touches.push({
            clientX : 3,
            clientY : 3,
            identifier : 1
        });
        element.fireEvents('touchstart', { touches : touches });
        expect(pinching).toEqual(true);

        touches[0].clientX = touches[0].clientY = 1;
        touches[1].clientX = touches[1].clientY = 4;
        element.fireEvents('touchmove', { touches : touches });
        expect(pinching).toEqual(true);
        expect(movement.distance.startPosition).toEqual(new Cartesian2(0, Math.sqrt(2.0) * 0.25));
        expect(movement.distance.endPosition).toEqual(new Cartesian2(0, Math.sqrt(18.0) * 0.25));
        expect(movement.angleAndHeight.startPosition).toEqual(new Cartesian2(Math.atan2(1.0, 1.0), 5.0 * 0.125));
        expect(movement.angleAndHeight.endPosition).toEqual(new Cartesian2(Math.atan2(3.0, 3.0), 5.0 * 0.125));
    });

    it('touch click', function() {
        var touchClick = new Cartesian2();
        var touchClickCallback = function(event) {
            touchClick = Cartesian2.clone(event.position, new Cartesian2());
        };

        handler.setInputAction(touchClickCallback, ScreenSpaceEventType.LEFT_CLICK);
        expect(handler.getInputAction(ScreenSpaceEventType.LEFT_CLICK)).toEqual(touchClickCallback);

        var touches = [{
            clientX : 2,
            clientY : 2,
            identifier : 0
        }];
        element.fireEvents('touchstart', { touches : touches });
        element.fireEvents('touchend', { touches : [], changedTouches : touches });

        expect(touchClick).toEqual(new Cartesian2(2.0, 2.0));
    });

    it('isDestroyed', function() {
        expect(handler.isDestroyed()).toEqual(false);
        handler.destroy();
        expect(handler.isDestroyed()).toEqual(true);
    });

    it('destroy event handler', function() {
        expect(element.getNumRegistered() !== 0).toEqual(true);
        handler._unregister();
        expect(element.getNumRegistered()).toEqual(0);
    });
});
