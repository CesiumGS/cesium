/**
 * Repeats a block of specs in Webgl1 and Webgl2, if supported
 * @param {createSpecCallback} createSpecs
 */
export default function createWebglVersionHelper(createSpecs) {
  describe("with WebGL 1", function () {
    createSpecs({
      requestWebgl1: true,
    });
  });

  describe("with WebGL 2", function () {
    // Don't repeat tests unless WebGL 2 is supported
    if (typeof WebGL2RenderingContext !== "undefined") {
      createSpecs();
    }
  });
}

/**
 * @callback createSpecCallback
 *
 * @param {ContextOptions} [contextOptions] options used to initialize context
 *
 */
