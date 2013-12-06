/*global define*/
define([
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/ScreenSpaceEventHandler',
        '../Core/ScreenSpaceEventType',
        '../Core/Cartesian2',
        '../Core/KeyboardEventModifier',
        './CameraEventType'
    ], function(
        defined,
        defaultValue,
        DeveloperError,
        destroyObject,
        CesiumMath,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Cartesian2,
        KeyboardEventModifier,
        CameraEventType) {
    "use strict";

    var MAX_EVENT_TYPES = 0;
    for (var type in CameraEventType) {
        if (CameraEventType.hasOwnProperty(type)) {
            ++MAX_EVENT_TYPES;
        }
    }

    var MAX_MODS = 1;
    for (var modifier in KeyboardEventModifier) {
        if (KeyboardEventModifier.hasOwnProperty(modifier)) {
            ++MAX_MODS;
        }
    }

    function getIndex(type, modifier) {
        modifier = defaultValue(modifier, 0);
        return type * MAX_MODS + modifier;
    }

    function listenToPinch(aggregator, modifier, canvas) {
        var index = getIndex(CameraEventType.PINCH, modifier);

        if (modifier === 0) {
            modifier = undefined;
        }

        var update = aggregator._update;
        var movement = aggregator._movement;
        var lastMovement = aggregator._lastMovement;
        var isDown = aggregator._isDown;
        var pressTime = aggregator._pressTime;
        var releaseTime = aggregator._releaseTime;

        aggregator._eventHandler.setInputAction(function() {
            isDown[index] = true;
            pressTime[index] = new Date();
        }, ScreenSpaceEventType.PINCH_START, modifier);

        aggregator._eventHandler.setInputAction(function() {
            isDown[index] = false;
            releaseTime[index] = new Date();
        }, ScreenSpaceEventType.PINCH_END, modifier);

        aggregator._eventHandler.setInputAction(function(mouseMovement) {
            if (isDown[index]) {
                // Aggregate several input events into a single animation frame.
                if (!update[index]) {
                    movement[index].distance.endPosition = Cartesian2.clone(mouseMovement.distance.endPosition);
                    movement[index].angleAndHeight.endPosition = Cartesian2.clone(mouseMovement.angleAndHeight.endPosition);
                } else {
                    movement[index] = mouseMovement;
                    update[index] = false;
                    movement[index].prevAngle = movement[index].angleAndHeight.startPosition.x;
                }
                // Make sure our aggregation of angles does not "flip" over 360 degrees.
                var angle = movement[index].angleAndHeight.endPosition.x;
                var prevAngle = movement[index].prevAngle;
                var TwoPI = Math.PI * 2;
                while (angle >= (prevAngle + Math.PI)) {
                    angle -= TwoPI;
                }
                while (angle < (prevAngle - Math.PI)) {
                    angle += TwoPI;
                }
                movement[index].angleAndHeight.endPosition.x = -angle * canvas.clientWidth / 12;
                movement[index].angleAndHeight.startPosition.x = -prevAngle * canvas.clientWidth / 12;
            }
        }, ScreenSpaceEventType.PINCH_MOVE, modifier);
    }

    function listenToWheel(aggregator, modifier) {
        var index = getIndex(CameraEventType.WHEEL, modifier);

        if (modifier === 0) {
            modifier = undefined;
        }

        var update = aggregator._update;
        var movement = aggregator._movement;
        var lastMovement = aggregator._lastMovement;
        var pressTime = aggregator._pressTime;
        var releaseTime = aggregator._releaseTime;

        aggregator._eventHandler.setInputAction(function(delta) {
            // TODO: magic numbers
            var arcLength = 2 * CesiumMath.toRadians(delta);
            if (!update[index]) {
                movement[index].endPosition.y = movement[index].endPosition.y + arcLength;
            } else {
                movement[index] = {
                    startPosition : new Cartesian2(),
                    endPosition : new Cartesian2(0.0, arcLength),
                    motion : new Cartesian2()
                };
                lastMovement[index] = movement[index]; // This looks unusual, but its needed for wheel inertia.
                update[index] = false;
            }
            pressTime[index] = new Date();
            releaseTime[index] = new Date(pressTime[index].getTime() + Math.abs(arcLength) * 5.0);
        }, ScreenSpaceEventType.WHEEL, modifier);
    }

    function listenMouseButtonDownUp(aggregator, modifier, type) {
        var index = getIndex(type, modifier);

        if (modifier === 0) {
            modifier = undefined;
        }

        var lastMovement = aggregator._lastMovement;
        var isDown = aggregator._isDown;
        var pressTime = aggregator._pressTime;
        var releaseTime = aggregator._releaseTime;

        var down;
        var up;
        if (type === CameraEventType.LEFT_DRAG) {
            down = ScreenSpaceEventType.LEFT_DOWN;
            up = ScreenSpaceEventType.LEFT_UP;
        } else if (type === CameraEventType.RIGHT_DRAG) {
            down = ScreenSpaceEventType.RIGHT_DOWN;
            up = ScreenSpaceEventType.RIGHT_UP;
        } else if (type === CameraEventType.MIDDLE_DRAG) {
            down = ScreenSpaceEventType.MIDDLE_DOWN;
            up = ScreenSpaceEventType.MIDDLE_UP;
        }

        aggregator._eventHandler.setInputAction(function() {
            lastMovement[index] = undefined;
            isDown[index] = true;
            pressTime[index] = new Date();
        }, down, modifier);

        aggregator._eventHandler.setInputAction(function() {
            isDown[index] = false;
            releaseTime[index] = new Date();
        }, up, modifier);
    }

    function listenMouseMove(aggregator, modifier) {
        var update = aggregator._update;
        var movement = aggregator._movement;
        var lastMovement = aggregator._lastMovement;
        var isDown = aggregator._isDown;

        aggregator._eventHandler.setInputAction(function(mouseMovement) {
            for (var i = 0; i < MAX_EVENT_TYPES; ++i) {
                var index = getIndex(i, modifier);
                if (isDown[index]) {
                    if (!update[index]) {
                        movement[index].endPosition = Cartesian2.clone(mouseMovement.endPosition);
                    } else {
                        lastMovement[index] = movement[index];
                        movement[index] = mouseMovement;
                        update[index] = false;
                    }
                }
            }
        }, ScreenSpaceEventType.MOUSE_MOVE, (modifier === 0) ? undefined : modifier);
    }

    /**
     * Aggregates input events. For example, suppose the following inputs are received between frames:
     * left mouse button down, mouse move, mouse move, left mouse button up. These events will be aggregated into
     * one event with a start and end position of the mouse.
     *
     * @alias CameraEventAggregator
     * @constructor
     *
     * @param {HTMLCanvasElement} canvas DOC_TBA
     *
     * @exception {DeveloperError} canvas is required.
     *
     * @see ScreenSpaceEventHandler
     */
    var CameraEventAggregator = function(canvas) {
        if (!defined(canvas)) {
            throw new DeveloperError('canvas is required.');
        }

        this._eventHandler = new ScreenSpaceEventHandler(canvas);

        var length = MAX_EVENT_TYPES * MAX_MODS;
        this._update = new Array(length);
        this._movement = new Array(length);
        this._lastMovement = new Array(length);
        this._isDown = new Array(length);
        this._pressTime = new Array(length);
        this._releaseTime = new Array(length);

        for (var i = 0; i < length; ++i) {
            this._update[i] = true;
            this._isDown[i] = false;
        }

        for (var j = 0; j < MAX_MODS; ++j) {
            listenToWheel(this, j);
            listenToPinch(this, j, canvas);
            listenMouseButtonDownUp(this, j, CameraEventType.LEFT_DRAG);
            listenMouseButtonDownUp(this, j, CameraEventType.RIGHT_DRAG);
            listenMouseButtonDownUp(this, j, CameraEventType.MIDDLE_DRAG);
            listenMouseMove(this, j);
        }
    };

    /**
     * Gets if a mouse button down or touch has started and has been moved.
     * @memberof CameraEventAggregator
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Boolean} Returns <code>true</code> if a mouse button down or touch has started and has been moved; otherwise, <code>false</code>
     *
     * @exception {DeveloperError} type is required.
     */
    CameraEventAggregator.prototype.isMoving = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var index = getIndex(type, modifier);
        return !this._update[index];
    };

    /**
     * Gets the aggregated start and end position of the current event.
     * <p>
     * NOTE: This function has a side effect. Once this function is called, the event
     * is assumed to be handled and will signal that a new event should be tracked.
     * </p>
     * @memberof CameraEventAggregator
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Object} An object with two {@link Cartesian2} properties: <code>startPosition</code> and <code>endPosition</code>.
     *
     * @exception {DeveloperError} type is required.
     */
    CameraEventAggregator.prototype.getMovement = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var index = getIndex(type, modifier);
        var movement = this._movement[index];
        this._update[index] = true;
        return movement;
    };

    /**
     * Gets the start and end position of the last move event (not the aggregated event).
     * @memberof CameraEventAggregator
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Object|undefined} An object with two {@link Cartesian2} properties: <code>startPosition</code> and <code>endPosition</code> or <code>undefined</code>.
     *
     * @exception {DeveloperError} type is required.
     */
    CameraEventAggregator.prototype.getLastMovement = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var index = getIndex(type, modifier);
        return this._lastMovement[index];
    };

    /**
     * Gets whether the mouse button is down or a touch has started.
     * @memberof CameraEventAggregator
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Boolean} Whether the mouse button is down or a touch has started.
     *
     * @exception {DeveloperError} type is required.
     */
    CameraEventAggregator.prototype.isButtonDown = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var index = getIndex(type, modifier);
        return this._isDown[index];
    };

    /**
     * Gets the time the button was pressed or the touch was started.
     * @memberof CameraEventAggregator
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Date} The time the button was pressed or the touch was started.
     *
     * @exception {DeveloperError} type is required.
     */
    CameraEventAggregator.prototype.getButtonPressTime = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var index = getIndex(type, modifier);
        return this._pressTime[index];
    };

    /**
     * Gets the time the button was released or the touch was ended.
     * @memberof CameraEventAggregator
     *
     * @param {CameraEventType} type The camera event type.
     * @param {KeyboardEventModifier} [modifier] The keyboard modifier.
     * @returns {Date} The time the button was released or the touch was ended.
     *
     * @exception {DeveloperError} type is required.
     */
    CameraEventAggregator.prototype.getButtonReleaseTime = function(type, modifier) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        var index = getIndex(type, modifier);
        return this._releaseTime[index];
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see CameraEventAggregator#destroy
     */
    CameraEventAggregator.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraEventAggregator
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraEventAggregator#isDestroyed
     *
     * @example
     * handler = handler && handler.destroy();
     */
    CameraEventAggregator.prototype.destroy = function() {
        this._eventHandler = this._eventHandler && this._eventHandler.destroy();
        return destroyObject(this);
    };

    return CameraEventAggregator;
});
