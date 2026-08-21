import { SnapService } from "../../index.js";

describe("Core/SnapService", function () {
  it("cannot be instantiated directly", function () {
    expect(function () {
      return new SnapService();
    }).toThrowDeveloperError();
  });

  it("snap is not implemented", async function () {
    await expectAsync(
      SnapService.prototype.snap.call({}),
    ).toBeRejectedWithDeveloperError();
  });

  it("declares DEFAULT_SNAP_APERTURE with an implementation-defined value", function () {
    expect("DEFAULT_SNAP_APERTURE" in SnapService).toBe(true);
    expect(SnapService.DEFAULT_SNAP_APERTURE).toBeUndefined();
  });
});
