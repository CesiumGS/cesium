/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './Spline',
        './Cartesian3'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Spline,
        Cartesian3) {
    "use strict";

    /**
     * A spline that uses piecewise linear interpolation to create a curve.
     *
     * @alias LinearSpline
     * @constructor
     *
     * @param {Array} options.points The array of control points.
     * @param {Array} options.times The array of control point times.
     *
     * @exception {DeveloperError} points is required.
     * @exception {DeveloperError} points.length must be greater than or equal to 3.
     * @exception {DeveloperError} times is required.
     * @exception {DeveloperError} times.length must be equal to points.length.
     */
    var LinearSpline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var points = options.points;
        var times = options.times;

        if (!defined(points)) {
            throw new DeveloperError('points is required.');
        }

        if (points.length < 3) {
            throw new DeveloperError('points.length must be greater than or equal to 3.');
        }

        if (!defined(times)) {
            throw new DeveloperError('times is required.');
        }

        if (times.length !== points.length) {
            throw new DeveloperError('times.length must be equal to points.length.');
        }

        /**
         * An array of {@link Cartesian3} control points.
         * @type {Array}
         */
        this.points = points;

        /**
         * An array of times for the control points.
         * @type {Array}
         */
        this.times = times;

        this._lastTimeIndex = 0;
    };

    /**
     * Finds an index <code>i</code> in <code>times</code> such that the parameter
     * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
     * @memberof QuaternionSpline
     *
     * @param {Number} time The time.
     * @returns {Number} The index for the element at the start of the interval.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    LinearSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

    /**
     * Evaluates the curve at a given time.
     * @memberof LinearSpline
     *
     * @param {Number} time The time at which to evaluate the curve.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new instance of the point on the curve at the given time.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    LinearSpline.prototype.evaluate = function(time, result) {
        var points = this.points;
        var times = this.times;

        var i = this.findTimeInterval(time);
        var u = (time - times[i]) / (times[i + 1] - times[i]);

        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.lerp(points[i], points[i + 1], u);
    };

    return LinearSpline;
});
