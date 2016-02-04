/*global define*/
define([
       '../Core/Color',
       '../Core/defineProperties'
    ], function(
        Color,
        defineProperties) {
    "use strict";

    // TODO: best name/directory for this?

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ColorExpression(tileset, jsonExpression) {
        var colors = jsonExpression.colors;

        this._tileset = tileset;
        this._propertyName = jsonExpression.propertyName;
        this._colors = colors.slice(0);
        this._intervals = undefined;  // TODO: expose this readonly, e.g., for UIs?

        setIntervals(this);
    }

    defineProperties(ColorExpression.prototype, {
        /**
         * DOC_TBA
         */
        propertyName : {
            get : function() {
                return this._propertyName;
            },
            set : function(value) {
                if (this._propertyName !== value) {
                    this._propertyName = value;
                    this._tileset.styleEngine.makeDirty();

                    setIntervals(this);
                }
            }
        },

        /**
         * DOC_TBA
         */
        colors : {
            get : function() {
                return this._colors;
            },
            set : function(value) {
                // TODO: throw if value is undefined?
                this._colors = value.slice(0);
                this._tileset.styleEngine.makeDirty();

                setIntervals(this);
            }
        }
    });

    function setIntervals(colorExpression) {
        var propertyMetadata = colorExpression._tileset.properties[colorExpression._propertyName];
        var colors = colorExpression._colors;
        var length = colors.length;
        var min = propertyMetadata.minimum;
        var max = propertyMetadata.maximum;
        var delta = Math.max(max - min, 0) / length;
        var intervals = new Array(length);
        for (var i = 0; i < length; ++i) {
            var color = colors[i];
            intervals[i] = {
                maximum : (i !== length - 1) ? Math.ceil(min + ((i + 1) * delta)) : max,
                color : Color.fromBytes(color[0], color[1], color[2])
            };
        }

        colorExpression._intervals = intervals;
    }

    /**
     * DOC_TBA
     */
    ColorExpression.prototype.evaluate = function(feature) {
        var value = feature.getProperty(this._propertyName);

        // PERFORMANCE_IDEA: intervals is sorted so replace this linear search with a binary search.
        // To improve the binary search, instead of making uniform splits, we could make non-uniform
        // splits based on the histogram of distributed values in the tile
        var intervals = this._intervals;
        var length = intervals.length;
        for (var j = 0; j < length; ++j) {
            if (value < intervals[j].maximum) {
                break;
            }
        }
        j = Math.min(j, length - 1); // In case, there is a precision issue
        return intervals[j].color;
    };

    return ColorExpression;
});
