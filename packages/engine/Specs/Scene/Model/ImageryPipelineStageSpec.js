import {
  defined,
  ResourceCache,
  ShaderBuilder,
  ImageryPipelineStage,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import loadTilesetWithImagery from "../../../../../Specs/loadTilesetWithImagery.js";

describe("Scene/Model/ImageryPipelineStage", function () {
  let scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    scene.primitives.removeAll();
    ResourceCache.clearForSpecs();
  });

  // A mock `FrameState` object, extracted from other specs, for
  // the ImageryPipelineStage.process call
  const mockFrameState = {
    context: {
      defaultTexture: {},
      defaultNormalTexture: {},
      defaultEmissiveTexture: {},
    },
  };

  // Create a mock `PrimitiveRenderResources` object, extracted from
  // other specs, for the ImageryPipelineStage.process call
  function mockRenderResources(model, primitive) {
    const count = defined(primitive.indices)
      ? primitive.indices.count
      : primitive.attributes[0].count;

    return {
      attributes: [],
      shaderBuilder: new ShaderBuilder(),
      attributeIndex: 1,
      count: count,
      model: model,
      runtimeNode: {
        node: {},
      },
      uniformMap: {},
      runtimePrimitive: {},
    };
  }

  it("does not create imagery inputs for imagery layers that are not shown", async function () {
    // The prerequisites for computing the imagery inputs are not
    // met without a GL context: The "mappedPositions" cannot be
    // computed without fetching the primitive POSITION data from
    // the GPU
    if (!scene.context.webgl2) {
      return;
    }

    // Part of a "regression test" test against https://github.com/CesiumGS/cesium/issues/12742
    const tileset = await loadTilesetWithImagery(scene);

    // Drill a hole through the loaded structures and create some
    // mock data for the ImageryPipelineStage.process call
    const imageryLayers = tileset.imageryLayers;
    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImagery = modelImagery._modelPrimitiveImageries[0];
    const primitive = model.sceneGraph.components.nodes[0].primitives[0];
    const primitiveRenderResources = mockRenderResources(model, primitive);
    const imageryTexCoordAttributeSetIndices = [0];
    const frameState = mockFrameState;
    ImageryPipelineStage.process(
      primitiveRenderResources,
      primitive,
      frameState,
    );

    // Initially, the imagery layers are visible, as of show===true,
    // and there should be at least one ImageryInput be generated
    // to be sent to the shader
    const imageryInputsA = ImageryPipelineStage._createImageryInputs(
      imageryLayers,
      modelPrimitiveImagery,
      imageryTexCoordAttributeSetIndices,
    );
    expect(imageryInputsA.length).not.toBe(0);

    // For specs: Hide the imagery layer by setting show = false
    imageryLayers.get(0).show = false;

    // No more ImageryInput objects should be generated now
    const imageryInputsB = ImageryPipelineStage._createImageryInputs(
      imageryLayers,
      modelPrimitiveImagery,
      imageryTexCoordAttributeSetIndices,
    );
    expect(imageryInputsB.length).toBe(0);
  });
});
