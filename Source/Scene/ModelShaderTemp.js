//import Check from "../Core/Check.js";
//import ComponentDatatype from "../Core/ComponentDatatype.js";
//import defaultValue from "../Core/defaultValue.js";
//import defined from "../Core/defined.js";
//import DeveloperError from "../Core/DeveloperError.js";
//import RuntimeError from "../Core/RuntimeError.js";
//import AttributeType from "./AttributeType.js";
//import CustomShader from "./CustomShader.js";
//import InputSemantic from "./InputSemantic.js";
//import ModelMaterialInfo from "./ModelMaterialInfo.js";
//import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
export default function ModelShader(options) {
  /*
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
  Check.typeOf.object("options.node", node);
  Check.typeOf.object("options.primitive", primitive);
  Check.typeOf.object("options.context", context);
  if (defined(shaderString) && defined(style)) {
    throw new DeveloperError(
      "options.shaderString and options.style cannot both be defined"
    );
  }
  //>>includeEnd('debug');

  var materialInfo = ModelMaterialInfo.fromPrimitive({
    primitive: primitive,
    context: context,
  });

  var customShader;
  if (defined(shaderString)) {
    customShader = CustomShader.fromShaderString({
      shaderString: shaderString,
      primitive: primitive,
      uniformMap: uniformMap,
      featureMetadata: featureMetadata,
      content: content,
    });

    // Custom shader overrides material
    materialInfo = undefined;
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

  var attributes = getAttributes(
    primitive,
    customShader,
    styleInfo,
    materialInfo
  );

  var attributeNameMap = getAttributeNameMap(attributes);
  */
}

/*
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
*/

/*
function hasAttributeWithSemantic(attributes, semantic, setIndex) {
  return defined(getAttributeWithSemantic(attributes, semantic, setIndex));
}
*/

/*
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
      var vertexAttributeSemantic = vertexAttributeSemantics[j];
      var setIndex = setIndices[j];
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
*/

/*
function getAttributesRequiredByVertexShader(primitive) {
  return primitive.attributes.filter(function (attribute) {
    var semantic = attribute.semantic;
    var setIndex = attribute.setIndex;
    switch (semantic) {
      case VertexAttributeSemantic.POSITION:
        return true;
      case VertexAttributeSemantic.JOINTS:
      case VertexAttributeSemantic.WEIGHTS:
        return setIndex === 0; // Currently only supporting the first JOINTS/WEIGHTS set
    }
    return false;
  });
}
*/

/*
function organizeAttributes(primitive, customShader, styleInfo, materialInfo) {
  var result = {
    attributes: [],
    vertexShader: [],
    fragmentShader: [] 
  };
  
  var attributes = [];

  attributes.push.apply(
    attributes,
    getAttributesRequiredByVertexShader(primitive)
  );

  if (defined(materialInfo)) {
    attributes.push.apply(attributes, materialInfo.attributes);
  }

  if (defined(customShader)) {
    attributes.push.apply(attributes, customShader.attributes);
    attributes.push.apply(attributes, customShader.derivedAttributes);
    attributes.push.apply(attributes, customShader.helperAttributes);
  }

  if (defined(styleInfo) && !defined(customShader)) {
    attributes.push.apply(attributes, styleInfo.helperAttributes);
  }

  // Remove duplicates
  return attributes.filter(function (attribute, index, attributes) {
    return attributes.indexOf(attribute) === index;
  });
}
*/

/*
function getAttributeNameMap(attributes) {
  var attributeNameMap = {};
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
      attributeNameMap[attributeName] = getGlslName(attributeName, "attribute");
    }
  }
  return attributeNameMap;
}
*/

/*
function getGlslName(name, type) {
  // If the variable name is not compatible with GLSL - e.g. has non-alphanumeric
  // characters like `:`, `-`, `#`, spaces, or unicode - use a placeholder variable name
  var glslCompatibleRegex = /^[a-zA-Z_]\w*$/;
  if (glslCompatibleRegex.test(name)) {
    return name;
  }

  var encoded = encodeURIComponent(name);
  var encodedLength = encoded.length;

  var glslCharRegex = /\w/;
  var glslName = "";

  for (var i = 0; i < encodedLength; ++i) {
    var char = encoded.charAt(i);
    if (char !== "%") {
      if (!glslCharRegex.test(char)) {
        glslName += encoded.charCodeAt(i).toString(16);
      } else {
        glslName += char;
      }
    }
  }

  return "czm_model_" + type + "_" + glslName;
}
*/

/*
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
*/

/*
function getAttributeDefinitionName(attributeName) {
  return "a_" + attributeName;
}
*/

/*
function getAttributeDefinition(glslType, attributeDefinitionName) {
  return "attribute " + glslType + " " + attributeDefinitionName + ";\n";
}
*/

/*
function getUniformName(name, suffix) {
  return "u_" + name + suffix;
}
*/

/*
function getUniformDefinition(glslType, uniformName) {
  return "uniform " + glslType + " " + uniformName + ";\n";
}
*/

/*
function getAttributeGlslType(attribute) {
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
*/

/*
function addAttributeDefinition(attribute, attributeName, shaderBuilder) {
  var attributeDefinitionName = getAttributeDefinitionName(attributeName);
  var quantization = attribute.quantization;
  var type = attribute.type;
  if (defined(quantization)) {
    type = quantization.type;
  }
  var attributeType = AttributeType.getGlslType(type);
  var attributeDefinition = getAttributeDefinition(
    attributeType,
    attributeDefinitionName
  );
  shaderBuilder.attributes += attributeDefinition;
}
*/

/*
function getAttributeReadFunction(
  attributeValue,
  attributeName,
  attributeType,
  glslType
) {
  return (
    glslType +
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
*/

/*
function addOctEncodedAttributeReader(attribute, attributeName, shaderBuilder) {
  var quantization = attribute.quantization;
  var type = quantization.type;
  var attributeType = AttributeType.getGlslType(type);
  var glslType = getAttributeGlslType(attribute);

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
    glslType
  );

  shaderBuilder.functions += readFunction;
  shaderBuilder.uniforms += rangeUniformDefinition;
}
*/

/*
function castAttribute(attributeValue, attributeType, glslType) {
  if (attributeType !== glslType) {
    return glslType + "(" + attributeValue + ")";
  }
  return attributeValue;
}
*/

/*
function addQuantizedAttributeReader(attribute, attributeName, shaderBuilder) {
  var quantization = attribute.quantization;
  var type = quantization.type;
  var attributeType = AttributeType.getGlslType(type);
  var glslType = getAttributeGlslType(attribute);

  var scaleUniformName = getUniformName(attributeName, "DequantizationScale");
  var offsetUniformName = getUniformName(attributeName, "DequantizationOffset");
  var scaleUniformDefinition = getUniformDefinition(
    glslType,
    scaleUniformName
  );
  var offsetUniformDefinition = getUniformDefinition(
    glslType,
    offsetUniformName
  );

  var attributeValue = attributeName + " * " + scaleUniformName;
  if (defined(quantization.quantizedVolumeOffset)) {
    attributeValue = " + " + offsetUniformName;
  }
  attributeValue = castAttribute(attributeValue, attributeType, glslType);

  var readFunction = getAttributeReadFunction(
    attributeValue,
    attributeName,
    attributeType,
    glslType
  );

  shaderBuilder.functions += readFunction;
  shaderBuilder.uniforms += scaleUniformDefinition;
  if (defined(quantization.quantizedVolumeOffset)) {
    shaderBuilder.uniforms += offsetUniformDefinition;
  }
}
*/

/*
function addAttributeReader(attribute, attributeName, shaderBuilder) {
  var type = attribute.type;
  var attributeType = AttributeType.getGlslType(type);
  var glslType = getAttributeGlslType(attribute);

  var attributeValue = castAttribute(attributeName, attributeType, glslType);

  var readFunction = getAttributeReadFunction(
    attributeValue,
    attributeName,
    attributeType,
    glslType
  );
  shaderBuilder.functions += readFunction;
}
*/

/*
function ShaderBuilder() {
  this.uniformDefinitions = "";
  this.attributeDefinitions = "";
  this.functions = "";
  this.vertexShaderMain = "";
}
*/

/*
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
*/

/*
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
*/

/*
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

  var glslType = AttributeType.getGlslType(type);
  var lastComponent = type === AttributeType.VEC4 ? ".w" : ".z";

  var readTangentHandedness =
    "float readTangentHandedness(in " +
    glslType +
    " tangent)\n" +
    "{\n" +
    "    return tangent" +
    lastComponent +
    ";\n" +
    "}\n";

  var tangentDeclaration = "    vec3 tangent = readTangent(a_tangent);\n";

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
*/

/*
function addBitangentDeclaration(shaderBuilder) {
  shaderBuilder.vertexShaderMain +=
    "    vec3 bitangent = cross(normal, tangent) * readTangentHandedness(a_tangent);";
}
*/

/*
function addPositionAbsoluteDeclaration(shaderBuilder) {
  shaderBuilder.vertexShaderMain +=
    "vec3 positionAbsolute = vec3(czm_model * vec4(position, 1.0));\n";
}
*/

/*
function addAttributeDeclaration(attribute, attributeName, shaderBuilder) {
  var glslType = getGlslType(attribute);
  var attributeDefinitionName = getAttributeDefinitionName(attributeName);

  var attributeDeclaration =
    glslType +
    " " +
    attributeName +
    " = read" +
    capitalize(attributeName) +
    "(" +
    attributeDefinitionName +
    ");\n";

  shaderBuilder.vertexShaderMain += attributeDeclaration;
}
*/

/*
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
*/

/*
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
*/

/*
function usesPositionAbsolute(customShader) {
  if (
    defined(customShader) &&
    usesInputSemantic(customShader.inputs, InputSemantic.POSITION_ABSOLUTE)
  ) {
    return true;
  }

  return false;
}
*/

/*
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
  // Need to apply vertex color (part of material perhaps?)
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

  /*
  if (defined(customShader)) {
    addCustomShader(customShader, attributeNameMap, shaderBuilder);
  }
  /
}
*/
