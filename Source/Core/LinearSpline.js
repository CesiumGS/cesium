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
     * @param {Array} options.times The array of control point times.
     * @param {Array} options.points The array of control points.
     *
     * @exception {DeveloperError} points is required.
     * @exception {DeveloperError} points.length must be greater than or equal to 2.
     * @exception {DeveloperError} times is required.
     * @exception {DeveloperError} times.length must be equal to points.length.
     *
     * @example
     * var spline = new LinearSpline({
     *     times : [ 0.0, 1.5, 3.0, 4.5, 6.0 ],
     *     points : [
     *         new Cartesian3(1235398.0, -4810983.0, 4146266.0),
     *         new Cartesian3(1372574.0, -5345182.0, 4606657.0),
     *         new Cartesian3(-757983.0, -5542796.0, 4514323.0),
     *         new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
     *         new Cartesian3(-2539788.0, -4724797.0, 3620093.0)
     *     ]
     * });
     */
    var LinearSpline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var points = options.points;
        var times = options.times;

        if (!defined(points)) {
            throw new DeveloperError('points is required.');
        }

        if (points.length < 2) {
            throw new DeveloperError('points.length must be greater than or equal to 2.');
        }

        if (!defined(times)) {
            throw new DeveloperError('times is required.');
        }

        if (times.length !== points.length) {
            throw new DeveloperError('times.length must be equal to points.length.');
        }

        /**
         * An array of times for the control points.
         * @type {Array}
         * @readonly
         */
        this.times = times;

        /**
         * An array of {@link Cartesian3} control points.
         * @type {Array}
         * @readonly
         */
        this.points = points;

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

        var i = this._lastTimeIndex = this.findTimeInterval(time, this._lastTimeIndex);
        var u = (time - times[i]) / (times[i + 1] - times[i]);

        if (!defined(result)) {
            result = new Cartesian3();
        }

        return Cartesian3.lerp(points[i], points[i + 1], u, result);
    };

    return LinearSpline;
});
