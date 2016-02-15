/*global define*/
define([
       '../Core/clone',
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError',
       '../ThirdParty/chroma',
       './NumberExpression',
    ], function(
        clone,
        Color,
        defined,
        defineProperties,
        DeveloperError,
        chroma,
        NumberExpression) {
    'use strict';

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ColorRampExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;

        /**
         * DOC_TBA
         */
        this.expression = new NumberExpression(styleEngine, jsonExpression.expression);

        this._colors = clone(jsonExpression.colors, true);
        this._intervals = clone(jsonExpression.intervals, true);

        this._runtimeIntervals = undefined;
        setRuntimeColors(this);
    }

    defineProperties(ColorRampExpression.prototype, {
        /**
         * DOC_TBA
         */
        colors : {
            get : function() {
                return this._runtimeColors;
            },
            set : function(value) {
                this._runtimeColors = clone(value, true);
                this._styleEngine.makeDirty();
                this._runtimeIntervals = undefined; // Lazily computed in evaluate
            }
        },

        /**
         * DOC_TBA
         */
        intervals : {
            get : function() {
                return this._intervals;
            },
            set : function(value) {
                this._intervals = clone(value, true);
                this._styleEngine.makeDirty();
                this._runtimeIntervals = undefined; // Lazily computed in evaluate
            }
        }
    });

    function setRuntimeColors(expression) {
        var colors = expression._colors;
        var length = colors.length;
        var runtimeColors = new Array(length);

        for (var i = 0; i < length; ++i) {
            runtimeColors[i] = Color.fromCssColorString(colors[i]);
        }

        expression._runtimeColors = runtimeColors;
    }

    function computeRuntimeIntervals(expression) {
        var intervals = expression._intervals;
        var length = intervals.length;

        var runtimeIntervals = new Array(length);
        for (var i = 0; i < length; ++i) {
            runtimeIntervals[i] = {
// TODO: what about intervals[0] and inclusive/exclusive flag?
                maximum : (i !== length - 1) ? intervals[i + 1] : Number.POSITIVE_INFINITY,
                color : expression._runtimeColors[i]
            };
        }

        return runtimeIntervals;
    }

    /**
     * DOC_TBA
     */
    ColorRampExpression.prototype.evaluate = function(feature) {
        var value = this.expression.evaluate(feature);

        if (!defined(this._runtimeIntervals)) {
            this._runtimeIntervals = computeRuntimeIntervals(this);
        }

        // PERFORMANCE_IDEA: intervals is sorted so replace this linear search with a binary search.
        // To improve the binary search, instead of making uniform splits, we could make non-uniform
        // splits based on the histogram of distributed values in the tile
        var intervals = this._runtimeIntervals;
        var length = intervals.length;
        for (var j = 0; j < length; ++j) {
            if (value < intervals[j].maximum) {
                break;
            }
        }
        j = Math.min(j, length - 1); // In case, there is a precision issue
        return intervals[j].color;
    };

    // TODO: Add direct schema support for these static helpers?  Move them
    // to server-side only (one uses a third-party library)

    /**
     * DOC_TBA
     */
    ColorRampExpression.computeEvenlySpacedIntervals = function(tileset, propertyName, length) {
        var propertyMetadata = tileset.properties[propertyName];

        //>>includeStart('debug', pragmas.debug);
        if (!defined(tileset) || !defined(propertyName) || !defined(length)) {
            throw new DeveloperError('tileset, propertyName, and length are required.');
        }

        if (!tileset.ready) {
            throw new DeveloperError('The tileset is not loaded.  Use Cesium3DTileset.readyPromise or wait for Cesium3DTileset.ready to be true.');
        }

        if (!defined(propertyMetadata)) {
            throw new DeveloperError('propertyName must exist in tileset.properties.');
        }

        if (!defined(propertyMetadata.minimum) || !defined(propertyMetadata.maximum)) {
            throw new DeveloperError('Property must be a number.');
        }

        if (length <= 0) {
            throw new DeveloperError('length must be greater than zero.');
        }
        //>>includeEnd('debug');

        var min = propertyMetadata.minimum;
        var max = propertyMetadata.maximum;
        var delta = Math.max(max - min, 0) / length;

        // TODO: generate inclusive vs. exclusive?
        var intervals = new Array(length);
        intervals[0] = min;
        for (var i = 1; i < length; ++i) {
            intervals[i] = (i !== length - 1) ? Math.ceil(min + ((i + 1) * delta)) : max;
        }

        return intervals;
    };

    /**
     * DOC_TBA
     */
    ColorRampExpression.computePalette = function(colors, length) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(colors) || !defined(length)) {
            throw new DeveloperError('colors and length are required.');
        }

        if (length <= 0) {
            throw new DeveloperError('length must be greater than zero.');
        }
        //>>includeEnd('debug');

        var inLength = colors.length;
        var inColors = new Array(inLength);
        for (var i = 0; i < inLength; ++i) {
            inColors[i] = chroma(colors[i]);
        }

        var computedColors = chroma.scale(inColors).colors(length);

        var outColors = new Array(length);
        for (var j = 0; j < length; ++j) {
            outColors[j] = chroma(computedColors[j]).hex();
        }

        return outColors;
    };

    return ColorRampExpression;
});
