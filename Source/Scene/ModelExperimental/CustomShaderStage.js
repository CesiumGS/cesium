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

  shaderBuilder.addDefine(
    "CUSTOM_VERTEX_SHADER",
    undefined,
    ShaderDestination.VERTEX
  );
  var shaderModeDefine = CustomShaderMode.getDefineName(customShader.mode);
  shaderBuilder.addDefine(
    shaderModeDefine,
    undefined,
    ShaderDestination.FRAGMENT
  );

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

  generateShaderLines(renderResources, customShader, primitive);

  // if present, the lighting model overrides the material's lighting model.
  renderResources.lightingOptions.customShaderLightingModel =
    customShader.lightingModel;

  renderResources.uniformMap = combine(
    renderResources.uniformMap,
    customShader.uniformMap
  );
};

function generateShaderLines(renderResources, customShader, primitive) {
  var inputLines = {
    attributeFields: [],
    vertexInitializationLines: [],
    fragmentInitializationLines: [],
  };
  var attributes = primitive.attributes;
  for (var i = 0; i < attributes.length; i++) {
    processAttribute(attributes[i], inputLines);
  }

  var vertexLines = []
    .concat(
      "struct Attributes",
      "{",
      inputLines.attributeFields,
      "};",
      "",
      "struct VertexInput",
      "{",
      "    Attributes attributes;",
      "};",
      "",
      "void initializeInputStruct(out VertexInput vsInput)",
      "{",
      inputLines.vertexInitializationLines,
      "}"
    )
    .join("\n");

  var fragmentLines = []
    .concat(
      "struct Attributes",
      "{",
      inputLines.attributeFields,
      "};",
      "",
      "struct FragmentInput",
      "{",
      "    Attributes attributes;",
      "};",
      "",
      "void initializeInputStruct(out FragmentInput fsInput)",
      "{",
      inputLines.fragmentInitializationLines,
      "}"
    )
    .join("\n");

  var shaderBuilder = renderResources.shaderBuilder;
  shaderBuilder.addVertexLines([
    vertexLines,
    "#line 0",
    customShader.vertexShaderText,
    CustomShaderStageVS,
  ]);
  shaderBuilder.addFragmentLines([
    fragmentLines,
    "#line 0",
    customShader.fragmentShaderText,
    CustomShaderStageFS,
  ]);
}

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
