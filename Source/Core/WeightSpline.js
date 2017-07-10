/*global define*/
define([
    './defaultValue',
    './defined',
    './defineProperties',
    './DeveloperError',
    './Spline'
], function(
    defaultValue,
    defined,
    defineProperties,
    DeveloperError,
    Spline) {
    'use strict';

    /**
     * A spline that uses piecewise linear interpolation to create a curve.
     *
     * @alias WeightSpline
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Number[]} options.times An array of strictly increasing, unit-less, floating-point times at each point.
     *                The values are in no way connected to the clock time. They are the parameterization for the curve.
     * @param {Number[]} options.points The array of floating-point control points given
     *
     * @exception {DeveloperError} points.length must be greater than or equal to 2.
     * @exception {DeveloperError} times.length must be a factor of points.length.
     *
     *
     * @example
     * var times = [ 0.0, 1.5, 3.0, 4.5, 6.0 ];
     * var spline = new Cesium.WeightSpline({
     *     times : times,
     *     points : [
     *         [0.0, -1.0, 1.0],
     *         [0.5, -0.5, 0.5],
     *         [1.0, 0.0, 0.0],
     *         [0.5, 0.5, -0.5],
     *         [0.0, 1.0, -1.0]
     *     ]
     * });
     *
     * var p0 = spline.evaluate(times[0]);
     *
     * @see LinearSpline
     * @see HermiteSpline
     * @see CatmullRomSpline
     * @see QuaternionSpline
     */
    function WeightSpline(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var points = options.points;
        var times = options.times;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(points) || !defined(times)) {
            throw new DeveloperError('points and times are required.');
        }
        if (points.length < 2) {
            throw new DeveloperError('points.length must be greater than or equal to 2.');
        }
        if (points.length % times.length !== 0) {
            throw new DeveloperError('times.length must be a factor of points.length.');
        }
        //>>includeEnd('debug');

        this._times = times;
        this._points = points;
        this._count = points.length / times.length;

        this._lastTimeIndex = 0;
    }

    defineProperties(WeightSpline.prototype, {
        /**
         * An array of times for the control points.
         *
         * @memberof WeightSpline.prototype
         *
         * @type {Number[]}
         * @readonly
         */
        times : {
            get : function() {
                return this._times;
            }
        },

        /**
         * An array of floating-point array control points.
         *
         * @memberof WeightSpline.prototype
         *
         * @type {Number[][]}
         * @readonly
         */
        points : {
            get : function() {
                return this._points;
            }
        },

        /**
         * The number of control point sets provided
         *
         * @memberof WeightSpline.prototype
         *
         * @type {Number}
         * @readonly
         */
        count: {
            get: function() {
                return this._count;
            }
        }
    });

    /**
     * Finds an index <code>i</code> in <code>times</code> such that the parameter
     * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
     * @function
     *
     * @param {Number} time The time.
     * @returns {Number} The index for the element at the start of the interval.
     *
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    WeightSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

    /**
     * Evaluates the curve at a given time.
     *
     * @param {Number} time The time at which to evaluate the curve.
     * @param {Number[]} [result] The object onto which to store the result.
     * @returns {Number[]} The modified result parameter or a new instance of the point on the curve at the given time.
     *
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    WeightSpline.prototype.evaluate = function(time, result) {
        var points = this.points;
        var times = this.times;

        var i = this._lastTimeIndex = this.findTimeInterval(time, this._lastTimeIndex);
        var u = (time - times[i]) / (times[i + 1] - times[i]);

        if (!defined(result)) {
            result = [];
        }

        for (var j = 0; j < this.count; j++) {
            var index = (i * 2) + j;
            result[j] = points[index] * (1.0 - u) + points[index + 2] * (u);
        }

        return result;
    };

    return WeightSpline;
});
