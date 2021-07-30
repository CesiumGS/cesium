import ForEach from "./ForEach.js";
import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";

/**
 * Calls the provider handler function on each texture used by the material.
 * Mimics the behavior of functions in gltf-pipeline ForEach.
 * @param {Object} material The glTF material.
 * @param {forEachTextureInMaterial~handler} handler Function that is called for each texture in the material.
 *
 * @private
 */
function forEachTextureInMaterial(material, handler) {
  Check.typeOf.object("material", material);
  Check.defined("handler", handler);

  // Metallic roughness
  var pbrMetallicRoughness = material.pbrMetallicRoughness;
  if (defined(pbrMetallicRoughness)) {
    if (defined(pbrMetallicRoughness.baseColorTexture)) {
      var textureInfo = pbrMetallicRoughness.baseColorTexture;
      var value = handler(textureInfo.index, textureInfo);
      if (defined(value)) {
        return value;
      }
    }
    if (defined(pbrMetallicRoughness.metallicRoughnessTexture)) {
      var textureInfo = pbrMetallicRoughness.metallicRoughnessTexture;
      var value = handler(textureInfo.index, textureInfo);
      if (defined(value)) {
        return value;
      }
    }
  }

  if (defined(material.extensions)) {
    // Spec gloss extension
    var pbrSpecularGlossiness =
      material.extensions.KHR_materials_pbrSpecularGlossiness;
    if (defined(pbrSpecularGlossiness)) {
      if (defined(pbrSpecularGlossiness.diffuseTexture)) {
        var textureInfo = pbrSpecularGlossiness.diffuseTexture;
        var value = handler(textureInfo.index, textureInfo);
        if (defined(value)) {
          return value;
        }
      }
      if (defined(pbrSpecularGlossiness.specularGlossinessTexture)) {
        var textureInfo = pbrSpecularGlossiness.specularGlossinessTexture;
        var value = handler(textureInfo.index, textureInfo);
        if (defined(value)) {
          return value;
        }
      }
    }

    // Materials common extension (may be present in models converted from glTF 1.0)
    var materialsCommon = material.extensions.KHR_materials_common;
    if (defined(materialsCommon)) {
      var diffuse = materialsCommon.values.diffuse;
      var ambient = materialsCommon.values.ambient;
      var emission = materialsCommon.values.emission;
      var specular = materialsCommon.values.specular;
      if (defined(diffuse) && defined(diffuse.index)) {
        var value = handler(diffuse.index, diffuse);
        if (defined(value)) {
          return value;
        }
      }
      if (defined(ambient) && defined(ambient.index)) {
        var value = handler(ambient.index, ambient);
        if (defined(value)) {
          return value;
        }
      }
      if (defined(emission) && defined(emission.index)) {
        var value = handler(emission.index, emission);
        if (defined(value)) {
          return value;
        }
      }
      if (defined(specular) && defined(specular.index)) {
        var value = handler(specular.index, specular);
        if (defined(value)) {
          return value;
        }
      }
    }
  }

  // KHR_techniques_webgl extension
  var value = ForEach.materialValue(material, function (materialValue) {
    if (defined(materialValue.index)) {
      var value = handler(materialValue.index, materialValue);
      if (defined(value)) {
        return value;
      }
    }
  });
  if (defined(value)) {
    return value;
  }

  // Top level textures
  if (defined(material.emissiveTexture)) {
    var textureInfo = material.emissiveTexture;
    var value = handler(textureInfo.index, textureInfo);
    if (defined(value)) {
      return value;
    }
  }

  if (defined(material.normalTexture)) {
    var textureInfo = material.normalTexture;
    var value = handler(textureInfo.index, textureInfo);
    if (defined(value)) {
      return value;
    }
  }

  if (defined(material.occlusionTexture)) {
    var textureInfo = material.occlusionTexture;
    var value = handler(textureInfo.index, textureInfo);
    if (defined(value)) {
      return value;
    }
  }
}

/**
 * Function that is called for each texture in the material. If this function returns a value the for each stops and returns that value.
 * @callback forEachTextureInMaterial~handler
 * @param {Number} The texture index.
 * @param {Object} The texture info object.
 *
 * @private
 */

export default forEachTextureInMaterial;
