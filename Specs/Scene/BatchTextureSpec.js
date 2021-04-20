import { BatchTexture, Color } from "../../Source/Cesium.js";

import createScene from "../createScene.js";

describe(
  "Scene/BatchTexture",
  function () {
    var scene;
    var mockContent = {};
    var mockTileset = {
      _statistics: {
        batchTableByteLength: 0,
      },
    };

    beforeAll(function () {
      scene = createScene();
    });

    var result = new Color();

    it("setShow sets show", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });

      // Batch table resources are undefined by default
      expect(batchTexture._batchValues).toBeUndefined();
      expect(batchTexture._batchTexture).toBeUndefined();

      // Check that batch table resources are still undefined because value is true by default
      batchTexture.setShow(0, true);
      batchTexture.update(mockTileset, scene.frameState);
      expect(batchTexture._batchValues).toBeUndefined();
      expect(batchTexture._batchTexture).toBeUndefined();
      expect(batchTexture.getShow(0)).toEqual(true);

      // Check that batch values are dirty and resources are created when value changes
      batchTexture.setShow(0, false);
      expect(batchTexture._batchValuesDirty).toEqual(true);
      batchTexture.update(mockTileset, scene.frameState);
      expect(batchTexture._batchValues).toBeDefined();
      expect(batchTexture._batchTexture).toBeDefined();
      expect(batchTexture._batchValuesDirty).toEqual(false);
      expect(batchTexture.getShow(0)).toEqual(false);

      // Check that dirty stays false when value is the same
      batchTexture.setShow(0, false);
      expect(batchTexture._batchValuesDirty).toEqual(false);
      expect(batchTexture.getShow(0)).toEqual(false);
    });

    it("setColor", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });

      // Batch table resources are undefined by default
      expect(batchTexture._batchValues).toBeUndefined();
      expect(batchTexture._batchTexture).toBeUndefined();

      // Check that batch table resources are still undefined because value is true by default
      batchTexture.setColor(0, Color.WHITE);
      batchTexture.update(mockTileset, scene.frameState);
      expect(batchTexture._batchValues).toBeUndefined();
      expect(batchTexture._batchTexture).toBeUndefined();
      expect(batchTexture.getColor(0, result)).toEqual(Color.WHITE);

      // Check that batch values are dirty and resources are created when value changes
      batchTexture.setColor(0, Color.YELLOW);
      expect(batchTexture._batchValuesDirty).toEqual(true);
      batchTexture.update(mockTileset, scene.frameState);
      expect(batchTexture._batchValues).toBeDefined();
      expect(batchTexture._batchTexture).toBeDefined();
      expect(batchTexture._batchValuesDirty).toEqual(false);
      expect(batchTexture.getColor(0, result)).toEqual(Color.YELLOW);

      // Check that dirty stays false when value is the same
      batchTexture.setColor(0, Color.YELLOW);
      expect(batchTexture._batchValuesDirty).toEqual(false);
      expect(batchTexture.getColor(0, result)).toEqual(Color.YELLOW);
    });
  },
  "WebGL"
);
