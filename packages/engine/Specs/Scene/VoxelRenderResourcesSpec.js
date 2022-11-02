import { VoxelPrimitive, VoxelRenderResources } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

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
