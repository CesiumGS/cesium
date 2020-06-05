import PolygonClippingAccelerationGrid from "../../Source/Scene/PolygonClippingAccelerationGrid.js";

describe("Scene/PolygonClippingAcceleration", function () {
  it("developer error if invalid number of positions or indicies provided", function () {
    expect(function () {
      return new PolygonClippingAccelerationGrid({
        positions: [],
        indices: [],
        splits: 0,
      });
    }).toThrowError();

    expect(function () {
      return new PolygonClippingAccelerationGrid({
        positions: [1, 2, 3],
        splits: 0,
      });
    }).toThrowError();

    expect(function () {
      return new PolygonClippingAccelerationGrid({
        indices: [1, 2, 3],
        splits: 0,
      });
    }).toThrowError();
  });

  it("square with four splits is correctly generated", function () {
    // prettier-ignore
    const positions = [
      -1, 1, 0,             //     v0-|--v1  row0col0 (0) is PARTIAL
      1, 1, 0,              //     |0\| 1|   row0col1 (1) is TOTAL
      1, -1, 0,             //     -------   row1col0 (2) is TOTAL
      -1, -1, 0             //     |2 |\3|   row1col1 (3) is PARTIAL
    ]; // prettier-ignore     //     v3-|-v2

    const indices = [0, 1, 2, 2, 3, 0];
    const accelerator = new PolygonClippingAccelerationGrid({
      positions: positions,
      indices: indices,
      splits: 1,
    });

    const grid = accelerator.grid;
    const overlappingIndices = accelerator.overlappingTriangleIndices;

    expect(grid.length).toEqual(12);
    expect(overlappingIndices.length).toEqual(12);

    // row 0, col 0
    const cell0 = grid[0];
    expect(cell0).toEqual(
      PolygonClippingAccelerationGrid.CellOcclusion.Partial
    );
    expect(Array.from(overlappingIndices.slice(grid[1], grid[2]))).toEqual(
      indices
    );

    // row 0, col 1
    const cell1 = grid[3];
    expect(cell1).toEqual(PolygonClippingAccelerationGrid.CellOcclusion.Total);
    expect(grid[4]).toEqual(0);

    // row 1, col 0
    const cell2 = grid[6];
    expect(cell2).toEqual(PolygonClippingAccelerationGrid.CellOcclusion.Total);

    // row 1, col 1
    const cell3 = grid[9];
    expect(cell3).toEqual(
      PolygonClippingAccelerationGrid.CellOcclusion.Partial
    );
    expect(Array.from(overlappingIndices.slice(grid[10], grid[11]))).toEqual(
      indices
    );
  });

  it("zero split with single triangle to be partially occluded", function () {
    // prettier-ignore
    const positions = [
      0, 0, 0,
      0, -10, 0,
      10, 0, 0
    ];

    const indices = [0, 1, 2];

    const result = new PolygonClippingAccelerationGrid({
      positions: positions,
      indices: indices,
      splits: 0,
    });

    const grid = result.grid;
    expect(grid.length).toEqual(3);
    expect(grid[0]).toEqual(
      PolygonClippingAccelerationGrid.CellOcclusion.Partial
    );
  });

  it("getCellFromWorldPosition maps world coordinates to cell coordinates correctly", function () {
    // prettier-ignore
    const positions = [
      0, 3, 0,
      3, -3, 0,
      -3, -3, 0
    ];

    const indices = [0, 1, 2];

    const result = new PolygonClippingAccelerationGrid({
      positions: positions,
      indices: indices,
      splits: 1,
    });

    const topLeft = result.getCellFromWorldPosition(-1.5, 1.5);
    expect(topLeft).toBeDefined();
    expect(topLeft.col).toEqual(0);
    expect(topLeft.row).toEqual(0);
    expect(topLeft.status).toEqual(
      PolygonClippingAccelerationGrid.CellOcclusion.Partial
    );

    const btmLeft = result.getCellFromWorldPosition(-1.5, -1.5);
    expect(btmLeft).toBeDefined();
    expect(btmLeft.col).toEqual(0);
    expect(btmLeft.row).toEqual(1);
    expect(btmLeft.status).toEqual(
      PolygonClippingAccelerationGrid.CellOcclusion.Partial
    );
  });

  it("getCellFromWorldPosition returns null if location is out of bounds", function () {
    // prettier-ignore
    const positions = [
      -1, 1, 0,             //     v0-|--v1  row0col0 (0) is PARTIAL
      1, 1, 0,              //     |0\| 1|   row0col1 (1) is TOTAL
      1, -1, 0,             //     -------   row1col0 (2) is TOTAL
      -1, -1, 0             //     |2 |\3|   row1col1 (3) is PARTIAL
    ]; // prettier-ignore     //     v3-|-v2

    const indices = [0, 1, 2, 2, 3, 0];
    const accelerator = new PolygonClippingAccelerationGrid({
      positions: positions,
      indices: indices,
      splits: 1,
    });

    expect(accelerator.getCellFromWorldPosition(1995, 2020)).toBeNull();
  });
});
