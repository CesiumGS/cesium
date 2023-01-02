import ForEach from "./ForEach.js";
import removeExtensionsUsed from "./removeExtensionsUsed.js";
import defined from "../../Core/defined.js";

/**
 * Removes an extension from gltf.extensions, gltf.extensionsUsed, gltf.extensionsRequired, and any other objects in the glTF if it is present.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {String} extension The extension to remove.
 *
 * @returns {*} The extension data removed from gltf.extensions.
 */
function removeExtension(gltf, extension) {
  removeExtensionsUsed(gltf, extension); // Also removes from extensionsRequired

  if (extension === "CESIUM_RTC") {
    removeCesiumRTC(gltf);
  }

  return removeExtensionAndTraverse(gltf, extension);
}

function removeCesiumRTC(gltf) {
  ForEach.technique(gltf, function (technique) {
    ForEach.techniqueUniform(technique, function (uniform) {
      if (uniform.semantic === "CESIUM_RTC_MODELVIEW") {
        uniform.semantic = "MODELVIEW";
      }
    });
  });
}

function removeExtensionAndTraverse(object, extension) {
  if (Array.isArray(object)) {
    const length = object.length;
    for (let i = 0; i < length; ++i) {
      removeExtensionAndTraverse(object[i], extension);
    }
  } else if (
    object !== null &&
    typeof object === "object" &&
    object.constructor === Object
  ) {
    const extensions = object.extensions;
    let extensionData;
    if (defined(extensions)) {
      extensionData = extensions[extension];
      if (defined(extensionData)) {
        delete extensions[extension];
        if (Object.keys(extensions).length === 0) {
          delete object.extensions;
        }
      }
    }
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        removeExtensionAndTraverse(object[key], extension);
      }
    }
    return extensionData;
  }
}

export default removeExtension;
