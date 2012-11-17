/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/EventHandler',
        '../Core/ScreenSpaceEventType',
        '../Core/Cartesian2',
        './CameraEventType'
    ], function(
        DeveloperError,
        destroyObject,
        CesiumMath,
        EventHandler,
        ScreenSpaceEventType,
        Cartesian2,
        CameraEventType) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CameraEventHandler
     *
     * @param {HTMLCanvasElement} canvas DOC_TBA
     * @param {CameraEventType} moveType DOC_TBA
     * @param {EventModifier} moveModifier DOC_TBA
     *
     * @exception {DeveloperError} canvas is required.
     * @exception {DeveloperError} moveType is required.
     *
     * @constructor
     *
     * @see EventHandler
     */
    var CameraEventHandler = function(canvas, moveType, moveModifier) {
        if (typeof canvas === 'undefined') {
            throw new DeveloperError('description.canvas is required.');
        }

        if (typeof moveType === 'undefined') {
            throw new DeveloperError('moveType is required.');
        }

        this._eventHandler = new EventHandler(canvas);

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
                        that._movement.distance.endPosition = movement.distance.endPosition.clone();
                        that._movement.angleAndHeight.endPosition = movement.angleAndHeight.endPosition.clone();
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
                        startPosition : new Cartesian2(0.0, 0.0),
                        endPosition : new Cartesian2(0.0, arcLength),
                        motion : new Cartesian2(0.0, 0.0)
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
                        that._movement.endPosition = movement.endPosition.clone();
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
     * @memberof CameraEventHandler
     *
     * @return {Boolean} DOC_TBA
     */
    CameraEventHandler.prototype.isMoving = function() {
        return !this._update;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Object} DOC_TBA
     */
    CameraEventHandler.prototype.getMovement = function() {
        var movement = this._movement;
        this._update = true;
        return movement;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Object} DOC_TBA
     */
    CameraEventHandler.prototype.getLastMovement = function() {
        return this._lastMovement;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Boolean} DOC_TBA
     *
     */
    CameraEventHandler.prototype.isButtonDown = function() {
        return this._isDown;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Date} DOC_TBA
     *
     */
    CameraEventHandler.prototype.getButtonPressTime = function() {
        return this._pressTime;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Date} DOC_TBA
     *
     */
    CameraEventHandler.prototype.getButtonReleaseTime = function() {
        return this._releaseTime;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CameraEventHandler
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see CameraEventHandler#destroy
     */
    CameraEventHandler.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraEventHandler
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraEventHandler#isDestroyed
     *
     * @example
     * handler = handler && handler.destroy();
     */
    CameraEventHandler.prototype.destroy = function() {
        this._eventHandler = this._eventHandler && this._eventHandler.destroy();
        return destroyObject(this);
    };

    return CameraEventHandler;
});