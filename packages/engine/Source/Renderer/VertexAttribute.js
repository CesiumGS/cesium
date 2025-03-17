import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError";
import AttributeType from "../Scene/AttributeType.js";
import BufferUsage from "./BufferUsage.js";

/**
 * TODO
 * @private
 */
function VertexAttribute(options) {
    options = options ?? defaultValue.EMPTY_OBJECT;

    // TODO: Doc
    this.index = options.index;

    // TODO: Is this even used?
    this.enabled = options.enabled ?? true;

    /**
     * The type of the attribute, corresponding to the number of components.
     * @type {AttributeType}
     * @private
     */
    this.type = options.type;

    /**
     * The component data type of the attribute.
     * @type {ComponentDatatype}
     * @private
     */
    this.componentDatatype = options.componentDatatype ?? ComponentDatatype.FLOAT;
    
      /**
     * Whether the attribute is normalized.
     * @type {boolean}
     * @default false
     * @private
     */
    this.normalized = options.normalized ?? false;

    /**
     * A vertex buffer. Attribute values are accessed using byteOffset and byteStride.
     * @type {Buffer|undefined}
     * @private
     */
    this.buffer = options.buffer;

    // TODO
    this.bufferView = options.bufferView;


    // TODO: doc
    this.usage = options.usage ?? BufferUsage.STATIC_DRAW;

}

/**
 * @private
 * @throws TODO
 */
VertexAttribute.prototype.validate = function () {
    //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number("index", this.index);
        Check.typeOf.bool("enabled", this.enabled);
        Check.defined("type", this.type);
        
        const datatype = this.componentDatatype;
        if (!ComponentDatatype.validate(datatype)) {
          throw new DeveloperError(
            "Attribute must have a valid componentDatatype or not specify it.",
          );
        }

        Check.typeOf.bool("normalize", this.normalize);
    
        if (!BufferUsage.validate(this.usage)) {
          throw new DeveloperError(
            "Attribute must have a valid usage or not specify it.",
          );
        }
        //>>includeEnd('debug');
}

VertexAttribute.prototype.getElementSizeInBytes = function () {
    return AttributeType.getNumberOfComponents(this.type) *
          ComponentDatatype.getSizeInBytes(this.componentDatatype);
}

export default VertexAttribute;