/*global define*/
define(function() {
    'use strict';

    /**
     * @private
     */
    function getPropertyName(operand) {
        if (typeof operand !== 'string') {
            return undefined;
        }

        if (operand.length < 3) {
            return undefined;
        }

        // Strings that should be substituted with a property value are enclosed in ${}.
        if ((operand.charAt(0) !== '$') || (operand.charAt(1) !== '{') || (operand.charAt(operand.length - 1) !== '}')) {
            return undefined;
        }

        return operand.substring(2, operand.length - 1);
    }

    return getPropertyName;
});
