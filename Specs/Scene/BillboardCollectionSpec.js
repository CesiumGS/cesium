import { BoundingRectangle } from "../../Source/Cesium.js";
import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { createGuid } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import { OrthographicOffCenterFrustum } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Billboard } from "../../Source/Cesium.js";
import { BillboardCollection } from "../../Source/Cesium.js";
import { BlendOption } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { HorizontalOrigin } from "../../Source/Cesium.js";
import { TextureAtlas } from "../../Source/Cesium.js";
import { VerticalOrigin } from "../../Source/Cesium.js";
import createGlobe from "../createGlobe.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";
import { when } from "../../Source/Cesium.js";

describe(
  "Scene/BillboardCollection",
  function () {
    var scene;
    var context;
    var camera;
    var billboards;

    var greenImage;
    var blueImage;
    var whiteImage;
    var largeBlueImage;

    beforeAll(function () {
      scene = createScene();
      context = scene.context;
      camera = scene.camera;

      return when.join(
        Resource.fetchImage("./Data/Images/Green2x2.png").then(function (
          result
        ) {
          greenImage = result;
        }),
        Resource.fetchImage("./Data/Images/Blue2x2.png").then(function (
          result
        ) {
          blueImage = result;
        }),
        Resource.fetchImage("./Data/Images/White2x2.png").then(function (
          result
        ) {
          whiteImage = result;
        }),
        Resource.fetchImage("./Data/Images/Blue10x10.png").then(function (
          result
        ) {
          largeBlueImage = result;
        })
      );
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0);

      camera.position = new Cartesian3(10.0, 0.0, 0.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);

      billboards = new BillboardCollection();
      scene.primitives.add(billboards);
    });

    afterEach(function () {
      // billboards are destroyed by removeAll().
      scene.primitives.removeAll();
    });

    it("constructs a default billboard", function () {
      var b = billboards.add();
      expect(b.show).toEqual(true);
      expect(b.position).toEqual(Cartesian3.ZERO);
      expect(b.pixelOffset).toEqual(Cartesian2.ZERO);
      expect(b.eyeOffset).toEqual(Cartesian3.ZERO);
      expect(b.horizontalOrigin).toEqual(HorizontalOrigin.CENTER);
      expect(b.verticalOrigin).toEqual(VerticalOrigin.CENTER);
      expect(b.scale).toEqual(1.0);
      expect(b.image).toBeUndefined();
      expect(b.color.red).toEqual(1.0);
      expect(b.color.green).toEqual(1.0);
      expect(b.color.blue).toEqual(1.0);
      expect(b.color.alpha).toEqual(1.0);
      expect(b.rotation).toEqual(0.0);
      expect(b.alignedAxis).toEqual(Cartesian3.ZERO);
      expect(b.scaleByDistance).toBeUndefined();
      expect(b.translucencyByDistance).toBeUndefined();
      expect(b.pixelOffsetScaleByDistance).toBeUndefined();
      expect(b.width).toBeUndefined();
      expect(b.height).toBeUndefined();
      expect(b.id).toBeUndefined();
      expect(b.heightReference).toEqual(HeightReference.NONE);
      expect(b.sizeInMeters).toEqual(false);
      expect(b.distanceDisplayCondition).toBeUndefined();
      expect(b.disableDepthTestDistance).toBeUndefined();
    });

    it("can add and remove before first update.", function () {
      var b = billboards.add();
      billboards.remove(b);
      scene.renderForSpecs();
    });

    it("explicitly constructs a billboard", function () {
      var b = billboards.add({
        show: false,
        position: new Cartesian3(1.0, 2.0, 3.0),
        pixelOffset: new Cartesian2(1.0, 2.0),
        eyeOffset: new Cartesian3(1.0, 2.0, 3.0),
        horizontalOrigin: HorizontalOrigin.LEFT,
        verticalOrigin: VerticalOrigin.BOTTOM,
        scale: 2.0,
        image: greenImage,
        color: {
          red: 1.0,
          green: 2.0,
          blue: 3.0,
          alpha: 4.0,
        },
        rotation: 1.0,
        alignedAxis: Cartesian3.UNIT_Z,
        scaleByDistance: new NearFarScalar(1.0, 3.0, 1.0e6, 0.0),
        translucencyByDistance: new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
        pixelOffsetScaleByDistance: new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
        width: 300.0,
        height: 200.0,
        sizeInMeters: true,
        distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
        disableDepthTestDistance: 10.0,
        id: "id",
      });

      expect(b.show).toEqual(false);
      expect(b.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
      expect(b.pixelOffset).toEqual(new Cartesian2(1.0, 2.0));
      expect(b.eyeOffset).toEqual(new Cartesian3(1.0, 2.0, 3.0));
      expect(b.horizontalOrigin).toEqual(HorizontalOrigin.LEFT);
      expect(b.verticalOrigin).toEqual(VerticalOrigin.BOTTOM);
      expect(b.scale).toEqual(2.0);
      expect(b.image).toEqual(b._imageId);
      expect(b.color.red).toEqual(1.0);
      expect(b.color.green).toEqual(2.0);
      expect(b.color.blue).toEqual(3.0);
      expect(b.color.alpha).toEqual(4.0);
      expect(b.rotation).toEqual(1.0);
      expect(b.alignedAxis).toEqual(Cartesian3.UNIT_Z);
      expect(b.scaleByDistance).toEqual(
        new NearFarScalar(1.0, 3.0, 1.0e6, 0.0)
      );
      expect(b.translucencyByDistance).toEqual(
        new NearFarScalar(1.0, 1.0, 1.0e6, 0.0)
      );
      expect(b.pixelOffsetScaleByDistance).toEqual(
        new NearFarScalar(1.0, 1.0, 1.0e6, 0.0)
      );
      expect(b.width).toEqual(300.0);
      expect(b.height).toEqual(200.0);
      expect(b.sizeInMeters).toEqual(true);
      expect(b.distanceDisplayCondition).toEqual(
        new DistanceDisplayCondition(10.0, 100.0)
      );
      expect(b.disableDepthTestDistance).toEqual(10.0);
      expect(b.id).toEqual("id");
    });

    it("sets billboard properties", function () {
      var b = billboards.add();
      b.show = false;
      b.position = new Cartesian3(1.0, 2.0, 3.0);
      b.pixelOffset = new Cartesian2(1.0, 2.0);
      b.eyeOffset = new Cartesian3(1.0, 2.0, 3.0);
      b.horizontalOrigin = HorizontalOrigin.LEFT;
      b.verticalOrigin = VerticalOrigin.BOTTOM;
      b.scale = 2.0;
      b.image = greenImage;
      b.color = new Color(1.0, 2.0, 3.0, 4.0);
      b.rotation = 1.0;
      b.alignedAxis = Cartesian3.UNIT_Z;
      b.width = 300.0;
      b.height = 200.0;
      b.scaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
      b.translucencyByDistance = new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0);
      b.pixelOffsetScaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
      b.sizeInMeters = true;
      b.distanceDisplayCondition = new DistanceDisplayCondition(10.0, 100.0);
      b.disableDepthTestDistance = 10.0;

      expect(b.show).toEqual(false);
      expect(b.position).toEqual(new Cartesian3(1.0, 2.0, 3.0));
      expect(b.pixelOffset).toEqual(new Cartesian2(1.0, 2.0));
      expect(b.eyeOffset).toEqual(new Cartesian3(1.0, 2.0, 3.0));
      expect(b.horizontalOrigin).toEqual(HorizontalOrigin.LEFT);
      expect(b.verticalOrigin).toEqual(VerticalOrigin.BOTTOM);
      expect(b.scale).toEqual(2.0);
      expect(b.image).toEqual(b._imageId);
      expect(b.color.red).toEqual(1.0);
      expect(b.color.green).toEqual(2.0);
      expect(b.color.blue).toEqual(3.0);
      expect(b.color.alpha).toEqual(4.0);
      expect(b.rotation).toEqual(1.0);
      expect(b.alignedAxis).toEqual(Cartesian3.UNIT_Z);
      expect(b.scaleByDistance).toEqual(
        new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0)
      );
      expect(b.translucencyByDistance).toEqual(
        new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0)
      );
      expect(b.pixelOffsetScaleByDistance).toEqual(
        new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0)
      );
      expect(b.width).toEqual(300.0);
      expect(b.height).toEqual(200.0);
      expect(b.sizeInMeters).toEqual(true);
      expect(b.distanceDisplayCondition).toEqual(
        new DistanceDisplayCondition(10.0, 100.0)
      );
      expect(b.disableDepthTestDistance).toEqual(10.0);
    });

    it("required properties throw for undefined", function () {
      var b = billboards.add();
      b.show = false;
      b.position = new Cartesian3(1.0, 2.0, 3.0);
      b.pixelOffset = new Cartesian2(1.0, 2.0);
      b.eyeOffset = new Cartesian3(1.0, 2.0, 3.0);
      b.horizontalOrigin = HorizontalOrigin.LEFT;
      b.verticalOrigin = VerticalOrigin.BOTTOM;
      b.scale = 2.0;
      b.color = new Color(1.0, 2.0, 3.0, 4.0);
      b.rotation = 1.0;
      b.alignedAxis = Cartesian3.UNIT_Z;
      b.sizeInMeters = true;

      expect(function () {
        b.show = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.position = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.pixelOffset = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.eyeOffset = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.horizontalOrigin = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.verticalOrigin = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.scale = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.color = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.rotation = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.alignedAxis = undefined;
      }).toThrowDeveloperError();
      expect(function () {
        b.sizeInMeters = undefined;
      }).toThrowDeveloperError();
    });

    it("optional properties handle undefined gracefully", function () {
      var b = billboards.add();
      b.image = greenImage;
      b.width = 300.0;
      b.height = 200.0;
      b.scaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
      b.translucencyByDistance = new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0);
      b.pixelOffsetScaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
      b.distanceDisplayCondition = new DistanceDisplayCondition(10.0, 100.0);
      b.disableDepthTestDistance = 10.0;

      b.image = undefined;
      b.width = undefined;
      b.height = undefined;
      b.scaleByDistance = undefined;
      b.translucencyByDistance = undefined;
      b.pixelOffsetScaleByDistance = undefined;
      b.distanceDisplayCondition = undefined;
      b.disableDepthTestDistance = undefined;

      expect(b.image).not.toBeDefined();
      expect(b.width).not.toBeDefined();
      expect(b.height).not.toBeDefined();
      expect(b.scaleByDistance).not.toBeDefined();
      expect(b.translucencyByDistance).not.toBeDefined();
      expect(b.pixelOffsetScaleByDistance).not.toBeDefined();
      expect(b.distanceDisplayCondition).not.toBeDefined();
      expect(b.disableDepthTestDistance).not.toBeDefined();
    });

    it("properties throw for incorrect types", function () {
      var b = billboards.add();
      b.show = false;
      b.position = new Cartesian3(1.0, 2.0, 3.0);
      b.pixelOffset = new Cartesian2(1.0, 2.0);
      b.eyeOffset = new Cartesian3(1.0, 2.0, 3.0);
      b.horizontalOrigin = HorizontalOrigin.LEFT;
      b.verticalOrigin = VerticalOrigin.BOTTOM;
      b.scale = 2.0;
      b.color = new Color(1.0, 2.0, 3.0, 4.0);
      b.rotation = 1.0;
      b.alignedAxis = Cartesian3.UNIT_Z;
      b.width = 300.0;
      b.height = 200.0;
      b.scaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
      b.translucencyByDistance = new NearFarScalar(1.0e6, 1.0, 1.0e8, 0.0);
      b.pixelOffsetScaleByDistance = new NearFarScalar(1.0e6, 3.0, 1.0e8, 0.0);
      b.sizeInMeters = true;
      b.distanceDisplayCondition = new DistanceDisplayCondition(10.0, 100.0);
      b.disableDepthTestDistance = 10.0;

      expect(function () {
        b.show = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.position = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.pixelOffset = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.eyeOffset = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.horizontalOrigin = "left";
      }).toThrowDeveloperError();
      expect(function () {
        b.verticalOrigin = "bottom";
      }).toThrowDeveloperError();
      expect(function () {
        b.scale = "scale";
      }).toThrowDeveloperError();
      expect(function () {
        b.color = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.rotation = "rotation";
      }).toThrowDeveloperError();
      expect(function () {
        b.alignedAxis = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.width = "100px";
      }).toThrowDeveloperError();
      expect(function () {
        b.height = "300px";
      }).toThrowDeveloperError();
      expect(function () {
        b.scaleByDistance = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.translucencyByDistance = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.pixelOffsetScaleByDistance = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.sizeInMeters = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.distanceDisplayCondition = 10;
      }).toThrowDeveloperError();
      expect(function () {
        b.disableDepthTestDistance = "far";
      }).toThrowDeveloperError();
    });

    it("image property setter creates image with GUID for non-uris", function () {
      var b = billboards.add();
      b.image = 42;
      expect(b.image).not.toBe(42);
      var guidLength = 36; // 32 hex digits + 4 dashes
      expect(b._imageId.length).toBe(guidLength);
    });

    it("is not destroyed", function () {
      expect(billboards.isDestroyed()).toEqual(false);
    });

    it("renders billboard in multiple passes", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });
      camera.position = new Cartesian3(2.0, 0.0, 0.0);

      var frameState = scene.frameState;
      frameState.commandList.length = 0;
      billboards.blendOption = BlendOption.OPAQUE_AND_TRANSLUCENT;
      billboards.update(frameState);
      expect(frameState.commandList.length).toEqual(2);

      frameState.commandList.length = 0;
      billboards.blendOption = BlendOption.OPAQUE;
      billboards.update(frameState);
      expect(frameState.commandList.length).toEqual(1);

      frameState.commandList.length = 0;
      billboards.blendOption = BlendOption.TRANSLUCENT;
      billboards.update(frameState);
      expect(frameState.commandList.length).toEqual(1);
    });

    it("renders billboard with sizeInMeters", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
        width: 2.0,
        height: 2.0,
        sizeInMeters: true,
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([0, 255, 0, 255]);

      camera.position = new Cartesian3(1e6, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("disables billboard scaleByDistance", function () {
      var b = billboards.add({
        scaleByDistance: new NearFarScalar(1.0, 3.0, 1.0e6, 0.0),
      });
      b.scaleByDistance = undefined;
      expect(b.scaleByDistance).toBeUndefined();
    });

    it("disables billboard translucencyByDistance", function () {
      var b = billboards.add({
        translucencyByDistance: new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
      });
      b.translucencyByDistance = undefined;
      expect(b.translucencyByDistance).toBeUndefined();
    });

    it("disables billboard pixelOffsetScaleByDistance", function () {
      var b = billboards.add({
        pixelOffsetScaleByDistance: new NearFarScalar(1.0, 1.0, 1.0e6, 0.0),
      });
      b.pixelOffsetScaleByDistance = undefined;
      expect(b.pixelOffsetScaleByDistance).toBeUndefined();
    });

    it("renders billboard with scaleByDistance", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        scaleByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
        image: greenImage,
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([0, 255, 0, 255]);

      camera.position = new Cartesian3(4.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders billboard with translucencyByDistance", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        translucencyByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
        image: greenImage,
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([0, 255, 0, 255]);

      camera.position = new Cartesian3(4.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders billboard with pixelOffsetScaleByDistance", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        pixelOffset: new Cartesian2(1.0, 0.0),
        pixelOffsetScaleByDistance: new NearFarScalar(2.0, 0.0, 4.0, 1000.0),
        image: greenImage,
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([0, 255, 0, 255]);

      camera.position = new Cartesian3(4.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render billboard if show is false", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
        width: 2.0,
        height: 2.0,
        sizeInMeters: true,
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([0, 255, 0, 255]);

      billboards.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("throws scaleByDistance with nearDistance === farDistance", function () {
      var b = billboards.add();
      var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        b.scaleByDistance = scale;
      }).toThrowDeveloperError();
    });

    it("throws new billboard with invalid scaleByDistance (nearDistance === farDistance)", function () {
      var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        billboards.add({
          scaleByDistance: scale,
        });
      }).toThrowDeveloperError();
    });

    it("throws scaleByDistance with nearDistance > farDistance", function () {
      var b = billboards.add();
      var scale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
      expect(function () {
        b.scaleByDistance = scale;
      }).toThrowDeveloperError();
    });

    it("throws pixelOffsetScaleByDistance with nearDistance === farDistance", function () {
      var b = billboards.add();
      var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        b.pixelOffsetScaleByDistance = scale;
      }).toThrowDeveloperError();
    });

    it("throws new billboard with invalid pixelOffsetScaleByDistance (nearDistance === farDistance)", function () {
      var scale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        billboards.add({
          pixelOffsetScaleByDistance: scale,
        });
      }).toThrowDeveloperError();
    });

    it("throws pixelOffsetScaleByDistance with nearDistance > farDistance", function () {
      var b = billboards.add();
      var scale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
      expect(function () {
        b.pixelOffsetScaleByDistance = scale;
      }).toThrowDeveloperError();
    });

    it("throws translucencyByDistance with nearDistance === farDistance", function () {
      var b = billboards.add();
      var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        b.translucencyByDistance = translucency;
      }).toThrowDeveloperError();
    });

    it("throws new billboard with invalid translucencyByDistance (nearDistance === farDistance)", function () {
      var translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        billboards.add({
          translucencyByDistance: translucency,
        });
      }).toThrowDeveloperError();
    });

    it("throws translucencyByDistance with nearDistance > farDistance", function () {
      var b = billboards.add();
      var translucency = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
      expect(function () {
        b.translucencyByDistance = translucency;
      }).toThrowDeveloperError();
    });

    it("renders billboard with distanceDisplayCondition", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
        distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
      });

      camera.position = new Cartesian3(200.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);

      camera.position = new Cartesian3(50.0, 0.0, 0.0);
      expect(scene).toRender([0, 255, 0, 255]);

      camera.position = new Cartesian3(5.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("throws new billboard with invalid distanceDisplayCondition (near >= far)", function () {
      var dc = new DistanceDisplayCondition(100.0, 10.0);
      expect(function () {
        billboards.add({
          distanceDisplayCondition: dc,
        });
      }).toThrowDeveloperError();
    });

    it("throws distanceDisplayCondition with near >= far", function () {
      var b = billboards.add();
      var dc = new DistanceDisplayCondition(100.0, 10.0);
      expect(function () {
        b.distanceDisplayCondition = dc;
      }).toThrowDeveloperError();
    });

    it("renders with disableDepthTestDistance", function () {
      var b = billboards.add({
        position: new Cartesian3(-1.0, 0.0, 0.0),
        image: greenImage,
      });
      billboards.add({
        position: Cartesian3.ZERO,
        image: blueImage,
      });

      expect(scene).toRender([0, 0, 255, 255]);

      b.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("throws with new billboard with disableDepthTestDistance less than 0.0", function () {
      expect(function () {
        billboards.add({
          disableDepthTestDistance: -1.0,
        });
      }).toThrowDeveloperError();
    });

    it("throws with disableDepthTestDistance set less than 0.0", function () {
      var b = billboards.add();
      expect(function () {
        b.disableDepthTestDistance = -1.0;
      }).toThrowDeveloperError();
    });

    it("sets a removed billboard property", function () {
      var b = billboards.add();
      billboards.remove(b);
      b.show = false;
      expect(b.show).toEqual(false);
    });

    it("has zero billboards when constructed", function () {
      expect(billboards.length).toEqual(0);
    });

    it("adds a billboard", function () {
      var b = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });

      expect(billboards.length).toEqual(1);
      expect(billboards.get(0)).toEqual(b);
    });

    it("removes the first billboard", function () {
      var one = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var two = billboards.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });

      expect(billboards.length).toEqual(2);

      expect(billboards.remove(one)).toEqual(true);

      expect(billboards.length).toEqual(1);
      expect(billboards.get(0)).toEqual(two);
    });

    it("removes the last billboard", function () {
      var one = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var two = billboards.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });

      expect(billboards.length).toEqual(2);

      expect(billboards.remove(two)).toEqual(true);

      expect(billboards.length).toEqual(1);
      expect(billboards.get(0)).toEqual(one);
    });

    it("removes the same billboard twice", function () {
      var b = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      expect(billboards.length).toEqual(1);

      expect(billboards.remove(b)).toEqual(true);
      expect(billboards.length).toEqual(0);

      expect(billboards.remove(b)).toEqual(false);
      expect(billboards.length).toEqual(0);
    });

    it("returns false when removing undefined", function () {
      billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      expect(billboards.length).toEqual(1);

      expect(billboards.remove(undefined)).toEqual(false);
      expect(billboards.length).toEqual(1);
    });

    it("adds and removes billboards", function () {
      var one = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var two = billboards.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });
      expect(billboards.length).toEqual(2);
      expect(billboards.get(0)).toEqual(one);
      expect(billboards.get(1)).toEqual(two);

      expect(billboards.remove(two)).toEqual(true);
      var three = billboards.add({
        position: new Cartesian3(7.0, 8.0, 9.0),
      });
      expect(billboards.length).toEqual(2);
      expect(billboards.get(0)).toEqual(one);
      expect(billboards.get(1)).toEqual(three);
    });

    it("removes all billboards", function () {
      billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      billboards.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });
      expect(billboards.length).toEqual(2);

      billboards.removeAll();
      expect(billboards.length).toEqual(0);
    });

    it("can check if it contains a billboard", function () {
      var billboard = billboards.add();

      expect(billboards.contains(billboard)).toEqual(true);
    });

    it("returns false when checking if it contains a billboard it does not contain", function () {
      var billboard = billboards.add();
      billboards.remove(billboard);

      expect(billboards.contains(billboard)).toEqual(false);
    });

    it("does not contain undefined", function () {
      expect(billboards.contains(undefined)).toEqual(false);
    });

    it("does not contain random other objects", function () {
      expect(billboards.contains({})).toEqual(false);
      expect(billboards.contains(new Cartesian2())).toEqual(false);
    });

    it("sets and gets a texture atlas", function () {
      expect(billboards.textureAtlas).toBeUndefined();

      var atlas = new TextureAtlas({ context: scene.context });
      billboards.textureAtlas = atlas;
      expect(billboards.textureAtlas).toEqual(atlas);
    });

    it("destroys a texture atlas", function () {
      var b = new BillboardCollection();
      expect(b.destroyTextureAtlas).toEqual(true);

      var atlas = new TextureAtlas({ context: scene.context });
      b.textureAtlas = atlas;
      b = b.destroy();

      expect(atlas.isDestroyed()).toEqual(true);
    });

    it("does not destroy a texture atlas", function () {
      var b = new BillboardCollection();
      b.destroyTextureAtlas = false;

      var atlas = new TextureAtlas({ context: scene.context });
      b.rextureAtlas = atlas;
      b = b.destroy();

      expect(atlas.isDestroyed()).toEqual(false);
    });

    it("does not render when constructed", function () {
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("modifies and removes a billboard, then renders", function () {
      var b1 = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });
      billboards.add({
        position: new Cartesian3(-1.0, 0.0, 0.0),
        image: largeBlueImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      b1.scale = 2.0;
      billboards.remove(b1);
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders a green billboard", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("adds and renders a billboard", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      billboards.add({
        position: new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
        image: largeBlueImage,
      });

      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("removes and renders a billboard", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });
      var blueBillboard = billboards.add({
        position: new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
        image: largeBlueImage,
      });

      expect(scene).toRender([0, 0, 255, 255]);

      billboards.remove(blueBillboard);
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("removes all billboards and renders", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      billboards.removeAll();
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("removes all billboards, adds a billboard, and renders", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      billboards.removeAll();
      billboards.add({
        position: Cartesian3.ZERO,
        image: largeBlueImage,
      });

      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders with a different texture atlas", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      billboards.textureAtlas = new TextureAtlas({ context: scene.context });
      b.image = blueImage;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders using billboard show property", function () {
      var greenBillboard = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });
      var blueBillboard = billboards.add({
        show: false,
        position: Cartesian3.ZERO,
        image: largeBlueImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      greenBillboard.show = false;
      blueBillboard.show = true;

      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders using billboard position property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      b.position = new Cartesian3(20.0, 0.0, 0.0); // Behind camera
      expect(scene).toRender([0, 0, 0, 255]);

      b.position = new Cartesian3(1.0, 0.0, 0.0); // Back in front of camera
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders using billboard scale property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      b.scale = 0.0;
      expect(scene).toRender([0, 0, 0, 255]);

      b.scale = 2.0;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders using billboard image property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      b.image = largeBlueImage;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders using billboard setImage function", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      b.setImage(createGuid(), largeBlueImage);
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders using billboard setImageSubRegion function", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      expect(scene).toRender([0, 255, 0, 255]);

      var guid = createGuid();

      billboards.textureAtlas.addImage(guid, largeBlueImage);
      b.setImageSubRegion(guid, new BoundingRectangle(5.0, 5.0, 1.0, 1.0));
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders using billboard color property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: whiteImage,
      });

      expect(scene).toRender([255, 255, 255, 255]);

      b.color = new Color(1.0, 0.0, 1.0, 1.0);
      expect(scene).toRender([255, 0, 255, 255]);

      // Update a second time since it goes through a different vertex array update path
      b.color = new Color(0.0, 1.0, 0.0, 1.0);
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders using billboard rotation property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      b.rotation = CesiumMath.PI_OVER_TWO;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders using billboard aligned axis property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      b.alignedAxis = Cartesian3.UNIT_X;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders using billboard custom width property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      b.width = 300.0;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders using billboard custom height property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      b.height = 300.0;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("renders bounding volume with debugShowBoundingVolume", function () {
      billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
        scale: 0.5, // bring bounding volume in view
      });
      billboards.debugShowBoundingVolume = true;

      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders billboards when instancing is disabled", function () {
      // disable extension
      var instancedArrays = context._instancedArrays;
      context._instancedArrays = undefined;

      expect(scene).toRender([0, 0, 0, 255]);

      var b1 = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });
      expect(scene).toRender([0, 255, 0, 255]);

      var b2 = billboards.add({
        position: new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
        image: largeBlueImage,
      });
      expect(scene).toRender([0, 0, 255, 255]);

      billboards.remove(b2);
      expect(scene).toRender([0, 255, 0, 255]);

      billboards.remove(b1);
      expect(scene).toRender([0, 0, 0, 255]);

      context._instancedArrays = instancedArrays;
    });

    it("updates 10% of billboards", function () {
      for (var i = 0; i < 10; ++i) {
        billboards.add({
          position: Cartesian3.ZERO,
          image: whiteImage,
          show: i === 3,
        });
      }

      // First render - default billboard color is white.
      expect(scene).toRender([255, 255, 255, 255]);

      billboards.get(3).color = new Color(0.0, 1.0, 0.0, 1.0);

      // Second render - billboard is green
      expect(scene).toRender([0, 255, 0, 255]);

      billboards.get(3).color = new Color(1.0, 0.0, 0.0, 1.0);

      // Third render - update goes through a different vertex array update path
      expect(scene).toRender([255, 0, 0, 255]);
    });

    it("renders more than 16K billboards", function () {
      if (!context.instancedArrays) {
        return;
      }

      for (var i = 0; i < 16 * 1024; ++i) {
        billboards.add({
          position: Cartesian3.ZERO,
          image: whiteImage,
          color: {
            alpha: 0.0,
          },
        });
      }

      billboards.add({
        position: Cartesian3.ZERO,
        image: whiteImage,
      });

      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("is picked", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: whiteImage,
        id: "id",
      });

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(b);
        expect(result.id).toEqual("id");
      });
    });

    it("can change pick id", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: whiteImage,
        id: "id",
      });

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(b);
        expect(result.id).toEqual("id");
      });

      b.id = "id2";

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(b);
        expect(result.id).toEqual("id2");
      });
    });

    it("is not picked", function () {
      billboards.add({
        show: false,
        position: Cartesian3.ZERO,
        image: whiteImage,
      });

      expect(scene).notToPick();
    });

    it("picks a billboard using scaleByDistance", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: whiteImage,
      });

      var scaleByDistance = new NearFarScalar(1.0, 4.0, 3.0e9, 2.0);
      b.scaleByDistance = scaleByDistance;

      expect(scene).toPickPrimitive(b);

      scaleByDistance.nearValue = 0.0;
      scaleByDistance.farValue = 0.0;
      b.scaleByDistance = scaleByDistance;

      expect(scene).notToPick();
    });

    it("picks a billboard using translucencyByDistance", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: whiteImage,
      });

      var translucency = new NearFarScalar(1.0, 0.9, 3.0e9, 0.8);
      b.translucencyByDistance = translucency;

      expect(scene).toPickPrimitive(b);

      translucency.nearValue = 0.0;
      translucency.farValue = 0.0;
      b.translucencyByDistance = translucency;

      expect(scene).notToPick();
    });

    it("picks a billboard using pixelOffsetScaleByDistance", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        pixelOffset: new Cartesian2(0.0, 100.0),
        image: whiteImage,
      });

      var pixelOffsetScale = new NearFarScalar(1.0, 0.0, 3.0e9, 0.0);
      b.pixelOffsetScaleByDistance = pixelOffsetScale;

      expect(scene).toPickPrimitive(b);

      pixelOffsetScale.nearValue = 10.0;
      pixelOffsetScale.farValue = 10.0;
      b.pixelOffsetScaleByDistance = pixelOffsetScale;

      expect(scene).notToPick();
    });

    it("can pick a billboard using the rotation property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      b.rotation = CesiumMath.PI_OVER_TWO;
      expect(scene).toPickPrimitive(b);
    });

    it("can pick a billboard using the aligned axis property", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        image: greenImage,
      });

      b.alignedAxis = Cartesian3.UNIT_X;
      expect(scene).toPickPrimitive(b);
    });

    it("computes screen space position", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
      });
      scene.renderForSpecs();
      expect(b.computeScreenSpacePosition(scene)).toEqualEpsilon(
        new Cartesian2(0.5, 0.5),
        CesiumMath.EPSILON1
      );
    });

    it("stores screen space position in a result", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
      });
      var result = new Cartesian2();
      scene.renderForSpecs();
      var actual = b.computeScreenSpacePosition(scene, result);
      expect(actual).toEqual(result);
      expect(result).toEqualEpsilon(
        new Cartesian2(0.5, 0.5),
        CesiumMath.EPSILON1
      );
    });

    it("computes screen space position with pixelOffset", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        pixelOffset: new Cartesian2(0.5, 0.5),
      });
      scene.renderForSpecs();
      expect(b.computeScreenSpacePosition(scene)).toEqualEpsilon(
        new Cartesian2(1, 1.0),
        CesiumMath.EPSILON1
      );
    });

    it("computes screen space position with eyeOffset", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
        eyeOffset: new Cartesian3(1.0, 1.0, 0.0),
      });
      scene.renderForSpecs();
      expect(b.computeScreenSpacePosition(scene)).toEqualEpsilon(
        new Cartesian2(0.5, 0.5),
        CesiumMath.EPSILON1
      );
    });

    it("computes screen space position in Columbus view", function () {
      var b = billboards.add({
        position: Cartesian3.fromDegrees(0.0, 0.0, 10.0),
      });
      scene.morphToColumbusView(0.0);
      scene.camera.setView({ destination: Rectangle.MAX_VALUE });
      scene.renderForSpecs();
      expect(b.computeScreenSpacePosition(scene)).toEqualEpsilon(
        new Cartesian2(0.5, 0.5),
        CesiumMath.EPSILON1
      );
    });

    it("computes screen space position in 2D", function () {
      var b = billboards.add({
        position: Cartesian3.fromDegrees(0.0, 0.0, 10.0),
      });
      scene.morphTo2D(0.0);
      scene.camera.setView({ destination: Rectangle.MAX_VALUE });
      scene.renderForSpecs();
      expect(b.computeScreenSpacePosition(scene)).toEqualEpsilon(
        new Cartesian2(0.5, 0.5),
        CesiumMath.EPSILON1
      );
    });

    it("throws when computing screen space position when not in a collection", function () {
      var b = billboards.add({
        position: Cartesian3.ZERO,
      });
      billboards.remove(b);
      expect(function () {
        b.computeScreenSpacePosition(scene);
      }).toThrowDeveloperError();
    });

    it("throws when computing screen space position without scene", function () {
      var b = billboards.add();

      expect(function () {
        b.computeScreenSpacePosition();
      }).toThrowDeveloperError();
    });

    it("computes screen space bounding box", function () {
      var width = 10;
      var height = 15;
      var scale = 1.5;

      var b = billboards.add({
        width: width,
        height: height,
        scale: scale,
      });

      var halfWidth = width * scale * 0.5;
      var halfHeight = height * scale * 0.5;
      width = width * scale;
      height = height * scale;

      var bbox = Billboard.getScreenSpaceBoundingBox(b, Cartesian2.ZERO);
      expect(bbox.x).toEqual(-halfWidth);
      expect(bbox.y).toEqual(-halfHeight);
      expect(bbox.width).toEqual(width);
      expect(bbox.height).toEqual(height);
    });

    it("computes screen space bounding box with result", function () {
      var width = 10;
      var height = 15;
      var scale = 1.5;

      var b = billboards.add({
        width: width,
        height: height,
        scale: scale,
      });

      var halfWidth = width * scale * 0.5;
      var halfHeight = height * scale * 0.5;
      width = width * scale;
      height = height * scale;

      var result = new BoundingRectangle();
      var bbox = Billboard.getScreenSpaceBoundingBox(
        b,
        Cartesian2.ZERO,
        result
      );
      expect(bbox.x).toEqual(-halfWidth);
      expect(bbox.y).toEqual(-halfHeight);
      expect(bbox.width).toEqual(width);
      expect(bbox.height).toEqual(height);
      expect(bbox).toBe(result);
    });

    it("computes screen space bounding box with vertical origin", function () {
      var width = 10;
      var height = 15;
      var scale = 1.5;

      var b = billboards.add({
        width: width,
        height: height,
        scale: scale,
        verticalOrigin: VerticalOrigin.BOTTOM,
      });

      var halfWidth = width * scale * 0.5;
      width = width * scale;
      height = height * scale;

      var bbox = Billboard.getScreenSpaceBoundingBox(b, Cartesian2.ZERO);
      expect(bbox.x).toEqual(-halfWidth);
      expect(bbox.y).toEqual(-height);
      expect(bbox.width).toEqual(width);
      expect(bbox.height).toEqual(height);

      b.verticalOrigin = VerticalOrigin.TOP;
      bbox = Billboard.getScreenSpaceBoundingBox(b, Cartesian2.ZERO);
      expect(bbox.x).toEqual(-halfWidth);
      expect(bbox.y).toEqual(0);
      expect(bbox.width).toEqual(width);
      expect(bbox.height).toEqual(height);
    });

    it("computes screen space bounding box with horizontal origin", function () {
      var width = 10;
      var height = 15;
      var scale = 1.5;

      var b = billboards.add({
        width: width,
        height: height,
        scale: scale,
        horizontalOrigin: HorizontalOrigin.LEFT,
      });

      var halfHeight = height * scale * 0.5;
      height = height * scale;
      width = width * scale;

      var bbox = Billboard.getScreenSpaceBoundingBox(b, Cartesian2.ZERO);
      expect(bbox.x).toEqual(0);
      expect(bbox.y).toEqual(-halfHeight);
      expect(bbox.width).toEqual(width);
      expect(bbox.height).toEqual(height);

      b.horizontalOrigin = HorizontalOrigin.RIGHT;
      bbox = Billboard.getScreenSpaceBoundingBox(b, Cartesian2.ZERO);
      expect(bbox.x).toEqual(-width);
      expect(bbox.y).toEqual(-halfHeight);
      expect(bbox.width).toEqual(width);
      expect(bbox.height).toEqual(height);
    });

    it("equals another billboard", function () {
      var b = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
        color: {
          red: 1.0,
          green: 0.0,
          blue: 0.0,
          alpha: 1.0,
        },
      });
      var b2 = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
        color: {
          red: 1.0,
          green: 0.0,
          blue: 0.0,
          alpha: 1.0,
        },
      });

      // This tests the `BillboardCollection.equals` function itself, not simple equality.
      expect(b.equals(b2)).toEqual(true);
    });

    it("does not equal another billboard", function () {
      var b = billboards.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      var b2 = billboards.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });

      // This tests the `BillboardCollection.equals` function itself, not simple equality.
      expect(b.equals(b2)).toEqual(false);
    });

    it("does not equal undefined", function () {
      // This tests the `BillboardCollection.equals` function itself, not simple equality.
      var billboard = billboards.add();
      expect(billboard.equals(undefined)).toEqual(false);
    });

    it("throws when accessing without an index", function () {
      expect(function () {
        billboards.get();
      }).toThrowDeveloperError();
    });

    it("setImage throws without an id", function () {
      var b = billboards.add();
      expect(function () {
        b.setImage(undefined, {});
      }).toThrowDeveloperError();
    });

    it("setImage throws without an inmage", function () {
      var b = billboards.add();
      expect(function () {
        b.setImage("", undefined);
      }).toThrowDeveloperError();
    });

    it("setImageSubRegion throws without an id", function () {
      var b = billboards.add();
      expect(function () {
        b.setImage(undefined, {});
      }).toThrowDeveloperError();
    });

    it("setImageSubRegion throws without a sub-region", function () {
      var b = billboards.add();
      expect(function () {
        b.setImage("", undefined);
      }).toThrowDeveloperError();
    });

    it("computes bounding sphere in 3D", function () {
      var one = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
      });
      var two = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, 50.0),
      });

      scene.renderForSpecs();
      var actual = scene.frameState.commandList[0].boundingVolume;

      var positions = [one.position, two.position];
      var expected = BoundingSphere.fromPoints(positions);
      expect(actual.center).toEqual(expected.center);
      expect(actual.radius).toEqual(expected.radius);
    });

    it("computes bounding sphere in Columbus view", function () {
      var projection = scene.mapProjection;
      var ellipsoid = projection.ellipsoid;

      var one = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
      });
      var two = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, 50.0),
      });

      // Update scene state
      scene.morphToColumbusView(0);
      scene.renderForSpecs();
      var actual = scene.frameState.commandList[0].boundingVolume;

      var projectedPositions = [
        projection.project(ellipsoid.cartesianToCartographic(one.position)),
        projection.project(ellipsoid.cartesianToCartographic(two.position)),
      ];
      var expected = BoundingSphere.fromPoints(projectedPositions);
      expected.center = new Cartesian3(
        0.0,
        expected.center.x,
        expected.center.y
      );
      expect(actual.center).toEqualEpsilon(
        expected.center,
        CesiumMath.EPSILON8
      );
      expect(actual.radius).toBeGreaterThanOrEqualTo(expected.radius);
    });

    it("computes bounding sphere in 2D", function () {
      var projection = scene.mapProjection;
      var ellipsoid = projection.ellipsoid;

      var one = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
      });
      var two = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, 50.0),
      });

      var maxRadii = ellipsoid.maximumRadius;
      var orthoFrustum = new OrthographicOffCenterFrustum();
      orthoFrustum.right = maxRadii * Math.PI;
      orthoFrustum.left = -orthoFrustum.right;
      orthoFrustum.top = orthoFrustum.right;
      orthoFrustum.bottom = -orthoFrustum.top;
      orthoFrustum.near = 0.01 * maxRadii;
      orthoFrustum.far = 60.0 * maxRadii;

      camera.setView({
        destination: Rectangle.fromDegrees(-60.0, -60.0, -40.0, 60.0),
      });

      // Update scene state
      scene.morphTo2D(0);
      scene.renderForSpecs();

      camera.frustum = orthoFrustum;

      scene.renderForSpecs();
      var actual = scene.frameState.commandList[0].boundingVolume;

      var projectedPositions = [
        projection.project(ellipsoid.cartesianToCartographic(one.position)),
        projection.project(ellipsoid.cartesianToCartographic(two.position)),
      ];
      var expected = BoundingSphere.fromPoints(projectedPositions);
      expected.center = new Cartesian3(
        0.0,
        expected.center.x,
        expected.center.y
      );
      expect(actual.center).toEqualEpsilon(
        expected.center,
        CesiumMath.EPSILON8
      );
      expect(actual.radius).toBeGreaterThan(expected.radius);
    });

    it("computes bounding sphere with pixel offset", function () {
      var one = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
        pixelOffset: new Cartesian2(0.0, 200.0),
      });
      var two = billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, 50.0),
        pixelOffset: new Cartesian2(0.0, 200.0),
      });

      scene.renderForSpecs();
      var actual = scene.frameState.commandList[0].boundingVolume;

      var positions = [one.position, two.position];
      var bs = BoundingSphere.fromPoints(positions);

      var dimensions = new Cartesian2(1.0, 1.0);
      var diff = Cartesian3.subtract(
        actual.center,
        camera.position,
        new Cartesian3()
      );
      var vectorProjection = Cartesian3.multiplyByScalar(
        camera.direction,
        Cartesian3.dot(diff, camera.direction),
        new Cartesian3()
      );
      var distance = Math.max(
        0.0,
        Cartesian3.magnitude(vectorProjection) - bs.radius
      );

      var pixelSize = camera.frustum.getPixelDimensions(
        dimensions.x,
        dimensions.y,
        distance,
        scene.pixelRatio,
        new Cartesian2()
      );
      bs.radius +=
        pixelSize.y * 0.25 * Math.max(greenImage.width, greenImage.height) +
        pixelSize.y * one.pixelOffset.y;

      expect(actual.center).toEqual(bs.center);
      expect(actual.radius).toEqual(bs.radius);
    });

    it("computes bounding sphere with non-centered origin", function () {
      billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
      });
      scene.renderForSpecs();
      var centeredRadius =
        scene.frameState.commandList[0].boundingVolume.radius;
      billboards.removeAll();

      billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
        verticalOrigin: VerticalOrigin.TOP,
      });
      scene.renderForSpecs();
      var verticalRadius =
        scene.frameState.commandList[0].boundingVolume.radius;
      billboards.removeAll();

      billboards.add({
        image: greenImage,
        position: Cartesian3.fromDegrees(-50.0, -50.0),
        horizontalOrigin: HorizontalOrigin.LEFT,
      });
      scene.renderForSpecs();
      var horizontalRadius =
        scene.frameState.commandList[0].boundingVolume.radius;

      expect(verticalRadius).toEqual(2 * centeredRadius);
      expect(horizontalRadius).toEqual(2 * centeredRadius);
    });

    it("can create a billboard using a URL", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green2x2.png",
      });

      expect(one.ready).toEqual(false);
      expect(one.image).toEqual("./Data/Images/Green2x2.png");

      return pollToPromise(function () {
        return one.ready;
      }).then(function () {
        expect(scene).toRender([0, 255, 0, 255]);
      });
    });

    it("sets billboard width and height based on loaded image width and height", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green1x4.png",
      });

      expect(one.width).toBeUndefined();
      expect(one.height).toBeUndefined();

      return pollToPromise(function () {
        return one.ready;
      }).then(function () {
        expect(one.width).toEqual(1);
        expect(one.height).toEqual(4);

        one.image = "./Data/Images/Blue10x10.png";

        return pollToPromise(function () {
          return one.ready;
        }).then(function () {
          expect(one.width).toEqual(10);
          expect(one.height).toEqual(10);
        });
      });
    });

    it("does not cancel image load when a billboard is set to the same URL repeatedly", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green.png",
      });

      expect(one.ready).toEqual(false);
      expect(one.image).toEqual("./Data/Images/Green.png");

      one.image = "./Data/Images/Green.png";
      one.image = "./Data/Images/Green.png";
      one.image = "./Data/Images/Green.png";

      return pollToPromise(function () {
        return one.ready;
      });
    });

    it("ignores calls to set image equal to the current value after load", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green2x2.png",
      });

      expect(one.ready).toEqual(false);
      expect(one.image).toEqual("./Data/Images/Green2x2.png");

      return pollToPromise(function () {
        return one.ready;
      }).then(function () {
        expect(scene).toRender([0, 255, 0, 255]);

        one.image = "./Data/Images/Green2x2.png";

        expect(one.ready).toEqual(true);
        expect(scene).toRender([0, 255, 0, 255]);
      });
    });

    it("can create a billboard using a function", function () {
      var one = billboards.add({
        image: function () {
          return greenImage;
        },
      });

      // the image property will be an autogenerated id if not provided
      expect(one.image).toBeDefined();
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("can create a billboard using a function and id", function () {
      var one = billboards.add({
        imageId: "Foo",
        image: function () {
          return greenImage;
        },
      });

      // the image property will be an autogenerated id if not provided
      expect(one.image).toEqual("Foo");
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("can create a billboard using another billboard image", function () {
      var createImage = jasmine
        .createSpy("createImage")
        .and.returnValue(greenImage);

      var one = billboards.add({
        image: createImage,
      });

      scene.renderForSpecs();

      expect(createImage.calls.count()).toEqual(1);

      var two = billboards.add({
        image: one.image,
      });

      scene.renderForSpecs();

      expect(two.image).toEqual(one.image);
      expect(createImage.calls.count()).toEqual(1);
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("can create a billboard using a subregion of an image", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Red16x16.png",
        imageSubRegion: new BoundingRectangle(0.0, 0.0, 2.0, 3.0),
      });

      expect(one.ready).toEqual(false);

      return pollToPromise(function () {
        return one.ready;
      }).then(function () {
        expect(scene).toRender([255, 0, 0, 255]);
      });
    });

    it("sets billboard width and height based on subregion width and height", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Red16x16.png",
        imageSubRegion: new BoundingRectangle(0.0, 0.0, 1.0, 2.0),
      });

      expect(one.width).toBeUndefined();
      expect(one.height).toBeUndefined();

      return pollToPromise(function () {
        return one.ready;
      }).then(function () {
        expect(one.width).toEqual(1);
        expect(one.height).toEqual(2);
      });
    });

    it("can change image while an image is loading", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green.png",
      });

      expect(one.ready).toEqual(false);
      expect(one.image).toEqual("./Data/Images/Green.png");

      // switch to blue while green is in-flight

      one.image = "./Data/Images/Blue10x10.png";

      expect(one.ready).toEqual(false);
      expect(one.image).toEqual("./Data/Images/Blue10x10.png");

      return pollToPromise(function () {
        return one.ready;
      }).then(function () {
        var deferred = when.defer();

        // render and yield control several times to make sure the
        // green image doesn't clobber the blue
        var iterations = 10;

        function renderAndCheck() {
          expect(scene).toRender([0, 0, 255, 255]);

          if (iterations > 0) {
            --iterations;
            setTimeout(renderAndCheck, 1);
          } else {
            deferred.resolve();
          }
        }

        renderAndCheck();

        return deferred.promise;
      });
    });

    it("can set image to undefined while an image is loading", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green.png",
      });

      expect(one.ready).toEqual(false);
      expect(one.image).toEqual("./Data/Images/Green.png");

      // switch to undefined while green is in-flight

      one.image = undefined;

      expect(one.ready).toEqual(false);
      expect(one.image).toBeUndefined();

      var deferred = when.defer();

      // render and yield control several times to make sure the
      // green image never loads
      var iterations = 10;

      function renderAndCheck() {
        expect(scene).toRender([0, 0, 0, 255]);

        if (iterations > 0) {
          --iterations;
          setTimeout(renderAndCheck, 1);
        } else {
          deferred.resolve();
        }
      }

      renderAndCheck();

      return deferred.promise;
    });

    it("does not crash when removing a billboard that is loading", function () {
      scene.renderForSpecs();

      var one = billboards.add({
        image: "./Data/Images/Green.png",
      });

      billboards.remove(one);

      var deferred = when.defer();

      // render and yield control several times to make sure the
      // green image doesn't crash when it loads
      var iterations = 10;

      function renderAndCheck() {
        expect(scene).toRender([0, 0, 0, 255]);

        if (iterations > 0) {
          --iterations;
          setTimeout(renderAndCheck, 1);
        } else {
          deferred.resolve();
        }
      }

      renderAndCheck();

      return deferred.promise;
    });

    it("can add a billboard without a globe", function () {
      scene.globe = undefined;

      var billboardsWithoutGlobe = new BillboardCollection({
        scene: scene,
      });

      var position = Cartesian3.fromDegrees(-73.0, 40.0);
      var b = billboardsWithoutGlobe.add({
        position: position,
      });

      scene.renderForSpecs();

      expect(b.position).toEqual(position);
      expect(b._actualClampedPosition).toBeUndefined();
    });

    describe("height referenced billboards", function () {
      var billboardsWithHeight;
      beforeEach(function () {
        scene.globe = createGlobe();
        billboardsWithHeight = new BillboardCollection({
          scene: scene,
        });
        scene.primitives.add(billboardsWithHeight);
      });

      it("explicitly constructs a billboard with height reference", function () {
        var b = billboardsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
        });

        expect(b.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
      });

      it("set billboard height reference property", function () {
        var b = billboardsWithHeight.add();
        b.heightReference = HeightReference.CLAMP_TO_GROUND;

        expect(b.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
      });

      it("creating with a height reference creates a height update callback", function () {
        billboardsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();
      });

      it("set height reference property creates a height update callback", function () {
        var b = billboardsWithHeight.add({
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        b.heightReference = HeightReference.CLAMP_TO_GROUND;
        expect(scene.globe.callback).toBeDefined();
      });

      it("updates the callback when the height reference changes", function () {
        var b = billboardsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        b.heightReference = HeightReference.RELATIVE_TO_GROUND;
        expect(scene.globe.removedCallback).toEqual(true);
        expect(scene.globe.callback).toBeDefined();

        scene.globe.removedCallback = false;
        b.heightReference = HeightReference.NONE;
        expect(scene.globe.removedCallback).toEqual(true);
        expect(scene.globe.callback).toBeUndefined();
      });

      it("changing the position updates the callback", function () {
        var b = billboardsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        b.position = Cartesian3.fromDegrees(-73.0, 40.0);
        expect(scene.globe.removedCallback).toEqual(true);
        expect(scene.globe.callback).toBeDefined();
      });

      it("callback updates the position", function () {
        var b = billboardsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        var cartographic = scene.globe.ellipsoid.cartesianToCartographic(
          b._clampedPosition
        );
        expect(cartographic.height).toEqual(0.0);

        scene.globe.callback(Cartesian3.fromDegrees(-72.0, 40.0, 100.0));
        cartographic = scene.globe.ellipsoid.cartesianToCartographic(
          b._clampedPosition
        );
        expect(cartographic.height).toEqualEpsilon(100.0, CesiumMath.EPSILON9);

        //Setting position to zero should clear the clamped position.
        b.position = Cartesian3.ZERO;
        expect(b._clampedPosition).toBeUndefined();
      });

      it("changing the terrain provider", function () {
        var b = billboardsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        spyOn(b, "_updateClamping").and.callThrough();

        var terrainProvider = new CesiumTerrainProvider({
          url: "made/up/url",
          requestVertexNormals: true,
        });

        scene.terrainProvider = terrainProvider;

        expect(b._updateClamping).toHaveBeenCalled();
      });

      it("height reference without a scene rejects", function () {
        expect(function () {
          return billboards.add({
            heightReference: HeightReference.CLAMP_TO_GROUND,
            position: Cartesian3.fromDegrees(-72.0, 40.0),
          });
        }).toThrowDeveloperError();
      });

      it("changing height reference without a scene throws DeveloperError", function () {
        var b = billboards.add({
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });

        expect(function () {
          b.heightReference = HeightReference.CLAMP_TO_GROUND;
        }).toThrowDeveloperError();
      });

      it("height reference without a globe rejects", function () {
        scene.globe = undefined;

        expect(function () {
          return billboardsWithHeight.add({
            heightReference: HeightReference.CLAMP_TO_GROUND,
            position: Cartesian3.fromDegrees(-72.0, 40.0),
          });
        }).toThrowDeveloperError();
      });

      it("changing height reference without a globe throws DeveloperError", function () {
        var b = billboardsWithHeight.add({
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });

        scene.globe = undefined;

        expect(function () {
          b.heightReference = HeightReference.CLAMP_TO_GROUND;
        }).toThrowDeveloperError();
      });
    });
  },
  "WebGL"
);
