/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/ScreenSpaceEventHandler',
        '../Core/ScreenSpaceEventType',
        '../Core/Cartesian2',
        './CameraEventType'
    ], function(
        defined,
        DeveloperError,
        destroyObject,
        CesiumMath,
        ScreenSpaceEventHandler,
        ScreenSpaceEventType,
        Cartesian2,
        CameraEventType) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CameraEventAggregator
     *
     * @param {HTMLCanvasElement} canvas DOC_TBA
     * @param {CameraEventType} moveType DOC_TBA
     * @param {KeyboardEventModifier} moveModifier DOC_TBA
     *
     * @exception {DeveloperError} canvas is required.
     * @exception {DeveloperError} moveType is required.
     *
     * @constructor
     *
     * @see ScreenSpaceEventHandler
     */
    var CameraEventAggregator = function(canvas, moveType, moveModifier) {
        if (!defined(canvas)) {
            throw new DeveloperError('description.canvas is required.');
        }

        if (!defined(moveType)) {
            throw new DeveloperError('moveType is required.');
        }

        this._eventHandler = new ScreenSpaceEventHandler(canvas);

        this._update = true;
        this._movement = undefined;
        this._lastMovement = undefined;
        this._isDown = false;
        this._pressTime = undefined;
        this._releaseTime = undefined;

        var that = this;

        if (moveType === CameraEventType.PINCH) {

            this._eventHandler.setInputAction(function(movement) {
                //that._lastMovement = null;
                that._isDown = true;
                that._pressTime = new Date();
            }, ScreenSpaceEventType.PINCH_START, moveModifier);

            this._eventHandler.setInputAction(function(movement) {
                that._isDown = false;
                that._releaseTime = new Date();
            }, ScreenSpaceEventType.PINCH_END, moveModifier);

            this._eventHandler.setInputAction(function(movement) {
                if (that._isDown) {
                    // Aggregate several input events into a single animation frame.
                    if (!that._update) {
                        that._movement.distance.endPosition = Cartesian2.clone(movement.distance.endPosition);
                        that._movement.angleAndHeight.endPosition = Cartesian2.clone(movement.angleAndHeight.endPosition);
                    } else {
                        //that._lastMovement = that._movement;
                        that._movement = movement;
                        that._update = false;
                        that._movement.prevAngle = that._movement.angleAndHeight.startPosition.x;
                    }
                    // Make sure our aggregation of angles does not "flip" over 360 degrees.
                    var angle = that._movement.angleAndHeight.endPosition.x;
                    var prevAngle = that._movement.prevAngle;
                    var TwoPI = Math.PI * 2;
                    while (angle >= (prevAngle + Math.PI)) {
                        angle -= TwoPI;
                    }
                    while (angle < (prevAngle - Math.PI)) {
                        angle += TwoPI;
                    }
                    that._movement.angleAndHeight.endPosition.x = -angle * canvas.clientWidth / 12;
                    that._movement.angleAndHeight.startPosition.x = -prevAngle * canvas.clientWidth / 12;
                }
            }, ScreenSpaceEventType.PINCH_MOVE, moveModifier);

        } else if (moveType === CameraEventType.WHEEL) {

            this._eventHandler.setInputAction(function(delta) {
                // TODO: magic numbers
                var arcLength = 2 * CesiumMath.toRadians(delta);
                if (!that._update) {
                    that._movement.endPosition.y = that._movement.endPosition.y + arcLength;
                } else {
                    that._movement = {
                        startPosition : new Cartesian2(),
                        endPosition : new Cartesian2(0.0, arcLength),
                        motion : new Cartesian2()
                    };
                    that._lastMovement = that._movement; // This looks unusual, but its needed for wheel inertia.
                    that._update = false;
                }
                that._pressTime = new Date();
                that._releaseTime = new Date(that._pressTime.getTime() + Math.abs(arcLength) * 5.0);
            }, ScreenSpaceEventType.WHEEL, moveModifier);

        } else {  // General mouse buttons

            var down;
            var up;
            if (moveType === CameraEventType.LEFT_DRAG) {
                down = ScreenSpaceEventType.LEFT_DOWN;
                up = ScreenSpaceEventType.LEFT_UP;
            } else if (moveType === CameraEventType.RIGHT_DRAG) {
                down = ScreenSpaceEventType.RIGHT_DOWN;
                up = ScreenSpaceEventType.RIGHT_UP;
            } else if (moveType === CameraEventType.MIDDLE_DRAG) {
                down = ScreenSpaceEventType.MIDDLE_DOWN;
                up = ScreenSpaceEventType.MIDDLE_UP;
            } else {
                this._eventHandler = this._eventHandler && this._eventHandler.destroy();
                throw new DeveloperError('moveType must be of type CameraEventType.');
            }

            this._eventHandler.setInputAction(function(movement) {
                that._lastMovement = null;
                that._isDown = true;
                that._pressTime = new Date();
            }, down, moveModifier);

            this._eventHandler.setInputAction(function(movement) {
                that._isDown = false;
                that._releaseTime = new Date();
            }, up, moveModifier);

            this._eventHandler.setInputAction(function(movement) {
                if (that._isDown) {
                    if (!that._update) {
                        that._movement.endPosition = Cartesian2.clone(movement.endPosition);
                    } else {
                        that._lastMovement = that._movement;
                        that._movement = movement;
                        that._update = false;
                    }
                }
            }, ScreenSpaceEventType.MOUSE_MOVE, moveModifier);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Boolean} DOC_TBA
     */
    CameraEventAggregator.prototype.isMoving = function() {
        return !this._update;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Object} DOC_TBA
     */
    CameraEventAggregator.prototype.getMovement = function() {
        var movement = this._movement;
        this._update = true;
        return movement;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Object} DOC_TBA
     */
    CameraEventAggregator.prototype.getLastMovement = function() {
        return this._lastMovement;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Boolean} DOC_TBA
     *
     */
    CameraEventAggregator.prototype.isButtonDown = function() {
        return this._isDown;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Date} DOC_TBA
     *
     */
    CameraEventAggregator.prototype.getButtonPressTime = function() {
        return this._pressTime;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventAggregator
     *
     * @returns {Date} DOC_TBA
     *
     */
    CameraEventAggregator.prototype.getButtonReleaseTime = function() {
        return this._releaseTime;
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
