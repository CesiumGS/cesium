import { FeatureDetection } from "../../index.js";

describe("Core/FeatureDetection", function () {
  //generally, these tests just make sure the function runs, the test can't expect a value of true or false
  it("detects fullscreen support", function () {
    const supportsFullscreen = FeatureDetection.supportsFullscreen();
    expect(typeof supportsFullscreen).toEqual("boolean");
  });

  it("detects web worker support", function () {
    const supportsWebWorkers = FeatureDetection.supportsWebWorkers();
    expect(typeof supportsWebWorkers).toEqual("boolean");
  });

  it("detects typed array support", function () {
    const supportsTypedArrays = FeatureDetection.supportsTypedArrays();
    expect(typeof supportsTypedArrays).toEqual("boolean");
  });

  it("detects BigInt64Array support", function () {
    const supportsBigInt64Array = FeatureDetection.supportsBigInt64Array();
    expect(typeof supportsBigInt64Array).toEqual("boolean");
  });

  it("detects BigUint64Array support", function () {
    const supportsBigUint64Array = FeatureDetection.supportsBigUint64Array();
    expect(typeof supportsBigUint64Array).toEqual("boolean");
  });

  it("detects BigInt support", function () {
    const supportsBigInt = FeatureDetection.supportsBigInt();
    expect(typeof supportsBigInt).toEqual("boolean");
  });

  it("detects web assembly support", function () {
    const supportsWebAssembly = FeatureDetection.supportsWebAssembly();
    expect(typeof supportsWebAssembly).toEqual("boolean");
  });

  function checkVersionArray(array) {
    expect(Array.isArray(array)).toEqual(true);
    array.forEach(function (d) {
      expect(typeof d).toEqual("number");
    });
  }

  it("detects Chrome", function () {
    const isChrome = FeatureDetection.isChrome();
    expect(typeof isChrome).toEqual("boolean");

    if (isChrome) {
      const chromeVersion = FeatureDetection.chromeVersion();
      checkVersionArray(chromeVersion);

      console.log(`detected Chrome ${chromeVersion.join(".")}`);
    }
  });

  it("detects Safari", function () {
    const isSafari = FeatureDetection.isSafari();
    expect(typeof isSafari).toEqual("boolean");

    if (isSafari) {
      const safariVersion = FeatureDetection.safariVersion();
      checkVersionArray(safariVersion);

      console.log(`detected Safari ${safariVersion.join(".")}`);
    }
  });

  it("detects Webkit", function () {
    const isWebkit = FeatureDetection.isWebkit();
    expect(typeof isWebkit).toEqual("boolean");

    if (isWebkit) {
      const webkitVersion = FeatureDetection.webkitVersion();
      checkVersionArray(webkitVersion);
      expect(typeof webkitVersion.isNightly).toEqual("boolean");

      console.log(
        `detected Webkit ${webkitVersion.join(".")}${
          webkitVersion.isNightly ? " (Nightly)" : ""
        }`
      );
    }
  });

  it("detects Internet Explorer", function () {
    const isInternetExplorer = FeatureDetection.isInternetExplorer();
    expect(typeof isInternetExplorer).toEqual("boolean");

    if (isInternetExplorer) {
      const internetExplorerVersion = FeatureDetection.internetExplorerVersion();
      checkVersionArray(internetExplorerVersion);

      console.log(
        `detected Internet Explorer ${internetExplorerVersion.join(".")}`
      );
    }
  });

  it("detects Edge", function () {
    const isEdge = FeatureDetection.isEdge();
    expect(typeof isEdge).toEqual("boolean");

    if (isEdge) {
      const edgeVersion = FeatureDetection.edgeVersion();
      checkVersionArray(edgeVersion);

      console.log(`detected Edge ${edgeVersion.join(".")}`);
    }
  });

  it("detects Firefox", function () {
    const isFirefox = FeatureDetection.isFirefox();
    expect(typeof isFirefox).toEqual("boolean");

    if (isFirefox) {
      const firefoxVersion = FeatureDetection.firefoxVersion();

      checkVersionArray(firefoxVersion);

      console.log(`detected Firefox ${firefoxVersion.join(".")}`);
    }
  });

  it("detects iPad or iOS", function () {
    const iPadOrIOS = FeatureDetection.isIPadOrIOS();
    expect(typeof iPadOrIOS).toEqual("boolean");
  });

  it("detects imageRendering support", function () {
    const supportsImageRenderingPixelated = FeatureDetection.supportsImageRenderingPixelated();
    expect(typeof supportsImageRenderingPixelated).toEqual("boolean");
    if (supportsImageRenderingPixelated) {
      expect(FeatureDetection.imageRenderingValue()).toBeDefined();
    } else {
      expect(FeatureDetection.imageRenderingValue()).not.toBeDefined();
    }
  });

  it("supportWebP throws when it has not been initialized", function () {
    FeatureDetection.supportsWebP._promise = undefined;
    FeatureDetection.supportsWebP._result = undefined;
    expect(function () {
      FeatureDetection.supportsWebP();
    }).toThrowDeveloperError();
  });

  it("detects WebP support", function () {
    FeatureDetection.supportsWebP._promise = undefined;
    FeatureDetection.supportsWebP._result = undefined;

    return FeatureDetection.supportsWebP
      .initialize()
      .then(function (supportsWebP) {
        expect(typeof supportsWebP).toEqual("boolean");
        expect(FeatureDetection.supportsWebP()).toEqual(supportsWebP);
      });
  });
});
