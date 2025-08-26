import {
  POSITION,
  COLOR,
  isPositionAttribute,
} from "./VertexAttributeSemantic.js";
import Cartesian3 from "../Core/Cartesian3.js";
import AttributeType from "./AttributeType.js";

/**
 * The name of the extension: <code>KHR_spz_gaussian_splats_compression</code>
 * @type {string}
 * @constant
 * @private
 */
export const extensionName = "KHR_spz_gaussian_splats_compression";

/**
 * Gaussian splat per-position scale
 * @type {VertexAttributeSemantic}
 * @constant
 * @private
 */
const _SCALE = Object.freeze({
  propertyName: "_SCALE",
  semantic: "SCALE",
  type: AttributeType.VEC3,
  canQuantize: true,
});

/**
 * Gaussian splat per-position rotation
 * @type {VertexAttributeSemantic}
 * @constant
 * @private
 */
const _ROTATION = Object.freeze({
  propertyName: "_ROTATION",
  semantic: "ROTATION",
  type: AttributeType.VEC4,
  canQuantize: true,
});

const SpzVertexAttributes = Object.freeze({
  POSITION,
  COLOR,
  _SCALE,
  _ROTATION,
});

/**
 * Creates a map of vertex attributes associated with this extension, indexed by their attribute property name.
 * @param {object} extension glTF extension with attribute data
 * @returns {Record<string,VertexAttributeSemantic>} A dictionary of attribute semantics by their attribute property name
 */
export function getAttributesFromExtension(extension) {
  return Object.keys(SpzVertexAttributes).map(({ propertyName }) => [
    propertyName,
    SpzVertexAttributes[propertyName],
    // TODO: Include extensionUsed for checking later in the process?
  ]);
}

export function getVertexBufferLoader() {}

export function attributeCallback(attribute, attributeSemantic) {
  // The accessor's byteOffset and byteStride should be ignored since
  // each attribute is now tightly packed in its own buffer after decode.
  attribute.byteOffset = 0;
  attribute.byteStride = undefined;

  if (loadBuffer) {
    attribute.buffer = vertexBufferLoader.buffer;
  }

  if (loadTypedArray) {
    const componentDatatype = attribute.componentDatatype;
    attribute.typedArray = ComponentDatatype.createArrayBufferView(
      componentDatatype,
      vertexBufferLoader.typedArray.buffer,
    );
  }

  if (isPositionAttribute(attributeSemantic)) {
    const findMinMaxXY = (flatArray) => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;

      for (let i = 0; i < flatArray.length; i += 3) {
        const x = flatArray[i];
        const y = flatArray[i + 1];
        const z = flatArray[i + 2];

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z);
        maxZ = Math.max(maxZ, z);
      }

      return [
        new Cartesian3(minX, minY, minZ),
        new Cartesian3(maxX, maxY, maxZ),
      ];
    };
    const buffer = attribute.typedArray;
    [attribute.min, attribute.max] = findMinMaxXY(buffer);
  }
}
