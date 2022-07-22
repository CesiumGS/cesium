import {
  Cartesian3,
  Cartographic,
  Color,
  ColorGeometryInstanceAttribute,
  destroyObject,
  Ellipsoid,
  GeometryInstance,
  HeadingPitchRange,
  Matrix4,
  Rectangle,
  RectangleGeometry,
  Resource,
  Pass,
  RenderState,
  ClassificationModel,
  ClassificationType,
  PerInstanceColorAppearance,
  Primitive,
  StencilConstants,
  addDefaults,
  parseGlb,
  updateVersion,
  RuntimeError,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/ClassificationModel",
  function () {
    let scene;
    let modelMatrix;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const batchedModel = "./Data/Models/Classification/batched.glb";
    const quantizedModel =
      "./Data/Models/Classification/batchedQuantization.glb";

    let globePrimitive;
    let tilesetPrimitive;
    let reusableGlobePrimitive;
    let reusableTilesetPrimitive;

    function setCamera(longitude, latitude) {
      // One feature is located at the center, point the camera there
      const center = Cartesian3.fromRadians(longitude, latitude);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 15.0));
    }

    function createPrimitive(rectangle, pass) {
      let renderState;
      if (pass === Pass.CESIUM_3D_TILE) {
        renderState = RenderState.fromCache({
          stencilTest: StencilConstants.setCesium3DTileBit(),
          stencilMask: StencilConstants.CESIUM_3D_TILE_MASK,
          depthTest: {
            enabled: true,
          },
        });
      }
      const depthColorAttribute = ColorGeometryInstanceAttribute.fromColor(
        new Color(0.0, 0.0, 0.0, 1.0)
      );
      return new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            ellipsoid: Ellipsoid.WGS84,
            rectangle: rectangle,
          }),
          id: "depth rectangle",
          attributes: {
            color: depthColorAttribute,
          },
        }),
        appearance: new PerInstanceColorAppearance({
          translucent: false,
          flat: true,
          renderState: renderState,
        }),
        asynchronous: false,
      });
    }

    function MockPrimitive(primitive, pass) {
      this._primitive = primitive;
      this._pass = pass;
      this.show = true;
    }

    MockPrimitive.prototype.update = function (frameState) {
      if (!this.show) {
        return;
      }

      const commandList = frameState.commandList;
      const startLength = commandList.length;
      this._primitive.update(frameState);

      for (let i = startLength; i < commandList.length; ++i) {
        const command = commandList[i];
        command.pass = this._pass;
      }
    };

    MockPrimitive.prototype.isDestroyed = function () {
      return false;
    };

    MockPrimitive.prototype.destroy = function () {
      return destroyObject(this);
    };

    beforeAll(function () {
      scene = createScene();

      const translation = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
        new Cartographic(centerLongitude, centerLatitude)
      );
      Cartesian3.multiplyByScalar(translation, -5.0, translation);
      modelMatrix = Matrix4.fromTranslation(translation);

      const offset = CesiumMath.toRadians(0.01);
      const rectangle = new Rectangle(
        centerLongitude - offset,
        centerLatitude - offset,
        centerLongitude + offset,
        centerLatitude + offset
      );
      reusableGlobePrimitive = createPrimitive(rectangle, Pass.GLOBE);
      reusableTilesetPrimitive = createPrimitive(
        rectangle,
        Pass.CESIUM_3D_TILE
      );
    });

    afterAll(function () {
      reusableGlobePrimitive.destroy();
      reusableTilesetPrimitive.destroy();
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      setCamera(centerLongitude, centerLatitude);

      // wrap rectangle primitive so it gets executed during the globe pass and 3D Tiles pass to lay down depth
      globePrimitive = new MockPrimitive(reusableGlobePrimitive, Pass.GLOBE);
      tilesetPrimitive = new MockPrimitive(
        reusableTilesetPrimitive,
        Pass.CESIUM_3D_TILE
      );

      scene.primitives.add(globePrimitive);
      scene.primitives.add(tilesetPrimitive);
    });

    afterEach(function () {
      scene.primitives.removeAll();
      globePrimitive =
        globePrimitive &&
        !globePrimitive.isDestroyed() &&
        globePrimitive.destroy();
      tilesetPrimitive =
        tilesetPrimitive &&
        !tilesetPrimitive.isDestroyed() &&
        tilesetPrimitive.destroy();
    });

    function expectRender(scene, model) {
      model.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
      model.show = true;
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
      });
    }

    function expectRenderBlank(scene, model) {
      model.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
      model.show = true;
      expect(scene).toRender([0, 0, 0, 255]);
    }

    function loadGltf(model) {
      return Resource.fetchArrayBuffer(model).then(function (arrayBuffer) {
        let gltf = new Uint8Array(arrayBuffer);
        gltf = parseGlb(gltf);
        updateVersion(gltf);
        addDefaults(gltf);
        return gltf;
      });
    }

    function loadClassificationModel(url, classificationType) {
      return Resource.fetchArrayBuffer(url).then(function (arrayBuffer) {
        const model = scene.primitives.add(
          new ClassificationModel({
            gltf: arrayBuffer,
            classificationType: classificationType,
            modelMatrix: modelMatrix,
          })
        );

        let ready = false;
        model.readyPromise.then(function () {
          ready = true;
        });

        return pollToPromise(function () {
          scene.renderForSpecs();
          return ready;
        }).then(function () {
          return model;
        });
      });
    }

    it("classifies 3D Tiles", function () {
      return loadClassificationModel(
        batchedModel,
        ClassificationType.CESIUM_3D_TILE
      ).then(function (model) {
        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        expectRender(scene, model);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        expectRenderBlank(scene, model);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
    });

    it("classifies globe", function () {
      return loadClassificationModel(
        batchedModel,
        ClassificationType.TERRAIN
      ).then(function (model) {
        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        expectRenderBlank(scene, model);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        expectRender(scene, model);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
    });

    it("classifies both 3D Tiles and globe", function () {
      return loadClassificationModel(
        batchedModel,
        ClassificationType.BOTH
      ).then(function (model) {
        globePrimitive.show = false;
        tilesetPrimitive.show = true;
        expectRender(scene, model);
        globePrimitive.show = true;
        tilesetPrimitive.show = false;
        expectRender(scene, model);
        globePrimitive.show = true;
        tilesetPrimitive.show = true;
      });
    });

    it("renders batched model", function () {
      return loadClassificationModel(
        batchedModel,
        ClassificationType.BOTH
      ).then(function (model) {
        expectRender(scene, model);
      });
    });

    it("renders batched model with quantization", function () {
      return loadClassificationModel(
        quantizedModel,
        ClassificationType.BOTH
      ).then(function (model) {
        expectRender(scene, model);
      });
    });

    it("throws with invalid number of nodes", function () {
      return loadGltf(batchedModel).then(function (gltf) {
        gltf.nodes.push({});
        expect(function () {
          return new ClassificationModel({
            gltf: gltf,
          });
        }).toThrowError(RuntimeError);
      });
    });

    it("throws with invalid number of meshes", function () {
      return loadGltf(batchedModel).then(function (gltf) {
        gltf.meshes.push({});
        expect(function () {
          return new ClassificationModel({
            gltf: gltf,
          });
        }).toThrowError(RuntimeError);
      });
    });

    it("throws with invalid number of primitives", function () {
      return loadGltf(batchedModel).then(function (gltf) {
        gltf.meshes[0].primitives.push({});
        expect(function () {
          return new ClassificationModel({
            gltf: gltf,
          });
        }).toThrowError(RuntimeError);
      });
    });

    it("throws with position semantic", function () {
      return loadGltf(batchedModel).then(function (gltf) {
        gltf.meshes[0].primitives[0].attributes.POSITION = undefined;
        expect(function () {
          return new ClassificationModel({
            gltf: gltf,
          });
        }).toThrowError(RuntimeError);
      });
    });

    it("throws with batch id semantic", function () {
      return loadGltf(batchedModel).then(function (gltf) {
        gltf.meshes[0].primitives[0].attributes._BATCHID = undefined;
        expect(function () {
          return new ClassificationModel({
            gltf: gltf,
          });
        }).toThrowError(RuntimeError);
      });
    });
  },
  "WebGL"
);
