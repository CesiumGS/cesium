import {
  GeocoderService,
  GeocodeType,
  Ion,
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
  });

  it("creates with specified parameters", function () {
    const accessToken = "123456";
    const server = "http://not.ion.invalid/";

    const service = new IonGeocoderService({
      accessToken: accessToken,
      server: server,
      scene: scene,
    });

    expect(service._accessToken).toEqual(accessToken);
    expect(service._server.url).toEqual(server);
  });

  it("calls inner geocoder and returns result", async function () {
    const service = new IonGeocoderService({ scene: scene });

    const expectedResult = ["results"];
    spyOn(service._pelias, "geocode").and.returnValue(
      Promise.resolve(expectedResult)
    );

    const query = "some query";
    const result = await service.geocode(query, GeocodeType.SEARCH);
    expect(result).toEqual(expectedResult);
    expect(service._pelias.geocode).toHaveBeenCalledWith(
      query,
      GeocodeType.SEARCH
    );
  });

  it("credit returns expected value", async function () {
    const service = new IonGeocoderService({ scene: scene });

    expect(service.credit).toBeUndefined();
  });
});
