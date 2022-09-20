import createScene from "../../createScene.js";
import { Geocoder } from "../../../Source/Cesium.js";

describe(
  "Widgets/Geocoder/Geocoder",
  function () {
    let scene;

    beforeEach(function () {
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("constructor sets expected properties", function () {
      const flightDuration = 1234;
      const destinationFound = jasmine.createSpy();

      const geocoder = new Geocoder({
        container: document.body,
        scene: scene,
        flightDuration: flightDuration,
        destinationFound: destinationFound,
      });

      const viewModel = geocoder.viewModel;
      expect(viewModel.scene).toBe(scene);
      expect(viewModel.flightDuration).toBe(flightDuration);
      expect(viewModel.destinationFound).toBe(destinationFound);
      geocoder.destroy();
    });

    it("can create and destroy", function () {
      const container = document.createElement("div");
      container.id = "testContainer";
      document.body.appendChild(container);

      const widget = new Geocoder({
        container: "testContainer",
        scene: scene,
      });
      expect(widget.container).toBe(container);
      expect(widget.isDestroyed()).toEqual(false);
      expect(container.children.length).not.toEqual(0);
      widget.destroy();
      expect(container.children.length).toEqual(0);
      expect(widget.isDestroyed()).toEqual(true);

      document.body.removeChild(container);
    });

    it("constructor throws with no scene", function () {
      expect(function () {
        return new Geocoder({
          container: document.body,
        });
      }).toThrowDeveloperError();
    });

    it("constructor throws with no element", function () {
      expect(function () {
        return new Geocoder({
          scene: scene,
        });
      }).toThrowDeveloperError();
    });

    it("constructor throws with string element that does not exist", function () {
      expect(function () {
        return new Geocoder({
          container: "does not exist",
          scene: scene,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
