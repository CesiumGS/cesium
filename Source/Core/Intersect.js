import freezeObject from './freezeObject.js';

    /**
     * This enumerated type is used in determining where, relative to the frustum, an
     * object is located. The object can either be fully contained within the frustum (INSIDE),
     * partially inside the frustum and partially outside (INTERSECTING), or somwhere entirely
     * outside of the frustum's 6 planes (OUTSIDE).
     *
     * @exports Intersect
     */
    var Intersect = {
        /**
         * Represents that an object is not contained within the frustum.
         *
         * @type {Number}
         * @constant
         */
        OUTSIDE : -1,

        /**
         * Represents that an object intersects one of the frustum's planes.
         *
         * @type {Number}
         * @constant
         */
        INTERSECTING : 0,

        /**
         * Represents that an object is fully within the frustum.
         *
         * @type {Number}
         * @constant
         */
        INSIDE : 1
    };
export default freezeObject(Intersect);
