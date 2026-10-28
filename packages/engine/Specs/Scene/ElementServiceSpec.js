import { ElementService } from "../../index.js";

describe("Scene/ElementService", function () {
  let service;

  beforeEach(function () {
    service = Object.create(ElementService.prototype);
  });

  it("throws when constructed directly", function () {
    expect(function () {
      return new ElementService();
    }).toThrowDeveloperError();
  });

  it("listElements must be implemented by a subclass", async function () {
    await expectAsync(service.listElements()).toBeRejectedWithDeveloperError();
  });

  it("getElement must be implemented by a subclass", async function () {
    await expectAsync(service.getElement("1")).toBeRejectedWithDeveloperError();
  });

  it("aggregate must be implemented by a subclass", async function () {
    await expectAsync(service.aggregate({})).toBeRejectedWithDeveloperError();
  });

  it("getElementTreeChildren must be implemented by a subclass", async function () {
    await expectAsync(
      service.getElementTreeChildren(),
    ).toBeRejectedWithDeveloperError();
  });

  it("getElementTreeParents must be implemented by a subclass", async function () {
    await expectAsync(
      service.getElementTreeParents("1"),
    ).toBeRejectedWithDeveloperError();
  });

  it("listPropertyNames must be implemented by a subclass", async function () {
    await expectAsync(
      service.listPropertyNames(),
    ).toBeRejectedWithDeveloperError();
  });

  it("listPropertyValues must be implemented by a subclass", async function () {
    await expectAsync(
      service.listPropertyValues("name"),
    ).toBeRejectedWithDeveloperError();
  });
});
