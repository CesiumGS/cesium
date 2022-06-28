import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Buffer from "../Renderer/Buffer.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import PrimitiveOutlineGenerator from "./ModelExperimental/PrimitiveOutlineGenerator.js";

function AttributeLoadPlan(attribute) {
  this.attribute = attribute;
  this.loadBuffer = true;
  this.loadTypedArray = true;
  this.loadPackedTypedArray = true;
}

function IndicesLoadPlan(indices) {
  this.indices = indices;
  this.loadBuffer = true;
  this.loadTypedArray = true;
}

function PrimitiveLoadPlan(primitive) {
  this.primitive = primitive;

  // this is a flat list of all attributes and morph target attributes combined,
  // as the postprocessing doesn't need to distinguish them.
  this.attributePlans = [];

  this.indicesPlan = undefined;

  // Details for CESIUM_primitive_outline
  this.needsOutlines = false;
  this.outlineIndices = undefined;
  this._outlinesDirty = true;
}

PrimitiveLoadPlan.prototype.postProcess = function (frameState) {
  // Handle CESIUM_primitive_outline. This modifies indices and attributes and
  // also generates a new attribute for the outline coordinates. These steps
  // are synchronous.
  if (this.needsOutlines) {
    generateOutlines(this);
    generateBuffers(this, frameState);
  }

  // nothing needs to be done since we don't need postprocessing!
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
    generator.outlineCoordinates
  );
  const outlineCoordinatesPlan = new AttributeLoadPlan(outlineCoordinates);
  outlineCoordinatesPlan.loadBuffer = true;
  outlineCoordinatesPlan.loadTypedArray = false;
  outlineCoordinatesPlan.loadPackedTypedArray = false;
  loadPlan.attributePlans.push(outlineCoordinatesPlan);
  primitive.outlineCoordinates = outlineCoordinatesPlan.attribute;

  // Some vertices may be copied due to the addition of the new attribute
  // which may have multiple values at a vertex depending on the face
  const attributePlans = loadPlan.attributePlans;
  const attributesLength = loadPlan.attributePlans.length;
  for (let i = 0; i < attributesLength; i++) {
    const attribute = attributePlans[i].attribute;
    attribute.packedTypedArray = generator.updateAttribute(
      attribute.packedTypedArray
    );
  }
}

function makeOutlineCoordinatesAttribute(outlineCoordinatesTypedArray) {
  const attribute = new ModelComponents.Attribute();
  attribute.name = "_OUTLINE_COORDINATES";
  attribute.packedTypedArray = outlineCoordinatesTypedArray;
  attribute.componentDatatype = ComponentDatatype.FLOAT;
  attribute.type = AttributeType.VEC3;
  attribute.normalized = false;
  attribute.count = outlineCoordinatesTypedArray.length / 3;

  return attribute;
}

function generateBuffers(loadPlan, frameState) {
  const context = frameState.context;
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
    const packedTypedArray = attribute.packedTypedArray;

    if (attributePlan.loadBuffer) {
      const buffer = Buffer.createVertexBuffer({
        typedArray: packedTypedArray,
        context: context,
        usage: BufferUsage.STATIC_DRAW,
      });
      buffer.vertexArrayDestroyable = false;
      attribute.buffer = buffer;
    }

    if (attributePlan.loadTypedArray) {
      // ModelComponents.typedArray expects a Uint8Array, not an arbitrary
      // typed array
      attribute.typedArray = new Uint8Array(
        packedTypedArray.buffer,
        packedTypedArray.byteOffset,
        packedTypedArray.byteLength
      );
    }

    if (!attributePlan.loadPackedTypedArray) {
      attribute.packedTypedArray = undefined;
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

  if (!indicesPlan.loadIndexBuffer) {
    indices.typedArray = undefined;
  }
}

PrimitiveLoadPlan.AttributeLoadPlan = AttributeLoadPlan;
PrimitiveLoadPlan.IndicesLoadPlan = IndicesLoadPlan;
export default PrimitiveLoadPlan;
