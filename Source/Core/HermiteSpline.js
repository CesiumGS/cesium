/*global define*/
define(['./defaultValue',
        './DeveloperError',
        './Matrix4',
        './Cartesian4',
        './TridiagonalSystemSolver'
        ], function(
                defaultValue,
                DeveloperError,
                Matrix4,
                Cartesian4,
                TridiagonalSystemSolver) {
    "use strict";

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
     * @param {Array} controlPoints An array, of at least length 3, of objects with <code>point</code>,
     * <code>time</code>, and <code>tangent</code> properties.
     *
     * @exception {DeveloperError} controlPoints is required.
     * @exception {DeveloperError} controlPoints must be an array of at least length 3.
     *
     * @see CatmullRomSpline
     *
     * @example
     * // Example 1.
     * // Create a natural cubic spline above the earth from Philadelphia to Los Angeles.
     * var controlPoints = [
     *     {point: new Cartesian3(1235398.0, -4810983.0, 4146266.0), time: 0.0},
     *     {point: new Cartesian3(1372574.0, -5345182.0, 4606657.0), time: 1.5},
     *     {point: new Cartesian3(-757983.0, -5542796.0, 4514323.0), time: 3.0},
     *     {point: new Cartesian3(-2821260.0, -5248423.0, 4021290.0), time: 4.5},
     *     {point: new Cartesian3(-2539788.0, -4724797.0, 3620093.0), time: 6.0}
     * ];
     * var spline = new HermiteSpline(controlPoints);
     *
     * // Example 2.
     * // Create a Catmull-Rom spline above the earth from Philadelphia to Los Angeles.
     * var controlPoints = [
     *     {point: new Cartesian3(1235398.0, -4810983.0, 4146266.0), time: 0.0},
     *     {point: new Cartesian3(1372574.0, -5345182.0, 4606657.0), time: 1.5},
     *     {point: new Cartesian3(-757983.0, -5542796.0, 4514323.0), time: 3.0},
     *     {point: new Cartesian3(-2821260.0, -5248423.0, 4021290.0), time: 4.5},
     *     {point: new Cartesian3(-2539788.0, -4724797.0, 3620093.0), time: 6.0}
     * ];
     *
     * // Add tangents
     * controlPoints[0].tangent = new Cartesian3(1125196, -161816, 270551);
     * for (var i = 1; i < controlPoints.length - 1; ++i) {
     *     controlPoints[i].tangent = controlPoints[i + 1].point.subtract(controlPoints[i - 1].point).multiplyByScalar(0.5);
     * }
     * controlPoints[controlPoints.length - 1].tangent = new Cartesian3(1165345, 112641, 47281);
     *
     * var spline = new HermiteSpline(controlPoints);
     */
    var HermiteSpline = function(controlPoints) {
        if (typeof controlPoints === 'undefined' || !(controlPoints instanceof Array) || controlPoints.length < 3) {
            throw new DeveloperError('controlPoints is required. It must be an array with at least a length of 3.');
        }

        this._points = controlPoints;

        this._lastTimeIndex = 0;

        if (typeof this._points[0].tangent === 'undefined' || typeof this._points[this._points.length - 1].tangent === 'undefined') {
            this._generateNatural();
        } else if (typeof this._points[0].tangent !== 'undefined' && typeof this._points[1].tangent === 'undefined' && typeof this._points[this._points.length - 1].tangent !== 'undefined' && typeof this._points[this._points.length - 2].tangent === 'undefined') {
            this._generateClamped();
        }
    };

    HermiteSpline.hermiteCoefficientMatrix = new Matrix4(
             2.0, -3.0,  0.0,  1.0,
            -2.0,  3.0,  0.0,  0.0,
             1.0, -2.0,  1.0,  0.0,
             1.0, -1.0,  0.0,  0.0);

    HermiteSpline.prototype._findIndex = function(time) {
        // Take advantage of temporal coherence by checking current, next and previous intervals
        // for containment of time.
        var i = defaultValue(this._lastTimeIndex, 0);
        if (time >= this._points[i].time) {
            if (i + 1 < this._points.length && time < this._points[i + 1].time) {
                return i;
            } else if (i + 2 < this._points.length && time < this._points[i + 2].time) {
                this._lastTimeIndex = i + 1;
                return this._lastTimeIndex;
            }
        } else if (i - 1 >= 0 && time >= this._points[i - 1].time) {
            this._lastTimeIndex = i - 1;
            return this._lastTimeIndex;
        }

        // The above failed so do a linear search. For the use cases so far, the
        // length of the list is less than 10. In the future, if there is a bottle neck,
        // it might be here.
        for (i = 0; i < this._points.length - 1; ++i) {
            if (time >= this._points[i].time && time < this._points[i + 1].time) {
                break;
            }
        }

        if (i === this._points.length - 1) {
            i = this._points.length - 2;
        }

        this._lastTimeIndex = i;
        return this._lastTimeIndex;
    };

    HermiteSpline.prototype._generateClamped = function() {
        var l = [], d = [], u = [], r = [];
        l.length = u.length = this._points.length - 1;
        d.length = r.length = this._points.length;

        var i;
        l[0] = d[0] = 1.0;
        u[0] = 0.0;
        r[0] = this._points[0].tangent;
        for (i = 1; i < l.length - 1; ++i) {
            l[i] = u[i] = 1.0;
            d[i] = 4.0;
            r[i] = this._points[i + 1].point.subtract(this._points[i - 1].point).multiplyByScalar(3.0);
        }
        l[i] = 0.0;
        u[i] = 1.0;
        d[i] = 4.0;
        r[i] = this._points[i + 1].point.subtract(this._points[i - 1].point).multiplyByScalar(3.0);
        d[i + 1] = 1.0;
        r[i + 1] = this._points[i + 1].tangent;

        var tangents = TridiagonalSystemSolver.solve(l, d, u, r);
        for (i = 0; i < this._points.length; ++i) {
            this._points[i].tangent = tangents[i];
        }
    };

    HermiteSpline.prototype._generateNatural = function() {
        var l = [], d = [], u = [], r = [];
        l.length = u.length = this._points.length - 1;
        d.length = r.length = this._points.length;

        var i;
        l[0] = u[0] = 1.0;
        d[0] = 2.0;
        r[0] = this._points[1].point.subtract(this._points[0].point).multiplyByScalar(3.0);
        for (i = 1; i < l.length; ++i) {
            l[i] = u[i] = 1.0;
            d[i] = 4.0;
            r[i] = this._points[i + 1].point.subtract(this._points[i - 1].point).multiplyByScalar(3.0);
        }
        d[i] = 2.0;
        r[i] = this._points[i].point.subtract(this._points[i - 1].point).multiplyByScalar(3.0);

        var tangents = TridiagonalSystemSolver.solve(l, d, u, r);
        for (i = 0; i < this._points.length; ++i) {
            this._points[i].tangent = tangents[i];
        }
    };

    /**
     * Returns the array of control points.
     *
     * @memberof HermiteSpline
     * @return {Array} The array of control points.
     */
    HermiteSpline.prototype.getControlPoints = function() {
        return this._points;
    };

    /**
     * Evaluates the curve at a given time.
     *
     * @memberof HermiteSpline
     *
     * @param {Number} time The time at which to evaluate the curve.
     *
     * @exception {DeveloperError} time is required.
     * @exception {DeveloperError} time must be in the range <code>[a<sub>0</sub>, a<sub>n</sub>]</code>,
     * where <code>a<sub>0</sub></code> and <code>a<sub>n</sub></code> are the time properties of first and
     * last elements in the array given during construction, respectively.
     *
     * @return {Cartesian3} The point on the curve at the given <code>time</code>.
     *
     * @example
     * // spline above the earth from Philadelphia to Los Angeles
     * var controlPoints = [
     *     {point: new Cartesian3(1235398.0, -4810983.0, 4146266.0), time: 0.0},
     *     {point: new Cartesian3(1372574.0, -5345182.0, 4606657.0), time: 1.5},
     *     {point: new Cartesian3(-757983.0, -5542796.0, 4514323.0), time: 3.0},
     *     {point: new Cartesian3(-2821260.0, -5248423.0, 4021290.0), time: 4.5},
     *     {point: new Cartesian3(-2539788.0, -4724797.0, 3620093.0), time: 6.0}
     * ];
     * var spline = new HermiteSpline(controlPoints);
     *
     * // some position above Los Angeles
     * var position = spline.evaluate(5.0);
     */
    HermiteSpline.prototype.evaluate = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        if (time < this._points[0].time || time > this._points[this._points.length - 1].time) {
            throw new DeveloperError('time is out of range.');
        }

        var i = this._findIndex(time);
        var u = (time - this._points[i].time) / (this._points[i + 1].time - this._points[i].time);

        var timeVec = new Cartesian4(0.0, u * u, u);
        timeVec.x = timeVec.y * u;

        var coefs = HermiteSpline.hermiteCoefficientMatrix.multiplyByPoint(timeVec);
        var p0 = this._points[i].point.multiplyByScalar(coefs.x);
        var p1 = this._points[i + 1].point.multiplyByScalar(coefs.y);
        var p2 = this._points[i].tangent.multiplyByScalar(coefs.z);
        var p3 = this._points[i + 1].tangent.multiplyByScalar(coefs.w);

        return p0.add(p1.add(p2.add(p3)));
    };

    return HermiteSpline;
});
