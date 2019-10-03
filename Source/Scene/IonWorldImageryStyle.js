import freezeObject from '../Core/freezeObject.js';

    // Note, these values map directly to ion asset ids.

    /**
     * The types of imagery provided by {@link createWorldImagery}.
     *
     * @exports IonWorldImageryStyle
     */
    var IonWorldImageryStyle = {
        /**
         * Aerial imagery.
         *
         * @type {Number}
         * @constant
         */
        AERIAL : 2,

        /**
         * Aerial imagery with a road overlay.
         *
         * @type {Number}
         * @constant
         */
        AERIAL_WITH_LABELS : 3,

        /**
         * Roads without additional imagery.
         *
         * @type {Number}
         * @constant
         */
        ROAD : 4
    };
export default freezeObject(IonWorldImageryStyle);
