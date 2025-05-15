import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import PrimitiveOutlineGenerator from "./Model/PrimitiveOutlineGenerator.js";
import AttributeCompression from "../Core/AttributeCompression.js";
import Cartesian3 from "../Core/Cartesian3.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import ModelUtility from "./Model/ModelUtility.js";
import CesiumMath from "../Core/Math.js";
/**
 * Simple struct for tracking whether an attribute will be loaded as a buffer
 * or typed array after post-processing.
 *
 * @alias PrimitiveLoadPlan.AttributeLoadPlan
 * @constructor
 *
 * @param {ModelComponents.Attribute} attribute The attribute to be updated
 *
 * @private
 */
function AttributeLoadPlan(attribute) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("attribute", attribute);
  //>>includeEnd('debug');

  /**
   * The attribute to track.
   *
   * @type {ModelComponents.Attribute}
   * @readonly
   * @private
   */
  this.attribute = attribute;

  /**
   * Whether the attribute will be loaded as a GPU buffer by the time
   * {@link PrimitiveLoadPlan#postProcess} is finished.
   *
   * @type {boolean}
   * @private
   */
  this.loadBuffer = false;

  /**
   * Whether the attribute will be loaded as a packed typed array by the time
   * {@link PrimitiveLoadPlan#postProcess} is finished.
   *
   * @type {boolean}
   * @private
   */
  this.loadTypedArray = false;
}

/**
 * Simple struct for tracking whether an index buffer will be loaded as a buffer
 * or typed array after post-processing.
 *
 * @alias PrimitiveLoadPlan.IndicesLoadPlan
 * @constructor
 *
 * @param {ModelComponents.Indices} indices The indices to be updated
 *
 * @private
 */
function IndicesLoadPlan(indices) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("indices", indices);
  //>>includeEnd('debug');

  /**
   * The indices to track.
   *
   * @type {ModelComponents.Indices}
   * @readonly
   * @private
   */
  this.indices = indices;

  /**
   * Whether the indices will be loaded as a GPU buffer by the time
   * {@link PrimitiveLoadPlan#postProcess} is finished.
   *
   * @type {boolean}
   * @private
   */
  this.loadBuffer = false;

  /**
   * Whether the indices will be loaded as a typed array copy of the GPU
   * buffer by the time {@link PrimitiveLoadPlan#postProcess} is finished.
   *
   * @type {boolean}
   * @private
   */
  this.loadTypedArray = false;
}

/**
 * Primitives may need post-processing steps after their attributes and indices
 * have loaded, such as generating outlines for the CESIUM_primitive_outline glTF
 * extension. This object tracks what indices and attributes need to be
 * post-processed.
 *
 * @alias PrimitiveLoadPlan
 * @constructor
 *
 * @param {ModelComponents.Primitive} primitive The primitive to track
 *
 * @private
 */
function PrimitiveLoadPlan(primitive) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("primitive", primitive);
  //>>includeEnd('debug');

  /**
   * The primitive to track.
   *
   * @type {ModelComponents.Primitive}
   * @readonly
   * @private
   */
  this.primitive = primitive;

  /**
   * A flat list of attributes that need to be post-processed. This includes
   * both regular attributes and morph target attributes.
   *
   * @type {PrimitiveLoadPlan.AttributeLoadPlan[]}
   * @private
   */
  this.attributePlans = [];

  /**
   * Information about the triangle indices that need to be post-processed,
   * if they exist.
   *
   * @type {PrimitiveLoadPlan.IndicesLoadPlan}
   * @private
   */
  this.indicesPlan = undefined;

  /**
   * Set this true to indicate that the primitive has the
   * CESIUM_primitive_outline extension and needs to be post-processed
   *
   * @type {boolean}
   * @private
   */
  this.needsOutlines = false;

  /**
   * The outline edge indices from the CESIUM_primitive_outline extension
   *
   * @type {number[]}
   * @private
   */
  this.outlineIndices = undefined;

  /**
   * Set this true to indicate that the primitive has the
   * KHR_gaussian_splatting extension and needs to be post-processed
   *
   * @type {boolean}
   * @private
   */
  this.needsGaussianSplats = false;

  /**
   * Set this to true if generating textures for Gaussian Splat rendering
   *
   * @type {boolean}
   * @private
   */
  this.generateGaussianSplatTexture = false;
}

/**
 * Apply post-processing steps that may modify geometry such as generating
 * outline coordinates. If no post-processing steps are needed, this function
 * is a no-op.
 *
 * @param {Context} context The context for generating buffers on the GPU
 */
PrimitiveLoadPlan.prototype.postProcess = function (context) {
  // Handle CESIUM_primitive_outline. This modifies indices and attributes and
  // also generates a new attribute for the outline coordinates. These steps
  // are synchronous.
  if (this.needsOutlines) {
    generateOutlines(this);
    generateBuffers(this, context);
  }

  if (this.needsSpzAttributes) {
    this.primitive.isGaussianSplatPrimitive = true;
    prepareSpzData(this, context);
    setupGaussianSplatBuffers(this, context);
    if (this.generateGaussianSplatTexture) {
      this.attributePlans.forEach((attr) => {
        this.primitive.needsGaussianSplatTexture = true;
      });
    }
  }

  //handle splat post-processing for point primitives
  if (this.needsGaussianSplats) {
    this.primitive.isGaussianSplatPrimitive = true;
    setupGaussianSplatBuffers(this, context);
    if (this.generateGaussianSplatTexture) {
      this.attributePlans.forEach((attr) => {
        dequantizeSplatMeshopt(attr);
        this.primitive.needsGaussianSplatTexture = true;
      });
    }
  }
};

function generateOutlines(loadPlan) {
  const primitive = loadPlan.primitive;
  const indices = primitive.indices;

  const vertexCount = primitive.attributes[0].count;

  const generator = new PrimitiveOutlineGenerator({
    triangleIndices: indices.typedArray,
    outlineIndices: loadPlan.outlineIndices,
    originalVertexCount: vertexCount,
  });

  // The generator modifies/adds indices. In some uncommon cases it may have
  // to upgrade to 16- or 32-bit indices so the datatype may change.
  indices.typedArray = generator.updatedTriangleIndices;
  indices.indexDatatype = IndexDatatype.fromTypedArray(indices.typedArray);

  // The outline generator creates a new attribute for the outline coordinates
  // that are used with a lookup texture.
  const outlineCoordinates = makeOutlineCoordinatesAttribute(
    generator.outlineCoordinates,
  );
  const outlineCoordinatesPlan = new AttributeLoadPlan(outlineCoordinates);
  outlineCoordinatesPlan.loadBuffer = true;
  outlineCoordinatesPlan.loadTypedArray = false;
  loadPlan.attributePlans.push(outlineCoordinatesPlan);
  primitive.outlineCoordinates = outlineCoordinatesPlan.attribute;

  // Some vertices may be copied due to the addition of the new attribute
  // which may have multiple values at a vertex depending on the face
  const attributePlans = loadPlan.attributePlans;
  const attributesLength = loadPlan.attributePlans.length;
  for (let i = 0; i < attributesLength; i++) {
    const attribute = attributePlans[i].attribute;
    attribute.typedArray = generator.updateAttribute(attribute.typedArray);
  }
}

function makeOutlineCoordinatesAttribute(outlineCoordinatesTypedArray) {
  const attribute = new ModelComponents.Attribute();
  attribute.name = "_OUTLINE_COORDINATES";
  attribute.typedArray = outlineCoordinatesTypedArray;
  attribute.componentDatatype = ComponentDatatype.FLOAT;
  attribute.type = AttributeType.VEC3;
  attribute.normalized = false;
  attribute.count = outlineCoordinatesTypedArray.length / 3;

  return attribute;
}

function prepareSpzData(loadPlan, context) {
  const rgb = ModelUtility.getAttributeByName(loadPlan.primitive, "COLOR_0");
  const alpha = ModelUtility.getAttributeBySemantic(
    loadPlan.primitive,
    VertexAttributeSemantic.OPACITY,
  );
  const rgbVals = rgb.typedArray;
  const rgba = new Uint8Array((rgbVals.length / 3) * 4);
  for (let i = 0; i < rgbVals.length / 3; i++) {
    rgba[i * 4] = rgbVals[i * 3];
    rgba[i * 4 + 1] = rgbVals[i * 3 + 1];
    rgba[i * 4 + 2] = rgbVals[i * 3 + 2];
    rgba[i * 4 + 3] = CesiumMath.clamp(alpha.typedArray[i] * 255.0, 0.0, 255.0);
  }

  rgb.type = AttributeType.VEC4;
  rgb.typedArray = rgba;
  rgb.componentDatatype = ComponentDatatype.UNSIGNED_BYTE;
  rgb.normalized = false;

  loadPlan.primitive.attributes = loadPlan.primitive.attributes.filter(
    (attr) => attr.name !== "_OPACITY",
  );

  const position = ModelUtility.getAttributeBySemantic(
    loadPlan.primitive,
    VertexAttributeSemantic.POSITION,
  );

  for (let i = 0; i < position.typedArray.length; i += 3) {
    position.typedArray[i + 1] = -position.typedArray[i + 1];
    position.typedArray[i + 2] = -position.typedArray[i + 2];
  }

  const rotations = ModelUtility.getAttributeBySemantic(
    loadPlan.primitive,
    VertexAttributeSemantic.ROTATION,
  );

  //180* rotation around X.
  //Temporary until we can get SPZ supporting Z-up assets natively
  const rots = rotations.typedArray;
  for (let q = 0; q < rots.length; q += 4) {
    const w = rots[q];
    const x = -rots[q + 3];
    const y = rots[q + 2];
    const z = -rots[q + 1];

    rots[q] = y;
    rots[q + 1] = -x;
    rots[q + 2] = w;
    rots[q + 3] = -z;
  }
  rotations.typedArray = rots;
}

/**
 * Do our dequantizing here. When using meshopt, our positions are quantized,
 * as well as our quaternions. decodeFilterQuat returns quantized shorts
 */
function dequantizeSplatMeshopt(attribute) {
  if (
    attribute.name === "_ROTATION" &&
    attribute.componentDatatype === ComponentDatatype.SHORT
  ) {
    attribute.typedArray = AttributeCompression.dequantize(
      attribute.typedArray,
      ComponentDatatype.SHORT,
      AttributeType.VEC4,
      attribute.count,
    );
    attribute.componentDatatype = ComponentDatatype.FLOAT;
  }

  if (
    attribute.name === "POSITION" &&
    attribute.componentDatatype === ComponentDatatype.UNSIGNED_SHORT
  ) {
    const fa = Float32Array.from(
      attribute.typedArray,
      (n) => n / attribute.max.x,
    );
    attribute.typedArray = fa;
    attribute.componentDatatype = ComponentDatatype.FLOAT;
    attribute.normalized = false;
    attribute.constant = new Cartesian3(0, 0, 0);

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
    [attribute.min, attribute.max] = findMinMaxXY(attribute.typedArray);
  }
}

function setupGaussianSplatBuffers(loadPlan, context) {
  const attributePlans = loadPlan.attributePlans;
  const attrLen = attributePlans.length;
  for (let i = 0; i < attrLen; i++) {
    const attributePlan = attributePlans[i];
    //defer til much later into the pipeline
    attributePlan.loadBuffer = false;
    attributePlan.loadTypedArray = true;

    const attribute = attributePlan.attribute;
    dequantizeSplatMeshopt(attribute);
  }
}

function generateBuffers(loadPlan, context) {
  generateAttributeBuffers(loadPlan.attributePlans, context);

  if (defined(loadPlan.indicesPlan)) {
    generateIndexBuffers(loadPlan.indicesPlan, context);
  }
}

function generateAttributeBuffers(attributePlans, context) {
  const attributesLength = attributePlans.length;
  for (let i = 0; i < attributesLength; i++) {
    const attributePlan = attributePlans[i];
    const attribute = attributePlan.attribute;
    const typedArray = attribute.typedArray;

    if (attributePlan.loadBuffer) {
      const buffer = Buffer.createVertexBuffer({
        typedArray: typedArray,
        context: context,
        usage: BufferUsage.STATIC_DRAW,
      });
      buffer.vertexArrayDestroyable = false;
      attribute.buffer = buffer;
    }

    if (!attributePlan.loadTypedArray) {
      attribute.typedArray = undefined;
    }
  }
}

function generateIndexBuffers(indicesPlan, context) {
  const indices = indicesPlan.indices;
  if (indicesPlan.loadBuffer) {
    const buffer = Buffer.createIndexBuffer({
      typedArray: indices.typedArray,
      context: context,
      usage: BufferUsage.STATIC_DRAW,
      indexDatatype: indices.indexDatatype,
    });
    indices.buffer = buffer;
    buffer.vertexArrayDestroyable = false;
  }

  if (!indicesPlan.loadTypedArray) {
    indices.typedArray = undefined;
  }
}

PrimitiveLoadPlan.AttributeLoadPlan = AttributeLoadPlan;
PrimitiveLoadPlan.IndicesLoadPlan = IndicesLoadPlan;
export default PrimitiveLoadPlan;
