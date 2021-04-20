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

    it("throws without featuresLength", function () {
      expect(function () {
        return new BatchTexture({
          featuresLength: undefined,
          content: mockContent,
        });
      }).toThrowDeveloperError();
    });

    it("throws without content", function () {
      expect(function () {
        return new BatchTexture({
          featuresLength: 1,
          content: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("setShow throws with invalid batchId", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.setShow();
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.setShow(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.setShow(1);
      }).toThrowDeveloperError();
    });

    it("setShow throws with undefined value", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.setShow(0);
      }).toThrowDeveloperError();
    });

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

    it("getShow throws with invalid batchId", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.getShow();
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.getShow(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.getShow(1);
      }).toThrowDeveloperError();
    });

    it("getShow", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      // Show is true by default
      expect(batchTexture.getShow(0)).toEqual(true);
      batchTexture.setShow(0, false);
      expect(batchTexture.getShow(0)).toEqual(false);
    });

    it("setColor throws with invalid batchId", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.setColor();
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.setColor(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.setColor(1);
      }).toThrowDeveloperError();
    });

    it("setColor throws with undefined value", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.setColor(0);
      }).toThrowDeveloperError();
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

    it("setAllColor throws with undefined value", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.setAllColor();
      }).toThrowDeveloperError();
    });

    it("setAllColor", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 2,
      });
      batchTexture.setAllColor(Color.YELLOW);
      expect(batchTexture.getColor(0, result)).toEqual(Color.YELLOW);
      expect(batchTexture.getColor(1, result)).toEqual(Color.YELLOW);
    });

    it("setAllShow throws with undefined value", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.setAllShow();
      }).toThrowDeveloperError();
    });

    it("setAllShow", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 2,
      });
      batchTexture.setAllShow(false);
      expect(batchTexture.getShow(0)).toBe(false);
      expect(batchTexture.getShow(1)).toBe(false);
    });

    it("getColor throws with invalid batchId", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.getColor();
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.getColor(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTexture.getColor(1);
      }).toThrowDeveloperError();
    });

    it("getColor throws with undefined result", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      expect(function () {
        batchTexture.getColor(0);
      }).toThrowDeveloperError();
    });

    it("getColor", function () {
      var batchTexture = new BatchTexture({
        content: mockContent,
        featuresLength: 1,
      });
      // Color is true by default
      expect(batchTexture.getColor(0, result)).toEqual(Color.WHITE);
      batchTexture.setColor(0, Color.YELLOW);
      expect(batchTexture.getColor(0, result)).toEqual(Color.YELLOW);
    });
  },
  "WebGL"
);
