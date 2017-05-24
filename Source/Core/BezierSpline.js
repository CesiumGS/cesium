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

    /**
     * A spline of a series of Bezier curves. Positions, incoming control points, outgoing control points,
     * and times must be defined for each point. The outgoing control points are defined for points [0, n - 2] and the incoming
     * control points are defined for points [1, n - 1]. For example, when interpolating a segment of the curve between <code>points[i]</code> and
     * <code>points[i + 1]</code>, the control points at those points will be <code>outControlPoints[i]</code> and <code>inControlPoints[i]</code>,
     * respectively.
     * <p>
     * To create a curve that is in the class C<sup>1</sup>, ensure that <code>inControlPoints[i] = -outControlPoints[i]</code> for
     * <code>0 &lt; i &lt; n</code> where <code>n</code> is the length of both incoming and outgoing control points.
     * </p>
     *
     * @alias BezierSpline
     * @constructor
     *
     * @param {Array} options.times An array of strictly increasing, unit-less, floating-point times at each point.
     *                The values are in no way connected to the clock time. They are the parameterization for the curve.
     * @param {Array} options.points An array of {@link Cartesian3} points.
     * @param {Array} options.inControlPoints An array of {@link Cartesian3} incoming control points.
     * @param {Array} options.outControlPoints An array of {@link Cartesian3} outgoing control points.
     *
     * @exception {DeveloperError} times, points, inControlPoints, and outControlPoints are required.
     * @exception {DeveloperError} points.length must be greater than or equal to 2.
     * @exception {DeveloperError} times and points must have the same length.
     * @exception {DeveloperError} inControlPoints and outControlPoints must have length equal to points.length - 1.
     *
     * @see BSpline
     * @see HermiteSpline
     * @see CatmullRomSpline
     * @see LinearSpline
     * @see QuaternionSpline
     *
     * @example
     * var spline = new Cesium.BezierSpline({
     *     times : [0.0, 1.0, 2.0],
     *     points : [
     *         new Cesium.Cartesian3(0.0, 0.0, 0.0),
     *         new Cesium.Cartesian3(3.0, 0.0, 2.0),
     *         new Cesium.Cartesian3(7.0, 3.0, 3.0)
     *     ],
     *     outControlPoints : [
     *         new Cesium.Cartesian3(1.0, 1.0, 1.0),
     *         new Cesium.Cartesian3(-2.0, 1.0, -1.0)
     *     ],
     *     inControlPoints : [
     *         new Cesium.Cartesian3(2.0, -1.0, 1.0),
     *         new Cesium.Cartesian3(6.0, -1.0, 2.0)
     *     ]
     * });
     *
     * var p0 = spline.evaluate(times[i]);         // equal to positions[i]
     * var p1 = spline.evaluate(times[i] + delta); // interpolated value when delta < times[i + 1] - times[i]
     */
    var BezierSpline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var times = options.times;
        var points = options.points;
        var inControlPoints = options.inControlPoints;
        var outControlPoints = options.outControlPoints;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(times) || !defined(points) || !defined(inControlPoints) || !defined(outControlPoints)) {
            throw new DeveloperError('times, points, inControlPoints, and outControlPoints are required.');
        }
        if (points.length < 2) {
            throw new DeveloperError('points.length must be greater than or equal to 2.');
        }
        if (times.length !== points.length) {
            throw new DeveloperError('times.length must be equal to points.length.');
        }
        if (inControlPoints.length !== outControlPoints.length || inControlPoints.length !== points.length - 1) {
            throw new DeveloperError('inControlPoints and outControlPoints must have a length equal to points.length - 1.');
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

        /**
         * An array of {@link Cartesian3} incoming control points.
         * @type {Array}
         * @readonly
         */
        this.inControlPoints = inControlPoints;

        /**
         * An array of {@link Cartesian3} outgoing control points.
         * @type {Array}
         * @readonly
         */
        this.outControlPoints = outControlPoints;

        this._lastTimeIndex = 0;
    };

    BezierSpline.bezierCoefficientMatrix = new Matrix4(
            -1.0,  3.0, -3.0, 1.0,
             3.0, -6.0,  3.0, 0.0,
            -3.0,  3.0,  0.0, 0.0,
             1.0,  0.0,  0.0, 0.0);

    /**
     * Finds an index <code>i</code> in <code>times</code> such that the parameter
     * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
     * @memberof BezierSpline
     *
     * @param {Number} time The time.
     * @returns {Number} The index for the element at the start of the interval.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    BezierSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

    var scratchTimeVec = new Cartesian4();
    var scratchTemp = new Cartesian3();

    /**
     * Evaluates the curve at a given time.
     * @memberof BezierSpline
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
    BezierSpline.prototype.evaluate = function(time, result) {
        var points = this.points;
        var times = this.times;
        var inControlPoints = this.inControlPoints;
        var outControlPoints = this.outControlPoints;

        var i = this._lastTimeIndex = this.findTimeInterval(time, this._lastTimeIndex);
        var u = (time - times[i]) / (times[i + 1] - times[i]);

        var timeVec = scratchTimeVec;
        timeVec.z = u;
        timeVec.y = u * u;
        timeVec.x = timeVec.y * u;

        var coefs = Matrix4.multiplyByPoint(BezierSpline.bezierCoefficientMatrix, timeVec, timeVec);

        result = Cartesian3.multiplyByScalar(points[i], coefs.x, result);
        Cartesian3.multiplyByScalar(outControlPoints[i], coefs.y, scratchTemp);
        Cartesian3.add(result, scratchTemp, result);
        Cartesian3.multiplyByScalar(inControlPoints[i], coefs.z, scratchTemp);
        Cartesian3.add(result, scratchTemp, result);
        Cartesian3.multiplyByScalar(points[i + 1], coefs.w, scratchTemp);
        return Cartesian3.add(result, scratchTemp, result);
    };

    return BezierSpline;
});
