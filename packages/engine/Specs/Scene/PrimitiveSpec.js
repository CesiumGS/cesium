import {
  BoundingSphere,
  BoxGeometry,
  Cartesian3,
  ColorGeometryInstanceAttribute,
  ComponentDatatype,
  CylinderGeometry,
  defined,
  DistanceDisplayConditionGeometryInstanceAttribute,
  Ellipsoid,
  Geometry,
  GeometryAttribute,
  GeometryInstance,
  GeometryInstanceAttribute,
  HeadingPitchRange,
  Matrix4,
  PerspectiveFrustum,
  PolygonGeometry,
  PrimitiveType,
  Rectangle,
  RectangleGeometry,
  ShowGeometryInstanceAttribute,
  Transforms,
  Camera,
  MaterialAppearance,
  PerInstanceColorAppearance,
  Primitive,
  SceneMode,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import BadGeometry from "../../../../Specs/BadGeometry.js";
import createContext from "../../../../Specs/createContext.js";
import createFrameState from "../../../../Specs/createFrameState.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/Primitive",
  function () {
    let scene;
    let context;

    let frameStateContext;
    let frameState;

    let ellipsoid;

    let rectangle1;
    let rectangle2;

    let rectangleInstance1;
    let rectangleInstance2;

    let primitive;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
      context = scene.context;
      ellipsoid = Ellipsoid.WGS84;

      frameStateContext = createContext();
    });

    afterAll(function () {
      scene.destroyForSpecs();
      frameStateContext.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0);

      const camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);

      scene.frameState.passes.render = true;
      scene.frameState.passes.pick = false;

      // Mock frameState, separate from scene.frameState, used for test that call primitive.update directly
      frameState = createFrameState(frameStateContext);

      rectangle1 = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);
      rectangle2 = Rectangle.fromDegrees(70.0, 20.0, 80.0, 30.0);

      let translation = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(
          ellipsoid.cartographicToCartesian(Rectangle.center(rectangle1)),
          new Cartesian3()
        ),
        2.0,
        new Cartesian3()
      );
      rectangleInstance1 = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rectangle1,
        }),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        id: "rectangle1",
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          show: new ShowGeometryInstanceAttribute(true),
        },
      });

      translation = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(
          ellipsoid.cartographicToCartesian(Rectangle.center(rectangle2)),
          new Cartesian3()
        ),
        3.0,
        new Cartesian3()
      );
      rectangleInstance2 = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rectangle2,
        }),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        id: "rectangle2",
        attributes: {
          color: new ColorGeometryInstanceAttribute(0.0, 1.0, 1.0, 1.0),
          show: new ShowGeometryInstanceAttribute(true),
        },
      });
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitive = primitive && !primitive.isDestroyed() && primitive.destroy();
    });

    it("default constructs", function () {
      primitive = new Primitive();
      expect(primitive.geometryInstances).not.toBeDefined();
      expect(primitive.appearance).not.toBeDefined();
      expect(primitive.depthFailAppearance).not.toBeDefined();
      expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(primitive.show).toEqual(true);
      expect(primitive.vertexCacheOptimize).toEqual(false);
      expect(primitive.interleave).toEqual(false);
      expect(primitive.compressVertices).toEqual(true);
      expect(primitive.releaseGeometryInstances).toEqual(true);
      expect(primitive.allowPicking).toEqual(true);
      expect(primitive.cull).toEqual(true);
      expect(primitive.asynchronous).toEqual(true);
      expect(primitive.debugShowBoundingVolume).toEqual(false);
    });

    it("Constructs with options", function () {
      const geometryInstances = {};
      const appearance = {};
      const depthFailAppearance = {};
      const modelMatrix = Matrix4.fromUniformScale(5.0);

      primitive = new Primitive({
        geometryInstances: geometryInstances,
        appearance: appearance,
        depthFailAppearance: depthFailAppearance,
        modelMatrix: modelMatrix,
        show: false,
        vertexCacheOptimize: true,
        interleave: true,
        compressVertices: false,
        releaseGeometryInstances: false,
        allowPicking: false,
        cull: false,
        asynchronous: false,
        debugShowBoundingVolume: true,
      });

      expect(primitive.geometryInstances).toEqual(geometryInstances);
      expect(primitive.appearance).toEqual(appearance);
      expect(primitive.depthFailAppearance).toEqual(depthFailAppearance);
      expect(primitive.modelMatrix).toEqual(modelMatrix);
      expect(primitive.show).toEqual(false);
      expect(primitive.vertexCacheOptimize).toEqual(true);
      expect(primitive.interleave).toEqual(true);
      expect(primitive.compressVertices).toEqual(false);
      expect(primitive.releaseGeometryInstances).toEqual(false);
      expect(primitive.allowPicking).toEqual(false);
      expect(primitive.cull).toEqual(false);
      expect(primitive.asynchronous).toEqual(false);
      expect(primitive.debugShowBoundingVolume).toEqual(true);
    });

    it("releases geometry instances when releaseGeometryInstances is true", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        releaseGeometryInstances: true,
        asynchronous: false,
      });

      expect(primitive.geometryInstances).toBeDefined();
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      expect(primitive.geometryInstances).not.toBeDefined();
    });

    it("does not release geometry instances when releaseGeometryInstances is false", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        releaseGeometryInstances: false,
        asynchronous: false,
      });

      expect(primitive.geometryInstances).toBeDefined();
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      expect(primitive.geometryInstances).toBeDefined();
    });

    it("adds afterRender promise to frame state", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        releaseGeometryInstances: false,
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.renderForSpecs();

      return primitive.readyPromise.then(function (param) {
        expect(param.ready).toBe(true);
      });
    });

    it("does not render when geometryInstances is an empty array", function () {
      primitive = new Primitive({
        geometryInstances: [],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.commandList.length = 0;
      primitive.update(frameState);
      expect(frameState.commandList.length).toEqual(0);
    });

    it("does not render when show is false", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      primitive.update(frameState);
      expect(frameState.commandList.length).toBeGreaterThan(0);

      frameState.commandList.length = 0;
      primitive.show = false;
      primitive.update(frameState);
      expect(frameState.commandList.length).toEqual(0);
    });

    it("does not render other than for the color or pick pass", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.passes.render = false;
      frameState.passes.pick = false;

      primitive.update(frameState);
      expect(frameState.commandList.length).toEqual(0);
    });

    it("does not render when scene3DOnly is true and the scene mode is SCENE2D", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.mode = SceneMode.SCENE2D;
      frameState.scene3DOnly = true;

      primitive.update(frameState);
      expect(frameState.commandList.length).toEqual(0);
    });

    it("does not render when scene3DOnly is true and the scene mode is COLUMBUS_VIEW", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.mode = SceneMode.COLUMBUS_VIEW;
      frameState.scene3DOnly = true;

      primitive.update(frameState);
      expect(frameState.commandList.length).toEqual(0);
    });

    it("renders in two passes for closed, translucent geometry", function () {
      primitive = new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: BoxGeometry.fromDimensions({
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            dimensions: new Cartesian3(500000.0, 500000.0, 500000.0),
          }),
          id: "box",
          attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 0.5),
          },
        }),
        appearance: new PerInstanceColorAppearance({
          closed: true,
          translucent: true,
        }),
        asynchronous: false,
      });

      const frameState = scene.frameState;
      frameState.commandList.length = 0;

      // set scene3DOnly to true so that the geometry is not split due to the IDL
      frameState.scene3DOnly = true;
      scene.primitives.add(primitive);
      scene.render();
      expect(frameState.commandList.length).toEqual(2);
    });

    function verifyPrimitiveRender(primitive, rectangle) {
      scene.primitives.removeAll();
      if (defined(rectangle)) {
        scene.camera.setView({ destination: rectangle });
      }
      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitive);
      expect(scene).notToRender([0, 0, 0, 255]);
    }

    it("renders in Columbus view when scene3DOnly is false", function () {
      scene.frameState.scene3DOnly = false;
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.morphToColumbusView(0);
      verifyPrimitiveRender(primitive, rectangle1);
      verifyPrimitiveRender(primitive, rectangle2);
    });

    it("renders in 2D when scene3DOnly is false", function () {
      scene.frameState.scene3DOnly = false;
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.morphTo2D(0);
      verifyPrimitiveRender(primitive, rectangle1);
      verifyPrimitiveRender(primitive, rectangle2);
    });

    it("renders RTC", function () {
      const dimensions = new Cartesian3(400.0, 300.0, 500.0);
      const positionOnEllipsoid = Cartesian3.fromDegrees(-105.0, 45.0);
      const boxModelMatrix = Matrix4.multiplyByTranslation(
        Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
        new Cartesian3(0.0, 0.0, dimensions.z * 0.5),
        new Matrix4()
      );

      const boxGeometry = BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          dimensions: dimensions,
        })
      );

      const positions = boxGeometry.attributes.position.values;
      const newPositions = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; ++i) {
        newPositions[i] = positions[i];
      }
      boxGeometry.attributes.position.values = newPositions;
      boxGeometry.attributes.position.componentDatatype =
        ComponentDatatype.FLOAT;

      BoundingSphere.transform(
        boxGeometry.boundingSphere,
        boxModelMatrix,
        boxGeometry.boundingSphere
      );

      const boxGeometryInstance = new GeometryInstance({
        geometry: boxGeometry,
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 0.5),
        },
      });

      const primitive = new Primitive({
        geometryInstances: boxGeometryInstance,
        appearance: new PerInstanceColorAppearance({
          closed: true,
        }),
        asynchronous: false,
        allowPicking: false,
        rtcCenter: boxGeometry.boundingSphere.center,
      });

      // create test camera
      const camera = scene.camera;
      const testCamera = new Camera(scene);
      testCamera.viewBoundingSphere(boxGeometry.boundingSphere);
      scene.camera = testCamera;

      scene.frameState.scene3DOnly = true;
      verifyPrimitiveRender(primitive);

      scene.camera = camera;
    });

    it("renders with depth fail appearance", function () {
      const rect = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
      const translation = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(
          ellipsoid.cartographicToCartesian(Rectangle.center(rect)),
          new Cartesian3()
        ),
        100.0,
        new Cartesian3()
      );
      const rectInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rect,
        }),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        id: "rect",
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
        },
      });
      const p0 = new Primitive({
        geometryInstances: rectInstance,
        appearance: new PerInstanceColorAppearance({
          translucent: false,
        }),
        asynchronous: false,
      });

      const rectInstance2 = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rect,
        }),
        id: "rect2",
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
          depthFailColor: new ColorGeometryInstanceAttribute(
            1.0,
            0.0,
            1.0,
            1.0
          ),
        },
      });
      const p1 = new Primitive({
        geometryInstances: rectInstance2,
        appearance: new PerInstanceColorAppearance({
          translucent: false,
        }),
        depthFailAppearance: new PerInstanceColorAppearance({
          translucent: false,
        }),
        asynchronous: false,
      });

      scene.primitives.add(p0);
      scene.primitives.add(p1);
      scene.camera.setView({ destination: rect });
      scene.renderForSpecs();

      expect(scene).toRender([255, 0, 255, 255]);
    });

    it("pick with depth fail appearance", function () {
      const rect = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
      const translation = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(
          ellipsoid.cartographicToCartesian(Rectangle.center(rect)),
          new Cartesian3()
        ),
        100.0,
        new Cartesian3()
      );
      const rectInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rect,
        }),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        id: "rect",
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
        },
      });
      const p0 = new Primitive({
        geometryInstances: rectInstance,
        appearance: new PerInstanceColorAppearance({
          translucent: false,
        }),
        asynchronous: false,
      });

      const rectInstance2 = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rect,
        }),
        id: "rect2",
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
          depthFailColor: new ColorGeometryInstanceAttribute(
            1.0,
            0.0,
            1.0,
            1.0
          ),
        },
      });
      const p1 = new Primitive({
        geometryInstances: rectInstance2,
        appearance: new PerInstanceColorAppearance({
          translucent: false,
        }),
        depthFailAppearance: new PerInstanceColorAppearance({
          translucent: false,
        }),
        asynchronous: false,
      });

      scene.primitives.add(p0);
      scene.primitives.add(p1);
      scene.camera.setView({ destination: rect });
      scene.renderForSpecs();

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(p1);
        expect(result.id).toEqual("rect2");
      });
    });

    it("RTC throws with more than one instance", function () {
      expect(function () {
        return new Primitive({
          geometryInstances: [rectangleInstance1, rectangleInstance2],
          appearance: new PerInstanceColorAppearance({
            closed: true,
          }),
          asynchronous: false,
          allowPicking: false,
          rtcCenter: Cartesian3.ZERO,
        });
      }).toThrowDeveloperError();
    });

    it("RTC throws if the scene is not 3D only", function () {
      scene.frameState.scene3DOnly = false;
      const primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance({
          closed: true,
        }),
        asynchronous: false,
        allowPicking: false,
        rtcCenter: Cartesian3.ZERO,
      });

      expect(function () {
        verifyPrimitiveRender(primitive);
      }).toThrowDeveloperError();
    });

    it("updates model matrix for one instance in 3D", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      primitive.update(frameState);
      const commands = frameState.commandList;
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(primitive.modelMatrix);

      const modelMatrix = Matrix4.fromUniformScale(10.0);
      primitive.modelMatrix = modelMatrix;

      commands.length = 0;
      primitive.update(frameState);
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(modelMatrix);
    });

    it("updates model matrix for more than one instance in 3D with equal model matrices in 3D only scene", function () {
      let modelMatrix = Matrix4.fromUniformScale(2.0);
      rectangleInstance1.modelMatrix = modelMatrix;
      rectangleInstance2.modelMatrix = modelMatrix;

      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.scene3DOnly = true;

      const commands = frameState.commandList;
      commands.length = 0;
      primitive.update(frameState);
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(modelMatrix);

      modelMatrix = Matrix4.fromUniformScale(10.0);
      primitive.modelMatrix = modelMatrix;

      commands.length = 0;
      primitive.update(frameState);
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(modelMatrix);
    });

    it("computes model matrix when given one for a single instance and for the primitive in 3D only", function () {
      const instanceModelMatrix = Matrix4.fromUniformScale(2.0);

      const dimensions = new Cartesian3(400000.0, 300000.0, 500000.0);
      const positionOnEllipsoid = Cartesian3.fromDegrees(-105.0, 45.0);
      const primitiveModelMatrix = Matrix4.multiplyByTranslation(
        Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
        new Cartesian3(0.0, 0.0, dimensions.z * 0.5),
        new Matrix4()
      );

      const boxGeometry = BoxGeometry.fromDimensions({
        vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
        dimensions: dimensions,
      });
      const boxGeometryInstance = new GeometryInstance({
        geometry: boxGeometry,
        modelMatrix: instanceModelMatrix,
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 1.0),
        },
      });
      primitive = new Primitive({
        geometryInstances: boxGeometryInstance,
        modelMatrix: primitiveModelMatrix,
        appearance: new PerInstanceColorAppearance({
          translucent: false,
          closed: true,
        }),
        asynchronous: false,
      });

      const expectedModelMatrix = Matrix4.multiplyTransformation(
        primitiveModelMatrix,
        instanceModelMatrix,
        new Matrix4()
      );

      frameState.scene3DOnly = true;

      const commands = frameState.commandList;
      commands.length = 0;
      primitive.update(frameState);
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(expectedModelMatrix);
    });

    it("update model matrix throws in Columbus view", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.mode = SceneMode.COLUMBUS_VIEW;
      frameState.scene3DOnly = false;

      const commands = frameState.commandList;
      commands.length = 0;
      primitive.update(frameState);
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

      const modelMatrix = Matrix4.fromUniformScale(10.0);
      primitive.modelMatrix = modelMatrix;

      commands.length = 0;
      expect(function () {
        primitive.update(frameState);
      }).toThrowDeveloperError();
    });

    it("update model matrix throws in 2D", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      frameState.mode = SceneMode.SCENE2D;
      frameState.scene3DOnly = false;

      const commands = frameState.commandList;
      primitive.update(frameState);
      expect(commands.length).toEqual(1);
      expect(commands[0].modelMatrix).toEqual(Matrix4.IDENTITY);

      const modelMatrix = Matrix4.fromUniformScale(10.0);
      primitive.modelMatrix = modelMatrix;

      commands.length = 0;
      expect(function () {
        primitive.update(frameState);
      }).toThrowDeveloperError();
    });

    it("renders bounding volume with debugShowBoundingVolume", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
        debugShowBoundingVolume: true,
      });

      scene.primitives.add(primitive);
      scene.camera.setView({ destination: rectangle1 });
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(0);
        expect(rgba[1]).toBeGreaterThanOrEqual(0);
        expect(rgba[2]).toBeGreaterThanOrEqual(0);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("transforms to world coordinates", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      verifyPrimitiveRender(primitive, rectangle1);
      verifyPrimitiveRender(primitive, rectangle2);
      expect(primitive.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it("does not transform to world coordinates", function () {
      rectangleInstance2.modelMatrix = Matrix4.clone(
        rectangleInstance1.modelMatrix
      );
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.frameState.scene3DOnly = true;
      verifyPrimitiveRender(primitive, rectangle1);
      verifyPrimitiveRender(primitive, rectangle2);
      expect(primitive.modelMatrix).not.toEqual(Matrix4.IDENTITY);
      scene.frameState.scene3DOnly = true;
    });

    it("get common per instance attributes", function () {
      rectangleInstance2.attributes.not_used = new GeometryInstanceAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 1,
        value: [0.5],
      });

      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.renderForSpecs();

      let attributes = primitive.getGeometryInstanceAttributes("rectangle1");
      expect(attributes.color).toBeDefined();
      expect(attributes.show).toBeDefined();

      attributes = primitive.getGeometryInstanceAttributes("rectangle2");
      expect(attributes.color).toBeDefined();
      expect(attributes.show).toBeDefined();
      expect(attributes.not_used).not.toBeDefined();
    });

    it("modify color instance attribute", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.camera.setView({ destination: rectangle1 });
      scene.primitives.add(primitive);
      let pixels;
      expect(scene).toRenderAndCall(function (rgba) {
        pixels = rgba;
        expect(rgba).not.toEqual([0, 0, 0, 255]);
      });

      const attributes = primitive.getGeometryInstanceAttributes("rectangle1");
      expect(attributes.color).toBeDefined();
      attributes.color = [255, 255, 255, 255];

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        expect(rgba).not.toEqual(pixels);
      });
    });

    it("modify show instance attribute", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.camera.setView({ destination: rectangle1 });
      expect(scene).notToRender([0, 0, 0, 255]);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle1");
      expect(attributes.show).toBeDefined();
      attributes.show = [0];

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("get bounding sphere from per instance attribute", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      verifyPrimitiveRender(primitive, rectangle1);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle1");
      expect(attributes.boundingSphere).toBeDefined();
    });

    it("renders with distance display condition per instance attribute", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      const near = 10000.0;
      const far = 1000000.0;
      const rect = Rectangle.fromDegrees(-1.0, -1.0, 1.0, 1.0);
      const translation = Cartesian3.multiplyByScalar(
        Cartesian3.normalize(
          ellipsoid.cartographicToCartesian(Rectangle.center(rect)),
          new Cartesian3()
        ),
        2.0,
        new Cartesian3()
      );
      const rectInstance = new GeometryInstance({
        geometry: new RectangleGeometry({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          ellipsoid: ellipsoid,
          rectangle: rect,
        }),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        id: "rect",
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(
            near,
            far
          ),
        },
      });

      primitive = new Primitive({
        geometryInstances: rectInstance,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.camera.setView({ destination: rect });
      scene.renderForSpecs();

      const boundingSphere = primitive.getGeometryInstanceAttributes("rect")
        .boundingSphere;
      const center = boundingSphere.center;
      const radius = boundingSphere.radius;

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius)
      );
      expect(scene).toRender([0, 0, 0, 255]);

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + near + 1.0)
      );
      expect(scene).notToRender([0, 0, 0, 255]);

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, -CesiumMath.PI_OVER_TWO, radius + far + 1.0)
      );
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("primitive with display condition properly transforms boundingSphere", function () {
      const near = 10000.0;
      const far = 1000000.0;
      const translation = new Cartesian3(10, 20, 30);

      const cylinder = new GeometryInstance({
        id: "cylinder",
        vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
        geometry: new CylinderGeometry({
          length: 10,
          topRadius: 10,
          bottomRadius: 10,
        }),
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          show: new ShowGeometryInstanceAttribute(true),
          distanceDisplayCondition: new DistanceDisplayConditionGeometryInstanceAttribute(
            near,
            far
          ),
        },
      });

      primitive = new Primitive({
        geometryInstances: cylinder,
        appearance: new PerInstanceColorAppearance(),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.frameState.scene3DOnly = true;
      scene.renderForSpecs();

      const boundingSphere = primitive.getGeometryInstanceAttributes("cylinder")
        .boundingSphere;
      const center = boundingSphere.center;
      expect(center).toEqual(translation);
    });

    it("primitive without display condition properly transforms boundingSphere", function () {
      const translation = new Cartesian3(10, 20, 30);

      const cylinder = new GeometryInstance({
        id: "cylinder",
        vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
        geometry: new CylinderGeometry({
          length: 10,
          topRadius: 10,
          bottomRadius: 10,
        }),
        attributes: {
          color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 1.0),
          show: new ShowGeometryInstanceAttribute(true),
        },
      });

      primitive = new Primitive({
        geometryInstances: cylinder,
        appearance: new PerInstanceColorAppearance(),
        modelMatrix: Matrix4.fromTranslation(translation, new Matrix4()),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.frameState.scene3DOnly = true;
      scene.renderForSpecs();

      const boundingSphere = primitive.getGeometryInstanceAttributes("cylinder")
        .boundingSphere;
      const center = boundingSphere.center;
      expect(center).toEqual(translation);
    });

    it("getGeometryInstanceAttributes returns same object each time", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      verifyPrimitiveRender(primitive, rectangle1);

      const attributes = primitive.getGeometryInstanceAttributes("rectangle1");
      const attributes2 = primitive.getGeometryInstanceAttributes("rectangle1");
      expect(attributes).toBe(attributes2);
    });

    it("picking", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      verifyPrimitiveRender(primitive, rectangle1);

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(primitive);
        expect(result.id).toEqual("rectangle1");
      });

      verifyPrimitiveRender(primitive, rectangle2);

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(primitive);
        expect(result.id).toEqual("rectangle2");
      });
    });

    it("does not pick when allowPicking is false", function () {
      primitive = new Primitive({
        geometryInstances: [rectangleInstance1],
        appearance: new PerInstanceColorAppearance(),
        allowPicking: false,
        asynchronous: false,
      });

      verifyPrimitiveRender(primitive, rectangle1);

      expect(scene).notToPick();
    });

    it("does not cull when cull is false", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
        cull: false,
      });

      frameState.commandList.length = 0;
      primitive.update(frameState);
      expect(frameState.commandList[0].cull).toEqual(false);
    });

    it("update throws when geometry primitive types are different", function () {
      primitive = new Primitive({
        geometryInstances: [
          new GeometryInstance({
            geometry: new Geometry({
              attributes: {
                position: new GeometryAttribute({
                  componentDatatype: ComponentDatatype.FLOAT,
                  componentsPerAttribute: 3,
                  values: new Float32Array([1.0, 2.0, 3.0, 4.0]),
                }),
              },
              primitiveType: PrimitiveType.LINES,
            }),
          }),
          new GeometryInstance({
            geometry: new Geometry({
              attributes: {
                position: new GeometryAttribute({
                  componentDatatype: ComponentDatatype.FLOAT,
                  componentsPerAttribute: 3,
                  values: new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0]),
                }),
              },
              primitiveType: PrimitiveType.TRIANGLES,
            }),
          }),
        ],
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      expect(function () {
        primitive.update(frameState);
      }).toThrowDeveloperError();
    });

    it("failed geometry rejects promise and throws on next update", function () {
      primitive = new Primitive({
        geometryInstances: [
          new GeometryInstance({
            geometry: new BadGeometry(),
          }),
        ],
        appearance: new MaterialAppearance({
          materialSupport: MaterialAppearance.MaterialSupport.ALL,
        }),
        compressVertices: false,
      });

      scene.frameState.afterRender.length = 0;
      scene.primitives.add(primitive);

      return pollToPromise(function () {
        for (let i = 0; i < frameState.afterRender.length; ++i) {
          frameState.afterRender[i]();
          return true;
        }

        primitive.update(frameState);
        return false;
      }).then(function () {
        return primitive.readyPromise
          .then(function () {
            fail("should not be called");
          })
          .catch(function (e) {
            expect(e).toBe(primitive._error);
            // Use toThrow since the error is thrown by RequireJS for the web worker import script
            expect(function () {
              scene.render();
            }).toThrow();
          });
      });
    });

    it("internally invalid asynchronous geometry resolves promise and sets ready", function () {
      primitive = new Primitive({
        geometryInstances: [
          new GeometryInstance({
            geometry: PolygonGeometry.fromPositions({
              positions: [],
            }),
          }),
        ],
        appearance: new MaterialAppearance({
          materialSupport: MaterialAppearance.MaterialSupport.ALL,
        }),
        compressVertices: false,
      });

      scene.frameState.afterRender.length = 0;

      return pollToPromise(function () {
        for (let i = 0; i < frameState.afterRender.length; ++i) {
          frameState.afterRender[i]();
          return true;
        }

        primitive.update(frameState);
        return false;
      }).then(function () {
        return primitive.readyPromise.then(function (arg) {
          expect(arg).toBe(primitive);
          expect(primitive.ready).toBe(true);
        });
      });
    });

    it("internally invalid synchronous geometry resolves promise and sets ready", function () {
      primitive = new Primitive({
        geometryInstances: [
          new GeometryInstance({
            geometry: PolygonGeometry.fromPositions({
              positions: [],
            }),
          }),
        ],
        appearance: new MaterialAppearance({
          materialSupport: MaterialAppearance.MaterialSupport.ALL,
        }),
        asynchronous: false,
        compressVertices: false,
      });

      scene.frameState.afterRender.length = 0;

      return pollToPromise(function () {
        if (scene.frameState.afterRender.length > 0) {
          scene.frameState.afterRender[0]();
          return true;
        }
        primitive.update(scene.frameState);
        return false;
      }).then(function () {
        return primitive.readyPromise.then(function (arg) {
          expect(arg).toBe(primitive);
          expect(primitive.ready).toBe(true);
        });
      });
    });

    it("can mix valid and invalid geometry", function () {
      const instances = [];
      instances.push(rectangleInstance1);
      instances.push(
        new GeometryInstance({
          geometry: PolygonGeometry.fromPositions({
            positions: [],
          }),
          attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 0.0, 1.0, 1.0),
          },
          id: "invalid",
        })
      );
      instances.push(rectangleInstance2);

      primitive = new Primitive({
        geometryInstances: instances,
        appearance: new PerInstanceColorAppearance({
          flat: true,
        }),
      });

      return pollToPromise(function () {
        primitive.update(frameState);
        if (frameState.afterRender.length > 0) {
          frameState.afterRender[0]();
        }
        return primitive.ready;
      }).then(function () {
        expect(
          primitive.getGeometryInstanceAttributes("rectangle1").boundingSphere
        ).toBeDefined();
        expect(
          primitive.getGeometryInstanceAttributes("rectangle2").boundingSphere
        ).toBeDefined();
        expect(
          primitive.getGeometryInstanceAttributes("invalid").boundingSphere
        ).not.toBeDefined();
      });
    });

    it("shader validation", function () {
      if (!!window.webglStub) {
        return;
      }

      primitive = new Primitive({
        geometryInstances: [rectangleInstance1, rectangleInstance2],
        appearance: new MaterialAppearance({
          materialSupport: MaterialAppearance.MaterialSupport.ALL,
        }),
        asynchronous: false,
        compressVertices: false,
      });

      expect(function () {
        primitive.update(frameState);
      }).toThrowDeveloperError();
    });

    it("setting per instance attribute throws when value is undefined", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      primitive.update(frameState);
      const attributes = primitive.getGeometryInstanceAttributes("rectangle1");

      expect(function () {
        attributes.color = undefined;
      }).toThrowDeveloperError();
    });

    it("can disable picking when asynchronous", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: true,
        allowPicking: false,
      });

      frameState.afterRender.length = 0;
      scene.primitives.add(primitive);

      return pollToPromise(function () {
        if (frameState.afterRender.length > 0) {
          frameState.afterRender[0]();
        }
        scene.render();
        return primitive.ready;
      }).then(function () {
        const attributes = primitive.getGeometryInstanceAttributes(
          "rectangle1"
        );
        expect(function () {
          attributes.color = undefined;
        }).toThrowDeveloperError();
      });
    });

    it("getGeometryInstanceAttributes throws without id", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.renderForSpecs();

      expect(function () {
        primitive.getGeometryInstanceAttributes();
      }).toThrowDeveloperError();
    });

    it("getGeometryInstanceAttributes throws if update was not called", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      expect(function () {
        primitive.getGeometryInstanceAttributes("rectangle1");
      }).toThrowDeveloperError();
    });

    it("getGeometryInstanceAttributes returns undefined if id does not exist", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
        asynchronous: false,
      });

      scene.primitives.add(primitive);
      scene.renderForSpecs();

      expect(
        primitive.getGeometryInstanceAttributes("unknown")
      ).not.toBeDefined();
    });

    it("isDestroyed", function () {
      primitive = new Primitive();
      expect(primitive.isDestroyed()).toEqual(false);
      primitive.destroy();
      expect(primitive.isDestroyed()).toEqual(true);
    });

    it("renders when using asynchronous pipeline", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance({
          flat: true,
        }),
      });

      const frameState = scene.frameState;
      return pollToPromise(function () {
        primitive.update(frameState);
        for (let i = 0; i < frameState.afterRender.length; ++i) {
          frameState.afterRender[i]();
        }
        return primitive.ready;
      }).then(function () {
        verifyPrimitiveRender(primitive, rectangle1);
      });
    });

    it("destroy before asynchronous pipeline is complete", function () {
      primitive = new Primitive({
        geometryInstances: rectangleInstance1,
        appearance: new PerInstanceColorAppearance(),
      });

      primitive.update(frameState);

      primitive.destroy();
      expect(primitive.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
