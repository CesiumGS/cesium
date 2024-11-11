import {
  DeveloperError,
  GeocoderService,
  GeocodeType,
  Ion,
  IonGeocodeProvider,
  IonGeocoderService,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe("Core/IonGeocoderService", function () {
  let scene;
  beforeEach(function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  it("conforms to GeocoderService interface", function () {
    expect(IonGeocoderService).toConformToInterface(GeocoderService);
  });

  it("creates with default parameters", function () {
    const service = new IonGeocoderService({ scene: scene });

    expect(service._accessToken).toEqual(Ion.defaultAccessToken);
    expect(service._server.url).toEqual(Ion.defaultServer.url);
    expect(service.geocodeProvider).toEqual(IonGeocodeProvider.DEFAULT);
  });

  it("creates with specified parameters", function () {
    const accessToken = "123456";
    const server = "http://not.ion.invalid/";
    const geocodeProvider = IonGeocodeProvider.GOOGLE;

    const service = new IonGeocoderService({
      accessToken: accessToken,
      server: server,
      scene: scene,
      geocodeProvider,
    });

    expect(service._accessToken).toEqual(accessToken);
    expect(service._server.url).toEqual(server);
    expect(service.geocodeProvider).toEqual(geocodeProvider);
  });

  it("calls inner geocoder and returns result", async function () {
    const service = new IonGeocoderService({ scene: scene });

    const expectedResult = ["results"];
    spyOn(service._pelias, "geocode").and.returnValue(
      Promise.resolve(expectedResult),
    );

    const query = "some query";
    const result = await service.geocode(query, GeocodeType.SEARCH);
    expect(result).toEqual(expectedResult);
    expect(service._pelias.geocode).toHaveBeenCalledWith(
      query,
      GeocodeType.SEARCH,
    );
  });

  it("credit returns expected value", async function () {
    const service = new IonGeocoderService({ scene: scene });

    expect(service.credit).toBeUndefined();
  });

  it("setting geocodeProvider updates _pelias.url for GOOGLE", function () {
    const service = new IonGeocoderService({
      scene,
      geocoder: IonGeocodeProvider.DEFAULT,
    });

    service.geocodeProvider = IonGeocodeProvider.GOOGLE;
    expect(service._pelias.url.queryParameters["geocoder"]).toEqual("google");
  });

  it("setting geocodeProvider updates _pelias.url for BING", function () {
    const service = new IonGeocoderService({
      scene,
      geocoder: IonGeocodeProvider.DEFAULT,
    });

    service.geocodeProvider = IonGeocodeProvider.BING;
    expect(service._pelias.url.queryParameters["geocoder"]).toEqual("bing");
  });

  it("setting geocodeProvider updates _pelias.url for DEFAULT", function () {
    const service = new IonGeocoderService({
      scene,
      geocoder: IonGeocodeProvider.GOOGLE,
    });

    service.geocodeProvider = IonGeocodeProvider.DEFAULT;
    const queryParameters = service._pelias.url.queryParameters;
    expect(queryParameters.geocoder).toBeUndefined();
    // Make sure that it isn't 'geocoder: undefined'
    expect(queryParameters.hasOwnProperty("geocoder")).toBeFalse();
  });

  it("throws if setting invalid geocodeProvider", function () {
    expect(
      () => new IonGeocoderService({ scene, geocodeProvider: "junk" }),
    ).toThrowError(DeveloperError, /Invalid geocodeProvider/);
    expect(() => {
      const service = new IonGeocoderService({ scene });
      service.geocodeProvider = "junk";
    }).toThrowError(DeveloperError, /Invalid geocodeProvider/);
  });
});
