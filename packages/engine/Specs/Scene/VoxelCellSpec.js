import {
  Cartesian3,
  Cesium3DTilesVoxelProvider,
  Math as CesiumMath,
  Matrix3,
  OrientedBoundingBox,
  VoxelPrimitive,
  VoxelCell,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/VoxelCell", function () {
  const voxelTilesetUrl =
    "Data/Cesium3DTiles/Voxel/VoxelBox3DTiles/tileset.json";
  let scene;
  let voxelPrimitive;

  beforeAll(async function () {
    scene = createScene();
    const provider = await Cesium3DTilesVoxelProvider.fromUrl(voxelTilesetUrl);
    voxelPrimitive = new VoxelPrimitive({ provider });
    scene.primitives.add(voxelPrimitive);
    await pollToPromise(function () {
      scene.renderForSpecs();
      const traversal = voxelPrimitive._traversal;
      return traversal.isRenderable(traversal.rootNode);
    });
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("constructs", function () {
    const tileIndex = 0;
    const sampleIndex = 0;
    const voxelCell = new VoxelCell(voxelPrimitive, tileIndex, sampleIndex);
    expect(voxelCell instanceof VoxelCell).toBe(true);
    expect(voxelCell.primitive).toBe(voxelPrimitive);
    expect(voxelCell.tileIndex).toBe(tileIndex);
    expect(voxelCell.sampleIndex).toBe(sampleIndex);
  });

  it("constructs using factory function fromKeyframeNode", function () {
    const tileIndex = 0;
    const sampleIndex = 0;
    const keyframeNode = voxelPrimitive._traversal.findKeyframeNode(tileIndex);
    const voxelCell = VoxelCell.fromKeyframeNode(
      voxelPrimitive,
      tileIndex,
      sampleIndex,
      keyframeNode
    );
    expect(voxelCell instanceof VoxelCell).toBe(true);
    expect(voxelCell.primitive).toBe(voxelPrimitive);
    expect(voxelCell.tileIndex).toBe(tileIndex);
    expect(voxelCell.sampleIndex).toBe(sampleIndex);
  });

  it("fromKeyFrameNode throws with missing parameters", function () {
    const tileIndex = 0;
    const sampleIndex = 0;
    const keyframeNode = voxelPrimitive._traversal.findKeyframeNode(tileIndex);
    expect(function () {
      return VoxelCell.fromKeyframeNode(
        undefined,
        tileIndex,
        sampleIndex,
        keyframeNode
      );
    }).toThrowDeveloperError();
    expect(function () {
      return VoxelCell.fromKeyframeNode(
        voxelPrimitive,
        tileIndex,
        undefined,
        keyframeNode
      );
    }).toThrowDeveloperError();
    expect(function () {
      return VoxelCell.fromKeyframeNode(
        undefined,
        tileIndex,
        sampleIndex,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("reports sample metadata names and properties", function () {
    const tileIndex = 0;
    const sampleIndex = 0;
    const keyframeNode = voxelPrimitive._traversal.findKeyframeNode(tileIndex);
    const voxelCell = VoxelCell.fromKeyframeNode(
      voxelPrimitive,
      tileIndex,
      sampleIndex,
      keyframeNode
    );
    expect(voxelCell.getNames()).toEqual(["a"]);
    expect(voxelCell.hasProperty("a")).toBe(true);
    expect(voxelCell.getProperty("a")).toEqual(new Float32Array(1));
  });

  it("computes bounding box for the sample", function () {
    const tileIndex = 0;
    const sampleIndex = 7;
    const keyframeNode = voxelPrimitive._traversal.findKeyframeNode(tileIndex);
    const voxelCell = VoxelCell.fromKeyframeNode(
      voxelPrimitive,
      tileIndex,
      sampleIndex,
      keyframeNode
    );
    const orientedBoundingBox = voxelCell.orientedBoundingBox;
    expect(orientedBoundingBox instanceof OrientedBoundingBox).toBe(true);
    const expectedCenter = new Cartesian3(0.5, 0.5, 0.5);
    expect(orientedBoundingBox.center).toEqualEpsilon(
      expectedCenter,
      CesiumMath.EPSILON6
    );
    const expectedHalfAxes = new Matrix3.fromUniformScale(0.5);
    expect(orientedBoundingBox.halfAxes).toEqualEpsilon(
      expectedHalfAxes,
      CesiumMath.EPSILON6
    );
  });
});
