import Cartesian4 from "../../Core/Cartesian4.js";
import defined from "../../Core/defined.js";
import PixelFormat from "../../Core/PixelFormat.js";
import Rectangle from "../../Core/Rectangle.js";

import Texture from "../../Renderer/Texture.js";

import ModelImageryMapping from "./ModelImageryMapping.js";
import Check from "../../Core/Check.js";
import ImageryInput from "./ImageryInput.js";

const nativeBoundingRectangleScratch = new Rectangle();
const nativeImageryRectangleScratch = new Rectangle();

/**
 * Functions for processing information about the imagery that is
 * draped over a model, to create the data that is required in the
 * <code>ImageryPipelineStage</code>.
 *
 * The main functionalities are:
 * - Creating the texture coordinate attributes that have to be
 *   added to the primitive, for rendering the draped imagery
 *   textures, with, _createImageryTexCoordAttributes
 * - Creating the <code>ImageryInput</code> objects that are
 *   passed to the shader, and that contain information about
 *   the exact textures (and their extents in terms of texture
 *   coordinates), with _createImageryInputs
 *
 * TODO_DRAPING: Some (if not all) of these functions could be
 * moved directly into the <code>ImageryPipelineStage</code>
 */
class ImageryPipelineStageProcessing {
  /**
   * Create the <code>ImageryInput</code> objects that have to be fed to the imagery
   * pipeline stage for draping the given imagery layers over the primitive
   * that is described by the given model primitive imagery.
   *
   * This will obtain the <code>ImageryCoverage</code> objects that are provided by
   * the given model primitive imagery (and that describe the imagery tiles
   * that are covered by the primitive), and create one <code>ImageryInput</code> for
   * each of them.
   *
   * @param {ImageryLayerCollection} imageryLayers The imagery layers
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery The model primitive imagery
   * @param {number[]} imageryTexCoordAttributeSetIndices The array that contains,
   * for each imagery layer index, the set index of the texture coordinate
   * attribute that should be used for this imagery. This is the value that
   * will be used to access the texture coordinate attribute
   * <code>a_imagery_texCoord_${imageryTexCoordAttributeSetIndex}</code>
   * in the shader.
   * @returns {ImageryInput[]} The imagery inputs
   */
  static _createImageryInputs(
    imageryLayers,
    modelPrimitiveImagery,
    imageryTexCoordAttributeSetIndices,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayers", imageryLayers);
    Check.defined("modelPrimitiveImagery", modelPrimitiveImagery);
    Check.defined(
      "imageryTexCoordAttributeSetIndices",
      imageryTexCoordAttributeSetIndices,
    );
    //>>includeEnd('debug');

    const imageryInputs = [];

    for (let i = 0; i < imageryLayers.length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const imageryTexCoordAttributeSetIndex =
        imageryTexCoordAttributeSetIndices[i];
      const mappedPositions =
        modelPrimitiveImagery.mappedPositionsForImageryLayer(imageryLayer);
      const cartographicBoundingRectangle =
        mappedPositions.cartographicBoundingRectangle;
      const coverages =
        modelPrimitiveImagery.coveragesForImageryLayer(imageryLayer);

      for (let j = 0; j < coverages.length; j++) {
        const coverage = coverages[j];

        // XXX_DRAPING Debug log
        //console.log(`coverage ${j} `, coverage);

        const imageryInput = ImageryPipelineStageProcessing._createImageryInput(
          imageryLayer,
          coverage,
          cartographicBoundingRectangle,
          imageryTexCoordAttributeSetIndex,
        );
        imageryInputs.push(imageryInput);
      }
    }
    return imageryInputs;
  }

  /**
   * Create the `ImageryInput` that has to be passed to the imagery pipeline
   * stage, for the given `ImageryCoverage`.
   *
   * The `ImageryCoverage` describes on imagery tile that is covered by the
   * cartographic bounding rectangle of the primitive positions. This function
   * obtains the actual `Imagery` object and its texture, computes the
   * required texture coordinate and scale, and assembles this information
   * into an `ImageryInput`.
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {ImageryCoverage} coverage The imagery coverage
   * @param {Rectangle} cartographicBoundingRectangle The bounding rectangle
   * of the cartographic primitive positions
   * @param {number} imageryTexCoordAttributeSetIndex The set index of the
   * texture coordinate attribute that should be used for this imagery.
   * This is the value that will be used to access the texture coordinate
   * attribute <code>a_imagery_texCoord_${imageryTexCoordAttributeSetIndex}</code>
   * in the shader.
   * @returns {ImageryInput} The imagery input
   * @private
   */
  static _createImageryInput(
    imageryLayer,
    coverage,
    cartographicBoundingRectangle,
    imageryTexCoordAttributeSetIndex,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayer", imageryLayer);
    Check.defined("coverage", coverage);
    Check.defined(
      "cartographicBoundingRectangle",
      cartographicBoundingRectangle,
    );
    Check.typeOf.number.greaterThanOrEquals(
      "imageryTexCoordAttributeSetIndex",
      imageryTexCoordAttributeSetIndex,
      0,
    );
    //>>includeEnd('debug');

    const imagery = imageryLayer.getImageryFromCache(
      coverage.x,
      coverage.y,
      coverage.level,
    );

    // TODO_DRAPING See how to handle this. Just fall back to "imagery.texture"?
    const texture = imagery.textureWebMercator;
    if (!defined(texture)) {
      console.log("XXX_DRAPING: Imagery does not have textureWebMercator");
    }

    // XXX_DRAPING Debug log
    /*/
    function rectangleToString(r) {
      return `new Cesium.Rectangle(${r.west}, ${r.south}, ${r.east}, ${r.north}); // WSEN`;
    }
    console.log("cartographicBoundingRectangle ", rectangleToString(cartographicBoundingRectangle));
    console.log("imagery.rectangle ", rectangleToString(imagery.rectangle));
    //*/
    const textureTranslationAndScale =
      ImageryPipelineStageProcessing._computeTextureTranslationAndScale(
        imageryLayer,
        cartographicBoundingRectangle,
        imagery.rectangle,
      );

    const textureCoordinateRectangle = coverage.textureCoordinateRectangle;

    // XXX_DRAPING Debug log
    //console.log(`textureTranslationAndScale `, textureTranslationAndScale);
    //console.log(`textureCoordinateRectangle `, textureCoordinateRectangle);

    const imageryInput = new ImageryInput(
      imageryLayer,
      texture,
      textureTranslationAndScale,
      textureCoordinateRectangle,
      imageryTexCoordAttributeSetIndex,
    );
    return imageryInput;
  }

  /**
   * Create texture coordinates in the given primitive render resources,
   * one for each projection.
   *
   * This will create a texture coordinate attribute for each of the given projections,
   * using <code>ModelImageryMapping.createTextureCoordinatesAttributeForMappedPositions</code>,
   * and  add this to the given primitive render resources.
   *
   * (This means that the given projections should indeed be unique,
   * i.e. contain no duplicates, as computed with
   * <code>_computeUniqueProjections</code>)
   *
   * @param {MapProjection[]} uniqueProjections The projections
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery The model primitive imagery
   * @param {PrimitiveRenderResources} primitiveRenderResources The primitive
   * render resources
   * @param {Context} context The GL context
   */
  static _createImageryTexCoordAttributes(
    uniqueProjections,
    modelPrimitiveImagery,
    primitiveRenderResources,
    context,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("uniqueProjections", uniqueProjections);
    Check.defined("modelPrimitiveImagery", modelPrimitiveImagery);
    Check.defined("primitiveRenderResources", primitiveRenderResources);
    Check.defined("context", context);
    //>>includeEnd('debug');

    const length = uniqueProjections.length;
    for (let i = 0; i < length; i++) {
      // Obtain the mapped positions for the ellipsoid that is used
      // in the projection (i.e. the cartographic positions of the
      // primitive, for the respective ellipsoid)
      const projection = uniqueProjections[i];
      const ellipsoid = projection.ellipsoid;
      const mappedPositions =
        modelPrimitiveImagery.mappedPositionsForEllipsoid(ellipsoid);

      // Create the actual attribute, and store it as the
      // last attribute of the primitive render resources
      const imageryTexCoordAttribute =
        ModelImageryMapping.createTextureCoordinatesAttributeForMappedPositions(
          mappedPositions,
          projection,
          context,
        );

      // XXX_DRAPING Why is this tracked like this?
      // It's just the number of attributes, right?
      primitiveRenderResources.attributeIndex++;

      const index = primitiveRenderResources.attributes.length;
      imageryTexCoordAttribute.index = index;
      primitiveRenderResources.attributes[index] = imageryTexCoordAttribute;
    }
  }

  /**
   * Compute the translation and scale that has to be applied to
   * the texture coordinates for mapping the given imagery to
   * the geometry.
   *
   * The given rectangles will be converted into their "native" representation,
   * using the tiling scheme of the given imagery layer, and passed
   * to `_computeTextureTranslationAndScaleFromNative` (see that for details).
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {Rectangle} nonNativeBoundingRectangle The bounding
   * rectangle of the geometry
   * @param {Rectangle} nonNativeImageryRectangle The bounding
   * rectangle of the imagery
   * @returns {Cartesian4} The translation and scale
   * @private
   */
  static _computeTextureTranslationAndScale(
    imageryLayer,
    nonNativeBoundingRectangle,
    nonNativeImageryRectangle,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayer", imageryLayer);
    Check.defined("nonNativeBoundingRectangle", nonNativeBoundingRectangle);
    Check.defined("nonNativeImageryRectangle", nonNativeImageryRectangle);
    //>>includeEnd('debug');

    const tilingScheme = imageryLayer.imageryProvider.tilingScheme;

    const nativeBoundingRectangle = tilingScheme.rectangleToNativeRectangle(
      nonNativeBoundingRectangle,
      nativeBoundingRectangleScratch,
    );
    const nativeImageryRectangle = tilingScheme.rectangleToNativeRectangle(
      nonNativeImageryRectangle,
      nativeImageryRectangleScratch,
    );

    const translationAndScale =
      ImageryPipelineStageProcessing._computeTextureTranslationAndScaleFromNative(
        nativeBoundingRectangle,
        nativeImageryRectangle,
      );
    return translationAndScale;
  }

  /**
   * Compute the translation and scale that has to be applied to
   * the texture coordinates for mapping the given imagery rectangle
   * to the geometry rectangle.
   *
   * This will compute a Cartesian4 containing the
   * (offsetX, offsetY, scaleX, scaleY) that have to be applied to
   * the texture coordinates that that have been computed with
   * `ModelImageryMapping.createTextureCoordinatesAttributeForMappedPositions`.
   * In the shader, this offset and scale will map the given imagery rectangle
   * to the geometry * rectangle.
   *
   * TODO_DRAPING Maybe add details, or point to ImageryLayer.js...
   *
   * @param {Imagery} imagery The imagery
   * @param {Rectangle} nonNativeBoundingRectangle The bounding
   * rectangle of the geometry
   * @param {Rectangle} nonNativeImageryRectangle The bounding
   * rectangle of the imagery
   * @returns {Cartesian4} The translation and scale
   * @private
   */
  static _computeTextureTranslationAndScaleFromNative(
    nativeBoundingRectangle,
    nativeImageryRectangle,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("nativeBoundingRectangle", nativeBoundingRectangle);
    Check.defined("nativeImageryRectangle", nativeImageryRectangle);
    //>>includeEnd('debug');

    const invImageryWidth = 1.0 / nativeImageryRectangle.width;
    const invImageryHeight = 1.0 / nativeImageryRectangle.height;
    const deltaWest =
      nativeBoundingRectangle.west - nativeImageryRectangle.west;
    const deltaSouth =
      nativeBoundingRectangle.south - nativeImageryRectangle.south;
    const offsetX = deltaWest * invImageryWidth;
    const offsetY = deltaSouth * invImageryHeight;
    const scaleX = nativeBoundingRectangle.width * invImageryWidth;
    const scaleY = nativeBoundingRectangle.height * invImageryHeight;
    return new Cartesian4(offsetX, offsetY, scaleX, scaleY);
  }

  /**
   * Computes an array containing the projections that are used in
   * the given imagery layers.
   *
   * (Note that this array may contain duplicates)
   *
   * @param {ImageryLayerCollection} imageryLayers The imagery layers
   * @returns {MapProjection[]} The projections
   * @private
   */
  static _extractProjections(imageryLayers) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayers", imageryLayers);
    //>>includeEnd('debug');

    const projections = [];
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const projection =
        ImageryPipelineStageProcessing._getProjection(imageryLayer);
      projections.push(projection);
    }
    return projections;
  }

  /**
   * Computes the index mapping from the given source to the given target.
   *
   * The result will be an array that has the same length as the source,
   * and contains the indices that the source elements have in the
   * target array.
   *
   * @param {object[]} source The source array
   * @param {object[]} target The target array
   * @returns {number[]} The result
   */
  static _computeIndexMapping(source, target) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("source", source);
    Check.defined("target", target);
    //>>includeEnd('debug');

    const result = [];
    const length = source.length;
    for (let i = 0; i < length; i++) {
      const element = source[i];
      const index = target.indexOf(element);
      result.push(index);
    }
    return result;
  }

  /**
   * Returns the projection of the given imagery layer.
   *
   * XXX_DRAPING This only exists to hide a train wreck
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @returns {MapProjection} The projection
   * @private
   */
  static _getProjection(imageryLayer) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayer", imageryLayer);
    //>>includeEnd('debug');
    const projection = imageryLayer.imageryProvider.tilingScheme.projection;
    return projection;
  }

  // XXX_DRAPING Currently unused
  static createDummyTexture(context) {
    const DUMMY_TEXTURE = new Texture({
      context: context,
      pixelFormat: PixelFormat.RGB,
      source: {
        width: 2,
        height: 2,
        arrayBufferView: new Uint8Array([
          255, 0, 0, 0, 255, 0, 255, 255, 0, 0, 0, 255,
        ]),
      },
      flipY: false,
    });
    return DUMMY_TEXTURE;
  }
}

export default ImageryPipelineStageProcessing;
