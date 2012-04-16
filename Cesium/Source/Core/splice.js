/*global define*/
define(['./DeveloperError'], function(DeveloperError) {
    "use strict";

    function splice (array, index, howMany) {
        if (Object.prototype.toString.apply(array) !== '[object Array]') {
            throw new DeveloperError("array is not an Array type.", "array");
        }

        index = index || 0;
        howMany = howMany || 0;

        var i;
        var len = array.length;
        for (i = index; i + howMany < len; ++i) {
            array[i] = array[i + howMany];
        }
        array.length = i;
    }

    return splice;
});