import {
  Credit,
  GeocoderService,
  OpenCageGeocoderService,
  Resource,
} from "../../index.js";

describe("Core/OpenCageGeocoderService", function () {
  const endpoint = "https://api.opencagedata.com/geocode/v1/";
  const apiKey = "c2a490d593b14612aefa6ec2e6b77c47";

  it("conforms to GeocoderService interface", function () {
    expect(OpenCageGeocoderService).toConformToInterface(GeocoderService);
  });

  it("constructor throws without url", function () {
    expect(function () {
      return new OpenCageGeocoderService(undefined);
    }).toThrowDeveloperError();
  });

  it("constructor throws without API Key", function () {
    expect(function () {
      return new OpenCageGeocoderService(endpoint, undefined);
    }).toThrowDeveloperError();
  });

  it("returns geocoder results", async function () {
    const service = new OpenCageGeocoderService(endpoint, apiKey);

    const query = "-22.6792,+14.5272";
    const data = {
      results: [
        {
          bounds: {
            northeast: {
              lat: -22.6790826,
              lng: 14.5269016,
            },
            southwest: {
              lat: -22.6792826,
              lng: 14.5267016,
            },
          },
          formatted: "Beryl's Restaurant, Woermann St, Swakopmund, Namibia",
          geometry: {
            lat: -22.6795394,
            lng: 14.5276006,
          },
        },
      ],
    };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );

    const results = await service.geocode(query);
    expect(results.length).toEqual(1);
    expect(results[0].displayName).toEqual(data.results[0].formatted);
    expect(results[0].destination).toBeDefined();
  });

  it("returns no geocoder results if OpenCage has no results", async function () {
    const service = new OpenCageGeocoderService(endpoint, apiKey);

    const query = "";
    const data = { results: [] };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );

    const results = await service.geocode(query);
    expect(results.length).toEqual(0);
  });

  it("credit returns expected value", async function () {
    const service = new OpenCageGeocoderService(endpoint, apiKey);

    expect(service.credit).toBeInstanceOf(Credit);
    expect(service.credit.html).toEqual(
      `Geodata copyright <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors`
    );
    expect(service.credit.showOnScreen).toBe(false);
  });
});
