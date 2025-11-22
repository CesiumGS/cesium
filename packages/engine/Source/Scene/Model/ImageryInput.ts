/**
 * A structure summarizing the input for the shader that is draping imagery
 * over 3D Tiles, as part of the <code>ImageryPipelineStage</code>.
 *
 * The <code>ImageryPipelineStage</code> receives the primitive, and their
 * <code>ModelPrimitiveImagery</code> objects. These objects provide the
 * <code>ImageryCoverage</code> information, indicating the set of imagery
 * tiles that are covered by the primitive.
 *
 * The <code>ImageryPipelineStage</code> uses the <code>ImageryCoverage</code>
 * to fetch the <code>Imagery</code> object and its texture for the (x, y, level)
 * of each coverage, computes the texture translation and scale, and the covered
 * texture coordinate rectangle of that imagery texture.
 *
 * This information is summarized in an instance of this class, to later
 * be passed to the shader via uniforms.
 *
 * @private
 */
class ImageryInput {
  /**
   * Creates a new instance
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {Texture} texture The texture from the imagery
   * @param {Cartesian4} textureTranslationAndScale The translation
   * and scale that have to be applied to the texture, to properly
   * be draped on the primitive. This is stored as a Cartesian4
   * with (x,y) being the translation and (z,w) being the scale.
   * It could be cleaner and clearer to store this as separate
   * Cartesian2 objects, but using a single Cartesian4 probably
   * was a design choice that was originally made in GlobeFS.glsl,
   * with the goal to have fewer uniforms
   * @param {Cartesian4} textureCoordinateRectangle The bounding
   * rectangle (in texture coordinates). This directly corresponds
   * to the <code>ImageryCoverage.textureCoordinateRectangle</code>,
   * but converted into a Cartesian4 for the consumption in the
   * shader
   * @param {number} imageryTexCoordAttributeSetIndex The "set index"
   * of the texture coordinate attribute that should be used. This
   * will be used to access the texture coordinate attribute
   * <code>a_imagery_texCoord_${imageryTexCoordAttributeSetIndex}</code>
   * in the shader.
   */
  constructor(
    imageryLayer,
    texture,
    textureTranslationAndScale,
    textureCoordinateRectangle,
    imageryTexCoordAttributeSetIndex,
  ) {
    this.imageryLayer = imageryLayer;
    this.texture = texture;
    this.textureTranslationAndScale = textureTranslationAndScale;
    this.textureCoordinateRectangle = textureCoordinateRectangle;
    this.imageryTexCoordAttributeSetIndex = imageryTexCoordAttributeSetIndex;
  }
}

export default ImageryInput;
