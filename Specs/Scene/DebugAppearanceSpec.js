import { ComponentDatatype } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { GeometryInstance } from "../../Source/Cesium.js";
import { GeometryInstanceAttribute } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { RectangleGeometry } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import { Appearance } from "../../Source/Cesium.js";
import { DebugAppearance } from "../../Source/Cesium.js";
import { Primitive } from "../../Source/Cesium.js";
import createScene from "../createScene.js";

describe(
  "Scene/DebugAppearance",
  function () {
    let scene;
    let primitive;
    const rectangle = Rectangle.fromDegrees(-10.0, -10.0, 10.0, 10.0);

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
      scene.frameState.scene3DOnly = false;
    });

    beforeEach(function () {
      scene.camera.setView({ destination: rectangle });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    function createInstance(vertexFormat) {
      return new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: defaultValue(vertexFormat, VertexFormat.ALL),
          rectangle: rectangle,
        }),
      });
    }

    it("constructor throws without attributeName", function () {
      expect(function () {
        return new DebugAppearance();
      }).toThrowDeveloperError();
    });

    it("default construct with normal, bitangent, or tangent attribute name", function () {
      const a = new DebugAppearance({
        attributeName: "normal",
        perInstanceAttribute: false,
      });

      expect(a.vertexShaderSource).toBeDefined();
      expect(a.vertexShaderSource.indexOf("normal")).toBeGreaterThan(-1);
      expect(a.vertexShaderSource.indexOf("v_normal")).toBeGreaterThan(-1);

      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.fragmentShaderSource.indexOf("v_normal")).toBeGreaterThan(-1);

      expect(a.material).not.toBeDefined();
      expect(a.attributeName).toEqual("normal");
      expect(a.glslDatatype).toEqual("vec3");
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(false, false)
      );
      expect(a.translucent).toEqual(false);
      expect(a.closed).toEqual(false);
    });

    it("default construct with st attribute name", function () {
      const a = new DebugAppearance({
        attributeName: "st",
        perInstanceAttribute: false,
      });

      expect(a.vertexShaderSource).toBeDefined();
      expect(a.vertexShaderSource.indexOf("st")).toBeGreaterThan(-1);
      expect(a.vertexShaderSource.indexOf("v_st")).toBeGreaterThan(-1);

      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.fragmentShaderSource.indexOf("v_st")).toBeGreaterThan(-1);

      expect(a.material).not.toBeDefined();
      expect(a.attributeName).toEqual("st");
      expect(a.glslDatatype).toEqual("vec2");
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(false, false)
      );
      expect(a.translucent).toEqual(false);
      expect(a.closed).toEqual(false);
    });

    it("debug appearance with float attribute name", function () {
      const a = new DebugAppearance({
        attributeName: "rotation",
        glslDatatype: "float",
        perInstanceAttribute: true,
      });

      expect(a.vertexShaderSource).toBeDefined();
      expect(a.vertexShaderSource.indexOf("rotation")).toBeGreaterThan(-1);
      expect(a.vertexShaderSource.indexOf("v_rotation")).toBeGreaterThan(-1);

      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.fragmentShaderSource.indexOf("v_rotation")).toBeGreaterThan(-1);

      expect(a.material).not.toBeDefined();
      expect(a.attributeName).toEqual("rotation");
      expect(a.glslDatatype).toEqual("float");
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(false, false)
      );
      expect(a.translucent).toEqual(false);
      expect(a.closed).toEqual(false);
    });

    it("debug appearance with vec3 attribute name", function () {
      const a = new DebugAppearance({
        attributeName: "str",
        glslDatatype: "vec3",
        perInstanceAttribute: false,
      });

      expect(a.vertexShaderSource).toBeDefined();
      expect(a.vertexShaderSource.indexOf("str")).toBeGreaterThan(-1);
      expect(a.vertexShaderSource.indexOf("v_str")).toBeGreaterThan(-1);

      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.fragmentShaderSource.indexOf("v_str")).toBeGreaterThan(-1);

      expect(a.material).not.toBeDefined();
      expect(a.attributeName).toEqual("str");
      expect(a.glslDatatype).toEqual("vec3");
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(false, false)
      );
      expect(a.translucent).toEqual(false);
      expect(a.closed).toEqual(false);
    });

    it("debug appearance with vec4 attribute name", function () {
      const a = new DebugAppearance({
        attributeName: "quaternion",
        glslDatatype: "vec4",
        perInstanceAttribute: true,
      });

      expect(a.vertexShaderSource).toBeDefined();
      expect(a.vertexShaderSource.indexOf("quaternion")).toBeGreaterThan(-1);
      expect(a.vertexShaderSource.indexOf("v_quaternion")).toBeGreaterThan(-1);

      expect(a.fragmentShaderSource).toBeDefined();
      expect(a.fragmentShaderSource.indexOf("v_quaternion")).toBeGreaterThan(
        -1
      );

      expect(a.material).not.toBeDefined();
      expect(a.attributeName).toEqual("quaternion");
      expect(a.glslDatatype).toEqual("vec4");
      expect(a.renderState).toEqual(
        Appearance.getDefaultRenderState(false, false)
      );
      expect(a.translucent).toEqual(false);
      expect(a.closed).toEqual(false);
    });

    it("debug appearance throws with invalid glsl datatype", function () {
      expect(function () {
        return new DebugAppearance({
          attributeName: "invalid_datatype",
          glslDatatype: "invalid",
          perInstanceAttribute: true,
        });
      }).toThrowDeveloperError();
    });

    it("renders normal", function () {
      const vertexFormat = new VertexFormat({
        position: true,
        normal: true,
      });
      primitive = new Primitive({
        geometryInstances: createInstance(vertexFormat),
        appearance: new DebugAppearance({
          attributeName: "normal",
          perInstanceAttribute: false,
        }),
        asynchronous: false,
        compressVertices: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders bitangent", function () {
      const vertexFormat = new VertexFormat({
        position: true,
        normal: true,
        bitangent: true,
      });
      primitive = new Primitive({
        geometryInstances: createInstance(vertexFormat),
        appearance: new DebugAppearance({
          attributeName: "bitangent",
          perInstanceAttribute: false,
        }),
        asynchronous: false,
        compressVertices: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders tangent", function () {
      const vertexFormat = new VertexFormat({
        position: true,
        normal: true,
        tangent: true,
      });
      primitive = new Primitive({
        geometryInstances: createInstance(vertexFormat),
        appearance: new DebugAppearance({
          attributeName: "tangent",
          perInstanceAttribute: false,
        }),
        asynchronous: false,
        compressVertices: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders st", function () {
      const vertexFormat = new VertexFormat({
        position: true,
        st: true,
      });
      primitive = new Primitive({
        geometryInstances: createInstance(vertexFormat),
        appearance: new DebugAppearance({
          attributeName: "st",
          perInstanceAttribute: false,
        }),
        asynchronous: false,
        compressVertices: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders float", function () {
      const rectangleInstance = createInstance();
      rectangleInstance.attributes = {
        debug: new GeometryInstanceAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          value: [1.0],
        }),
      };
      primitive = new Primitive({
        geometryInstances: rectangleInstance,
        appearance: new DebugAppearance({
          attributeName: "debug",
          glslDatatype: "float",
          perInstanceAttribute: true,
        }),
        asynchronous: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders vec2", function () {
      const rectangleInstance = createInstance();
      rectangleInstance.attributes = {
        debug: new GeometryInstanceAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          value: [1.0, 2.0],
        }),
      };
      primitive = new Primitive({
        geometryInstances: rectangleInstance,
        appearance: new DebugAppearance({
          attributeName: "debug",
          glslDatatype: "vec2",
          perInstanceAttribute: true,
        }),
        asynchronous: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders vec3", function () {
      const rectangleInstance = createInstance();
      rectangleInstance.attributes = {
        debug: new GeometryInstanceAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          value: [1.0, 2.0, 3.0],
        }),
      };
      primitive = new Primitive({
        geometryInstances: rectangleInstance,
        appearance: new DebugAppearance({
          attributeName: "debug",
          glslDatatype: "vec3",
          perInstanceAttribute: true,
        }),
        asynchronous: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });

    it("renders vec4", function () {
      const rectangleInstance = createInstance();
      rectangleInstance.attributes = {
        debug: new GeometryInstanceAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          value: [1.0, 2.0, 3.0, 4.0],
        }),
      };
      primitive = new Primitive({
        geometryInstances: rectangleInstance,
        appearance: new DebugAppearance({
          attributeName: "debug",
          glslDatatype: "vec4",
          perInstanceAttribute: true,
        }),
        asynchronous: false,
      });
      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    });
  },
  "WebGL"
);
