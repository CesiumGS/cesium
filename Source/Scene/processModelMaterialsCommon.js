import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import webGLConstantToGlslType from "../Core/webGLConstantToGlslType.js";
import addToArray from "./GltfPipeline/addToArray.js";
import ForEach from "./GltfPipeline/ForEach.js";
import usesExtension from "./GltfPipeline/usesExtension.js";
import ModelUtility from "./ModelUtility.js";

/**
 * @private
 */
function processModelMaterialsCommon(gltf, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  if (!defined(gltf)) {
    return;
  }

  if (!usesExtension(gltf, "KHR_materials_common")) {
    return;
  }

  if (!usesExtension(gltf, "KHR_techniques_webgl")) {
    if (!defined(gltf.extensions)) {
      gltf.extensions = {};
    }

    gltf.extensions.KHR_techniques_webgl = {
      programs: [],
      shaders: [],
      techniques: [],
    };
    gltf.extensionsUsed.push("KHR_techniques_webgl");
    gltf.extensionsRequired.push("KHR_techniques_webgl");
  }

  var techniquesWebgl = gltf.extensions.KHR_techniques_webgl;

  lightDefaults(gltf);

  var lightParameters = generateLightParameters(gltf);

  var primitiveByMaterial = ModelUtility.splitIncompatibleMaterials(gltf);

  var techniques = {};
  var generatedTechniques = false;
  ForEach.material(gltf, function (material, materialIndex) {
    if (
      defined(material.extensions) &&
      defined(material.extensions.KHR_materials_common)
    ) {
      var khrMaterialsCommon = material.extensions.KHR_materials_common;
      var primitiveInfo = primitiveByMaterial[materialIndex];

      var techniqueKey = getTechniqueKey(khrMaterialsCommon, primitiveInfo);
      var technique = techniques[techniqueKey];

      if (!defined(technique)) {
        technique = generateTechnique(
          gltf,
          techniquesWebgl,
          primitiveInfo,
          khrMaterialsCommon,
          lightParameters,
          options.addBatchIdToGeneratedShaders
        );
        techniques[techniqueKey] = technique;
        generatedTechniques = true;
      }

      var materialValues = {};
      var values = khrMaterialsCommon.values;
      var uniformName;
      for (var valueName in values) {
        if (
          values.hasOwnProperty(valueName) &&
          valueName !== "transparent" &&
          valueName !== "doubleSided"
        ) {
          uniformName = "u_" + valueName.toLowerCase();
          materialValues[uniformName] = values[valueName];
        }
      }

      material.extensions.KHR_techniques_webgl = {
        technique: technique,
        values: materialValues,
      };

      material.alphaMode = "OPAQUE";
      if (khrMaterialsCommon.transparent) {
        material.alphaMode = "BLEND";
      }

      if (khrMaterialsCommon.doubleSided) {
        material.doubleSided = true;
      }
    }
  });

  if (!generatedTechniques) {
    return gltf;
  }

  // If any primitives have semantics that aren't declared in the generated
  // shaders, we want to preserve them.
  ModelUtility.ensureSemanticExistence(gltf);

  return gltf;
}

function generateLightParameters(gltf) {
  var result = {};

  var lights;
  if (
    defined(gltf.extensions) &&
    defined(gltf.extensions.KHR_materials_common)
  ) {
    lights = gltf.extensions.KHR_materials_common.lights;
  }

  if (defined(lights)) {
    // Figure out which node references the light
    var nodes = gltf.nodes;
    for (var nodeName in nodes) {
      if (nodes.hasOwnProperty(nodeName)) {
        var node = nodes[nodeName];
        if (
          defined(node.extensions) &&
          defined(node.extensions.KHR_materials_common)
        ) {
          var nodeLightId = node.extensions.KHR_materials_common.light;
          if (defined(nodeLightId) && defined(lights[nodeLightId])) {
            lights[nodeLightId].node = nodeName;
          }
          delete node.extensions.KHR_materials_common;
        }
      }
    }

    // Add light parameters to result
    var lightCount = 0;
    for (var lightName in lights) {
      if (lights.hasOwnProperty(lightName)) {
        var light = lights[lightName];
        var lightType = light.type;
        if (lightType !== "ambient" && !defined(light.node)) {
          delete lights[lightName];
          continue;
        }
        var lightBaseName = "light" + lightCount.toString();
        light.baseName = lightBaseName;
        switch (lightType) {
          case "ambient":
            var ambient = light.ambient;
            result[lightBaseName + "Color"] = {
              type: WebGLConstants.FLOAT_VEC3,
              value: ambient.color,
            };
            break;
          case "directional":
            var directional = light.directional;
            result[lightBaseName + "Color"] = {
              type: WebGLConstants.FLOAT_VEC3,
              value: directional.color,
            };
            if (defined(light.node)) {
              result[lightBaseName + "Transform"] = {
                node: light.node,
                semantic: "MODELVIEW",
                type: WebGLConstants.FLOAT_MAT4,
              };
            }
            break;
          case "point":
            var point = light.point;
            result[lightBaseName + "Color"] = {
              type: WebGLConstants.FLOAT_VEC3,
              value: point.color,
            };
            if (defined(light.node)) {
              result[lightBaseName + "Transform"] = {
                node: light.node,
                semantic: "MODELVIEW",
                type: WebGLConstants.FLOAT_MAT4,
              };
            }
            result[lightBaseName + "Attenuation"] = {
              type: WebGLConstants.FLOAT_VEC3,
              value: [
                point.constantAttenuation,
                point.linearAttenuation,
                point.quadraticAttenuation,
              ],
            };
            break;
          case "spot":
            var spot = light.spot;
            result[lightBaseName + "Color"] = {
              type: WebGLConstants.FLOAT_VEC3,
              value: spot.color,
            };
            if (defined(light.node)) {
              result[lightBaseName + "Transform"] = {
                node: light.node,
                semantic: "MODELVIEW",
                type: WebGLConstants.FLOAT_MAT4,
              };
              result[lightBaseName + "InverseTransform"] = {
                node: light.node,
                semantic: "MODELVIEWINVERSE",
                type: WebGLConstants.FLOAT_MAT4,
                useInFragment: true,
              };
            }
            result[lightBaseName + "Attenuation"] = {
              type: WebGLConstants.FLOAT_VEC3,
              value: [
                spot.constantAttenuation,
                spot.linearAttenuation,
                spot.quadraticAttenuation,
              ],
            };

            result[lightBaseName + "FallOff"] = {
              type: WebGLConstants.FLOAT_VEC2,
              value: [spot.fallOffAngle, spot.fallOffExponent],
            };
            break;
        }
        ++lightCount;
      }
    }
  }

  return result;
}

function generateTechnique(
  gltf,
  techniquesWebgl,
  primitiveInfo,
  khrMaterialsCommon,
  lightParameters,
  addBatchIdToGeneratedShaders
) {
  if (!defined(khrMaterialsCommon)) {
    khrMaterialsCommon = {};
  }

  addBatchIdToGeneratedShaders = defaultValue(
    addBatchIdToGeneratedShaders,
    false
  );

  var techniques = techniquesWebgl.techniques;
  var shaders = techniquesWebgl.shaders;
  var programs = techniquesWebgl.programs;
  var lightingModel = khrMaterialsCommon.technique.toUpperCase();
  var lights;
  if (
    defined(gltf.extensions) &&
    defined(gltf.extensions.KHR_materials_common)
  ) {
    lights = gltf.extensions.KHR_materials_common.lights;
  }

  var parameterValues = khrMaterialsCommon.values;
  var jointCount = defaultValue(khrMaterialsCommon.jointCount, 0);

  var skinningInfo;
  var hasSkinning = false;
  var hasVertexColors = false;

  if (defined(primitiveInfo)) {
    skinningInfo = primitiveInfo.skinning;
    hasSkinning = skinningInfo.skinned;
    hasVertexColors = primitiveInfo.hasVertexColors;
  }

  var vertexShader = "precision highp float;\n";
  var fragmentShader = "precision highp float;\n";

  var hasNormals = lightingModel !== "CONSTANT";

  // Add techniques
  var techniqueUniforms = {
    u_modelViewMatrix: {
      semantic: usesExtension(gltf, "CESIUM_RTC")
        ? "CESIUM_RTC_MODELVIEW"
        : "MODELVIEW",
      type: WebGLConstants.FLOAT_MAT4,
    },
    u_projectionMatrix: {
      semantic: "PROJECTION",
      type: WebGLConstants.FLOAT_MAT4,
    },
  };

  if (hasNormals) {
    techniqueUniforms.u_normalMatrix = {
      semantic: "MODELVIEWINVERSETRANSPOSE",
      type: WebGLConstants.FLOAT_MAT3,
    };
  }

  if (hasSkinning) {
    techniqueUniforms.u_jointMatrix = {
      count: jointCount,
      semantic: "JOINTMATRIX",
      type: WebGLConstants.FLOAT_MAT4,
    };
  }

  // Add material values
  var uniformName;
  var hasTexCoords = false;
  for (var name in parameterValues) {
    //generate shader parameters for KHR_materials_common attributes
    //(including a check, because some boolean flags should not be used as shader parameters)
    if (
      parameterValues.hasOwnProperty(name) &&
      name !== "transparent" &&
      name !== "doubleSided"
    ) {
      var uniformType = getKHRMaterialsCommonValueType(
        name,
        parameterValues[name]
      );
      uniformName = "u_" + name.toLowerCase();
      if (!hasTexCoords && uniformType === WebGLConstants.SAMPLER_2D) {
        hasTexCoords = true;
      }

      techniqueUniforms[uniformName] = {
        type: uniformType,
      };
    }
  }

  // Give the diffuse uniform a semantic to support color replacement in 3D Tiles
  if (defined(techniqueUniforms.u_diffuse)) {
    techniqueUniforms.u_diffuse.semantic = "_3DTILESDIFFUSE";
  }

  // Copy light parameters into technique parameters
  if (defined(lightParameters)) {
    for (var lightParamName in lightParameters) {
      if (lightParameters.hasOwnProperty(lightParamName)) {
        uniformName = "u_" + lightParamName;
        techniqueUniforms[uniformName] = lightParameters[lightParamName];
      }
    }
  }

  // Add uniforms to shaders
  for (uniformName in techniqueUniforms) {
    if (techniqueUniforms.hasOwnProperty(uniformName)) {
      var uniform = techniqueUniforms[uniformName];
      var arraySize = defined(uniform.count) ? "[" + uniform.count + "]" : "";
      if (
        (uniform.type !== WebGLConstants.FLOAT_MAT3 &&
          uniform.type !== WebGLConstants.FLOAT_MAT4) ||
        uniform.useInFragment
      ) {
        fragmentShader +=
          "uniform " +
          webGLConstantToGlslType(uniform.type) +
          " " +
          uniformName +
          arraySize +
          ";\n";
        delete uniform.useInFragment;
      } else {
        vertexShader +=
          "uniform " +
          webGLConstantToGlslType(uniform.type) +
          " " +
          uniformName +
          arraySize +
          ";\n";
      }
    }
  }

  // Add attributes with semantics
  var vertexShaderMain = "";
  if (hasSkinning) {
    vertexShaderMain +=
      "    mat4 skinMatrix =\n" +
      "        a_weight.x * u_jointMatrix[int(a_joint.x)] +\n" +
      "        a_weight.y * u_jointMatrix[int(a_joint.y)] +\n" +
      "        a_weight.z * u_jointMatrix[int(a_joint.z)] +\n" +
      "        a_weight.w * u_jointMatrix[int(a_joint.w)];\n";
  }

  // Add position always
  var techniqueAttributes = {
    a_position: {
      semantic: "POSITION",
    },
  };
  vertexShader += "attribute vec3 a_position;\n";
  vertexShader += "varying vec3 v_positionEC;\n";
  if (hasSkinning) {
    vertexShaderMain +=
      "  vec4 pos = u_modelViewMatrix * skinMatrix * vec4(a_position,1.0);\n";
  } else {
    vertexShaderMain +=
      "  vec4 pos = u_modelViewMatrix * vec4(a_position,1.0);\n";
  }
  vertexShaderMain += "  v_positionEC = pos.xyz;\n";
  vertexShaderMain += "  gl_Position = u_projectionMatrix * pos;\n";
  fragmentShader += "varying vec3 v_positionEC;\n";

  // Add normal if we don't have constant lighting
  if (hasNormals) {
    techniqueAttributes.a_normal = {
      semantic: "NORMAL",
    };
    vertexShader += "attribute vec3 a_normal;\n";
    vertexShader += "varying vec3 v_normal;\n";
    if (hasSkinning) {
      vertexShaderMain +=
        "  v_normal = u_normalMatrix * mat3(skinMatrix) * a_normal;\n";
    } else {
      vertexShaderMain += "  v_normal = u_normalMatrix * a_normal;\n";
    }

    fragmentShader += "varying vec3 v_normal;\n";
  }

  // Add texture coordinates if the material uses them
  var v_texcoord;
  if (hasTexCoords) {
    techniqueAttributes.a_texcoord_0 = {
      semantic: "TEXCOORD_0",
    };

    v_texcoord = "v_texcoord_0";
    vertexShader += "attribute vec2 a_texcoord_0;\n";
    vertexShader += "varying vec2 " + v_texcoord + ";\n";
    vertexShaderMain += "  " + v_texcoord + " = a_texcoord_0;\n";

    fragmentShader += "varying vec2 " + v_texcoord + ";\n";
  }

  if (hasSkinning) {
    techniqueAttributes.a_joint = {
      semantic: "JOINTS_0",
    };
    techniqueAttributes.a_weight = {
      semantic: "WEIGHTS_0",
    };

    vertexShader += "attribute vec4 a_joint;\n";
    vertexShader += "attribute vec4 a_weight;\n";
  }

  if (hasVertexColors) {
    techniqueAttributes.a_vertexColor = {
      semantic: "COLOR_0",
    };
    vertexShader += "attribute vec4 a_vertexColor;\n";
    vertexShader += "varying vec4 v_vertexColor;\n";
    vertexShaderMain += "  v_vertexColor = a_vertexColor;\n";
    fragmentShader += "varying vec4 v_vertexColor;\n";
  }

  if (addBatchIdToGeneratedShaders) {
    techniqueAttributes.a_batchId = {
      semantic: "_BATCHID",
    };
    vertexShader += "attribute float a_batchId;\n";
  }

  var hasSpecular =
    hasNormals &&
    (lightingModel === "BLINN" || lightingModel === "PHONG") &&
    defined(techniqueUniforms.u_specular) &&
    defined(techniqueUniforms.u_shininess) &&
    techniqueUniforms.u_shininess > 0.0;

  // Generate lighting code blocks
  var hasNonAmbientLights = false;
  var hasAmbientLights = false;
  var fragmentLightingBlock = "";
  for (var lightName in lights) {
    if (lights.hasOwnProperty(lightName)) {
      var light = lights[lightName];
      var lightType = light.type.toLowerCase();
      var lightBaseName = light.baseName;
      fragmentLightingBlock += "  {\n";
      var lightColorName = "u_" + lightBaseName + "Color";
      var varyingDirectionName;
      var varyingPositionName;
      if (lightType === "ambient") {
        hasAmbientLights = true;
        fragmentLightingBlock +=
          "    ambientLight += " + lightColorName + ";\n";
      } else if (hasNormals) {
        hasNonAmbientLights = true;
        varyingDirectionName = "v_" + lightBaseName + "Direction";
        varyingPositionName = "v_" + lightBaseName + "Position";

        if (lightType !== "point") {
          vertexShader += "varying vec3 " + varyingDirectionName + ";\n";
          fragmentShader += "varying vec3 " + varyingDirectionName + ";\n";

          vertexShaderMain +=
            "  " +
            varyingDirectionName +
            " = mat3(u_" +
            lightBaseName +
            "Transform) * vec3(0.,0.,1.);\n";
          if (lightType === "directional") {
            fragmentLightingBlock +=
              "    vec3 l = normalize(" + varyingDirectionName + ");\n";
          }
        }

        if (lightType !== "directional") {
          vertexShader += "varying vec3 " + varyingPositionName + ";\n";
          fragmentShader += "varying vec3 " + varyingPositionName + ";\n";

          vertexShaderMain +=
            "  " +
            varyingPositionName +
            " = u_" +
            lightBaseName +
            "Transform[3].xyz;\n";
          fragmentLightingBlock +=
            "    vec3 VP = " + varyingPositionName + " - v_positionEC;\n";
          fragmentLightingBlock += "    vec3 l = normalize(VP);\n";
          fragmentLightingBlock += "    float range = length(VP);\n";
          fragmentLightingBlock +=
            "    float attenuation = 1.0 / (u_" +
            lightBaseName +
            "Attenuation.x + ";
          fragmentLightingBlock +=
            "(u_" + lightBaseName + "Attenuation.y * range) + ";
          fragmentLightingBlock +=
            "(u_" + lightBaseName + "Attenuation.z * range * range));\n";
        } else {
          fragmentLightingBlock += "    float attenuation = 1.0;\n";
        }

        if (lightType === "spot") {
          fragmentLightingBlock +=
            "    float spotDot = dot(l, normalize(" +
            varyingDirectionName +
            "));\n";
          fragmentLightingBlock +=
            "    if (spotDot < cos(u_" + lightBaseName + "FallOff.x * 0.5))\n";
          fragmentLightingBlock += "    {\n";
          fragmentLightingBlock += "      attenuation = 0.0;\n";
          fragmentLightingBlock += "    }\n";
          fragmentLightingBlock += "    else\n";
          fragmentLightingBlock += "    {\n";
          fragmentLightingBlock +=
            "        attenuation *= max(0.0, pow(spotDot, u_" +
            lightBaseName +
            "FallOff.y));\n";
          fragmentLightingBlock += "    }\n";
        }

        fragmentLightingBlock +=
          "    diffuseLight += " +
          lightColorName +
          "* max(dot(normal,l), 0.) * attenuation;\n";

        if (hasSpecular) {
          if (lightingModel === "BLINN") {
            fragmentLightingBlock += "    vec3 h = normalize(l + viewDir);\n";
            fragmentLightingBlock +=
              "    float specularIntensity = max(0., pow(max(dot(normal, h), 0.), u_shininess)) * attenuation;\n";
          } else {
            // PHONG
            fragmentLightingBlock +=
              "    vec3 reflectDir = reflect(-l, normal);\n";
            fragmentLightingBlock +=
              "    float specularIntensity = max(0., pow(max(dot(reflectDir, viewDir), 0.), u_shininess)) * attenuation;\n";
          }
          fragmentLightingBlock +=
            "    specularLight += " +
            lightColorName +
            " * specularIntensity;\n";
        }
      }
      fragmentLightingBlock += "  }\n";
    }
  }

  if (!hasAmbientLights) {
    // Add an ambient light if we don't have one
    fragmentLightingBlock += "  ambientLight += vec3(0.2, 0.2, 0.2);\n";
  }

  if (!hasNonAmbientLights && lightingModel !== "CONSTANT") {
    fragmentShader += "#ifdef USE_CUSTOM_LIGHT_COLOR \n";
    fragmentShader += "uniform vec3 gltf_lightColor; \n";
    fragmentShader += "#endif \n";

    fragmentLightingBlock += "#ifndef USE_CUSTOM_LIGHT_COLOR \n";
    fragmentLightingBlock += "    vec3 lightColor = czm_lightColor;\n";
    fragmentLightingBlock += "#else \n";
    fragmentLightingBlock += "    vec3 lightColor = gltf_lightColor;\n";
    fragmentLightingBlock += "#endif \n";

    fragmentLightingBlock += "  vec3 l = normalize(czm_lightDirectionEC);\n";
    var minimumLighting = "0.2"; // Use strings instead of values as 0.0 -> 0 when stringified
    fragmentLightingBlock +=
      "  diffuseLight += lightColor * max(dot(normal,l), " +
      minimumLighting +
      ");\n";

    if (hasSpecular) {
      if (lightingModel === "BLINN") {
        fragmentLightingBlock += "  vec3 h = normalize(l + viewDir);\n";
        fragmentLightingBlock +=
          "  float specularIntensity = max(0., pow(max(dot(normal, h), 0.), u_shininess));\n";
      } else {
        // PHONG
        fragmentLightingBlock += "  vec3 reflectDir = reflect(-l, normal);\n";
        fragmentLightingBlock +=
          "  float specularIntensity = max(0., pow(max(dot(reflectDir, viewDir), 0.), u_shininess));\n";
      }

      fragmentLightingBlock +=
        "  specularLight += lightColor * specularIntensity;\n";
    }
  }

  vertexShader += "void main(void) {\n";
  vertexShader += vertexShaderMain;
  vertexShader += "}\n";

  fragmentShader += "void main(void) {\n";
  var colorCreationBlock = "  vec3 color = vec3(0.0, 0.0, 0.0);\n";
  if (hasNormals) {
    fragmentShader += "  vec3 normal = normalize(v_normal);\n";
    if (khrMaterialsCommon.doubleSided) {
      fragmentShader += "  if (czm_backFacing())\n";
      fragmentShader += "  {\n";
      fragmentShader += "    normal = -normal;\n";
      fragmentShader += "  }\n";
    }
  }

  var finalColorComputation;
  if (lightingModel !== "CONSTANT") {
    if (defined(techniqueUniforms.u_diffuse)) {
      if (techniqueUniforms.u_diffuse.type === WebGLConstants.SAMPLER_2D) {
        fragmentShader +=
          "  vec4 diffuse = texture2D(u_diffuse, " + v_texcoord + ");\n";
      } else {
        fragmentShader += "  vec4 diffuse = u_diffuse;\n";
      }
      fragmentShader += "  vec3 diffuseLight = vec3(0.0, 0.0, 0.0);\n";
      colorCreationBlock += "  color += diffuse.rgb * diffuseLight;\n";
    }

    if (hasSpecular) {
      if (techniqueUniforms.u_specular.type === WebGLConstants.SAMPLER_2D) {
        fragmentShader +=
          "  vec3 specular = texture2D(u_specular, " + v_texcoord + ").rgb;\n";
      } else {
        fragmentShader += "  vec3 specular = u_specular.rgb;\n";
      }
      fragmentShader += "  vec3 specularLight = vec3(0.0, 0.0, 0.0);\n";
      colorCreationBlock += "  color += specular * specularLight;\n";
    }

    if (defined(techniqueUniforms.u_transparency)) {
      finalColorComputation =
        "  gl_FragColor = vec4(color * diffuse.a * u_transparency, diffuse.a * u_transparency);\n";
    } else {
      finalColorComputation =
        "  gl_FragColor = vec4(color * diffuse.a, diffuse.a);\n";
    }
  } else if (defined(techniqueUniforms.u_transparency)) {
    finalColorComputation =
      "  gl_FragColor = vec4(color * u_transparency, u_transparency);\n";
  } else {
    finalColorComputation = "  gl_FragColor = vec4(color, 1.0);\n";
  }

  if (hasVertexColors) {
    colorCreationBlock += "  color *= v_vertexColor.rgb;\n";
  }

  if (defined(techniqueUniforms.u_emission)) {
    if (techniqueUniforms.u_emission.type === WebGLConstants.SAMPLER_2D) {
      fragmentShader +=
        "  vec3 emission = texture2D(u_emission, " + v_texcoord + ").rgb;\n";
    } else {
      fragmentShader += "  vec3 emission = u_emission.rgb;\n";
    }
    colorCreationBlock += "  color += emission;\n";
  }

  if (defined(techniqueUniforms.u_ambient) || lightingModel !== "CONSTANT") {
    if (defined(techniqueUniforms.u_ambient)) {
      if (techniqueUniforms.u_ambient.type === WebGLConstants.SAMPLER_2D) {
        fragmentShader +=
          "  vec3 ambient = texture2D(u_ambient, " + v_texcoord + ").rgb;\n";
      } else {
        fragmentShader += "  vec3 ambient = u_ambient.rgb;\n";
      }
    } else {
      fragmentShader += "  vec3 ambient = diffuse.rgb;\n";
    }
    colorCreationBlock += "  color += ambient * ambientLight;\n";
  }
  fragmentShader += "  vec3 viewDir = -normalize(v_positionEC);\n";
  fragmentShader += "  vec3 ambientLight = vec3(0.0, 0.0, 0.0);\n";

  // Add in light computations
  fragmentShader += fragmentLightingBlock;

  fragmentShader += colorCreationBlock;
  fragmentShader += finalColorComputation;
  fragmentShader += "}\n";

  // Add shaders
  var vertexShaderId = addToArray(shaders, {
    type: WebGLConstants.VERTEX_SHADER,
    extras: {
      _pipeline: {
        source: vertexShader,
        extension: ".glsl",
      },
    },
  });

  var fragmentShaderId = addToArray(shaders, {
    type: WebGLConstants.FRAGMENT_SHADER,
    extras: {
      _pipeline: {
        source: fragmentShader,
        extension: ".glsl",
      },
    },
  });

  // Add program
  var programId = addToArray(programs, {
    fragmentShader: fragmentShaderId,
    vertexShader: vertexShaderId,
  });

  var techniqueId = addToArray(techniques, {
    attributes: techniqueAttributes,
    program: programId,
    uniforms: techniqueUniforms,
  });

  return techniqueId;
}

function getKHRMaterialsCommonValueType(paramName, paramValue) {
  var value;

  // Backwards compatibility for COLLADA2GLTF v1.0-draft when it encoding
  // materials using KHR_materials_common with explicit type/value members
  if (defined(paramValue.value)) {
    value = paramValue.value;
  } else if (defined(paramValue.index)) {
    value = [paramValue.index];
  } else {
    value = paramValue;
  }

  switch (paramName) {
    case "ambient":
      return value.length === 1
        ? WebGLConstants.SAMPLER_2D
        : WebGLConstants.FLOAT_VEC4;
    case "diffuse":
      return value.length === 1
        ? WebGLConstants.SAMPLER_2D
        : WebGLConstants.FLOAT_VEC4;
    case "emission":
      return value.length === 1
        ? WebGLConstants.SAMPLER_2D
        : WebGLConstants.FLOAT_VEC4;
    case "specular":
      return value.length === 1
        ? WebGLConstants.SAMPLER_2D
        : WebGLConstants.FLOAT_VEC4;
    case "shininess":
      return WebGLConstants.FLOAT;
    case "transparency":
      return WebGLConstants.FLOAT;

    // these two are usually not used directly within shaders,
    // they are just added here for completeness
    case "transparent":
      return WebGLConstants.BOOL;
    case "doubleSided":
      return WebGLConstants.BOOL;
  }
}

function getTechniqueKey(khrMaterialsCommon, primitiveInfo) {
  var techniqueKey = "";
  techniqueKey += "technique:" + khrMaterialsCommon.technique + ";";

  var values = khrMaterialsCommon.values;
  var keys = Object.keys(values).sort();
  var keysCount = keys.length;
  for (var i = 0; i < keysCount; ++i) {
    var name = keys[i];
    if (values.hasOwnProperty(name)) {
      techniqueKey +=
        name + ":" + getKHRMaterialsCommonValueType(name, values[name]);
      techniqueKey += ";";
    }
  }

  var jointCount = defaultValue(khrMaterialsCommon.jointCount, 0);
  techniqueKey += jointCount.toString() + ";";
  if (defined(primitiveInfo)) {
    var skinningInfo = primitiveInfo.skinning;
    if (jointCount > 0) {
      techniqueKey += skinningInfo.type + ";";
    }
    techniqueKey += primitiveInfo.hasVertexColors;
  }

  return techniqueKey;
}

function lightDefaults(gltf) {
  var khrMaterialsCommon = gltf.extensions.KHR_materials_common;
  if (!defined(khrMaterialsCommon) || !defined(khrMaterialsCommon.lights)) {
    return;
  }

  var lights = khrMaterialsCommon.lights;

  var lightsLength = lights.length;
  for (var lightId = 0; lightId < lightsLength; lightId++) {
    var light = lights[lightId];
    if (light.type === "ambient") {
      if (!defined(light.ambient)) {
        light.ambient = {};
      }
      var ambientLight = light.ambient;

      if (!defined(ambientLight.color)) {
        ambientLight.color = [1.0, 1.0, 1.0];
      }
    } else if (light.type === "directional") {
      if (!defined(light.directional)) {
        light.directional = {};
      }
      var directionalLight = light.directional;

      if (!defined(directionalLight.color)) {
        directionalLight.color = [1.0, 1.0, 1.0];
      }
    } else if (light.type === "point") {
      if (!defined(light.point)) {
        light.point = {};
      }
      var pointLight = light.point;

      if (!defined(pointLight.color)) {
        pointLight.color = [1.0, 1.0, 1.0];
      }

      pointLight.constantAttenuation = defaultValue(
        pointLight.constantAttenuation,
        1.0
      );
      pointLight.linearAttenuation = defaultValue(
        pointLight.linearAttenuation,
        0.0
      );
      pointLight.quadraticAttenuation = defaultValue(
        pointLight.quadraticAttenuation,
        0.0
      );
    } else if (light.type === "spot") {
      if (!defined(light.spot)) {
        light.spot = {};
      }
      var spotLight = light.spot;

      if (!defined(spotLight.color)) {
        spotLight.color = [1.0, 1.0, 1.0];
      }

      spotLight.constantAttenuation = defaultValue(
        spotLight.constantAttenuation,
        1.0
      );
      spotLight.fallOffAngle = defaultValue(spotLight.fallOffAngle, 3.14159265);
      spotLight.fallOffExponent = defaultValue(spotLight.fallOffExponent, 0.0);
      spotLight.linearAttenuation = defaultValue(
        spotLight.linearAttenuation,
        0.0
      );
      spotLight.quadraticAttenuation = defaultValue(
        spotLight.quadraticAttenuation,
        0.0
      );
    }
  }
}
export default processModelMaterialsCommon;
