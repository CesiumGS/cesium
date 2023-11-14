import {
  Cartesian3,
  CartographicGeocoderService,
  GeocoderService,
} from "../../index.js";

describe("Core/CartographicGeocoderService", function () {
  const service = new CartographicGeocoderService();

  it("conforms to GeocoderService interface", function () {
    expect(CartographicGeocoderService).toConformToInterface(GeocoderService);
  });

  it("returns cartesian with matching coordinates for NS/EW input", function () {
    const query = "35N 75W";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(1);
      expect(results[0].destination).toEqual(
        Cartesian3.fromDegrees(-75.0, 35.0, 300.0)
      );
    });
  });

  it("returns cartesian with matching coordinates for EW/NS input", function () {
    const query = "75W 35N";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(1);
      expect(results[0].destination).toEqual(
        Cartesian3.fromDegrees(-75.0, 35.0, 300.0)
      );
    });
  });

  it("returns cartesian with matching coordinates for long/lat/height input", function () {
    const query = " 1.0, 2.0, 3.0 ";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(1);
      expect(results[0].destination).toEqual(
        Cartesian3.fromDegrees(1.0, 2.0, 3.0)
      );
    });
  });

  it("returns cartesian with matching coordinates for long/lat input", function () {
    const query = " 1.0, 2.0 ";
    const defaultHeight = 300.0;
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(1);
      expect(results[0].destination).toEqual(
        Cartesian3.fromDegrees(1.0, 2.0, defaultHeight)
      );
    });
  });

  it("returns empty array for input with only longitudinal coordinates", function () {
    const query = " 1e 1e ";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(0);
    });
  });

  it("returns empty array for input with only one NSEW coordinate", function () {
    const query = " 1e 1 ";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(0);
    });
  });

  it("returns empty array for input with only one number", function () {
    const query = " 2.0 ";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(0);
    });
  });

  it("returns empty array for with string", function () {
    const query = " aoeu ";
    return service.geocode(query).then(function (results) {
      expect(results.length).toEqual(0);
    });
  });
});
