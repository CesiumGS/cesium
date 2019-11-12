import freezeObject from '../Core/freezeObject.js';

    /**
     * An enum describing the attribute type for glTF and 3D Tiles.
     *
     * @exports AttributeType
     *
     * @private
     */
    var AttributeType = {
        /**
         * The attribute is a single component.
         *
         * @type {String}
         * @constant
         */
        SCALAR : 'SCALAR',

        /**
         * The attribute is a two-component vector.
         *
         * @type {String}
         * @constant
         */
        VEC2 : 'VEC2',

        /**
         * The attribute is a three-component vector.
         *
         * @type {String}
         * @constant
         */
        VEC3 : 'VEC3',

        /**
         * The attribute is a four-component vector.
         *
         * @type {String}
         * @constant
         */
        VEC4 : 'VEC4',

        /**
         * The attribute is a 2x2 matrix.
         *
         * @type {String}
         * @constant
         */
        MAT2 : 'MAT2',

        /**
         * The attribute is a 3x3 matrix.
         *
         * @type {String}
         * @constant
         */
        MAT3 : 'MAT3',

        /**
         * The attribute is a 4x4 matrix.
         *
         * @type {String}
         * @constant
         */
        MAT4 : 'MAT4'
    };
export default freezeObject(AttributeType);
