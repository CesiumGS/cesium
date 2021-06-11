//import Cartesian3 from "../Core/Cartesian3.js";
//import Cartesian4 from "../Core/Cartesian4.js";
//import Check from "../Core/Check.js";
//import defaultValue from "../Core/defaultValue.js";
//import defined from "../Core/defined.js";
//import DeveloperError from "../Core/DeveloperError.js";
//import Matrix3 from "../Core/Matrix3.js";
//import oneTimeWarning from "../Core/oneTimeWarning.js";
//import PrimitiveType from "../Core/PrimitiveType.js";
//import RuntimeError from "../Core/RuntimeError.js";
//import AlphaMode from "./AlphaMode.js";
//import AttributeType from "./AttributeType.js";
//import CustomShader from "./CustomShader.js";
//import Expression from "./Expression.js";
//import InputSemantic from "./InputSemantic.js";
//import InstanceAttributeSemantic from "./InstanceAttributeSemantic.js";
//import MetadataType from "./MetadataType.js";
//import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

//var CARTESIAN3_ONE = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));
//var CARTESIAN4_ONE = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));

function ModelCommandInfo(options) {
  /*
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var node = options.node;
  var primitive = options.primitive;
  var context = options.context;
  var shaderString = options.shaderString;
  var style = options.style;
  var uniformMap = options.uniformMap;
  var featureMetadata = options.featureMetadata;
  var content = options.content;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.node", primitive);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.context", context);
  if (defined(shaderString) && defined(style)) {
    throw new DeveloperError(
      "options.shaderString and options.style cannot both be defined"
    );
  }
  //>>includeEnd('debug');

  var customShader;
  if (defined(shaderString)) {
    customShader = CustomShader.fromShaderString({
      shaderString: shaderString,
      primitive: primitive,
      uniformMap: uniformMap,
      featureMetadata: featureMetadata,
      content: content,
    });
  }

  var styleInfo;
  if (defined(style)) {
    styleInfo = CustomShader.fromStyle({
      style: style,
      primitive: primitive,
      uniformMap: uniformMap,
      featureMetadata: featureMetadata,
      content: content,
    });
    customShader = styleInfo.customShader;
  }

  var materialInfo = getMaterialInfo(primitive, context);
  var geometryInfo = getGeometryInfo(
    node,
    primitive,
    materialInfo,
    customShaderInfo,
    context
  );

  this.materialInfo = materialInfo;
  this.geometryInfo = geometryInfo;
  this.useFragmentShading = primitive.primitiveType !== PrimitiveType.POINTS;
  */
}

ModelCommandInfo.prototype.getShaderKey = function () {
  var materialKey = this.materialInfo.getShaderKey();
  var geometryKey = this.geometryInfo.getShaderKey();
  var otherKey = Number(this.useFragmentShading);

  return materialKey + "_" + geometryKey + "_" + otherKey;
};

function GeometryInfo() {
  this.usesNormal = false;
  this.usesNormalOctEncoded = false;
  this.usesNormalOctEncodedZXY = false;
  this.usesNormalQuantized = false;
  this.usesTangent = false;
  this.usesTangentOctEncoded = false;
  this.usesTangentOctEncodedZXY = false;
  this.usesTangentQuantized = false;
  this.usesTexCoord0 = false;
  this.usesTexCoord0Quantized = false;
  this.usesTexCoord1 = false;
  this.usesTexCoord1Quantized = false;
  this.usesVertexColor = false;
  this.usesVertexColorRGB = false;
  this.usesVertexColorQuantized = false;
  this.usesPositionQuantized = false;
  this.usesInstancing = false;
  this.usesInstancedTranslation = false;
  this.usesInstancedRotation = false;
  this.usesInstancedScale = false;
  this.usesInstancedFeatureId0 = false;
  this.usesInstancedFeatureId1 = false;
  this.usesSkinning = false;
  this.usesWeightsQuantized = false;
  this.usesMorphTargets = false;
  this.usesTargetPosition0 = false;
  this.usesTargetPosition1 = false;
  this.usesTargetPosition2 = false;
  this.usesTargetPosition3 = false;
  this.usesTargetPosition4 = false;
  this.usesTargetPosition5 = false;
  this.usesTargetPosition6 = false;
  this.usesTargetPosition7 = false;
  this.usesTargetNormal0 = false;
  this.usesTargetNormal1 = false;
  this.usesTargetNormal2 = false;
  this.usesTargetNormal3 = false;
  this.usesTargetTangent0 = false;
  this.usesTargetTangent1 = false;
  this.usesTargetTangent2 = false;
  this.usesTargetTangent3 = false;
  this.jointCount = 0;

  this.usedVertexAttributesLength = 0;
}

GeometryInfo.prototype.getShaderKey = function () {
  var part1 =
    this.usesNormal |
    (this.usesNormalOctEncoded << 2) |
    (this.usesNormalOctEncodedZXY << 3) |
    (this.usesNormalQuantized << 4) |
    (this.usesTangent << 5) |
    (this.usesTangentOctEncoded << 6) |
    (this.usesTangentOctEncodedZXY << 7) |
    (this.usesTangentQuantized << 8) |
    (this.usesTexCoord0 << 9) |
    (this.usesTexCoord0Quantized << 10) |
    (this.usesTexCoord1 << 11) |
    (this.usesTexCoord1Quantized << 12) |
    (this.usesVertexColor << 13) |
    (this.usesVertexColorRGB << 14) |
    (this.usesVertexColorQuantized << 15) |
    (this.usesPositionQuantized << 16) |
    (this.usesInstancing << 17) |
    (this.usesInstancedTranslation << 18) |
    (this.usesInstancedRotation << 19) |
    (this.usesInstancedScale << 20) |
    (this.usesInstancedFeatureId0 << 21) |
    (this.usesInstancedFeatureId1 << 22) |
    (this.usesSkinning << 23) |
    (this.usesWeightsQuantized << 24) |
    (this.usesMorphTargets << 25) |
    (this.usesTargetPosition0 << 26) |
    (this.usesTargetPosition1 << 27) |
    (this.usesTargetPosition2 << 28) |
    (this.usesTargetPosition3 << 29) |
    (this.usesTargetPosition4 << 30) |
    (this.usesTargetPosition5 << 31);

  var part2 =
    this.usesTargetPosition6 |
    (this.usesTargetPosition7 << 2) |
    (this.usesTargetNormal0 << 3) |
    (this.usesTargetNormal1 << 4) |
    (this.usesTargetNormal2 << 5) |
    (this.usesTargetNormal3 << 6) |
    (this.usesTargetTangent0 << 7) |
    (this.usesTargetTangent1 << 8) |
    (this.usesTargetTangent2 << 9) |
    (this.usesTargetTangent3 << 10);

  return part1 + "_" + part2 + "_" + this.jointCount;
};

function MaterialInfo() {
  this.usesDiffuseTexture = false;
  this.usesDiffuseTextureTransform = false;
  this.usesDiffuseTexCoord0 = false;
  this.usesSpecularGlossinessTexture = false;
  this.usesSpecularGlossinessTextureTransform = false;
  this.usesSpecularGlossinessTexCoord0 = false;
  this.usesDiffuseFactor = false;
  this.usesSpecularFactor = false;
  this.usesGlossinessFactor = false;
  this.usesBaseColorTexture = false;
  this.usesBaseColorTextureTransform = false;
  this.usesBaseColorTexCoord0 = false;
  this.usesMetallicRoughnessTexture = false;
  this.usesMetallicRoughnessTextureTransform = false;
  this.usesMetallicRoughnessTexCoord0 = false;
  this.usesBaseColorFactor = false;
  this.usesMetallicFactor = false;
  this.usesRoughnessFactor = false;
  this.usesEmissiveTexture = false;
  this.usesEmissiveTextureTransform = false;
  this.usesEmissiveTexCoord0 = false;
  this.usesNormalTexture = false;
  this.usesNormalTextureTransform = false;
  this.usesNormalTexCoord0 = false;
  this.usesOcclusionTexture = false;
  this.usesOcclusionTextureTransform = false;
  this.usesOcclusionTexCoord0 = false;
  this.usesEmissiveFactor = false;
  this.usesDoubleSided = false;
  this.usesAlphaCutoff = false;
  this.usesUnlitShader = false;
  this.usesSpecularGlossiness = false;
  this.usesMetallicRoughness = false;
}

MaterialInfo.prototype.getShaderKey = function () {
  var part1 =
    this.usesDiffuseTexture |
    (this.usesDiffuseTextureTransform << 2) |
    (this.usesDiffuseTexCoord0 << 3) |
    (this.usesSpecularGlossinessTexture << 4) |
    (this.usesSpecularGlossinessTextureTransform << 5) |
    (this.usesSpecularGlossinessTexCoord0 << 6) |
    (this.usesDiffuseFactor << 7) |
    (this.usesSpecularFactor << 8) |
    (this.usesGlossinessFactor << 9) |
    (this.usesBaseColorTexture << 10) |
    (this.usesBaseColorTextureTransform << 11) |
    (this.usesBaseColorTexCoord0 << 12) |
    (this.usesMetallicRoughnessTexture << 13) |
    (this.usesMetallicRoughnessTextureTransform << 14) |
    (this.usesMetallicRoughnessTexCoord0 << 15) |
    (this.usesBaseColorFactor << 16) |
    (this.usesMetallicFactor << 17) |
    (this.usesRoughnessFactor << 18) |
    (this.usesEmissiveTexture << 19) |
    (this.usesEmissiveTextureTransform << 20) |
    (this.usesEmissiveTexCoord0 << 21) |
    (this.usesNormalTexture << 22) |
    (this.usesNormalTextureTransform << 23) |
    (this.usesNormalTexCoord0 << 24) |
    (this.usesOcclusionTexture << 25) |
    (this.usesOcclusionTextureTransform << 26) |
    (this.usesOcclusionTexCoord0 << 27) |
    (this.usesEmissiveFactor << 28) |
    (this.usesDoubleSided << 29) |
    (this.usesAlphaCutoff << 30) |
    (this.usesUnlitShader << 31);

  var part2 = this.usesSpecularGlossiness | (this.usesMetallicRoughness << 2);

  return part1 + "_" + part2;
};

/*
function materialUsesTexCoord0(materialInfo) {
  return (
    materialInfo.usesDiffuseTexture &&
    materialInfo.usesDiffuseTexCoord0 &&
    materialInfo.usesSpecularGlossinessTexture &&
    materialInfo.usesSpecularGlossinessTexCoord0 &&
    materialInfo.usesBaseColorTexture &&
    materialInfo.usesBaseColorTexCoord0 &&
    materialInfo.usesMetallicRoughnessTexture &&
    materialInfo.usesMetallicRoughnessTexCoord0 &&
    materialInfo.usesEmissiveTexture &&
    materialInfo.usesEmissiveTexCoord0 &&
    materialInfo.usesNormalTexture &&
    materialInfo.usesNormalTexCoord0 &&
    materialInfo.usesOcclusionTexture &&
    materialInfo.usesOcclusionTexCoord0
  );
}
*/

/*
function materialUsesTexCoord1(materialInfo) {
  return (
    materialInfo.usesDiffuseTexture &&
    !materialInfo.usesDiffuseTexCoord0 &&
    materialInfo.usesSpecularGlossinessTexture &&
    !materialInfo.usesSpecularGlossinessTexCoord0 &&
    materialInfo.usesBaseColorTexture &&
    !materialInfo.usesBaseColorTexCoord0 &&
    materialInfo.usesMetallicRoughnessTexture &&
    !materialInfo.usesMetallicRoughnessTexCoord0 &&
    materialInfo.usesEmissiveTexture &&
    !materialInfo.usesEmissiveTexCoord0 &&
    materialInfo.usesNormalTexture &&
    !materialInfo.usesNormalTexCoord0 &&
    materialInfo.usesOcclusionTexture &&
    !materialInfo.usesOcclusionTexCoord0
  );
}
*/

/*
function getAttribute(attributes, semantic) {
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic) {
      return attribute;
    }
  }
  return undefined;
}

function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}

function usesTexCoord0(texture) {
  return texture.texCoord === 0;
}
*/

/*
function usesUnlitShader(primitive) {
  var normalAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.NORMAL
  );
  return !defined(normalAttribute) || primitive.material.unlit;
}
*/

/*
function usesNormalAttribute(primitive, customShaderInfo) {
  var normalAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.NORMAL
  );

  if (!defined(normalAttribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesNormal;
  }

  return !usesUnlitShader(primitive);
}
*/

/*
function usesTangentAttribute(primitive, customShaderInfo) {
  var normalAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.NORMAL
  );

  var tangentAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.TANGENT
  );

  if (!defined(tangentAttribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesTangent;
  }

  return (
    !usesUnlitShader(primitive) &&
    defined(primitive.material.normalTexture) &&
    defined(normalAttribute)
  );
}
*/

/*
function usesTexCoord0Attribute(primitive, materialInfo, customShaderInfo) {
  var texCoord0Attribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.TEXCOORD_0
  );

  if (!defined(texCoord0Attribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesTexCoord0;
  }

  return materialUsesTexCoord0(materialInfo);
}
*/

/*
function usesTexCoord1Attribute(primitive, materialInfo, customShaderInfo) {
  var texCoord1Attribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.TEXCOORD_1
  );

  if (!defined(texCoord1Attribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesTexCoord1;
  }

  return materialUsesTexCoord1(materialInfo);
}
*/

/*
function usesVertexColorAttribute(primitive) {
  var vertexColorAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.COLOR
  );

  if (!defined(vertexColorAttribute)) {
    return false;
  }

  if (defined(customShaderInfo)) {
    return customShaderInfo.usesVertexColor;
  }

  return true;
}
*/

/*
function getGeometryInfo(
  node,
  primitive,
  materialInfo,
  customShaderInfo,
  context
) {
  var usesNormal = usesNormalAttribute(primitive);
  var usesNormalQuantized = false;
  var usesNormalOctEncoded = false;
  var usesNormalOctEncodedZXY = false;

  if (usesNormal) {
    var normalAttribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.NORMAL
    );
    var normalQuantization = normalAttribute.quantization;

    if (defined(normalQuantization)) {
      usesNormalOctEncoded = normalQuantization.octEncoded;
      usesNormalOctEncodedZXY = normalQuantization.octEncodedZXY;
      usesNormalQuantized = !usesNormalOctEncoded;
    }
  }

  var usesTangent = usesTangentAttribute(primitive);
  var usesTangentQuantized = false;
  var usesTangentOctEncoded = false;
  var usesTangentOctEncodedZXY = false;

  if (usesTangent) {
    var tangentAttribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.TANGENT
    );
    var tangentQuantization = tangentAttribute.quantization;

    if (defined(tangentQuantization)) {
      usesTangentOctEncoded = tangentQuantization.octEncoded;
      usesTangentOctEncodedZXY = tangentQuantization.octEncodedZXY;
      usesTangentQuantized = !usesTangentOctEncoded;
    }
  }

  var usesTexCoord0 = usesTexCoord0Attribute(primitive, materialInfo);
  var usesTexCoord0Quantized = false;

  if (usesTexCoord0) {
    var texCoord0Attribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.TEXCOORD_0
    );
    usesTexCoord0Quantized = defined(texCoord0Attribute.quantization);
  }

  var usesTexCoord1 = usesTexCoord1Attribute(primitive, materialInfo);
  var usesTexCoord1Quantized = false;

  if (usesTexCoord1) {
    var texCoord1Attribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.TEXCOORD_1
    );
    usesTexCoord1Quantized = defined(texCoord1Attribute.quantization);
  }

  var usesVertexColor = usesVertexColorAttribute(primitive);
  var usesVertexColorRGB = false;
  var usesVertexColorQuantized = false;

  if (usesVertexColor) {
    var vertexColorAttribute = getAttribute(
      primitive.attributes,
      AttributeSemantic.COLOR
    );
    usesVertexColorRGB = vertexColorAttribute.type === AttributeType.VEC3;
    usesVertexColorQuantized = defined(vertexColorAttribute.quantization);
  }

  var usesPosition = true;
  var positionAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.POSITION
  );
  var usesPositionQuantized = defined(positionAttribute.quantized);

  var instances = node.instances;
  var usesInstancing = defined(instances);
  var usesInstancedTranslation = false;
  var usesInstancedRotation = false;
  var usesInstancedScale = false;
  var usesInstancedFeatureId0 = false;
  var usesInstancedFeatureId1 = false;
  var usedInstanceAttributesLength = 0;

  if (usesInstancing) {
    usesInstancedTranslation = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.TRANSLATION)
    );

    usesInstancedRotation = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.ROTATION)
    );

    usesInstancedScale = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.SCALE)
    );

    usesInstancedFeatureId0 = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.FEATURE_ID_0)
    );

    usesInstancedFeatureId1 = defined(
      getAttribute(instances.attributes, InstanceAttributeSemantic.FEATURE_ID_1)
    );

    if (context.instancedArrays) {
      if (usesInstancedRotation) {
        // If the instances have rotations load the attributes as typed arrays
        // so that instance matrices are computed on the CPU. This avoids the
        // expensive quaternion -> rotation matrix conversion in the shader.
        usedInstanceAttributesLength = 3;
      } else {
        usedInstanceAttributesLength =
          usesInstancedTranslation + usesInstancedScale;
      }

      usedInstanceAttributesLength +=
        usesInstancedFeatureId0 + usesInstancedFeatureId1;
    }
  }

  var jointsAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.JOINTS
  );
  var weightsAttribute = getAttribute(
    primitive.attributes,
    AttributeSemantic.WEIGHTS
  );
  var usesSkinning =
    defined(node.skin) && defined(jointsAttribute) && defined(weightsAttribute);
  var usesWeightsQuantized =
    usesSkinning && defined(weightsAttribute.quantized);
  var jointCount = usesSkinning ? node.skin.joints.length : 0;

  var morphTargets = primitive.morphTargets;
  var morphTargetsLength = morphTargets.length;
  var usesMorphTargets = morphTargetsLength > 0;

  for (var i = 0; i < morphTargetsLength; ++i) {
    var morphTarget = morphTargets[i];
    var attributes = morphTarget.attributes;
    var morphPositionAttribute = getAttribute(
      attributes,
      AttributeSemantic.POSITION
    );
    var morphNormalAttribute = getAttribute(
      attributes,
      AttributeSemantic.NORMAL
    );
    var morphTangentAttribute = getAttribute(
      attributes,
      AttributeSemantic.TANGENT
    );
  }

  // TODO: custom vertex attributes used in a style or custom shader

  var usedVertexAttributesLength =
    usesPosition +
    usesNormal +
    usesTangent +
    usesTexCoord0 +
    usesTexCoord1 +
    usesVertexColor +
    usedInstanceAttributesLength;

  var geometryInfo = new GeometryInfo();
  geometryInfo.usesNormal = usesNormal;
  geometryInfo.usesNormalOctEncoded = usesNormalOctEncoded;
  geometryInfo.usesNormalOctEncodedZXY = usesNormalOctEncodedZXY;
  geometryInfo.usesNormalQuantized = usesNormalQuantized;
  geometryInfo.usesTangent = usesTangent;
  geometryInfo.usesTangentOctEncoded = usesTangentOctEncoded;
  geometryInfo.usesTangentOctEncodedZXY = usesTangentOctEncodedZXY;
  geometryInfo.usesTangentQuantized = usesTangentQuantized;
  geometryInfo.usesTexCoord0 = usesTexCoord0;
  geometryInfo.usesTexCoord0Quantized = usesTexCoord0Quantized;
  geometryInfo.usesTexCoord1 = usesTexCoord1;
  geometryInfo.usesTexCoord1Quantized = usesTexCoord1Quantized;
  geometryInfo.usesVertexColor = usesVertexColor;
  geometryInfo.usesVertexColorRGB = usesVertexColorRGB;
  geometryInfo.usesVertexColorQuantized = usesVertexColorQuantized;
  geometryInfo.usesPositionQuantized = usesPositionQuantized;
  geometryInfo.usesInstancing = usesInstancing;
  geometryInfo.usesInstancedTranslation = usesInstancedTranslation;
  geometryInfo.usesInstancedRotation = usesInstancedRotation;
  geometryInfo.usesInstancedScale = usesInstancedScale;
  geometryInfo.usesInstancedFeatureId0 = usesInstancedFeatureId0;
  geometryInfo.usesInstancedFeatureId1 = usesInstancedFeatureId1;
  geometryInfo.usesSkinning = usesSkinning;
  geometryInfo.usesWeightsQuantized = usesWeightsQuantized;
  geometryInfo.usesMorphTargets = usesMorphTargets;
  geometryInfo.usesTargetPosition0 = false;
  geometryInfo.usesTargetPosition1 = false;
  geometryInfo.usesTargetPosition2 = false;
  geometryInfo.usesTargetPosition3 = false;
  geometryInfo.usesTargetPosition4 = false;
  geometryInfo.usesTargetPosition5 = false;
  geometryInfo.usesTargetPosition6 = false;
  geometryInfo.usesTargetPosition7 = false;
  geometryInfo.usesTargetNormal0 = false;
  geometryInfo.usesTargetNormal1 = false;
  geometryInfo.usesTargetNormal2 = false;
  geometryInfo.usesTargetNormal3 = false;
  geometryInfo.usesTargetTangent0 = false;
  geometryInfo.usesTargetTangent1 = false;
  geometryInfo.usesTargetTangent2 = false;
  geometryInfo.usesTargetTangent3 = false;
  geometryInfo.jointCount = jointCount;

  geometryInfo.usedVertexAttributesLength = usedVertexAttributesLength;

  return geometryInfo;
}
*/

/*
function getMaterialInfo(primitive, context) {
  var material = primitive.material;
  var specularGlossiness = material.specularGlossiness;
  var metallicRoughness = material.metallicRoughness;

  // Specular glossiness has precedence over metallic roughness
  var usesSpecularGlossiness = defined(specularGlossiness);
  var usesMetallicRoughness =
    defined(metallicRoughness) && !usesSpecularGlossiness;

  var unlit = usesUnlitShader(primitive);
  var usesNormal = usesNormalAttribute(primitive);
  var usesTangent = usesTangentAttribute(primitive);

  var usesDiffuseTexture =
    usesSpecularGlossiness && defined(specularGlossiness.diffuseTexture);

  var usesDiffuseTextureTransform =
    usesDiffuseTexture &&
    usesTextureTransform(specularGlossiness.diffuseTexture);

  var usesDiffuseTexCoord0 =
    usesDiffuseTexture && usesTexCoord0(specularGlossiness.diffuseTexture);

  var usesSpecularGlossinessTexture =
    !unlit &&
    usesSpecularGlossiness &&
    defined(specularGlossiness.specularGlossinessTexture);

  var usesSpecularGlossinessTextureTransform =
    usesSpecularGlossinessTexture &&
    usesTextureTransform(specularGlossiness.specularGlossinessTexture);

  var usesSpecularGlossinessTexCoord0 =
    usesSpecularGlossinessTexture &&
    usesTexCoord0(specularGlossiness.specularGlossinessTexture);

  var usesDiffuseFactor =
    usesSpecularGlossiness &&
    !Cartesian4.equals(specularGlossiness.diffuseFactor, CARTESIAN4_ONE);

  var usesSpecularFactor =
    !unlit &&
    usesSpecularGlossiness &&
    !Cartesian3.equals(specularGlossiness.specularFactor, CARTESIAN3_ONE);

  var usesGlossinessFactor =
    !unlit &&
    usesSpecularGlossiness &&
    specularGlossiness.glossinessFactor !== 1.0;

  var usesBaseColorTexture =
    usesMetallicRoughness && defined(metallicRoughness.baseColorTexture);

  var usesBaseColorTextureTransform =
    usesBaseColorTexture &&
    usesTextureTransform(metallicRoughness.baseColorTexture);

  var usesBaseColorTexCoord0 =
    usesBaseColorTexture && usesTexCoord0(metallicRoughness.baseColorTexture);

  var usesMetallicRoughnessTexture =
    !unlit &&
    usesMetallicRoughness &&
    defined(metallicRoughness.metallicRoughnessTexture);

  var usesMetallicRoughnessTextureTransform =
    usesMetallicRoughnessTexture &&
    usesTextureTransform(metallicRoughness.metallicRoughnessTexture);

  var usesMetallicRoughnessTexCoord0 =
    usesMetallicRoughnessTexture &&
    usesTexCoord0(metallicRoughness.metallicRoughnessTexture);

  var usesBaseColorFactor =
    usesMetallicRoughness &&
    !Cartesian3.equals(metallicRoughness.baseColorFactor, CARTESIAN4_ONE);

  var usesMetallicFactor =
    !unlit && usesMetallicRoughness && metallicRoughness.metallicFactor !== 1.0;

  var usesRoughnessFactor =
    !unlit &&
    usesMetallicRoughness &&
    metallicRoughness.roughnessFactor !== 1.0;

  var usesEmissiveTexture = !unlit && defined(material.emissiveTexture);

  var usesEmissiveTextureTransform =
    usesEmissiveTexture && usesTextureTransform(material.emissiveTexture);

  var usesEmissiveTexCoord0 =
    usesEmissiveTexture && usesTexCoord0(material.emissiveTexture);

  var usesNormalTexture =
    defined(material.normalTexture) &&
    usesNormal &&
    (usesTangent || context.standardDerivatives);

  var usesNormalTextureTransform =
    usesNormalTexture && usesTextureTransform(material.normalTexture);

  var usesNormalTexCoord0 =
    usesNormalTexture && usesTexCoord0(material.normalTexture);

  var usesOcclusionTexture = !unlit && defined(material.occlusionTexture);

  var usesOcclusionTextureTransform =
    usesOcclusionTexture && usesTextureTransform(material.occlusionTexture);

  var usesOcclusionTexCoord0 =
    usesOcclusionTexture && usesTexCoord0(material.occlusionTexture);

  var usesEmissiveFactor =
    !unlit && !Cartesian3.equals(material.emissiveFactor, Cartesian3.ZERO);

  var usesDoubleSided = material.doubleSided;

  var usesAlphaCutoff = material.alphaMode === AlphaMode.MASK;

  var materialInfo = new MaterialInfo();
  materialInfo.usesDiffuseTexture = usesDiffuseTexture;
  materialInfo.usesDiffuseTextureTransform = usesDiffuseTextureTransform;
  materialInfo.usesDiffuseTexCoord0 = usesDiffuseTexCoord0;
  materialInfo.usesSpecularGlossinessTexture = usesSpecularGlossinessTexture;
  materialInfo.usesSpecularGlossinessTextureTransform = usesSpecularGlossinessTextureTransform;
  materialInfo.usesSpecularGlossinessTexCoord0 = usesSpecularGlossinessTexCoord0;
  materialInfo.usesDiffuseFactor = usesDiffuseFactor;
  materialInfo.usesSpecularFactor = usesSpecularFactor;
  materialInfo.usesGlossinessFactor = usesGlossinessFactor;
  materialInfo.usesBaseColorTexture = usesBaseColorTexture;
  materialInfo.usesBaseColorTextureTransform = usesBaseColorTextureTransform;
  materialInfo.usesBaseColorTexCoord0 = usesBaseColorTexCoord0;
  materialInfo.usesMetallicRoughnessTexture = usesMetallicRoughnessTexture;
  materialInfo.usesMetallicRoughnessTextureTransform = usesMetallicRoughnessTextureTransform;
  materialInfo.usesMetallicRoughnessTexCoord0 = usesMetallicRoughnessTexCoord0;
  materialInfo.usesBaseColorFactor = usesBaseColorFactor;
  materialInfo.usesMetallicFactor = usesMetallicFactor;
  materialInfo.usesRoughnessFactor = usesRoughnessFactor;
  materialInfo.usesEmissiveTexture = usesEmissiveTexture;
  materialInfo.usesEmissiveTextureTransform = usesEmissiveTextureTransform;
  materialInfo.usesEmissiveTexCoord0 = usesEmissiveTexCoord0;
  materialInfo.usesNormalTexture = usesNormalTexture;
  materialInfo.usesNormalTextureTransform = usesNormalTextureTransform;
  materialInfo.usesNormalTexCoord0 = usesNormalTexCoord0;
  materialInfo.usesOcclusionTexture = usesOcclusionTexture;
  materialInfo.usesOcclusionTextureTransform = usesOcclusionTextureTransform;
  materialInfo.usesOcclusionTexCoord0 = usesOcclusionTexCoord0;
  materialInfo.usesEmissiveFactor = usesEmissiveFactor;
  materialInfo.usesDoubleSided = usesDoubleSided;
  materialInfo.usesAlphaCutoff = usesAlphaCutoff;
  materialInfo.usesUnlitShader = unlit;
  materialInfo.usesSpecularGlossiness = usesSpecularGlossiness;
  materialInfo.usesMetallicRoughness = usesMetallicRoughness;

  return materialInfo;
}
*/

export default ModelCommandInfo;
