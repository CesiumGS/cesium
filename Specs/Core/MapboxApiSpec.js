import { MapboxApi } from "../../Source/Cesium.js";

describe("Core/MapboxApi", function () {
  it("getAccessToken returns provided access token if one is provided", function () {
    expect(MapboxApi.getAccessToken("foo")).toEqual("foo");
  });

  it("getAccessToken returns defaultAccessToken if provided access token is undefined", function () {
    var oldAccessToken = MapboxApi.defaultAccessToken;
    MapboxApi.defaultAccessToken = "someaccesstoken";
    expect(MapboxApi.getAccessToken(undefined)).toEqual("someaccesstoken");
    MapboxApi.defaultAccessToken = oldAccessToken;
  });
});
