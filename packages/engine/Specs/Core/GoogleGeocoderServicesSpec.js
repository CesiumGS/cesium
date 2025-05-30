import {
  createGuid,
  GeocoderService,
  GoogleGeocoderService,
  Rectangle,
  Resource,
} from "../../index.js";

describe("Core/GoogleGeocoderService", function () {
  it("conforms to GeocoderService interface", function () {
    expect(GoogleGeocoderService).toConformToInterface(GeocoderService);
  });

  it("constructor throws without key", function () {
    expect(function () {
      return new GoogleGeocoderService({});
    }).toThrowDeveloperError();
  });

  it("constructor sets key on _resource", function () {
    const key = createGuid();
    const service = new GoogleGeocoderService({ key });
    expect(service._resource.toString()).toEqual(
      `https://maps.googleapis.com/maps/api/geocode/json?key=${key}`,
    );
  });

  it("geocode returns results for status=OK", async function () {
    const key = createGuid();
    const query = createGuid();
    const service = new GoogleGeocoderService({ key });

    spyOn(Resource.prototype, "fetchJson").and.resolveTo({
      results: [
        {
          formatted_address:
            "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
          geometry: {
            viewport: {
              northeast: {
                lat: 37.4237349802915,
                lng: -122.083183169709,
              },
              southwest: {
                lat: 37.4210370197085,
                lng: -122.085881130292,
              },
            },
          },
        },
      ],
      status: "OK",
    });

    const results = await service.geocode(query);

    expect(results).toEqual([
      {
        displayName: "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
        destination: Rectangle.fromDegrees(
          -122.085881130292,
          37.4210370197085,
          -122.083183169709,
          37.4237349802915,
        ),
        attribution: {
          html: `<img alt="Google" src="https://assets.ion.cesium.com/google-credit.png" style="vertical-align:-5px">`,
          collapsible: false,
        },
      },
    ]);
  });

  it("returns empty array for status=ZERO_RESULTS", async function () {
    const service = new GoogleGeocoderService({ key: "key" });

    spyOn(Resource.prototype, "fetchJson").and.resolveTo({
      status: "ZERO_RESULTS",
    });

    const results = await service.geocode("test");
    expect(results).toEqual([]);
  });
});
