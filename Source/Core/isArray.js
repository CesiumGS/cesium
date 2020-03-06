import defined from './defined.js';
import deprecationWarning from './deprecationWarning.js';

    /**
     * Tests an object to see if it is an array.
     * @exports isArray
     *
     * @param {*} value The value to test.
     * @returns {Boolean} true if the value is an array, false otherwise.
     * @deprecated See https://github.com/AnalyticalGraphicsInc/cesium/issues/8526.
     * Use `Array.isArray` instead
     */
    var isArray = Array.isArray;
    if (!defined(isArray)) {
        isArray = function(value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        };
    }

    function isArrayFunction(value) {
        deprecationWarning('isArray', 'isArray will be removed in Cesium 1.69. Use the native `Array.isArray` function instead.');
        return isArray(value);
    }
export default isArrayFunction;
