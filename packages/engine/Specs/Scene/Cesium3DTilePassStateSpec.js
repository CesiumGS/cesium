import {
  Cesium3DTilePass,
  Cesium3DTilePassState,
} from "../../index.js";;

describe("Scene/Cesium3DTilePassState", function () {
  it("sets default values", function () {
    const passState = new Cesium3DTilePassState({
      pass: Cesium3DTilePass.RENDER,
    });
    expect(passState.pass).toBe(Cesium3DTilePass.RENDER);
    expect(passState.commandList).toBeUndefined();
    expect(passState.camera).toBeUndefined();
    expect(passState.cullingVolume).toBeUndefined();
    expect(passState.ready).toBe(false);
  });

  it("constructed with options", function () {
    const mockCommandList = [];
    const mockCamera = {};
    const mockCullingVolume = {};
    const passState = new Cesium3DTilePassState({
      pass: Cesium3DTilePass.RENDER,
      commandList: mockCommandList,
      camera: mockCamera,
      cullingVolume: mockCullingVolume,
    });
    expect(passState.pass).toBe(Cesium3DTilePass.RENDER);
    expect(passState.commandList).toBe(mockCommandList);
    expect(passState.camera).toBe(mockCamera);
    expect(passState.cullingVolume).toBe(mockCullingVolume);
  });

  it("throws if options is undefined", function () {
    expect(function () {
      return new Cesium3DTilePassState();
    }).toThrowDeveloperError();
  });

  it("throws if options.pass is undefined", function () {
    expect(function () {
      return new Cesium3DTilePassState({});
    }).toThrowDeveloperError();
  });
});
