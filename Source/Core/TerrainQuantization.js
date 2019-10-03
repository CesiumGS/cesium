import freezeObject from './freezeObject.js';

    /**
     * This enumerated type is used to determine how the vertices of the terrain mesh are compressed.
     *
     * @exports TerrainQuantization
     *
     * @private
     */
    var TerrainQuantization = {
        /**
         * The vertices are not compressed.
         *
         * @type {Number}
         * @constant
         */
        NONE : 0,

        /**
         * The vertices are compressed to 12 bits.
         *
         * @type {Number}
         * @constant
         */
        BITS12 : 1
    };
export default freezeObject(TerrainQuantization);
