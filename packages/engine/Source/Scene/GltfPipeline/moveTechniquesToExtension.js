import addExtensionsUsed from "./addExtensionsUsed.js";
import addExtensionsRequired from "./addExtensionsRequired.js";
import addToArray from "./addToArray.js";
import ForEach from "./ForEach.js";
import defined from "../../Core/defined.js";

/**
 * Move glTF 1.0 material techniques to glTF 2.0 KHR_techniques_webgl extension.
 *
 * @param {object} gltf A javascript object containing a glTF asset.
 * @returns {object} The updated glTF asset.
 *
 * @private
 */
function moveTechniquesToExtension(gltf) {
  const techniquesLegacy = gltf.techniques;
  const mappedUniforms = {};
  const updatedTechniqueIndices = {};
  const seenPrograms = {};
  if (defined(techniquesLegacy)) {
    const extension = {
      programs: [],
      shaders: [],
      techniques: [],
    };

    // Some 1.1 models have a glExtensionsUsed property that can be transferred to program.glExtensions
    const glExtensions = gltf.glExtensionsUsed;
    delete gltf.glExtensionsUsed;

    ForEach.technique(gltf, function (techniqueLegacy, techniqueId) {
      const technique = {
        name: techniqueLegacy.name,
        program: undefined,
        attributes: {},
        uniforms: {},
      };

      let parameterLegacy;
      ForEach.techniqueAttribute(
        techniqueLegacy,
        function (parameterName, attributeName) {
          parameterLegacy = techniqueLegacy.parameters[parameterName];
          technique.attributes[attributeName] = {
            semantic: parameterLegacy.semantic,
          };
        },
      );

      ForEach.techniqueUniform(
        techniqueLegacy,
        function (parameterName, uniformName) {
          parameterLegacy = techniqueLegacy.parameters[parameterName];
          technique.uniforms[uniformName] = {
            count: parameterLegacy.count,
            node: parameterLegacy.node,
            type: parameterLegacy.type,
            semantic: parameterLegacy.semantic,
            value: parameterLegacy.value,
          };

          // Store the name of the uniform to update material values.
          if (!defined(mappedUniforms[techniqueId])) {
            mappedUniforms[techniqueId] = {};
          }
          mappedUniforms[techniqueId][parameterName] = uniformName;
        },
      );

      if (!defined(seenPrograms[techniqueLegacy.program])) {
        const programLegacy = gltf.programs[techniqueLegacy.program];

        const program = {
          name: programLegacy.name,
          fragmentShader: undefined,
          vertexShader: undefined,
          glExtensions: glExtensions,
        };

        const fs = gltf.shaders[programLegacy.fragmentShader];
        program.fragmentShader = addToArray(extension.shaders, fs, true);

        const vs = gltf.shaders[programLegacy.vertexShader];
        program.vertexShader = addToArray(extension.shaders, vs, true);

        technique.program = addToArray(extension.programs, program);
        seenPrograms[techniqueLegacy.program] = technique.program;
      } else {
        technique.program = seenPrograms[techniqueLegacy.program];
      }

      // Store the index of the new technique to reference instead.
      updatedTechniqueIndices[techniqueId] = addToArray(
        extension.techniques,
        technique,
      );
    });

    if (extension.techniques.length > 0) {
      if (!defined(gltf.extensions)) {
        gltf.extensions = {};
      }

      gltf.extensions.KHR_techniques_webgl = extension;
      addExtensionsUsed(gltf, "KHR_techniques_webgl");
      addExtensionsRequired(gltf, "KHR_techniques_webgl");
    }
  }

  ForEach.material(gltf, function (material) {
    if (defined(material.technique)) {
      const materialExtension = {
        technique: updatedTechniqueIndices[material.technique],
      };

      ForEach.objectLegacy(material.values, function (value, parameterName) {
        if (!defined(materialExtension.values)) {
          materialExtension.values = {};
        }

        const uniformName = mappedUniforms[material.technique][parameterName];
        if (defined(uniformName)) {
          materialExtension.values[uniformName] = value;
        }
      });

      if (!defined(material.extensions)) {
        material.extensions = {};
      }

      material.extensions.KHR_techniques_webgl = materialExtension;
    }

    delete material.technique;
    delete material.values;
  });

  delete gltf.techniques;
  delete gltf.programs;
  delete gltf.shaders;

  return gltf;
}

export default moveTechniquesToExtension;
