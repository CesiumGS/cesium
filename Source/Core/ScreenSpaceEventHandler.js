/*global define*/
define([
        './Cartesian2',
        './defaultValue',
        './defined',
        './destroyObject',
        './DeveloperError',
        './KeyboardEventModifier',
        './ScreenSpaceEventType'
    ], function(
        Cartesian2,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        KeyboardEventModifier,
        ScreenSpaceEventType) {
    "use strict";

    /**
     * Handles user input events. Custom functions can be added to be executed on
     * when the user enters input.
     *
     * @alias ScreenSpaceEventHandler
     *
     * @param {Canvas} [element=document] The element to add events to.
     * @constructor
     */
    var ScreenSpaceEventHandler = function(element) {
        this._mouseEvents = {};
        this._leftMouseButtonDown = false;
        this._middleMouseButtonDown = false;
        this._rightMouseButtonDown = false;
        this._isPinching = false;
        this._seenAnyTouchEvents = false;
        this._lastMousePosition = new Cartesian2();
        this._lastTouch2 = new Cartesian2();
        this._totalPixels = 0;
        this._touchID1 = 0;
        this._touchID2 = 0;

        // TODO: Revisit when doing mobile development. May need to be configurable
        // or determined based on the platform?
        this._clickPixelTolerance = 5;

        this._element = defaultValue(element, document);

        register(this);
    };

    function getPosition(screenSpaceEventHandler, event, result) {
        if (screenSpaceEventHandler._element === document) {
            result.x = event.clientX;
            result.y = event.clientY;
            return result;
        }

        var rect = screenSpaceEventHandler._element.getBoundingClientRect();
        result.x = event.clientX - rect.left;
        result.y = event.clientY - rect.top;
        return result;
    }

    function getMouseEventsKey(type, modifier) {
        var key = type;
        if (defined(modifier)) {
            key += '+' + modifier;
        }
        return key;
    }

    /**
     * Set a function to be executed on an input event.
     *
     * @param {Function} action Function to be executed when the input event occurs.
     * @param {Number} type The ScreenSpaceEventType of input event.
     * @param {Number} [modifier] A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @see ScreenSpaceEventHandler#getInputAction
     * @see ScreenSpaceEventHandler#removeInputAction
     */
    ScreenSpaceEventHandler.prototype.setInputAction = function(action, type, modifier) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(action)) {
            throw new DeveloperError('action is required.');
        }
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        //>>includeEnd('debug');

        var key = getMouseEventsKey(type, modifier);
        this._mouseEvents[key] = action;
    };

    /**
     * Returns the function to be executed on an input event.
     *
     * @param {Number} type The ScreenSpaceEventType of input event.
     * @param {Number} [modifier] A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @see ScreenSpaceEventHandler#setInputAction
     * @see ScreenSpaceEventHandler#removeInputAction
     */
    ScreenSpaceEventHandler.prototype.getInputAction = function(type, modifier) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        //>>includeEnd('debug');

        var key = getMouseEventsKey(type, modifier);
        return this._mouseEvents[key];
    };

    /**
     * Removes the function to be executed on an input event.
     *
     * @param {Number} type The ScreenSpaceEventType of input event.
     * @param {Number} [modifier] A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @see ScreenSpaceEventHandler#getInputAction
     * @see ScreenSpaceEventHandler#setInputAction
     */
    ScreenSpaceEventHandler.prototype.removeInputAction = function(type, modifier) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        //>>includeEnd('debug');

        var key = getMouseEventsKey(type, modifier);
        delete this._mouseEvents[key];
    };

    function getModifier(event) {
        if (event.shiftKey) {
            return KeyboardEventModifier.SHIFT;
        } else if (event.ctrlKey) {
            return KeyboardEventModifier.CTRL;
        } else if (event.altKey) {
            return KeyboardEventModifier.ALT;
        }

        return undefined;
    }

    var scratchMouseDownEvent = {
        position : new Cartesian2()
    };

    function handleMouseDown(screenSpaceEventHandler, event) {
        var pos = getPosition(screenSpaceEventHandler, event, scratchMouseDownEvent.position);
        screenSpaceEventHandler._lastMousePosition.x = pos.x;
        screenSpaceEventHandler._lastMousePosition.y = pos.y;
        screenSpaceEventHandler._totalPixels = 0;
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var modifier = getModifier(event);
        var action;

        if (event.button === 0) {
            screenSpaceEventHandler._leftMouseButtonDown = true;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);
        } else if (event.button === 1) {
            screenSpaceEventHandler._middleMouseButtonDown = true;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MIDDLE_DOWN, modifier);
        } else if (event.button === 2) {
            screenSpaceEventHandler._rightMouseButtonDown = true;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.RIGHT_DOWN, modifier);
        }

        if (defined(action)) {
            action(scratchMouseDownEvent);
        }
        event.preventDefault();
    }

    var scratchMouseUpEvent = {
        position : new Cartesian2()
    };

    function handleMouseUp(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var action, clickAction;
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        if (event.button === 0) {
            screenSpaceEventHandler._leftMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);
        } else if (event.button === 1) {
            screenSpaceEventHandler._middleMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MIDDLE_UP, modifier);
            clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MIDDLE_CLICK, modifier);
        } else if (event.button === 2) {
            screenSpaceEventHandler._rightMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.RIGHT_UP, modifier);
            clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.RIGHT_CLICK, modifier);
        }

        var pos = getPosition(screenSpaceEventHandler, event, scratchMouseUpEvent.position);

        var xDiff = screenSpaceEventHandler._lastMousePosition.x - pos.x;
        var yDiff = screenSpaceEventHandler._lastMousePosition.y - pos.y;
        screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        if (defined(action)) {
            action(scratchMouseUpEvent);
        }

        if (defined(clickAction) && screenSpaceEventHandler._totalPixels < screenSpaceEventHandler._clickPixelTolerance) {
            clickAction(scratchMouseUpEvent);
        }
    }

    var scratchMouseMoveEvent = {
        startPosition : new Cartesian2(),
        endPosition : new Cartesian2()
    };

    function handleMouseMove(screenSpaceEventHandler, event) {
        var pos = getPosition(screenSpaceEventHandler, event, scratchMouseMoveEvent.endPosition);
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var xDiff = screenSpaceEventHandler._lastMousePosition.x - pos.x;
        var yDiff = screenSpaceEventHandler._lastMousePosition.y - pos.y;
        screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        Cartesian2.clone(screenSpaceEventHandler._lastMousePosition, scratchMouseMoveEvent.startPosition);

        var modifier = getModifier(event);
        var action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
        if (defined(action)) {
            action(scratchMouseMoveEvent);
        }

        Cartesian2.clone(scratchMouseMoveEvent.endPosition, screenSpaceEventHandler._lastMousePosition);

        if (screenSpaceEventHandler._leftMouseButtonDown || screenSpaceEventHandler._middleMouseButtonDown || screenSpaceEventHandler._rightMouseButtonDown) {
            event.preventDefault();
        }
    }

    var touchStartEvent = {
        position : new Cartesian2()
    };
    var touch2StartEvent = {
        position1 : new Cartesian2(),
        position2 : new Cartesian2()
    };

    function handleTouchStart(screenSpaceEventHandler, event) {
        var numberOfTouches = event.touches.length;

        screenSpaceEventHandler._seenAnyTouchEvents = true;
        var modifier = getModifier(event);
        var action;

        var pos = getPosition(screenSpaceEventHandler, event.touches[0], touchStartEvent.position);

        if (numberOfTouches === 1) {
            Cartesian2.clone(pos, screenSpaceEventHandler._lastMousePosition);
            screenSpaceEventHandler._totalPixels = 0;

            screenSpaceEventHandler._leftMouseButtonDown = true;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);

            if (defined(action)) {
                action(touchStartEvent);
            }
            event.preventDefault();
        } else if (screenSpaceEventHandler._leftMouseButtonDown) {
            // Release "mouse" without clicking, because we are adding more touches.
            screenSpaceEventHandler._leftMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            if (defined(action)) {
                action(touchStartEvent);
            }
        }

        if (numberOfTouches === 2) {
            screenSpaceEventHandler._isPinching = true;
            var pos2 = getPosition(screenSpaceEventHandler, event.touches[1], touch2StartEvent.position2);

            screenSpaceEventHandler._touchID1 = event.touches[0].identifier;
            screenSpaceEventHandler._touchID2 = event.touches[1].identifier;

            Cartesian2.clone(pos, screenSpaceEventHandler._lastMousePosition);
            Cartesian2.clone(pos, touch2StartEvent.position1);
            Cartesian2.clone(pos2, screenSpaceEventHandler._lastTouch2);

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_START, modifier);
            if (defined(action)) {
                action(touch2StartEvent);
            }
        } else if (screenSpaceEventHandler._isPinching) {
            screenSpaceEventHandler._isPinching = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_END, modifier);
            if (defined(action)) {
                action();
            }
        }
    }

    var touchEndEvent = {
        position : new Cartesian2()
    };

    function handleTouchEnd(screenSpaceEventHandler, event) {
        var numberOfTouches = event.touches.length;
        var numberOfChangedTouches = event.changedTouches.length;
        var modifier = getModifier(event);
        var action;
        var clickAction;

        if (screenSpaceEventHandler._leftMouseButtonDown) {
            screenSpaceEventHandler._leftMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);

            if (numberOfChangedTouches > 0) {
                var pos = getPosition(screenSpaceEventHandler, event.changedTouches[0], touchEndEvent.position);

                var xDiff = screenSpaceEventHandler._lastMousePosition.x - pos.x;
                var yDiff = screenSpaceEventHandler._lastMousePosition.y - pos.y;
                screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

                if (defined(action)) {
                    action(touchEndEvent);
                }

                if (defined(clickAction) && screenSpaceEventHandler._totalPixels < screenSpaceEventHandler._clickPixelTolerance) {
                    clickAction(touchEndEvent);
                }
            }
        }

        if (screenSpaceEventHandler._isPinching) {
            screenSpaceEventHandler._isPinching = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_END, modifier);
            if (action) {
                action();
            }
        }

        if (numberOfTouches === 1 || numberOfTouches === 2) {
            handleTouchStart(screenSpaceEventHandler, event);
        }
    }

    var touchMovementEvent = {
        startPosition : new Cartesian2(),
        endPosition : new Cartesian2()
    };
    var touchPinchMovementEvent = {
        distance : {
            startPosition : new Cartesian2(),
            endPosition : new Cartesian2()
        },
        angleAndHeight : {
            startPosition : new Cartesian2(),
            endPosition : new Cartesian2()
        }
    };

    function handleTouchMove(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var pos;
        var pos2;
        var action;

        if (screenSpaceEventHandler._leftMouseButtonDown && (event.touches.length === 1)) {
            pos = getPosition(screenSpaceEventHandler, event.touches[0], touchMovementEvent.endPosition);

            var xDiff = screenSpaceEventHandler._lastMousePosition.x - pos.x;
            var yDiff = screenSpaceEventHandler._lastMousePosition.y - pos.y;
            screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

            Cartesian2.clone(screenSpaceEventHandler._lastMousePosition, touchMovementEvent.startPosition);

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
            if (defined(action)) {
                action(touchMovementEvent);
            }

            Cartesian2.clone(touchMovementEvent.endPosition, screenSpaceEventHandler._lastMousePosition);

            if (screenSpaceEventHandler._leftMouseButtonDown || screenSpaceEventHandler._middleMouseButtonDown || screenSpaceEventHandler._rightMouseButtonDown) {
                event.preventDefault();
            }
        }

        if (screenSpaceEventHandler._isPinching && (event.touches.length === 2)) {
            // Check the touch identifier to make sure the order is correct.
            if (event.touches[0].identifier === screenSpaceEventHandler._touchID2) {
                pos = getPosition(screenSpaceEventHandler, event.touches[1], touchMovementEvent.startPosition);
                pos2 = getPosition(screenSpaceEventHandler, event.touches[0], touchMovementEvent.endPosition);
            } else {
                pos = getPosition(screenSpaceEventHandler, event.touches[0], touchMovementEvent.startPosition);
                pos2 = getPosition(screenSpaceEventHandler, event.touches[1], touchMovementEvent.endPosition);
            }

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_MOVE, modifier);
            if (defined(action)) {
                var dX = pos2.x - pos.x;
                var dY = pos2.y - pos.y;
                var dist = Math.sqrt(dX * dX + dY * dY) * 0.25;
                var prevDX = screenSpaceEventHandler._lastTouch2.x - screenSpaceEventHandler._lastMousePosition.x;
                var prevDY = screenSpaceEventHandler._lastTouch2.y - screenSpaceEventHandler._lastMousePosition.y;
                var prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY) * 0.25;
                var cY = (pos2.y + pos.y) * 0.125;
                var prevCY = (screenSpaceEventHandler._lastTouch2.y + screenSpaceEventHandler._lastMousePosition.y) * 0.125;
                var angle = Math.atan2(dY, dX);
                var prevAngle = Math.atan2(prevDY, prevDX);

                Cartesian2.fromElements(0.0, prevDist, touchPinchMovementEvent.distance.startPosition);
                Cartesian2.fromElements(0.0, dist, touchPinchMovementEvent.distance.endPosition);

                Cartesian2.fromElements(prevAngle, prevCY, touchPinchMovementEvent.angleAndHeight.startPosition);
                Cartesian2.fromElements(angle, cY, touchPinchMovementEvent.angleAndHeight.endPosition);

                action(touchPinchMovementEvent);
            }

            Cartesian2.clone(pos, screenSpaceEventHandler._lastMousePosition);
            Cartesian2.clone(pos2, screenSpaceEventHandler._lastTouch2);
        }
    }

    function handleMouseWheel(screenSpaceEventHandler, event) {
        // Some browsers use event.detail to count the number of clicks. The sign
        // of the integer is the direction the wheel is scrolled. In that case, convert
        // to the angle it was rotated in degrees.
        var delta = event.detail ? event.detail * -120 : event.wheelDelta;

        var modifier = getModifier(event);
        var type = ScreenSpaceEventType.WHEEL;
        var action = screenSpaceEventHandler.getInputAction(type, modifier);

        if (defined(action)) {
            event.preventDefault();
            action(delta);
        }
    }

    var mouseDbleClickEvent = {
        position : new Cartesian2()
    };

    function handleMouseDblClick(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var action;
        var pos = getPosition(screenSpaceEventHandler, event, mouseDbleClickEvent.position);

        if (event.button === 0) {
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK, modifier);
        } else if (event.button === 1) {
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, modifier);
        } else if (event.button === 2) {
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK, modifier);
        }

        if (defined(action)) {
            action(mouseDbleClickEvent);
        }
    }

    function register(screenSpaceEventHandler) {
        var that = screenSpaceEventHandler, useDoc = true;

        screenSpaceEventHandler._callbacks = [];
        if (defined(screenSpaceEventHandler._element.disableRootEvents)) {
            useDoc = false;
        }

        screenSpaceEventHandler._callbacks.push({
            name : 'mousedown',
            onDoc : false,
            action : function(e) {
                handleMouseDown(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'mouseup',
            onDoc : useDoc,
            action : function(e) {
                handleMouseUp(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'mousemove',
            onDoc : useDoc,
            action : function(e) {
                handleMouseMove(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'dblclick',
            onDoc : false,
            action : function(e) {
                handleMouseDblClick(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'touchstart',
            onDoc : false,
            action : function(e) {
                handleTouchStart(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'touchend',
            onDoc : useDoc,
            action : function(e) {
                handleTouchEnd(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'touchmove',
            onDoc : useDoc,
            action : function(e) {
                handleTouchMove(that, e);
            }
        });

        // Firefox calls the mouse wheel event 'DOMMouseScroll', all others use 'mousewheel'
        screenSpaceEventHandler._callbacks.push({
            name : 'mousewheel',
            onDoc : false,
            action : function(e) {
                handleMouseWheel(that, e);
            }
        });
        screenSpaceEventHandler._callbacks.push({
            name : 'DOMMouseScroll',
            onDoc : false,
            action : function(e) {
                handleMouseWheel(that, e);
            }
        });

        for (var i = 0; i < screenSpaceEventHandler._callbacks.length; i++) {
            var cback = screenSpaceEventHandler._callbacks[i];
            if (cback.onDoc) {
                document.addEventListener(cback.name, cback.action, false);
            } else {
                screenSpaceEventHandler._element.addEventListener(cback.name, cback.action, false);
            }
        }
    }

    ScreenSpaceEventHandler.prototype._unregister = function() {
        for (var i = 0; i < this._callbacks.length; i++) {
            var cback = this._callbacks[i];
            if (cback.onDoc) {
                document.removeEventListener(cback.name, cback.action, false);
            } else {
                this._element.removeEventListener(cback.name, cback.action, false);
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see ScreenSpaceEventHandler#destroy
     */
    ScreenSpaceEventHandler.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ScreenSpaceEventHandler#isDestroyed
     *
     * @example
     * handler = handler && handler.destroy();
     */
    ScreenSpaceEventHandler.prototype.destroy = function() {
        this._unregister();
        return destroyObject(this);
    };

    return ScreenSpaceEventHandler;
});