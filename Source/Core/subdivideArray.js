import defined from './defined.js';
import DeveloperError from './DeveloperError.js';

    /**
     * Subdivides an array into a number of smaller, equal sized arrays.
     *
     * @exports subdivideArray
     *
     * @param {Array} array The array to divide.
     * @param {Number} numberOfArrays The number of arrays to divide the provided array into.
     *
     * @exception {DeveloperError} numberOfArrays must be greater than 0.
     */
    function subdivideArray(array, numberOfArrays) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(array)) {
            throw new DeveloperError('array is required.');
        }

        if (!defined(numberOfArrays) || numberOfArrays < 1) {
            throw new DeveloperError('numberOfArrays must be greater than 0.');
        }
        //>>includeEnd('debug');

        var result = [];
        var len = array.length;
        var i = 0;
        while (i < len) {
            var size = Math.ceil((len - i) / numberOfArrays--);
            result.push(array.slice(i, i + size));
            i += size;
        }
        return result;
    }
export default subdivideArray;
