import {
  ITwinPlatform,
  RequestErrorEvent,
  Resource,
  RuntimeError,
} from "../../index.js";

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
      await expectAsync(
        ITwinPlatform.getExports(undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected iModelId to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with no default access token set", async () => {
      ITwinPlatform.defaultAccessToken = undefined;
      await expectAsync(
        ITwinPlatform.getExports("imodel-id-1"),
      ).toBeRejectedWithDeveloperError(
        "Must set ITwinPlatform.defaultAccessToken first",
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
        return { exports: [] };
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

  describe("getRealityDataMetadata", () => {
    let requestSpy;
    beforeEach(() => {
      requestSpy = spyOn(Resource.prototype, "fetchJson");
    });

    it("rejects with no iTwinId", async () => {
      await expectAsync(
        ITwinPlatform.getRealityDataMetadata(undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected iTwinId to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with no realityDataId", async () => {
      await expectAsync(
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected realityDataId to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with no default access token set", async () => {
      ITwinPlatform.defaultAccessToken = undefined;
      await expectAsync(
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", "reality-data-id-1"),
      ).toBeRejectedWithDeveloperError(
        "Must set ITwinPlatform.defaultAccessToken first",
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
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", "reality-data-id-1"),
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
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", "reality-data-id-1"),
      ).toBeRejectedWithError(RuntimeError, /forbidden/);
    });

    it("rejects for API 404 errors", async () => {
      requestSpy.and.rejectWith(
        new RequestErrorEvent(
          404,
          JSON.stringify({
            error: { message: "" },
          }),
        ),
      );
      await expectAsync(
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", "reality-data-id-1"),
      ).toBeRejectedWithError(RuntimeError, /not found/);
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
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", "reality-data-id-1"),
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
        ITwinPlatform.getRealityDataMetadata("itwin-id-1", "reality-data-id-1"),
      ).toBeRejectedWithError(RuntimeError, /Too many/);
    });

    it("uses the default access token for the API request", async () => {
      let resource;
      requestSpy.and.callFake(function () {
        resource = this;
        return { realityData: {} };
      });
      await ITwinPlatform.getRealityDataMetadata(
        "itwin-id-1",
        "reality-data-id-1",
      );
      expect(resource).toBeDefined();
      expect(resource.headers["Authorization"]).toEqual(
        "Bearer default-access-token",
      );
    });
  });

  describe("getRealityDataURL", () => {
    let requestSpy;
    beforeEach(() => {
      requestSpy = spyOn(Resource.prototype, "fetchJson");
    });

    it("rejects with no iTwinId", async () => {
      await expectAsync(
        ITwinPlatform.getRealityDataURL(undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected iTwinId to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with no realityDataId", async () => {
      await expectAsync(
        ITwinPlatform.getRealityDataURL("itwin-id-1", undefined),
      ).toBeRejectedWithDeveloperError(
        "Expected realityDataId to be typeof string, actual typeof was undefined",
      );
    });
    it("rejects with no rootDocument", async () => {
      await expectAsync(
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          undefined,
        ),
      ).toBeRejectedWithDeveloperError(
        "Expected rootDocument to be typeof string, actual typeof was undefined",
      );
    });

    it("rejects with no default access token set", async () => {
      ITwinPlatform.defaultAccessToken = undefined;
      await expectAsync(
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          "root/document/path.json",
        ),
      ).toBeRejectedWithDeveloperError(
        "Must set ITwinPlatform.defaultAccessToken first",
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
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          "root/document/path.json",
        ),
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
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          "root/document/path.json",
        ),
      ).toBeRejectedWithError(RuntimeError, /forbidden/);
    });

    it("rejects for API 404 errors", async () => {
      requestSpy.and.rejectWith(
        new RequestErrorEvent(
          404,
          JSON.stringify({
            error: { message: "" },
          }),
        ),
      );
      await expectAsync(
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          "root/document/path.json",
        ),
      ).toBeRejectedWithError(RuntimeError, /not found/);
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
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          "root/document/path.json",
        ),
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
        ITwinPlatform.getRealityDataURL(
          "itwin-id-1",
          "reality-data-id-1",
          "root/document/path.json",
        ),
      ).toBeRejectedWithError(RuntimeError, /Too many/);
    });

    it("uses the default access token for the API request", async () => {
      let resource;
      requestSpy.and.callFake(function () {
        resource = this;
        return {
          _links: {
            containerUrl: { href: "https://example.com/base/path?auth=token" },
          },
        };
      });
      await ITwinPlatform.getRealityDataURL(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
      expect(resource).toBeDefined();
      expect(resource.headers["Authorization"]).toEqual(
        "Bearer default-access-token",
      );
    });

    it("combines the rootDocument with the access url", async () => {
      requestSpy.and.resolveTo({
        _links: {
          containerUrl: { href: "https://example.com/base/path?auth=token" },
        },
      });
      const tilesetUrl = await ITwinPlatform.getRealityDataURL(
        "itwin-id-1",
        "reality-data-id-1",
        "root/document/path.json",
      );
      expect(tilesetUrl).toEqual(
        "https://example.com/base/path/root/document/path.json?auth=token",
      );
    });
  });
});
