/**
 * An enum describing the type of motion that is defined by an articulation stage
 * in the AGI_articulations extension.
 *
 * @alias {ArticulationStageType}
 * @enum {string}
 *
 * @private
 */
const ArticulationStageType = {
  XTRANSLATE: "xTranslate",
  YTRANSLATE: "yTranslate",
  ZTRANSLATE: "zTranslate",
  XROTATE: "xRotate",
  YROTATE: "yRotate",
  ZROTATE: "zRotate",
  XSCALE: "xScale",
  YSCALE: "yScale",
  ZSCALE: "zScale",
  UNIFORMSCALE: "uniformScale",
};

export default Object.freeze(ArticulationStageType);
