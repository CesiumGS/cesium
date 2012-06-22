/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name shallowEquals
     * @function
     */
    function shallowEquals(left, right) {
        if (left && !right) {
            return false;
        } else if (!left && right) {
            return false;
        } else if (!left && !right) {
            return typeof left === typeof right;
        } else {
            // Assumes left and right have the same properties
            for ( var property in left) {
                if (left.hasOwnProperty(property)) {
                    if (left[property] !== right[property]) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    return shallowEquals;
});
