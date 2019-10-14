import freezeObject from './freezeObject.js';

    /**
     * Constants for identifying well-known reference frames.
     *
     * @exports ReferenceFrame
     */
    var ReferenceFrame = {
        /**
         * The fixed frame.
         *
         * @type {Number}
         * @constant
         */
        FIXED : 0,

        /**
         * The inertial frame.
         *
         * @type {Number}
         * @constant
         */
        INERTIAL : 1
    };
export default freezeObject(ReferenceFrame);
