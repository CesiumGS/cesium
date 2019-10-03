
    /**
     * Describes a renderable batch of geometry.
     *
     * @alias Vector3DTileBatch
     * @constructor
     *
     * @param {Object} options An object with the following properties:
     * @param {Number} options.offset The offset of the batch into the indices buffer.
     * @param {Number} options.count The number of indices in the batch.
     * @param {Color} options.color The color of the geometry in the batch.
     * @param {Number[]} options.batchIds An array where each element is the batch id of the geometry in the batch.
     *
     * @private
     */
    function Vector3DTileBatch(options) {
        /**
         * The offset of the batch into the indices buffer.
         * @type {Number}
         */
        this.offset = options.offset;
        /**
         * The number of indices in the batch.
         * @type {Number}
         */
        this.count = options.count;
        /**
         * The color of the geometry in the batch.
         * @type {Color}
         */
        this.color = options.color;
        /**
         * An array where each element is the batch id of the geometry in the batch.
         * @type {Number[]}
         */
        this.batchIds = options.batchIds;
    }
export default Vector3DTileBatch;
