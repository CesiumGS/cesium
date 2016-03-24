/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    'use strict';

    /**
     * <p>
     * Derived classes of this interface evaluate expressions in the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}.
     * </p>
     * <p>
     * This type describes an interface and is not intended to be instantiated directly.
     * </p>
     *
     * @alias StyleExpression
     * @constructor
     *
     * @see Expression
     * @see ConditionsExpression
     * @see {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     */
    function StyleExpression() {
    }

    /**
     * Evaluates the result of an expression, optionally using the provided feature's properties. If the result of
     * the expression in the
     * {@link https://github.com/AnalyticalGraphicsInc/3d-tiles/tree/master/Styling|3D Tiles Styling language}
     * is of type <code>Boolean</code>, <code>Number</code>, or <code>String</code>, the corresponding JavaScript
     * primitive type will be returned. If the result is a <code>RegExp</code>, a Javascript <code>RegExp</code>
     * object will be returned. If the result is a <code>Color</code>, a {@link Color} object will be returned.
     *
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @returns {Boolean|Number|String|Color|RegExp} The result of evaluating the expression.
     */
    StyleExpression.prototype.evaluate = function(feature) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Evaluates the result of a Color expression, using the values defined by a feature.
     *
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @param {Color} [result] The object in which to store the result
     * @returns {Color} The modified result parameter or a new Color instance if one was not provided.
     */
    StyleExpression.prototype.evaluateColor = function(feature, result) {
        DeveloperError.throwInstantiationError();
    };

    return StyleExpression;
});
