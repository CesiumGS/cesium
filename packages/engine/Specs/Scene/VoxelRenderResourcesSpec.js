import { VoxelPrimitive, VoxelRenderResources } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/VoxelRenderResources", function () {
  let scene;

  beforeEach(function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  it("constructs", function () {
    const primitive = new VoxelPrimitive();
    primitive.show = false;
    primitive.update(scene.frameState);
    const renderResources = new VoxelRenderResources(primitive);
    expect(renderResources.shaderBuilder).toBeDefined();
    expect(renderResources.uniformMap).toBeDefined();
  });
});
