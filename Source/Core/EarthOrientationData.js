/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './loadJson',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './TimeConstants',
        './Ellipsoid'
    ],
    function(
        defaultValue,
        DeveloperError,
        loadJson,
        CesiumMath,
        Matrix3,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        TimeConstants,
        Ellipsoid) {
    "use strict";

    var EarthOrientationData = {

        _eop : [],

        _dates : [],

        _ts_lastIndex : 0,

        clear : function() {
            EarthOrientationData._eop = [];
            EarthOrientationData._dates = [];
        },

        computeOrientationParameters : function(dateTai) {
            if (EarthOrientationData._eop.length === 0) {
                return new EarthOrientationData.OrientationParameterData(0, 0, 0, 0, 0);
            }

            var eop = EarthOrientationData;
            var before = 0;
            var after = 0;
            if (eop._ts_lastIndex < eop._eop.length) {
                if (eop._dates[eop._ts_lastIndex].lessThanOrEquals(dateTai) && (eop._ts_lastIndex === eop._dates.length - 1 || eop._dates[eop._ts_lastIndex + 1].greaterThanOrEquals(dateTai))) {
                    before = eop._ts_lastIndex;

                    if (before < eop._eop.length - 1 && eop._dates[before + 1].equals(dateTai)) {
                        ++before;
                    }
                    after = before + 1;

                    return EarthOrientationData.interpolateEopDates(dateTai, before, after);
                }
            }
            var index;// Binary search through _dates
            if (index >= 0) {
                // If the next entry is the same date, use the later entry.  This way, if two entries
                // describe the same moment, one before a leap second and the other after, then we will use
                // the post-leap second data.
                if (index < eop._eop.length - 1 && eop._dates[index + 1].equals(dateTai)) {
                    ++index;
                }
                before = index;
                after = index;
            } else {
                after = ~index;
                before = after - 1;

                // Use the first entry if the date requested is before the beginning of the data.
                if (before < 0) {
                    before = 0;
                }
            }

            eop._ts_lastIndex = before;

            return EarthOrientationData.interpolateEopDates(dateTai, before, after);

        },

        interpolateEopDates : function(desiredDate, before, after) {
            if (EarthOrientationData._eop.length === 0) {
                return new EarthOrientationData.OrientationParameterData(0, 0, 0, 0, 0);
            }

            var beforeDate = EarthOrientationData._dates[before];
            var afterDate = EarthOrientationData._dates[after];
            if (before === after || desiredDate.equals(beforeDate)) {
                return EarthOrientationData._eop[before];
            } else if (desiredDate.equals(afterDate)) {
                return EarthOrientationData._eop[after];
            }

            var factor = beforeDate.getSecondsDifference(desiredDate) / beforeDate.getSecondsDifference(afterDate);
            var xBefore = EarthOrientationData._eop[before];
            var xAfter = EarthOrientationData._eop[after];

            var linearInterp = function(dx, y1, y2) {
                return y1 + dx * (y2 - y1);
            };

            var ut1MinusUtc;
            // Handle UT1 leap second edge case
            var offsetDifference = xAfter.ut1MinusUtc - xBefore.ut1MinusUtc;
            if (offsetDifference > 0.5 || offsetDifference < -0.5) {
                // The absolute difference between the values is more than 0.5, so we may have
                // crossed a leap second.  Check if this is the case and, if so, adjust the
                // afterValue to account for the leap second.  This way, our interpolation will
                // produce reasonable results.
                if (xBefore.taiMinusUtc !== xAfter.taiMinusUtc) {
                    if (afterDate.equals(dateTai)) {
                        // If we are at the end of the leap second interval, take the second value
                        // Otherwise, the interpolation below will yield the wrong side of the
                        // discontinuity
                        // At the end of the leap second, we need to start accounting for the jump
                        ut1MinusUtc = xAfter.ut1MinusUtc;
                    } else {
                        //* Otherwise, remove the leap second so that the interpolation is correct
                        var newAfter = xAfter.ut1MinusUtc - xAfter.taiMinusUtc - xBefore.taiMinusUtc;
                        ut1MinusUtc = linearInterp(factor, xBefore.ut1MinusUtc, newAfter);
                    }
                } else {
                    ut1MinusUtc = linearInterp(factor, xBefore.ut1MinusUtc, xAfter.ut1MinusUtc);
                }
            }

            return new EarthOrientationData.OrientationParameterData(
                    linearInterp(factor, beforeData.xPoleWander, afterData.xPoleWander),
                    linearInterp(factor, beforeData.yPoleWander, afterData.yPoleWander),
                    linearInterp(factor, beforeData.xPoleOffset, afterData.xPoleOffset),
                    linearInterp(factor, beforeData.yPoleOffset, afterData.yPoleOffset),
                    ut1MinusUtc,
                    beforeData.taiMinusUtc);
        },

        loadOrientationParametersFromUrl : function(eopUrl) {

        },

        addOrientationParameterData : function(date, xVal, yVal, xPoleOffset, yPoleOffset, ut1MinusUtc, taiMinusUtc) {
            var newData = new EarthOrientationData.OrientationParameterData(xVal, yVal, xPoleOffset, yPoleOffset, ut1MinusUtc, taiMinusUtc);
            // right now, this doesn't sort
            // so if anything is assuming an ordered array and we insert out of order here...
            EarthOrientationData._eop.push(newData);
            EarthOrientationData._dates.push(date);
        },

        OrientationParameterData : function(xVal, yVal, xPoleOffset, yPoleOffset, ut1MinusUtc, taiMinusUtc) {
            this.xPoleWander = xVal;
            this.yPoleWander = yVal;
            this.xPoleOffset = xPoleOffset;
            this.yPoleOffset = yPoleOffset;
            this.ut1MinusUtc = ut1MinusUtc;
            this.taiMinusUtc = taiMinusUtc;
            //this.lengthOfDayCorrection
            //this.deltaPsiCorrection
            //this.deltaEpsilonCorrection
        }
    };

    return EarthOrientationData;
});