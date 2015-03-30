/*global define*/
define([
        'Core/FeatureDetection'
    ], function(
        FeatureDetection) {
    "use strict";
    /*global CanvasPixelArray*/

    var typedArrayTypes = [];

    // Earlier versions of IE do not support typed arrays
    if (FeatureDetection.supportsTypedArrays()) {
        typedArrayTypes.push(Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array);

        if (typeof Uint8ClampedArray !== 'undefined') {
            typedArrayTypes.push(Uint8ClampedArray);
        }

        if (typeof CanvasPixelArray !== 'undefined') {
            typedArrayTypes.push(CanvasPixelArray);
        }
    }

    function isTypedArray(o) {
        return typedArrayTypes.some(function(type) {
            return o instanceof type;
        });
    }

    function typedArrayToArray(array) {
        if (array !== null && typeof array === 'object' && isTypedArray(array)) {
            return Array.prototype.slice.call(array, 0);
        }
        return array;
    }

    function equals(util, customEqualiyTesters, a, b) {
        a = typedArrayToArray(a);
        b = typedArrayToArray(b);
        return util.equals(a, b, customEqualiyTesters);
    }

    return equals;
});