import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import Matrix2 from "../../Core/Matrix2.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";

import ComponentDatatype from "../../Core/ComponentDatatype.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import DeveloperError from "../../Core/DeveloperError.js";

import AttributeType from "../AttributeType.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

import ModelComponents from "../ModelComponents.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
const Indices = ModelComponents.Indices;
const Attribute = ModelComponents.Attribute;

// XXX_DRAPING Upsampling experiments
class ModelPrimitives {
  static createIndicesUint16(dataArray) {
    const indices = new Indices();
    indices.indexDatatype = IndexDatatype.UNSIGNED_SHORT;
    indices.count = dataArray.length;
    indices.typedArray = new Uint16Array(dataArray);
    // TODO
    indices.buffer = undefined;
    return indices;
  }

  static createPositionAttribute(name, dataArray) {
    return ModelPrimitives.createAttributeFloatVec3(
      name,
      VertexAttributeSemantic.POSITION,
      undefined,
      dataArray,
    );
  }

  static createTexCoordAttribute(name, setIndex, dataArray) {
    return ModelPrimitives.createAttributeFloatVec2(
      name,
      VertexAttributeSemantic.TEXCOORD,
      setIndex,
      dataArray,
    );
  }

  static createAttributeFloatVec3(name, semantic, setIndex, dataArray) {
    return ModelPrimitives.createAttribute(
      name,
      semantic,
      setIndex,
      ComponentDatatype.FLOAT,
      AttributeType.VEC3,
      dataArray,
    );
  }
  static createAttributeFloatVec2(name, semantic, setIndex, dataArray) {
    return ModelPrimitives.createAttribute(
      name,
      semantic,
      setIndex,
      ComponentDatatype.FLOAT,
      AttributeType.VEC2,
      dataArray,
    );
  }

  static createAttribute(
    name,
    semantic,
    setIndex,
    componentDatatype,
    type,
    dataArray,
  ) {
    const attribute = new Attribute();
    attribute.name = name;

    attribute.semantic = semantic;
    attribute.setIndex = setIndex;
    attribute.componentDatatype = componentDatatype;
    attribute.type = type;

    attribute.normalized = false;
    attribute.quantization = undefined;

    attribute.constant = ModelPrimitives.getDefaultValue(type);

    // XXX_DRAPING TODO
    attribute.min = undefined;
    attribute.max = undefined;
    if (semantic === VertexAttributeSemantic.POSITION) {
      attribute.min = new Cartesian3(0, 0, 0);
      attribute.max = new Cartesian3(1, 1, 0.1);
    }

    const numComponents = AttributeType.getNumberOfComponents(type);
    attribute.count = dataArray.length / numComponents;
    attribute.typedArray = new Float32Array(dataArray);
    attribute.buffer = undefined;
    attribute.byteOffset = 0;
    attribute.byteStride = undefined;

    return attribute;
  }

  static getDefaultValue(attributeType) {
    switch (attributeType) {
      case AttributeType.SCALAR:
        return 0.0;
      case AttributeType.VEC2:
        return new Cartesian2();
      case AttributeType.VEC3:
        return new Cartesian3();
      case AttributeType.VEC4:
        return new Cartesian4();
      case AttributeType.MAT2:
        return new Matrix2();
      case AttributeType.MAT3:
        return new Matrix3();
      case AttributeType.MAT4:
        return new Matrix4();
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new DeveloperError("attributeType is not a valid value.");
      //>>includeEnd('debug');
    }
  }

  /**
   * Creates a typed array from the data of the given attribute, by
   * reading it back from the vertex buffer.
   *
   * @param {ModelComponents.Attribute} attribute The attribute
   * @returns {TypedArray} The typed array
   */

  // XXX_DRAPING Replaced by AttributeReader.readAttributeAsTypedArray
  /*
  static createTypedArrayFromAttribute(attribute) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("attribute", attribute);
    //>>includeEnd('debug');

    const buffer = attribute.buffer;
    const count = attribute.count;
    const type = attribute.type;
    const componentsPerAttribute = AttributeType.getNumberOfComponents(type);

    // Without quantization, the data can directly be read
    // from the buffer into a typed array

    // XXX_DRAPING: This will have to handle interleaved buffers (probably...)

    const quantization = attribute.quantization;
    if (!defined(quantization)) {
      const typedArray = ComponentDatatype.createTypedArray(
        attribute.componentDatatype,
        count * componentsPerAttribute,
      );
      buffer.getBufferData(typedArray);
      return typedArray;
    }

    // When the data is quantized, then read the quantized data
    // into a typed array
    const quantizedTypedArray = ComponentDatatype.createTypedArray(
      quantization.componentDatatype,
      count * componentsPerAttribute,
    );
    buffer.getBufferData(quantizedTypedArray);
    const dequantizedTypedArray = new Float32Array(
      count * componentsPerAttribute,
    );

    // Now apply the offset and scale (via step size) of the
    // quantization to the quantized data, to obtain the
    // dequantized data
    const p = new Cartesian3();

    // XXX_DRAPING: There's also some quantizedVolumeScale floating around in
    // some places. I hope that this is the right thing to do here...:
    const stepSize = quantization.quantizedVolumeStepSize;
    const offset = quantization.quantizedVolumeOffset;
    for (let i = 0; i < count; i++) {
      p.x = quantizedTypedArray[i * componentsPerAttribute + 0];
      p.y = quantizedTypedArray[i * componentsPerAttribute + 1];
      p.z = quantizedTypedArray[i * componentsPerAttribute + 2];
      Cartesian3.multiplyComponents(p, stepSize, p);
      Cartesian3.add(p, offset, p);
      dequantizedTypedArray[i * componentsPerAttribute + 0] = p.x;
      dequantizedTypedArray[i * componentsPerAttribute + 1] = p.y;
      dequantizedTypedArray[i * componentsPerAttribute + 2] = p.z;
    }
    return dequantizedTypedArray;
  }
  //*/

  /**
   * XXX_DRAPING Largely taken from "pickModel.js", see XXX_DRAPING note there
   *
   * @param {ModelComponents.Primitive} primitive
   * @returns
   */
  static getRawIndices(primitiveIndices) {
    const existingIndices = primitiveIndices.typedArray;
    if (defined(existingIndices)) {
      return existingIndices;
    }
    const indicesBuffer = primitiveIndices.buffer;
    const indicesCount = primitiveIndices.count;
    const indexDatatype = primitiveIndices.indexDatatype;
    const indices = ModelPrimitives.createIndexTypedArray(
      indexDatatype,
      indicesCount,
    );
    indicesBuffer.getBufferData(indices);
    return indices;
  }

  static createIndexTypedArray(indexDatatype, size) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("size", size, 0);
    //>>includeEnd('debug');

    switch (indexDatatype) {
      case IndexDatatype.UNSIGNED_BYTE:
        return new Uint8Array(size);
      case IndexDatatype.UNSIGNED_SHORT:
        return new Uint16Array(size);
      case IndexDatatype.UNSIGNED_INT:
        return new Uint32Array(size);
    }
    throw new DeveloperError(
      `The indexDatatype must be UNSIGNED_BYTE (${IndexDatatype.UNSIGNED_BYTE}, ` +
        `UNSIGNED_SHORT (${IndexDatatype.UNSIGNED_SHORT}, or ` +
        `UNSIGNED_INT (${IndexDatatype.UNSIGNED_INT}, but is ${indexDatatype}`,
    );
  }

  static createTriangleIndicesTypedArray(primitive) {
    const rawIndices = ModelPrimitives.getRawIndices(primitive.indices);
    const primitiveType = primitive.primitiveType;
    if (primitiveType === PrimitiveType.TRIANGLES) {
      return rawIndices;
    }
    if (primitiveType === PrimitiveType.TRIANGLE_STRIP) {
      const indices = ModelPrimitives.createIndexTypedArray(
        primitive.indices.indexDatatype,
        (rawIndices.length - 2) * 3,
      );
      for (let i = 0; i < rawIndices.length - 2; i++) {
        if (i % 2 === 1) {
          indices[i * 3 + 0] = rawIndices[i + 0];
          indices[i * 3 + 1] = rawIndices[i + 2];
          indices[i * 3 + 2] = rawIndices[i + 1];
        } else {
          indices[i * 3 + 0] = rawIndices[i + 0];
          indices[i * 3 + 1] = rawIndices[i + 1];
          indices[i * 3 + 2] = rawIndices[i + 2];
        }
      }
      return indices;
    }
    if (primitiveType === PrimitiveType.TRIANGLE_FAN) {
      const indices = ModelPrimitives.createIndexTypedArray(
        primitive.indices.indexDatatype,
        (rawIndices.length - 2) * 3,
      );
      for (let i = 0; i < rawIndices.length - 2; i++) {
        indices[i * 3 + 0] = rawIndices[i + 0];
        indices[i * 3 + 1] = rawIndices[i + 1];
        indices[i * 3 + 2] = rawIndices[i + 2];
      }
      return indices;
    }
    throw new DeveloperError(
      `The primitive.primitiveType must be TRIANGLES (${PrimitiveType.TRIANGLES}, ` +
        `UNSIGNED_SHORT (${PrimitiveType.TRIANGLE_STRIP}, or ` +
        `UNSIGNED_INT (${PrimitiveType.TRIANGLE_FAN}, but is ${primitiveType}`,
    );
  }
}

export default ModelPrimitives;
