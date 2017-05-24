/*global define*/
define([
        './defaultValue',
        './defined',
        './Cartesian3',
        './Cartesian4',
        './DeveloperError',
        './Matrix4',
        './Spline'
    ], function(
        defaultValue,
        defined,
        Cartesian3,
        Cartesian4,
        DeveloperError,
        Matrix4,
        Spline) {
    "use strict";

    var scratchTimeVec = new Cartesian4();
    var scratchTemp0 = new Cartesian3();
    var scratchTemp1 = new Cartesian3();

    function createEvaluateFunction(spline) {
        var points = spline.points;
        var times = spline.times;

        if (points.length < 3) {
            var t0 = times[0];
            var invSpan = 1.0 / (times[1] - t0);

            var p0 = points[0];
            var p1 = points[1];

            return function(time, result) {
                var u = (time - t0) * invSpan;
                return Cartesian3.lerp(p0, p1, u, result);
            };
        }

        return function(time, result) {
            var i = spline._lastTimeIndex = spline.findTimeInterval(time, spline._lastTimeIndex);
            var u = (time - times[i]) / (times[i + 1] - times[i]);

            var timeVec = scratchTimeVec;
            timeVec.z = u;
            timeVec.y = u * u;
            timeVec.x = timeVec.y * u;

            var coefs = Matrix4.multiplyByPoint(BSpline.bSplineCoefficientMatrix, timeVec, timeVec);

            var p0;
            var p1;
            var p2;
            var p3;

            if (i === 0) {
                p1 = points[0];
                p2 = points[1];
                p3 = points[2];

                p0 = Cartesian3.subtract(p1, p2, scratchTemp0);
                Cartesian3.add(p0, p1, p0);
            } else if (i === points.length - 2) {
                p0 = points[i - 1];
                p1 = points[i];
                p2 = points[i + 1];

                p3 = Cartesian3.subtract(p2, p1, scratchTemp0);
                Cartesian3.add(p3, p2, p3);
            } else {
                p0 = points[i - 1];
                p1 = points[i];
                p2 = points[i + 1];
                p3 = points[i + 2];
            }

            result = Cartesian3.multiplyByScalar(p0, coefs.x, result);
            Cartesian3.multiplyByScalar(p1, coefs.y, scratchTemp1);
            Cartesian3.add(result, scratchTemp1, result);
            Cartesian3.multiplyByScalar(p2, coefs.z, scratchTemp1);
            Cartesian3.add(result, scratchTemp1, result);
            Cartesian3.multiplyByScalar(p3, coefs.w, scratchTemp1);
            return Cartesian3.add(result, scratchTemp1, result);
        };
    }

    /**
     * Creates a uniform, cubic B-spline (or Basis spline) from the given control points and times.
     *
     * @alias BSpline
     * @constructor
     *
     * @param {Array} options.times An array of strictly increasing, unit-less, floating-point times at each point.
     *                The values are in no way connected to the clock time. They are the parameterization for the curve.
     * @param {Array} options.points An array of {@link Cartesian3} points.
     *
     * @exception {DeveloperError} times and points are required.
     * @exception {DeveloperError} points.length must be greater than or equal to 2.
     * @exception {DeveloperError} times and points must have the same length.
     *
     * @see BezierSpline
     * @see HermiteSpline
     * @see CatmullRomSpline
     * @see LinearSpline
     * @see QuaternionSpline
     *
     * @example
     * var spline = new Cesium.BSpline({
     *     times : times,
     *     points : positions
     * });
     *
     * var p0 = spline.evaluate(times[i]);         // equal to positions[i]
     * var p1 = spline.evaluate(times[i] + delta); // interpolated value when delta < times[i + 1] - times[i]
     */
    var BSpline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var times = options.times;
        var points = options.points;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(times) || !defined(points)) {
            throw new DeveloperError('times and points are required.');
        }
        if (points.length < 2) {
            throw new DeveloperError('points.length must be greater than or equal to 2.');
        }
        if (times.length !== points.length) {
            throw new DeveloperError('times.length must be equal to points.length.');
        }
        //>>includeEnd('debug');

        /**
         * An array of times for the control points.
         * @type {Array}
         * @readonly
         */
        this.times = times;

        /**
         * An array of {@link Cartesian3} points.
         * @type {Array}
         * @readonly
         */
        this.points = points;

        this._evaluateFunction = createEvaluateFunction(this);
        this._lastTimeIndex = 0;
    };

    BSpline.bSplineCoefficientMatrix = new Matrix4(
            -1.0,  3.0, -3.0, 1.0,
             3.0, -6.0,  0.0, 4.0,
            -3.0,  3.0,  3.0, 1.0,
             1.0,  0.0,  0.0, 0.0);
    Matrix4.multiplyByScalar(BSpline.bSplineCoefficientMatrix, 1.0 / 6.0, BSpline.bSplineCoefficientMatrix);

    /**
     * Finds an index <code>i</code> in <code>times</code> such that the parameter
     * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
     * @memberof BSpline
     *
     * @param {Number} time The time.
     * @returns {Number} The index for the element at the start of the interval.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    BSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

    /**
     * Evaluates the curve at a given time.
     * @memberof BSpline
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
    BSpline.prototype.evaluate = function(time, result) {
        return this._evaluateFunction(time, result);
    };

    return BSpline;
});
