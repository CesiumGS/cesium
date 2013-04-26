/*global define*/
define([
        './DeveloperError',
        './destroyObject',
        './Cartesian2',
        './JulianDate',
        './ScreenSpaceEventType',
        './KeyboardEventModifier',
        './defaultValue'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian2,
        JulianDate,
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

        this._register();
    };

    ScreenSpaceEventHandler.prototype._getPosition = function(event) {
        if (this._element === document) {
            return {
                x : event.clientX,
                y : event.clientY
            };
        }

        var rect = this._element.getBoundingClientRect();
        return {
            x : event.clientX - rect.left,
            y : event.clientY - rect.top
        };
    };

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
        if (typeof action === 'undefined') {
            throw new DeveloperError('action is required.');
        }

        if (typeof type === 'undefined') {
            throw new DeveloperError('type is required.');
        }

        var mouseEvents;
        if (typeof modifier !== 'undefined' && typeof modifier.name !== 'undefined') {
            mouseEvents = this._modifiedMouseEvents[modifier.name];
        } else {
            mouseEvents = this._mouseEvents;
        }

        if (typeof type !== 'undefined' && typeof type.name !== 'undefined' && typeof mouseEvents !== 'undefined') {
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
        if (typeof type === 'undefined') {
            throw new DeveloperError('type is required.');
        }

        var mouseEvents;
        if (typeof modifier !== 'undefined' && typeof modifier.name !== 'undefined') {
            mouseEvents = this._modifiedMouseEvents[modifier.name];
        } else {
            mouseEvents = this._mouseEvents;
        }

        if (typeof type !== 'undefined' && typeof type.name !== 'undefined' && typeof mouseEvents !== 'undefined') {
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
        if (typeof type === 'undefined') {
            throw new DeveloperError('type is required.');
        }

        var mouseEvents;
        if (typeof modifier !== 'undefined' && typeof modifier.name !== 'undefined') {
            mouseEvents = this._modifiedMouseEvents[modifier.name];
        } else {
            mouseEvents = this._mouseEvents;
        }

        if (typeof type !== 'undefined' && typeof type.name !== 'undefined' && typeof mouseEvents !== 'undefined' && typeof mouseEvents[type.name] !== 'undefined') {
            delete mouseEvents[type.name];
        }
    };

    ScreenSpaceEventHandler.prototype._getModifier = function(event) {
        if (event.shiftKey) {
            return KeyboardEventModifier.SHIFT;
        } else if (event.ctrlKey) {
            return KeyboardEventModifier.CTRL;
        } else if (event.altKey) {
            return KeyboardEventModifier.ALT;
        }

        return undefined;
    };

    ScreenSpaceEventHandler.prototype._handleMouseDown = function(event) {
        var pos = this._getPosition(event);
        this._lastMouseX = pos.x;
        this._lastMouseY = pos.y;
        this._totalPixels = 0;
        if (this._seenAnyTouchEvents) {
            return;
        }

        var modifier = this._getModifier(event);
        var action;

        // IE_TODO:  On some versions of IE, the left-button is 1, and the right-button is 4.
        // See: http://www.unixpapa.com/js/mouse.html
        // This is not the case in Chrome Frame, so we are OK for now, but are there
        // constants somewhere?
        if (event.button === 0) {
            this._leftMouseButtonDown = true;
            action = this.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);
        } else if (event.button === 1) {
            this._middleMouseButtonDown = true;
            action = this.getInputAction(ScreenSpaceEventType.MIDDLE_DOWN, modifier);
        } else if (event.button === 2) {
            this._rightMouseButtonDown = true;
            action = this.getInputAction(ScreenSpaceEventType.RIGHT_DOWN, modifier);
        }

        if (typeof action !== 'undefined') {
            action({
                position : new Cartesian2(pos.x, pos.y)
            });
        }
        event.preventDefault();
    };

    ScreenSpaceEventHandler.prototype._handleMouseUp = function(event) {
        var modifier = this._getModifier(event);
        var action, clickAction;
        if (this._seenAnyTouchEvents) {
            return;
        }

        // IE_TODO:  On some versions of IE, the left-button is 1, and the right-button is 4.
        // See: http://www.unixpapa.com/js/mouse.html
        // This is not the case in Chrome Frame, so we are OK for now, but are there
        // constants somewhere?
        if (event.button === 0) {
            this._leftMouseButtonDown = false;
            action = this.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            clickAction = this.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);
        } else if (event.button === 1) {
            this._middleMouseButtonDown = false;
            action = this.getInputAction(ScreenSpaceEventType.MIDDLE_UP, modifier);
            clickAction = this.getInputAction(ScreenSpaceEventType.MIDDLE_CLICK, modifier);
        } else if (event.button === 2) {
            this._rightMouseButtonDown = false;
            action = this.getInputAction(ScreenSpaceEventType.RIGHT_UP, modifier);
            clickAction = this.getInputAction(ScreenSpaceEventType.RIGHT_CLICK, modifier);
        }

        var pos = this._getPosition(event);

        var xDiff = this._lastMouseX - pos.x;
        var yDiff = this._lastMouseY - pos.y;
        this._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        if (typeof action !== 'undefined') {
            action({
                position : new Cartesian2(pos.x, pos.y)
            });
        }

        if (typeof clickAction !== 'undefined' && this._totalPixels < this._clickPixelTolerance) {
            clickAction({
                position : new Cartesian2(pos.x, pos.y)
            });
        }
    };

    ScreenSpaceEventHandler.prototype._handleMouseMove = function(event) {
        var pos = this._getPosition(event);
        if (this._seenAnyTouchEvents) {
            return;
        }

        var xDiff = this._lastMouseX - pos.x;
        var yDiff = this._lastMouseY - pos.y;
        this._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

        var movement = {
            startPosition : new Cartesian2(this._lastMouseX, this._lastMouseY),
            endPosition : new Cartesian2(pos.x, pos.y),
            motion : new Cartesian2()
        };

        var modifier = this._getModifier(event);
        var action = this.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
        if (typeof action !== 'undefined') {
            action(movement);
        }

        this._lastMouseX = movement.endPosition.x;
        this._lastMouseY = movement.endPosition.y;

        if (this._leftMouseButtonDown || this._middleMouseButtonDown || this._rightMouseButtonDown) {
            event.preventDefault();
        }
    };

    ScreenSpaceEventHandler.prototype._handleTouchStart = function(event) {
        var pos, pos2, numberOfTouches = event.touches.length;
        this._seenAnyTouchEvents = true;
        var modifier = this._getModifier(event);
        var action;

        pos = this._getPosition(event.touches[0]);

        if (numberOfTouches === 1) {
            this._lastMouseX = pos.x;
            this._lastMouseY = pos.y;
            this._totalPixels = 0;

            this._leftMouseButtonDown = true;
            action = this.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);

            if (typeof action !== 'undefined') {
                action({
                    position : new Cartesian2(pos.x, pos.y)
                });
            }
            event.preventDefault();
        } else if (this._leftMouseButtonDown) {
            // Release "mouse" without clicking, because we are adding more touches.
            this._leftMouseButtonDown = false;
            action = this.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            if (typeof action !== 'undefined') {
                action({
                    position : new Cartesian2(pos.x, pos.y)
                });
            }
        }

        if (numberOfTouches === 2) {
            this._isPinching = true;
            pos2 = this._getPosition(event.touches[1]);
            this._touchID1 = event.touches[0].identifier;
            this._touchID2 = event.touches[1].identifier;
            this._lastMouseX = pos.x;
            this._lastMouseY = pos.y;
            this._lastTouch2X = pos2.x;
            this._lastTouch2Y = pos2.y;
            action = this.getInputAction(ScreenSpaceEventType.PINCH_START, modifier);
            if (typeof action !== 'undefined') {
                action({
                    position1 : new Cartesian2(pos.x, pos.y),
                    position2 : new Cartesian2(pos2.x, pos2.y)
                });
            }
        } else if (this._isPinching) {
            this._isPinching = false;
            action = this.getInputAction(ScreenSpaceEventType.PINCH_END, modifier);
            if (typeof action !== 'undefined') {
                action();
            }
        }
    };

    ScreenSpaceEventHandler.prototype._handleTouchEnd = function(event) {
        var numberOfTouches = event.touches.length;
        var numberOfChangedTouches = event.changedTouches.length;
        var modifier = this._getModifier(event);
        var action, clickAction;

        if (this._leftMouseButtonDown) {
            this._leftMouseButtonDown = false;
            action = this.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);
            clickAction = this.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);

            if (numberOfChangedTouches > 0) {
                var pos = this._getPosition(event.changedTouches[0]);

                var xDiff = this._lastMouseX - pos.x;
                var yDiff = this._lastMouseY - pos.y;
                this._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

                if (typeof action !== 'undefined') {
                    action({
                        position : new Cartesian2(pos.x, pos.y)
                    });
                }

                if (typeof clickAction !== 'undefined' && this._totalPixels < this._clickPixelTolerance) {
                    clickAction({
                        position : new Cartesian2(pos.x, pos.y)
                    });
                }
            }
        }

        if (this._isPinching) {
            this._isPinching = false;
            action = this.getInputAction(ScreenSpaceEventType.PINCH_END, modifier);
            if (action) {
                action();
            }
        }

        if (numberOfTouches === 1 || numberOfTouches === 2) {
            this._handleTouchStart(event);
        }
    };

    ScreenSpaceEventHandler.prototype._handleTouchMove = function(event) {
        var modifier = this._getModifier(event);
        var pos, pos2, action, movement;

        if (this._leftMouseButtonDown && (event.touches.length === 1)) {
            pos = this._getPosition(event.touches[0]);

            var xDiff = this._lastMouseX - pos.x;
            var yDiff = this._lastMouseY - pos.y;
            this._totalPixels += Math.sqrt(xDiff * xDiff + yDiff * yDiff);

            movement = {
                startPosition : new Cartesian2(this._lastMouseX, this._lastMouseY),
                endPosition : new Cartesian2(pos.x, pos.y),
                motion : new Cartesian2()
            };

            action = this.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);
            if (typeof action !== 'undefined') {
                action(movement);
            }

            this._lastMouseX = movement.endPosition.x;
            this._lastMouseY = movement.endPosition.y;

            if (this._leftMouseButtonDown || this._middleMouseButtonDown || this._rightMouseButtonDown) {
                event.preventDefault();
            }
        }

        if (this._isPinching && (event.touches.length === 2)) {
            // Check the touch identifier to make sure the order is correct.
            if (event.touches[0].identifier === this._touchID2) {
                pos = this._getPosition(event.touches[1]);
                pos2 = this._getPosition(event.touches[0]);
            } else {
                pos = this._getPosition(event.touches[0]);
                pos2 = this._getPosition(event.touches[1]);
            }

            action = this.getInputAction(ScreenSpaceEventType.PINCH_MOVE, modifier);
            if (typeof action !== 'undefined') {
                var dX = pos2.x - pos.x;
                var dY = pos2.y - pos.y;
                var dist = Math.sqrt(dX * dX + dY * dY) * 0.25;
                var prevDX = this._lastTouch2X - this._lastMouseX;
                var prevDY = this._lastTouch2Y - this._lastMouseY;
                var prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY) * 0.25;
                var cY = (pos2.y + pos.y) * 0.125;
                var prevCY = (this._lastTouch2Y + this._lastMouseY) * 0.125;
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

            this._lastMouseX = pos.x;
            this._lastMouseY = pos.y;
            this._lastTouch2X = pos2.x;
            this._lastTouch2Y = pos2.y;
        }
    };

    ScreenSpaceEventHandler.prototype._handleMouseWheel = function(event) {
        // Some browsers use event.detail to count the number of clicks. The sign
        // of the integer is the direction the wheel is scrolled. In that case, convert
        // to the angle it was rotated in degrees.
        var delta = event.detail ? event.detail * -120 : event.wheelDelta;

        var modifier = this._getModifier(event);
        var type = ScreenSpaceEventType.WHEEL;
        var action = this.getInputAction(type, modifier);

        if (typeof action !== 'undefined') {
            event.preventDefault();
            action(delta);
        }
    };

    ScreenSpaceEventHandler.prototype._handleMouseDblClick = function(event) {
        var modifier = this._getModifier(event);
        var action;
        var pos = this._getPosition(event);

        // IE_TODO:  On some versions of IE, the left-button is 1, and the right-button is 4.
        // See: http://www.unixpapa.com/js/mouse.html
        // This is not the case in Chrome Frame, so we are OK for now, but are there
        // constants somewhere?
        if (event.button === 0) {
            action = this.getInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK, modifier);
        } else if (event.button === 1) {
            action = this.getInputAction(ScreenSpaceEventType.MIDDLE_DOUBLE_CLICK, modifier);
        } else if (event.button === 2) {
            action = this.getInputAction(ScreenSpaceEventType.RIGHT_DOUBLE_CLICK, modifier);
        }

        if (typeof action !== 'undefined') {
            action({
                position : new Cartesian2(pos.x, pos.y)
            });
        }
    };

    ScreenSpaceEventHandler.prototype._register = function() {
        var that = this, useDoc = true;

        this._callbacks = [];
        if (typeof this._element.disableRootEvents !== 'undefined') {
            useDoc = false;
        }

        this._callbacks.push({
            name : 'mousedown',
            onDoc : false,
            action : function(e) {
                that._handleMouseDown(e);
            }
        });
        this._callbacks.push({
            name : 'mouseup',
            onDoc : useDoc,
            action : function(e) {
                that._handleMouseUp(e);
            }
        });
        this._callbacks.push({
            name : 'mousemove',
            onDoc : useDoc,
            action : function(e) {
                that._handleMouseMove(e);
            }
        });
        this._callbacks.push({
            name : 'dblclick',
            onDoc : false,
            action : function(e) {
                that._handleMouseDblClick(e);
            }
        });
        this._callbacks.push({
            name : 'touchstart',
            onDoc : false,
            action : function(e) {
                that._handleTouchStart(e);
            }
        });
        this._callbacks.push({
            name : 'touchend',
            onDoc : useDoc,
            action : function(e) {
                that._handleTouchEnd(e);
            }
        });
        this._callbacks.push({
            name : 'touchmove',
            onDoc : useDoc,
            action : function(e) {
                that._handleTouchMove(e);
            }
        });

        // Firefox calls the mouse wheel event 'DOMMouseScroll', all others use 'mousewheel'
        this._callbacks.push({
            name : 'mousewheel',
            onDoc : false,
            action : function(e) {
                that._handleMouseWheel(e);
            }
        });
        this._callbacks.push({
            name : 'DOMMouseScroll',
            onDoc : false,
            action : function(e) {
                that._handleMouseWheel(e);
            }
        });

        for ( var i = 0; i < this._callbacks.length; i++) {
            var cback = this._callbacks[i];
            if (cback.onDoc) {
                document.addEventListener(cback.name, cback.action, false);
            } else {
                this._element.addEventListener(cback.name, cback.action, false);
            }
        }
    };

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
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
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
     * @return {undefined}
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
