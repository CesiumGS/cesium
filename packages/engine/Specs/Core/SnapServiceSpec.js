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
});
