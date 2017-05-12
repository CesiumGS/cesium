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
     * @param {FrameState} frameState The frame state.
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @returns {Boolean|Number|String|Color|RegExp} The result of evaluating the expression.
     */
    StyleExpression.prototype.evaluate = function(frameState, feature) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Evaluates the result of a Color expression, using the values defined by a feature.
     *
     * @param {FrameState} frameState The frame state.
     * @param {Cesium3DTileFeature} feature The feature who's properties may be used as variables in the expression.
     * @param {Color} [result] The object in which to store the result
     * @returns {Color} The modified result parameter or a new Color instance if one was not provided.
     */
    StyleExpression.prototype.evaluateColor = function(frameState, feature, result) {
        DeveloperError.throwInstantiationError();
    };

    /**
     * Gets the shader function for this expression.
     * Returns undefined if the shader function can't be generated from this expression.
     *
     * @param {String} functionName Name to give to the generated function.
     * @param {String} attributePrefix Prefix that is added to any variable names to access vertex attributes.
     * @param {Object} shaderState Stores information about the generated shader function, including whether it is translucent.
     * @param {String} returnType The return type of the generated function.
     *
     * @returns {String} The shader function.
     *
     * @private
     */
    StyleExpression.prototype.getShaderFunction = function(functionName, attributePrefix, shaderState, returnType) {
        DeveloperError.throwInstantiationError();
    };

    return StyleExpression;
});
