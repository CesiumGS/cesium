import {
  Sampler,
  TextureMinificationFilter,
  TextureWrap,
} from "../../../Source/Cesium.js";

import createContext from "../createContext.js";

describe(
  "Renderer/Sampler",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("has expected default values", function () {
      const sampler = new Sampler();
      expect(sampler.wrapS).toEqual(TextureWrap.CLAMP_TO_EDGE);
      expect(sampler.wrapT).toEqual(TextureWrap.CLAMP_TO_EDGE);
      expect(sampler.minificationFilter).toEqual(
        TextureMinificationFilter.LINEAR
      );
      expect(sampler.magnificationFilter).toEqual(
        TextureMinificationFilter.LINEAR
      );
      expect(sampler.maximumAnisotropy).toEqual(1.0);
    });

    it("throws when creating a sampler with invalid wrapS", function () {
      expect(function () {
        return new Sampler({
          wrapS: "invalid wrap",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a sampler with invalid wrapT", function () {
      expect(function () {
        return new Sampler({
          wrapT: "invalid wrap",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a sampler with invalid minificationFilter", function () {
      expect(function () {
        return new Sampler({
          minificationFilter: "invalid filter",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a sampler with invalid magnificationFilter", function () {
      expect(function () {
        return new Sampler({
          magnificationFilter: "invalid filter",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a sampler with invalid maximumAnisotropy", function () {
      expect(function () {
        return new Sampler({
          maximumAnisotropy: 0.0,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
