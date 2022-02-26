import ShaderSource from "../Renderer/ShaderSource.js";

/**
 * @private
 *
 * Support for rendering things on only one side of the screen.
 */
const Splitter = {
  /**
   * Given a fragment shader string, returns a modified version of it that
   * only renders on one side of the screen or the other. Fragments on the
   * other side are discarded. The screen side is given by a uniform called
   * `czm_splitDirection`, which can be added by calling
   * {@link Splitter#addUniforms}, and the split position is given by an
   * automatic uniform called `czm_imagerySplitPosition`.
   */
  modifyFragmentShader: function modifyFragmentShader(shader) {
    // TODO: rename czm_imagerySplitPosition to czm_splitPosition.
    shader = ShaderSource.replaceMain(shader, "czm_splitter_main");
    shader +=
      //"uniform float czm_splitPosition; \n" +
      "uniform float czm_splitDirection; \n" +
      "void main() \n" +
      "{ \n" +
      "    if (czm_splitDirection < 0.0 && gl_FragCoord.x > czm_imagerySplitPosition) discard; \n" +
      "    if (czm_splitDirection > 0.0 && gl_FragCoord.x < czm_imagerySplitPosition) discard; \n" +
      "    czm_splitter_main(); \n" +
      "} \n";

    return shader;
  },

  /**
   * Add `czm_splitDirection` to the given uniform map.
   *
   * @param {Object} object The object on which the `splitDirection` property may be found.
   * @param {Object} uniformMap The uniform map.
   */
  addUniforms: function addUniforms(object, uniformMap) {
    uniformMap.czm_splitDirection = function () {
      return object.splitDirection;
    };
  },
};

export default Splitter;
