import { ImplicitSubdivisionScheme } from "../../index.js";

describe("Scene/ImplicitSubdivisionScheme", function () {
  it("getBranchingFactor returns the right branching factor", function () {
    const treeTypes = [
      ImplicitSubdivisionScheme.OCTREE,
      ImplicitSubdivisionScheme.QUADTREE,
    ];
    const branchingFactors = [8, 4];

    for (let i = 0; i < treeTypes.length; i++) {
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
