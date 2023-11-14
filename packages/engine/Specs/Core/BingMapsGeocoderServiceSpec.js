import {
  BingMapsGeocoderService,
  Credit,
  GeocoderService,
  Rectangle,
  Resource,
} from "../../index.js";

describe("Core/BingMapsGeocoderService", function () {
  afterAll(function () {
    Resource._Implementations.loadAndExecuteScript =
      Resource._DefaultImplementations.loadAndExecuteScript;
  });

  it("conforms to GeocoderService interface", function () {
    expect(BingMapsGeocoderService).toConformToInterface(GeocoderService);
  });

  it("returns geocoder results", async function () {
    const query = "some query";
    const key = "not_the_real_key;";
    const data = {
      resourceSets: [
        {
          resources: [
            {
              name: "a",
              bbox: [32.0, 3.0, 3.0, 4.0],
            },
          ],
        },
      ],
    };
    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName,
      deferred
    ) {
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get("query")).toEqual(query);
      expect(parsedUrl.searchParams.get("key")).toEqual(key);
      expect(parsedUrl.searchParams.get("culture")).toBe(null);
      deferred.resolve(data);
    };
    const service = new BingMapsGeocoderService({ key: key });
    const results = await service.geocode(query);
    expect(results.length).toEqual(1);
    expect(results[0].displayName).toEqual("a");
    expect(results[0].destination).toBeInstanceOf(Rectangle);
  });

  it("uses supplied culture", async function () {
    const query = "some query";
    const key = "not_the_real_key;";
    const data = {
      resourceSets: [
        {
          resources: [
            {
              name: "a",
              bbox: [32.0, 3.0, 3.0, 4.0],
            },
          ],
        },
      ],
    };
    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName,
      deferred
    ) {
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get("query")).toEqual(query);
      expect(parsedUrl.searchParams.get("key")).toEqual(key);
      expect(parsedUrl.searchParams.get("culture")).toEqual("ja");
      deferred.resolve(data);
    };
    const service = new BingMapsGeocoderService({ key: key, culture: "ja" });
    const results = await service.geocode(query);
    expect(results.length).toEqual(1);
    expect(results[0].displayName).toEqual("a");
    expect(results[0].destination).toBeInstanceOf(Rectangle);
  });

  it("returns no geocoder results if Bing has no results", async function () {
    const query = "some query";
    const data = {
      resourceSets: [],
    };
    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName,
      deferred
    ) {
      deferred.resolve(data);
    };
    const service = new BingMapsGeocoderService({ key: "" });
    const results = await service.geocode(query);
    expect(results.length).toEqual(0);
  });

  it("returns no geocoder results if Bing has results but no resources", async function () {
    const query = "some query";
    const data = {
      resourceSets: [
        {
          resources: [],
        },
      ],
    };
    Resource._Implementations.loadAndExecuteScript = function (
      url,
      functionName,
      deferred
    ) {
      deferred.resolve(data);
    };
    const service = new BingMapsGeocoderService({ key: "" });
    const results = await service.geocode(query);
    expect(results.length).toEqual(0);
  });

  it("credit returns expected value", async function () {
    const service = new BingMapsGeocoderService({ key: "" });

    expect(service.credit).toBeInstanceOf(Credit);
    expect(service.credit.html).toEqual(
      `<img src="http:\/\/dev.virtualearth.net\/Branding\/logo_powered_by.png"/>`
    );
    expect(service.credit.showOnScreen).toBe(false);
  });
});
