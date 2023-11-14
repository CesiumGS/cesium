import createScene from "../../createScene.js";
import { HomeButton } from "../../../Source/Cesium.js";

describe(
  "Widgets/HomeButton/HomeButton",
  function () {
    let scene;
    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("constructor sets default values", function () {
      const homeButton = new HomeButton(document.body, scene);
      expect(homeButton.container).toBe(document.body);
      expect(homeButton.viewModel.scene).toBe(scene);
      expect(homeButton.isDestroyed()).toEqual(false);
      homeButton.destroy();
      expect(homeButton.isDestroyed()).toEqual(true);
    });

    it("constructor sets expected values", function () {
      const homeButton = new HomeButton(document.body, scene);
      expect(homeButton.container).toBe(document.body);
      expect(homeButton.viewModel.scene).toBe(scene);
      homeButton.destroy();
    });

    it("constructor works with string id container", function () {
      const testElement = document.createElement("span");
      testElement.id = "testElement";
      document.body.appendChild(testElement);
      const homeButton = new HomeButton("testElement", scene);
      expect(homeButton.container).toBe(testElement);
      document.body.removeChild(testElement);
      homeButton.destroy();
    });

    it("throws if container is undefined", function () {
      expect(function () {
        return new HomeButton(undefined, scene);
      }).toThrowDeveloperError();
    });

    it("throws if container string is undefined", function () {
      expect(function () {
        return new HomeButton("testElement", scene);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
