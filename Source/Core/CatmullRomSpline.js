/*global define*/
define([
        './DeveloperError',
        './Matrix4',
        './Cartesian3',
        './Cartesian4',
        './HermiteSpline'
    ],
    function(
        DeveloperError,
        Matrix4,
        Cartesian3,
        Cartesian4,
        HermiteSpline) {
    "use strict";

    /**
     * A Catmull-Rom spline is a cubic spline where the tangent at control points,
     * except the first and last, are computed using the previous and next control points.
     * Catmull-Rom splines are in the class C<sup>1</sup>.
     *
     * @alias CatmullRomSpline
     * @constructor
     *
     * @param {Array} controlPoints The array of control points. Each element of the array should be an object with <code>point</code> and <code>time</code> properties.
     * @param {Cartesian3} firstTangent The tangent of the curve at the first control point.
     * If the tangent is not given, it will be estimated.
     * @param {Cartesian3} lastTangent The tangent of the curve at the last control point.
     * If the tangent is not given, it will be estimated.
     *
     * @exception {DeveloperError} controlPoints is required.
     * @exception {DeveloperError} controlPoints must be an array of at least length 3.
     *
     * @see HermiteSpline
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
     * var spline = new CatmullRomSpline(controlPoints);
     */
    var CatmullRomSpline = function(controlPoints, firstTangent, lastTangent) {
        if (!controlPoints || !(controlPoints instanceof Array) || controlPoints.length < 3) {
            throw new DeveloperError('controlPoints is required and must be an array of objects with point and time properties, with a length of at least 3.');
        }

        this._points = controlPoints;
        this._lastTimeIndex = 0;

        if (typeof firstTangent !== 'undefined') {
            this._ti = Cartesian3.clone(firstTangent);
        } else {
            var controlPoint0 = Cartesian3.clone(controlPoints[0].point);
            var controlPoint1 = Cartesian3.clone(controlPoints[1].point);
            var controlPoint2 = Cartesian3.clone(controlPoints[2].point);

            this._ti = controlPoint1
                           .multiplyByScalar(2.0)
                           .subtract(controlPoint2)
                           .subtract(controlPoint0)
                           .multiplyByScalar(0.5);
        }

        if (typeof lastTangent !== 'undefined') {
            this._to = Cartesian3.clone(lastTangent);
        } else {
            var n = controlPoints.length - 1;

            var controlPointn0 = Cartesian3.clone(controlPoints[n].point);
            var controlPointn1 = Cartesian3.clone(controlPoints[n - 1].point);
            var controlPointn2 = Cartesian3.clone(controlPoints[n - 2].point);

            this._to = controlPointn0
                           .subtract(controlPointn1.multiplyByScalar(2.0))
                           .add(controlPointn2)
                           .multiplyByScalar(0.5);
        }
    };

    CatmullRomSpline.catmullRomCoefficientMatrix = new Matrix4(
            -0.5,  1.0, -0.5,  0.0,
             1.5, -2.5,  0.0,  1.0,
            -1.5,  2.0,  0.5,  0.0,
             0.5, -0.5,  0.0,  0.0);

    /**
     * Returns the array of control points.
     *
     * @memberof CatmullRomSpline
     * @return {Array} The array of control points.
     */
    CatmullRomSpline.prototype.getControlPoints = function() {
        return this._points;
    };

    /**
     * Returns the tangent of the first control point.
     *
     * @memberof CatmullRomSpline
     *
     * @return {Cartesian3} The tangent of the first control point.
     *
     * @see CatmullRomSpline#getEndTangent
     */
    CatmullRomSpline.prototype.getStartTangent = function() {
        return this._ti;
    };

    /**
     * Returns the tangent of the last control point.
     *
     * @memberof CatmullRomSpline
     *
     * @return {Cartesian3} The tangent of the last control point.
     *
     * @see CatmullRomSpline#getStartTangent
     */
    CatmullRomSpline.prototype.getEndTangent = function() {
        return this._to;
    };

    CatmullRomSpline.prototype._findIndex = function(time) {
        // Take advantage of temporal coherence by checking current, next and previous intervals
        // for containment of time.
        var i = this._lastTimeIndex || 0;
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

    /**
     * Evaluates the curve at a given time.
     *
     * @memberof CatmullRomSpline
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
     * var spline = new CatmullRomSpline(controlPoints);
     *
     * // some position above Los Angeles
     * var position = spline.evaluate(5.0);
     */
    CatmullRomSpline.prototype.evaluate = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        if (time < this._points[0].time || time > this._points[this._points.length - 1].time) {
            throw new DeveloperError('time is out of range.');
        }

        var i = this._findIndex(time);
        var u = (time - this._points[i].time) / (this._points[i + 1].time - this._points[i].time);

        var timeVec = new Cartesian3(0.0, u * u, u);
        timeVec.x = timeVec.y * u;

        var p0, p1, p2, p3, coefs;
        if (i === 0) {
            p0 = this._points[0].point;
            p1 = this._points[1].point;
            p2 = this._ti;
            p3 = this._points[2].point.subtract(p0).multiplyByScalar(0.5);
            coefs = HermiteSpline.hermiteCoefficientMatrix.multiplyByPoint(timeVec);
        } else if (i === this._points.length - 2) {
            p0 = this._points[i].point;
            p1 = this._points[i + 1].point;
            p2 = p1.subtract(this._points[i - 1].point).multiplyByScalar(0.5);
            p3 = this._to;
            coefs = HermiteSpline.hermiteCoefficientMatrix.multiplyByPoint(timeVec);
        } else {
            p0 = this._points[i - 1].point;
            p1 = this._points[i].point;
            p2 = this._points[i + 1].point;
            p3 = this._points[i + 2].point;
            coefs = CatmullRomSpline.catmullRomCoefficientMatrix.multiplyByPoint(timeVec);
        }
        p0 = p0.multiplyByScalar(coefs.x);
        p1 = p1.multiplyByScalar(coefs.y);
        p2 = p2.multiplyByScalar(coefs.z);
        p3 = p3.multiplyByScalar(coefs.w);

        return p0.add(p1.add(p2.add(p3)));
    };

    return CatmullRomSpline;
});
