/*global define*/
define([
       '../Core/Color',
       '../Core/defined',
       '../Core/defineProperties',
       '../Core/DeveloperError'
    ], function(
        Color,
        defined,
        defineProperties,
        DeveloperError) {
    'use strict';

    // TODO: best name/directory for this?

    /**
     * DOC_TBA
     * <p>
     * Do not construct this directly; instead use {@link Cesium3DTileStyle}.
     * </p>
     */
    function ConstantColorExpression(styleEngine, jsonExpression) {
        this._styleEngine = styleEngine;

        var color = jsonExpression.color;
        this._color = color.slice(0);
        this._runtimeColor = Color.fromBytes(color[0], color[1], color[2]);
    }

    defineProperties(ConstantColorExpression.prototype, {
        /**
         * DOC_TBA
         */
        color : {
            get : function() {
                return this._color;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(value)) {
                    throw new DeveloperError('color is required.');
                }

                if (value.length !== 3) {
                    throw new DeveloperError('color.length must equal three.');
                }
                //>>includeEnd('debug');

                this._color = value.slice(0);
                this._runtimeColor = Color.fromBytes(value[0], value[1], value[2], 255, this._runtimeColor);
                this._styleEngine.makeDirty();
            }
        }
    });

    /**
     * DOC_TBA
     */
    ConstantColorExpression.prototype.evaluate = function(feature) {
        return this._runtimeColor;
    };

    return ConstantColorExpression;
});
