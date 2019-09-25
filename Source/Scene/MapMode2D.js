import freezeObject from '../Core/freezeObject.js';

    /**
     * Describes how the map will operate in 2D.
     *
     * @exports MapMode2D
     */
    var MapMode2D = {
        /**
         * The 2D map can be rotated about the z axis.
         *
         * @type {Number}
         * @constant
         */
        ROTATE : 0,

        /**
         * The 2D map can be scrolled infinitely in the horizontal direction.
         *
         * @type {Number}
         * @constant
         */
        INFINITE_SCROLL : 1
    };
export default freezeObject(MapMode2D);
