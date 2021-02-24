import { BoundingSphere } from "../../Source/Cesium.js";
import { BoxGeometry } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { destroyObject } from "../../Source/Cesium.js";
import { GeometryPipeline } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { BufferUsage } from "../../Source/Cesium.js";
import { DrawCommand } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { Sampler } from "../../Source/Cesium.js";
import { ShaderProgram } from "../../Source/Cesium.js";
import { VertexArray } from "../../Source/Cesium.js";
import { BillboardCollection } from "../../Source/Cesium.js";
import { BlendingState } from "../../Source/Cesium.js";
import { TextureAtlas } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import { when } from "../../Source/Cesium.js";

describe(
  "Scene/Multifrustum",
  function () {
    var scene;
    var context;
    var primitives;
    var atlas;

    var greenImage;
    var blueImage;
    var whiteImage;

    var logDepth;

    beforeAll(function () {
      scene = createScene();
      logDepth = scene.logarithmicDepthBuffer;
      scene.destroyForSpecs();

      return when.join(
        Resource.fetchImage("./Data/Images/Green.png").then(function (image) {
          greenImage = image;
        }),
        Resource.fetchImage("./Data/Images/Blue.png").then(function (image) {
          blueImage = image;
        }),
        Resource.fetchImage("./Data/Images/White.png").then(function (image) {
          whiteImage = image;
        })
      );
    });

    beforeEach(function () {
      scene = createScene();
      context = scene.context;
      primitives = scene.primitives;

      scene.logarithmicDepthBuffer = false;

      var camera = scene.camera;
      camera.position = new Cartesian3();
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.clone(Cartesian3.UNIT_X);

      camera.frustum.near = 1.0;
      camera.frustum.far = 1000000000.0;
      camera.frustum.fov = CesiumMath.toRadians(60.0);
      camera.frustum.aspectRatio = 1.0;
    });

    afterEach(function () {
      atlas = atlas && atlas.destroy();
      scene.destroyForSpecs();
    });

    var billboard0;
    var billboard1;
    var billboard2;

    function createBillboards() {
      atlas = new TextureAtlas({
        context: context,
        borderWidthInPixels: 1,
        initialSize: new Cartesian2(3, 3),
      });

      // ANGLE Workaround
      atlas.texture.sampler = Sampler.NEAREST;

      var billboards = new BillboardCollection();
      billboards.textureAtlas = atlas;
      billboards.destroyTextureAtlas = false;
      billboard0 = billboards.add({
        position: new Cartesian3(0.0, 0.0, -50.0),
        image: greenImage,
      });
      primitives.add(billboards);

      billboards = new BillboardCollection();
      billboards.textureAtlas = atlas;
      billboards.destroyTextureAtlas = false;
      billboard1 = billboards.add({
        position: new Cartesian3(0.0, 0.0, -50000.0),
        image: blueImage,
      });
      primitives.add(billboards);

      billboards = new BillboardCollection();
      billboards.textureAtlas = atlas;
      billboards.destroyTextureAtlas = false;
      billboard2 = billboards.add({
        position: new Cartesian3(0.0, 0.0, -50000000.0),
        image: whiteImage,
      });
      primitives.add(billboards);

      return billboards;
    }

    it("renders primitive in closest frustum", function () {
      createBillboards();

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toEqual(0);
        expect(rgba[1]).not.toEqual(0);
        expect(rgba[2]).toEqual(0);
        expect(rgba[3]).toEqual(255);
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toEqual(0);
        expect(rgba[1]).not.toEqual(0);
        expect(rgba[2]).toEqual(0);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("renders primitive in middle frustum", function () {
      createBillboards();
      billboard0.color = new Color(1.0, 1.0, 1.0, 0.0);

      expect(scene).toRender([0, 0, 255, 255]);
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("renders primitive in last frustum", function () {
      createBillboards();
      var color = new Color(1.0, 1.0, 1.0, 0.0);
      billboard0.color = color;
      billboard1.color = color;

      expect(scene).toRender([255, 255, 255, 255]);
      expect(scene).toRender([255, 255, 255, 255]);
    });

    it("renders primitive in last frustum with debugShowFrustums", function () {
      createBillboards();
      var color = new Color(1.0, 1.0, 1.0, 1.0);
      billboard0.color = color;
      billboard1.color = color;

      spyOn(DrawCommand.prototype, "execute");

      scene.debugShowFrustums = true;
      scene.renderForSpecs();

      expect(DrawCommand.prototype.execute).toHaveBeenCalled();

      var calls = DrawCommand.prototype.execute.calls.all();
      var billboardCall;
      var i;
      for (i = 0; i < calls.length; ++i) {
        if (calls[i].object.owner instanceof BillboardCollection) {
          billboardCall = calls[i];
          break;
        }
      }

      expect(billboardCall).toBeDefined();
      expect(billboardCall.args.length).toEqual(2);

      var found = false;
      var sources =
        billboardCall.object.shaderProgram.fragmentShaderSource.sources;
      for (var j = 0; j < sources.length; ++j) {
        if (sources[j].indexOf("czm_Debug_main") !== -1) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    function createPrimitive(bounded, closestFrustum) {
      bounded = defaultValue(bounded, true);
      closestFrustum = defaultValue(closestFrustum, false);

      function Primitive() {
        this._va = undefined;
        this._sp = undefined;
        this._rs = undefined;
        this._modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(0.0, 0.0, -50000.0),
          new Matrix4()
        );

        this.color = new Color(1.0, 1.0, 0.0, 1.0);

        var that = this;
        this._um = {
          u_color: function () {
            return that.color;
          },
          u_model: function () {
            return that._modelMatrix;
          },
        };
      }
      Primitive.prototype.update = function (frameState) {
        if (!defined(this._sp)) {
          var vs = "";
          vs += "attribute vec4 position;";
          vs += "void main()";
          vs += "{";
          vs += "    gl_Position = czm_modelViewProjection * position;";
          vs += closestFrustum
            ? "    gl_Position.z = clamp(gl_Position.z, gl_DepthRange.near, gl_DepthRange.far);"
            : "";
          vs += "}";
          var fs = "";
          fs += "uniform vec4 u_color;";
          fs += "void main()";
          fs += "{";
          fs += "    gl_FragColor = u_color;";
          fs += "}";

          var dimensions = new Cartesian3(500000.0, 500000.0, 500000.0);
          var maximum = Cartesian3.multiplyByScalar(
            dimensions,
            0.5,
            new Cartesian3()
          );
          var minimum = Cartesian3.negate(maximum, new Cartesian3());
          var geometry = BoxGeometry.createGeometry(
            new BoxGeometry({
              minimum: minimum,
              maximum: maximum,
            })
          );
          var attributeLocations = GeometryPipeline.createAttributeLocations(
            geometry
          );
          this._va = VertexArray.fromGeometry({
            context: frameState.context,
            geometry: geometry,
            attributeLocations: attributeLocations,
            bufferUsage: BufferUsage.STATIC_DRAW,
          });

          this._sp = ShaderProgram.fromCache({
            context: frameState.context,
            vertexShaderSource: vs,
            fragmentShaderSource: fs,
            attributeLocations: attributeLocations,
          });

          this._rs = RenderState.fromCache({
            blending: BlendingState.ALPHA_BLEND,
          });
        }

        frameState.commandList.push(
          new DrawCommand({
            renderState: this._rs,
            shaderProgram: this._sp,
            vertexArray: this._va,
            uniformMap: this._um,
            modelMatrix: this._modelMatrix,
            executeInClosestFrustum: closestFrustum,
            boundingVolume: bounded
              ? new BoundingSphere(Cartesian3.clone(Cartesian3.ZERO), 500000.0)
              : undefined,
            pass: Pass.OPAQUE,
          })
        );
      };

      Primitive.prototype.destroy = function () {
        this._va = this._va && this._va.destroy();
        this._sp = this._sp && this._sp.destroy();
        return destroyObject(this);
      };

      return new Primitive();
    }

    it("renders primitive with undefined bounding volume", function () {
      var primitive = createPrimitive(false);
      primitives.add(primitive);

      expect(scene).toRender([255, 255, 0, 255]);
      expect(scene).toRender([255, 255, 0, 255]);
    });

    it("renders only in the closest frustum", function () {
      createBillboards();
      var color = new Color(1.0, 1.0, 1.0, 0.0);
      billboard0.color = color;
      billboard1.color = color;
      billboard2.color = color;

      var primitive = createPrimitive(true, true);
      primitive.color = new Color(1.0, 1.0, 0.0, 0.5);
      primitives.add(primitive);

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).not.toEqual(0);
        expect(rgba[2]).toEqual(0);
        expect(rgba[3]).toEqual(255);
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).not.toEqual(0);
        expect(rgba[2]).toEqual(0);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("render without a central body or any primitives", function () {
      scene.renderForSpecs();
    });

    it("does not crash when near plane is greater than or equal to the far plane", function () {
      var camera = scene.camera;
      camera.frustum.far = 1000.0;
      camera.position = new Cartesian3(0.0, 0.0, 1e12);

      createBillboards();
      scene.renderForSpecs();
    });

    it("log depth uses less frustums", function () {
      if (!logDepth) {
        return;
      }

      createBillboards();

      scene.render();
      expect(scene.frustumCommandsList.length).toEqual(3);

      scene.logarithmicDepthBuffer = true;
      scene.render();
      expect(scene.frustumCommandsList.length).toEqual(1);
    });
  },
  "WebGL"
);
