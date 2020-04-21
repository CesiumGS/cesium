import { OpenCageGeocoderService } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { when } from "../../Source/Cesium.js";

describe("Core/OpenCageGeocoderService", function () {
  var endpoint = "https://api.opencagedata.com/geocode/v1/";
  var apiKey = "c2a490d593b14612aefa6ec2e6b77c47";

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

  it("returns geocoder results", function () {
    var service = new OpenCageGeocoderService(endpoint, apiKey);

    var query = "-22.6792,+14.5272";
    var data = {
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
    spyOn(Resource.prototype, "fetchJson").and.returnValue(when.resolve(data));

    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(1);
      expect(results[0].displayName).toEqual(data.results[0].formatted);
      expect(results[0].destination).toBeDefined();
    });
  });

  it("returns no geocoder results if OpenCage has no results", function () {
    var service = new OpenCageGeocoderService(endpoint, apiKey);

    var query = "";
    var data = { results: [] };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(when.resolve(data));

    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(0);
    });
  });
});
