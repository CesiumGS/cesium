define([], function() {
    'use strict';

    /**
     * Utility function for retrieving the number of components in a given type.
     * As per the spec:
     *     'SCALAR' : 1
     *     'VEC2'   : 2
     *     'VEC3'   : 3
     *     'VEC4'   : 4
     *     'MAT2'   : 4
     *     'MAT3'   : 9
     *     'MAT4'   : 16
     *
     * @param {String} type glTF type
     * @returns {Number} The number of components in that type.
     */
    function numberOfComponentsForType(type) {
        switch (type) {
            case 'SCALAR':
                return 1;
            case 'VEC2':
                return 2;
            case 'VEC3':
                return 3;
            case 'VEC4':
            case 'MAT2':
                return 4;
            case 'MAT3':
                return 9;
            case 'MAT4':
                return 16;
        }
    }
    return numberOfComponentsForType;
});
