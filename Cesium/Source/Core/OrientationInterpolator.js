/*global define*/
define([
        './DeveloperError',
        './Quaternion'
    ],
    function (
        DeveloperError,
        Quaternion) {
    "use strict";

    function OrientationInterpolator(controlPoints) {
        if (!controlPoints || !(controlPoints instanceof Array) || controlPoints.length < 2) {
            throw new DeveloperError("controlPoints is required. It must be an array with at least a length of 3.", "controlPoints");
        }

        this._points = controlPoints;
        this._lastTimeIndex = 0;
    }

    /**
     * Returns the array of control points.
     *
     * @memberof OrientationInterpolator
     * @return {Array} The array of control points.
     */
    OrientationInterpolator.prototype.getControlPoints = function() {
        return this._points;
    };

    OrientationInterpolator.prototype._findIndex = function(time) {
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

    OrientationInterpolator.prototype.evaluate = function(time) {
        if (typeof time === "undefined") {
            throw new DeveloperError("time is required.", "time");
        }

        if (time < this._points[0].time || time > this._points[this._points.length - 1].time) {
            throw new DeveloperError("time is out of range.", "time");
        }

        var i = this._findIndex(time);
        var u = (time - this._points[i].time) / (this._points[i + 1].time - this._points[i].time);

        return this._points[i].orientation.slerp(u, this._points[i + 1].orientation);
    };

    return OrientationInterpolator;
});