import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { DirectionalLight } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { GeographicProjection } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { OrthographicFrustum } from "../../Source/Cesium.js";
import { OrthographicOffCenterFrustum } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { SceneMode } from "../../Source/Cesium.js";
import createCamera from "../createCamera.js";
import createContext from "../createContext.js";
import createFrameState from "../createFrameState.js";

describe(
  "Renderer/AutomaticUniforms",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    function createMockCamera(
      view,
      projection,
      infiniteProjection,
      position,
      direction,
      right,
      up
    ) {
      return {
        viewMatrix: defaultValue(view, Matrix4.clone(Matrix4.IDENTITY)),
        inverseViewMatrix: Matrix4.inverseTransformation(
          defaultValue(view, Matrix4.clone(Matrix4.IDENTITY)),
          new Matrix4()
        ),
        frustum: {
          near: 1.0,
          far: 1000.0,
          top: 2.0,
          bottom: -2.0,
          left: -1.0,
          right: 1.0,
          projectionMatrix: defaultValue(
            projection,
            Matrix4.clone(Matrix4.IDENTITY)
          ),
          infiniteProjectionMatrix: defaultValue(
            infiniteProjection,
            Matrix4.clone(Matrix4.IDENTITY)
          ),
          computeCullingVolume: function () {
            return undefined;
          },
          getPixelSize: function () {
            return new Cartesian2(1.0, 0.1);
          },
        },
        position: defaultValue(position, Cartesian3.clone(Cartesian3.ZERO)),
        positionWC: defaultValue(position, Cartesian3.clone(Cartesian3.ZERO)),
        directionWC: defaultValue(
          direction,
          Cartesian3.clone(Cartesian3.UNIT_Z)
        ),
        rightWC: defaultValue(right, Cartesian3.clone(Cartesian3.UNIT_X)),
        upWC: defaultValue(up, Cartesian3.clone(Cartesian3.UNIT_Y)),
        positionCartographic: new Cartographic(0.0, 0.0, 10.0),
      };
    }

    it("can declare automatic uniforms", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_viewport", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_viewportOrthographic", function () {
      const fs =
        "void main() { " +
        "  bool b0 = (czm_viewportOrthographic[0][0] != 0.0) && (czm_viewportOrthographic[1][0] == 0.0) && (czm_viewportOrthographic[2][0] == 0.0) && (czm_viewportOrthographic[3][0] != 0.0); " +
        "  bool b1 = (czm_viewportOrthographic[0][1] == 0.0) && (czm_viewportOrthographic[1][1] != 0.0) && (czm_viewportOrthographic[2][1] == 0.0) && (czm_viewportOrthographic[3][1] != 0.0); " +
        "  bool b2 = (czm_viewportOrthographic[0][2] == 0.0) && (czm_viewportOrthographic[1][2] == 0.0) && (czm_viewportOrthographic[2][2] != 0.0) && (czm_viewportOrthographic[3][2] != 0.0); " +
        "  bool b3 = (czm_viewportOrthographic[0][3] == 0.0) && (czm_viewportOrthographic[1][3] == 0.0) && (czm_viewportOrthographic[2][3] == 0.0) && (czm_viewportOrthographic[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_viewportTransformation", function () {
      const fs =
        "void main() { " +
        "  bool b0 = (czm_viewportTransformation[0][0] != 0.0) && (czm_viewportTransformation[1][0] == 0.0) && (czm_viewportTransformation[2][0] == 0.0) && (czm_viewportTransformation[3][0] != 0.0); " +
        "  bool b1 = (czm_viewportTransformation[0][1] == 0.0) && (czm_viewportTransformation[1][1] != 0.0) && (czm_viewportTransformation[2][1] == 0.0) && (czm_viewportTransformation[3][1] != 0.0); " +
        "  bool b2 = (czm_viewportTransformation[0][2] == 0.0) && (czm_viewportTransformation[1][2] == 0.0) && (czm_viewportTransformation[2][2] != 0.0) && (czm_viewportTransformation[3][2] != 0.0); " +
        "  bool b3 = (czm_viewportTransformation[0][3] == 0.0) && (czm_viewportTransformation[1][3] == 0.0) && (czm_viewportTransformation[2][3] == 0.0) && (czm_viewportTransformation[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_globeDepthTexture", function () {
      context.uniformState.globeDepthTexture = new Texture({
        context: context,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 255, 255, 255]),
        },
      });
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(texture2D(czm_globeDepthTexture, vec2(0.5, 0.5)).r == 1.0);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_model", function () {
      const fs =
        "void main() { " +
        "  bool b0 = (czm_model[0][0] ==  1.0) && (czm_model[1][0] ==  2.0) && (czm_model[2][0] ==  3.0) && (czm_model[3][0] ==  4.0); " +
        "  bool b1 = (czm_model[0][1] ==  5.0) && (czm_model[1][1] ==  6.0) && (czm_model[2][1] ==  7.0) && (czm_model[3][1] ==  8.0); " +
        "  bool b2 = (czm_model[0][2] ==  9.0) && (czm_model[1][2] == 10.0) && (czm_model[2][2] == 11.0) && (czm_model[3][2] == 12.0); " +
        "  bool b3 = (czm_model[0][3] == 13.0) && (czm_model[1][3] == 14.0) && (czm_model[2][3] == 15.0) && (czm_model[3][3] == 16.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        9.0,
        10.0,
        11.0,
        12.0,
        13.0,
        14.0,
        15.0,
        16.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_inverseModel", function () {
      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseModel[0][0] ==  0.0) && (czm_inverseModel[1][0] == 1.0) && (czm_inverseModel[2][0] == 0.0) && (czm_inverseModel[3][0] == -2.0); " +
        "  bool b1 = (czm_inverseModel[0][1] == -1.0) && (czm_inverseModel[1][1] == 0.0) && (czm_inverseModel[2][1] == 0.0) && (czm_inverseModel[3][1] ==  1.0); " +
        "  bool b2 = (czm_inverseModel[0][2] ==  0.0) && (czm_inverseModel[1][2] == 0.0) && (czm_inverseModel[2][2] == 1.0) && (czm_inverseModel[3][2] ==  0.0); " +
        "  bool b3 = (czm_inverseModel[0][3] ==  0.0) && (czm_inverseModel[1][3] == 0.0) && (czm_inverseModel[2][3] == 0.0) && (czm_inverseModel[3][3] ==  1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        0.0,
        -1.0,
        0.0,
        1.0,
        1.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_view", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              2.0,
              3.0,
              4.0,
              5.0,
              6.0,
              7.0,
              8.0,
              9.0,
              10.0,
              11.0,
              12.0,
              13.0,
              14.0,
              15.0,
              16.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_view[0][0] ==  1.0) && (czm_view[1][0] ==  2.0) && (czm_view[2][0] ==  3.0) && (czm_view[3][0] ==  4.0); " +
        "  bool b1 = (czm_view[0][1] ==  5.0) && (czm_view[1][1] ==  6.0) && (czm_view[2][1] ==  7.0) && (czm_view[3][1] ==  8.0); " +
        "  bool b2 = (czm_view[0][2] ==  9.0) && (czm_view[1][2] == 10.0) && (czm_view[2][2] == 11.0) && (czm_view[3][2] == 12.0); " +
        "  bool b3 = (czm_view[0][3] == 13.0) && (czm_view[1][3] == 14.0) && (czm_view[2][3] == 15.0) && (czm_view[3][3] == 16.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_view3D", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              2.0,
              3.0,
              4.0,
              5.0,
              6.0,
              7.0,
              8.0,
              9.0,
              10.0,
              11.0,
              12.0,
              13.0,
              14.0,
              15.0,
              16.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_view3D[0][0] ==  1.0) && (czm_view3D[1][0] ==  2.0) && (czm_view3D[2][0] ==  3.0) && (czm_view3D[3][0] ==  4.0); " +
        "  bool b1 = (czm_view3D[0][1] ==  5.0) && (czm_view3D[1][1] ==  6.0) && (czm_view3D[2][1] ==  7.0) && (czm_view3D[3][1] ==  8.0); " +
        "  bool b2 = (czm_view3D[0][2] ==  9.0) && (czm_view3D[1][2] == 10.0) && (czm_view3D[2][2] == 11.0) && (czm_view3D[3][2] == 12.0); " +
        "  bool b3 = (czm_view3D[0][3] == 13.0) && (czm_view3D[1][3] == 14.0) && (czm_view3D[2][3] == 15.0) && (czm_view3D[3][3] == 16.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_viewRotation", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              2.0,
              3.0,
              4.0,
              5.0,
              6.0,
              7.0,
              8.0,
              9.0,
              10.0,
              11.0,
              12.0,
              13.0,
              14.0,
              15.0,
              16.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_viewRotation[0][0] ==  1.0) && (czm_viewRotation[1][0] ==  2.0) && (czm_viewRotation[2][0] ==  3.0); " +
        "  bool b1 = (czm_viewRotation[0][1] ==  5.0) && (czm_viewRotation[1][1] ==  6.0) && (czm_viewRotation[2][1] ==  7.0); " +
        "  bool b2 = (czm_viewRotation[0][2] ==  9.0) && (czm_viewRotation[1][2] == 10.0) && (czm_viewRotation[2][2] == 11.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_viewRotation3D", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              2.0,
              3.0,
              4.0,
              5.0,
              6.0,
              7.0,
              8.0,
              9.0,
              10.0,
              11.0,
              12.0,
              13.0,
              14.0,
              15.0,
              16.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_viewRotation3D[0][0] ==  1.0) && (czm_viewRotation3D[1][0] ==  2.0) && (czm_viewRotation3D[2][0] ==  3.0); " +
        "  bool b1 = (czm_viewRotation3D[0][1] ==  5.0) && (czm_viewRotation3D[1][1] ==  6.0) && (czm_viewRotation3D[2][1] ==  7.0); " +
        "  bool b2 = (czm_viewRotation3D[0][2] ==  9.0) && (czm_viewRotation3D[1][2] == 10.0) && (czm_viewRotation3D[2][2] == 11.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseView", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              0.0,
              -1.0,
              0.0,
              7.0,
              1.0,
              0.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_inverseView[0][0] ==  0.0) && (czm_inverseView[1][0] == 1.0) && (czm_inverseView[2][0] == 0.0) && (czm_inverseView[3][0] == -8.0) &&" +
        "    (czm_inverseView[0][1] == -1.0) && (czm_inverseView[1][1] == 0.0) && (czm_inverseView[2][1] == 0.0) && (czm_inverseView[3][1] ==  7.0) &&" +
        "    (czm_inverseView[0][2] ==  0.0) && (czm_inverseView[1][2] == 0.0) && (czm_inverseView[2][2] == 1.0) && (czm_inverseView[3][2] ==  0.0)" +
        "  ); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseView3D", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              0.0,
              -1.0,
              0.0,
              7.0,
              1.0,
              0.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_inverseView3D[0][0] ==  0.0) && (czm_inverseView3D[1][0] == 1.0) && (czm_inverseView3D[2][0] == 0.0) && (czm_inverseView3D[3][0] == -8.0) &&" +
        "    (czm_inverseView3D[0][1] == -1.0) && (czm_inverseView3D[1][1] == 0.0) && (czm_inverseView3D[2][1] == 0.0) && (czm_inverseView3D[3][1] ==  7.0) &&" +
        "    (czm_inverseView3D[0][2] ==  0.0) && (czm_inverseView3D[1][2] == 0.0) && (czm_inverseView3D[2][2] == 1.0) && (czm_inverseView3D[3][2] ==  0.0)" +
        "  ); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseViewRotation", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              0.0,
              -1.0,
              0.0,
              7.0,
              1.0,
              0.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_inverseViewRotation[0][0] ==  0.0) && (czm_inverseViewRotation[1][0] == 1.0) && (czm_inverseViewRotation[2][0] == 0.0) && " +
        "    (czm_inverseViewRotation[0][1] == -1.0) && (czm_inverseViewRotation[1][1] == 0.0) && (czm_inverseViewRotation[2][1] == 0.0) && " +
        "    (czm_inverseViewRotation[0][2] ==  0.0) && (czm_inverseViewRotation[1][2] == 0.0) && (czm_inverseViewRotation[2][2] == 1.0) " +
        "  ); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseViewRotation3D", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              0.0,
              -1.0,
              0.0,
              7.0,
              1.0,
              0.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_inverseViewRotation3D[0][0] ==  0.0) && (czm_inverseViewRotation3D[1][0] == 1.0) && (czm_inverseViewRotation3D[2][0] == 0.0) && " +
        "    (czm_inverseViewRotation3D[0][1] == -1.0) && (czm_inverseViewRotation3D[1][1] == 0.0) && (czm_inverseViewRotation3D[2][1] == 0.0) && " +
        "    (czm_inverseViewRotation3D[0][2] ==  0.0) && (czm_inverseViewRotation3D[1][2] == 0.0) && (czm_inverseViewRotation3D[2][2] == 1.0) " +
        "  ); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_projection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            undefined,
            new Matrix4(
              1.0,
              2.0,
              3.0,
              4.0,
              5.0,
              6.0,
              7.0,
              8.0,
              9.0,
              10.0,
              11.0,
              12.0,
              13.0,
              14.0,
              15.0,
              16.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_projection[0][0] ==  1.0) && (czm_projection[1][0] ==  2.0) && (czm_projection[2][0] ==  3.0) && (czm_projection[3][0] ==  4.0); " +
        "  bool b1 = (czm_projection[0][1] ==  5.0) && (czm_projection[1][1] ==  6.0) && (czm_projection[2][1] ==  7.0) && (czm_projection[3][1] ==  8.0); " +
        "  bool b2 = (czm_projection[0][2] ==  9.0) && (czm_projection[1][2] == 10.0) && (czm_projection[2][2] == 11.0) && (czm_projection[3][2] == 12.0); " +
        "  bool b3 = (czm_projection[0][3] == 13.0) && (czm_projection[1][3] == 14.0) && (czm_projection[2][3] == 15.0) && (czm_projection[3][3] == 16.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            undefined,
            new Matrix4(
              0.0,
              -1.0,
              0.0,
              1.0,
              1.0,
              0.0,
              0.0,
              2.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseProjection[0][0] ==  0.0) && (czm_inverseProjection[1][0] == 1.0) && (czm_inverseProjection[2][0] == 0.0) && (czm_inverseProjection[3][0] == -2.0); " +
        "  bool b1 = (czm_inverseProjection[0][1] == -1.0) && (czm_inverseProjection[1][1] == 0.0) && (czm_inverseProjection[2][1] == 0.0) && (czm_inverseProjection[3][1] ==  1.0); " +
        "  bool b2 = (czm_inverseProjection[0][2] ==  0.0) && (czm_inverseProjection[1][2] == 0.0) && (czm_inverseProjection[2][2] == 1.0) && (czm_inverseProjection[3][2] ==  0.0); " +
        "  bool b3 = (czm_inverseProjection[0][3] ==  0.0) && (czm_inverseProjection[1][3] == 0.0) && (czm_inverseProjection[2][3] == 0.0) && (czm_inverseProjection[3][3] ==  1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseProjection in 2D", function () {
      const frameState = createFrameState(
        context,
        createMockCamera(
          undefined,
          new Matrix4(
            0.0,
            -1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            0.0,
            2.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0
          )
        )
      );
      frameState.mode = SceneMode.SCENE2D;

      const us = context.uniformState;
      us.update(frameState);

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseProjection[0][0] == 0.0) && (czm_inverseProjection[1][0] == 0.0) && (czm_inverseProjection[2][0] == 0.0) && (czm_inverseProjection[3][0] == 0.0); " +
        "  bool b1 = (czm_inverseProjection[0][1] == 0.0) && (czm_inverseProjection[1][1] == 0.0) && (czm_inverseProjection[2][1] == 0.0) && (czm_inverseProjection[3][1] == 0.0); " +
        "  bool b2 = (czm_inverseProjection[0][2] == 0.0) && (czm_inverseProjection[1][2] == 0.0) && (czm_inverseProjection[2][2] == 0.0) && (czm_inverseProjection[3][2] == 0.0); " +
        "  bool b3 = (czm_inverseProjection[0][3] == 0.0) && (czm_inverseProjection[1][3] == 0.0) && (czm_inverseProjection[2][3] == 0.0) && (czm_inverseProjection[3][3] == 0.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseProjection in 3D with orthographic projection", function () {
      const frameState = createFrameState(
        context,
        createMockCamera(
          undefined,
          new Matrix4(
            0.0,
            -1.0,
            0.0,
            1.0,
            1.0,
            0.0,
            0.0,
            2.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            0.0,
            1.0
          )
        )
      );
      const frustum = new OrthographicFrustum();
      frustum.aspectRatio = 1.0;
      frustum.width = 1.0;
      frameState.camera.frustum = frustum;

      const us = context.uniformState;
      us.update(frameState);

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseProjection[0][0] == 0.0) && (czm_inverseProjection[1][0] == 0.0) && (czm_inverseProjection[2][0] == 0.0) && (czm_inverseProjection[3][0] == 0.0); " +
        "  bool b1 = (czm_inverseProjection[0][1] == 0.0) && (czm_inverseProjection[1][1] == 0.0) && (czm_inverseProjection[2][1] == 0.0) && (czm_inverseProjection[3][1] == 0.0); " +
        "  bool b2 = (czm_inverseProjection[0][2] == 0.0) && (czm_inverseProjection[1][2] == 0.0) && (czm_inverseProjection[2][2] == 0.0) && (czm_inverseProjection[3][2] == 0.0); " +
        "  bool b3 = (czm_inverseProjection[0][3] == 0.0) && (czm_inverseProjection[1][3] == 0.0) && (czm_inverseProjection[2][3] == 0.0) && (czm_inverseProjection[3][3] == 0.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_infiniteProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            undefined,
            undefined,
            new Matrix4(
              1.0,
              2.0,
              3.0,
              4.0,
              5.0,
              6.0,
              7.0,
              8.0,
              9.0,
              10.0,
              11.0,
              12.0,
              13.0,
              14.0,
              15.0,
              16.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_infiniteProjection[0][0] ==  1.0) && (czm_infiniteProjection[1][0] ==  2.0) && (czm_infiniteProjection[2][0] ==  3.0) && (czm_infiniteProjection[3][0] ==  4.0); " +
        "  bool b1 = (czm_infiniteProjection[0][1] ==  5.0) && (czm_infiniteProjection[1][1] ==  6.0) && (czm_infiniteProjection[2][1] ==  7.0) && (czm_infiniteProjection[3][1] ==  8.0); " +
        "  bool b2 = (czm_infiniteProjection[0][2] ==  9.0) && (czm_infiniteProjection[1][2] == 10.0) && (czm_infiniteProjection[2][2] == 11.0) && (czm_infiniteProjection[3][2] == 12.0); " +
        "  bool b3 = (czm_infiniteProjection[0][3] == 13.0) && (czm_infiniteProjection[1][3] == 14.0) && (czm_infiniteProjection[2][3] == 15.0) && (czm_infiniteProjection[3][3] == 16.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_modelView", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              1.0,
              0.0,
              1.0,
              0.0,
              1.0,
              0.0,
              0.0,
              1.0,
              1.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_modelView[0][0] == 2.0) && (czm_modelView[1][0] == 0.0) && (czm_modelView[2][0] == 0.0) && (czm_modelView[3][0] == 1.0); " +
        "  bool b1 = (czm_modelView[0][1] == 0.0) && (czm_modelView[1][1] == 2.0) && (czm_modelView[2][1] == 0.0) && (czm_modelView[3][1] == 1.0); " +
        "  bool b2 = (czm_modelView[0][2] == 0.0) && (czm_modelView[1][2] == 0.0) && (czm_modelView[2][2] == 2.0) && (czm_modelView[3][2] == 1.0); " +
        "  bool b3 = (czm_modelView[0][3] == 0.0) && (czm_modelView[1][3] == 0.0) && (czm_modelView[2][3] == 0.0) && (czm_modelView[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_modelView3D", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              1.0,
              0.0,
              1.0,
              0.0,
              1.0,
              0.0,
              0.0,
              1.0,
              1.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_modelView3D[0][0] == 2.0) && (czm_modelView3D[1][0] == 0.0) && (czm_modelView3D[2][0] == 0.0) && (czm_modelView3D[3][0] == 1.0); " +
        "  bool b1 = (czm_modelView3D[0][1] == 0.0) && (czm_modelView3D[1][1] == 2.0) && (czm_modelView3D[2][1] == 0.0) && (czm_modelView3D[3][1] == 1.0); " +
        "  bool b2 = (czm_modelView3D[0][2] == 0.0) && (czm_modelView3D[1][2] == 0.0) && (czm_modelView3D[2][2] == 2.0) && (czm_modelView3D[3][2] == 1.0); " +
        "  bool b3 = (czm_modelView3D[0][3] == 0.0) && (czm_modelView3D[1][3] == 0.0) && (czm_modelView3D[2][3] == 0.0) && (czm_modelView3D[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_modelViewRelativeToEye", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              1.0,
              0.0,
              1.0,
              0.0,
              1.0,
              0.0,
              0.0,
              1.0,
              1.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_modelViewRelativeToEye[0][0] == 2.0) && (czm_modelViewRelativeToEye[1][0] == 0.0) && (czm_modelViewRelativeToEye[2][0] == 0.0) && (czm_modelViewRelativeToEye[3][0] == 0.0); " +
        "  bool b1 = (czm_modelViewRelativeToEye[0][1] == 0.0) && (czm_modelViewRelativeToEye[1][1] == 2.0) && (czm_modelViewRelativeToEye[2][1] == 0.0) && (czm_modelViewRelativeToEye[3][1] == 0.0); " +
        "  bool b2 = (czm_modelViewRelativeToEye[0][2] == 0.0) && (czm_modelViewRelativeToEye[1][2] == 0.0) && (czm_modelViewRelativeToEye[2][2] == 2.0) && (czm_modelViewRelativeToEye[3][2] == 0.0); " +
        "  bool b3 = (czm_modelViewRelativeToEye[0][3] == 0.0) && (czm_modelViewRelativeToEye[1][3] == 0.0) && (czm_modelViewRelativeToEye[2][3] == 0.0) && (czm_modelViewRelativeToEye[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_inverseModelView", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(Matrix4.clone(Matrix4.IDENTITY))
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseModelView[0][0] ==  0.0) && (czm_inverseModelView[1][0] == 1.0) && (czm_inverseModelView[2][0] == 0.0) && (czm_inverseModelView[3][0] == -2.0); " +
        "  bool b1 = (czm_inverseModelView[0][1] == -1.0) && (czm_inverseModelView[1][1] == 0.0) && (czm_inverseModelView[2][1] == 0.0) && (czm_inverseModelView[3][1] ==  1.0); " +
        "  bool b2 = (czm_inverseModelView[0][2] ==  0.0) && (czm_inverseModelView[1][2] == 0.0) && (czm_inverseModelView[2][2] == 1.0) && (czm_inverseModelView[3][2] ==  0.0); " +
        "  bool b3 = (czm_inverseModelView[0][3] ==  0.0) && (czm_inverseModelView[1][3] == 0.0) && (czm_inverseModelView[2][3] == 0.0) && (czm_inverseModelView[3][3] ==  1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        0.0,
        -1.0,
        0.0,
        1.0,
        1.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_inverseModelView3D", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(Matrix4.clone(Matrix4.IDENTITY))
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseModelView3D[0][0] ==  0.0) && (czm_inverseModelView3D[1][0] == 1.0) && (czm_inverseModelView3D[2][0] == 0.0) && (czm_inverseModelView3D[3][0] == -2.0); " +
        "  bool b1 = (czm_inverseModelView3D[0][1] == -1.0) && (czm_inverseModelView3D[1][1] == 0.0) && (czm_inverseModelView3D[2][1] == 0.0) && (czm_inverseModelView3D[3][1] ==  1.0); " +
        "  bool b2 = (czm_inverseModelView3D[0][2] ==  0.0) && (czm_inverseModelView3D[1][2] == 0.0) && (czm_inverseModelView3D[2][2] == 1.0) && (czm_inverseModelView3D[3][2] ==  0.0); " +
        "  bool b3 = (czm_inverseModelView3D[0][3] ==  0.0) && (czm_inverseModelView3D[1][3] == 0.0) && (czm_inverseModelView3D[2][3] == 0.0) && (czm_inverseModelView3D[3][3] ==  1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";
      const m = new Matrix4(
        0.0,
        -1.0,
        0.0,
        1.0,
        1.0,
        0.0,
        0.0,
        2.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_viewProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            ),
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_viewProjection[0][0] == 1.0) && (czm_viewProjection[1][0] == 0.0) && (czm_viewProjection[2][0] == 0.0) && (czm_viewProjection[3][0] == 0.0); " +
        "  bool b1 = (czm_viewProjection[0][1] == 0.0) && (czm_viewProjection[1][1] == 1.0) && (czm_viewProjection[2][1] == 0.0) && (czm_viewProjection[3][1] == 8.0); " +
        "  bool b2 = (czm_viewProjection[0][2] == 0.0) && (czm_viewProjection[1][2] == 0.0) && (czm_viewProjection[2][2] == 1.0) && (czm_viewProjection[3][2] == 9.0); " +
        "  bool b3 = (czm_viewProjection[0][3] == 0.0) && (czm_viewProjection[1][3] == 0.0) && (czm_viewProjection[2][3] == 0.0) && (czm_viewProjection[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";

      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_inverseViewProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            ),
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseViewProjection[0][0] == 1.0) && (czm_inverseViewProjection[1][0] == 0.0) && (czm_inverseViewProjection[2][0] == 0.0) && (czm_inverseViewProjection[3][0] ==  0.0); " +
        "  bool b1 = (czm_inverseViewProjection[0][1] == 0.0) && (czm_inverseViewProjection[1][1] == 1.0) && (czm_inverseViewProjection[2][1] == 0.0) && (czm_inverseViewProjection[3][1] == -8.0); " +
        "  bool b2 = (czm_inverseViewProjection[0][2] == 0.0) && (czm_inverseViewProjection[1][2] == 0.0) && (czm_inverseViewProjection[2][2] == 1.0) && (czm_inverseViewProjection[3][2] == -9.0); " +
        "  bool b3 = (czm_inverseViewProjection[0][3] == 0.0) && (czm_inverseViewProjection[1][3] == 0.0) && (czm_inverseViewProjection[2][3] == 0.0) && (czm_inverseViewProjection[3][3] ==  1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";

      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_modelViewProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            ),
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_modelViewProjection[0][0] == 1.0) && (czm_modelViewProjection[1][0] == 0.0) && (czm_modelViewProjection[2][0] == 0.0) && (czm_modelViewProjection[3][0] == 7.0); " +
        "  bool b1 = (czm_modelViewProjection[0][1] == 0.0) && (czm_modelViewProjection[1][1] == 1.0) && (czm_modelViewProjection[2][1] == 0.0) && (czm_modelViewProjection[3][1] == 8.0); " +
        "  bool b2 = (czm_modelViewProjection[0][2] == 0.0) && (czm_modelViewProjection[1][2] == 0.0) && (czm_modelViewProjection[2][2] == 1.0) && (czm_modelViewProjection[3][2] == 9.0); " +
        "  bool b3 = (czm_modelViewProjection[0][3] == 0.0) && (czm_modelViewProjection[1][3] == 0.0) && (czm_modelViewProjection[2][3] == 0.0) && (czm_modelViewProjection[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";

      const m = new Matrix4(
        1.0,
        0.0,
        0.0,
        7.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_inverseModelViewProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            ),
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_inverseModelViewProjection[0][0] == 1.0) && (czm_inverseModelViewProjection[1][0] == 0.0) && (czm_inverseModelViewProjection[2][0] == 0.0) && (czm_inverseModelViewProjection[3][0] == -7.0); " +
        "  bool b1 = (czm_inverseModelViewProjection[0][1] == 0.0) && (czm_inverseModelViewProjection[1][1] == 1.0) && (czm_inverseModelViewProjection[2][1] == 0.0) && (czm_inverseModelViewProjection[3][1] == -8.0); " +
        "  bool b2 = (czm_inverseModelViewProjection[0][2] == 0.0) && (czm_inverseModelViewProjection[1][2] == 0.0) && (czm_inverseModelViewProjection[2][2] == 1.0) && (czm_inverseModelViewProjection[3][2] == -9.0); " +
        "  bool b3 = (czm_inverseModelViewProjection[0][3] == 0.0) && (czm_inverseModelViewProjection[1][3] == 0.0) && (czm_inverseModelViewProjection[2][3] == 0.0) && (czm_inverseModelViewProjection[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";

      const m = new Matrix4(
        1.0,
        0.0,
        0.0,
        7.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_modelViewProjectionRelativeToEye", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            ),
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_modelViewProjectionRelativeToEye[0][0] == 1.0) && (czm_modelViewProjectionRelativeToEye[1][0] == 0.0) && (czm_modelViewProjectionRelativeToEye[2][0] == 0.0) && (czm_modelViewProjectionRelativeToEye[3][0] == 0.0); " +
        "  bool b1 = (czm_modelViewProjectionRelativeToEye[0][1] == 0.0) && (czm_modelViewProjectionRelativeToEye[1][1] == 1.0) && (czm_modelViewProjectionRelativeToEye[2][1] == 0.0) && (czm_modelViewProjectionRelativeToEye[3][1] == 0.0); " +
        "  bool b2 = (czm_modelViewProjectionRelativeToEye[0][2] == 0.0) && (czm_modelViewProjectionRelativeToEye[1][2] == 0.0) && (czm_modelViewProjectionRelativeToEye[2][2] == 1.0) && (czm_modelViewProjectionRelativeToEye[3][2] == 9.0); " +
        "  bool b3 = (czm_modelViewProjectionRelativeToEye[0][3] == 0.0) && (czm_modelViewProjectionRelativeToEye[1][3] == 0.0) && (czm_modelViewProjectionRelativeToEye[2][3] == 0.0) && (czm_modelViewProjectionRelativeToEye[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";

      const m = new Matrix4(
        1.0,
        0.0,
        0.0,
        7.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_modelViewInfiniteProjection", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              8.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0
            ),
            undefined,
            new Matrix4(
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              0.0,
              0.0,
              0.0,
              0.0,
              1.0,
              9.0,
              0.0,
              0.0,
              0.0,
              1.0
            )
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b0 = (czm_modelViewInfiniteProjection[0][0] == 1.0) && (czm_modelViewInfiniteProjection[1][0] == 0.0) && (czm_modelViewInfiniteProjection[2][0] == 0.0) && (czm_modelViewInfiniteProjection[3][0] == 7.0); " +
        "  bool b1 = (czm_modelViewInfiniteProjection[0][1] == 0.0) && (czm_modelViewInfiniteProjection[1][1] == 1.0) && (czm_modelViewInfiniteProjection[2][1] == 0.0) && (czm_modelViewInfiniteProjection[3][1] == 8.0); " +
        "  bool b2 = (czm_modelViewInfiniteProjection[0][2] == 0.0) && (czm_modelViewInfiniteProjection[1][2] == 0.0) && (czm_modelViewInfiniteProjection[2][2] == 1.0) && (czm_modelViewInfiniteProjection[3][2] == 9.0); " +
        "  bool b3 = (czm_modelViewInfiniteProjection[0][3] == 0.0) && (czm_modelViewInfiniteProjection[1][3] == 0.0) && (czm_modelViewInfiniteProjection[2][3] == 0.0) && (czm_modelViewInfiniteProjection[3][3] == 1.0); " +
        "  gl_FragColor = vec4(b0 && b1 && b2 && b3); " +
        "}";

      const m = new Matrix4(
        1.0,
        0.0,
        0.0,
        7.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_normal", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_normal[0][0] == 1.0) && (czm_normal[1][0] == 0.0) && (czm_normal[2][0] == 0.0) && " +
        "    (czm_normal[0][1] == 0.0) && (czm_normal[1][1] == 1.0) && (czm_normal[2][1] == 0.0) && " +
        "    (czm_normal[0][2] == 0.0) && (czm_normal[1][2] == 0.0) && (czm_normal[2][2] == 1.0) " +
        "  ); " +
        "}";
      const m = new Matrix4(
        1.0,
        0.0,
        0.0,
        7.0,
        0.0,
        1.0,
        0.0,
        8.0,
        0.0,
        0.0,
        1.0,
        9.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_inverseNormal", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_inverseNormal[0][0] ==  0.0) && (czm_inverseNormal[1][0] == 1.0) && (czm_inverseNormal[2][0] == 0.0) && " +
        "    (czm_inverseNormal[0][1] == -1.0) && (czm_inverseNormal[1][1] == 0.0) && (czm_inverseNormal[2][1] == 0.0) && " +
        "    (czm_inverseNormal[0][2] ==  0.0) && (czm_inverseNormal[1][2] == 0.0) && (czm_inverseNormal[2][2] == 1.0) " +
        "  ); " +
        "}";
      const m = new Matrix4(
        0.0,
        -1.0,
        0.0,
        7.0,
        1.0,
        0.0,
        0.0,
        8.0,
        0.0,
        0.0,
        1.0,
        9.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_normal3D", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_normal3D[0][0] == 1.0) && (czm_normal3D[1][0] == 0.0) && (czm_normal3D[2][0] == 0.0) && " +
        "    (czm_normal3D[0][1] == 0.0) && (czm_normal3D[1][1] == 1.0) && (czm_normal3D[2][1] == 0.0) && " +
        "    (czm_normal3D[0][2] == 0.0) && (czm_normal3D[1][2] == 0.0) && (czm_normal3D[2][2] == 1.0) " +
        "  ); " +
        "}";
      const m = new Matrix4(
        1.0,
        0.0,
        0.0,
        7.0,
        0.0,
        1.0,
        0.0,
        8.0,
        0.0,
        0.0,
        1.0,
        9.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_inverseNormal3D", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_inverseNormal3D[0][0] ==  0.0) && (czm_inverseNormal3D[1][0] == 1.0) && (czm_inverseNormal3D[2][0] == 0.0) && " +
        "    (czm_inverseNormal3D[0][1] == -1.0) && (czm_inverseNormal3D[1][1] == 0.0) && (czm_inverseNormal3D[2][1] == 0.0) && " +
        "    (czm_inverseNormal3D[0][2] ==  0.0) && (czm_inverseNormal3D[1][2] == 0.0) && (czm_inverseNormal3D[2][2] == 1.0) " +
        "  ); " +
        "}";
      const m = new Matrix4(
        0.0,
        -1.0,
        0.0,
        7.0,
        1.0,
        0.0,
        0.0,
        8.0,
        0.0,
        0.0,
        1.0,
        9.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
      expect({
        context: context,
        fragmentShader: fs,
        modelMatrix: m,
      }).contextToRender();
    });

    it("has czm_encodedCameraPositionMCHigh and czm_encodedCameraPositionMCLow", function () {
      const us = context.uniformState;
      us.update(
        createFrameState(
          context,
          createMockCamera(
            undefined,
            undefined,
            undefined,
            new Cartesian3(-1000.0, 0.0, 100000.0)
          )
        )
      );

      const fs =
        "void main() { " +
        "  bool b = (czm_encodedCameraPositionMCHigh + czm_encodedCameraPositionMCLow == vec3(-1000.0, 0.0, 100000.0)); " +
        "  gl_FragColor = vec4(b); " +
        "}";

      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_entireFrustum", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4((czm_entireFrustum.x == 1.0) && (czm_entireFrustum.y == 1000.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_frustumPlanes", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(equal(czm_frustumPlanes, vec4(2.0, -2.0, -1.0, 1.0))); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sunPositionWC", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(czm_sunPositionWC != vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sunPositionColumbusView", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(czm_sunPositionColumbusView != vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sunDirectionEC", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(czm_sunDirectionEC != vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sunDirectionWC", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(czm_sunDirectionWC != vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_moonDirectionEC", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(czm_moonDirectionEC != vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_viewerPositionWC", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { gl_FragColor = vec4(czm_viewerPositionWC == vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_frameNumber", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_frameNumber != 0.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_morphTime", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_morphTime == 1.0); " + // 3D
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_temeToPseudoFixed", function () {
      const us = context.uniformState;
      us.update(createFrameState(context, createMockCamera()));

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(" +
        "    (czm_temeToPseudoFixed[0][0] != 0.0) && (czm_temeToPseudoFixed[1][0] != 0.0) && (czm_temeToPseudoFixed[2][0] == 0.0) && " +
        "    (czm_temeToPseudoFixed[0][1] != 0.0) && (czm_temeToPseudoFixed[1][1] != 0.0) && (czm_temeToPseudoFixed[2][1] == 0.0) && " +
        "    (czm_temeToPseudoFixed[0][2] == 0.0) && (czm_temeToPseudoFixed[1][2] == 0.0) && (czm_temeToPseudoFixed[2][2] == 1.0) " +
        "  ); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passEnvironment", function () {
      const us = context.uniformState;
      us.updatePass(Pass.ENVIRONMENT);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passEnvironment);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passCompute", function () {
      const us = context.uniformState;
      us.updatePass(Pass.COMPUTE);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passCompute);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passGlobe", function () {
      const us = context.uniformState;
      us.updatePass(Pass.GLOBE);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passGlobe);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passTerrainClassification", function () {
      const us = context.uniformState;
      us.updatePass(Pass.TERRAIN_CLASSIFICATION);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passTerrainClassification);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passCesium3DTileClassification", function () {
      const us = context.uniformState;
      us.updatePass(Pass.CESIUM_3D_TILE_CLASSIFICATION);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passCesium3DTileClassification);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passOpaque", function () {
      const us = context.uniformState;
      us.updatePass(Pass.OPAQUE);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passOpaque);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passTranslucent", function () {
      const us = context.uniformState;
      us.updatePass(Pass.TRANSLUCENT);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passTranslucent);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_pass and czm_passOverlay", function () {
      const us = context.uniformState;
      us.updatePass(Pass.OVERLAY);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_pass == czm_passOverlay);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sceneMode", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_sceneMode == 3.0); " + // 3D
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sceneMode2D", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_sceneMode2D == 2.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sceneModeColumbusView", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_sceneModeColumbusView == 1.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sceneMode3D", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_sceneMode3D == 3.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_sceneModeMorphing", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_sceneModeMorphing == 0.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_eyeHeight", function () {
      const frameState = createFrameState(context, createMockCamera());
      context.uniformState.update(frameState);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_eyeHeight == 10.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_eyeHeight2D == 0,0 in Scene3D", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_eyeHeight2D.x == 0.0, czm_eyeHeight2D.y == 0.0, 1.0, 1.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_eyeHeight2D in Scene2D", function () {
      const us = context.uniformState;
      const camera = createCamera();
      const frustum = new OrthographicOffCenterFrustum();
      frustum.near = 1.0;
      frustum.far = 2.0;
      frustum.left = -2.0;
      frustum.right = 2.0;
      frustum.top = 1.0;
      frustum.bottom = -1.0;
      camera.frustum = frustum;
      const frameState = createFrameState(context, camera);
      frameState.mode = SceneMode.SCENE2D;

      us.update(frameState);
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_eyeHeight2D.x == 2.0, czm_eyeHeight2D.y == 4.0, 1.0, 1.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_splitPosition", function () {
      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_splitPosition == 0.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_backgroundColor", function () {
      const frameState = createFrameState(context, createMockCamera());
      frameState.backgroundColor = new Color(0.0, 0.25, 0.75, 1.0);
      context.uniformState.update(frameState);

      const fs =
        "void main() { " +
        "  gl_FragColor = vec4(czm_backgroundColor.r == 0.0, czm_backgroundColor.g == 0.25, czm_backgroundColor.b == 0.75, czm_backgroundColor.a == 1.0); " +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_minimumDisableDepthTestDistance", function () {
      const frameState = createFrameState(context, createMockCamera());
      context.uniformState.update(frameState);
      const fs =
        "void main() {" +
        "  gl_FragColor = vec4(czm_minimumDisableDepthTestDistance == 0.0);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_orthographicIn3D", function () {
      const frameState = createFrameState(context, createMockCamera());
      context.uniformState.update(frameState);
      let fs =
        "void main() {" +
        "  gl_FragColor = vec4(czm_orthographicIn3D == 0.0);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();

      const frustum = new OrthographicFrustum();
      frustum.aspectRatio = 1.0;
      frustum.width = 1.0;
      frameState.camera.frustum = frustum;
      context.uniformState.update(frameState);
      fs =
        "void main() {" +
        "  gl_FragColor = vec4(czm_orthographicIn3D == 1.0);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_gamma", function () {
      context.uniformState.gamma = 1.0;
      const fs =
        "void main() {" + "  gl_FragColor = vec4(czm_gamma == 1.0);" + "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_lightDirectionEC", function () {
      const us = context.uniformState;
      const frameState = createFrameState(context, createMockCamera());
      frameState.light = new DirectionalLight({
        direction: new Cartesian3(0.0, 0.0, 1.0),
      });
      us.update(frameState);
      const fs =
        "void main() { gl_FragColor = vec4(czm_lightDirectionEC != vec3(0.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_lightDirectionWC", function () {
      const us = context.uniformState;
      const frameState = createFrameState(context, createMockCamera());
      frameState.light = new DirectionalLight({
        direction: new Cartesian3(0.0, 0.0, 1.0),
      });
      us.update(frameState);
      const fs =
        "void main() { gl_FragColor = vec4(czm_lightDirectionWC == vec3(0.0, 0.0, -1.0)); }";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_lightColor", function () {
      const us = context.uniformState;
      const frameState = createFrameState(context, createMockCamera());
      frameState.light = new DirectionalLight({
        direction: new Cartesian3(0.0, 0.0, 1.0),
        color: new Color(0.25, 0.5, 1.0),
        intensity: 2.0,
      });
      us.update(frameState);
      const fs =
        "void main() {" +
        "  bool b0 = czm_lightColor.x == 0.25;" +
        "  bool b1 = czm_lightColor.y == 0.5;" +
        "  bool b2 = czm_lightColor.z == 1.0;" +
        "  gl_FragColor = vec4(b0 && b1 && b2);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_lightColorHdr", function () {
      const us = context.uniformState;
      const frameState = createFrameState(context, createMockCamera());
      frameState.light = new DirectionalLight({
        direction: new Cartesian3(0.0, 0.0, 1.0),
        color: new Color(0.25, 0.5, 1.0),
        intensity: 2.0,
      });
      us.update(frameState);
      const fs =
        "void main() {" +
        "  bool b0 = czm_lightColorHdr.x == 0.5;" +
        "  bool b1 = czm_lightColorHdr.y == 1.0;" +
        "  bool b2 = czm_lightColorHdr.z == 2.0;" +
        "  gl_FragColor = vec4(b0 && b1 && b2);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_ellipsoidRadii", function () {
      const us = context.uniformState;
      const frameState = createFrameState(context, createMockCamera());
      const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
      frameState.mapProjection = new GeographicProjection(ellipsoid);
      us.update(frameState);
      const fs =
        "void main() {" +
        "  bool b0 = czm_ellipsoidRadii.x == 1.0;" +
        "  bool b1 = czm_ellipsoidRadii.y == 2.0;" +
        "  bool b2 = czm_ellipsoidRadii.z == 3.0;" +
        "  gl_FragColor = vec4(b0 && b1 && b2);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });

    it("has czm_ellipsoidInverseRadii", function () {
      const us = context.uniformState;
      const frameState = createFrameState(context, createMockCamera());
      const ellipsoid = new Ellipsoid(1.0, 1.0 / 2.0, 1.0 / 3.0);
      frameState.mapProjection = new GeographicProjection(ellipsoid);
      us.update(frameState);
      const fs =
        "float roundNumber(float number) { return floor(number + 0.5); }" +
        "void main() {" +
        "  bool b0 = roundNumber(czm_ellipsoidInverseRadii.x) == 1.0;" +
        "  bool b1 = roundNumber(czm_ellipsoidInverseRadii.y) == 2.0;" +
        "  bool b2 = roundNumber(czm_ellipsoidInverseRadii.z) == 3.0;" +
        "  gl_FragColor = vec4(b0 && b1 && b2);" +
        "}";
      expect({
        context: context,
        fragmentShader: fs,
      }).contextToRender();
    });
  },
  "WebGL"
);
