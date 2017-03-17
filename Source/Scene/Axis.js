/*global define*/
define([
        '../Core/Check',
        '../Core/freezeObject',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4'
], function(
        Check,
        freezeObject,
        CesiumMath,
        Matrix3,
        Matrix4) {
    'use strict';

    /**
     * An enum describing the x, y, and z axes and helper conversion functions.
     *
     * @exports Axis
     * @private
     */
    var Axis = {
        /**
         * Denotes the x-axis.
         *
         * @type {Number}
         * @constant
         */
        X : 0,

        /**
         * Denotes the y-axis.
         *
         * @type {Number}
         * @constant
         */
        Y : 1,

        /**
         * Denotes the z-axis.
         *
         * @type {Number}
         * @constant
         */
        Z : 2,

        /**
         * Matrix used to convert from y-up to z-up
         *
         * @type {Matrix4}
         * @constant
         */
        Y_UP_TO_Z_UP : Matrix4.fromRotationTranslation(Matrix3.fromRotationX(CesiumMath.PI_OVER_TWO)),

        /**
         * Matrix used to convert from z-up to y-up
         *
         * @type {Matrix4}
         * @constant
         */
        Z_UP_TO_Y_UP : Matrix4.fromRotationTranslation(Matrix3.fromRotationX(-CesiumMath.PI_OVER_TWO)),

        /**
         * Matrix used to convert from x-up to z-up
         *
         * @type {Matrix4}
         * @constant
         */
        X_UP_TO_Z_UP : Matrix4.fromRotationTranslation(Matrix3.fromRotationY(-CesiumMath.PI_OVER_TWO)),

        /**
         * Matrix used to convert from z-up to x-up
         *
         * @type {Matrix4}
         * @constant
         */
        Z_UP_TO_X_UP : Matrix4.fromRotationTranslation(Matrix3.fromRotationY(CesiumMath.PI_OVER_TWO)),

        /**
         * Matrix used to convert from x-up to y-up
         *
         * @type {Matrix4}
         * @constant
         */
        X_UP_TO_Y_UP : Matrix4.fromRotationTranslation(Matrix3.fromRotationZ(CesiumMath.PI_OVER_TWO)),

        /**
         * Matrix used to convert from y-up to x-up
         *
         * @type {Matrix4}
         * @constant
         */
        Y_UP_TO_X_UP : Matrix4.fromRotationTranslation(Matrix3.fromRotationZ(-CesiumMath.PI_OVER_TWO)),

        /**
         * Gets the axis by name
         *
         * @param {String} name The name of the axis.
         * @returns {Number} The axis enum.
         */
        fromName : function(name) {
            //>>includeStart('debug', pragmas.debug);
            Check.typeOf.string('name', name);
            //>>includeEnd('debug');

            return Axis[name];
        }
    };

    return freezeObject(Axis);
});
