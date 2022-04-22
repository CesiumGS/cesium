import ShaderSource from "../Renderer/ShaderSource.js";

/**
 * Support for rendering things on only one side of the screen.
 *
 * @private
 */
const Splitter = {
  /**
   * Given a fragment shader string, returns a modified version of it that
   * only renders on one side of the screen or the other. Fragments on the
   * other side are discarded. The screen side is given by a uniform called
   * `czm_splitDirection`, which can be added by calling
   * {@link Splitter#addUniforms}, and the split position is given by an
   * automatic uniform called `czm_splitPosition`.
   */
  modifyFragmentShader: function modifyFragmentShader(shader) {
    shader = ShaderSource.replaceMain(shader, "czm_splitter_main");
    shader +=
      // czm_splitPosition is not declared because it is an automatic uniform.
      "uniform float czm_splitDirection; \n" +
      "void main() \n" +
      "{ \n" +
      // Don't split when rendering the shadow map, because it is rendered from
      // the perspective of a totally different camera.
      "#ifndef SHADOW_MAP\n" +
      "    if (czm_splitDirection < 0.0 && gl_FragCoord.x > czm_splitPosition) discard; \n" +
      "    if (czm_splitDirection > 0.0 && gl_FragCoord.x < czm_splitPosition) discard; \n" +
      "#endif\n" +
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
