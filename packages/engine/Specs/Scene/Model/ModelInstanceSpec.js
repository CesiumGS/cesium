import {
  Matrix4,
  ModelInstance,
  ResourceCache,
  HeadingPitchRoll,
  Transforms,
  Cartesian3,
  Ellipsoid,
  BoundingSphere,
  Color,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe(
  "Scene/Model/ModelInstance",
  function () {
    const sampleGltfUrl =
      "./Data/Models/glTF-2.0/CesiumMilkTruck/glTF/CesiumMilkTruck.glb";

    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    it("creates an instance with no translation", async function () {
      const position = new Cartesian3(0, 0, 0);

      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        position,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const instance = new ModelInstance({
        transform: instanceModelMatrix,
      });

      expect(instance.transform).toEqual(instanceModelMatrix);
      expect(instance.center).toEqual(new Cartesian3());
      expect(instance.transform).toEqual(instanceModelMatrix);
      expect(instance.show).toEqual(true);
      expect(instance.color).toEqual(undefined);
    });

    it("creates an instance with translation", async function () {
      const translationPosition = new Cartesian3(10, 10, 10);
      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        translationPosition,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const instance = new ModelInstance({
        transform: instanceModelMatrix,
      });

      expect(instance.transform).toEqual(instanceModelMatrix);
      const center = new Cartesian3(10, 10, 10);
      expect(instance.center).toEqual(center);
      const relativeTransform = new Matrix4(
        -0.41007637743891356,
        0.7071067811865476,
        0.5760532654768807,
        0,
        -0.41007637743891356,
        -0.7071067811865474,
        0.5760532654768808,
        0,
        0.8146623406867138,
        0,
        0.5799355745829399,
        0,
        0,
        0,
        0,
        1,
      );
      expect(instance.relativeTransform).toEqual(relativeTransform);
    });

    it("computes model matrix, model centered at origin with no glTF root node transform", async function () {
      const translationPosition = new Cartesian3(10, 10, 10);
      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        translationPosition,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const instance = new ModelInstance({
        transform: instanceModelMatrix,
      });

      const sampleModelMatrix = Matrix4.IDENTITY;
      const sampleRootNodeTransform = Matrix4.IDENTITY;

      const computedModelMatrix = instance.computeModelMatrix(
        sampleModelMatrix,
        sampleRootNodeTransform,
      );

      expect(computedModelMatrix).toEqual(instance.transform);
    });

    it("computes bounding sphere for instance in world space, earth centered model", async function () {
      const translationPosition = new Cartesian3(
        1253565.1903550967,
        -4732913.141962121,
        4073970.3334786133,
      );
      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        translationPosition,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const model = await loadAndZoomToModelAsync(
        {
          gltf: sampleGltfUrl,
          instances: [instanceModelMatrix],
        },
        scene,
      );

      const instance = model.instances.get(0);

      const boundingSphere = instance.getBoundingSphere(model);

      const boundingSphereCenter = new Cartesian3(
        1253565.2859622256,
        -4732913.502932733,
        4073970.8262305106,
      );
      const boundingSphereRadius = 3.8699558326623595;

      expect(boundingSphere.center).toEqual(boundingSphereCenter);
      expect(boundingSphere.radius).toEqual(boundingSphereRadius);
    });

    it("computes bounding sphere for instance in world space, model centered on earth surface", async function () {
      const translationPosition = new Cartesian3(10, 10, 10);
      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        translationPosition,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const model = await loadAndZoomToModelAsync(
        {
          gltf: sampleGltfUrl,
          instances: [instanceModelMatrix],
          modelMatrix: new Matrix4.fromTranslation(
            new Cartesian3(
              1253565.1903550967,
              -4732913.141962121,
              4073970.3334786133,
            ),
          ),
        },
        scene,
      );

      const instance = model.instances.get(0);

      const boundingSphere = instance.getBoundingSphere(model);

      const boundingSphereCenter = new Cartesian3(
        1253575.4296778704,
        -4732902.902639246,
        4073980.8573345104,
      );
      const boundingSphereRadius = 3.9121082161607323;

      expect(boundingSphere.center).toEqual(boundingSphereCenter);
      expect(boundingSphere.radius).toEqual(boundingSphereRadius);
    });

    it("computes bounding sphere for primitive in world space, earth centered model", async function () {
      const translationPosition = new Cartesian3(
        1253565.1903550967,
        -4732913.141962121,
        4073970.3334786133,
      );
      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        translationPosition,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const instance = new ModelInstance({
        transform: instanceModelMatrix,
      });

      // values based on the Primitive for the "Wheels" Node in the CesiumMilkTruck
      const sampleModel = {
        modelMatrix: Matrix4.IDENTITY,
        _sceneGraph: {
          rootTransform: new Matrix4(
            0,
            0,
            1,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            0,
            1,
          ),
        },
      };

      const samplePrimitiveBoundingSphere = new BoundingSphere(
        new Cartesian3(0, 0, 0),
        1.2187656103276185,
      );

      const sampleRuntimeNode = {
        computedTransform: new Matrix4(
          -5.867126234708317e-8,
          -0.999999916273327,
          1.0506962941054424e-8,
          -8.539378371944296e-8,
          -0.17627758151258402,
          0,
          -0.9843404120540511,
          0.4277219815419916,
          0.9843404120540493,
          -5.9604641561248813e-8,
          -0.17627758151258371,
          1.4326699118214847,
          0,
          0,
          0,
          1,
        ),
      };

      const primitiveBoundingSphere = instance.getPrimitiveBoundingSphere(
        sampleModel.modelMatrix,
        sampleModel._sceneGraph,
        sampleRuntimeNode,
        samplePrimitiveBoundingSphere,
      );

      const boundingSphereCenter = new Cartesian3(
        1253565.0387548013,
        -4732912.569585468,
        4073971.7063921164,
      );
      const boundingSphereRadius = 1.218765508284431;

      expect(primitiveBoundingSphere.center).toEqual(boundingSphereCenter);
      expect(primitiveBoundingSphere.radius).toEqual(boundingSphereRadius);
    });

    it("computes bounding sphere for primitive in world space, model centered on earth surface", async function () {
      const translationPosition = new Cartesian3(10, 10, 10);
      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        translationPosition,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const instance = new ModelInstance({
        transform: instanceModelMatrix,
      });

      // values based on the Primitive for the "Wheels" Node in the CesiumMilkTruck
      const sampleModel = {
        modelMatrix: new Matrix4.fromTranslation(
          new Cartesian3(
            1253565.1903550967,
            -4732913.141962121,
            4073970.3334786133,
          ),
        ),
        _sceneGraph: {
          rootTransform: new Matrix4(
            0,
            0,
            1,
            0,
            1,
            0,
            0,
            0,
            0,
            1,
            0,
            0,
            0,
            0,
            0,
            1,
          ),
        },
      };

      const samplePrimitiveBoundingSphere = new BoundingSphere(
        new Cartesian3(0, 0, 0),
        1.2187656103276185,
      );

      const sampleRuntimeNode = {
        computedTransform: new Matrix4(
          -5.867126234708317e-8,
          -0.999999916273327,
          1.0506962941054424e-8,
          -8.539378371944296e-8,
          -0.17627758151258402,
          0,
          -0.9843404120540511,
          0.4277219815419916,
          0.9843404120540493,
          -5.9604641561248813e-8,
          -0.17627758151258371,
          1.4326699118214847,
          0,
          0,
          0,
          1,
        ),
      };

      const primitiveBoundingSphere = instance.getPrimitiveBoundingSphere(
        sampleModel.modelMatrix,
        sampleModel._sceneGraph,
        sampleRuntimeNode,
        samplePrimitiveBoundingSphere,
      );

      const boundingSphereCenter = new Cartesian3(
        1253574.849241593,
        -4732903.483075504,
        4073981.7486720304,
      );
      const boundingSphereRadius = 1.2187655082844309;

      expect(primitiveBoundingSphere.center).toEqual(boundingSphereCenter);
      expect(primitiveBoundingSphere.radius).toEqual(boundingSphereRadius);
    });

    it("creates an instance with show and color", async function () {
      const position = new Cartesian3(0, 0, 0);

      const headingPositionRoll = new HeadingPitchRoll();
      const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
        "north",
        "west",
      );
      const instanceModelMatrix = new Transforms.headingPitchRollToFixedFrame(
        position,
        headingPositionRoll,
        Ellipsoid.WGS84,
        fixedFrameTransform,
      );

      const instance = new ModelInstance({
        transform: instanceModelMatrix,
        show: false,
        color: Color.RED,
      });

      expect(instance.show).toEqual(false);
      expect(instance.color).toEqual(Color.RED);
    });
  },
  "WebGL",
);
