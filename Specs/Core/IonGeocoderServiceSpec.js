import { GeocodeType } from "../../Source/Cesium.js";
import { Ion } from "../../Source/Cesium.js";
import { IonGeocoderService } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import { when } from "../../Source/Cesium.js";

describe("Core/IonGeocoderService", function () {
  var scene;
  beforeEach(function () {
    scene = createScene();
  });

  afterEach(function () {
    scene.destroyForSpecs();
  });

  it("Creates with default parameters", function () {
    var service = new IonGeocoderService({ scene: scene });

    expect(service._accessToken).toEqual(Ion.defaultAccessToken);
    expect(service._server.url).toEqual(Ion.defaultServer.url);
  });

  it("Creates with specified parameters", function () {
    var accessToken = "123456";
    var server = "http://not.ion.invalid/";

    var service = new IonGeocoderService({
      accessToken: accessToken,
      server: server,
      scene: scene,
    });

    expect(service._accessToken).toEqual(accessToken);
    expect(service._server.url).toEqual(server);
  });

  it("calls inner geocoder and returns result", function () {
    var service = new IonGeocoderService({ scene: scene });

    var expectedResult = when.resolve();
    spyOn(service._pelias, "geocode").and.returnValue(expectedResult);

    var query = "some query";
    var result = service.geocode(query, GeocodeType.SEARCH);
    expect(result).toBe(expectedResult);
    expect(service._pelias.geocode).toHaveBeenCalledWith(
      query,
      GeocodeType.SEARCH
    );
  });
});
