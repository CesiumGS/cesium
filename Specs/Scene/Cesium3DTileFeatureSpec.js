import {
  Cartesian3,
  Cartesian4,
  Cesium3DTileFeature,
  Ellipsoid,
  HeadingPitchRange,
  Math as CesiumMath,
  Rectangle,
} from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/Cesium3DTileFeature",
  function () {
    describe("polylinePositions", function () {
      const vectorPolylinesWithBatchIds =
        "./Data/Cesium3DTiles/Vector/VectorTilePolylinesWithBatchIds/tileset.json";
      const b3dmWithBatchIds =
        "Data/Cesium3DTiles/Batched/BatchedWithBatchTable/tileset.json";

      let scene;
      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      beforeEach(function () {
        scene.primitives.removeAll();
      });

      it("polylinePositions gets positions for polyline vector data", function () {
        const tilesetRectangle = Rectangle.fromDegrees(
          -0.01,
          -0.01,
          0.01,
          0.01
        );
        const ellipsoid = Ellipsoid.WGS84;
        scene.camera.lookAt(
          ellipsoid.cartographicToCartesian(Rectangle.center(tilesetRectangle)),
          new Cartesian3(0.0, 0.0, 0.01)
        );
        return Cesium3DTilesTester.loadTileset(
          scene,
          vectorPolylinesWithBatchIds,
          {
            vectorKeepDecodedPositions: true,
          }
        ).then(function (tileset) {
          const feature = tileset.root.content.getFeature(0);
          const polylinePositions = feature.polylinePositions;
          expect(polylinePositions.length).toBe(60);
          expect(polylinePositions[0]).toEqualEpsilon(
            6378136.806372941,
            CesiumMath.EPSILON7
          );
          expect(polylinePositions[1]).toEqualEpsilon(
            -1113.194885441724,
            CesiumMath.EPSILON7
          );
          expect(polylinePositions[2]).toEqualEpsilon(
            1105.675261474196,
            CesiumMath.EPSILON7
          );
        });
      });

      it("polylinePositions returns undefined for non polyline features", function () {
        const centerLongitude = -1.31968;
        const centerLatitude = 0.698874;
        const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));

        return Cesium3DTilesTester.loadTileset(scene, b3dmWithBatchIds, {
          vectorKeepDecodedPositions: true,
        }).then(function (tileset) {
          const feature = tileset.root.content.getFeature(0);
          const polylinePositions = feature.polylinePositions;
          expect(polylinePositions).toBeUndefined();
        });
      });
    });

    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;
    const headingPitchRange = new HeadingPitchRange(0.0, -1.57, 15.0);

    describe("metadata", function () {
      const tilesetWithMetadataUrl =
        "Data/Cesium3DTiles/Metadata/AllMetadataTypes/tileset_1.1.json";

      let scene;
      let tileset;

      beforeAll(function () {
        scene = createScene();

        const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, headingPitchRange);

        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithMetadataUrl
        ).then(function (result) {
          tileset = result;
        });
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      let parentContent;
      const childContents = {};
      beforeEach(function () {
        parentContent = tileset.root.content;
        const children = tileset.root.children;

        children.forEach(function (child) {
          const uri = child._header.content.uri;
          childContents[uri] = child.content;
        });
      });

      it("getPropertyInherited returns undefined for unknown property", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("unknown")).not.toBeDefined();
      });

      it("getPropertyInherited returns content property by semantic", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("HIGHLIGHT_COLOR")).toEqual(
          new Cartesian4(255, 0, 0, 1.0)
        );
      });

      it("getPropertyInherited returns content property", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("HIGHLIGHT_COLOR")).toEqual(
          new Cartesian4(255, 0, 0, 1.0)
        );
        expect(feature.getPropertyInherited("triangleCount")).toBe(15000);
      });

      it("getPropertyInherited returns tile property by semantic", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("COLOR")).toEqual(
          new Cartesian4(255, 255, 0, 1.0)
        );
      });

      it("getPropertyInherited returns tile property", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("color")).toEqual(
          new Cartesian4(255, 255, 0, 1.0)
        );
        expect(feature.getPropertyInherited("population")).toBe(50);
      });

      it("getPropertyInherited returns group property by semantic", function () {
        let feature = new Cesium3DTileFeature(childContents["lr.b3dm"], 0);
        expect(feature.getPropertyInherited("GROUP_NAME")).toBe("commercial");
        feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("GROUP_NAME")).toBe("residential");
      });

      it("getPropertyInherited returns group property", function () {
        const feature = new Cesium3DTileFeature(childContents["lr.b3dm"], 0);
        expect(feature.getPropertyInherited("majorIndustries")).toEqual([
          "Finance",
          "Manufacturing",
        ]);
        expect(feature.getPropertyInherited("businessCount")).toBe(143);
      });

      it("getPropertyInherited returns tileset property by semantic", function () {
        const feature = new Cesium3DTileFeature(parentContent, 0);
        expect(feature.getPropertyInherited("DATE_ISO_8601")).toBe(
          "2021-04-07"
        );
        expect(feature.getPropertyInherited("AUTHOR")).toBe("Cesium");
      });

      it("getPropertyInherited returns tileset property", function () {
        const feature = new Cesium3DTileFeature(parentContent, 0);
        expect(feature.getPropertyInherited("centerCartographic")).toEqual(
          new Cartesian3(
            -1.3196816996258511,
            0.6988767486400521,
            45.78600543644279
          )
        );
        expect(feature.getPropertyInherited("date")).toBe("2021-04-07");
        expect(feature.getPropertyInherited("author")).toBe("Cesium");
        expect(feature.getPropertyInherited("tileCount")).toBe(5);
      });

      it("resolves conflicting names from most specific to most general", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        // content metadata is more specific than tile metadata so this returns
        // red not cyan
        expect(feature.getPropertyInherited("highlightColor")).toEqual(
          new Cartesian4(255, 0, 0, 1.0)
        );

        // content metadata is more specific than tileset metadata so this returns
        // "First Author" instead of "Cesium"
        expect(feature.getPropertyInherited("author")).toEqual("First Author");

        // tile metadata is more specific than tileset metadata so this returns
        // yellow not magenta
        expect(feature.getPropertyInherited("color")).toEqual(
          new Cartesian4(255, 255, 0, 1.0)
        );

        // group metadata is more specific than tileset metadata, so this returns
        // 2 not 5
        expect(feature.getPropertyInherited("tileCount")).toEqual(2);
      });
    });

    describe("3DTILES_metadata", function () {
      const tilesetWithMetadataExtensionUrl =
        "Data/Cesium3DTiles/Metadata/AllMetadataTypes/tileset_1.0.json";

      let scene;
      let tileset;

      beforeAll(function () {
        scene = createScene();

        const center = Cartesian3.fromRadians(centerLongitude, centerLatitude);
        scene.camera.lookAt(center, headingPitchRange);

        return Cesium3DTilesTester.loadTileset(
          scene,
          tilesetWithMetadataExtensionUrl
        ).then(function (result) {
          tileset = result;
        });
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      let parentContent;
      const childContents = {};
      beforeEach(function () {
        parentContent = tileset.root.content;
        const children = tileset.root.children;

        children.forEach(function (child) {
          const uri = child._header.content.uri;
          childContents[uri] = child.content;
        });
      });

      it("getPropertyInherited returns undefined for unknown property", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("unknown")).not.toBeDefined();
      });

      it("getPropertyInherited returns content property by semantic", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("HIGHLIGHT_COLOR")).toEqual(
          new Cartesian4(255, 0, 0, 1.0)
        );
      });

      it("getPropertyInherited returns content property", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("HIGHLIGHT_COLOR")).toEqual(
          new Cartesian4(255, 0, 0, 1.0)
        );
        expect(feature.getPropertyInherited("triangleCount")).toBe(15000);
      });

      it("getPropertyInherited returns tile property by semantic", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("COLOR")).toEqual(
          new Cartesian4(255, 255, 0, 1.0)
        );
      });

      it("getPropertyInherited returns tile property", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("color")).toEqual(
          new Cartesian4(255, 255, 0, 1.0)
        );
        expect(feature.getPropertyInherited("population")).toBe(50);
      });

      it("getPropertyInherited returns group property by semantic", function () {
        let feature = new Cesium3DTileFeature(childContents["lr.b3dm"], 0);
        expect(feature.getPropertyInherited("GROUP_NAME")).toBe("commercial");
        feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        expect(feature.getPropertyInherited("GROUP_NAME")).toBe("residential");
      });

      it("getPropertyInherited returns group property", function () {
        const feature = new Cesium3DTileFeature(childContents["lr.b3dm"], 0);
        expect(feature.getPropertyInherited("majorIndustries")).toEqual([
          "Finance",
          "Manufacturing",
        ]);
        expect(feature.getPropertyInherited("businessCount")).toBe(143);
      });

      it("getPropertyInherited returns tileset property by semantic", function () {
        const feature = new Cesium3DTileFeature(parentContent, 0);
        expect(feature.getPropertyInherited("DATE_ISO_8601")).toBe(
          "2021-04-07"
        );
        expect(feature.getPropertyInherited("AUTHOR")).toBe("Cesium");
      });

      it("getPropertyInherited returns tileset property", function () {
        const feature = new Cesium3DTileFeature(parentContent, 0);
        expect(feature.getPropertyInherited("centerCartographic")).toEqual(
          new Cartesian3(
            -1.3196816996258511,
            0.6988767486400521,
            45.78600543644279
          )
        );
        expect(feature.getPropertyInherited("date")).toBe("2021-04-07");
        expect(feature.getPropertyInherited("author")).toBe("Cesium");
        expect(feature.getPropertyInherited("tileCount")).toBe(5);
      });

      it("resolves conflicting names from most specific to most general", function () {
        const feature = new Cesium3DTileFeature(childContents["ll.b3dm"], 0);
        // content metadata is more specific than tile metadata so this returns
        // red not cyan
        expect(feature.getPropertyInherited("highlightColor")).toEqual(
          new Cartesian4(255, 0, 0, 1.0)
        );

        // content metadata is more specific than tileset metadata so this returns
        // "First Author" instead of "Cesium"
        expect(feature.getPropertyInherited("author")).toEqual("First Author");

        // tile metadata is more specific than tileset metadata so this returns
        // yellow not magenta
        expect(feature.getPropertyInherited("color")).toEqual(
          new Cartesian4(255, 255, 0, 1.0)
        );

        // group metadata is more specific than tileset metadata, so this returns
        // 2 not 5
        expect(feature.getPropertyInherited("tileCount")).toEqual(2);
      });
    });

    describe("3DTILES_implicit_tiling metadata", function () {
      describe("subtree metadata", function () {
        const tilesetWithSubtreeMetadataUrl =
          "Data/Cesium3DTiles/Metadata/ImplicitSubtreeMetadata/tileset_1.1.json";
        let scene;
        let tilesetWithSubtree;
        beforeAll(function () {
          scene = createScene();

          const center = Cartesian3.fromRadians(
            centerLongitude,
            centerLatitude
          );
          scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));

          return Cesium3DTilesTester.loadTileset(
            scene,
            tilesetWithSubtreeMetadataUrl
          ).then(function (result) {
            tilesetWithSubtree = result;
          });
        });

        let subtreeRootContent;
        const subtreeChildContents = {};
        beforeEach(function () {
          const rootChildren = tilesetWithSubtree.root.children;
          const rootChild = rootChildren[0];
          subtreeRootContent = rootChild.content;

          const children = rootChild.children;
          children.forEach(function (child) {
            const uri = child._header.content.uri;
            subtreeChildContents[uri] = child.content;
          });
        });

        it("getPropertyInherited returns subtree property by semantic at root level", function () {
          const feature = new Cesium3DTileFeature(subtreeRootContent, 0);
          expect(feature.getPropertyInherited("AUTHOR")).toEqual("Cesium");
        });

        it("getPropertyInherited returns subtree property at root level", function () {
          const feature = new Cesium3DTileFeature(subtreeRootContent, 0);
          expect(feature.getPropertyInherited("author")).toEqual("Cesium");
          expect(feature.getPropertyInherited("credits")).toEqual([
            "Data Company 1",
            "Data Company 2",
            "Data Company 3",
          ]);
        });

        it("getPropertyInherited returns subtree property by semantic at child level", function () {
          const feature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/0/0.b3dm"],
            0
          );
          expect(feature.getPropertyInherited("AUTHOR")).toEqual("Cesium");
        });

        it("getPropertyInherited returns subtree property at root level", function () {
          const feature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/0/0.b3dm"],
            0
          );
          expect(feature.getPropertyInherited("author")).toEqual("Cesium");
          expect(feature.getPropertyInherited("credits")).toEqual([
            "Data Company 1",
            "Data Company 2",
            "Data Company 3",
          ]);
        });

        it("getPropertyInherited returns tile property that is shared by subtree at root level", function () {
          const feature = new Cesium3DTileFeature(subtreeRootContent, 0);
          expect(feature.getPropertyInherited("Height")).toBeInstanceOf(Number);
          expect(feature.getPropertyInherited("Height")).not.toEqual(1000);
        });

        it("getPropertyInherited returns tile property that is shared by subtree at child level", function () {
          const childFeature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/0/0.b3dm"],
            0
          );
          const rootFeature = new Cesium3DTileFeature(subtreeRootContent, 0);

          const childHeight = childFeature.getPropertyInherited("Height");
          const rootHeight = rootFeature.getPropertyInherited("Height");

          expect(rootHeight).toBeInstanceOf(Number);
          expect(childHeight).toBeInstanceOf(Number);

          expect(childHeight).not.toEqual(1000);
          expect(childHeight).not.toEqual(rootHeight);
        });
      });

      describe("implicit content metadata", function () {
        const tilesetWithImplicitContentMetadataUrl =
          "Data/Cesium3DTiles/Metadata/ImplicitContentMetadata/tileset_1.1.json";

        let scene;
        let tilesetWithImplicitContentMetadata;
        beforeAll(function () {
          scene = createScene();

          const center = Cartesian3.fromRadians(
            centerLongitude,
            centerLatitude
          );
          scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
          return Cesium3DTilesTester.loadTileset(
            scene,
            tilesetWithImplicitContentMetadataUrl
          ).then(function (result) {
            tilesetWithImplicitContentMetadata = result;
          });
        });

        let subtreeRootContent;
        const subtreeChildContents = {};
        beforeEach(function () {
          const rootChildren = tilesetWithImplicitContentMetadata.root.children;
          const rootChild = rootChildren[0];
          subtreeRootContent = rootChild.content;

          const children = rootChild.children;
          children.forEach(function (child) {
            const uri = child._header.content.uri;
            subtreeChildContents[uri] = child.content;
          });
        });

        it("getPropertyInherited returns content property by semantic", function () {
          const rootFeature = new Cesium3DTileFeature(subtreeRootContent, 0);
          const childFeature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/0/0.b3dm"],
            0
          );
          expect(rootFeature.getPropertyInherited("_BUILDING_HEIGHT")).toEqual(
            10
          );
          expect(childFeature.getPropertyInherited("_BUILDING_HEIGHT")).toEqual(
            20
          );
        });

        it("getPropertyInherited returns content property", function () {
          const rootFeature = new Cesium3DTileFeature(subtreeRootContent, 0);
          expect(rootFeature.getPropertyInherited("height")).toEqual(10);
          expect(rootFeature.getPropertyInherited("color")).toEqual(
            new Cartesian3(255, 255, 255)
          );
        });

        it("getPropertyInherited returns content property by semantic for different contents", function () {
          const childFeature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/0/0.b3dm"],
            0
          );
          const secondChildFeature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/1/1.b3dm"],
            0
          );
          expect(childFeature.getPropertyInherited("_BUILDING_HEIGHT")).toEqual(
            20
          );
          expect(
            secondChildFeature.getPropertyInherited("_BUILDING_HEIGHT")
          ).toEqual(40);
        });

        it("getPropertyInherited returns content property for different contents", function () {
          const childFeature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/0/0.b3dm"],
            0
          );
          const secondChildFeature = new Cesium3DTileFeature(
            subtreeChildContents["content/1/1/1.b3dm"],
            0
          );

          expect(childFeature.getPropertyInherited("height")).toEqual(20);
          expect(secondChildFeature.getPropertyInherited("height")).toEqual(40);

          expect(childFeature.getPropertyInherited("color")).toEqual(
            new Cartesian3(255, 0, 0)
          );
          expect(secondChildFeature.getPropertyInherited("color")).toEqual(
            new Cartesian3(0, 0, 255)
          );
        });

        it("getPropertyInherited returns tile property with same property name by semantic", function () {
          const feature = new Cesium3DTileFeature(subtreeRootContent, 0);
          expect(feature.getPropertyInherited("Height")).toBeInstanceOf(Number);
          expect(feature.getPropertyInherited("Height")).not.toEqual(10);
        });
      });
    });
  },
  "WebGL"
);
