import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import Expression from "./Expression.js";

/**
 * An expression for a style applied to a {@link Cesium3DTileset}.
 * <p>
 * Evaluates a conditions expression defined using the
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language}.
 * </p>
 * <p>
 * Implements the {@link StyleExpression} interface.
 * </p>
 *
 * @alias ConditionsExpression
 * @constructor
 *
 * @param {object} [conditionsExpression] The conditions expression defined using the 3D Tiles Styling language.
 * @param {object} [defines] Defines in the style.
 *
 * @example
 * const expression = new Cesium.ConditionsExpression({
 *     conditions : [
 *         ['${Area} > 10, 'color("#FF0000")'],
 *         ['${id} !== "1"', 'color("#00FF00")'],
 *         ['true', 'color("#FFFFFF")']
 *     ]
 * });
 * expression.evaluateColor(feature, result); // returns a Cesium.Color object
 */
function ConditionsExpression(conditionsExpression, defines) {
  this._conditionsExpression = clone(conditionsExpression, true);
  this._conditions = conditionsExpression.conditions;
  this._runtimeConditions = undefined;

  setRuntime(this, defines);
}

Object.defineProperties(ConditionsExpression.prototype, {
  /**
   * Gets the conditions expression defined in the 3D Tiles Styling language.
   *
   * @memberof ConditionsExpression.prototype
   *
   * @type {object}
   * @readonly
   *
   * @default undefined
   */
  conditionsExpression: {
    get: function () {
      return this._conditionsExpression;
    },
  },
});

function Statement(condition, expression) {
  this.condition = condition;
  this.expression = expression;
}

function setRuntime(expression, defines) {
  const runtimeConditions = [];
  const conditions = expression._conditions;
  if (!defined(conditions)) {
    return;
  }
  const length = conditions.length;
  for (let i = 0; i < length; ++i) {
    const statement = conditions[i];
    const cond = String(statement[0]);
    const condExpression = String(statement[1]);
    runtimeConditions.push(
      new Statement(
        new Expression(cond, defines),
        new Expression(condExpression, defines)
      )
    );
  }
  expression._runtimeConditions = runtimeConditions;
}

/**
 * Evaluates the result of an expression, optionally using the provided feature's properties. If the result of
 * the expression in the
 * {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language}
 * is of type <code>Boolean</code>, <code>Number</code>, or <code>String</code>, the corresponding JavaScript
 * primitive type will be returned. If the result is a <code>RegExp</code>, a Javascript <code>RegExp</code>
 * object will be returned. If the result is a <code>Cartesian2</code>, <code>Cartesian3</code>, or <code>Cartesian4</code>,
 * a {@link Cartesian2}, {@link Cartesian3}, or {@link Cartesian4} object will be returned. If the <code>result</code> argument is
 * a {@link Color}, the {@link Cartesian4} value is converted to a {@link Color} and then returned.
 *
 * @param {Cesium3DTileFeature} feature The feature whose properties may be used as variables in the expression.
 * @param {object} [result] The object onto which to store the result.
 * @returns {boolean|number|string|RegExp|Cartesian2|Cartesian3|Cartesian4|Color} The result of evaluating the expression.
 */
ConditionsExpression.prototype.evaluate = function (feature, result) {
  const conditions = this._runtimeConditions;
  if (!defined(conditions)) {
    return undefined;
  }
  const length = conditions.length;
  for (let i = 0; i < length; ++i) {
    const statement = conditions[i];
    if (statement.condition.evaluate(feature)) {
      return statement.expression.evaluate(feature, result);
    }
  }
};

/**
 * Evaluates the result of a Color expression, using the values defined by a feature.
 * <p>
 * This is equivalent to {@link ConditionsExpression#evaluate} but always returns a {@link Color} object.
 * </p>
 * @param {Cesium3DTileFeature} feature The feature whose properties may be used as variables in the expression.
 * @param {Color} [result] The object in which to store the result
 * @returns {Color} The modified result parameter or a new Color instance if one was not provided.
 */
ConditionsExpression.prototype.evaluateColor = function (feature, result) {
  const conditions = this._runtimeConditions;
  if (!defined(conditions)) {
    return undefined;
  }
  const length = conditions.length;
  for (let i = 0; i < length; ++i) {
    const statement = conditions[i];
    if (statement.condition.evaluate(feature)) {
      return statement.expression.evaluateColor(feature, result);
    }
  }
};

/**
 * Gets the shader function for this expression.
 * Returns undefined if the shader function can't be generated from this expression.
 *
 * @param {string} functionSignature Signature of the generated function.
 * @param {object} variableSubstitutionMap Maps variable names to shader variable names.
 * @param {object} shaderState Stores information about the generated shader function, including whether it is translucent.
 * @param {string} returnType The return type of the generated function.
 *
 * @returns {string} The shader function.
 *
 * @private
 */
ConditionsExpression.prototype.getShaderFunction = function (
  functionSignature,
  variableSubstitutionMap,
  shaderState,
  returnType
) {
  const conditions = this._runtimeConditions;
  if (!defined(conditions) || conditions.length === 0) {
    return undefined;
  }

  let shaderFunction = "";
  const length = conditions.length;
  for (let i = 0; i < length; ++i) {
    const statement = conditions[i];

    const condition = statement.condition.getShaderExpression(
      variableSubstitutionMap,
      shaderState
    );
    const expression = statement.expression.getShaderExpression(
      variableSubstitutionMap,
      shaderState
    );

    // Build the if/else chain from the list of conditions
    shaderFunction +=
      `    ${i === 0 ? "if" : "else if"} (${condition})\n` +
      `    {\n` +
      `        return ${expression};\n` +
      `    }\n`;
  }

  shaderFunction =
    `${returnType} ${functionSignature}\n` +
    `{\n${shaderFunction}    return ${returnType}(1.0);\n` + // Return a default value if no conditions are met
    `}\n`;

  return shaderFunction;
};

/**
 * Gets the variables used by the expression.
 *
 * @returns {string[]} The variables used by the expression.
 *
 * @private
 */
ConditionsExpression.prototype.getVariables = function () {
  let variables = [];

  const conditions = this._runtimeConditions;
  if (!defined(conditions) || conditions.length === 0) {
    return variables;
  }

  const length = conditions.length;
  for (let i = 0; i < length; ++i) {
    const statement = conditions[i];
    variables.push.apply(variables, statement.condition.getVariables());
    variables.push.apply(variables, statement.expression.getVariables());
  }

  // Remove duplicates
  variables = variables.filter(function (variable, index, variables) {
    return variables.indexOf(variable) === index;
  });

  return variables;
};

export default ConditionsExpression;
