/*global defineSuite*/
defineSuite([
         'Core/EventHandler',
         'Core/EventModifier',
         'Core/MouseEventType',
         'Core/Cartesian2'
     ], function(
         EventHandler,
         EventModifier,
         MouseEventType,
         Cartesian2) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

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
        handler = new EventHandler(element);
    });

    afterEach(function() {
        handler = !handler.isDestroyed() && handler.destroy();
    });

    it('setting key events require an action', function() {
        expect(function() {
            handler.setKeyAction();
        }).toThrow();
    });

    it('setting key events require a key', function() {
        expect(function() {
            handler.setKeyAction(function() {
            });
        }).toThrow();
    });

    it('getting key events require a key', function() {
        expect(function() {
            handler.getKeyAction();
        }).toThrow();
    });

    it('removing key events require a key', function() {
        expect(function() {
            handler.removeKeyAction();
        }).toThrow();
    });

    it('setting mouse events require an action', function() {
        expect(function() {
            handler.setMouseAction();
        }).toThrow();
    });

    it('setting mouse events require a type', function() {
        expect(function() {
            handler.setMouseAction(function() {
            });
        }).toThrow();
    });

    it('getting mouse events require a type', function() {
        expect(function() {
            handler.getMouseAction();
        }).toThrow();
    });

    it('removing mouse events require a type', function() {
        expect(function() {
            handler.removeMouseAction();
        }).toThrow();
    });

    it('key events', function() {
        var keyPressed = false;

        var keyPressedFunction = function() {
            keyPressed = !keyPressed;
        };

        handler.setKeyAction(keyPressedFunction, 'a');
        element.fireEvents('keydown', {
            keyCode : 'a'.charCodeAt(0)
        });
        expect(keyPressed).toEqual(true);

        expect(handler.getKeyAction('a') === keyPressedFunction).toEqual(true);

        handler.removeKeyAction('a');
        element.fireEvents('keyDown', {
            keyCode : 'a'.charCodeAt(0)
        });

        expect(keyPressed).toEqual(true);
    });

    it('modified key events', function() {
        var modifiedKeyPressed = false;

        var modfiedKeyPressedFunction = function() {
            modifiedKeyPressed = !modifiedKeyPressed;
        };

        handler.setKeyAction(modfiedKeyPressedFunction, 'b', EventModifier.CTRL);
        element.fireEvents('keydown', {
            keyCode : 'b'.charCodeAt(0),
            ctrlKey : true
        });
        expect(modifiedKeyPressed).toEqual(true);

        expect(handler.getKeyAction('b', EventModifier.CTRL) === modfiedKeyPressedFunction).toEqual(true);

        handler.removeKeyAction('b', EventModifier.CTRL);
        element.fireEvents('keyDown', {
            keyCode : 'b'.charCodeAt(0),
            ctrlKey : true
        });

        expect(modifiedKeyPressed).toEqual(true);
    });

    it('mouse right down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_DOWN);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.RIGHT_DOWN) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_DOWN);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_UP);
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.RIGHT_UP) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_UP);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_CLICK);
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

        expect(handler.getMouseAction(MouseEventType.RIGHT_CLICK) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_CLICK);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_DOWN);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.LEFT_DOWN) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_DOWN);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_UP);
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.LEFT_UP) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_UP);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_CLICK);
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

        expect(handler.getMouseAction(MouseEventType.LEFT_CLICK) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_CLICK);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_DOWN);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.MIDDLE_DOWN) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_DOWN);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_UP);
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.MIDDLE_UP) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_UP);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_CLICK);
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

        expect(handler.getMouseAction(MouseEventType.MIDDLE_CLICK) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_CLICK);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 0,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.LEFT_DOUBLE_CLICK) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_DOUBLE_CLICK);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 2,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.RIGHT_DOUBLE_CLICK) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_DOUBLE_CLICK);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_DOUBLE_CLICK);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 1,
            clientY : 1
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.MIDDLE_DOUBLE_CLICK) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_DOUBLE_CLICK);
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
            actualMove.startPosition = movement.startPosition.clone();
            actualMove.endPosition = movement.endPosition.clone();
        };

        handler.setMouseAction(mouseMove, MouseEventType.MOVE);
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

        expect(handler.getMouseAction(MouseEventType.MOVE) === mouseMove).toEqual(true);

        handler.removeMouseAction(MouseEventType.MOVE);
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

        handler.setMouseAction(mouseWheel, MouseEventType.WHEEL);
        element.fireEvents('mousewheel', {
            wheelDelta : -120
        });
        expect(actualDelta).toEqual(expectedDelta);

        expect(handler.getMouseAction(MouseEventType.WHEEL) === mouseWheel).toEqual(true);

        handler.removeMouseAction(MouseEventType.WHEEL);
        element.fireEvents('mousewheel', {
            wheelDelta : -360
        });

        expect(actualDelta).toEqual(expectedDelta);
    });

    it('modified mouse right down', function() {
        var actualCoords = new Cartesian2(0, 0);
        var expectedCoords = new Cartesian2(1, 1);

        var mouseDown = function(event) {
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_DOWN, EventModifier.SHIFT);
        element.fireEvents('mousedown', {
            button : 2,
            clientX : 1,
            clientY : 1,
            shiftKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.RIGHT_DOWN, EventModifier.SHIFT) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_DOWN, EventModifier.SHIFT);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_UP, EventModifier.SHIFT);
        element.fireEvents('mouseup', {
            button : 2,
            clientX : 1,
            clientY : 1,
            shiftKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.RIGHT_UP, EventModifier.SHIFT) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_UP, EventModifier.SHIFT);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_CLICK, EventModifier.SHIFT);
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

        expect(handler.getMouseAction(MouseEventType.RIGHT_CLICK, EventModifier.SHIFT) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_CLICK, EventModifier.SHIFT);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_DOWN, EventModifier.ALT);
        element.fireEvents('mousedown', {
            button : 0,
            clientX : 1,
            clientY : 1,
            altKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.LEFT_DOWN, EventModifier.ALT) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_DOWN, EventModifier.ALT);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_UP, EventModifier.ALT);
        element.fireEvents('mouseup', {
            button : 0,
            clientX : 1,
            clientY : 1,
            altKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.LEFT_UP, EventModifier.ALT) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_UP, EventModifier.ALT);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_CLICK, EventModifier.ALT);
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

        expect(handler.getMouseAction(MouseEventType.LEFT_CLICK, EventModifier.ALT) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_CLICK, EventModifier.ALT);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_DOWN, EventModifier.CTRL);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.MIDDLE_DOWN, EventModifier.CTRL) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_DOWN, EventModifier.CTRL);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_UP, EventModifier.CTRL);
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.MIDDLE_UP, EventModifier.CTRL) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_UP, EventModifier.CTRL);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_CLICK, EventModifier.CTRL);
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

        expect(handler.getMouseAction(MouseEventType.MIDDLE_CLICK, EventModifier.CTRL) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_CLICK, EventModifier.CTRL);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.LEFT_DOUBLE_CLICK, EventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 0,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.LEFT_DOUBLE_CLICK, EventModifier.CTRL) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.LEFT_DOUBLE_CLICK, EventModifier.CTRL);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.RIGHT_DOUBLE_CLICK, EventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 2,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.RIGHT_DOUBLE_CLICK, EventModifier.CTRL) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.RIGHT_DOUBLE_CLICK, EventModifier.CTRL);
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
            actualCoords = event.position.clone();
        };

        handler.setMouseAction(mouseDown, MouseEventType.MIDDLE_DOUBLE_CLICK, EventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 1,
            clientY : 1,
            ctrlKey : true
        });
        expect(actualCoords).toEqual(expectedCoords);

        expect(handler.getMouseAction(MouseEventType.MIDDLE_DOUBLE_CLICK, EventModifier.CTRL) === mouseDown).toEqual(true);

        handler.removeMouseAction(MouseEventType.MIDDLE_DOUBLE_CLICK, EventModifier.CTRL);
        element.fireEvents('dblclick', {
            button : 1,
            clientX : 2,
            clientY : 2,
            ctrlKey : true
        });

        expect(actualCoords).toEqual(expectedCoords);
    });

    it('get middle press time', function() {
        handler.setMouseAction(function(event) {}, MouseEventType.MIDDLE_DOWN);
        element.fireEvents('mousedown', {
            button : 1,
            clientX : 1,
            clientY : 1
        });

        expect(handler.getMiddlePressTime()).toBeDefined();
    });

    it('get middle release time', function() {
        handler.setMouseAction(function(event) {}, MouseEventType.MIDDLE_DOWN);
        element.fireEvents('mouseup', {
            button : 1,
            clientX : 1,
            clientY : 1
        });

        expect(handler.getMiddleReleaseTime()).toBeDefined();
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
            actualMove.startPosition = movement.startPosition.clone();
            actualMove.endPosition = movement.endPosition.clone();
        };

        handler.setMouseAction(mouseMove, MouseEventType.MOVE, EventModifier.CTRL);
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

        expect(handler.getMouseAction(MouseEventType.MOVE, EventModifier.CTRL) === mouseMove).toEqual(true);

        handler.removeMouseAction(MouseEventType.MOVE, EventModifier.CTRL);
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

        handler.setMouseAction(mouseWheel, MouseEventType.WHEEL, EventModifier.CTRL);
        element.fireEvents('mousewheel', {
            wheelDelta : -120,
            ctrlKey : true
        });
        expect(actualDelta).toEqual(expectedDelta);

        expect(handler.getMouseAction(MouseEventType.WHEEL, EventModifier.CTRL) === mouseWheel).toEqual(true);

        handler.removeMouseAction(MouseEventType.WHEEL, EventModifier.CTRL);
        element.fireEvents('mousewheel', {
            wheelDelta : -360,
            ctrlKey : true
        });

        expect(actualDelta).toEqual(expectedDelta);
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
