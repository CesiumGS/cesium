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
    function LiteralColorExpression(styleEngine, literal) {
        this._styleEngine = styleEngine;

        var color = Color.fromCssColorString(literal);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(color)) {
            throw new DeveloperError('color must be a valid CSS string');
        }
        //>>includeEnd('debug');

        this._color = color;
    }

    defineProperties(LiteralColorExpression.prototype, {
        /**
         * DOC_TBA
         */
        color : {
            get : function() {
                return this._color;
            },
            set : function(value) {
                if (!Color.equals(this._color, value)) {
                    this._color = Color.clone(value, this._color);
                    this._styleEngine.makeDirty();
                }
            }
        }
    });

    /**
     * DOC_TBA
     */
    LiteralColorExpression.prototype.evaluate = function(feature) {
        return this._color;
    };

    return LiteralColorExpression;
});
