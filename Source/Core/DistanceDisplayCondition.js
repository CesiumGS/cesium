/*global define*/
define([
        './Cartesian3',
        './defaultValue',
        './defined',
        './defineProperties',
        './Matrix4'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        Matrix4) {
    'use strict';

    /**
     * Determines visibility based on the distance to the camera.
     *
     * @alias DistanceDisplayCondition
     * @constructor
     *
     * @param {Number} [near=0.0] The smallest distance in the interval where the object is visible.
     * @param {Number} [far=Number.MAX_VALUE] The largest distance in the interval where the object is visible.
     *
     * @example
     * // Make a billboard that is only visible when the distance to the camera is between 10 and 20 meters.
     * billboard.distanceDisplayCondition = new DistanceDisplayCondition(10.0 20.0);
     */
    function DistanceDisplayCondition(near, far) {
        near = defaultValue(near, 0.0);
        this._near = near;
        this._near2 = near * near;

        far = defaultValue(far, Number.MAX_VALUE);
        this._far = far;
        this._far2 = far * far;
    }

    defineProperties(DistanceDisplayCondition.prototype, {
        /**
         * The smallest distance in the interval where the object is visible.
         * @memberof DistanceDisplayCondition.prototype
         * @type {Number}
         * @default 0.0
         */
        near : {
            get : function() {
                return this._near;
            },
            set : function(value) {
                this._near = value;
                this._near2 = value * value;
            }
        },
        /**
         * The largest distance in the interval where the object is visible.
         * @memberof DistanceDisplayCondition.prototype
         * @type {Number}
         * @default Number.MAX_VALUE
         */
        far : {
            get : function() {
                return this._far;
            },
            set : function(value) {
                this._far = value;
                this._far2 = value * value;
            }
        }
    });

    var scratchPosition = new Cartesian3();

    /**
     * Determines is a model is visible based on the current frame state.
     * @private
     *
     * @param {Model} model The model.
     * @param {FrameState} frameState The current frame state.
     * @return {Boolean} Whether the model is visible.
     */
    DistanceDisplayCondition.prototype.isVisible = function(model, frameState) {
        // Distance to center of primitive's reference frame
        var position = Matrix4.getTranslation(model.modelMatrix, scratchPosition);
        var distance2 = Cartesian3.distanceSquared(position, frameState.camera.positionWC);
        return (distance2 >= this._near2) && (distance2 <= this._far2);
    };

    /**
     * Determines if two distance display conditions are equal.
     *
     * @param {DistanceDisplayCondition} left A distance display condition.
     * @param {DistanceDisplayCondition} right Another distance display condition.
     * @return {Boolean} Whether the two distance display conditions are equal.
     */
    DistanceDisplayCondition.equals = function(left, right) {
        return left === right ||
               (defined(left) &&
                defined(right) &&
                left.near === right.near &&
                left.far === right.far);
    };

    /**
     * Duplicates a distance display condition instance.
     *
     * @param {DistanceDisplayCondition} [value] The distance display condition to duplicate.
     * @param {DistanceDisplayCondition} [result] The result onto which to store the result.
     * @return {DistanceDisplayCondition} The duplicated instance.
     */
    DistanceDisplayCondition.clone = function(value, result) {
        if (!defined(value)) {
            return undefined;
        }

        if (!defined(result)) {
            result = new DistanceDisplayCondition();
        }

        result.near = value.near;
        result.far = value.far;
        return result;
    };

    /**
     * Determines if this distance display condition is equal to another.
     *
     * @param {DistanceDisplayCondition} other Another distance display condition.
     * @return {Boolean} Whether this distance display condition is equal to the other.
     */
    DistanceDisplayCondition.prototype.equals = function(other) {
        return DistanceDisplayCondition.equals(this, other);
    };

    return DistanceDisplayCondition;
});