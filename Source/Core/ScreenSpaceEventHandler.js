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

    function getPosition(screenSpaceEventHandler, event, result) {
        var element = screenSpaceEventHandler._element;
        if (element === document) {
            result.x = event.clientX;
            result.y = event.clientY;
            return result;
        }

        var rect = element.getBoundingClientRect();
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

    var MouseButton = {
        LEFT : 0,
        MIDDLE : 1,
        RIGHT : 2
    };

    function registerListener(screenSpaceEventHandler, domType, element, callback) {
        var listener = function(e) {
            callback(screenSpaceEventHandler, e);
        };

        element.addEventListener(domType, listener, false);

        screenSpaceEventHandler._removalFunctions.push(function() {
            element.removeEventListener(domType, listener, false);
        });
    }

    function registerListeners(screenSpaceEventHandler) {
        var element = screenSpaceEventHandler._element;

        // some listeners may be registered on the document, so we still get events even after
        // leaving the bounds of element.
        // this is affected by the existence of an undocumented disableRootEvents property on element.
        var alternateElement = !defined(element.disableRootEvents) ? document : element;

        registerListener(screenSpaceEventHandler, 'mousedown', element, handleMouseDown);
        registerListener(screenSpaceEventHandler, 'mouseup', alternateElement, handleMouseUp);
        registerListener(screenSpaceEventHandler, 'mousemove', alternateElement, handleMouseMove);
        registerListener(screenSpaceEventHandler, 'dblclick', element, handleMouseDblClick);

        // detect available wheel event
        var wheelEvent;
        if ('onwheel' in element) {
            // spec event type
            wheelEvent = 'wheel';
        } else if (defined(document.onmousewheel)) {
            // legacy event type
            wheelEvent = 'mousewheel';
        } else {
            // older Firefox
            wheelEvent = 'DOMMouseScroll';
        }

        registerListener(screenSpaceEventHandler, wheelEvent, element, handleMouseWheel);

        registerListener(screenSpaceEventHandler, 'touchstart', element, handleTouchStart);
        registerListener(screenSpaceEventHandler, 'touchend', alternateElement, handleTouchEnd);
        registerListener(screenSpaceEventHandler, 'touchmove', alternateElement, handleTouchMove);
    }

    function unregisterListeners(screenSpaceEventHandler) {
        var removalFunctions = screenSpaceEventHandler._removalFunctions;
        for (var i = 0; i < removalFunctions.length; ++i) {
            removalFunctions[i]();
        }
    }

    var scratchMouseDownEvent = {
        position : new Cartesian2()
    };

    function handleMouseDown(screenSpaceEventHandler, event) {
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var button = event.button;
        screenSpaceEventHandler._buttonDown = button;

        var screenSpaceEventType;
        if (button === MouseButton.LEFT) {
            screenSpaceEventType = ScreenSpaceEventType.LEFT_DOWN;
        } else if (button === MouseButton.MIDDLE) {
            screenSpaceEventType = ScreenSpaceEventType.MIDDLE_DOWN;
        } else if (button === MouseButton.RIGHT) {
            screenSpaceEventType = ScreenSpaceEventType.RIGHT_DOWN;
        } else {
            return;
        }

        var modifier = getModifier(event);

        var action = screenSpaceEventHandler.getInputAction(screenSpaceEventType, modifier);

        if (!defined(action)) {
            return;
        }

        var position = getPosition(screenSpaceEventHandler, event, scratchMouseDownEvent.position);

        Cartesian2.clone(position, screenSpaceEventHandler._lastMousePosition);
        screenSpaceEventHandler._totalPixels = 0;

        action(scratchMouseDownEvent);

        event.preventDefault();
    }

    var scratchMouseUpEvent = {
        position : new Cartesian2()
    };

    function handleMouseUp(screenSpaceEventHandler, event) {
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var button = event.button;
        screenSpaceEventHandler._buttonDown = undefined;

        var screenSpaceEventType;
        var clickScreenSpaceEventType;
        if (button === MouseButton.LEFT) {
            screenSpaceEventType = ScreenSpaceEventType.LEFT_UP;
            clickScreenSpaceEventType = ScreenSpaceEventType.LEFT_CLICK;
        } else if (button === MouseButton.MIDDLE) {
            screenSpaceEventType = ScreenSpaceEventType.MIDDLE_UP;
            clickScreenSpaceEventType = ScreenSpaceEventType.MIDDLE_CLICK;
        } else if (button === MouseButton.RIGHT) {
            screenSpaceEventType = ScreenSpaceEventType.RIGHT_UP;
            clickScreenSpaceEventType = ScreenSpaceEventType.RIGHT_CLICK;
        } else {
            return;
        }

        var modifier = getModifier(event);

        var action = screenSpaceEventHandler.getInputAction(screenSpaceEventType, modifier);
        var clickAction = screenSpaceEventHandler.getInputAction(clickScreenSpaceEventType, modifier);

        if (!defined(action) && !defined(clickAction)) {
            return;
        }

        var position = getPosition(screenSpaceEventHandler, event, scratchMouseUpEvent.position);

        var lastPosition = screenSpaceEventHandler._lastMousePosition;
        var xDiff = lastPosition.x - position.x;
        var yDiff = lastPosition.y - position.y;
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
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var position = getPosition(screenSpaceEventHandler, event, scratchMouseMoveEvent.endPosition);

        var lastPosition = screenSpaceEventHandler._lastMousePosition;
        var xDiff = lastPosition.x - position.x;
        var yDiff = lastPosition.y - position.y;
        screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        Cartesian2.clone(lastPosition, scratchMouseMoveEvent.startPosition);
        Cartesian2.clone(position, screenSpaceEventHandler._lastMousePosition);

        var modifier = getModifier(event);
        var action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
        if (defined(action)) {
            action(scratchMouseMoveEvent);
        }

        if (defined(screenSpaceEventHandler._buttonDown)) {
            event.preventDefault();
        }
    }

    var mouseDblClickEvent = {
        position : new Cartesian2()
    };

    function handleMouseDblClick(screenSpaceEventHandler, event) {
        var button = event.button;

        var screenSpaceEventType;
        if (button === MouseButton.LEFT) {
            screenSpaceEventType = ScreenSpaceEventType.LEFT_DOUBLE_CLICK;
        } else if (button === MouseButton.MIDDLE) {
            screenSpaceEventType = ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK;
        } else if (button === MouseButton.RIGHT) {
            screenSpaceEventType = ScreenSpaceEventType.RIGHT_DOUBLE_CLICK;
        } else {
            return;
        }

        var modifier = getModifier(event);

        var action = screenSpaceEventHandler.getInputAction(screenSpaceEventType, modifier);

        if (!defined(action)) {
            return;
        }

        getPosition(screenSpaceEventHandler, event, mouseDblClickEvent.position);

        action(mouseDblClickEvent);
    }

    function handleMouseWheel(screenSpaceEventHandler, event) {
        // currently this event exposes the delta value in terms of
        // the obsolete mousewheel event type.  so, for now, we adapt the other
        // values to that scheme.
        var delta;

        // standard wheel event uses deltaY.  sign is opposite wheelDelta.
        // deltaMode indicates what unit it is in.
        if (defined(event.deltaY)) {
            var deltaMode = event.deltaMode;
            if (deltaMode === event.DOM_DELTA_PIXEL) {
                delta = -event.deltaY;
            } else if (deltaMode === event.DOM_DELTA_LINE) {
                delta = -event.deltaY * 40;
            } else {
                // DOM_DELTA_PAGE
                delta = -event.deltaY * 120;
            }
        } else if (event.detail > 0) {
            // old Firefox versions use event.detail to count the number of clicks. The sign
            // of the integer is the direction the wheel is scrolled.
            delta = event.detail * -120;
        } else {
            delta = event.wheelDelta;
        }

        if (!defined(delta)) {
            return;
        }

        var modifier = getModifier(event);
        var action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.WHEEL, modifier);

        if (!defined(action)) {
            return;
        }

        action(delta);

        event.preventDefault();
    }

    var touchStartEvent = {
        position : new Cartesian2()
    };
    var touch2StartEvent = {
        position1 : new Cartesian2(),
        position2 : new Cartesian2()
    };

    function handleTouchStart(screenSpaceEventHandler, event) {
        screenSpaceEventHandler._seenAnyTouchEvents = true;

        var modifier = getModifier(event);
        var action;

        var touch1 = event.touches[0];
        var position = getPosition(screenSpaceEventHandler, touch1, touchStartEvent.position);

        var numberOfTouches = event.touches.length;
        if (numberOfTouches === 1) {
            Cartesian2.clone(position, screenSpaceEventHandler._lastMousePosition);
            screenSpaceEventHandler._totalPixels = 0;

            screenSpaceEventHandler._buttonDown = MouseButton.LEFT;

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);

            if (defined(action)) {
                action(touchStartEvent);
            }

            event.preventDefault();
        } else if (screenSpaceEventHandler._buttonDown === MouseButton.LEFT) {
            // Release "mouse" without clicking, because we are adding more touches.
            screenSpaceEventHandler._buttonDown = undefined;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            if (defined(action)) {
                action(touchStartEvent);
            }
        }

        if (numberOfTouches === 2) {
            screenSpaceEventHandler._isPinching = true;

            var touch2 = event.touches[1];

            Cartesian2.clone(position, touch2StartEvent.position1);
            var position2 = getPosition(screenSpaceEventHandler, touch2, touch2StartEvent.position2);

            screenSpaceEventHandler._touchID1 = touch1.identifier;
            screenSpaceEventHandler._touchID2 = touch2.identifier;

            Cartesian2.clone(position, screenSpaceEventHandler._lastMousePosition);
            Cartesian2.clone(position2, screenSpaceEventHandler._lastTouch2);

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
        var modifier = getModifier(event);

        var action;
        var clickAction;

        if (screenSpaceEventHandler._buttonDown === MouseButton.LEFT) {
            screenSpaceEventHandler._buttonDown = undefined;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);

            var numberOfChangedTouches = event.changedTouches.length;
            if (numberOfChangedTouches > 0) {
                var position = getPosition(screenSpaceEventHandler, event.changedTouches[0], touchEndEvent.position);

                var lastPosition = screenSpaceEventHandler._lastMousePosition;
                var xDiff = lastPosition.x - position.x;
                var yDiff = lastPosition.y - position.y;
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

        var numberOfTouches = event.touches.length;
        if (numberOfTouches === 1 || numberOfTouches === 2) {
            handleTouchStart(screenSpaceEventHandler, event);
        }
    }

    var touchMovementEvent = {
        startPosition : new Cartesian2(),
        endPosition : new Cartesian2()
    };
    var scratchTouchPinch = new Cartesian2();
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

        var touch1 = event.touches[0];
        var position = getPosition(screenSpaceEventHandler, touch1, touchMovementEvent.endPosition);
        var action;
        var lastPosition = screenSpaceEventHandler._lastMousePosition;

        var numberOfTouches = event.touches.length;

        if (screenSpaceEventHandler._buttonDown === MouseButton.LEFT && numberOfTouches === 1) {
            var xDiff = lastPosition.x - position.x;
            var yDiff = lastPosition.y - position.y;
            screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

            Cartesian2.clone(lastPosition, touchMovementEvent.startPosition);

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
            if (defined(action)) {
                action(touchMovementEvent);
            }

            Cartesian2.clone(position, lastPosition);

            event.preventDefault();
        } else if (screenSpaceEventHandler._isPinching && numberOfTouches === 2) {
            var touch2 = event.touches[1];

            var position2 = getPosition(screenSpaceEventHandler, touch2, scratchTouchPinch);

            // Check the touch identifier to make sure the order is correct.
            if (touch1.identifier === screenSpaceEventHandler._touchID2) {
                var tmpPosition = position;
                position = position2;
                position2 = tmpPosition;
            }

            var lastTouch2 = screenSpaceEventHandler._lastTouch2;

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_MOVE, modifier);
            if (defined(action)) {
                var dX = position2.x - position.x;
                var dY = position2.y - position.y;
                var dist = Math.sqrt(dX * dX + dY * dY) * 0.25;

                var prevDX = lastTouch2.x - lastPosition.x;
                var prevDY = lastTouch2.y - lastPosition.y;
                var prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY) * 0.25;

                var cY = (position2.y + position.y) * 0.125;
                var prevCY = (lastTouch2.y + lastPosition.y) * 0.125;
                var angle = Math.atan2(dY, dX);
                var prevAngle = Math.atan2(prevDY, prevDX);

                Cartesian2.fromElements(0.0, prevDist, touchPinchMovementEvent.distance.startPosition);
                Cartesian2.fromElements(0.0, dist, touchPinchMovementEvent.distance.endPosition);

                Cartesian2.fromElements(prevAngle, prevCY, touchPinchMovementEvent.angleAndHeight.startPosition);
                Cartesian2.fromElements(angle, cY, touchPinchMovementEvent.angleAndHeight.endPosition);

                action(touchPinchMovementEvent);
            }

            Cartesian2.clone(position, lastPosition);
            Cartesian2.clone(position2, lastTouch2);
        }
    }

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
        this._buttonDown = undefined;
        this._isPinching = false;
        this._seenAnyTouchEvents = false;
        this._lastMousePosition = new Cartesian2();
        this._lastTouch2 = new Cartesian2();
        this._totalPixels = 0;
        this._touchID1 = 0;
        this._touchID2 = 0;
        this._removalFunctions = [];

        // TODO: Revisit when doing mobile development. May need to be configurable
        // or determined based on the platform?
        this._clickPixelTolerance = 5;

        this._element = defaultValue(element, document);

        registerListeners(this);
    };

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
        unregisterListeners(this);

        return destroyObject(this);
    };

    return ScreenSpaceEventHandler;
});