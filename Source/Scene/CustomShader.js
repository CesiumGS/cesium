import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RuntimeError from "../Core/RuntimeError.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import CubeMap from "../Renderer/CubeMap.js";
import Texture from "../Renderer/Texture.js";
import AttributeType from "./AttributeType.js";
import Expression from "./Expression.js";
import InputSemantic from "./InputSemantic.js";
import MetadataType from "./MetadataType.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

// TODO: how to handle type conversions - e.g. in a custom shader or style multiplying an int property by a float property
// TODO: support enums in custom shader
// TODO: which of the PropertyInfo options are needed?
// TODO: decided not to do scoping yet
// TODO: getGlslTypeFromUniformValue throw error if no match
// TODO: error handling if custom shader uses unknown input.property or attribute.property
// TODO: doc
// TODO: should the retrieved attribute be the quantization type or the regular type? Same question for VEC3 vs. VEC4 tangent
// TODO: need to add to the attributeNameMap?
// TODO: better error message when requireGpu and requireCpu are both true
// TODO: is CPU required for FLOAT64 and INT64?
// TODO: what about "meta" property?
// TODO: What to do about default values: it should be set on the Property struct elsewhere
// TODO: custom shaders from the user with utf8 property names (including with spaces)
// TODO: if custom shader sets point size does it have to be in the vertex shader?
// TODO: what to do if custom shader uses a string property?
// TODO: throw error if custom shader uses a vertex attribute that doesn't exist
// TODO: need to rename texCoord to setIndex in a lot of places (see ModelComponents.Texture)
// TODO: bitangent technically needs to add both tangent and normal semantics... does .vertexAttributeSemantic need to be an array?
// TODO: make sure "position" variable in shader is a vec3
// TODO: doc: custom shader cannot have discard or fragColor
// TODO: require frag shader if VTF is not supported and properties are stored in textures (how can you know this from this file)
// TODO: highp
// TODO: support tile/group/content metadata with more than 4 elements in array because they're uniforms
// TODO: how to make feature ids available in shader if attribute is implicit
// TODO: this goes against the Point Cloud spec which says that POSITION stores the position before the quantization offset is applied
// TODO: quantization uniforms should always match the type. e.g. for tangents it should be a Cartesian3 - for color it should be a Cartesian3 or Cartesian4
// TODO: what to do if divisor is not 1 but 2 or 3? should that still be on the GPU because it's impractically big?
// TODO: A feature whose color evaluates to white (1.0, 1.0, 1.0) is always rendered without color blending, regardless of the tileset's color blend mode.
// TODO: ColorBlendMode and Cesium3DTileColorBlendMode -> consolidate? also redefine what REPLACE means. Also improve doc.
// TODO: might need to set featureId varying to be computeSt like in Cesium3DTileBatchTable
// TODO: what if shader references integer vertex attribute that gets interpolated? what do you really do? Really there should be a mode that lets you pick styling on the vertex itself (an interpolate the color) vs. the interpolated values
// TODO: oct encoded requires float for oct encoded range

function CustomShader() {
  this.inputs = [];
  this.attributes = [];
  this.derivedAttributes = [];
  this.helperAttributes = [];
  this.uniforms = {};
  this.properties = [];
  this.attributeNameMap = {};
  this.uniformNameMap = {};
  this.propertyNameMap = {};
  this.shaderString = undefined;
  this.applyInVertexShader = false;
  this.setsColor = false;
  this.setsShow = false;
  this.setsPointSize = false;
  this.translucent = false;
}

function StyleInfo() {
  this.customShader = undefined;
  this.applyInVertexShader = false;
  this.featureIdAttribute = undefined;
  this.featureIdTexture = undefined;
}

function PropertyInfo(options) {
  this.propertyId = options.propertyId;
  this.classProperty = options.classProperty;
  this.featureIdAttribute = options.featureIdAttribute;
  this.featureIdTexture = options.featureIdTexture;
  this.featureTable = options.featureTable;
  this.featureTexture = options.featureTexture;
  this.tileMetadata = options.tileMetadata;
  this.groupMetadata = options.groupMetadata;
  this.tilesetMetadata = options.tilesetMetadata;
  this.requireCpu = defaultValue(options.requireCpu, false);
  this.requireGpu = defaultValue(options.requireGpu, false);
  this.requireVertShader = defaultValue(options.requireVertShader, false);
  this.requireFragShader = defaultValue(options.requireFragShader, false);
}

function getGlslTypeFromUniformValue(uniformValue) {
  var type = typeof uniformValue;
  if (type === "number") {
    return "float";
  } else if (type === "boolean") {
    return "bool";
  } else if (uniformValue instanceof Cartesian2) {
    return "vec2";
  } else if (uniformValue instanceof Cartesian3) {
    return "vec3";
  } else if (uniformValue instanceof Cartesian4) {
    return "vec4";
  } else if (uniformValue instanceof Matrix2) {
    return "mat2";
  } else if (uniformValue instanceof Matrix3) {
    return "mat3";
  } else if (uniformValue instanceof Matrix4) {
    return "mat4";
  } else if (uniformValue instanceof Texture) {
    return "sampler2D";
  } else if (uniformValue instanceof CubeMap) {
    return "samplerCube";
  }
}

function getStructDefinition(structName, propertyDefinitions) {
  var propertyDefinitionsLength = propertyDefinitions.length;
  if (propertyDefinitionsLength === 0) {
    // Create empty placeholder struct
    return "struct " + structName + "\n{\nfloat empty;\n};\n";
  }

  var struct = "struct " + structName + "\n{\n";
  for (var i = 0; i < propertyDefinitionsLength; ++i) {
    struct += propertyDefinitions[i];
    if (i < propertyDefinitionsLength - 1) {
      struct += ",";
    }
    struct += "\n";
  }
  struct += "};\n";

  return struct;
}

function getFinalShaderString(
  shaderString,
  shaderFunctionsString,
  inputs,
  attributes,
  uniforms,
  properties,
  attributeNameMap,
  uniformNameMap,
  propertyNameMap
) {
  var inputDefinitions = inputs.map(function (input) {
    var type = InputSemantic.getGlslType(input.semantic);
    var name = InputSemantic.getVariableName(input);
    return type + " " + name;
  });
  var inputStruct = getStructDefinition("Input", inputDefinitions);

  var attributeDefinitions = attributes.map(function (attribute) {
    var type = AttributeType.getGlslType(attribute.type);
    var name = defaultValue(attributeNameMap[attribute.name], attribute.name);
    return type + " " + name;
  });
  var attributeStruct = getStructDefinition("Attribute", attributeDefinitions);

  var uniformDefinitions = [];
  for (var uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      var uniformValue = uniforms[uniformName];
      var type = getGlslTypeFromUniformValue(uniformValue);
      var name = defaultValue(uniformNameMap[uniformName], uniformName);
      uniformDefinitions.push(type + " " + name);
    }
  }
  var uniformStruct = getStructDefinition("Uniform", uniformDefinitions);

  var propertyDefinitions = properties.map(function (property) {
    var type = property.classProperty.getGlslType();
    var propertyId = property.propertyId;
    var name = defaultValue(propertyNameMap[propertyId], propertyId);
    return type + " " + name;
  });

  var propertyStruct = getStructDefinition("Property", propertyDefinitions);

  var outputStruct =
    "struct Output\n" +
    "{\n" +
    "    vec4 color;\n" +
    "    bool show;\n" +
    "    float pointSize;\n" +
    "};\n";

  if (!defined(shaderFunctionsString)) {
    shaderFunctionsString = "";
  }

  var customShaderFunction =
    "void customShaderInner(Input input, Attribute attribute, Uniform uniform, Property property, Output output)\n" +
    "{\n" +
    shaderString +
    "\n" +
    "}\n" +
    +"\n" +
    "Output customShader(Input input, Attribute attribute, Uniform uniform, Property property)\n" +
    "{\n" +
    "    Output output = Output(vec4(1.0), true, 1.0);\n" +
    "    customShaderInner(input, attribute, uniform, property, output);\n" +
    "    return output;\n" +
    "}\n";

  return (
    inputStruct +
    "\n" +
    attributeStruct +
    "\n" +
    uniformStruct +
    "\n" +
    propertyStruct +
    "\n" +
    outputStruct +
    "\n" +
    shaderFunctionsString +
    "\n" +
    customShaderFunction
  );
}

function getAttributeWithSemantic(primitive, semantic, setIndex) {
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.semantic === semantic && attribute.setIndex === setIndex) {
      return attribute;
    }
  }
  return undefined;
}

function getAttributeWithName(primitive, name) {
  var attributes = primitive.attributes;
  var attributesLength = attributes.length;
  for (var i = 0; i < attributesLength; ++i) {
    var attribute = attributes[i];
    if (attribute.name === name) {
      return attribute;
    }
  }
  return undefined;
}

function getTexCoordUsedByProperty(primitive, property) {
  var propertyId = property.propertyId;
  var featureTexture = property.featureTexture;
  var featureIdTexture = property.featureIdTexture;
  var texture;
  if (defined(featureTexture)) {
    var featureTextureProperty = featureTexture.getProperty(propertyId);
    if (defined(featureTextureProperty)) {
      texture = featureTextureProperty.texture;
    }
  } else if (defined(featureIdTexture)) {
    texture = featureIdTexture.texture;
  }

  if (defined(texture)) {
    var setIndex = texture.texCoord;
    return getAttributeWithSemantic(
      primitive,
      VertexAttributeSemantic.TEXCOORD,
      setIndex
    );
  }

  return undefined;
}

function getFeatureIdAttributeUsedByProperty(primitive, property) {
  var featureIdAttribute = property.featureIdAttribute;
  if (defined(featureIdAttribute)) {
    var setIndex = featureIdAttribute.setIndex;
    if (defined(setIndex)) {
      return getAttributeWithSemantic(
        primitive,
        VertexAttributeSemantic.FEATURE_ID,
        setIndex
      );
    }
  }
  return undefined;
}

function isPropertyGpuCompatible(classProperty) {
  var type = classProperty.type;
  var valueType = classProperty.valueType;
  var componentCount = classProperty.componentCount;

  if (
    type === MetadataType.ARRAY &&
    (!defined(componentCount) || componentCount > 4)
  ) {
    return false;
  }

  if (valueType === MetadataType.STRING) {
    return false;
  }

  return true;
}

function getClassProperty(classDefinition, propertyName) {
  var classPropertiesBySemantic = classDefinition.propertiesBySemantic;
  var classProperties = classDefinition.properties;
  return defaultValue(
    classPropertiesBySemantic[propertyName],
    classProperties[propertyName]
  );
}

function getPropertyInfoFromFeatureTable(propertyName, featureTable) {
  if (
    !featureTable.propertyExistsBySemantic(propertyName) &&
    !featureTable.propertyExists(propertyName)
  ) {
    return undefined;
  }

  if (defined(featureTable.class)) {
    var classProperty = getClassProperty(featureTable.class, propertyName);
    if (defined(classProperty)) {
      // Requires CPU styling if the property is a string, variable-size
      // array, or fixed-size array with more than 4 components
      return new PropertyInfo({
        propertyId: classProperty.id,
        classProperty: classProperty,
        featureTable: featureTable,
        requireCpu: !isPropertyGpuCompatible(classProperty),
      });
    }
  }

  // Requires CPU styling if the property is a JSON property or batch table hierarchy property
  return new PropertyInfo({
    propertyId: propertyName,
    featureTable: featureTable,
    requireCpu: true,
  });
}

function getPropertyInfo(propertyName, primitive, featureMetadata, content) {
  var i;
  var featureTableId;
  var featureTable;
  var property;
  var classProperty;

  // Check if the property exists in a feature table referenced by a feature ID attribute
  var featureIdAttributes = primitive.featureIdAttributes;
  var featureIdAttributesLength = featureIdAttributes.length;
  for (i = 0; i < featureIdAttributesLength; ++i) {
    var featureIdAttribute = featureIdAttributes[i];
    featureTableId = featureIdAttribute.featureTableId;
    featureTable = featureMetadata.getFeatureTable(featureTableId);
    property = getPropertyInfoFromFeatureTable(propertyName, featureTable);
    if (defined(property)) {
      // Requires GPU styling if the model has per-point or per-vertex features
      // since this data is transferred to the GPU and generally impractical
      // to style on the CPU efficiently. This could change in the future with
      // vector data point features.
      var hasPerVertexMetadata = featureIdAttribute.divisor === 1;
      property.featureIdAttribute = featureIdAttribute;
      property.requireGpu = hasPerVertexMetadata;
      property.requireFragShader =
        hasPerVertexMetadata &&
        primitive.primitiveType !== PrimitiveType.POINTS;
      return property;
    }
  }

  // Check if the property exists in a feature table referenced by a feature ID texture
  var featureIdTextures = primitive.featureIdTextures;
  var featureIdTexturesLength = featureIdTextures.length;
  for (i = 0; i < featureIdTexturesLength; ++i) {
    var featureIdTexture = featureIdTextures[i];
    featureTableId = featureIdTexture.featureTableId;
    featureTable = featureMetadata.getFeatureTable(featureTableId);
    property = getPropertyInfoFromFeatureTable(propertyName, featureTable);
    if (defined(property)) {
      property.featureIdTexture = featureIdTexture;
      property.requireFragShader = true;
      return property;
    }
  }

  // Check if the property exists in a feature texture
  var featureTextureIds = primitive.featureTextureIds;
  var featureTextureIdsLength = featureTextureIds.length;
  for (i = 0; i < featureTextureIdsLength; ++i) {
    var featureTextureId = featureTextureIds[i];
    var featureTexture = featureMetadata.getFeatureTexture(featureTextureId);
    classProperty = getClassProperty(featureTexture.class, propertyName);
    if (defined(classProperty)) {
      return new PropertyInfo({
        propertyId: classProperty.id,
        classProperty: classProperty,
        featureTexture: featureTexture,
        requireGpu: true,
        requireFragShader: true,
      });
    }
  }

  if (!defined(content)) {
    // The rest of the checks are for tile, group, and tileset metadata so
    // return early if this model isn't part of a 3D Tileset
    return undefined;
  }

  // Check if the property exists in tile metadata
  var tileMetadata = content.tile.metadata;
  if (defined(tileMetadata)) {
    classProperty = getClassProperty(tileMetadata.class, propertyName);
    if (defined(classProperty)) {
      return new PropertyInfo({
        propertyId: classProperty.id,
        classProperty: classProperty,
        tileMetadata: tileMetadata,
        requireCpu: !isPropertyGpuCompatible(classProperty),
      });
    }
  }

  // Check if the property exists in group metadata
  var groupMetadata = content.groupMetadata;
  if (defined(groupMetadata)) {
    classProperty = getClassProperty(groupMetadata.class, propertyName);
    if (defined(classProperty)) {
      return new PropertyInfo({
        propertyId: classProperty.id,
        classProperty: classProperty,
        groupMetadata: groupMetadata,
        requireCpu: !isPropertyGpuCompatible(classProperty),
      });
    }
  }

  // Check if the property exists in tileset metadata
  var tilesetMetadata = content.tileset.metadata;
  if (defined(tilesetMetadata) && defined(tilesetMetadata.tileset)) {
    classProperty = getClassProperty(groupMetadata.class, propertyName);
    if (defined(classProperty)) {
      return new PropertyInfo({
        propertyId: classProperty.id,
        classProperty: classProperty,
        tilesetMetadata: tilesetMetadata,
        requireCpu: !isPropertyGpuCompatible(classProperty),
      });
    }
  }

  // Could not find property with a matching propertyId or semantic
  return undefined;
}

function inputsEqual(inputA, inputB) {
  if (inputA.semantic !== inputB.semantic) {
    return false;
  }

  var vertexAttributeSemanticsA = inputA.vertexAttributeSemantics;
  var vertexAttributeSemanticsB = inputB.vertexAttributeSemantics;

  var setIndicesA = inputA.setIndices;
  var setIndicesB = inputB.setIndices;

  var lengthA = vertexAttributeSemanticsA.length;
  var lengthB = vertexAttributeSemanticsB.length;

  if (lengthA !== lengthB) {
    return false;
  }

  for (var i = 0; i < lengthA; ++i) {
    if (vertexAttributeSemanticsA[i] !== vertexAttributeSemanticsB[i]) {
      return false;
    }
    if (setIndicesA[i] !== setIndicesB[i]) {
      return false;
    }
  }

  return true;
}

function hasInput(inputs, input) {
  var inputsLength = inputs.length;
  for (var i = 0; i < inputsLength; ++i) {
    if (inputsEqual(inputs[i], input)) {
      return true;
    }
  }
  return false;
}

function hasAttribute(attributes, attribute) {
  return attributes.indexOf(attribute) !== -1;
}

function hasUniform(uniforms, uniformName) {
  return defined(uniforms[uniformName]);
}

function hasProperty(properties, property) {
  var propertiesLength = properties.length;
  for (var i = 0; i < propertiesLength; ++i) {
    if (properties[i].propertyId === property.propertyId) {
      return true;
    }
  }
  return false;
}

function getDerivedAttributes(primitive, input, derivedAttributes) {
  // Find the vertex attribute that the input semantic is derived from.
  // The calling code is responsible for throwing an error if the
  // vertex attribute doesn't exist. Note that some input semantics may be
  // synthetically generated in the shader and an error should not be thrown.
  var vertexAttributeSemantics = input.vertexAttributeSemantics;
  var setIndices = input.setIndices;
  var derivedAttributesLength = vertexAttributeSemantics.length;
  for (var i = 0; i < derivedAttributesLength; ++i) {
    var derivedAttribute = getAttributeWithSemantic(
      primitive,
      vertexAttributeSemantics[i],
      setIndices[i]
    );
    if (
      defined(derivedAttribute) &&
      !hasAttribute(derivedAttributes, derivedAttribute)
    ) {
      derivedAttributes.push(derivedAttribute);
    }
  }
}

function getInputsUsedInShader(
  shaderString,
  primitive,
  inputs,
  derivedAttributes,
  variableSubstitutionMap
) {
  var regex = /input\.(\w+)/;
  var match = regex.exec(shaderString);

  while (match !== null) {
    var inputName = match[1];
    var input = InputSemantic.fromVariableName(inputName);
    if (defined(input)) {
      if (!hasInput(inputs, input)) {
        inputs.push(input);
      }

      getDerivedAttributes(primitive, input, derivedAttributes);

      // Add set index "0" to inputs that don't have a set index.
      // The input struct will always have the version with the zero.
      // E.g. input.featureId -> input.featureId0
      var verboseInputName = InputSemantic.getVariableName(input);
      if (inputName !== verboseInputName) {
        var oldName = "input." + inputName;
        var newName = "input." + verboseInputName;
        variableSubstitutionMap[oldName] = newName;
      }
    }
    match = regex.exec(shaderString);
  }
}

function getAttributesUsedInShader(shaderString, primitive, attributes) {
  var regex = /attribute\.(\w+)/;
  var match = regex.exec(shaderString);

  while (match !== null) {
    var attributeName = match[1];
    var attribute = getAttributeWithName(primitive, attributeName);
    if (!defined(attribute)) {
      throw new RuntimeError(
        "Attribute used in custom shader doesn't exist: " + attributeName
      );
    }

    if (!hasAttribute(attributes, attribute)) {
      attributes.push(attribute);
    }
    match = regex.exec(shaderString);
  }
}

function getUniformsUsedInShader(shaderString, uniformMap, uniforms) {
  if (!defined(uniformMap)) {
    return;
  }

  var regex = /uniform\.(\w+)/;
  var match = regex.exec(shaderString);

  while (match !== null) {
    var uniformName = match[1];
    if (!hasUniform(uniformMap, uniformName)) {
      throw new RuntimeError(
        "Uniform used in custom shader doesn't exist: " + uniformName
      );
    }

    if (!hasUniform(uniforms, uniformName)) {
      uniforms[uniformName] = uniformMap[uniformName];
    }
    match = regex.exec(shaderString);
  }
}

function getPropertiesUsedInShader(
  shaderString,
  primitive,
  featureMetadata,
  content,
  helperAttributes,
  properties
) {
  if (!defined(featureMetadata)) {
    return;
  }

  var regex = /property\.(\w+)/;
  var match = regex.exec(shaderString);

  while (match !== null) {
    var propertyName = match[1];
    var property = getPropertyInfo(
      propertyName,
      primitive,
      featureMetadata,
      content
    );
    if (!defined(property)) {
      throw new RuntimeError(
        "Property used in custom shader doesn't exist: " + propertyName
      );
    }
    if (property.requireCpu) {
      throw new RuntimeError(
        "Property cannot be used in a custom shader: " + propertyName
      );
    }

    if (!hasProperty(properties, property)) {
      properties.push(property);

      var texCoord = getTexCoordUsedByProperty(primitive, property);
      if (defined(texCoord) && !hasAttribute(helperAttributes, texCoord)) {
        helperAttributes.push(texCoord);
      }

      var featureId = getFeatureIdAttributeUsedByProperty(primitive, property);
      if (defined(featureId) && !hasAttribute(helperAttributes, featureId)) {
        helperAttributes.push(featureId);
      }
    }

    match = regex.exec(shaderString);
  }
}

CustomShader.fromShaderString = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var shaderString = options.shaderString;
  var primitive = options.primitive;
  var uniformMap = options.uniformMap;
  var featureMetadata = options.featureMetadata;
  var content = options.content;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.shaderString", shaderString);
  Check.typeOf.object("options.primitive", primitive);
  //>>includeEnd('debug');

  var setsColor = shaderString.indexOf("output.color") !== -1;
  var setsShow = shaderString.indexOf("output.show") !== -1;
  var setsPointSize = shaderString.indexOf("output.pointSize") !== -1;

  //>>includeStart('debug', pragmas.debug);
  if (!setsColor && !setsShow && !setsPointSize) {
    throw new DeveloperError(
      "output.color, output.show, or output.pointSize must be set"
    );
  }
  //>>includeEnd('debug');

  var requireVertShader = false;
  var requireFragShader = false;

  if (setsPointSize) {
    requireVertShader = true;
  }

  var inputs = [];
  var attributes = [];
  var derivedAttributes = [];
  var helperAttributes = [];
  var uniforms = [];
  var properties = [];
  var variableSubstitutionMap = {};

  getInputsUsedInShader(
    shaderString,
    primitive,
    inputs,
    derivedAttributes,
    variableSubstitutionMap
  );
  getAttributesUsedInShader(shaderString, primitive, attributes);
  getUniformsUsedInShader(shaderString, uniformMap, uniforms);
  getPropertiesUsedInShader(
    shaderString,
    primitive,
    featureMetadata,
    content,
    helperAttributes,
    properties
  );

  if (
    attributes.length + derivedAttributes.length > 0 &&
    primitive.primitiveType !== PrimitiveType.POINTS
  ) {
    requireFragShader = true;
  }

  var propertiesLength = properties.length;
  for (var i = 0; i < propertiesLength; ++i) {
    var property = properties[i];
    requireVertShader = requireVertShader || property.requireVertShader;
    requireFragShader = requireFragShader || property.requireFragShader;
  }

  if (requireVertShader && requireFragShader) {
    throw new DeveloperError("Invalid custom shader");
  }

  for (var oldName in variableSubstitutionMap) {
    if (variableSubstitutionMap.hasOwnProperty(oldName)) {
      var newName = variableSubstitutionMap[oldName];
      var regex = new RegExp(oldName, "g");
      shaderString = shaderString.replace(regex, newName);
    }
  }

  shaderString = getFinalShaderString(
    shaderString,
    undefined,
    inputs,
    attributes,
    uniforms,
    properties,
    defaultValue.EMPTY_OBJECT,
    defaultValue.EMPTY_OBJECT,
    defaultValue.EMPTY_OBJECT
  );

  var customShader = new CustomShader();
  customShader.inputs = inputs;
  customShader.attributes = attributes;
  customShader.derivedAttributes = derivedAttributes;
  customShader.helperAttributes = helperAttributes;
  customShader.uniforms = uniforms;
  customShader.properties = properties;
  customShader.shaderString = shaderString;
  customShader.applyInVertexShader = !requireFragShader;
  customShader.setsColor = setsColor;
  customShader.setsShow = setsShow;
  customShader.setsPointSize = setsPointSize;

  return customShader;
};

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

  return "czm_style_" + type + "_" + glslName;
}

function parseVariableAsInput(
  variable,
  primitive,
  inputs,
  derivedAttributes,
  variableSubstitutionMap
) {
  var input = InputSemantic.fromEnumName(variable);
  if (!defined(input)) {
    return false;
  }

  if (!hasInput(inputs, input)) {
    inputs.push(input);
    variableSubstitutionMap[variable] =
      "input." + InputSemantic.getVariableName(input);
  }

  getDerivedAttributes(primitive, input, derivedAttributes);

  return true;
}

function parseVariableAsAttribute(
  variable,
  primitive,
  attributes,
  variableSubstitutionMap,
  attributeNameMap
) {
  var attribute = getAttributeWithName(primitive, variable);
  if (!defined(attribute)) {
    return false;
  }

  if (!hasAttribute(attributes, attribute)) {
    attributes.push(attribute);
    var glslName = getGlslName(attribute.name, "attribute");
    attributeNameMap[attribute.name] = glslName;
    variableSubstitutionMap[variable] = "attribute." + glslName;
  }

  return true;
}

function parseVariableAsUniform(
  variable,
  uniforms,
  uniformMap,
  variableSubstitutionMap,
  uniformNameMap
) {
  if (!defined(uniformMap) || !defined(uniformMap[variable])) {
    return false;
  }

  if (!hasUniform(uniforms, variable)) {
    uniforms[variable] = uniformMap[variable];
    var glslName = getGlslName(variable, "uniform");
    uniformNameMap[variable] = glslName;
    variableSubstitutionMap[variable] = "uniform." + glslName;
  }

  return true;
}

function parseVariableAsProperty(
  variable,
  primitive,
  featureMetadata,
  content,
  attributes,
  properties,
  variableSubstitutionMap,
  propertyNameMap
) {
  if (!defined(featureMetadata)) {
    return false;
  }

  var property = getPropertyInfo(variable, primitive, featureMetadata, content);

  if (!defined(property)) {
    return false;
  }

  if (!hasProperty(properties, variable)) {
    properties.push(property);
    var propertyId = property.propertyId;
    var glslName = getGlslName(propertyId, "property");
    propertyNameMap[propertyId] = glslName;
    variableSubstitutionMap[variable] = "property." + glslName;

    var texCoord = getTexCoordUsedByProperty(primitive, property);
    if (defined(texCoord) && !hasAttribute(attributes, texCoord)) {
      attributes.push(texCoord);
    }

    var featureId = getFeatureIdAttributeUsedByProperty(primitive, property);
    if (defined(featureId) && !hasAttribute(attributes, featureId)) {
      attributes.push(featureId);
    }
  }

  return true;
}

CustomShader.fromStyle = function (options) {
  // Styles may be evaluated on the CPU or GPU depending on the style and the
  // types of properties involved. On the CPU styles are evaluated per-feature
  // and the color/show results are stored in a batch texture, which is later
  // applied on the GPU, either in the vertex shader or fragment shader.
  // For GPU styling the style is converted to a shader and executed in the
  // vertex shader or fragment shader directly. CPU styling is preferred.
  //
  // In some cases a style may require both CPU styling and GPU styling, in which
  // case the style can't be applied and an error is thrown.
  //
  // Situations where CPU styling is required:
  //   * Style uses language features not supported in GLSL like strings or regex
  //   * Style uses properties that are not GPU compatible like strings, variable-size arrays, or fixed sized arrays with more than 4 components
  //   * Style uses properties in JsonMetadataTable or BatchTableHierarchy
  //   * Style uses custom evaluate functions, see {@link Cesium3DTileStyle#color}
  //
  // Situations where GPU styling is required:
  //   * Style uses per-point properties. Large point clouds are generally impractical to style on the CPU.
  //   * Style uses per-vertex properties. Per-vertex properties need to be interpolated before being styled.
  //   * Style uses feature texture properties
  //   * Style uses vertex attributes like position, color, etc
  //   * Style uses uniforms
  //   * Style references features in different feature tables
  //   * Point size style is used
  //
  // Situations where the style must be applied in the fragment shader:
  //   * Primitive uses a feature ID texture
  //   * Style uses feature texture properties
  //   * Style uses per-vertex properties
  //   * Style uses interpolated vertex attributes
  //   * Style is evaluated on the CPU and vertex texture fetch is not supported
  //
  // Situations where the style must be applied in the vertex shader:
  //   * Point size style is used
  //
  // Since style variables aren't scoped there can be name collisions. They are
  // resolved in the following order of precedence:
  //
  //   1. Input semantics (e.g. POSITION)
  //   2. Attributes (e.g. _TEMPERATURE)
  //   3. Uniforms
  //   4. Properties (for each item below, search by semantic first, then by property ID)
  //     a. Feature
  //     b. Tile
  //     c. Group
  //     d. Tileset

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var style = options.style;
  var primitive = options.primitive;
  var uniformMap = options.uniformMap;
  var featureMetadata = options.featureMetadata;
  var content = options.content;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.style", style);
  Check.typeOf.object("options.primitive", primitive);
  //>>includeEnd('debug');

  var requireCpu = false;
  var requireGpu = false;
  var requireVertShader = false;
  var requireFragShader = false;

  var customShader;

  var variables = style.getVariables();

  // Sort variables into buckets
  var inputs = [];
  var attributes = [];
  var derivedAttributes = [];
  var helperAttributes = [];
  var uniforms = [];
  var properties = [];

  // Build a variable substitution map that maps style variable names to custom
  // shader variable names
  var variableSubstitutionMap = {};

  var attributeNameMap = {};
  var uniformNameMap = {};
  var propertyNameMap = {};

  var i;
  var variablesLength = variables.length;
  for (i = 0; i < variablesLength; ++i) {
    var variable = variables[i];
    if (
      parseVariableAsInput(
        variable,
        primitive,
        inputs,
        derivedAttributes,
        variableSubstitutionMap
      ) ||
      parseVariableAsAttribute(
        variable,
        primitive,
        attributes,
        variableSubstitutionMap,
        attributeNameMap
      ) ||
      parseVariableAsUniform(
        variable,
        uniforms,
        uniformMap,
        variableSubstitutionMap,
        uniformNameMap
      ) ||
      parseVariableAsProperty(
        variable,
        primitive,
        featureMetadata,
        content,
        helperAttributes,
        properties,
        variableSubstitutionMap,
        propertyNameMap
      )
    ) {
      continue;
    }
    // Didn't find a match. The variable will evaluate to null/undefined.
    // Warn the user about this happening because the style might not work correctly.
    oneTimeWarning(
      "Style references a property that does not exist: " + variable
    );
    variableSubstitutionMap[variable] = Expression.NULL_SENTINEL;
  }

  if (attributes.length + derivedAttributes.length > 0) {
    requireGpu = true;
    // TODO: if POSITION attribute probably want to render in frag shader for smooth color ramps, regardless of primitive type
    if (primitive.primitiveType !== PrimitiveType.POINTS) {
      requireFragShader = true;
    }
  }

  var featureTable;
  var featureIdAttribute;
  var featureIdTexture;

  var propertiesLength = properties.length;
  for (i = 0; i < propertiesLength; ++i) {
    // Check if properties require CPU or GPU styling
    var property = properties[i];
    requireCpu = requireCpu || property.requireCpu;
    requireGpu = requireGpu || property.requireGpu;
    requireVertShader = requireVertShader || property.requireVertShader;
    requireFragShader = requireFragShader || property.requireFragShader;

    if (!defined(featureTable)) {
      featureTable = property.featureTable;
      featureIdAttribute = property.featureIdAttribute;
      featureIdTexture = property.featureIdTexture;
    }

    if (property.featureTable !== featureTable) {
      // If different feature tables are used in the same style the style needs to be
      // applied on the GPU. It's not possible to compose the colors/shows of
      // different feature on the CPU in a way that makes sense
      requireGpu = true;
    }
  }

  if (uniforms.length > 0) {
    // Uniforms only work on the GPU because it's not fast enough to evaluate
    // styles on the CPU if uniforms are changing every frame (like a "time" uniform)
    requireGpu = true;
  }

  var hasColorStyle = defined(style.color);
  var hasShowStyle = defined(style.show);
  var hasPointSizeStyle =
    defined(style.pointSize) &&
    primitive.primitiveType === PrimitiveType.POINTS;

  if (hasPointSizeStyle) {
    // Longer term point size could be evaluated on the CPU and sent in as a
    // vertex attribute, though this is impractical for large point clouds
    requireGpu = true;
    requireVertShader = true;
  }
  var hasColorShaderFunction =
    hasColorStyle && defined(style.color.getShaderFunction);
  var hasShowShaderFunction =
    hasShowStyle && defined(style.show.getShaderFunction);
  var hasPointSizeShaderFunction =
    hasPointSizeStyle && defined(style.pointSize.getShaderFunction);

  if (
    (hasColorStyle && !hasColorShaderFunction) ||
    (hasShowStyle && !hasShowShaderFunction) ||
    (hasPointSizeStyle && !hasPointSizeShaderFunction)
  ) {
    // Styles that uses custom evaluate functions must be evaluated on the CPU.
    requireCpu = true;
  }

  var vertexTextureFetchSupported =
    ContextLimits.maximumVertexTextureImageUnits === 0;

  if (requireGpu && !vertexTextureFetchSupported) {
    // If vertex texture fetch is not supported property textures need to be read in the frag shader
    for (i = 0; i < propertiesLength; ++i) {
      featureIdAttribute = properties[i].featureIdAttribute;
      if (defined(featureIdAttribute) && featureIdAttribute.divisor !== 1) {
        requireFragShader = true;
      }
    }
  }

  if (requireGpu) {
    var shaderState = {
      translucent: false,
    };

    var colorShaderFunction;
    var showShaderFunction;
    var pointSizeShaderFunction;

    if (hasColorShaderFunction) {
      try {
        colorShaderFunction = style.getColorShaderFunction(
          "getColorFromStyle(Input input, Attribute attribute, Uniform uniform, Property property)",
          variableSubstitutionMap,
          shaderState
        );
      } catch (error) {
        // If the style can't be converted to a shader fall back to CPU
        requireCpu = true;
      }
    }

    if (hasShowShaderFunction) {
      try {
        showShaderFunction = style.getShowShaderFunction(
          "getShowFromStyle(Input input, Attribute attribute, Uniform uniform, Property property)",
          variableSubstitutionMap,
          shaderState
        );
      } catch (error) {
        // If the style can't be converted to a shader fall back to CPU
        requireCpu = true;
      }
    }

    if (hasPointSizeShaderFunction) {
      try {
        pointSizeShaderFunction = style.getPointSizeShaderFunction(
          "getPointSizeFromStyle(Input input, Attribute attribute, Uniform uniform, Property property)",
          variableSubstitutionMap,
          shaderState
        );
      } catch (error) {
        // If the style can't be converted to a shader fall back to CPU
        requireCpu = true;
      }
    }

    if (!requireCpu) {
      // Create custom shader from the color, show, and point size shaders
      var shaderString = "";
      var shaderFunctionsString = "";

      if (hasColorShaderFunction) {
        shaderString +=
          "output.color = getColorFromStyle(input, attribute, uniform, property);\n";
        shaderFunctionsString += colorShaderFunction;
      }

      if (hasShowShaderFunction) {
        shaderString +=
          "output.show = getShowFromStyle(input, attribute, uniform, property);\n";
        shaderFunctionsString += showShaderFunction;
      }

      if (hasPointSizeShaderFunction) {
        shaderString +=
          "output.pointSize = getPointSizeFromStyle(input, attribute, uniform, property);\n";
        shaderFunctionsString += pointSizeShaderFunction;
      }

      shaderString = getFinalShaderString(
        shaderString,
        shaderFunctionsString,
        inputs,
        attributes,
        uniforms,
        properties,
        attributeNameMap,
        uniformNameMap,
        propertyNameMap
      );

      customShader = new CustomShader();
      customShader.inputs = inputs;
      customShader.attributes = attributes;
      customShader.derivedAttributes = derivedAttributes;
      customShader.helperAttributes = helperAttributes;
      customShader.uniforms = uniforms;
      customShader.properties = properties;
      customShader.attributeNameMap = attributeNameMap;
      customShader.uniformNameMap = uniformNameMap;
      customShader.propertyNameMap = propertyNameMap;
      customShader.shaderString = shaderString;
      customShader.applyInVertexShader = !requireFragShader;
      customShader.setsColor = hasColorShaderFunction;
      customShader.setsShow = hasShowShaderFunction;
      customShader.setsPointSize = hasPointSizeShaderFunction;
      customShader.translucent = shaderState.translucent;
    }
  }

  if (requireCpu && !vertexTextureFetchSupported) {
    // If vertex texture fetch is not supported the batch texture needs to be
    // applied in the frag shader
    requireFragShader = true;
  }

  if (requireCpu && requireGpu) {
    throw new RuntimeError("Invalid style");
  }

  if (requireVertShader && requireFragShader) {
    throw new RuntimeError("Invalid style");
  }

  var styleInfo = new StyleInfo();
  styleInfo.customShader = customShader;
  styleInfo.applyInVertexShader = !requireFragShader;
  styleInfo.helperAttributes = helperAttributes;
  styleInfo.featureIdAttribute = featureIdAttribute;
  styleInfo.featureIdTexture = featureIdTexture;

  return styleInfo;
};

export default CustomShader;
