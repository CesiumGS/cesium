import { getAbsoluteUri } from "../../Source/Cesium.js";
import { getBaseUri } from "../../Source/Cesium.js";

describe("Core/getAbsoluteUri", function () {
  it("works as expected", function () {
    let result = getAbsoluteUri(
      "http://www.mysite.com/awesome?makeitawesome=true"
    );
    expect(result).toEqual("http://www.mysite.com/awesome?makeitawesome=true");

    result = getAbsoluteUri("awesome.png", "http://test.com");
    expect(result).toEqual("http://test.com/awesome.png");

    result = getAbsoluteUri("awesome.png");
    expect(result).toEqual(getBaseUri(document.location.href) + "awesome.png");
  });

  it("document.baseURI is respected", function () {
    const fakeDocument = {
      baseURI: "http://test.com/index.html",
      location: document.location,
    };

    const result = getAbsoluteUri._implementation(
      "awesome.png",
      undefined,
      fakeDocument
    );
    expect(result).toEqual("http://test.com/awesome.png");
  });

  it("throws with undefined parameter", function () {
    expect(function () {
      getAbsoluteUri(undefined);
    }).toThrowDeveloperError();
  });
});
