/*global define*/
define([
        './defaultValue',
        './defined',
        './DeveloperError',
        './Cartesian3',
        './Matrix4',
        './Cartesian4',
        './Spline',
        './TridiagonalSystemSolver'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        Cartesian3,
        Matrix4,
        Cartesian4,
        Spline,
        TridiagonalSystemSolver) {
    "use strict";

    var scratchLower = [];
    var scratchDiagonal = [];
    var scratchUpper = [];
    var scratchRight = [];

    function generateClamped(points, firstTangent, lastTangent) {
        var l = scratchLower;
        var u = scratchUpper;
        var d = scratchDiagonal;
        var r = scratchRight;

        l.length = u.length = points.length - 1;
        d.length = r.length = points.length;

        var i;
        l[0] = d[0] = 1.0;
        u[0] = 0.0;

        var right = r[0];
        if (!defined(right)) {
            right = r[0] = new Cartesian3();
        }
        Cartesian3.clone(firstTangent, right);

        for (i = 1; i < l.length - 1; ++i) {
            l[i] = u[i] = 1.0;
            d[i] = 4.0;

            right = r[i];
            if (!defined(right)) {
                right = r[i] = new Cartesian3();
            }
            Cartesian3.subtract(points[i + 1], points[i - 1], right);
            Cartesian3.multiplyByScalar(right, 3.0, right);
        }

        l[i] = 0.0;
        u[i] = 1.0;
        d[i] = 4.0;

        right = r[i];
        if (!defined(right)) {
            right = r[i] = new Cartesian3();
        }
        Cartesian3.subtract(points[i + 1], points[i - 1], right);
        Cartesian3.multiplyByScalar(right, 3.0, right);

        d[i + 1] = 1.0;
        right = r[i + 1];
        if (!defined(right)) {
            right = r[i + 1] = new Cartesian3();
        }
        Cartesian3.clone(lastTangent, right);

        return TridiagonalSystemSolver.solve(l, d, u, r);
    }

    function generateNatural(points){
        var l = scratchLower;
        var u = scratchUpper;
        var d = scratchDiagonal;
        var r = scratchRight;

        l.length = u.length = points.length - 1;
        d.length = r.length = points.length;

        var i;
        l[0] = u[0] = 1.0;
        d[0] = 2.0;

        var right = r[0];
        if (!defined(right)) {
            right = r[0] = new Cartesian3();
        }
        Cartesian3.subtract(points[1], points[0], right);
        Cartesian3.multiplyByScalar(right, 3.0, right);

        for (i = 1; i < l.length; ++i) {
            l[i] = u[i] = 1.0;
            d[i] = 4.0;

            right = r[i];
            if (!defined(right)) {
                right = r[i] = new Cartesian3();
            }
            Cartesian3.subtract(points[i + 1], points[i - 1], right);
            Cartesian3.multiplyByScalar(right, 3.0, right);
        }

        d[i] = 2.0;

        right = r[i];
        if (!defined(right)) {
            right = r[i] = new Cartesian3();
        }
        Cartesian3.subtract(points[i], points[i - 1], right);
        Cartesian3.multiplyByScalar(right, 3.0, right);

        return TridiagonalSystemSolver.solve(l, d, u, r);
    }

    var scratchTimeVec = new Cartesian4();
    var scratchTemp = new Cartesian3();

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

        var tangents = spline.tangents;

        return function(time, result) {
            var i = spline._lastTimeIndex = spline.findTimeInterval(time, spline._lastTimeIndex);
            var u = (time - times[i]) / (times[i + 1] - times[i]);

            var timeVec = scratchTimeVec;
            timeVec.z = u;
            timeVec.y = u * u;
            timeVec.x = timeVec.y * u;

            var coefs = Matrix4.multiplyByPoint(HermiteSpline.hermiteCoefficientMatrix, timeVec, timeVec);

            result = Cartesian3.multiplyByScalar(points[i], coefs.x, result);
            Cartesian3.multiplyByScalar(points[i + 1], coefs.y, scratchTemp);
            Cartesian3.add(result, scratchTemp, result);
            Cartesian3.multiplyByScalar(tangents[i], coefs.z, scratchTemp);
            Cartesian3.add(result, scratchTemp, result);
            Cartesian3.multiplyByScalar(tangents[i + 1], coefs.w, scratchTemp);
            return Cartesian3.add(result, scratchTemp, result);
        };
    }

    /**
     * A Hermite spline is a cubic interpolating spline. Positions, tangents, and times must be defined
     * for each control point. If no tangents are specified by the control points, the end and interior
     * tangents are generated, creating a natural cubic spline. If the only tangents specified are at
     * the end control points, the interior tangents will be generated as well, creating a clamped cubic
     * spline. Otherwise, it is assumed that each control point defines a tangent at that point.
     *
     * Natural and clamped cubic splines are in the class C<sup>2</sup>.
     *
     * @alias HermiteSpline
     * @constructor
     *
     * @param {Array} options.times The array of control point times.
     * @param {Array} options.points The array of control points.
     * @param {Array} [options.tangents] The array of tangents at each control point.
     * @param {Cartesian3} [options.firstTangent] The tangent of the curve at the first control point.
     *                     If the tangent is not given, it will be estimated.
     * @param {Cartesian3} [options.lastTangent] The tangent of the curve at the last control point.
     *                     If the tangent is not given, it will be estimated.
     *
     * @exception {DeveloperError} points is required.
     * @exception {DeveloperError} points.length must be greater than or equal to 2.
     * @exception {DeveloperError} times is required.
     * @exception {DeveloperError} times.length must be equal to points.length.
     *
     * @see CatmullRomSpline
     *
     * @example
     * // Example 1.
     * // Create a natural cubic spline above the earth from Philadelphia to Los Angeles.
     * var spline = new HermiteSpline({
     *     times : [ 0.0, 1.5, 3.0, 4.5, 6.0 ],
     *     points : [
     *         new Cartesian3(1235398.0, -4810983.0, 4146266.0),
     *         new Cartesian3(1372574.0, -5345182.0, 4606657.0),
     *         new Cartesian3(-757983.0, -5542796.0, 4514323.0),
     *         new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
     *         new Cartesian3(-2539788.0, -4724797.0, 3620093.0)
     *     ]
     * });
     *
     * // Example 2.
     * // Create a Catmull-Rom spline above the earth from Philadelphia to Los Angeles.
     * var times = [ 0.0, 1.5, 3.0, 4.5, 6.0 ];
     * var points : [
     *     new Cartesian3(1235398.0, -4810983.0, 4146266.0),
     *     new Cartesian3(1372574.0, -5345182.0, 4606657.0),
     *     new Cartesian3(-757983.0, -5542796.0, 4514323.0),
     *     new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
     *     new Cartesian3(-2539788.0, -4724797.0, 3620093.0)
     * ];
     *
     * // Add tangents
     * var tangents = new Array(points.length);
     * tangents[0] = new Cartesian3(1125196, -161816, 270551);
     * for (var i = 1; i < tangents.length - 1; ++i) {
     *     tangents[i] = Cartesian3.multiplyByScalar(Cartesian3.subtract(controlPoints[i + 1].point, controlPoints[i - 1].point), 0.5);
     * }
     * tangents[tangents.length - 1] = new Cartesian3(1165345, 112641, 47281);
     *
     * var spline = new HermiteSpline({
     *     times : times,
     *     points : points,
     *     tangents : tangents
     * });
     */
    var HermiteSpline = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var points = options.points;
        var times = options.times;
        var tangents = options.tangents;
        var firstTangent = options.firstTangent;
        var lastTangent = options.lastTangent;

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

        if (!defined(tangents)) {
            if (defined(firstTangent) && defined(lastTangent)) {
                tangents = generateClamped(points, firstTangent, lastTangent);
            } else {
                tangents = generateNatural(points);
            }
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

        /**
         * An array of {@link Cartesian3} tangents at each control point.
         * @type {Array}
         * @readonly
         */
        this.tangents = tangents;

        this._evaluateFunction = createEvaluateFunction(this);
        this._lastTimeIndex = 0;
    };

    HermiteSpline.hermiteCoefficientMatrix = new Matrix4(
             2.0, -3.0,  0.0,  1.0,
            -2.0,  3.0,  0.0,  0.0,
             1.0, -2.0,  1.0,  0.0,
             1.0, -1.0,  0.0,  0.0);

    /**
     * Finds an index <code>i</code> in <code>times</code> such that the parameter
     * <code>time</code> is in the interval <code>[times[i], times[i + 1]]</code>.
     * @memberof HermiteSpline
     *
     * @param {Number} time The time.
     * @returns {Number} The index for the element at the start of the interval.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     */
    HermiteSpline.prototype.findTimeInterval = Spline.prototype.findTimeInterval;

    /**
     * Evaluates the curve at a given time.
     * @memberof HermiteSpline
     *
     * @param {Number} time The time at which to evaluate the curve.
     * @param {Cartesian3} [result] The object onto which to store the result.
     * @returns {Cartesian3} The modified result parameter or a new instance of the point on the curve at the given time.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[t<sub>0</sub>, t<sub>n</sub>]</code>, where <code>t<sub>0</sub></code>
     *                             is the first element in the array <code>times</code> and <code>t<sub>n</sub></code> is the last element
     *                             in the array <code>times</code>.
     *
     * @example
     * // spline above the earth from Philadelphia to Los Angeles
     * var spline = new HermiteSpline({
     *     times : [ 0.0, 1.5, 3.0, 4.5, 6.0 ],
     *     points : [
     *         new Cartesian3(1235398.0, -4810983.0, 4146266.0),
     *         new Cartesian3(1372574.0, -5345182.0, 4606657.0),
     *         new Cartesian3(-757983.0, -5542796.0, 4514323.0),
     *         new Cartesian3(-2821260.0, -5248423.0, 4021290.0),
     *         new Cartesian3(-2539788.0, -4724797.0, 3620093.0)
     *     ]
     * });
     *
     * // some position above Los Angeles
     * var position = spline.evaluate(5.0);
     */
    HermiteSpline.prototype.evaluate = function(time, result) {
        return this._evaluateFunction(time, result);
    };

    return HermiteSpline;
});
