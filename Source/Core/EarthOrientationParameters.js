/*global define*/
define([
        './binarySearch',
        './loadJson',
        './EarthOrientationParametersSample',
        './JulianDate',
        './RuntimeError',
        '../ThirdParty/when'
    ],
    function(
        binarySearch,
        loadJson,
        EarthOrientationParametersSample,
        JulianDate,
        RuntimeError,
        when) {
    "use strict";

    var EarthOrientationParameters = function EarthOrientationParameters(url) {
        this._dates = undefined;
        this._samples = undefined;

        this._dateColumn = -1;
        this._xPoleWanderRadiansColumn = -1;
        this._yPoleWanderRadiansColumn = -1;
        this._ut1MinusUtcSecondsColumn = -1;
        this._xCelestialPoleOffsetRadiansColumn = -1;
        this._yCelestialPoleOffsetRadiansColumn = -1;
        this._utcMinusTaiSecondsColumn = -1;

        this._columnCount = 0;
        this._lastIndex = -1;

        this._downloadPromise = undefined;
        this._dataError = undefined;

        if (typeof url === 'undefined') {
            // Use all zeros for EOP data.
            onDataReady(this, {
                'columnNames' : ['dateIso8601','xPoleWanderRadians','yPoleWanderRadians','ut1MinusUtcSeconds','lengthOfDayCorrectionSeconds','xCelestialPoleOffsetRadians','yCelestialPoleOffsetRadians','utcMinusTaiSeconds'],
                'samples' : []
            });
        } else {
            // Download EOP data.
            var that = this;
            this._downloadPromise = when(loadJson(url), function(eopData) {
                onDataReady(that, eopData);
            }, function() {
                that._dataError = 'An error occurred while retrieving the EOP data from the URL ' + url + '.';
            });
        }
    };

    /**
     * Gets a promise that, when resolved, indicates that the EOP data has been loaded and is
     * ready to use.
     *
     * @memberof EarthOrientationParameters
     *
     * @returns {Promise} The promise.
     *
     * @see when
     */
    EarthOrientationParameters.prototype.getPromiseToLoad = function() {
        return when(this._downloadPromise);
    };

    EarthOrientationParameters.prototype.compute = function(dateTai, result) {
        // We cannot compute until the samples are available.
        if (typeof this._samples === 'undefined') {
            if (typeof this._dataError !== 'undefined') {
                throw new RuntimeError(this._dataError);
            }

            return undefined;
        }

        if (typeof result === 'undefined') {
            result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
        }

        if (this._samples.length === 0) {
            result.xPoleWander = 0.0;
            result.yPoleWander = 0.0;
            result.xPoleOffset = 0.0;
            result.yPoleOffset = 0.0;
            result.ut1MinusUtc = 0.0;
            return result;
        }

        var dates = this._dates;
        var lastIndex = this._lastIndex;

        var before = 0;
        var after = 0;
        if (typeof lastIndex !== 'undefined') {
            var previousIndexDate = dates[lastIndex];
            var nextIndexDate = dates[lastIndex + 1];
            var isAfterPrevious = previousIndexDate.lessThanOrEquals(dateTai);
            var isAfterLastSample = typeof nextIndexDate === 'undefined';
            var isBeforeNext = isAfterLastSample || nextIndexDate.greaterThanOrEquals(dateTai);

            if (isAfterPrevious && isBeforeNext) {
                before = lastIndex;

                if (!isAfterLastSample && nextIndexDate.equals(dateTai)) {
                    ++before;
                }
                after = before + 1;

                interpolate(this, dates, this._samples, dateTai, before, after, result);
                return result;
            }
        }

        var index = binarySearch(dates, dateTai, JulianDate.compare, this._dateColumn);
        if (index >= 0) {
            // If the next entry is the same date, use the later entry.  This way, if two entries
            // describe the same moment, one before a leap second and the other after, then we will use
            // the post-leap second data.
            if (index < dates.length - 1 && dates[index + 1].equals(dateTai)) {
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

        this._lastIndex = before;

        interpolate(this, dates, this._samples, dateTai, before, after, result);
        return result;
    };

    function onDataReady(eop, eopData) {
        if (typeof eopData.columnNames === 'undefined') {
            eop._dataError = 'Error in loaded EOP data: The columnNames property is required.';
            return;
        }

        if (typeof eopData.samples  === 'undefined') {
            eop._dataError = 'Error in loaded EOP data: The samples property is required.';
            return;
        }

        var dateColumn = eopData.columnNames.indexOf('dateIso8601');
        var xPoleWanderRadiansColumn = eopData.columnNames.indexOf('xPoleWanderRadians');
        var yPoleWanderRadiansColumn = eopData.columnNames.indexOf('yPoleWanderRadians');
        var ut1MinusUtcSecondsColumn = eopData.columnNames.indexOf('ut1MinusUtcSeconds');
        var xCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf('xCelestialPoleOffsetRadians');
        var yCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf('yCelestialPoleOffsetRadians');
        var utcMinusTaiSecondsColumn = eopData.columnNames.indexOf('utcMinusTaiSeconds');

        if (dateColumn < 0 || xPoleWanderRadiansColumn < 0 || yPoleWanderRadiansColumn < 0 || ut1MinusUtcSecondsColumn < 0 || xCelestialPoleOffsetRadiansColumn < 0 || yCelestialPoleOffsetRadiansColumn < 0 || utcMinusTaiSecondsColumn < 0) {
            eop._dataError = 'Error in loaded EOP data: The columnNames property must include dateIso8601, xPoleWanderRadians, yPoleWanderRadians, ut1MinusUtcSeconds, xCelestialPoleOffsetRadians, yCelestialPoleOffsetRadians, and utcMinusTaiSecondsColumn columns';
            return;
        }

        eop._samples = eopData.samples;
        eop._dates = [];

        eop._dateColumn = dateColumn;
        eop._xPoleWanderRadiansColumn = xPoleWanderRadiansColumn;
        eop._yPoleWanderRadiansColumn = yPoleWanderRadiansColumn;
        eop._ut1MinusUtcSecondsColumn = ut1MinusUtcSecondsColumn;
        eop._xCelestialPoleOffsetRadiansColumn = xCelestialPoleOffsetRadiansColumn;
        eop._yCelestialPoleOffsetRadiansColumn = yCelestialPoleOffsetRadiansColumn;
        eop._utcMinusTaiSecondsColumn = utcMinusTaiSecondsColumn;

        eop._columnCount = eopData.columnNames.length;
        eop._lastIndex = undefined;

        //var lastUtcMinusTai;
        var samples = eop._samples;
        var dates = eop._dates;

        // Convert the ISO8601 dates to JulianDates.
        for (var i = 0, len = samples.length; i < len; i += eop._columnCount) {
            dates.push(JulianDate.fromIso8601(samples[i + dateColumn]));

            // TODO: populate leap seconds from EOP
            /*var utcMinusTai = samples[i + utcMinusTaiSecondsColumn];
            if (utcMinusTai !== lastUtcMinusTai && typeof lastUtcMinusTai !== 'undefined') {
                // We crossed a leap second boundary

            }
            lastUtcMinusTai = utcMinusTai;*/
        }
    }

    function fillResultFromIndex(eop, samples, index, columnCount, result) {
        var start = index * columnCount;
        result.xPoleWander = samples[start + eop._xPoleWanderRadiansColumn];
        result.yPoleWander = samples[start + eop._yPoleWanderRadiansColumn];
        result.xPoleOffset = samples[start + eop._xCelestialPoleOffsetRadiansColumn];
        result.yPoleOffset = samples[start + eop._yCelestialPoleOffsetRadiansColumn];
        result.ut1MinusUtc = samples[start + eop._ut1MinusUtcSecondsColumn];
    }

    function linearInterp(dx, y1, y2) {
        return y1 + dx * (y2 - y1);
    }

    function interpolate(eop, dates, samples, date, before, after, result) {
        var columnCount = eop._columnCount;

        var beforeDate = dates[before];
        var afterDate = dates[after];
        if (beforeDate.equals(afterDate) || date.equals(beforeDate)) {
            fillResultFromIndex(eop, samples, before, columnCount, result);
            return result;
        } else if (date.equals(afterDate)) {
            fillResultFromIndex(eop, samples, after, columnCount, result);
            return result;
        }

        var factor = beforeDate.getSecondsDifference(date) /
                     beforeDate.getSecondsDifference(afterDate);

        var startBefore = before * columnCount;
        var startAfter = after * columnCount;

        // Handle UT1 leap second edge case
        var beforeUt1MinusUtc = samples[startBefore + eop._ut1MinusUtcSecondsColumn];
        var afterUt1MinusUtc = samples[startAfter + eop._ut1MinusUtcSecondsColumn];

        var offsetDifference = afterUt1MinusUtc - beforeUt1MinusUtc;
        if (offsetDifference > 0.5 || offsetDifference < -0.5) {
            // The absolute difference between the values is more than 0.5, so we may have
            // crossed a leap second.  Check if this is the case and, if so, adjust the
            // afterValue to account for the leap second.  This way, our interpolation will
            // produce reasonable results.
            var beforeTaiMinusUtc = samples[startBefore + eop._utcMinusTaiSecondsColumn];
            var afterTaiMinusUtc = samples[startAfter + eop._utcMinusTaiSecondsColumn];
            if (beforeTaiMinusUtc !== afterTaiMinusUtc) {
                if (afterDate.equals(date)) {
                    // If we are at the end of the leap second interval, take the second value
                    // Otherwise, the interpolation below will yield the wrong side of the
                    // discontinuity
                    // At the end of the leap second, we need to start accounting for the jump
                    beforeUt1MinusUtc = afterUt1MinusUtc;
                } else {
                    // Otherwise, remove the leap second so that the interpolation is correct
                    afterUt1MinusUtc -= afterTaiMinusUtc - beforeTaiMinusUtc;
                }
            }
        }

        result.xPoleWander = linearInterp(factor, samples[startBefore + eop._xPoleWanderRadiansColumn], samples[startAfter + eop._xPoleWanderRadiansColumn]);
        result.yPoleWander = linearInterp(factor, samples[startBefore + eop._yPoleWanderRadiansColumn], samples[startAfter + eop._yPoleWanderRadiansColumn]);
        result.xPoleOffset = linearInterp(factor, samples[startBefore + eop._xCelestialPoleOffsetRadiansColumn], samples[startAfter + eop._xCelestialPoleOffsetRadiansColumn]);
        result.yPoleOffset = linearInterp(factor, samples[startBefore + eop._yCelestialPoleOffsetRadiansColumn], samples[startAfter + eop._yCelestialPoleOffsetRadiansColumn]);
        result.ut1MinusUtc = linearInterp(factor, beforeUt1MinusUtc, afterUt1MinusUtc);
        return result;
    }

    return EarthOrientationParameters;
});