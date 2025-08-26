import Frozen from "../Core/Frozen.js";
import { POSITION, NORMAL, COLOR, TEXCOORD } from "./VertexAttributeSemantic.js";

/**
 * Per-vertex texture coordinates.
 * @type {VertexAttributeSemantic}
 * @constant
 */
const TEX_COORD = Object.freeze({
  ...TEXCOORD,
  propertyName: "TEX_COORD",
});

export const DracoVertexAttributes = Object.freeze({ POSITION, NORMAL, COLOR, TEX_COORD });

export function getAttributesFromExtension(extension) {
  const attributes = extension?.attributes ?? Frozen.EMPTY_OBJECT;
  const attributeProperties = Object.keys(attributes);
  return attributeProperties.map((attributePropertyName) => ([
    attributePropertyName, {
      ...DracoVertexAttributes[attributePropertyName], 
      accessorId: attributes[attributePropertyName]
    }
  ]));
}

export function getAttributeFromBuffer() {
  const attribute = undefined; // TODO: createAttribute

  // The accessor's byteOffset and byteStride should be ignored for draco.
  // Each attribute is tightly packed in its own buffer after decode.
  attribute.byteOffset = 0;
  attribute.byteStride = undefined;
  attribute.quantization = vertexBufferLoader.quantization;
  attribute.buffer = vertexBufferLoader.buffer;
}

export function getAttributeFromTypedArray() {
  const attribute = undefined; // TODO: createAttribute

  // The accessor's byteOffset and byteStride should be ignored for draco.
  // Each attribute is tightly packed in its own buffer after decode.
  attribute.byteOffset = 0;
  attribute.byteStride = undefined;
  attribute.quantization = vertexBufferLoader.quantization;
  const componentDatatype = defined(vertexBufferLoader.quantization)
        ? vertexBufferLoader.quantization.componentDatatype
        : attribute.componentDatatype;
  
      attribute.typedArray = ComponentDatatype.createArrayBufferView(
        componentDatatype,
        vertexBufferLoader.typedArray.buffer,
      );
}