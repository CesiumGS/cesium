import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix3 from "../Core/Matrix3.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RuntimeError from "../Core/RuntimeError.js";
import AlphaMode from "./AlphaMode.js";
import AttributeType from "./AttributeType.js";
import ColorBlendMode from "./ColorBlendMode.js";
import CustomShader from "./CustomShader.js";
import InputSemantic from "./InputSemantic.js";
import ModelComponents from "./ModelComponents.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

var MetallicRoughness = ModelComponents.MetallicRoughness;
var SpecularGlossiness = ModelComponents.SpecularGlossiness;
var Material = ModelComponents.Material;

function ShaderKey() {
  // attributes in use - this is any combination from the custom shader (or style)
  //                     or from the material.
  //                     inputs in use can be ignored but voxels might need this
  //
  // (although is this encompassed in the shader string?)
  // primitive attributes
  // primitive type (points)
  // feature id textures and feature id attributes
}

function ModelShader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var model = options.model;
  var node = options.node;
  var primitive = options.primitive;
  var context = options.context;
  var shaderString = options.shaderString;
  var style = options.style;
  var uniformMap = options.uniformMap;
  var featureMetadata = options.featureMetadata;
  var content = options.content;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.model", model);
  Check.typeOf.object("options.node", primitive);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.context", context);
  if (defined(shaderString) && defined(style)) {
    throw new DeveloperError(
      "options.shaderString and options.style cannot both be defined"
    );
  }
  //>>includeEnd('debug');

  var colorBlendMode = model.colorBlendMode;

  var customShader;
  if (defined(shaderString)) {
    customShader = CustomShader.fromShaderString({
      shaderString: shaderString,
      primitive: primitive,
      uniformMap: uniformMap,
      featureMetadata: featureMetadata,
      content: content,
    });

    // Custom shader renders over the material
    colorBlendMode = ColorBlendMode.REPLACE;
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

  if (defined(customShader)) {
    checkRequiredAttributes(primitive, customShader);
  }

  var materialInfo = getMaterialInfo(
    primitive,
    customShader,
    colorBlendMode,
    context
  );

  var attributes = getAttributesInUse(
    primitive,
    customShader,
    colorBlendMode,
    materialInfo,
    context
  );

  var attributeNameMap = getAttributeNameMap(attributes, customShader);

  // TODO: ignore second set for joints/weights

  // Shader cache key includes: the style object, the custom shader

  // Can custom shaders ever run on the vertex shader

  // Need to figure out which defines to set - but these are really for the well-known attributes
  // This is based on the attributes array. Which is determined by the custom shader/style and the material
  //
  // For custom attributes these need to be added to the shader in JS land
  // Some custom attributes will need to get fed to the fragment shader
  //
  // In order to set attribute with more than 2 set indices it also has to be in JS land
  //
  // Have to deal with color blend mode and its interaction with the style
  // Same with translucency
  //
  // Style still uses the material
  //
  // Need an area that sets the struct values: input, attribute, uniform, property
  //
  // Need a solution for storing metadata, as textures (float textures...), or vertex attributes in the case of point clouds
}

function getAttributeNameMap(attributes, customShader) {
  var attributeNameMap = defined(customShader)
    ? clone(customShader.attributeNameMap, false)
    : {};
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    var attributeName = attribute.name;
    if (defined(attribute.semantic)) {
      attributeNameMap[attributeName] = VertexAttributeSemantic.getVariableName(
        attribute.semantic,
        attribute.setIndex
      );
    } else if (!defined(attributeNameMap[attributeName])) {
      attributeNameMap[attributeName] = getGlslName(
        attributeName,
        "attribute",
        i
      );
    }
  }
  return attributeNameMap;
}

function getGlslName(name, type, uniqueId) {
  // If the variable name is not compatible with GLSL - e.g. has non-alphanumeric
  // characters like `:`, `-`, `#`, spaces, or unicode - use a placeholder variable name
  var glslCompatibleRegex = /^[a-zA-Z_]\w*$/;
  if (glslCompatibleRegex.test(name)) {
    return name;
  }
  return "czm_model_" + type + "_" + uniqueId;
}

function checkRequiredAttributes(primitive, customShader) {
  var attributes = primitive.attributes;
  var inputs = customShader.inputs;
  var inputsLength = inputs.length;
  for (var i = 0; i < inputsLength; ++i) {
    var input = inputs[i];
    var vertexAttributeSemantics = input.vertexAttributeSemantics;
    var setIndices = input.setIndices;
    var vertexAttributeSemanticsLength = vertexAttributeSemantics.length;
    for (var j = 0; j < vertexAttributeSemanticsLength; ++j) {
      var vertexAttributeSemantic = vertexAttributeSemantics[i];
      var setIndex = setIndices[i];
      if (
        !hasAttributeWithSemantic(attributes, vertexAttributeSemantic, setIndex)
      ) {
        throw new RuntimeError(
          "Required vertex attribute is missing: " + vertexAttributeSemantic
        );
      }
    }
  }
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getAttributeDefinitionName(attributeName) {
  return "a_" + attributeName;
}

function getAttributeDefinition(shaderType, attributeDefinitionName) {
  return "attribute " + shaderType + " " + attributeDefinitionName + ";\n";
}

function getUniformName(name, suffix) {
  return "u_" + name + suffix;
}

function getUniformDefinition(shaderType, uniformName) {
  return "uniform " + shaderType + " " + uniformName + ";\n";
}

function getShaderType(attribute) {
  var semantic = attribute.semantic;
  if (defined(semantic)) {
    return VertexAttributeSemantic.getShaderType(semantic);
  }

  var type = attribute.type;
  var componentDatatype = attribute.componentDatatype;

  if (type === AttributeType.SCALAR) {
    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
      case ComponentDatatype.UNSIGNED_BYTE:
      case ComponentDatatype.SHORT:
      case ComponentDatatype.UNSIGNED_SHORT:
        return "int";
      case ComponentDatatype.FLOAT:
        return "float";
    }
  }

  if (type === AttributeType.MAT2) {
    return "mat2";
  }
  if (type === AttributeType.MAT3) {
    return "mat3";
  }
  if (type === AttributeType.MAT4) {
    return "mat4";
  }

  var vectorPrefix = "";

  if (
    componentDatatype === ComponentDatatype.BYTE ||
    componentDatatype === ComponentDatatype.UNSIGNED_BYTE ||
    componentDatatype === ComponentDatatype.SHORT ||
    componentDatatype === ComponentDatatype.UNSIGNED_SHORT
  ) {
    vectorPrefix = "i";
  }

  switch (type) {
    case AttributeType.VEC2:
      return vectorPrefix + "vec2";
    case AttributeType.VEC3:
      return vectorPrefix + "vec3";
    case AttributeType.VEC4:
      return vectorPrefix + "vec4";
  }
}

function addAttributeDefinition(attribute, attributeName, shaderBuilder) {
  var attributeDefinitionName = getAttributeDefinitionName(attributeName);
  var quantization = attribute.quantization;
  var type = attribute.type;
  if (defined(quantization)) {
    type = quantization.type;
  }
  var attributeType = AttributeType.getShaderType(type);
  var attributeDefinition = getAttributeDefinition(
    attributeType,
    attributeDefinitionName
  );
  shaderBuilder.attributes += attributeDefinition;
}

function getAttributeReadFunction(
  attributeValue,
  attributeName,
  attributeType,
  shaderType
) {
  return (
    shaderType +
    " read" +
    capitalize(attributeName) +
    "(in " +
    attributeType +
    " " +
    attributeName +
    ")\n" +
    "{\n" +
    "    return " +
    attributeValue +
    ";\n" +
    "}\n"
  );
}

function addOctEncodedAttributeReader(attribute, attributeName, shaderBuilder) {
  var quantization = attribute.quantization;
  var type = quantization.type;
  var attributeType = AttributeType.getShaderType(type);
  var shaderType = getShaderType(attribute);

  var rangeUniformName = getUniformName(attributeName, "OctEncodedRange");
  var rangeUniformDefinition = getUniformDefinition("float", rangeUniformName);
  var swizzle = quantization.octEncodedZXY ? ".zxy" : "";

  var attributeValue =
    "czm_octDecode(" +
    attributeName +
    ".xy," +
    rangeUniformName +
    ")" +
    swizzle;

  var readFunction = getAttributeReadFunction(
    attributeValue,
    attributeName,
    attributeType,
    shaderType
  );

  shaderBuilder.functions += readFunction;
  shaderBuilder.uniforms += rangeUniformDefinition;
}

function castAttribute(attribute, attributeValue, attributeType, shaderType) {
  var semantic = attribute.semantic;
  if (semantic === VertexAttributeSemantic.COLOR) {
    if (attribute.type === AttributeType.VEC3) {
      return "vec4(" + attributeValue + ", 1.0)";
    }
  }
  if (attributeType !== shaderType) {
    return shaderType + "(" + attributeValue + ")";
  }
  return attributeValue;
}

function addQuantizedAttributeReader(attribute, attributeName, shaderBuilder) {
  var quantization = attribute.quantization;
  var type = quantization.type;
  var attributeType = AttributeType.getShaderType(type);
  var shaderType = getShaderType(attribute);

  var scaleUniformName = getUniformName(attributeName, "DequantizationScale");
  var offsetUniformName = getUniformName(attributeName, "DequantizationOffset");
  var scaleUniformDefinition = getUniformDefinition(
    shaderType,
    scaleUniformName
  );
  var offsetUniformDefinition = getUniformDefinition(
    shaderType,
    offsetUniformName
  );

  var attributeValue = attributeName + " * " + scaleUniformName;
  if (defined(quantization.quantizedVolumeOffset)) {
    attributeValue = " + " + offsetUniformName;
  }
  attributeValue = castAttribute(
    attribute,
    attributeValue,
    attributeType,
    shaderType
  );

  var readFunction = getAttributeReadFunction(
    attributeValue,
    attributeName,
    attributeType,
    shaderType
  );

  shaderBuilder.functions += readFunction;
  shaderBuilder.uniforms += scaleUniformDefinition;
  if (defined(quantization.quantizedVolumeOffset)) {
    shaderBuilder.uniforms += offsetUniformDefinition;
  }
}

function addAttributeReader(attribute, attributeName, shaderBuilder) {
  var type = attribute.type;
  var attributeType = AttributeType.getShaderType(type);
  var shaderType = getShaderType(attribute);

  var attributeValue = castAttribute(
    attribute,
    attributeName,
    attributeType,
    shaderType
  );

  var readFunction = getAttributeReadFunction(
    attributeValue,
    attributeName,
    attributeType,
    shaderType
  );
  shaderBuilder.functions += readFunction;
}

function ShaderBuilder() {
  this.uniformDefinitions = "";
  this.attributeDefinitions = "";
  this.functions = "";
  this.vertexShaderMain = "";
}

function addPositionDeclaration(
  usesMorphTargets,
  usesSkinning,
  usesInstancing,
  shaderBuilder
) {
  var positionDeclaration = "    vec3 position = readPosition(a_position);\n";
  if (usesMorphTargets) {
    positionDeclaration += "    position += getTargetPosition();\n";
  }
  if (usesSkinning) {
    positionDeclaration +=
      "    position = vec3(skinningMatrix * vec4(position, 1.0));";
  }
  if (usesInstancing) {
    positionDeclaration +=
      "    position = vec3(instanceMatrix * vec4(position, 1.0));";
  }

  shaderBuilder.vertexShaderMain += positionDeclaration;
}

function addNormalDeclaration(
  usesMorphTargets,
  usesSkinning,
  usesInstancing,
  shaderBuilder
) {
  var normalDeclaration = "    vec3 normal = readNormal(a_normal);\n";

  if (usesMorphTargets) {
    normalDeclaration += "    normal += getTargetNormal();\n";
  }
  if (usesSkinning) {
    normalDeclaration += "    normal += mat3(skinningMatrix) * normal;\n";
  }
  if (usesInstancing) {
    normalDeclaration +=
      "    normal = transpose(inverse(mat3(instanceMatrix))) * normal;\n";
  }

  normalDeclaration += "    normal = normalize(normal);\n";

  shaderBuilder.vertexShaderMain += normalDeclaration;
}

function addTangentDeclaration(
  attribute,
  usesMorphTargets,
  usesSkinning,
  usesInstancing,
  shaderBuilder
) {
  var type = attribute.type;
  var quantization = attribute.quantization;
  if (defined(quantization)) {
    type = quantization.type;
  }

  var shaderType = AttributeType.getShaderType(type);
  var lastComponent = type === AttributeType.VEC4 ? ".w" : ".z";

  var readTangentHandedness =
    "float readTangentHandedness(in " +
    shaderType +
    " tangent)\n" +
    "{\n" +
    "    return tangent" +
    lastComponent +
    ";\n" +
    "}\n";

  var tangentDeclaration =
    "    vec3 tangent = readTangent(a_tangent);\n" +
    "    float tangentHandedness = readTangentHandedness(a_tangent);\n";

  if (usesMorphTargets) {
    tangentDeclaration += "    tangent += getTargetTangent();\n";
  }
  if (usesSkinning) {
    tangentDeclaration += "    tangent += mat3(skinningMatrix) * tangent;\n";
  }
  if (usesInstancing) {
    tangentDeclaration += "    tangent = mat3(instanceMatrix) * tangent;\n";
  }

  tangentDeclaration += "    tangent = normalize(tangent);\n";

  shaderBuilder.functions += readTangentHandedness;
  shaderBuilder.vertexShaderMain += tangentDeclaration;
}

function addBitangentDeclaration(shaderBuilder) {
  shaderBuilder.vertexShaderMain +=
    "    vec3 bitangent = cross(normal, tangent) * tangentHandedness;";
}

function addPositionAbsoluteDeclaration(shaderBuilder) {
  shaderBuilder.vertexShaderMain +=
    "vec3 positionAbsolute = vec3(czm_model * vec4(position, 1.0));\n";
}

function addAttributeDeclaration(attribute, attributeName, shaderBuilder) {
  var shaderType = getShaderType(attribute);
  var attributeDefinitionName = getAttributeDefinitionName(attributeName);

  var attributeDeclaration =
    shaderType +
    " " +
    attributeName +
    " = read" +
    capitalize(attributeName) +
    "(" +
    attributeDefinitionName +
    ");\n";

  shaderBuilder.vertexShaderMain += attributeDeclaration;
}

function usesInputSemantic(inputs, inputSemantic) {
  var inputsLength = inputs.length;
  for (var i = 0; i < inputsLength; ++i) {
    var input = inputs[i];
    if (input.semantic === inputSemantic) {
      return true;
    }
  }
  return false;
}

function usesBitangent(customShader, materialInfo) {
  if (defined(materialInfo.normalTextureInfo)) {
    return true;
  }

  if (
    defined(customShader) &&
    usesInputSemantic(customShader.inputs, InputSemantic.BITANGENT)
  ) {
    return true;
  }

  return false;
}

function usesPositionAbsolute(customShader) {
  if (
    defined(customShader) &&
    usesInputSemantic(customShader.inputs, InputSemantic.POSITION_ABSOLUTE)
  ) {
    return true;
  }

  return false;
}

function buildShader(
  primitive,
  attributes,
  attributeNameMap,
  inputs,
  materialInfo,
  usesMorphTargets,
  usesSkinning,
  usesInstancing,
  customShader
) {
  var shaderBuilder = new ShaderBuilder();

  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    var attributeName = attributeNameMap[attribute.name];
    addAttributeDefinition(attribute, attributeName, shaderBuilder);

    var quantization = attribute.quantization;
    if (defined(quantization)) {
      if (attribute.octEncoded) {
        addOctEncodedAttributeReader(attribute, attributeName, shaderBuilder);
      } else {
        addQuantizedAttributeReader(attribute, attributeNameMap, shaderBuilder);
      }
    } else {
      addAttributeReader(attribute, attributeNameMap, shaderBuilder);
    }

    var semantic = attribute.semantic;

    if (semantic === VertexAttributeSemantic.POSITION) {
      addPositionDeclaration(
        usesMorphTargets,
        usesSkinning,
        usesInstancing,
        shaderBuilder
      );
    } else if (semantic === VertexAttributeSemantic.NORMAL) {
      addNormalDeclaration(
        usesMorphTargets,
        usesSkinning,
        usesInstancing,
        shaderBuilder
      );
    } else if (semantic === VertexAttributeSemantic.TANGENT) {
      addTangentDeclaration(
        attribute,
        usesMorphTargets,
        usesSkinning,
        usesInstancing,
        shaderBuilder
      );
    } else {
      addAttributeDeclaration(attribute, attributeName, shaderBuilder);
    }
  }

  // Need to add shader code for instances, morph targets, skinning
  // Need to apply vertex color
  // Custom shader can be applied in vert or frag (it will say)
  // Material can be applied in vert or frag (TODO) - can probably use ModelShading.glsl
  // when an attribute is generated for an input/custom shader how does this interact with values computed for eye coordinates
  //   prefer multiply in frag shader I guess, the local version would be passed as the varying
  // need to deal with feature textures
  // need to deal with batch texture (vert and frag) - pass feature ID through as varying
  // Need to handle feature ID texture, feature ID attribute

  if (usesBitangent(customShader, materialInfo)) {
    addBitangentDeclaration(shaderBuilder);
  }

  if (usesPositionAbsolute(customShader)) {
    addPositionAbsoluteDeclaration(shaderBuilder);
  }

  if (defined(customShader)) {
    addCustomShader(customShader, attributeNameMap, shaderBuilder);
  }
}

function createCustomShader(customShader, attributeNameMap, shaderBuilder) {
  // Initialize the structs that are passed to the custom shaders
  var inputs = customShader.inputs;
  var attributes = customShader.attributes;
  var uniforms = customShader.uniforms;
  var properties = customShader.properties;
  var shaderString = customShader.shaderString;
  var applyInVertexShader = customShader.applyInVertexShader;

  var inputStruct = "Input input;\n";
  var attributeStruct = "Attribute attribute;\n";
  var uniformStruct = "Uniform uniform;\n";
  var propertyStruct = "Property property;\n";

  var i;

  var inputsLength = inputs.length;
  for (i = 0; i < inputsLength; ++i) {
    var input = inputs[i];
    var inputName = InputSemantic.getVariableName(input);

    inputStruct += "input." + inputName + " = " + inputName + ";\n";
  }

  var attributesLength = attributes.length;
  for (i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    var attributeName = defaultValue(
      customShader.attributeNameMap[attribute.name],
      attribute.name
    );
    var attributeVariableName = defaultValue(
      attributeNameMap[attribute.name],
      attribute.name
    );
    attributeStruct +=
      "attribute." + attributeName + " = " + attributeVariableName + ";\n";
  }

  for (var uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      uniformName = defaultValue(
        customShader.uniformNameMap[uniformName],
        uniformName
      );
      uniformStruct += "uniform." + uniformName + " = " + uniformName + ";\n";
    }
  }

  // TODO
  // Properties can come from uniforms: tile, group, tileset metadata
  // Also potentially uniforms for default values
  // They can also come from vertex attributes: for point clouds
  // And for everything else from textures that are accessed with feature ids
  // Don't forget feature textures
  var propertiesLength = properties.length;
  for (i = 0; i < propertiesLength; ++i) {
    var property = properties[i];
    var propertyId = property.propertyId;
    var propertyName = defaultValue(
      customShader.propertyNameMap[propertyId],
      propertyId
    );
    propertyStruct += "property." + propertyName + " = " + propertyName + ";\n";
  }

  var output =
    "Output output = customShader(input, attribute, uniform, property);\n";

  if (applyInVertexShader)
    return (
      inputStruct +
      "\n" +
      attributeStruct +
      "\n" +
      uniformStruct +
      "\n" +
      propertyStruct +
      "\n"
    );
}

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

function customShaderUsesAttributeWithSemantic(
  customShader,
  semantic,
  setIndex
) {
  var attributes = customShader.attributes;
  var derivedAttributes = customShader.derivedAttributes;
  var helperAttributes = customShader.helperAttributes;
  return (
    hasAttributeWithSemantic(attributes, semantic, setIndex) ||
    hasAttributeWithSemantic(derivedAttributes, semantic, setIndex) ||
    hasAttributeWithSemantic(helperAttributes, semantic, setIndex)
  );
}

function usesUnlitShader(primitive, customShader, colorBlendMode) {
  if (defined(customShader) && colorBlendMode === ColorBlendMode.REPLACE) {
    return false;
  }

  var attributes = primitive.attributes;
  if (!hasAttributeWithSemantic(attributes, VertexAttributeSemantic.NORMAL)) {
    return true;
  }

  return primitive.material.unlit;
}

function usesNormalMapping(primitive, customShader, colorBlendMode, context) {
  if (defined(customShader) && colorBlendMode === ColorBlendMode.REPLACE) {
    return false;
  }

  var hasNormalAttribute = hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.NORMAL
  );

  var hasTangentAttribute = hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.TANGENT
  );

  return (
    !usesUnlitShader(primitive, customShader, colorBlendMode) &&
    defined(primitive.material.normalTexture) &&
    hasNormalAttribute &&
    (hasTangentAttribute || context.standardDerivatives)
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
  return hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.POSITION
  );
}

function usesNormal(primitive, customShader, colorBlendMode) {
  var semantic = VertexAttributeSemantic.NORMAL;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }

  if (defined(customShader)) {
    if (customShaderUsesAttributeWithSemantic(customShader, semantic)) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  return !usesUnlitShader(primitive, customShader, colorBlendMode);
}

function usesTangent(primitive, customShader, colorBlendMode, context) {
  var semantic = VertexAttributeSemantic.TANGENT;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic)) {
    return false;
  }

  if (defined(customShader)) {
    if (customShaderUsesAttributeWithSemantic(customShader, semantic)) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  if (usesUnlitShader(primitive, customShader, colorBlendMode)) {
    return false;
  }

  return usesNormalMapping(primitive, customShader, colorBlendMode, context);
}

function usesTexCoord(
  primitive,
  customShader,
  colorBlendMode,
  materialInfo,
  setIndex
) {
  var semantic = VertexAttributeSemantic.TEXCOORD;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic, setIndex)) {
    return false;
  }

  if (defined(customShader)) {
    if (
      customShaderUsesAttributeWithSemantic(customShader, semantic, setIndex)
    ) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  return materialUsesTexCoord(materialInfo, setIndex);
}

function usesColor(primitive, customShader, colorBlendMode, setIndex) {
  var semantic = VertexAttributeSemantic.COLOR;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic, setIndex)) {
    return false;
  }

  if (defined(customShader)) {
    if (
      customShaderUsesAttributeWithSemantic(customShader, semantic, setIndex)
    ) {
      return true;
    }
    if (colorBlendMode === ColorBlendMode.REPLACE) {
      return false;
    }
  }

  return true;
}

function usesJoints(primitive, setIndex) {
  return hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.JOINTS,
    setIndex
  );
}

function usesWeights(primitive, setIndex) {
  return hasAttributeWithSemantic(
    primitive.attributes,
    VertexAttributeSemantic.WEIGHTS,
    setIndex
  );
}

function usesFeatureId(primitive, customShader, setIndex) {
  var semantic = VertexAttributeSemantic.FEATURE_ID;

  if (!hasAttributeWithSemantic(primitive.attributes, semantic, setIndex)) {
    return false;
  }

  if (defined(customShader)) {
    if (
      customShaderUsesAttributeWithSemantic(customShader, semantic, setIndex)
    ) {
      return true;
    }
  }

  return false;
}

function usesCustomAttribute(attribute, customShader) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;

  if (defined(customShader)) {
    if (
      customShaderUsesAttributeWithSemantic(customShader, semantic, setIndex)
    ) {
      return true;
    }
  }

  return false;
}

function usesAttribute(
  primitive,
  attribute,
  customShader,
  colorBlendMode,
  materialInfo,
  context
) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;

  if (!defined(semantic)) {
    return usesCustomAttribute(attribute, customShader);
  }

  switch (semantic) {
    case VertexAttributeSemantic.POSITION:
      return usesPosition(primitive);
    case VertexAttributeSemantic.NORMAL:
      return usesNormal(primitive, customShader, colorBlendMode);
    case VertexAttributeSemantic.TANGENT:
      return usesTangent(primitive, customShader, colorBlendMode, context);
    case VertexAttributeSemantic.TEXCOORD:
      return usesTexCoord(
        primitive,
        customShader,
        colorBlendMode,
        materialInfo,
        setIndex
      );
    case VertexAttributeSemantic.COLOR:
      return usesColor(primitive, customShader, colorBlendMode, setIndex);
    case VertexAttributeSemantic.JOINTS:
      return usesJoints(primitive, setIndex);
    case VertexAttributeSemantic.WEIGHTS:
      return usesWeights(primitive, setIndex);
    case VertexAttributeSemantic.FEATURE_ID:
      return usesFeatureId(primitive, customShader, setIndex);
    default:
  }
}

function getAttributesInUse(
  primitive,
  customShader,
  colorBlendMode,
  materialInfo,
  context
) {
  return primitive.attributes.filter(function (attribute) {
    return usesAttribute(
      primitive,
      attribute,
      customShader,
      colorBlendMode,
      materialInfo,
      context
    );
  });
}

function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}

function TextureInfo(texture) {
  this.texture = texture;
  this.texCoord = texture.texCoord;
  this.usesTextureTransform = usesTextureTransform(texture);
}

function MaterialInfo() {
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
}

function getMaterialInfo(primitive, customShader, colorBlendMode, context) {
  var materialInfo = new MaterialInfo();

  if (defined(customShader) && colorBlendMode === ColorBlendMode.REPLACE) {
    return materialInfo;
  }

  var material = primitive.material;
  var unlit = usesUnlitShader(primitive, customShader, colorBlendMode);
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
    if (usesNormalMapping(primitive, customShader, colorBlendMode, context)) {
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

  return materialInfo;
}

function applyMaterialInVertexShader(primitive, attributes) {
  if (primitive.primitiveType === PrimitiveType.POINTS) {
    return true;
  }

  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (
      attribute.semantic === VertexAttributeSemantic.TEXCOORD ||
      attribute.semantic === VertexAttributeSemantic.NORMAL
    ) {
      return false;
    }
  }
}
