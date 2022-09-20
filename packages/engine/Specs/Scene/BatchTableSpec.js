import {
  Cartesian4,
  ComponentDatatype,
  PixelDatatype,
  Texture,
  BatchTable,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createScene from "../createScene.js";

describe(
  "Scene/BatchTable",
  function () {
    const unsignedByteAttributes = [
      {
        functionName: "batchTable_getShow",
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
      },
      {
        functionName: "batchTable_getPickColor",
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 4,
        normalize: true,
      },
    ];

    const floatAttributes = [
      {
        functionName: "batchTable_getShow",
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
      },
      {
        functionName: "batchTable_getCenter",
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 4,
      },
    ];

    let batchTable;
    let scene;
    let context;

    beforeAll(function () {
      scene = createScene();
      context = scene.context;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      batchTable =
        batchTable && !batchTable.isDestroyed() && batchTable.destroy();
    });

    it("constructor", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 2);
      expect(batchTable.attributes).toBe(unsignedByteAttributes);
      expect(batchTable.numberOfInstances).toEqual(2);
    });

    it("constructior throws without context", function () {
      expect(function () {
        batchTable = new BatchTable(undefined, unsignedByteAttributes, 5);
      }).toThrowDeveloperError();
    });

    it("constructior throws without attributes", function () {
      expect(function () {
        batchTable = new BatchTable(context, undefined, 5);
      }).toThrowDeveloperError();
    });

    it("constructor throws without number of instances", function () {
      expect(function () {
        batchTable = new BatchTable(context, unsignedByteAttributes, undefined);
      }).toThrowDeveloperError();
    });

    it("sets and gets entries in the table", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);

      let i;
      let color = new Cartesian4(0, 1, 2, 3);

      for (i = 0; i < batchTable.numberOfInstances; ++i) {
        batchTable.setBatchedAttribute(i, 0, 1);
        batchTable.setBatchedAttribute(i, 1, color);
      }

      for (i = 0; i < batchTable.numberOfInstances; ++i) {
        expect(batchTable.getBatchedAttribute(3, 0)).toEqual(1);
        expect(batchTable.getBatchedAttribute(3, 1)).toEqual(color);
      }

      color = new Cartesian4(4, 5, 6, 7);
      batchTable.setBatchedAttribute(3, 0, 0);
      batchTable.setBatchedAttribute(3, 1, color);
      expect(batchTable.getBatchedAttribute(3, 0)).toEqual(0);
      expect(batchTable.getBatchedAttribute(3, 1)).toEqual(color);
    });

    it("sets and gets entries in the table with float attributes", function () {
      const context = {
        floatingPointTexture: true,
      };
      batchTable = new BatchTable(context, floatAttributes, 5);

      let i;
      let color = new Cartesian4(0, 1, 2, 3);

      for (i = 0; i < batchTable.numberOfInstances; ++i) {
        batchTable.setBatchedAttribute(i, 0, 1);
        batchTable.setBatchedAttribute(i, 1, color);
      }

      for (i = 0; i < batchTable.numberOfInstances; ++i) {
        expect(batchTable.getBatchedAttribute(3, 0)).toEqual(1);
        expect(batchTable.getBatchedAttribute(3, 1)).toEqual(color);
      }

      color = new Cartesian4(4, 5, 6, 7);
      batchTable.setBatchedAttribute(3, 0, 0);
      batchTable.setBatchedAttribute(3, 1, color);
      expect(batchTable.getBatchedAttribute(3, 0)).toEqual(0);
      expect(batchTable.getBatchedAttribute(3, 1)).toEqual(color);
    });

    it("sets and gets entries in the table with float attributes and forced packing", function () {
      const context = {
        floatingPointTexture: false,
      };
      batchTable = new BatchTable(context, floatAttributes, 5);

      let i;
      let color = new Cartesian4(
        1.23456e12,
        -2.34567e30,
        3.45678e-6,
        -4.56789e-10
      );

      for (i = 0; i < batchTable.numberOfInstances; ++i) {
        batchTable.setBatchedAttribute(i, 0, 1);
        batchTable.setBatchedAttribute(i, 1, color);
      }

      let value;
      for (i = 0; i < batchTable.numberOfInstances; ++i) {
        value = batchTable.getBatchedAttribute(3, 0);
        expect(value).toEqual(1);
        value = batchTable.getBatchedAttribute(3, 1);
        expect(value).toEqualEpsilon(color, CesiumMath.EPSILON6);
      }

      color = new Cartesian4(
        0,
        Number.MAX_VALUE,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY
      );
      batchTable.setBatchedAttribute(3, 0, 0);
      batchTable.setBatchedAttribute(3, 1, color);

      value = batchTable.getBatchedAttribute(3, 0);
      expect(value).toEqual(0);
      value = batchTable.getBatchedAttribute(3, 1);
      expect(value.x).toEqual(0.0);
      expect(value.y).toEqual(Number.POSITIVE_INFINITY);
      expect(value.z).toEqual(Number.POSITIVE_INFINITY);
      expect(value.w).toEqual(Number.NEGATIVE_INFINITY);
    });

    it("gets with result parameter", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      const color = new Cartesian4(0, 1, 2, 3);
      batchTable.setBatchedAttribute(0, 1, color);

      const result = new Cartesian4();
      const returndValue = batchTable.getBatchedAttribute(0, 1, result);
      expect(returndValue).toBe(result);
      expect(result).toEqual(color);
    });

    it("get entry throws when instance index is out of range", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      expect(function () {
        batchTable.getBatchedAttribute(-1, 0);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getBatchedAttribute(100, 0);
      }).toThrowDeveloperError();
    });

    it("get entry throws when attribute index is out of range", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      expect(function () {
        batchTable.getBatchedAttribute(0, -1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getBatchedAttribute(0, 100);
      }).toThrowDeveloperError();
    });

    it("set entry throws when instance index is out of range", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      expect(function () {
        batchTable.setBatchedAttribute(-1, 0, 0);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setBatchedAttribute(100, 0, 1);
      }).toThrowDeveloperError();
    });

    it("set entry throws when attribute index is out of range", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      expect(function () {
        batchTable.setBatchedAttribute(0, -1, 1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setBatchedAttribute(0, 100, 1);
      }).toThrowDeveloperError();
    });

    it("set entry throws when value is undefined", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      expect(function () {
        batchTable.setBatchedAttribute(0, 0, undefined);
      }).toThrowDeveloperError();
    });

    it("creates a uniform callback with unsigned byte texture", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      batchTable.update(scene.frameState);

      const uniforms = batchTable.getUniformMapCallback()({});
      expect(uniforms.batchTexture).toBeDefined();
      expect(uniforms.batchTexture()).toBeInstanceOf(Texture);
      expect(uniforms.batchTexture().pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
      expect(uniforms.batchTextureDimensions).toBeDefined();
      expect(uniforms.batchTextureDimensions().x).toBeGreaterThan(0);
      expect(uniforms.batchTextureDimensions().y).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep).toBeDefined();
      expect(uniforms.batchTextureStep().x).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep().y).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep().z).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep().w).toBeGreaterThan(0);
    });

    it("creates a uniform callback with float texture", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      batchTable = new BatchTable(context, floatAttributes, 5);
      batchTable.update(scene.frameState);

      const uniforms = batchTable.getUniformMapCallback()({});
      expect(uniforms.batchTexture).toBeDefined();
      expect(uniforms.batchTexture()).toBeInstanceOf(Texture);
      expect(uniforms.batchTexture().pixelDatatype).toEqual(
        PixelDatatype.FLOAT
      );
      expect(uniforms.batchTextureDimensions).toBeDefined();
      expect(uniforms.batchTextureDimensions().x).toBeGreaterThan(0);
      expect(uniforms.batchTextureDimensions().y).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep).toBeDefined();
      expect(uniforms.batchTextureStep().x).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep().y).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep().z).toBeGreaterThan(0);
      expect(uniforms.batchTextureStep().w).toBeGreaterThan(0);

      if (scene.context.floatingPointTexture) {
        expect(uniforms.batchTexture().pixelDatatype).toEqual(
          PixelDatatype.FLOAT
        );
      } else {
        expect(uniforms.batchTexture().pixelDatatype).toEqual(
          PixelDatatype.UNSIGNED_BYTE
        );
      }
    });

    it("create shader functions", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);

      const shader = "void main() { gl_Position = vec4(0.0); }";
      const modifiedShader = batchTable.getVertexShaderCallback()(shader);
      expect(
        modifiedShader.indexOf(batchTable.attributes[0].functionName)
      ).not.toEqual(-1);
      expect(
        modifiedShader.indexOf(batchTable.attributes[1].functionName)
      ).not.toEqual(-1);
    });

    it("isDestroyed", function () {
      batchTable = new BatchTable(context, unsignedByteAttributes, 5);
      expect(batchTable.isDestroyed()).toEqual(false);
      batchTable.destroy();
      expect(batchTable.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
