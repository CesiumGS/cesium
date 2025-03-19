import Cartesian4 from "../../Core/Cartesian4.js";
import Matrix4 from "../../Core/Matrix4.js";
import PixelFormat from "../../Core/PixelFormat.js";

import Texture from "../../Renderer/Texture.js";

import ModelImageryMapping from "./ModelImageryMapping.js";

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
   * @param {ModelSceneGraph} modelSceneGraph
   * @param {Model} model
   * @param {PrimitiveRenderResources} primitiveRenderResources
   * @param {imageryPipelineStage} imageryPipelineStage
   * @param {FrameState} frameState
   * @returns
   */
  static processImageryPipelineStage(
    modelSceneGraph,
    model,
    primitiveRenderResources,
    imageryPipelineStage,
    frameState,
  ) {
    console.log("TODO_DRAPING: Special handling for ImageryPipelineStage");
    const imageryLayers = model.imageryLayers;
    const imageryLayer = imageryLayers.get(0);

    // Are we there yet?
    if (!imageryLayer.ready) {
      console.log("TODO_DRAPING Imagery layer is not ready");
      return;
    }

    // Compute the transform that apparently has to be applied to
    // the positions, based on the computation of the bounding
    // sphere that is done at the end of buildDrawCommands
    const primitivePositionsTransform = Matrix4.clone(Matrix4.IDENTITY);
    Matrix4.multiply(
      primitivePositionsTransform,
      model.modelMatrix,
      primitivePositionsTransform,
    );
    Matrix4.multiply(
      primitivePositionsTransform,
      modelSceneGraph._components.transform,
      primitivePositionsTransform,
    );
    Matrix4.multiply(
      primitivePositionsTransform,
      modelSceneGraph._axisCorrectionMatrix,
      primitivePositionsTransform,
    );

    // TODO_DRAPING Using hard-wired indices,
    // private variable access...
    const primitivePositionsAttribute = primitiveRenderResources.attributes[0];
    const imageryProvider = imageryLayer._imageryProvider;
    const projection = imageryProvider.tilingScheme.projection;

    // Compute the texture coordinate attribute for the
    // render resources from the primitive positions
    const imageryTexCoordAttribute =
      ModelImageryMapping.createTextureCoordinatesAttribute(
        primitivePositionsAttribute,
        primitivePositionsTransform,
        projection,
        frameState.context,
      );

    // XXX_DRAPING Using hard-wired indices: The texture coordinates
    // are currently REPLACING (!) the original texture coordinates!
    imageryTexCoordAttribute.index = 2;
    primitiveRenderResources.attributes[2] = imageryTexCoordAttribute;

    // Create the preliminary input for the imagery pipeline stage
    let texture;
    const imagery = imageryLayer.getImageryFromCache(0, 0, 0);
    if (imagery.texture) {
      console.log("TODO_DRAPING: Using actual imagery texture");
      texture = imagery.texture;
    } else {
      console.log("TODO_DRAPING: Creating dummy texture");
      texture = ImageryPipelineStageProcessing.createDummyTexture(
        frameState.context,
      );
    }

    // TODO_DRAPING The scale/rectangle processing will have to
    // do something like "ImageryLayer._calculateTextureTranslationAndScale",
    // but without the "tile":

    const imageryTextureTexCoordIndex = 0;
    const imageryInput = {
      imageryLayer: imageryLayer,
      texture: texture,
      useWebMercator: false,
      textureTranslationAndScale: new Cartesian4(0, 0, 1, 1),
      textureCoordinateRectangle: new Cartesian4(0, 0, 1, 1),
      texCoordIndex: imageryTextureTexCoordIndex,
    };
    const imageryInputs = [imageryInput];

    imageryPipelineStage.process(
      primitiveRenderResources,
      imageryInputs,
      frameState,
    );
  }

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
