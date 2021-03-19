import { ImplicitSubdivisionScheme } from "../../Source/Cesium.js";

describe("Scene/ImplicitSubdivisionScheme", function () {
  it("getBranchingFactor returns the right branching factor", function () {
    var treeTypes = [
      ImplicitSubdivisionScheme.OCTREE,
      ImplicitSubdivisionScheme.QUADTREE,
    ];
    var branchingFactors = [8, 4];

    for (var i = 0; i < treeTypes.length; i++) {
      expect(ImplicitSubdivisionScheme.getBranchingFactor(treeTypes[i])).toBe(
        branchingFactors[i]
      );
    }
  });

  it("throws for invalid value", function () {
    expect(function () {
      return ImplicitSubdivisionScheme.getBranchingFactor("BINARY_TREE");
    }).toThrowDeveloperError();
  });
});
