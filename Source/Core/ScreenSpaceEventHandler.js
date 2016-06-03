/*global define*/
define([
        './AssociativeArray',
        './Cartesian2',
        './defaultValue',
        './defined',
        './destroyObject',
        './DeveloperError',
        './FeatureDetection',
        './KeyboardEventModifier',
        './ScreenSpaceEventType'
    ], function(
        AssociativeArray,
        Cartesian2,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        KeyboardEventModifier,
        ScreenSpaceEventType) {
    'use strict';

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

    function getInputEventKey(type, modifier) {
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
        function listener(e) {
            callback(screenSpaceEventHandler, e);
        }
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

        if (FeatureDetection.supportsPointerEvents()) {
            registerListener(screenSpaceEventHandler, 'pointerdown', element, handlePointerDown);
            registerListener(screenSpaceEventHandler, 'pointerup', element, handlePointerUp);
            registerListener(screenSpaceEventHandler, 'pointermove', element, handlePointerMove);
        } else {
            registerListener(screenSpaceEventHandler, 'mousedown', element, handleMouseDown);
            registerListener(screenSpaceEventHandler, 'mouseup', alternateElement, handleMouseUp);
            registerListener(screenSpaceEventHandler, 'mousemove', alternateElement, handleMouseMove);
            registerListener(screenSpaceEventHandler, 'touchstart', element, handleTouchStart);
            registerListener(screenSpaceEventHandler, 'touchend', alternateElement, handleTouchEnd);
            registerListener(screenSpaceEventHandler, 'touchmove', alternateElement, handleTouchMove);
        }

        registerListener(screenSpaceEventHandler, 'dblclick', element, handleDblClick);

        // detect available wheel event
        var wheelEvent;
        if ('onwheel' in element) {
            // spec event type
            wheelEvent = 'wheel';
        } else if (document.onmousewheel !== undefined) {
            // legacy event type
            wheelEvent = 'mousewheel';
        } else {
            // older Firefox
            wheelEvent = 'DOMMouseScroll';
        }

        registerListener(screenSpaceEventHandler, wheelEvent, element, handleWheel);
    }

    function unregisterListeners(screenSpaceEventHandler) {
        var removalFunctions = screenSpaceEventHandler._removalFunctions;
        for (var i = 0; i < removalFunctions.length; ++i) {
            removalFunctions[i]();
        }
    }

    var mouseDownEvent = {
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

        var position = getPosition(screenSpaceEventHandler, event, screenSpaceEventHandler._primaryPosition);
        Cartesian2.clone(position, screenSpaceEventHandler._primaryStartPosition);
        Cartesian2.clone(position, screenSpaceEventHandler._primaryPreviousPosition);

        var modifier = getModifier(event);

        var action = screenSpaceEventHandler.getInputAction(screenSpaceEventType, modifier);

        if (defined(action)) {
            Cartesian2.clone(position, mouseDownEvent.position);

            action(mouseDownEvent);

            event.preventDefault();
        }
    }

    var mouseUpEvent = {
        position : new Cartesian2()
    };
    var mouseClickEvent = {
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

        if (defined(action) || defined(clickAction)) {
            var position = getPosition(screenSpaceEventHandler, event, screenSpaceEventHandler._primaryPosition);

            if (defined(action)) {
                Cartesian2.clone(position, mouseUpEvent.position);

                action(mouseUpEvent);
            }

            if (defined(clickAction)) {
                var startPosition = screenSpaceEventHandler._primaryStartPosition;
                var xDiff = startPosition.x - position.x;
                var yDiff = startPosition.y - position.y;
                var totalPixels = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

                if (totalPixels < screenSpaceEventHandler._clickPixelTolerance) {
                    Cartesian2.clone(position, mouseClickEvent.position);

                    clickAction(mouseClickEvent);
                }
            }
        }
    }

    var mouseMoveEvent = {
        startPosition : new Cartesian2(),
        endPosition : new Cartesian2()
    };

    function handleMouseMove(screenSpaceEventHandler, event) {
        if (screenSpaceEventHandler._seenAnyTouchEvents) {
            return;
        }

        var modifier = getModifier(event);

        var position = getPosition(screenSpaceEventHandler, event, screenSpaceEventHandler._primaryPosition);
        var previousPosition = screenSpaceEventHandler._primaryPreviousPosition;

        var action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);

        if (defined(action)) {
            Cartesian2.clone(previousPosition, mouseMoveEvent.startPosition);
            Cartesian2.clone(position, mouseMoveEvent.endPosition);

            action(mouseMoveEvent);
        }

        Cartesian2.clone(position, previousPosition);

        if (defined(screenSpaceEventHandler._buttonDown)) {
            event.preventDefault();
        }
    }

    var mouseDblClickEvent = {
        position : new Cartesian2()
    };

    function handleDblClick(screenSpaceEventHandler, event) {
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

        if (defined(action)) {
            getPosition(screenSpaceEventHandler, event, mouseDblClickEvent.position);

            action(mouseDblClickEvent);
        }
    }

    function handleWheel(screenSpaceEventHandler, event) {
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

        if (defined(action)) {
            action(delta);

            event.preventDefault();
        }
    }

    function handleTouchStart(screenSpaceEventHandler, event) {
        screenSpaceEventHandler._seenAnyTouchEvents = true;

        var changedTouches = event.changedTouches;

        var i;
        var length = changedTouches.length;
        var touch;
        var identifier;
        var positions = screenSpaceEventHandler._positions;

        for (i = 0; i < length; ++i) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            positions.set(identifier, getPosition(screenSpaceEventHandler, touch, new Cartesian2()));
        }

        fireTouchEvents(screenSpaceEventHandler, event);

        var previousPositions = screenSpaceEventHandler._previousPositions;

        for (i = 0; i < length; ++i) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            previousPositions.set(identifier, Cartesian2.clone(positions.get(identifier)));
        }
    }

    function handleTouchEnd(screenSpaceEventHandler, event) {
        screenSpaceEventHandler._seenAnyTouchEvents = true;

        var changedTouches = event.changedTouches;

        var i;
        var length = changedTouches.length;
        var touch;
        var identifier;
        var positions = screenSpaceEventHandler._positions;

        for (i = 0; i < length; ++i) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            positions.remove(identifier);
        }

        fireTouchEvents(screenSpaceEventHandler, event);

        var previousPositions = screenSpaceEventHandler._previousPositions;

        for (i = 0; i < length; ++i) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            previousPositions.remove(identifier);
        }
    }

    var touchStartEvent = {
        position : new Cartesian2()
    };
    var touch2StartEvent = {
        position1 : new Cartesian2(),
        position2 : new Cartesian2()
    };
    var touchEndEvent = {
        position : new Cartesian2()
    };
    var touchClickEvent = {
        position : new Cartesian2()
    };

    function fireTouchEvents(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var positions = screenSpaceEventHandler._positions;
        var previousPositions = screenSpaceEventHandler._previousPositions;
        var numberOfTouches = positions.length;
        var action;
        var clickAction;

        if (numberOfTouches !== 1 && screenSpaceEventHandler._buttonDown === MouseButton.LEFT) {
            // transitioning from single touch, trigger UP and might trigger CLICK
            screenSpaceEventHandler._buttonDown = undefined;
            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_UP, modifier);

            if (defined(action)) {
                Cartesian2.clone(screenSpaceEventHandler._primaryPosition, touchEndEvent.position);

                action(touchEndEvent);
            }

            if (numberOfTouches === 0) {
                // releasing single touch, check for CLICK
                clickAction = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_CLICK, modifier);

                if (defined(clickAction)) {
                    var startPosition = screenSpaceEventHandler._primaryStartPosition;
                    var endPosition = previousPositions.values[0];
                    var xDiff = startPosition.x - endPosition.x;
                    var yDiff = startPosition.y - endPosition.y;
                    var totalPixels = Math.sqrt(xDiff * xDiff + yDiff * yDiff);

                    if (totalPixels < screenSpaceEventHandler._clickPixelTolerance) {
                        Cartesian2.clone(screenSpaceEventHandler._primaryPosition, touchClickEvent.position);

                        clickAction(touchClickEvent);
                    }
                }
            }

            // Otherwise don't trigger CLICK, because we are adding more touches.
        }

        if (numberOfTouches !== 2 && screenSpaceEventHandler._isPinching) {
            // transitioning from pinch, trigger PINCH_END
            screenSpaceEventHandler._isPinching = false;

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_END, modifier);

            if (defined(action)) {
                action();
            }
        }

        if (numberOfTouches === 1) {
            // transitioning to single touch, trigger DOWN
            var position = positions.values[0];
            Cartesian2.clone(position, screenSpaceEventHandler._primaryPosition);
            Cartesian2.clone(position, screenSpaceEventHandler._primaryStartPosition);
            Cartesian2.clone(position, screenSpaceEventHandler._primaryPreviousPosition);

            screenSpaceEventHandler._buttonDown = MouseButton.LEFT;

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.LEFT_DOWN, modifier);

            if (defined(action)) {
                Cartesian2.clone(position, touchStartEvent.position);

                action(touchStartEvent);
            }

            event.preventDefault();
        }

        if (numberOfTouches === 2) {
            // transitioning to pinch, trigger PINCH_START
            screenSpaceEventHandler._isPinching = true;

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_START, modifier);

            if (defined(action)) {
                Cartesian2.clone(positions.values[0], touch2StartEvent.position1);
                Cartesian2.clone(positions.values[1], touch2StartEvent.position2);

                action(touch2StartEvent);
            }
        }
    }

    function handleTouchMove(screenSpaceEventHandler, event) {
        screenSpaceEventHandler._seenAnyTouchEvents = true;

        var changedTouches = event.changedTouches;

        var i;
        var length = changedTouches.length;
        var touch;
        var identifier;
        var positions = screenSpaceEventHandler._positions;

        for (i = 0; i < length; ++i) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            var position = positions.get(identifier);
            if (defined(position)) {
                getPosition(screenSpaceEventHandler, touch, position);
            }
        }

        fireTouchMoveEvents(screenSpaceEventHandler, event);

        var previousPositions = screenSpaceEventHandler._previousPositions;

        for (i = 0; i < length; ++i) {
            touch = changedTouches[i];
            identifier = touch.identifier;
            Cartesian2.clone(positions.get(identifier), previousPositions.get(identifier));
        }
    }

    var touchMoveEvent = {
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

    function fireTouchMoveEvents(screenSpaceEventHandler, event) {
        var modifier = getModifier(event);
        var positions = screenSpaceEventHandler._positions;
        var previousPositions = screenSpaceEventHandler._previousPositions;
        var numberOfTouches = positions.length;
        var action;

        if (numberOfTouches === 1 && screenSpaceEventHandler._buttonDown === MouseButton.LEFT) {
            // moving single touch
            var position = positions.values[0];
            Cartesian2.clone(position, screenSpaceEventHandler._primaryPosition);

            var previousPosition = screenSpaceEventHandler._primaryPreviousPosition;

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.MOUSE_MOVE, modifier);

            if (defined(action)) {
                Cartesian2.clone(previousPosition, touchMoveEvent.startPosition);
                Cartesian2.clone(position, touchMoveEvent.endPosition);

                action(touchMoveEvent);
            }

            Cartesian2.clone(position, previousPosition);

            event.preventDefault();
        } else if (numberOfTouches === 2 && screenSpaceEventHandler._isPinching) {
            // moving pinch

            action = screenSpaceEventHandler.getInputAction(ScreenSpaceEventType.PINCH_MOVE, modifier);
            if (defined(action)) {
                var position1 = positions.values[0];
                var position2 = positions.values[1];
                var previousPosition1 = previousPositions.values[0];
                var previousPosition2 = previousPositions.values[1];

                var dX = position2.x - position1.x;
                var dY = position2.y - position1.y;
                var dist = Math.sqrt(dX * dX + dY * dY) * 0.25;

                var prevDX = previousPosition2.x - previousPosition1.x;
                var prevDY = previousPosition2.y - previousPosition1.y;
                var prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY) * 0.25;

                var cY = (position2.y + position1.y) * 0.125;
                var prevCY = (previousPosition2.y + previousPosition1.y) * 0.125;
                var angle = Math.atan2(dY, dX);
                var prevAngle = Math.atan2(prevDY, prevDX);

                Cartesian2.fromElements(0.0, prevDist, touchPinchMovementEvent.distance.startPosition);
                Cartesian2.fromElements(0.0, dist, touchPinchMovementEvent.distance.endPosition);

                Cartesian2.fromElements(prevAngle, prevCY, touchPinchMovementEvent.angleAndHeight.startPosition);
                Cartesian2.fromElements(angle, cY, touchPinchMovementEvent.angleAndHeight.endPosition);

                action(touchPinchMovementEvent);
            }
        }
    }

    function handlePointerDown(screenSpaceEventHandler, event) {
        event.target.setPointerCapture(event.pointerId);

        if (event.pointerType === 'touch') {
            var positions = screenSpaceEventHandler._positions;

            var identifier = event.pointerId;
            positions.set(identifier, getPosition(screenSpaceEventHandler, event, new Cartesian2()));

            fireTouchEvents(screenSpaceEventHandler, event);

            var previousPositions = screenSpaceEventHandler._previousPositions;
            previousPositions.set(identifier, Cartesian2.clone(positions.get(identifier)));
        } else {
            handleMouseDown(screenSpaceEventHandler, event);
        }
    }

    function handlePointerUp(screenSpaceEventHandler, event) {
        if (event.pointerType === 'touch') {
            var positions = screenSpaceEventHandler._positions;

            var identifier = event.pointerId;
            positions.remove(identifier);

            fireTouchEvents(screenSpaceEventHandler, event);

            var previousPositions = screenSpaceEventHandler._previousPositions;
            previousPositions.remove(identifier);
        } else {
            handleMouseUp(screenSpaceEventHandler, event);
        }
    }

    function handlePointerMove(screenSpaceEventHandler, event) {
        if (event.pointerType === 'touch') {
            var positions = screenSpaceEventHandler._positions;

            var identifier = event.pointerId;
            getPosition(screenSpaceEventHandler, event, positions.get(identifier));

            fireTouchMoveEvents(screenSpaceEventHandler, event);

            var previousPositions = screenSpaceEventHandler._previousPositions;
            Cartesian2.clone(positions.get(identifier), previousPositions.get(identifier));
        } else {
            handleMouseMove(screenSpaceEventHandler, event);
        }
    }

    /**
     * Handles user input events. Custom functions can be added to be executed on
     * when the user enters input.
     *
     * @alias ScreenSpaceEventHandler
     *
     * @param {Canvas} [element=document] The element to add events to.
     *
     * @constructor
     */
    function ScreenSpaceEventHandler(element) {
        this._inputEvents = {};
        this._buttonDown = undefined;
        this._isPinching = false;
        this._seenAnyTouchEvents = false;

        this._primaryStartPosition = new Cartesian2();
        this._primaryPosition = new Cartesian2();
        this._primaryPreviousPosition = new Cartesian2();

        this._positions = new AssociativeArray();
        this._previousPositions = new AssociativeArray();

        this._removalFunctions = [];

        // TODO: Revisit when doing mobile development. May need to be configurable
        // or determined based on the platform?
        this._clickPixelTolerance = 5;

        this._element = defaultValue(element, document);

        registerListeners(this);
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

        var key = getInputEventKey(type, modifier);
        this._inputEvents[key] = action;
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

        var key = getInputEventKey(type, modifier);
        return this._inputEvents[key];
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

        var key = getInputEventKey(type, modifier);
        delete this._inputEvents[key];
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
     *
     * @example
     * handler = handler && handler.destroy();
     * 
     * @see ScreenSpaceEventHandler#isDestroyed
     */
    ScreenSpaceEventHandler.prototype.destroy = function() {
        unregisterListeners(this);

        return destroyObject(this);
    };

    return ScreenSpaceEventHandler;
});
