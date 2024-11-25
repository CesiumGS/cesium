import DeveloperError from "../../Source/Core/DeveloperError.js";
import ITwinPlatform from "../../Source/Core/ITwinPlatform.js";
import RequestErrorEvent from "../../Source/Core/RequestErrorEvent.js";
import Resource from "../../Source/Core/Resource.js";
import RuntimeError from "../../Source/Core/RuntimeError.js";

describe("ITwinPlatform", () => {
  let previousAccessToken;
  beforeEach(() => {
    previousAccessToken = ITwinPlatform.defaultAccessToken;
    ITwinPlatform.defaultAccessToken = "default-access-token";
  });

  afterEach(() => {
    ITwinPlatform.defaultAccessToken = previousAccessToken;
  });

  describe("getExports", () => {
    let requestSpy;
    beforeEach(() => {
      requestSpy = spyOn(Resource.prototype, "fetchJson");
    });

    it("rejects with no iModelId", async () => {
      // @ts-expect-error
      await expectAsync(ITwinPlatform.getExports()).toBeRejectedWithError(
        DeveloperError,
        /iModelId/,
      );
    });

    it("rejects with no default access token set", async () => {
      ITwinPlatform.defaultAccessToken = undefined;
      await expectAsync(
        ITwinPlatform.getExports("imodel-id-1"),
      ).toBeRejectedWithError(
        DeveloperError,
        /Must set ITwinPlatform.defaultAccessToken/,
      );
    });

    it("rejects for API 401 errors", async () => {
      requestSpy.and.rejectWith(
        new RequestErrorEvent(
          401,
          JSON.stringify({
            error: { message: "failed", details: [{ code: "InvalidToken" }] },
          }),
        ),
      );
      await expectAsync(
        ITwinPlatform.getExports("imodel-id-1"),
      ).toBeRejectedWithError(RuntimeError, /Unauthorized/);
    });

    it("rejects for API 403 errors", async () => {
      requestSpy.and.rejectWith(
        new RequestErrorEvent(
          403,
          JSON.stringify({
            error: { message: "failed", code: "Forbidden" },
          }),
        ),
      );
      await expectAsync(
        ITwinPlatform.getExports("imodel-id-1"),
      ).toBeRejectedWithError(RuntimeError, /forbidden/);
    });

    it("rejects for API 422 errors", async () => {
      requestSpy.and.rejectWith(
        new RequestErrorEvent(
          422,
          JSON.stringify({
            error: { message: "failed", code: "BadEntity" },
          }),
        ),
      );
      await expectAsync(
        ITwinPlatform.getExports("imodel-id-1"),
      ).toBeRejectedWithError(RuntimeError, /Unprocessable/);
    });

    it("rejects for API 429 errors", async () => {
      requestSpy.and.rejectWith(
        new RequestErrorEvent(
          429,
          JSON.stringify({
            error: { message: "" },
          }),
        ),
      );
      await expectAsync(
        ITwinPlatform.getExports("imodel-id-1"),
      ).toBeRejectedWithError(RuntimeError, /Too many/);
    });

    it("uses the default access token for the API request", async () => {
      let resource;
      requestSpy.and.callFake(function () {
        resource = this;
        return JSON.stringify({ exports: [] });
      });
      await ITwinPlatform.getExports("imodel-id-1");
      expect(resource).toBeDefined();
      expect(resource.headers["Authorization"]).toEqual(
        "Bearer default-access-token",
      );
    });

    it("uses the imodel id in the API request", async () => {
      let resource;
      requestSpy.and.callFake(function () {
        resource = this;
        return JSON.stringify({ exports: [] });
      });
      await ITwinPlatform.getExports("imodel-id-1");
      expect(resource).toBeDefined();
      expect(resource.url).toContain("imodel-id-1");
    });
  });
});
