import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import oneTimeWarning from "../../Core/oneTimeWarning.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import CustomShaderStageVS from "../../Shaders/ModelExperimental/CustomShaderStageVS.js";
import CustomShaderStageFS from "../../Shaders/ModelExperimental/CustomShaderStageFS.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import AttributeType from "../AttributeType.js";
import CustomShaderMode from "./CustomShaderMode.js";

export default function CustomShaderStage() {}

CustomShaderStage.process = function (renderResources, primitive) {
  var shaderBuilder = renderResources.shaderBuilder;
  var customShader = renderResources.model.customShader;

  // Generate lines of code for the shader, but don't add them to the shader
  // yet.
  var generatedCode = generateShaderLines(customShader, primitive);

  // In some corner cases, the primitive may not be compatible with the
  // shader. In this case, skip the custom shader.
  if (!generatedCode.customShaderEnabled) {
    return;
  }

  // generateShaderLines() will always return an arrays of shader code, even
  // if they are empty.
  shaderBuilder.addVertexLines(generatedCode.vertexLines);
  shaderBuilder.addFragmentLines(generatedCode.fragmentLines);

  // the input to the fragment shader may include a low-precision ECEF position
  if (generatedCode.shouldComputePositionWC) {
    shaderBuilder.addDefine(
      "COMPUTE_POSITION_WC",
      undefined,
      ShaderDestination.VERTEX
    );
    shaderBuilder.addVarying("vec3", "v_positionWC");
  }

  if (defined(generatedCode.vertexLinesEnabled)) {
    shaderBuilder.addDefine(
      "HAS_CUSTOM_VERTEX_SHADER",
      undefined,
      ShaderDestination.VERTEX
    );
  }

  if (defined(generatedCode.fragmentLinesEnabled)) {
    shaderBuilder.addDefine(
      "HAS_CUSTOM_FRAGMENT_SHADER",
      undefined,
      ShaderDestination.FRAGMENT
    );

    // add defines like CUSTOM_SHADER_MODIFY_MATERIAL
    var shaderModeDefine = CustomShaderMode.getDefineName(customShader.mode);
    shaderBuilder.addDefine(
      shaderModeDefine,
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  var uniforms = customShader.uniforms;
  for (var uniformName in uniforms) {
    if (uniforms.hasOwnProperty(uniformName)) {
      var uniform = uniforms[uniformName];
      shaderBuilder.addUniform(uniform.type, uniformName);
    }
  }

  var varyings = customShader.varyings;
  for (var varyingName in varyings) {
    if (varyings.hasOwnProperty(varyingName)) {
      var varyingType = varyings[varyingName];
      shaderBuilder.addVarying(varyingType, varyingName);
    }
  }

  // if present, the lighting model overrides the material's lighting model.
  renderResources.lightingOptions.customShaderLightingModel =
    customShader.lightingModel;

  renderResources.uniformMap = combine(
    renderResources.uniformMap,
    customShader.uniformMap
  );
};

function getAttributeNames(attributes) {
  var names = {};
  for (var i = 0; i < attributes.length; i++) {
    var attribute = attributes[i];
    var semantic = attribute.semantic;
    var setIndex = attribute.setIndex;

    var variableName;
    if (defined(semantic)) {
      variableName = VertexAttributeSemantic.getVariableName(
        semantic,
        setIndex
      );
    } else {
      // Handle user defined vertex attributes. They must begin with an underscore
      // For example, "_TEMPERATURE" will be converted to "a_temperature".
      variableName = attribute.name.substring(1).toLowerCase();
    }

    names[variableName] = attribute;
  }
  return names;
}

function generateStructField(glslType, fieldName) {
  return "    " + glslType + " " + fieldName + ";";
}

function generateAttributeField(name, attribute) {
  var attributeType = attribute.type;
  var glslType = AttributeType.getGlslType(attributeType);

  // Fields for the Attribute struct. for example:
  // "    vec3 position;"
  return generateStructField(glslType, name);
}

// GLSL types of standard attribute types when uniquely defined
var attributeTypeLUT = {
  position: "vec3",
  normal: "vec3",
  tangent: "vec4",
  texCoord: "vec2",
  joints: "vec4",
  weights: "vec4",
};

// Corresponding attribute values
var attributeDefaultValueLUT = {
  position: "vec3(0.0)",
  normal: "vec3(0.0, 0.0, 1.0)",
  tangent: "vec4(1.0, 0.0, 0.0, 1.0)",
  texCoord: "vec2(0.0)",
  joints: "vec4(0.0)",
  weights: "vec4(0.0)",
};

function inferAttributeDefaults(attributeName) {
  // remove trailing set indices. E.g. "texCoord_0" -> "texCoord"
  var trimmed = attributeName.replace(/_[0-9]+$/, "");
  var glslType = attributeTypeLUT[trimmed];
  var value = attributeDefaultValueLUT[trimmed];

  // Return undefined for other cases that cannot be easily inferred:
  // - COLOR_x is either a vec3 or vec4
  // - _CUSTOM_ATTRIBUTE has an unknown type.
  if (!defined(glslType)) {
    return undefined;
  }

  return {
    attributeField: generateStructField(glslType, attributeName),
    value: value,
  };
}

function generateVertexShaderLines(customShader, namedAttributes) {
  var categories = partitionAttributes(
    namedAttributes,
    customShader._usedVariablesVertex.attributeSet
  );
  var addToShader = categories.addToShader;
  var needsDefault = categories.missingAttributes;

  var variableName;
  var vertexInitialization;
  var attributeFields = [];
  var initializationLines = [];
  for (variableName in addToShader) {
    if (addToShader.hasOwnProperty(variableName)) {
      var attribute = addToShader[variableName];
      var attributeField = generateAttributeField(variableName, attribute);
      attributeFields.push(attributeField);

      // Initializing attribute structs are just a matter of copying the
      // attribute or varying: E.g.:
      // "    vsInput.attributes.position = a_position;"
      vertexInitialization =
        "    vsInput.attributes." + variableName + " = a_" + variableName + ";";
      initializationLines.push(vertexInitialization);
    }
  }

  for (var i = 0; i < needsDefault.length; i++) {
    variableName = needsDefault[i];
    var attributeDefaults = inferAttributeDefaults(variableName);
    if (!defined(attributeDefaults)) {
      // This primitive isn't compatible with the shader. To avoid compiling
      // a shader with a syntax error, the custom shader will be disabled.
      // this is indicated by returning an empty list of shader lines.
      oneTimeWarning(
        "CustomShaderStage.incompatiblePrimitiveVS",
        "Primitive is missing attribute " +
          variableName +
          ", disabling custom vertex shader"
      );
      return [];
    }

    attributeFields.push(attributeDefaults.attributeField);
    vertexInitialization =
      "    vsInput.attributes." +
      variableName +
      " = " +
      attributeDefaults.value +
      ";";
    initializationLines.push(vertexInitialization);
  }

  // If there are no attributes, add a placeholder float field so the struct
  // is not empty
  if (attributeFields.length === 0) {
    attributeFields.push("    float _padding;");
  }

  return [].concat(
    "struct Attributes",
    "{",
    attributeFields,
    "};",
    "",
    "struct VertexInput",
    "{",
    "    Attributes attributes;",
    "};",
    "",
    "void initializeInputStruct(out VertexInput vsInput)",
    "{",
    initializationLines,
    "}"
  );
}

function generatePositionBuiltins(customShader) {
  var fragmentInputFields = [];
  var initializationLines = [];
  var usedVariables = customShader._usedVariablesFragment.positionSet;

  // Model space position is the same position as in the glTF accessor.
  if ("positionMC" in usedVariables) {
    fragmentInputFields.push("    vec3 positionMC;");
    initializationLines.push("    fsInput.positionMC = v_position;");
  }

  // World coordinates in ECEF coordinates. Note that this is
  // low precision (32-bit floats) on the GPU.
  if ("positionWC" in usedVariables) {
    fragmentInputFields.push("    vec3 positionWC;");
    initializationLines.push("    fsInput.positionWC = v_positionWC;");
  }

  // position in eye coordinates
  if ("positionEC" in usedVariables) {
    fragmentInputFields.push("    vec3 positionEC;");
    initializationLines.push("    fsInput.positionEC = v_positionEC;");
  }

  return {
    fragmentInputFields: fragmentInputFields,
    initializationLines: initializationLines,
  };
}

function generateFragmentShaderLines(customShader, namedAttributes) {
  var categories = partitionAttributes(
    namedAttributes,
    customShader._usedVariablesFragment.attributeSet
  );
  var addToShader = categories.addToShader;
  var needsDefault = categories.missingAttributes;

  var variableName;
  var fragmentInitialization;
  var attributeFields = [];
  var initializationLines = [];
  for (variableName in addToShader) {
    if (addToShader.hasOwnProperty(variableName)) {
      var attribute = addToShader[variableName];
      var attributeField = generateAttributeField(variableName, attribute);
      attributeFields.push(attributeField);

      // Initializing attribute structs are just a matter of copying the
      // attribute or varying: E.g.:
      // "    fsInput.attributes.position = v_position;"
      fragmentInitialization =
        "    " +
        "fsInput.attributes." +
        variableName +
        " = v_" +
        variableName +
        ";";
      initializationLines.push(fragmentInitialization);
    }
  }

  for (var i = 0; i < needsDefault.length; i++) {
    variableName = needsDefault[i];
    var attributeDefaults = inferAttributeDefaults(variableName);
    if (!defined(attributeDefaults)) {
      oneTimeWarning(
        "CustomShaderStage.incompatiblePrimitiveFS",
        "Primitive is missing attribute " +
          variableName +
          ", disabling custom fragment shader."
      );

      // This primitive isn't compatible with the shader. To avoid compiling
      // a shader with a syntax error, the custom shader will be disabled.
      // this is indicated by returning an empty list of shader lines.
      return [];
    }

    attributeFields.push(attributeDefaults.attributeField);
    fragmentInitialization =
      "    fsInput.attributes." +
      variableName +
      " = " +
      attributeDefaults.value +
      ";";
    initializationLines.push(fragmentInitialization);
  }

  // Built-ins for positions in various coordinate systems.
  var positionBuiltins = generatePositionBuiltins(customShader);

  // If there are no attributes, add a placeholder float field so the struct
  // is not empty
  if (attributeFields.length === 0) {
    attributeFields.push("    float _padding;");
  }

  return [].concat(
    "struct Attributes",
    "{",
    attributeFields,
    "};",
    "",
    "struct FragmentInput",
    "{",
    "    Attributes attributes;",
    positionBuiltins.fragmentInputFields,
    "};",
    "",
    "void initializeInputStruct(out FragmentInput fsInput)",
    "{",
    positionBuiltins.initializationLines,
    initializationLines,
    "}"
  );
}

function partitionAttributes(primitiveAttributes, shaderAttributeSet) {
  // shaderAttributes = set of all attributes used in the shader
  // primitiveAttributes = set of all the primitive's attributes
  // partition into three categories:
  // - addToShader = shaderAttributes intersect primitiveAttributes
  // - missingAttributes = shaderAttributes - primitiveAttributes
  // - unneededAttributes = primitive-attributes - shaderAttributes
  //
  // addToShader are attributes that should be added to the shader.
  // missingAttributes are attributes for which we need to provide a default value
  // unneededAttributes are other attributes that can be skipped.

  var attributeName;
  var addToShader = {};
  for (attributeName in primitiveAttributes) {
    if (primitiveAttributes.hasOwnProperty(attributeName)) {
      var attribute = primitiveAttributes[attributeName];

      if (attributeName in shaderAttributeSet) {
        addToShader[attributeName] = attribute;
      }
    }
  }

  var missingAttributes = [];
  for (attributeName in shaderAttributeSet) {
    if (!(attributeName in primitiveAttributes)) {
      missingAttributes.push(attributeName);
    }
  }

  return {
    addToShader: addToShader,
    missingAttributes: missingAttributes,
  };
}

function generateShaderLines(customShader, primitive) {
  var vertexLines = [];
  var fragmentLines = [];

  // Attempt to generate vertex and fragment shader lines before adding any
  // code to the shader.
  var namedAttributes = getAttributeNames(primitive.attributes);
  if (defined(customShader.vertexShaderText)) {
    // this can fail if the primitive's attributes cannot satisfy those named
    // in the shader. If so, vertexLines will be set to [] to
    vertexLines = generateVertexShaderLines(customShader, namedAttributes);
  }
  var vertexLinesEnabled = vertexLines.length > 0;

  if (defined(customShader.fragmentShaderText)) {
    // Similarly, this can fail
    fragmentLines = generateFragmentShaderLines(customShader, namedAttributes);
  }
  var fragmentLinesEnabled = fragmentLines.length > 0;

  // positionWC must be computed in the vertex shader
  // for use in the fragmentShader. However, this can be skipped if:
  // - positionWC isn't used in the fragment shader
  // - or the fragment shader is disabled
  var shouldComputePositionWC =
    "positionWC" in customShader._usedVariablesFragment.positionSet &&
    fragmentLinesEnabled;

  if (vertexLinesEnabled) {
    vertexLines.push("#line 0", customShader.vertexShaderText);
  }

  if (vertexLinesEnabled || shouldComputePositionWC) {
    vertexLines.push(CustomShaderStageVS);
  }

  if (fragmentLinesEnabled) {
    fragmentLines.push(
      "#line 0",
      customShader.fragmentShaderText,
      CustomShaderStageFS
    );
  }

  // Return any generated shader code along with some flags to indicate which
  // defines should be added.
  return {
    vertexLines: vertexLines,
    fragmentLines: fragmentLines,
    vertexLinesEnabled: vertexLinesEnabled,
    fragmentLinesEnabled: fragmentLinesEnabled,
    customShaderEnabled: vertexLinesEnabled || fragmentLinesEnabled,
    shouldComputePositionWC: shouldComputePositionWC,
  };
}
