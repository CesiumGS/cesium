import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { Matrix2 } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { ContextLimits } from "../../Source/Cesium.js";
import { Batched3DModel3DTileContent } from "../../Source/Cesium.js";
import { Cesium3DTileBatchTable } from "../../Source/Cesium.js";
import { Cesium3DTileStyle } from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";
import concatTypedArrays from "../concatTypedArrays.js";

describe(
  "Scene/Cesium3DTileBatchTable",
  function () {
    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const withBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";
    const withoutBatchTableUrl =
      "./Data/Cesium3DTiles/Batched/BatchedWithoutBatchTable/tileset.json";
    const noBatchIdsUrl =
      "./Data/Cesium3DTiles/Batched/BatchedNoBatchIds/tileset.json";
    const batchTableHierarchyUrl =
      "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchy/tileset.json";
    const batchTableHierarchyBinaryUrl =
      "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchyBinary/tileset.json";
    const batchTableHierarchyMultipleParentsUrl =
      "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchyMultipleParents/tileset.json";
    const batchTableHierarchyNoParentsUrl =
      "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchyNoParents/tileset.json";
    const batchTableHierarchyLegacyUrl =
      "./Data/Cesium3DTiles/Hierarchy/BatchTableHierarchyLegacy/tileset.json";

    const result = new Color();

    const mockTileset = {
      statistics: {
        texturesByteLength: 0,
      },
      getFeature: function (batchId) {
        return { batchId: batchId };
      },
    };
    mockTileset.tileset = mockTileset;

    beforeAll(function () {
      scene = createScene();

      // One feature is located at the center, point the camera there
      const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 20.0));

      // Keep the error from logging to the console when running tests
      spyOn(Cesium3DTileBatchTable, "_deprecationWarning");
      spyOn(Batched3DModel3DTileContent, "_deprecationWarning");
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("setShow throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setShow();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setShow(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setShow(1);
      }).toThrowDeveloperError();
    });

    it("setShow throws with undefined value", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setShow(0);
      }).toThrowDeveloperError();
    });

    it("setShow sets show", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);

      // Show is true by default
      expect(batchTable.getShow(0)).toBe(true);

      // Check that batch values are dirty and resources are created when value changes
      batchTable.setShow(0, false);
      batchTable.update(mockTileset, scene.frameState);
      expect(batchTable.getShow(0)).toEqual(false);
    });

    it("getShow throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getShow();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getShow(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getShow(1);
      }).toThrowDeveloperError();
    });

    it("getShow", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      // Show is true by default
      expect(batchTable.getShow(0)).toEqual(true);
      batchTable.setShow(0, false);
      expect(batchTable.getShow(0)).toEqual(false);
    });

    it("setColor throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setColor();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setColor(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setColor(1);
      }).toThrowDeveloperError();
    });

    it("setColor throws with undefined value", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setColor(0);
      }).toThrowDeveloperError();
    });

    it("setColor", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);

      batchTable.setColor(0, Color.YELLOW);
      batchTable.update(mockTileset, scene.frameState);
      expect(batchTable.getColor(0, result)).toEqual(Color.YELLOW);
    });

    it("setAllColor throws with undefined value", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setAllColor();
      }).toThrowDeveloperError();
    });

    it("setAllColor", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
      batchTable.setAllColor(Color.YELLOW);
      expect(batchTable.getColor(0, result)).toEqual(Color.YELLOW);
      expect(batchTable.getColor(1, result)).toEqual(Color.YELLOW);
    });

    it("setAllShow throws with undefined value", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setAllShow();
      }).toThrowDeveloperError();
    });

    it("setAllShow", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 2);
      batchTable.setAllShow(false);
      expect(batchTable.getShow(0)).toBe(false);
      expect(batchTable.getShow(1)).toBe(false);
    });

    it("getColor throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getColor();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getColor(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getColor(1);
      }).toThrowDeveloperError();
    });

    it("getColor throws with undefined result", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getColor(0);
      }).toThrowDeveloperError();
    });

    it("getColor", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      // Color is true by default
      expect(batchTable.getColor(0, result)).toEqual(Color.WHITE);
      batchTable.setColor(0, Color.YELLOW);
      expect(batchTable.getColor(0, result)).toEqual(Color.YELLOW);
    });

    it("hasProperty throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.hasProperty();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.hasProperty(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.hasProperty(1);
      }).toThrowDeveloperError();
    });

    it("hasProperty throws with undefined name", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.hasProperty(0);
      }).toThrowDeveloperError();
    });

    it("hasProperty", function () {
      const batchTableJson = {
        height: [0.0],
      };
      const batchTable = new Cesium3DTileBatchTable(
        mockTileset,
        1,
        batchTableJson
      );
      expect(batchTable.hasProperty(0, "height")).toEqual(true);
      expect(batchTable.hasProperty(0, "id")).toEqual(false);
    });

    it("getPropertyNames throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getPropertyNames();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getPropertyNames(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getPropertyNames(1);
      }).toThrowDeveloperError();
    });

    it("getPropertyNames", function () {
      let batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(batchTable.getPropertyNames(0)).toEqual([]);

      const batchTableJson = {
        height: [0.0],
        id: [0],
      };
      batchTable = new Cesium3DTileBatchTable(mockTileset, 1, batchTableJson);
      expect(batchTable.getPropertyNames(0)).toEqual(["height", "id"]);
    });

    it("getPropertyNames works with results argument", function () {
      const batchTableJson = {
        height: [0.0],
        id: [0],
      };
      const batchTable = new Cesium3DTileBatchTable(
        mockTileset,
        1,
        batchTableJson
      );
      const results = [];
      const names = batchTable.getPropertyNames(0, results);
      expect(names).toBe(results);
      expect(names).toEqual(["height", "id"]);
    });

    it("getProperty throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getProperty();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getProperty(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getProperty(1);
      }).toThrowDeveloperError();
    });

    it("getProperty throws with undefined name", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getProperty(0);
      }).toThrowDeveloperError();
    });

    it("getProperty", function () {
      let batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(batchTable.getProperty(0, "height")).toBeUndefined();

      const batchTableJson = {
        height: [1.0],
      };
      batchTable = new Cesium3DTileBatchTable(mockTileset, 1, batchTableJson);
      expect(batchTable.getProperty(0, "height")).toEqual(1.0);
      expect(batchTable.getProperty(0, "id")).toBeUndefined();
    });

    it("setProperty throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setProperty();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setProperty(-1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.setProperty(1);
      }).toThrowDeveloperError();
    });

    it("setProperty throws with undefined name", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.setProperty(0);
      }).toThrowDeveloperError();
    });

    it("setProperty without existing batch table", function () {
      // Check that a batch table is created with a height of 1.0 for the first resource and undefined for the others
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 3);
      batchTable.setProperty(0, "height", 1.0);

      expect(batchTable._properties.height.length).toEqual(3);
      expect(batchTable.getProperty(0, "height")).toEqual(1.0);
      expect(batchTable.getProperty(1, "height")).toBeUndefined();
      expect(batchTable.getProperty(2, "height")).toBeUndefined();
    });

    it("setProperty with existing batch table", function () {
      const batchTableJson = {
        height: [1.0, 2.0],
      };
      const batchTable = new Cesium3DTileBatchTable(
        mockTileset,
        2,
        batchTableJson
      );
      batchTable.setProperty(0, "height", 3.0);

      expect(batchTable.getProperty(0, "height")).toEqual(3.0);
      expect(batchTable.getProperty(1, "height")).toEqual(2.0);
    });

    it("setProperty with object value", function () {
      const batchTableJson = {
        info: [
          { name: "building0", year: 2000 },
          { name: "building1", year: 2001 },
        ],
      };
      const batchTable = new Cesium3DTileBatchTable(
        mockTileset,
        2,
        batchTableJson
      );
      batchTable.setProperty(0, "info", { name: "building0_new", year: 2002 });

      expect(batchTable.getProperty(0, "info")).toEqual({
        name: "building0_new",
        year: 2002,
      });
      expect(batchTable.getProperty(1, "info")).toEqual({
        name: "building1",
        year: 2001,
      });
    });

    it("setProperty with array value", function () {
      const batchTableJson = {
        rooms: [
          ["room1", "room2"],
          ["room3", "room4"],
        ],
      };
      const batchTable = new Cesium3DTileBatchTable(
        mockTileset,
        2,
        batchTableJson
      );
      batchTable.setProperty(0, "rooms", ["room1_new", "room2"]);

      expect(batchTable.getProperty(0, "rooms")).toEqual([
        "room1_new",
        "room2",
      ]);
      expect(batchTable.getProperty(1, "rooms")).toEqual(["room3", "room4"]);
    });

    it("throws if the binary property does not specify a componentType", function () {
      const batchTableJson = {
        propertyScalar: {
          byteOffset: 0,
          type: "SCALAR",
        },
      };
      const batchTableBinary = new Float64Array([0, 1]);
      expect(function () {
        return new Cesium3DTileBatchTable(
          mockTileset,
          2,
          batchTableJson,
          batchTableBinary
        );
      }).toThrowRuntimeError();
    });

    it("throws if the binary property does not specify a type", function () {
      const batchTableJson = {
        propertyScalar: {
          byteOffset: 0,
          componentType: "DOUBLE",
        },
      };
      const batchTableBinary = new Float64Array([0, 1]);
      expect(function () {
        return new Cesium3DTileBatchTable(
          mockTileset,
          2,
          batchTableJson,
          batchTableBinary
        );
      }).toThrowRuntimeError();
    });

    it("throws if a binary property exists but there is no batchTableBinary", function () {
      const batchTableJson = {
        propertyScalar: {
          byteOffset: 0,
          componentType: "DOUBLE",
          type: "SCALAR",
        },
      };
      expect(function () {
        return new Cesium3DTileBatchTable(mockTileset, 2, batchTableJson);
      }).toThrowRuntimeError();
    });

    it("getProperty and setProperty work for binary properties", function () {
      const propertyScalarBinary = new Float64Array([0, 1]);
      const propertyVec2Binary = new Float32Array([2, 3, 4, 5]);
      const propertyVec3Binary = new Int32Array([6, 7, 8, 9, 10, 11]);
      const propertyVec4Binary = new Uint32Array([
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
      ]);
      const propertyMat2Binary = new Int16Array([
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
      ]);
      const propertyMat3Binary = new Uint16Array([
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
      ]);
      const propertyMat4Binary = new Uint8Array([
        46,
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        64,
        65,
        66,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        75,
        76,
        77,
      ]);

      const buffers = [
        propertyScalarBinary,
        propertyVec2Binary,
        propertyVec3Binary,
        propertyVec4Binary,
        propertyMat2Binary,
        propertyMat3Binary,
        propertyMat4Binary,
      ];
      const batchTableBinary = concatTypedArrays(buffers);
      const batchTableJson = {
        propertyScalar: {
          byteOffset: 0,
          componentType: "DOUBLE",
          type: "SCALAR",
        },
        propertyVec2: {
          byteOffset: 16,
          componentType: "FLOAT",
          type: "VEC2",
        },
        propertyVec3: {
          byteOffset: 32,
          componentType: "INT",
          type: "VEC3",
        },
        propertyVec4: {
          byteOffset: 56,
          componentType: "UNSIGNED_INT",
          type: "VEC4",
        },
        propertyMat2: {
          byteOffset: 88,
          componentType: "SHORT",
          type: "MAT2",
        },
        propertyMat3: {
          byteOffset: 104,
          componentType: "UNSIGNED_SHORT",
          type: "MAT3",
        },
        propertyMat4: {
          byteOffset: 140,
          componentType: "UNSIGNED_BYTE",
          type: "MAT4",
        },
      };

      const batchTable = new Cesium3DTileBatchTable(
        mockTileset,
        2,
        batchTableJson,
        batchTableBinary
      );

      expect(batchTable.getProperty(1, "propertyScalar")).toEqual(1);
      expect(batchTable.getProperty(1, "propertyVec2")).toEqual(
        new Cartesian2(4, 5)
      );
      expect(batchTable.getProperty(1, "propertyVec3")).toEqual(
        new Cartesian3(9, 10, 11)
      );
      expect(batchTable.getProperty(1, "propertyVec4")).toEqual(
        new Cartesian4(16, 17, 18, 19)
      );
      expect(batchTable.getProperty(1, "propertyMat2")).toEqual(
        new Matrix2(24, 26, 25, 27)
      ); // Constructor is row-major, data is column major
      expect(batchTable.getProperty(1, "propertyMat3")).toEqual(
        new Matrix3(37, 40, 43, 38, 41, 44, 39, 42, 45)
      ); // Constructor is row-major, data is column major
      expect(batchTable.getProperty(1, "propertyMat4")).toEqual(
        new Matrix4(
          62,
          66,
          70,
          74,
          63,
          67,
          71,
          75,
          64,
          68,
          72,
          76,
          65,
          69,
          73,
          77
        )
      ); // Constructor is row-major, data is column major

      batchTable.setProperty(1, "propertyScalar", 2);
      batchTable.setProperty(1, "propertyVec2", new Cartesian2(5, 6));
      batchTable.setProperty(1, "propertyVec3", new Cartesian3(10, 11, 12));
      batchTable.setProperty(1, "propertyVec4", new Cartesian4(17, 18, 19, 20));
      batchTable.setProperty(1, "propertyMat2", new Matrix2(25, 27, 26, 28));
      batchTable.setProperty(
        1,
        "propertyMat3",
        new Matrix3(38, 41, 44, 39, 42, 45, 40, 43, 46)
      );
      batchTable.setProperty(
        1,
        "propertyMat4",
        new Matrix4(
          63,
          67,
          71,
          75,
          64,
          68,
          72,
          76,
          65,
          69,
          73,
          77,
          66,
          70,
          74,
          78
        )
      );

      expect(batchTable.getProperty(1, "propertyScalar")).toEqual(2);
      expect(batchTable.getProperty(1, "propertyVec2")).toEqual(
        new Cartesian2(5, 6)
      );
      expect(batchTable.getProperty(1, "propertyVec3")).toEqual(
        new Cartesian3(10, 11, 12)
      );
      expect(batchTable.getProperty(1, "propertyVec4")).toEqual(
        new Cartesian4(17, 18, 19, 20)
      );
      expect(batchTable.getProperty(1, "propertyMat2")).toEqual(
        new Matrix2(25, 27, 26, 28)
      );
      expect(batchTable.getProperty(1, "propertyMat3")).toEqual(
        new Matrix3(38, 41, 44, 39, 42, 45, 40, 43, 46)
      );
      expect(batchTable.getProperty(1, "propertyMat4")).toEqual(
        new Matrix4(
          63,
          67,
          71,
          75,
          64,
          68,
          72,
          76,
          65,
          69,
          73,
          77,
          66,
          70,
          74,
          78
        )
      );
    });

    it("renders tileset with batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;

          // Each feature in the b3dm file has an id property from 0 to 9,
          // check that the 2nd resource has an id of 2
          expect(content.getFeature(2).getProperty("id")).toEqual(2);

          // Check that a property can be an array
          expect(content.getFeature(2).getProperty("rooms")).toEqual([
            "room2_a",
            "room2_b",
            "room2_c",
          ]);

          // Check that a property can be an object
          expect(content.getFeature(2).getProperty("info")).toEqual({
            name: "building2",
            year: 2,
          });

          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders tileset without batch table", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;

          expect(content.getFeature(2).getProperty("id")).toBeUndefined();

          Cesium3DTilesTester.expectRenderTileset(scene, tileset);
        }
      );
    });

    it("renders when vertex texture fetch is not supported", function () {
      // Disable VTF
      const maximumVertexTextureImageUnits =
        ContextLimits.maximumVertexTextureImageUnits;
      ContextLimits._maximumVertexTextureImageUnits = 0;

      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);

          // Re-enable VTF
          ContextLimits._maximumVertexTextureImageUnits = maximumVertexTextureImageUnits;
        }
      );
    });

    it("renders with featuresLength greater than maximumTextureSize", function () {
      // Set maximum texture size to 4 temporarily. Batch length of b3dm file is 10.
      const maximumTextureSize = ContextLimits.maximumTextureSize;
      ContextLimits._maximumTextureSize = 4;

      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          expect(content.featuresLength).toBeGreaterThan(
            ContextLimits._maximumTextureSize
          );
          Cesium3DTilesTester.expectRenderTileset(scene, tileset);

          // Reset maximum texture size
          ContextLimits._maximumTextureSize = maximumTextureSize;
        }
      );
    });

    it("renders with featuresLength of zero", function () {
      return Cesium3DTilesTester.loadTileset(scene, noBatchIdsUrl).then(
        function (tileset) {
          Cesium3DTilesTester.expectRender(scene, tileset);

          expect(scene).toPickAndCall(function (result) {
            expect(result).toBeDefined();
            expect(result.primitive).toBe(tileset);
          });
        }
      );
    });

    function expectRenderTranslucent(tileset) {
      const batchTable = tileset.root.content.batchTable;

      // Get initial color
      let opaqueColor;
      Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
        opaqueColor = rgba;
      });

      // Render translucent
      batchTable.setAllColor(new Color(1.0, 1.0, 1.0, 0.5));
      Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
        expect(rgba).not.toEqual(opaqueColor);
      });

      // Render restored to opaque
      batchTable.setAllColor(Color.WHITE);
      Cesium3DTilesTester.expectRender(scene, tileset, function (rgba) {
        expect(rgba).toEqual(opaqueColor);
      });

      // Generate both translucent and opaque commands
      batchTable.setColor(0, new Color(1.0, 1.0, 1.0, 0.5));
      Cesium3DTilesTester.expectRender(scene, tileset);

      // Fully transparent
      batchTable.setAllColor(new Color(1.0, 1.0, 1.0, 0.0));
      Cesium3DTilesTester.expectRenderBlank(scene, tileset);
    }

    it("renders translucent style", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          expectRenderTranslucent(tileset);
        }
      );
    });

    it("renders translucent style when vertex texture fetch is not supported", function () {
      // Disable VTF
      const maximumVertexTextureImageUnits =
        ContextLimits.maximumVertexTextureImageUnits;
      ContextLimits._maximumVertexTextureImageUnits = 0;
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          expectRenderTranslucent(tileset);
          // Re-enable VTF
          ContextLimits._maximumVertexTextureImageUnits = maximumVertexTextureImageUnits;
        }
      );
    });

    it("isExactClass throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.isExactClass();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.isExactClass(1, "door");
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.isExactClass(-1, "door");
      }).toThrowDeveloperError();
    });

    it("isExactClass throws with undefined className", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.isExactClass(0);
      }).toThrowDeveloperError();
    });

    it("isClass throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.isClass();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.isClass(1, "door");
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.isClass(-1, "door");
      }).toThrowDeveloperError();
    });

    it("isClass throws with undefined className", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.isClass(0);
      }).toThrowDeveloperError();
    });

    it("getExactClassName throws with invalid batchId", function () {
      const batchTable = new Cesium3DTileBatchTable(mockTileset, 1);
      expect(function () {
        batchTable.getExactClassName();
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getExactClassName(1);
      }).toThrowDeveloperError();
      expect(function () {
        batchTable.getExactClassName(-1);
      }).toThrowDeveloperError();
    });

    function checkHierarchyStyling(tileset) {
      // Check that a feature is colored from a generic batch table property.
      tileset.style = new Cesium3DTileStyle({
        color: "${height} === 6.0 ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check that a feature is colored from a class property.
      tileset.style = new Cesium3DTileStyle({
        color: "${roof_name} === 'roof2' ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check that a feature is colored from an inherited property.
      tileset.style = new Cesium3DTileStyle({
        color:
          "${building_name} === 'building2' ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check isExactClass
      tileset.style = new Cesium3DTileStyle({
        color: "isExactClass('roof') ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });
      tileset.style = new Cesium3DTileStyle({
        color: "isExactClass('door') ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[1]).toBeGreaterThan(1); // Expect green
      });

      // Check isClass
      tileset.style = new Cesium3DTileStyle({
        color: "isClass('roof') ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });
      tileset.style = new Cesium3DTileStyle({
        color: "isClass('zone') ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check getExactClassName
      tileset.style = new Cesium3DTileStyle({
        color: "getExactClassName() === 'roof' ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });
      tileset.style = new Cesium3DTileStyle({
        color: "getExactClassName() === 'zone' ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[1]).toBeGreaterThan(0); // Expect green
      });
    }

    function checkHierarchyStylingNoParents(tileset) {
      // Check that a feature is colored from a generic batch table property.
      tileset.style = new Cesium3DTileStyle({
        color: "${height} === 6.0 ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check that a feature is colored from a class property.
      tileset.style = new Cesium3DTileStyle({
        color: "${roof_name} === 'roof2' ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check isExactClass
      tileset.style = new Cesium3DTileStyle({
        color: "isExactClass('roof') ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check isClass
      tileset.style = new Cesium3DTileStyle({
        color: "isClass('roof') ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });

      // Check getExactClassName
      tileset.style = new Cesium3DTileStyle({
        color: "getExactClassName() === 'roof' ? color('red') : color('green')",
      });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0); // Expect red
      });
    }

    function checkHierarchyProperties(tileset, multipleParents) {
      // Check isExactClass, isClass, and getExactClassName in Cesium3DTileFeature
      const content = tileset.root.content;
      const batchTable = content.batchTable;
      const hierarchy = batchTable._batchTableHierarchy;

      const doorFeature = content.getFeature(4);
      const roofFeature = content.getFeature(8);
      expect(doorFeature.isExactClass("door")).toBe(true);
      expect(doorFeature.isExactClass("building")).toBe(false);
      expect(doorFeature.isClass("door")).toBe(true);
      expect(doorFeature.isClass("doorknob")).toBe(false);
      expect(doorFeature.isClass("building")).toBe(true);
      expect(doorFeature.getExactClassName()).toBe("door");
      expect(doorFeature.hasProperty("door_name")).toBe(true);
      expect(doorFeature.hasProperty("height")).toBe(true);

      // Includes batch table properties and hierarchy properties from all inherited classes
      const expectedPropertyNames = [
        "height",
        "area",
        "door_mass",
        "door_width",
        "door_name",
        "building_area",
        "building_name",
        "zone_buildings",
        "zone_name",
      ];

      // door0 has two parents - building0 and classifier_old
      // building0 has two parents - zone0 and classifier_new
      if (multipleParents) {
        expectedPropertyNames.push("year", "color", "name", "architect"); // classier_new
        expectedPropertyNames.push("description", "inspection"); // classifier_old
      }

      const propertyNames = doorFeature.getPropertyNames();
      expect(expectedPropertyNames.sort()).toEqual(propertyNames.sort());

      expect(doorFeature.getProperty("height")).toBe(5.0); // Gets generic property
      expect(doorFeature.getProperty("door_name")).toBe("door0"); // Gets class property
      expect(doorFeature.getProperty("building_name")).toBe("building0"); // Gets inherited property

      // Sets generic property
      doorFeature.setProperty("height", 10.0);
      expect(doorFeature.getProperty("height")).toBe(10.0);

      // Sets class property
      doorFeature.setProperty("door_name", "new_door");
      expect(doorFeature.getProperty("door_name")).toBe("new_door");
      expect(roofFeature.getProperty("door_name")).toBeUndefined();

      // Throws error when setting inherited property
      expect(function () {
        doorFeature.setProperty("building_name", "new_building");
      }).toThrowDeveloperError();

      // Check properties when there is no hierarchy
      batchTable._batchTableHierarchy = undefined;
      expect(doorFeature.isExactClass("door")).toBe(false);
      expect(doorFeature.isClass("door")).toBe(false);
      expect(doorFeature.getExactClassName()).toBeUndefined();
      expect(doorFeature.hasProperty("door_name")).toBe(false);
      expect(doorFeature.hasProperty("height")).toBe(true);
      expect(doorFeature.getPropertyNames()).toEqual(["height", "area"]);
      expect(doorFeature.getProperty("height")).toBe(10.0);
      expect(doorFeature.getProperty("door_name")).toBeUndefined();
      expect(doorFeature.getProperty("building_name")).toBeUndefined();
      batchTable._batchTableHierarchy = hierarchy;
    }

    function checkHierarchyPropertiesNoParents(tileset) {
      // Check isExactClass, isClass, and getExactClassName in Cesium3DTileFeature
      const content = tileset.root.content;
      const doorFeature = content.getFeature(4);
      expect(doorFeature.isExactClass("door")).toBe(true);
      expect(doorFeature.isExactClass("doorknob")).toBe(false);
      expect(doorFeature.isClass("door")).toBe(true);
      expect(doorFeature.isClass("doorknob")).toBe(false);
      expect(doorFeature.getExactClassName()).toBe("door");
      expect(doorFeature.hasProperty("door_name")).toBe(true);
      expect(doorFeature.hasProperty("height")).toBe(true);

      // Includes batch table properties and hierarchy properties from all inherited classes
      const expectedPropertyNames = [
        "height",
        "area",
        "door_mass",
        "door_width",
        "door_name",
      ];

      const propertyNames = doorFeature.getPropertyNames();
      expect(expectedPropertyNames.sort()).toEqual(propertyNames.sort());

      expect(doorFeature.getProperty("height")).toBe(5.0); // Gets generic property
      expect(doorFeature.getProperty("door_name")).toBe("door0"); // Gets class property

      // Sets generic property
      doorFeature.setProperty("height", 10.0);
      expect(doorFeature.getProperty("height")).toBe(10.0);

      // Sets class property
      doorFeature.setProperty("door_name", "new_door");
      expect(doorFeature.getProperty("door_name")).toBe("new_door");
    }

    function checkBatchTableHierarchy(url, multipleParents) {
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        checkHierarchyStyling(tileset);
        checkHierarchyProperties(tileset, multipleParents);
      });
    }

    function checkBatchTableHierarchyNoParents(url) {
      return Cesium3DTilesTester.loadTileset(scene, url).then(function (
        tileset
      ) {
        checkHierarchyStylingNoParents(tileset);
        checkHierarchyPropertiesNoParents(tileset);
      });
    }

    it("renders tileset with batch table hierarchy extension", function () {
      return checkBatchTableHierarchy(batchTableHierarchyUrl, false);
    });

    it("renders tileset with batch table hierarchy using binary properties", function () {
      return checkBatchTableHierarchy(batchTableHierarchyBinaryUrl, true);
    });

    it("renders tileset with batch table hierarchy with multiple parent classes", function () {
      return checkBatchTableHierarchy(
        batchTableHierarchyMultipleParentsUrl,
        true
      );
    });

    it("renders tileset with batch table hierarchy with no parents", function () {
      return checkBatchTableHierarchyNoParents(batchTableHierarchyNoParentsUrl);
    });

    it("renders tileset with legacy batch table hierarchy (pre-version 1.0)", function () {
      return checkBatchTableHierarchy(batchTableHierarchyLegacyUrl, false);
    });

    it("warns about deprecated batch hierarchy (pre-version 1.0)", function () {
      return checkBatchTableHierarchy(batchTableHierarchyLegacyUrl, false).then(
        function (tileset) {
          expect(Cesium3DTileBatchTable._deprecationWarning).toHaveBeenCalled();
        }
      );
    });

    it("destroys", function () {
      return Cesium3DTilesTester.loadTileset(scene, withoutBatchTableUrl).then(
        function (tileset) {
          const content = tileset.root.content;
          const batchTable = content.batchTable;
          expect(batchTable.isDestroyed()).toEqual(false);
          scene.primitives.remove(tileset);
          expect(batchTable.isDestroyed()).toEqual(true);
        }
      );
    });
  },
  "WebGL"
);
