import ComponentDatatype from "../Core/ComponentDatatype.js";

/**
 * TODO: VertexArrayBufferView?
 * @private
 */
function VertexBufferView(options) {
    /**
     * A typed view of the vertex buffer.
     *
     * @type {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Float32Array|undefined}
     * @private
     */
    this.typedArray = undefined;

        /**
         * The component data type of the attribute.
         * @type {ComponentDatatype}
         * @private
         */
        this.componentDatatype = options.componentDatatype ?? ComponentDatatype.FLOAT;
        

    /**
     * The byte offset of elements in the buffer.
     * @type {number}
     * @default 0
     * @private
     */
    this.byteOffset = options.byteOffset ?? 0;

    /**
     * The byte stride of elements in the buffer. When undefined the elements are tightly packed.
     * @type {number|undefined}
     * @private
     */
    this.byteStride = undefined;

    this.byteLength = undefined; // TODO:?
}

export default VertexBufferView;