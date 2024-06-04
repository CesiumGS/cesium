import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import ModelComponents from "../ModelComponents.js";
import ModelUtility from "./ModelUtility.js";

/**
 * The primitive statistics update stage updates memory usage statistics
 * on the primitive level. This counts the binary resources that exist
 * for the lifetime of the Model (e.g. attributes and textures
 * loaded by GltfLoader). It does not count resources that are created
 * every time the pipeline is run. The individual pipeline stages are
 * responsible for tracking the additional memory they allocate.
 *
 * @namespace PrimitiveStatisticsPipelineStage
 *
 * @private
 */
const PrimitiveStatisticsPipelineStage = {
  name: "PrimitiveStatisticsPipelineStage", // Helps with debugging

  // Expose some methods for testing
  _countGeometry: countGeometry,
  _count2DPositions: count2DPositions,
  _countMorphTargetAttributes: countMorphTargetAttributes,
  _countMaterialTextures: countMaterialTextures,
  _countFeatureIdTextures: countFeatureIdTextures,
  _countBinaryMetadata: countBinaryMetadata,
};

PrimitiveStatisticsPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  const model = renderResources.model;
  const statistics = model.statistics;

  countGeometry(statistics, primitive);
  count2DPositions(statistics, renderResources.runtimePrimitive);
  countMorphTargetAttributes(statistics, primitive);
  countMaterialTextures(statistics, primitive.material);
  countFeatureIdTextures(statistics, primitive.featureIds);
  countBinaryMetadata(statistics, model);

  // The following stages handle their own memory statistics, since all their
  // resources are generated each time draw commands are built:
  //
  // - PickingPipelineStage
  // - WireframePipelineStage
  // - InstancingPipelineStage
  // - FeatureIdPipelineStage (feature ID implicit ranges only)
};

function countGeometry(statistics, primitive) {
  const indicesCount = defined(primitive.indices)
    ? primitive.indices.count
    : ModelUtility.getAttributeBySemantic(primitive, "POSITION").count;

  const primitiveType = primitive.primitiveType;

  if (primitiveType === PrimitiveType.POINTS) {
    statistics.pointsLength += indicesCount;
  } else if (PrimitiveType.isTriangles(primitiveType)) {
    statistics.trianglesLength += countTriangles(primitiveType, indicesCount);
  }

  const attributes = primitive.attributes;
  const length = attributes.length;
  for (let i = 0; i < length; i++) {
    const attribute = attributes[i];
    if (defined(attribute.buffer)) {
      const hasCpuCopy = defined(attribute.typedArray);
      statistics.addBuffer(attribute.buffer, hasCpuCopy);
    }
  }

  const outlineCoordinates = primitive.outlineCoordinates;
  if (defined(outlineCoordinates) && defined(outlineCoordinates.buffer)) {
    const hasCpuCopy = false;
    statistics.addBuffer(outlineCoordinates.buffer, hasCpuCopy);
  }

  const indices = primitive.indices;
  if (defined(indices) && defined(indices.buffer)) {
    // Wireframe mode will have both GPU and CPU copies
    const hasCpuCopy = defined(indices.typedArray);
    statistics.addBuffer(indices.buffer, hasCpuCopy);
  }
}

function countTriangles(primitiveType, indicesCount) {
  switch (primitiveType) {
    case PrimitiveType.TRIANGLES:
      return indicesCount / 3;
    case PrimitiveType.TRIANGLE_STRIP:
    case PrimitiveType.TRIANGLE_FAN:
      return Math.max(indicesCount - 2, 0);
    default:
      return 0;
  }
}

function count2DPositions(statistics, runtimePrimitive) {
  const buffer2D = runtimePrimitive.positionBuffer2D;

  // The 2D buffer is only created the first time the scene switches to 2D mode.
  // This means there's two main cases for accounting for 2D positions:
  // 1. The scene was in 3D mode so positions were never generated from
  //    positionAttribute.typedArray. In this case, countGeometry() will
  //    detect the typed array and set hasCpuCopy = true. No memory is counted
  //    here.
  // 2. The scene was in 2D mode so positions were generated as a buffer.
  //    Even though the typed array was unlinked from the attribute, it still
  //    exists in the loader so we count it here.
  if (defined(buffer2D)) {
    const hasCpuCopy = true;
    statistics.addBuffer(buffer2D, hasCpuCopy);
  }
}

function countMorphTargetAttributes(statistics, primitive) {
  const morphTargets = primitive.morphTargets;
  if (!defined(morphTargets)) {
    return;
  }

  const hasCpuCopy = false;
  const morphTargetsLength = morphTargets.length;
  for (let i = 0; i < morphTargetsLength; i++) {
    const attributes = morphTargets[i].attributes;

    const attributesLength = attributes.length;
    for (let j = 0; j < attributesLength; j++) {
      const attribute = attributes[j];

      if (defined(attribute.buffer)) {
        statistics.addBuffer(attribute.buffer, hasCpuCopy);
      }
    }
  }
}

function countMaterialTextures(statistics, material) {
  // gltf-pipeline provides a default material so material will always be
  // defined.
  const textureReaders = getAllTextureReaders(material);
  const length = textureReaders.length;
  for (let i = 0; i < length; i++) {
    const textureReader = textureReaders[i];
    // If textures were loaded asynchronously, the texture may not be available
    // the first time this is run.
    if (defined(textureReader) && defined(textureReader.texture)) {
      statistics.addTexture(textureReader.texture);
    }
  }
}

function getAllTextureReaders(material) {
  const metallicRoughness = material.metallicRoughness;
  const textureReaders = [
    material.emissiveTexture,
    material.normalTexture,
    material.occlusionTexture,
    metallicRoughness.baseColorTexture,
    metallicRoughness.metallicRoughnessTexture,
  ];

  const specularGlossiness = material.specularGlossiness;
  if (defined(specularGlossiness)) {
    textureReaders.push(specularGlossiness.diffuseTexture);
    textureReaders.push(specularGlossiness.specularGlossinessTexture);
  }

  return textureReaders;
}

function countFeatureIdTextures(statistics, featureIdSets) {
  // Feature ID attributes are handled by countGeometry()

  // Feature ID implicit ranges are handled in the FeatureIdPipelineStage,
  // as they only are created as-needed.

  const length = featureIdSets.length;
  for (let i = 0; i < length; i++) {
    const featureIds = featureIdSets[i];
    if (featureIds instanceof ModelComponents.FeatureIdTexture) {
      const textureReader = featureIds.textureReader;
      if (defined(textureReader.texture)) {
        statistics.addTexture(textureReader.texture);
      }
    }
  }
}

function countBinaryMetadata(statistics, model) {
  // Add metadata memory to the statistics. Note that feature ID memory is
  // handled by the Feature ID pipeline stage.
  const structuralMetadata = model.structuralMetadata;
  if (defined(structuralMetadata)) {
    // Property textures are added to the texture memory count. If textures
    // are loaded asynchronously, this may add 0 to the total. The pipeline
    // will be re-run when textures are loaded for an accurate count.
    countPropertyTextures(statistics, structuralMetadata);

    // Property tables are accounted for here.
    statistics.propertyTablesByteLength +=
      structuralMetadata.propertyTablesByteLength;

    // Skip property attributes since those are handled in countGeometry().
  }

  // Model feature tables also have batch and pick textures that need to be
  // counted.
  const featureTables = model.featureTables;
  if (!defined(featureTables)) {
    return;
  }

  const length = featureTables.length;
  for (let i = 0; i < length; i++) {
    const featureTable = featureTables[i];

    // This does not include the property table memory, since
    // it is counted through the structuralMetadata above.
    statistics.addBatchTexture(featureTable.batchTexture);
  }
}

function countPropertyTextures(statistics, structuralMetadata) {
  const propertyTextures = structuralMetadata.propertyTextures;
  if (!defined(propertyTextures)) {
    return;
  }

  // Loop over the property textures from here so we can use
  // statistics.addTexture() which avoids double-counting shared textures.
  const texturesLength = propertyTextures.length;
  for (let i = 0; i < texturesLength; i++) {
    const propertyTexture = propertyTextures[i];
    const properties = propertyTexture.properties;
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const property = properties[propertyId];
        const textureReader = property.textureReader;
        if (defined(textureReader.texture)) {
          statistics.addTexture(textureReader.texture);
        }
      }
    }
  }
}

export default PrimitiveStatisticsPipelineStage;
