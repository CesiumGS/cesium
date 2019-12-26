import defined from './defined.js';

    /**
     * Tests an object to see if it is an array.
     * @exports isArray
     *
     * @param {*} value The value to test.
     * @returns {Boolean} true if the value is an array, false otherwise.
     */
    var isArray = Array.isArray;
    if (!defined(isArray)) {
        isArray = function(value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        };
    }
export default isArray;
