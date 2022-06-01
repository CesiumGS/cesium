import defined from "../../Core/defined.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";

/**
 * The statistics update stage updates memory usage statistics for binary
 * resources that exist for the lifetime of the ModelExperimental (e.g.
 * resources loaded by GltfLoader). It does not count resources that are
 * created every time the pipeline is run, the individual pipeline stages are
 * responsible for keeping track of additional memory they allocate.
 *
 * @namespace StatisticsUpdateStage
 *
 * @private
 */
const StatisticsUpdateStage = {};
StatisticsUpdateStage.name = "StatisticsUpdateStage"; // Helps with debugging

StatisticsUpdateStage.update = function (runtimePrimitive, sceneGraph) {
  const model = sceneGraph._model;
  const statistics = model.statistics;

  // We only need to update statistics when dirty
  if (!statistics.dirty) {
    return;
  }

  const primitive = runtimePrimitive.primitive;

  countGeometry(statistics, primitive);
  countMorphTargetAttributes(statistics, primitive);
  countMaterialTextures(statistics, primitive.material);
  countBinaryMetadata(statistics, model);

  statistics.dirty = false;
};

function countGeometry(statistics, primitive) {
  const indicesCount = defined(primitive.indices)
    ? primitive.indices.count
    : ModelExperimentalUtility.getAttributeBySemantic(primitive, "POSITION")
        .count;

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

function countBinaryMetadata(statistics, model) {
  // Add metadata memory to the statistics. Note that feature ID memory is
  // handled by the Feature ID pipeline stage.
  const structuralMetadata = model.structuralMetadata;
  if (defined(structuralMetadata)) {
    // Property textures are added to the texture memory count. If textures
    // are loaded asynchronously, this may add 0 to the total. The pipeline
    // will be re-run when textures are loaded for an accurate count.
    countPropertyTextures(statistics, structuralMetadata);

    // Property tables are accounted for here
    statistics.propertyTablesByteLength +=
      structuralMetadata.propertyTablesByteLength;

    // Intentionally skip property attributes since those are handled in
    // countGeometry()
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

    // This does not include the property table memory, as that is already
    // counted through the structuralMetadata above.
    statistics.propertyTablesByteLength += featureTable.batchTextureByteLength;
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

export default StatisticsUpdateStage;
