import Uri from "urijs";
import { getAbsoluteUri, isCrossOriginUrl } from "../../index.js";

describe("Core/isCrossOriginUrl", function () {
  it("returns false for relative urls", function () {
    expect(isCrossOriginUrl("/some/url.jpg")).toEqual(false);
    expect(isCrossOriginUrl("some/url.jpg")).toEqual(false);
  });

  it("returns false for absolute urls that are not cross-origin", function () {
    let absoluteUrl = getAbsoluteUri("/some/url.jpg");
    expect(isCrossOriginUrl(absoluteUrl)).toEqual(false);

    absoluteUrl = getAbsoluteUri("some/url.jpg");
    expect(isCrossOriginUrl(absoluteUrl)).toEqual(false);
  });

  it("returns true for absolute urls that are cross-origin", function () {
    expect(isCrossOriginUrl("http://example.invalid/some/url.jpg")).toEqual(
      true
    );

    // a different scheme counts as cross-origin
    let pageUri = new Uri(location.href);
    pageUri.scheme(location.protocol === "https:" ? "http" : "https");

    let absoluteUrl = pageUri.toString();
    expect(isCrossOriginUrl(absoluteUrl)).toEqual(true);

    // so does a different port
    pageUri = new Uri(location.href);
    pageUri.authority(`${location.hostname}:${+location.port + 1}`);

    absoluteUrl = pageUri.toString();
    expect(isCrossOriginUrl(absoluteUrl)).toEqual(true);
  });
});
