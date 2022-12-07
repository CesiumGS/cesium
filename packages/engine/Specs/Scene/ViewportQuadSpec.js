import {
  BoundingRectangle,
  Color,
  Resource,
  Texture,
  Material,
  ViewportQuad,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/ViewportQuad",
  function () {
    let scene;
    let viewportQuad;
    let testImage;

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
      const rectangle = new BoundingRectangle(1.0, 2.0, 3.0, 4.0);
      const quad = new ViewportQuad(rectangle);
      expect(quad.rectangle).toEqual(rectangle);
    });

    it("constructs with a material", function () {
      const material = Material.fromType(Material.StripeType);
      const quad = new ViewportQuad(undefined, material);
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
      const texture = new Texture({
        context: scene.context,
        source: testImage,
      });

      viewportQuad.material = Material.fromType(Material.ImageType);
      viewportQuad.material.uniforms.image = texture;

      expect(scene).toRender([0, 0, 0, 255]);
      scene.primitives.add(viewportQuad);
      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("updates rectangle", function () {
      const otherRectangle = new BoundingRectangle(0, 0, 4, 4);

      scene.primitives.add(viewportQuad);
      scene.renderForSpecs();

      viewportQuad.rectangle = otherRectangle;
      scene.renderForSpecs();
      expect(scene.frameState.commandList[0].renderState.viewport).toEqual(
        otherRectangle
      );
    });

    it("isDestroyed", function () {
      const boundRectangle = new BoundingRectangle(0, 0, 10, 10);
      const vq = new ViewportQuad(boundRectangle);

      expect(vq.isDestroyed()).toEqual(false);
      vq.destroy();
      expect(vq.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
