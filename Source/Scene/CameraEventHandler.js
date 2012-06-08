/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/EventHandler',
        '../Core/MouseEventType',
        '../Core/Cartesian2',
        '../Core/JulianDate',
        './CameraEventType'
    ], function(
        DeveloperError,
        destroyObject,
        CesiumMath,
        EventHandler,
        MouseEventType,
        Cartesian2,
        JulianDate,
        CameraEventType) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name CameraEventHandler
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
    function CameraEventHandler(canvas, moveType, moveModifier) {
        if (!canvas) {
            throw new DeveloperError('description.canvas is required.');
        }

        if (!moveType) {
            throw new DeveloperError('moveType is required.');
        }

        this._eventHandler = new EventHandler(canvas);

        this._eventDownFunc = null;
        this._eventPressTimeFunc = null;
        this._eventReleaseTimeFunc = null;

        this._update = true;
        this._movement = null;
        this._lastMovement = null;

        var that = this;

        if (moveType !== CameraEventType.WHEEL) {
            var down;
            if (moveType === CameraEventType.LEFT_DRAG) {
                down = MouseEventType.LEFT_DOWN;

                this._eventDownFunc = this._eventHandler.isLeftMouseButtonDown;
                this._eventPressTimeFunc = this._eventHandler.getLeftPressTime;
                this._eventReleaseTimeFunc = this._eventHandler.getLeftReleaseTime;
            } else if (moveType === CameraEventType.RIGHT_DRAG) {
                down = MouseEventType.RIGHT_DOWN;

                this._eventDownFunc = this._eventHandler.isRightMouseButtonDown;
                this._eventPressTimeFunc = this._eventHandler.getRightPressTime;
                this._eventReleaseTimeFunc = this._eventHandler.getRightReleaseTime;
            } else if (moveType === CameraEventType.MIDDLE_DRAG) {
                down = MouseEventType.MIDDLE_DOWN;

                this._eventDownFunc = this._eventHandler.isMiddleMouseButtonDown;
                this._eventPressTimeFunc = this._eventHandler.getMiddlePressTime;
                this._eventReleaseTimeFunc = this._eventHandler.getRightReleaseTime;
            } else {
                this._eventHandler = this._eventHandler && this._eventHandler.destroy();
                throw new DeveloperError('moveType must be of type CameraEventType.');
            }

            this._eventHandler.setMouseAction(function(movement) {
                that._lastMovement = null;
            }, down, moveModifier);

            this._eventHandler.setMouseAction(function(movement) {
                if (that._eventDownFunc.call(that._eventHandler)) {
                    if (!that._update) {
                        that._movement.endPosition = movement.endPosition.clone();
                    } else {
                        that._lastMovement = that._movement;
                        that._movement = movement;
                        that._update = false;
                    }
                }
            }, MouseEventType.MOVE, moveModifier);
        } else {
            this._wheelStart = null;
            this._wheelEnd = null;

            this._eventHandler.setMouseAction(function(delta) {
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
                that._wheelStart = new JulianDate();
                that._wheelEnd = that._wheelStart.addSeconds(Math.abs(arcLength) * 0.005);
            }, MouseEventType.WHEEL, moveModifier);
        }
    }

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Object} DOC_TBA
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
     * @return {Object} DOC_TBA
     *
     */
    CameraEventHandler.prototype.isButtonDown = function() {
        if (this._eventDownFunc) {
            return this._eventDownFunc.call(this._eventHandler);
        }
        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Object} DOC_TBA
     *
     */
    CameraEventHandler.prototype.getButtonPressTime = function() {
        if (this._eventPressTimeFunc) {
            return this._eventPressTimeFunc.call(this._eventHandler);
        } else if (this._wheelStart) {
            return this._wheelStart;
        }
        return null;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraEventHandler
     *
     * @return {Object} DOC_TBA
     *
     */
    CameraEventHandler.prototype.getButtonReleaseTime = function() {
        if (this._eventReleaseTimeFunc) {
            return this._eventReleaseTimeFunc.call(this._eventHandler);
        } else if (this._wheelEnd) {
            return this._wheelEnd;
        }
        return null;
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
     * Removes mouse and keyboard listeners held by this object.
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