import {
  Cartesian3,
  GeocoderService,
  GeocodeType,
  PeliasGeocoderService,
  Resource,
} from "../../index.js";

describe("Core/PeliasGeocoderService", function () {
  it("conforms to GeocoderService interface", function () {
    expect(PeliasGeocoderService).toConformToInterface(GeocoderService);
  });

  it("constructor throws without url", function () {
    expect(function () {
      return new PeliasGeocoderService(undefined);
    }).toThrowDeveloperError();
  });

  it("returns geocoder results", async function () {
    const service = new PeliasGeocoderService("http://test.invalid/v1/");

    const query = "some query";
    const data = {
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [-75.172489, 39.927828],
          },
          properties: {
            label: "1826 S 16th St, Philadelphia, PA, USA",
          },
        },
      ],
    };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );

    const results = await service.geocode(query);
    expect(results.length).toEqual(1);
    expect(results[0].displayName).toEqual(data.features[0].properties.label);
    expect(results[0].destination).toBeInstanceOf(Cartesian3);
  });

  it("returns geocoder results with attributions", async function () {
    const service = new PeliasGeocoderService("http://test.invalid/v1/");

    const query = "some query";
    const data = {
      attributions: [
        {
          html: `Credit`,
          collapsible: true,
        },
      ],
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [-75.172489, 39.927828],
          },
          properties: {
            label: "1826 S 16th St, Philadelphia, PA, USA",
          },
        },
      ],
    };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );

    const results = await service.geocode(query);
    expect(results.length).toEqual(1);
    expect(results[0].displayName).toEqual(data.features[0].properties.label);
    expect(results[0].destination).toBeInstanceOf(Cartesian3);
    expect(results[0].attributions.length).toBe(1);
    expect(results[0].attributions[0].html).toEqual("Credit");
  });

  it("returns no geocoder results if Pelias has no results", async function () {
    const service = new PeliasGeocoderService("http://test.invalid/v1/");

    const query = "some query";
    const data = { features: [] };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );

    const results = await service.geocode(query);
    expect(results.length).toEqual(0);
  });

  it("calls search endpoint if specified", async function () {
    const service = new PeliasGeocoderService("http://test.invalid/v1/");

    const query = "some query";
    const data = { features: [] };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );
    const getDerivedResource = spyOn(
      service._url,
      "getDerivedResource"
    ).and.callThrough();

    await service.geocode(query, GeocodeType.SEARCH);
    expect(getDerivedResource).toHaveBeenCalledWith({
      url: "search",
      queryParameters: {
        text: query,
      },
    });
  });

  it("calls autocomplete endpoint if specified", async function () {
    const service = new PeliasGeocoderService("http://test.invalid/v1/");

    const query = "some query";
    const data = { features: [] };
    spyOn(Resource.prototype, "fetchJson").and.returnValue(
      Promise.resolve(data)
    );
    const getDerivedResource = spyOn(
      service._url,
      "getDerivedResource"
    ).and.callThrough();

    await service.geocode(query, GeocodeType.AUTOCOMPLETE);
    expect(getDerivedResource).toHaveBeenCalledWith({
      url: "autocomplete",
      queryParameters: {
        text: query,
      },
    });
  });
});
