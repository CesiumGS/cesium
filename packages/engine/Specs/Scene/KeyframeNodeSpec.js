import { KeyframeNode } from "../../Source/Cesium.js";

const dummySpatialNode = {};

describe("Scene/KeyframeNode", function () {
  it("constructs", function () {
    const keyframe = 13;
    const keyframeNode = new KeyframeNode(dummySpatialNode, keyframe);

    expect(keyframeNode.spatialNode).toBe(dummySpatialNode);
    expect(keyframeNode.keyframe).toBe(keyframe);
    expect(keyframeNode.state).toBe(KeyframeNode.LoadState.UNLOADED);
    expect(keyframeNode.metadatas).toEqual([]);
    expect(keyframeNode.megatextureIndex).toBe(-1);
    expect(keyframeNode.priority).toBe(-Number.MAX_VALUE);
    expect(keyframeNode.highPriorityFrameNumber).toBe(-1);
  });

  it("priorityComparator compares priorities", function () {
    const keyframe1 = 13;
    const keyframe2 = 7;
    const keyframeNode1 = new KeyframeNode(dummySpatialNode, keyframe1);
    const keyframeNode2 = new KeyframeNode(dummySpatialNode, keyframe2);
    keyframeNode1.priority = 1;
    keyframeNode2.priority = 2;
    const comparison = KeyframeNode.priorityComparator(
      keyframeNode1,
      keyframeNode2
    );
    expect(comparison).toBe(-1);
  });

  it("searchComparator compares keyframe indices", function () {
    const keyframe1 = 13;
    const keyframe2 = 7;
    const keyframeNode1 = new KeyframeNode(dummySpatialNode, keyframe1);
    const keyframeNode2 = new KeyframeNode(dummySpatialNode, keyframe2);
    const comparison = KeyframeNode.searchComparator(
      keyframeNode1,
      keyframeNode2
    );
    expect(comparison).toBe(6);
  });
});
