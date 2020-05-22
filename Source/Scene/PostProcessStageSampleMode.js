/**
 * Determines how input texture to a {@link PostProcessStage} is sampled.
 * <p>
 *  后期处理阶段（{@link PostProcessStage}）纹理采样的方式。
 * </p>
 * <p>
 *  参考：{@link https://learnopengl-cn.readthedocs.io/zh/latest/01%20Getting%20started/06%20Textures/ 纹理}
 * </p>
 *
 * @exports PostProcessStageSampleMode
 */
var PostProcessStageSampleMode = {
  /**
   * Samples the texture by returning the closest texel.
   * <br/> 选择中心点最接近纹理坐标的那个纹理像素（texel）。
   * @type {Number}
   * @constant
   */
  NEAREST: 0,
  /**
   * Samples the texture through bi-linear interpolation of the four nearest texels.
   * <br/> 选择纹理坐标附近的四个纹理像素（texels）进行双线性插值，计算出一个插值，近似出这些纹理像素间的颜色。
   * @type {Number}
   * @constant
   */
  LINEAR: 1,
};
export default PostProcessStageSampleMode;
