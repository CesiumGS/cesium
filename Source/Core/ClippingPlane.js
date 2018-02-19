define([
        './Cartesian3',
        './Check',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Plane'
    ], function(
        Cartesian3,
        Check,
        defined,
        defineProperties,
        DeveloperError,
        Plane
    ) {
    'use strict';

    /**
     * A Plane in Hessian Normal form to be used with ClippingPlaneCollection.
     * Compatible with mathematics functions in Plane.js
     *
     * @constructor
     *
     * @param {Cartesian3} normal The plane's normal (normalized).
     * @param {Number} distance The shortest distance from the origin to the plane.  The sign of
     * <code>distance</code> determines which side of the plane the origin
     * is on.  If <code>distance</code> is positive, the origin is in the half-space
     * in the direction of the normal; if negative, the origin is in the half-space
     * opposite to the normal; if zero, the plane passes through the origin.
     * @param {Function} onChangeCallback Callback to take the Plane's index on update.
     */
    function ClippingPlane(normal, distance, onChangeCallback) {
        this._plane = new Plane(normal, distance);
        this.onChangeCallback = onChangeCallback;
        this.index = -1; // to be set by ClippingPlaneCollection
    }

    defineProperties(ClippingPlane.prototype, {
        /**
         * The shortest distance from the origin to the plane.  The sign of
         * <code>distance</code> determines which side of the plane the origin
         * is on.  If <code>distance</code> is positive, the origin is in the half-space
         * in the direction of the normal; if negative, the origin is in the half-space
         * opposite to the normal; if zero, the plane passes through the origin.
         *
         * Assumes access will necessitate
         *
         * @type {Number}
         */
        distance : {
            get : function() {
                return this._plane.distance;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.number('value', value);
                //>>includeEnd('debug');
                if (defined(this.onChangeCallback) && value !== this._plane.distance) {
                    this.onChangeCallback(this.index);
                }
                this._plane.distance = value;
            }
        },
        /**
         * The plane's normal.
         *
         * @type {Cartesian3}
         */
        normal : {
            get : function() {
                return this._plane.normal;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                Check.typeOf.object('value', value);
                //>>includeEnd('debug');
                if (defined(this.onChangeCallback) && !Cartesian3.equals(this._plane.normal, value)) {
                    this.onChangeCallback(this.index);
                }
                Cartesian3.clone(value, this._plane.normal);
            }
        }
    });

    /**
     * Create a ClippingPlane from a Plane object.
     *
     * @param {Plane} plane The plane containing parameters to copy
     * @param {ClippingPlane} [result] The object on which to store the result
     * @returns {ClippingPlane} The ClippingPlane generated from the plane's parameters.
     */
    ClippingPlane.fromPlane = function(plane, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('plane', plane);
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new ClippingPlane(plane.normal, plane.distance);
        } else {
            result.normal = plane.normal;
            result.distance = plane.distance;
        }
        return result;
    };

    /**
     *
     * @param {*} clippingPlane
     * @param {*} result
     */
    ClippingPlane.toPlane = function(clippingPlane, result) {
        if (!defined(result)) {
            result = new Plane(Cartesian3.UNIT_X, 0.0);
        }
        return Plane.clone(clippingPlane._plane, result);
    };

    ClippingPlane.clone = function(clippingPlane, result) {
        if (!defined(result)) {
            return new ClippingPlane(clippingPlane.normal, clippingPlane.distance);
        }
        result.normal = Cartesian3.clone(clippingPlane.normal, result.normal);
        result.distance = clippingPlane.distance;
        return result;
    };

    return ClippingPlane;
});
