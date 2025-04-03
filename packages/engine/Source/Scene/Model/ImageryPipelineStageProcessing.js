import Cartesian4 from "../../Core/Cartesian4.js";
import defined from "../../Core/defined.js";
import PixelFormat from "../../Core/PixelFormat.js";
import Rectangle from "../../Core/Rectangle.js";

import Texture from "../../Renderer/Texture.js";

import ModelImageryMapping from "./ModelImageryMapping.js";
import ImageryLayerCollection from "../ImageryLayerCollection.js";
import Check from "../../Core/Check.js";

const nativeBoundingRectangleScratch = new Rectangle();
const nativeImageryRectangleScratch = new Rectangle();

/**
 * TODO_DRAPING A preliminary class to carve out what has to be done
 * to process an <code>ImageryPipelineStage</code>. While this
 * currently operates on the level of the primitive, it might
 * require model-level information in the future.
 */
class ImageryPipelineStageProcessing {
  /**
   * TODO_DRAPING Preliminary entry point for executing the imagery pipeline stage.
   *
   * @param {Model} model
   * @param {ModelComponents.Primitive} runtimePrimitive
   * @param {PrimitiveRenderResources} primitiveRenderResources
   * @param {imageryPipelineStage} imageryPipelineStage
   * @param {FrameState} frameState
   * @returns
   */
  static processImageryPipelineStage(
    model,
    runtimePrimitive,
    primitiveRenderResources,
    imageryPipelineStage,
    frameState,
  ) {
    console.log("TODO_DRAPING: Special handling for ImageryPipelineStage");

    // XXX_DRAPING Check and ensure this sensibly
    const modelPrimitiveImagery = runtimePrimitive.modelPrimitiveImagery;
    console.log("XXX_DRAPING modelPrimitiveImagery is ", modelPrimitiveImagery);
    if (!modelPrimitiveImagery.ready) {
      console.error(
        "XXX_DRAPING: The modelPrimitiveImagery is not ready. This should not happen here...",
      );
      return;
    }

    // XXX_DRAPING Only using the first imagery layer here!
    const imageryLayers = new ImageryLayerCollection();
    const allImageryLayers = model.imageryLayers;
    imageryLayers.add(allImageryLayers.get(0));

    // Create one texture coordinate attribute for each distinct
    // projection that is used in the imagery layers
    ImageryPipelineStageProcessing._createImageryTexCoordAttributes(
      imageryLayers,
      modelPrimitiveImagery,
      primitiveRenderResources,
      frameState.context,
    );

    // Create the `ImageryInput` objects that describe the
    // textures, texture coordinate rectangles, and their
    // translation and scale, to be passed to the actual
    // imagery pipeline stage execution
    const imageryInputs = ImageryPipelineStageProcessing._createImageryInputs(
      imageryLayers,
      modelPrimitiveImagery,
    );

    // XXX_DRAPING See how to handle that limit..
    if (imageryInputs.length > 10) {
      console.error(
        `XXX_DRAPING Found ${imageryInputs.length} texture units, truncating`,
      );
      imageryInputs.length = 10;
    }

    imageryPipelineStage.process(
      primitiveRenderResources,
      imageryInputs,
      frameState,
    );
  }

  /**
   * Create the `ImageryInput` objects that have to be fed to the imagery
   * pipeline stage for draping the given imagery layers over the primitive
   * that is described by the given model primitive imagery.
   *
   * This will obtain the `ImageryCoverage` objects that are provided by
   * the given model primitive imagery (and that describe the imagery tiles
   * that are covered by the primitive), and create one `ImageryInput` for
   * each of them.
   *
   * @param {ImageryLayerCollection} imageryLayers The imagery layers
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery The model primitive imagery
   * @returns {ImageryInput[]} The imagery inputs
   * @private
   */
  static _createImageryInputs(imageryLayers, modelPrimitiveImagery) {
    const imageryInputs = [];

    for (let i = 0; i < imageryLayers.length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const mappedPositions =
        modelPrimitiveImagery.mappedPositionsForImageryLayer(imageryLayer);
      const cartographicBoundingRectangle =
        mappedPositions.cartographicBoundingRectangle;

      const coverages =
        modelPrimitiveImagery.coveragesForImageryLayer(imageryLayer);

      for (let j = 0; j < coverages.length; j++) {
        const coverage = coverages[j];
        console.log(`coverage ${j} `, coverage);
        const imageryInput = ImageryPipelineStageProcessing._createImageryInput(
          imageryLayer,
          coverage,
          cartographicBoundingRectangle,
        );
        imageryInputs.push(imageryInput);
      }
    }

    // XXX_DRAPING
    /*/
    if (imageryInputs.length > 1) {
      console.log("XXX_DRAPING Using only a single input!");
      return [imageryInputs[1]];
    }
    //*/
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
   * @returns {ImageryInput} The imagery input
   * @private
   */
  static _createImageryInput(
    imageryLayer,
    coverage,
    cartographicBoundingRectangle,
  ) {
    const imagery = imageryLayer.getImageryFromCache(
      coverage.x,
      coverage.y,
      coverage.level,
    );
    if (!defined(imagery.textureWebMercator)) {
      console.log("XXX_DRAPING: Imagery does not have textureWebMercator");
    }
    const textureTranslationAndScale =
      ImageryPipelineStageProcessing._computeTextureTranslationAndScale(
        imageryLayer,
        cartographicBoundingRectangle,
        imagery.rectangle,
      );

    const texture = imagery.textureWebMercator;
    const textureCoordinateRectangle = coverage.texCoordsRectangle;

    console.log(`textureTranslationAndScale `, textureTranslationAndScale);
    console.log(`textureCoordinateRectangle `, textureCoordinateRectangle);

    const imageryInput = {
      imageryLayer: imageryLayer,
      texture: texture,
      textureTranslationAndScale: textureTranslationAndScale,
      textureCoordinateRectangle: textureCoordinateRectangle,

      // XXX_DRAPING
      texCoordIndex: 0,
      numTexCoords: 1,
    };
    return imageryInput;
  }

  /**
   * Create texture coordinates in the given primitive render resources,
   * one for each projection that appears in the given imagery layers.
   *
   * This will determine the unique set of projections that are used
   * in the imagery layers, create a texture coordinate attribute for
   * each of them using `_computeImageryTexCoordAttribute`, and add
   * this to the given primitive render resources.
   *
   * @param {ImageryLayerCollection} imageryLayers The imagery layer collection
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery The model primitive imagery
   * @param {PrimitiveRenderResources} primitiveRenderResources The primitive
   * render resources
   * @param {Context} context The GL context
   * @private
   */
  static _createImageryTexCoordAttributes(
    imageryLayers,
    modelPrimitiveImagery,
    primitiveRenderResources,
    context,
  ) {
    // Compute the UNIQUE projections that appear in the imagery layers
    const uniqueProjections =
      ImageryPipelineStageProcessing._computeUniqueProjections(imageryLayers);
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
        ImageryPipelineStageProcessing._computeImageryTexCoordAttribute(
          mappedPositions,
          projection,
          context,
        );

      const index = primitiveRenderResources.attributes.length;
      imageryTexCoordAttribute.index = index;
      primitiveRenderResources.attributes[index] = imageryTexCoordAttribute;
    }
  }

  /**
   * Compute a texture coordinate attribute for the given mapped
   * primitive positions, under the given projection.
   *
   * This will project the cartographic positions with the given
   * projection, and create texture coordinates that are relative
   * to the bounding rectangle of the mapped positions.
   *
   * TODO_DRAPING Maybe add details, or point to the functions
   * that are used for this....
   *
   * @param {MappedPositions} mappedPositions The mapped positions
   * @param {WebProjection} projection The projection
   * @param {Context} context The GL context
   * @return {ModelComponents.Attribute} The attribute
   * @private
   */
  static _computeImageryTexCoordAttribute(
    mappedPositions,
    projection,
    context,
  ) {
    const cartographicPositions = mappedPositions.cartographicPositions;
    const cartographicBoundingRectangle =
      mappedPositions.cartographicBoundingRectangle;
    const numPositions = mappedPositions.numPositions;

    // Compute the texture coordinate attribute from
    // the cartographic primitive positions
    const imageryTexCoordAttribute =
      ModelImageryMapping.createTextureCoordinatesAttribute(
        cartographicPositions,
        numPositions,
        cartographicBoundingRectangle,
        projection,
        context,
      );
    return imageryTexCoordAttribute;
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
   * `_computeImageryTexCoordAttribute`. In the shader, this offset
   * and scale will map the given imagery rectangle to the geometry
   * rectangle.
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
   * Computes an array containing the <i>unique</i> projections that
   * appear in the imagery layers of the given collection.
   *
   * @param {ImageryLayerCollection} imageryLayers
   * @returns {MapProjection[]} The projections
   * @private
   */
  static _computeUniqueProjections(imageryLayers) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayers", imageryLayers);
    //>>includeEnd('debug');

    const projectionsSet = new Set();
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const projection =
        ImageryPipelineStageProcessing._getProjection(imageryLayer);
      projectionsSet.add(projection);
    }
    return [...projectionsSet];
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
