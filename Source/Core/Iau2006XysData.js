/*global define*/
define([
        'require',
        './defaultValue',
        './loadJson',
        './JulianDate',
        './TimeStandard',
        '../ThirdParty/when'
    ],
    function(
        require,
        defaultValue,
        loadJson,
        JulianDate,
        TimeStandard,
        when) {
    "use strict";

    /**
     *
     */
    var Iau2006XysData = function Iau2006XysData(description) {
        description = description || {};

        // TODO: what should the default value of this URL really be?
        //       @shunter says there's a better thing to use in the simple widget branch.
        this._xysFileUrlTemplate = defaultValue(description.xysFileUrlTemplate, require.toUrl('Assets/IAU2006_XYS/IAU2006_XYS_{0}.dat'));
        this._interpolationOrder = defaultValue(description.interpolationOrder, 9);
        this._sampleZeroJulianEphemerisDate = defaultValue(description.sampleZeroJulianEphemerisDate, 2442396.5);
        this._sampleZeroDateTT = new JulianDate(this._sampleZeroJulianEphemerisDate, 0.0, TimeStandard.TAI);
        this._stepSizeDays = defaultValue(description.stepSizeDays, 1.0);
        this._samplesPerXysFile = defaultValue(description.samplesPerXysFile, 1000);
        this._totalSamples = defaultValue(description.totalSamples, 27426);
        this._samples = new Array(this._totalSamples * 3);
        this._chunkDownloadsInProgress = [];

        var order = this._interpolationOrder;

        // Compute denominators and X values for interpolation.
        var denom = this._denominators = new Array(order + 1);
        var xTable = this._xTable = new Array(order + 1);

        var stepN = Math.pow(this._stepSizeDays, order);

        for (var i = 0; i <= order; ++i) {
            denom[i] = stepN;
            xTable[i] = i * this._stepSizeDays;

            for (var j = 0; j <= order; ++j) {
                if (j !== i) {
                    denom[i] *= (i - j);
                }
            }

            denom[i] = 1.0 / denom[i];
        }

        // Allocate scratch arrays for interpolation.
        this._work = new Array(order + 1);
        this._coef = new Array(order + 1);
    };

    var julianDateScratch = new JulianDate(0, 0.0, TimeStandard.TAI);

    Iau2006XysData.prototype.computeXysRadians = function(dayTT, secondTT, result) {
        var dateTT = julianDateScratch;
        dateTT._julianDayNumber = dayTT;
        dateTT._secondsOfDay = secondTT;

        var daysSinceEpoch = this._sampleZeroDateTT.getDaysDifference(dateTT);
        if (daysSinceEpoch < 0.0) {
            // Can't evaluate prior to the epoch of the data.
            return undefined;
        }

        var centerIndex = (daysSinceEpoch / this._stepSizeDays) | 0;
        if (centerIndex >= this._totalSamples) {
            // Can't evaluate after the last sample in the data.
            return undefined;
        }

        var degree = this._interpolationOrder;

        var firstIndex = centerIndex - ((degree / 2) | 0);
        if (firstIndex < 0) {
            firstIndex = 0;
        }
        var lastIndex = firstIndex + degree;
        if (lastIndex >= this._totalSamples) {
            lastIndex = this._totalSamples - 1;
            firstIndex = lastIndex - degree;
            if (firstIndex < 0) {
                firstIndex = 0;
            }
        }

        // Are all the samples we need present?
        // We can assume so if the first and last are present
        var isDataMissing = false;
        var samples = this._samples;
        if (typeof samples[firstIndex * 3] === 'undefined') {
            requestXysChunk(this, (firstIndex / this._samplesPerXysFile) | 0);
            isDataMissing = true;
        }

        if (typeof samples[lastIndex * 3] === 'undefined') {
            requestXysChunk(this, (lastIndex / this._samplesPerXysFile) | 0);
            isDataMissing = true;
        }

        if (isDataMissing) {
            return undefined;
        }

        if (typeof result === 'undefined') {
            result = [0.0, 0.0, 0.0];
        } else {
            result[0] = 0.0;
            result[1] = 0.0;
            result[2] = 0.0;
        }

        var x = daysSinceEpoch - firstIndex * this._stepSizeDays;

        var work = this._work;
        var denom = this._denominators;
        var coef = this._coef;
        var xTable = this._xTable;

        var i, j;
        for (i = 0; i <= degree; ++i) {
            work[i] = x - xTable[i];
        }

        for (i = 0; i <= degree; ++i)
        {
            coef[i] = 1.0;

            for (j = 0; j <= degree; ++j)
            {
                if (j !== i)
                {
                    coef[i] *= work[j];
                }
            }

            coef[i] *= denom[i];

            var sampleIndex = (firstIndex + i) * 3;
            result[0] += coef[i] * samples[sampleIndex++];
            result[1] += coef[i] * samples[sampleIndex++];
            result[2] += coef[i] * samples[sampleIndex];
        }

        return result;
    };

    function requestXysChunk(xysData, chunkIndex) {
        if (xysData._chunkDownloadsInProgress[chunkIndex]) {
            // Chunk has already been requested.
            return;
        }

        xysData._chunkDownloadsInProgress[chunkIndex] = true;

        var chunkUrl = xysData._xysFileUrlTemplate.replace('{0}', chunkIndex);
        when(loadJson(chunkUrl), function(chunk) {
            xysData._chunkDownloadsInProgress[chunkIndex] = false;

            var samples = xysData._samples;
            var newSamples = chunk.samples;
            var startIndex = chunkIndex * xysData._samplesPerXysFile;

            for (var i = 0, len = newSamples.length; i < len; ++i) {
                samples[startIndex + i] = newSamples[i];
            }
        });
    }

    return Iau2006XysData;
});