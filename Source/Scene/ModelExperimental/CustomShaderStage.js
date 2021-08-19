import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import CustomShaderMode from "./CustomShaderMode.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import CustomShaderStageVS from "../../Shaders/ModelExperimental/CustomShaderStageVS.js";
import CustomShaderStageFS from "../../Shaders/ModelExperimental/CustomShaderStageFS.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import AttributeType from "../AttributeType.js";

export default function CustomShaderStage() {}

CustomShaderStage.process = function (renderResources, primitive) {
  var shaderBuilder = renderResources.shaderBuilder;
  var customShader = renderResources.model.customShader;

  shaderBuilder.addDefine("USE_CUSTOM_SHADER", undefined);

  if (defined(customShader.vertexShaderText)) {
    shaderBuilder.addDefine(
      "HAS_CUSTOM_VERTEX_SHADER",
      undefined,
      ShaderDestination.VERTEX
    );
  }

  if (defined(customShader.fragmentShaderText)) {
    shaderBuilder.addDefine(
      "HAS_CUSTOM_FRAGMENT_SHADER",
      undefined,
      ShaderDestination.FRAGMENT
    );

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

  // the input to the fragment shader includes a low-precision ECEF position
  shaderBuilder.addVarying("vec3", "v_positionWC");

  generateShaderLines(renderResources, customShader, primitive);

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

function generateAttributeField(name, attribute) {
  var attributeType = attribute.type;
  var glslType = AttributeType.getGlslType(attributeType);

  // Fields for the Attribute struct. for example:
  // "    vec3 position;"
  return "    " + glslType + " " + name + ";";
}

function generateVertexShaderLines(customShader, namedAttributes) {
  var categories = partitionAttributes(
    namedAttributes,
    customShader._usedVariablesVertex.attributeSet
  );
  var addToShader = categories.addToShader;
  var needsDefault = categories.missingAttributes;

  var variableName;
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
      var vertexInitialization =
        "    " +
        "vsInput.attributes." +
        variableName +
        " = a_" +
        variableName +
        ";";
      initializationLines.push(vertexInitialization);
    }
  }

  // TODO: handle default values
  for (variableName in needsDefault) {
    if (needsDefault.hasOwnProperty(variableName)) {
      //TODO: handle default values
    }
  }

  // If there are no attributes, add a placeholder float field so the struct
  // is not empty
  if (attributeFields.length === 0) {
    attributeFields.push("    float _padding;");
  }

  return []
    .concat(
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
    )
    .join("\n");
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
      var vertexInitialization =
        "    " +
        "fsInput.attributes." +
        variableName +
        " = v_" +
        variableName +
        ";";
      initializationLines.push(vertexInitialization);
    }
  }

  // TODO: handle default values
  for (variableName in needsDefault) {
    if (needsDefault.hasOwnProperty(variableName)) {
      //TODO: handle default values
    }
  }

  // Built-ins for positions in various coordinate systems.
  var positionBuiltins = generatePositionBuiltins(customShader);

  // If there are no attributes, add a placeholder float field so the struct
  // is not empty
  if (attributeFields.length === 0) {
    attributeFields.push("    float _padding;");
  }

  return []
    .concat(
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
    )
    .join("\n");
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

function generateShaderLines(renderResources, customShader, primitive) {
  var shaderBuilder = renderResources.shaderBuilder;

  // positionWC must be computed in the vertex shader
  var shouldComputePositionWC =
    "positionWC" in customShader._usedVariablesFragment.positionSet;
  if (shouldComputePositionWC) {
    shaderBuilder.addDefine(
      "COMPUTE_POSITION_WC",
      undefined,
      ShaderDestination.VERTEX
    );
  }

  var namedAttributes = getAttributeNames(primitive.attributes);

  // Only generate the vertex shader if used
  if (defined(customShader.vertexShaderText)) {
    var vertexLines = generateVertexShaderLines(customShader, namedAttributes);
    shaderBuilder.addVertexLines([
      vertexLines,
      "#line 0",
      customShader.vertexShaderText,
      CustomShaderStageVS,
    ]);
  } else if (shouldComputePositionWC) {
    // We still need to include the code for computing v_positionWC
    shaderBuilder.addVertexLines([CustomShaderStageVS]);
  }

  // Only generate the fragment shader if used.
  if (defined(customShader.fragmentShaderText)) {
    var fragmentLines = generateFragmentShaderLines(
      customShader,
      namedAttributes
    );
    shaderBuilder.addFragmentLines([
      fragmentLines,
      "#line 0",
      customShader.fragmentShaderText,
      CustomShaderStageFS,
    ]);
  }
}

/*

function processAttribute(attribute, inputLines) {
  var semantic = attribute.semantic;
  var setIndex = attribute.setIndex;
  var attributeType = attribute.type;

  var glslType = AttributeType.getGlslType(attributeType);

  var variableName;
  if (defined(semantic)) {
    variableName = VertexAttributeSemantic.getVariableName(semantic, setIndex);
  } else {
    // Handle user defined vertex attributes. They must begin with an underscore
    // For example, "_TEMPERATURE" will be converted to "a_temperature".
    variableName = attribute.name.substring(1).toLowerCase();
  }

  // Fields for the Attribute struct. for example:
  // "    vec3 position;"
  var attributeField = "    " + glslType + " " + variableName + ";";

  // Initializing attribute structs are just a matter of copying the
  // attribute or varying: E.g.:
  // "    vsInput.attributes.position = a_position;" -- vertex shader
  // "    fsInput.attributes.position = v_position;" -- fragment shader
  var vertexInitialization =
    "    " +
    "vsInput.attributes." +
    variableName +
    " = a_" +
    variableName +
    ";";
  var fragmentInitialization =
    "    " +
    "fsInput.attributes." +
    variableName +
    " = v_" +
    variableName +
    ";";

  inputLines.attributeFields.push(attributeField);
  inputLines.vertexInitializationLines.push(vertexInitialization);
  inputLines.fragmentInitializationLines.push(fragmentInitialization);
}
*/
