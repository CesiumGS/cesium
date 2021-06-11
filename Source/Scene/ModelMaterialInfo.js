import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import Matrix3 from "../Core/Matrix3.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import AlphaMode from "./AlphaMode.js";
import ModelComponents from "./ModelComponents.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

var Material = ModelComponents.Material;
var MetallicRoughness = ModelComponents.MetallicRoughness;
var SpecularGlossiness = ModelComponents.SpecularGlossiness;

export default function ModelMaterialInfo() {
  this.diffuseTextureInfo = undefined;
  this.specularGlossinessTextureInfo = undefined;
  this.baseColorTextureInfo = undefined;
  this.metallicRoughnessTextureInfo = undefined;
  this.emissiveTextureInfo = undefined;
  this.normalTextureInfo = undefined;
  this.occlusionTextureInfo = undefined;

  this.usesDiffuseFactor = false;
  this.usesSpecularFactor = false;
  this.usesGlossinessFactor = false;
  this.usesBaseColorFactor = false;
  this.usesMetallicFactor = false;
  this.usesRoughnessFactor = false;
  this.usesEmissiveFactor = false;

  this.doubleSided = false;
  this.usesAlphaCutoff = false;

  this.attributes = [];
  this.applyInVertexShader = false;
}

function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}

function TextureInfo(texture) {
  this.texture = texture;
  this.texCoord = texture.texCoord;
  this.usesTextureTransform = usesTextureTransform(texture);
}

ModelMaterialInfo.fromPrimitive = function (options) {
  var primitive = options.primitive;
  var context = options.context;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.context", context);
  //>>includeEnd('debug');

  var materialInfo = new ModelMaterialInfo();
  var material = primitive.material;

  var unlit = usesUnlitShader(primitive);
  var specularGlossiness = material.specularGlossiness;
  var metallicRoughness = material.metallicRoughness;

  // Specular glossiness has precedence over metallic roughness
  var usesSpecularGlossiness = defined(specularGlossiness);
  var usesMetallicRoughness =
    defined(metallicRoughness) && !usesSpecularGlossiness;

  if (usesSpecularGlossiness) {
    var diffuseTexture = specularGlossiness.diffuseTexture;
    var diffuseFactor = specularGlossiness.diffuseFactor;

    if (defined(diffuseTexture)) {
      materialInfo.diffuseTextureInfo = new TextureInfo(diffuseTexture);
    }

    materialInfo.usesDiffuseFactor = !Cartesian4.equals(
      diffuseFactor,
      SpecularGlossiness.DEFAULT_DIFFUSE_FACTOR
    );

    if (!unlit) {
      var specularGlossinessTexture =
        specularGlossiness.specularGlossinessTexture;
      var specularFactor = specularGlossiness.specularFactor;
      var glossinessFactor = specularGlossiness.glossinessFactor;

      if (defined(specularGlossinessTexture)) {
        materialInfo.specularGlossinessTextureInfo = new TextureInfo(
          specularGlossinessTexture
        );
      }
      materialInfo.usesSpecularFactor = !Cartesian3.equals(
        specularFactor,
        SpecularGlossiness.DEFAULT_SPECULAR_FACTOR
      );
      materialInfo.usesGlossinessFactor =
        glossinessFactor !== SpecularGlossiness.DEFAULT_GLOSSINESS_FACTOR;
    }
  }

  if (usesMetallicRoughness) {
    var baseColorTexture = metallicRoughness.baseColorTexture;
    var baseColorFactor = metallicRoughness.baseColorFactor;

    if (defined(baseColorTexture)) {
      materialInfo.baseColorTextureInfo = new TextureInfo(baseColorTexture);
    }

    materialInfo.usesBaseColorFactor = !Cartesian4.equals(
      baseColorFactor,
      MetallicRoughness.DEFAULT_BASE_COLOR_FACTOR
    );

    if (!unlit) {
      var metallicRoughnessTexture = metallicRoughness.metallicRoughnessTexture;
      var metallicFactor = metallicRoughness.metallicFactor;
      var roughnessFactor = metallicRoughness.roughnessFactor;

      if (defined(metallicRoughnessTexture)) {
        materialInfo.metallicRoughnessTextureInfo = new TextureInfo(
          metallicRoughnessTexture
        );
      }
      materialInfo.usesMetallicFactor =
        metallicFactor !== MetallicRoughness.DEFAULT_METALLIC_FACTOR;
      materialInfo.usesRoughnessFactor =
        roughnessFactor !== MetallicRoughness.DEFAULT_ROUGHNESS_FACTOR;
    }
  }

  if (!unlit) {
    var emissiveTexture = material.emissiveTexture;
    var normalTexture = material.normalTexture;
    var occlusionTexture = material.occlusionTexture;
    var emissiveFactor = material.emissiveFactor;

    if (defined(emissiveTexture)) {
      materialInfo.emissiveTextureInfo = new TextureInfo(emissiveTexture);
    }
    if (usesNormalMapping(primitive, context)) {
      materialInfo.normalTextureInfo = new TextureInfo(normalTexture);
    }
    if (defined(occlusionTexture)) {
      materialInfo.occlusionTextureInfo = new TextureInfo(occlusionTexture);
    }
    materialInfo.usesEmissiveFactor = !Cartesian3.equals(
      emissiveFactor,
      Material.DEFAULT_EMISSIVE_FACTOR
    );
  }

  materialInfo.doubleSided = material.doubleSided;
  materialInfo.usesAlphaCutoff = material.alphaMode === AlphaMode.MASK;

  var attributes = getAttributesInUse(primitive, materialInfo, context);
  var applyInVertexShader = applyMaterialInVertexShader(
    primitive,
    attributes,
    materialInfo
  );

  materialInfo.attributes = attributes;
  materialInfo.applyInVertexShader = applyInVertexShader;

  return materialInfo;
};

function getAttributeWithSemantic(attributes, semantic, setIndex) {
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic && attribute.setIndex === setIndex) {
      return attribute;
    }
  }
  return undefined;
}

function hasAttributeWithSemantic(attributes, semantic, setIndex) {
  return defined(getAttributeWithSemantic(attributes, semantic, setIndex));
}

function usesUnlitShader(primitive) {
  var attributes = primitive.attributes;
  if (!hasAttributeWithSemantic(attributes, VertexAttributeSemantic.NORMAL)) {
    return true;
  }

  return primitive.material.unlit;
}

function usesNormalMapping(primitive, context) {
  var hasNormalAttribute = hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.NORMAL
  );

  var hasTangentAttribute = hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.TANGENT
  );

  var generateTangentAttribute =
    primitive.primitiveType !== PrimitiveType.POINTS &&
    context.standardDerivatives;

  return (
    !usesUnlitShader(primitive) &&
    defined(primitive.material.normalTexture) &&
    hasNormalAttribute &&
    (hasTangentAttribute || generateTangentAttribute)
  );
}

function materialUsesTextures(materialInfo) {
  return (
    defined(materialInfo.diffuseTextureInfo) ||
    defined(materialInfo.specularGlossinessTextureInfo) ||
    defined(materialInfo.baseColorTextureInfo) ||
    defined(materialInfo.metallicRoughnessTextureInfo) ||
    defined(materialInfo.emissiveTextureInfo) ||
    defined(materialInfo.normalTextureInfo) ||
    defined(materialInfo.occlusionTextureInfo)
  );
}

function materialUsesTexCoord(materialInfo, setIndex) {
  return [
    materialInfo.diffuseTextureInfo,
    materialInfo.specularGlossinessTextureInfo,
    materialInfo.baseColorTextureInfo,
    materialInfo.metallicRoughnessTextureInfo,
    materialInfo.emissiveTextureInfo,
    materialInfo.normalTextureInfo,
    materialInfo.occlusionTextureInfo,
  ].some(function (textureInfo) {
    return defined(textureInfo) && textureInfo.texCoord === setIndex;
  });
}

function usesPosition(primitive) {
  var semantic = VertexAttributeSemantic.POSITION;
  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }
  return !usesUnlitShader(primitive);
}

function usesNormal(primitive) {
  var semantic = VertexAttributeSemantic.NORMAL;
  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }
  return !usesUnlitShader(primitive);
}

function usesTangent(primitive, context) {
  var semantic = VertexAttributeSemantic.TANGENT;
  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }
  if (usesUnlitShader(primitive)) {
    return false;
  }
  return usesNormalMapping(primitive, context);
}

function usesTexCoord(primitive, materialInfo, setIndex) {
  var semantic = VertexAttributeSemantic.TEXCOORD;
  if (!hasAttributeWithSemantic(primitive.attributes, semantic, setIndex)) {
    return false;
  }
  return materialUsesTexCoord(materialInfo, setIndex);
}

function usesColor(primitive, setIndex) {
  var semantic = VertexAttributeSemantic.COLOR;
  return hasAttributeWithSemantic(primitive.attributes, semantic, setIndex);
}

function usesAttribute(primitive, attribute, materialInfo, context) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;

  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      return usesPosition(primitive);
    case VertexAttributeSemantic.NORMAL:
      return usesNormal(primitive);
    case VertexAttributeSemantic.TANGENT:
      return usesTangent(primitive, context);
    case VertexAttributeSemantic.TEXCOORD:
      return usesTexCoord(primitive, materialInfo, setIndex);
    case VertexAttributeSemantic.COLOR:
      return usesColor(primitive, setIndex);
  }
}

function getAttributesInUse(primitive, materialInfo, context) {
  return primitive.attributes.filter(function (attribute) {
    return usesAttribute(primitive, attribute, materialInfo, context);
  });
}

function applyMaterialInVertexShader(primitive, attributes, materialInfo) {
  var vertexTextureFetchSupported =
    ContextLimits.maximumVertexTextureImageUnits === 0;

  if (materialUsesTextures(materialInfo) && !vertexTextureFetchSupported) {
    return false;
  }

  if (primitive.primitiveType === PrimitiveType.POINTS) {
    return true;
  }

  if (attributes.length > 0) {
    // Material uses interpolated vertex attributes
    return false;
  }

  return true;
}
