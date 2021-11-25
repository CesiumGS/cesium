import { BoundingRectangle } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { Material } from "../../Source/Cesium.js";
import { ViewportQuad } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/ViewportQuad",
  function () {
    var scene;
    var viewportQuad;
    var testImage;

    beforeAll(function () {
      scene = createScene();
      return Resource.fetchImage("./Data/Images/Red16x16.png").then(function (
        image
      ) {
        testImage = image;
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      viewportQuad = new ViewportQuad();
      viewportQuad.rectangle = new BoundingRectangle(0, 0, 2, 2);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("constructs with a rectangle", function () {
      var rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
      var quad = new ViewportQuad(rectangle);
      expect(quad.rectangle).toEqual(rectangle);
    });

    it("constructs with a material", function () {
      var material = Material.fromType(Material.StripeType);
      var quad = new ViewportQuad(undefined, material);
      expect(quad.material.type).toEqual(material.type);
    });

    it("gets the default color", function () {
      expect(viewportQuad.material.uniforms.color).toEqual(
        new Color(1.0, 1.0, 1.0, 1.0)
      );
    });

    it("throws when rendered without a rectangle", function () {
      viewportQuad.rectangle = undefined;
      scene.primitives.add(viewportQuad);

      expect(function () {
        scene.renderForSpecs();
      }).toThrowDeveloperError();
    });

    it("throws when rendered without a material", function () {
      viewportQuad.material = undefined;
      scene.primitives.add(viewportQuad);

      expect(function () {
        scene.renderForSpecs();
      }).toThrowDeveloperError();
    });

    it("does not render when show is false", function () {
      viewportQuad.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(viewportQuad);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders material", function () {
      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(viewportQuad);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders user created texture", function () {
      var texture = new Texture({
        context: scene.context,
        source: testImage,
      });

      viewportQuad.material = Material.fromType(Material.ImageType);
      viewportQuad.material.uniforms.image = texture;

      pollToPromise(function () {
        return viewportQuad.material._loadedImages.length !== 0;
      }).then(function () {
        expect(scene).toRender([0, 0, 0, 255]);
        scene.primitives.add(viewportQuad);
        expect(scene).toRender([255, 0, 0, 255]);
      });
    });

    it("updates rectangle", function () {
      var otherRectangle = new BoundingRectangle(0, 0, 4, 4);

      scene.primitives.add(viewportQuad);
      scene.renderForSpecs();

      viewportQuad.rectangle = otherRectangle;
      scene.renderForSpecs();
      expect(scene.frameState.commandList[0].renderState.viewport).toEqual(
        otherRectangle
      );
    });

    it("isDestroyed", function () {
      var boundRectangle = new BoundingRectangle(0, 0, 10, 10);
      var vq = new ViewportQuad(boundRectangle);

      expect(vq.isDestroyed()).toEqual(false);
      vq.destroy();
      expect(vq.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
