import { VoxelPrimitive, VoxelRenderResources } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/VoxelRenderResources", function () {
  const scene = createScene();

  it("constructs", function () {
    const primitive = new VoxelPrimitive();
    primitive.show = false;
    primitive.update(scene.frameState);
    const renderResources = new VoxelRenderResources(primitive);
    expect(renderResources.shaderBuilder).toBeDefined();
    expect(renderResources.uniformMap).toBeDefined();
  });
});
