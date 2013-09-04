/*global define*/
define([
        './DeveloperError',
        './defined',
        './destroyObject',
        './Cartesian2',
        './ScreenSpaceEventType',
        './KeyboardEventModifier',
        './defaultValue'
    ], function(
        DeveloperError,
        defined,
        destroyObject,
        Cartesian2,
        ScreenSpaceEventType,
        KeyboardEventModifier,
        defaultValue) {
    "use strict";

    /**
     * Handles user input events. Custom functions can be added to be executed on
     * when the user enters input.
     *
     * @alias ScreenSpaceEventHandler
     *
     * @param {DOC_TBA} element The element to add events to. Defaults to document.
     * @constructor
     */
    var ScreenSpaceEventHandler = function(element) {
        this._mouseEvents = {};
        for ( var button in ScreenSpaceEventType) {
            if (ScreenSpaceEventType.hasOwnProperty(button)) {
                this._mouseEvents[button] = undefined;
            }
        }

        this._modifiedMouseEvents = {};
        for ( var modifier in KeyboardEventModifier) {
            if (KeyboardEventModifier.hasOwnProperty(modifier)) {
                this._modifiedMouseEvents[modifier] = {};
                for (button in ScreenSpaceEventType) {
                    if (ScreenSpaceEventType.hasOwnProperty(button)) {
                        this._modifiedMouseEvents[modifier][button] = undefined;
                    }
                }
            }
        }

        this._leftMouseButtonDown = false;
        this._middleMouseButtonDown = false;
        this._rightMouseButtonDown = false;
        this._isPinching = false;
        this._seenAnyTouchEvents = false;
        this._lastMouseX = 0;
        this._lastMouseY = 0;
        this._lastTouch2X = 0;
        this._lastTouch2Y = 0;
        this._totalPixels = 0;
        this._touchID1 = 0;
        this._touchID2 = 0;

        // TODO: Revisit when doing mobile development. May need to be configurable
        // or determined based on the platform?
        this._clickPixelTolerance = 5;

        this._element = defaultValue(element, document);

        register(this);
    };

    function getPosition(screenSpaceEventHandler, event) {
        if (screenSpaceEventHandler._element === document) {
            return {
                x : event.clientX,
                y : event.clientY
            };
        }

        var rect = screenSpaceEventHandler._element.getBoundingClientRect();
        return {
            x : event.clientX - rect.left,
            y : event.clientY - rect.top
        };
    }

    /**
     * Set a function to be executed on an input event.
     *
     * @memberof ScreenSpaceEventHandler
     *
     * @param {Function} action Function to be executed when the input event occurs.
     * @param {Enumeration} type The ScreenSpaceEventType of input event.
     * @param {Enumeration} modifier A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @exception {DeveloperError} action is required.
     * @exception {DeveloperError} type is required.
     *
     * @see ScreenSpaceEventHandler#getInputAction
     * @see ScreenSpaceEventHandler#removeInputAction
     */
    ScreenSpaceEventHandler.prototype.setInputAction = function(action, type, modifier) {
        if (!defined(action)) {
            throw new DeveloperError('action is required.');
        }

        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var mouseEvents;
        if (defined(modifier) && defined(modifier.name)) {
            mouseEvents = this._modifiedMouseEvents[modifier.name];
        } else {
            mouseEvents = this._mouseEvents;
        }

        if (defined(type) && defined(type.name) && defined(mouseEvents)) {
            mouseEvents[type.name] = action;
        }
    };

    /**
     * Returns the function to be executed on an input event.
     *
     * @memberof ScreenSpaceEventHandler
     *
     * @param {Enumeration} type The ScreenSpaceEventType of input event.
     * @param {Enumeration} modifier A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @exception {DeveloperError} type is required.
     *
     * @see ScreenSpaceEventHandler#setInputAction
     * @see ScreenSpaceEventHandler#removeInputAction
     */
    ScreenSpaceEventHandler.prototype.getInputAction = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var mouseEvents;
        if (defined(modifier) && defined(modifier.name)) {
            mouseEvents = this._modifiedMouseEvents[modifier.name];
        } else {
            mouseEvents = this._mouseEvents;
        }

        if (defined(type) && defined(type.name) && defined(mouseEvents)) {
            return mouseEvents[type.name];
        }

        return undefined;
    };

    /**
     * Removes the function to be executed on an input event.
     *
     * @memberof ScreenSpaceEventHandler
     *
     * @param {Enumeration} type The ScreenSpaceEventType of input event.
     * @param {Enumeration} modifier A KeyboardEventModifier key that is held when a <code>type</code>
     * event occurs.
     *
     * @exception {DeveloperError} type is required.
     *
     * @see ScreenSpaceEventHandler#getInputAction
     * @see ScreenSpaceEventHandler#setInputAction
     */
    ScreenSpaceEventHandler.prototype.removeInputAction = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var mouseEvents;
        if (defined(modifier) && defined(modifier.name)) {
            mouseEvents = this._modifiedMouseEvents[modifier.name];
        } else {
            mouseEvents = this._mouseEvents;
        }

        if (defined(type) && defined(type.name) && defined(mouseEvents) && defined(mouseEvents[type.name])) {
            delete mouseEvents[type.name];
        }
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

    function handleMouseDown(screenSpaceEventHandler, event) {
        var pos = getPosition(screenSpaceEventHandler, event);
        screenSpaceEventHandler._lastMouseX = pos.x;
        screenSpaceEventHandler._lastMouseY = pos.y;
        screenSpaceEventHandler._totalPixels = 0;
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var modifier = getModifier(event);
        var action;

        // IE_TODO:  On some versions of IE, the left-button is 1, and the right-button is 4.
        // See: http://www.unixpapa.com/js/mouse.html
        // This is not the case in Chrome Frame, so we are OK for now, but are there
        // constants somewhere?
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
            action({
                position : new Cartesian2(pos.x, pos.y)
            });
        }
        event.preventDefault();
    }

    function handleMouseUp(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var action, clickAction;
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        // IE_TODO:  On some versions of IE, the left-button is 1, and the right-button is 4.
        // See: http://www.unixpapa.com/js/mouse.html
        // This is not the case in Chrome Frame, so we are OK for now, but are there
        // constants somewhere?
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

        var pos = getPosition(screenSpaceEventHandler, event);

        var xDiff = screenSpaceEventHandler._lastMouseX - pos.x;
        var yDiff = screenSpaceEventHandler._lastMouseY - pos.y;
        screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        if (defined(action)) {
            action({
                position : new Cartesian2(pos.x, pos.y)
            });
        }

        if (defined(clickAction) && screenSpaceEventHandler._totalPixels < screenSpaceEventHandler._clickPixelTolerance) {
            clickAction({
                position : new Cartesian2(pos.x, pos.y)
            });
        }
    }

    function handleMouseMove(screenSpaceEventHandler, event) {
        var pos = getPosition(screenSpaceEventHandler, event);
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var xDiff = screenSpaceEventHandler._lastMouseX - pos.x;
        var yDiff = screenSpaceEventHandler._lastMouseY - pos.y;
        screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        var movement = {
            startPosition : new Cartesian2(screenSpaceEventHandler._lastMouseX, screenSpaceEventHandler._lastMouseY),
            endPosition : new Cartesian2(pos.x, pos.y),
            motion : new Cartesian2()
        };

        var modifier = getModifier(event);
        var action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
        if (defined(action)) {
            action(movement);
        }

        screenSpaceEventHandler._lastMouseX = movement.endPosition.x;
        screenSpaceEventHandler._lastMouseY = movement.endPosition.y;

        if (screenSpaceEventHandler._leftMouseButtonDown || screenSpaceEventHandler._middleMouseButtonDown || screenSpaceEventHandler._rightMouseButtonDown) {
            event.preventDefault();
        }
    }

    function handleTouchStart(screenSpaceEventHandler, event) {
        var pos, pos2, numberOfTouches = event.touches.length;
        screenSpaceEventHandler._seenAnyTouchEvents = true;
        var modifier = getModifier(event);
        var action;

        pos = getPosition(screenSpaceEventHandler, event.touches[0]);

        if (numberOfTouches === 1) {
            screenSpaceEventHandler._lastMouseX = pos.x;
            screenSpaceEventHandler._lastMouseY = pos.y;
            screenSpaceEventHandler._totalPixels = 0;

            screenSpaceEventHandler._leftMouseButtonDown = true;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);

            if (defined(action)) {
                action({
                    position : new Cartesian2(pos.x, pos.y)
                });
            }
            event.preventDefault();
        } else if (screenSpaceEventHandler._leftMouseButtonDown) {
            // Release "mouse" without clicking, because we are adding more touches.
            screenSpaceEventHandler._leftMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            if (defined(action)) {
                action({
                    position : new Cartesian2(pos.x, pos.y)
                });
            }
        }

        if (numberOfTouches === 2) {
            screenSpaceEventHandler._isPinching = true;
            pos2 = getPosition(screenSpaceEventHandler, event.touches[1]);
            screenSpaceEventHandler._touchID1 = event.touches[0].identifier;
            screenSpaceEventHandler._touchID2 = event.touches[1].identifier;
            screenSpaceEventHandler._lastMouseX = pos.x;
            screenSpaceEventHandler._lastMouseY = pos.y;
            screenSpaceEventHandler._lastTouch2X = pos2.x;
            screenSpaceEventHandler._lastTouch2Y = pos2.y;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_START, modifier);
            if (defined(action)) {
                action({
                    position1 : new Cartesian2(pos.x, pos.y),
                    position2 : new Cartesian2(pos2.x, pos2.y)
                });
            }
        } else if (screenSpaceEventHandler._isPinching) {
            screenSpaceEventHandler._isPinching = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_END, modifier);
            if (defined(action)) {
                action();
            }
        }
    }

    function handleTouchEnd(screenSpaceEventHandler, event) {
        var numberOfTouches = event.touches.length;
        var numberOfChangedTouches = event.changedTouches.length;
        var modifier = getModifier(event);
        var action, clickAction;

        if (screenSpaceEventHandler._leftMouseButtonDown) {
            screenSpaceEventHandler._leftMouseButtonDown = false;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);

            if (numberOfChangedTouches > 0) {
                var pos = getPosition(screenSpaceEventHandler, event.changedTouches[0]);

                var xDiff = screenSpaceEventHandler._lastMouseX - pos.x;
                var yDiff = screenSpaceEventHandler._lastMouseY - pos.y;
                screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

                if (defined(action)) {
                    action({
                        position : new Cartesian2(pos.x, pos.y)
                    });
                }

                if (defined(clickAction) && screenSpaceEventHandler._totalPixels < screenSpaceEventHandler._clickPixelTolerance) {
                    clickAction({
                        position : new Cartesian2(pos.x, pos.y)
                    });
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

    function handleTouchMove(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var pos, pos2, action, movement;

        if (screenSpaceEventHandler._leftMouseButtonDown && (event.touches.length === 1)) {
            pos = getPosition(screenSpaceEventHandler, event.touches[0]);

            var xDiff = screenSpaceEventHandler._lastMouseX - pos.x;
            var yDiff = screenSpaceEventHandler._lastMouseY - pos.y;
            screenSpaceEventHandler._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

            movement = {
                startPosition : new Cartesian2(screenSpaceEventHandler._lastMouseX, screenSpaceEventHandler._lastMouseY),
                endPosition : new Cartesian2(pos.x, pos.y),
                motion : new Cartesian2()
            };

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
            if (defined(action)) {
                action(movement);
            }

            screenSpaceEventHandler._lastMouseX = movement.endPosition.x;
            screenSpaceEventHandler._lastMouseY = movement.endPosition.y;

            if (screenSpaceEventHandler._leftMouseButtonDown || screenSpaceEventHandler._middleMouseButtonDown || screenSpaceEventHandler._rightMouseButtonDown) {
                event.preventDefault();
            }
        }

        if (screenSpaceEventHandler._isPinching && (event.touches.length === 2)) {
            // Check the touch identifier to make sure the order is correct.
            if (event.touches[0].identifier === screenSpaceEventHandler._touchID2) {
                pos = getPosition(screenSpaceEventHandler, event.touches[1]);
                pos2 = getPosition(screenSpaceEventHandler, event.touches[0]);
            } else {
                pos = getPosition(screenSpaceEventHandler, event.touches[0]);
                pos2 = getPosition(screenSpaceEventHandler, event.touches[1]);
            }

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_MOVE, modifier);
            if (defined(action)) {
                var dX = pos2.x - pos.x;
                var dY = pos2.y - pos.y;
                var dist = Math.sqrt(dX * dX + dY * dY) * 0.25;
                var prevDX = screenSpaceEventHandler._lastTouch2X - screenSpaceEventHandler._lastMouseX;
                var prevDY = screenSpaceEventHandler._lastTouch2Y - screenSpaceEventHandler._lastMouseY;
                var prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY) * 0.25;
                var cY = (pos2.y + pos.y) * 0.125;
                var prevCY = (screenSpaceEventHandler._lastTouch2Y + screenSpaceEventHandler._lastMouseY) * 0.125;
                var angle = Math.atan2(dY, dX);
                var prevAngle = Math.atan2(prevDY, prevDX);
                movement = {
                    'distance' : {
                        startPosition : new Cartesian2(0, prevDist),
                        endPosition : new Cartesian2(0, dist),
                        motion : new Cartesian2()
                    },
                    'angleAndHeight' : {
                        startPosition : new Cartesian2(prevAngle, prevCY),
                        endPosition : new Cartesian2(angle, cY),
                        motion : new Cartesian2()
                    }
                };
                action(movement);
            }

            screenSpaceEventHandler._lastMouseX = pos.x;
            screenSpaceEventHandler._lastMouseY = pos.y;
            screenSpaceEventHandler._lastTouch2X = pos2.x;
            screenSpaceEventHandler._lastTouch2Y = pos2.y;
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

    function handleMouseDblClick(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var action;
        var pos = getPosition(screenSpaceEventHandler, event);

        // IE_TODO:  On some versions of IE, the left-button is 1, and the right-button is 4.
        // See: http://www.unixpapa.com/js/mouse.html
        // This is not the case in Chrome Frame, so we are OK for now, but are there
        // constants somewhere?
        if (event.button === 0) {
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK, modifier);
        } else if (event.button === 1) {
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, modifier);
        } else if (event.button === 2) {
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK, modifier);
        }

        if (defined(action)) {
            action({
                position : new Cartesian2(pos.x, pos.y)
            });
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

        for ( var i = 0; i < screenSpaceEventHandler._callbacks.length; i++) {
            var cback = screenSpaceEventHandler._callbacks[i];
            if (cback.onDoc) {
                document.addEventListener(cback.name, cback.action, false);
            } else {
                screenSpaceEventHandler._element.addEventListener(cback.name, cback.action, false);
            }
        }
    }

    ScreenSpaceEventHandler.prototype._unregister = function() {
        for ( var i = 0; i < this._callbacks.length; i++) {
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
     * @memberof ScreenSpaceEventHandler
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
     * @memberof ScreenSpaceEventHandler
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
