import freezeObject from '../Core/freezeObject.js';

    /**
     * @private
     */
    var ExpressionNodeType = {
        VARIABLE : 0,
        UNARY : 1,
        BINARY : 2,
        TERNARY : 3,
        CONDITIONAL : 4,
        MEMBER : 5,
        FUNCTION_CALL : 6,
        ARRAY : 7,
        REGEX: 8,
        VARIABLE_IN_STRING : 9,
        LITERAL_NULL : 10,
        LITERAL_BOOLEAN : 11,
        LITERAL_NUMBER : 12,
        LITERAL_STRING : 13,
        LITERAL_COLOR : 14,
        LITERAL_VECTOR : 15,
        LITERAL_REGEX : 16,
        LITERAL_UNDEFINED : 17,
        BUILTIN_VARIABLE : 18
    };
export default freezeObject(ExpressionNodeType);
