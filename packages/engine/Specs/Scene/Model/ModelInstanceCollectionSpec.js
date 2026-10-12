import {
  Cartesian3,
  FixedFrameTransforms,
  HeadingPitchRange,
  JulianDate,
  Math as CesiumMath,
  Matrix4,
  RuntimeError,
} from "@cesium/core";
import {
  Model,
  ModelInstanceCollection,
  ResourceCache,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";

describe(
  "Scene/Model/ModelInstanceCollection",
  function () {
    const boxUrl = "./Data/Models/glTF-2.0/Box/glTF/Box.gltf";
    const boxWithOffsetUrl =
      "./Data/Models/glTF-2.0/BoxWithOffset/glTF/BoxWithOffset.gltf";

    const time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
    const background = [0, 0, 0, 255];

    const positionA = Cartesian3.fromDegrees(-75.59777, 40.03883, 0.0);
    const positionB = Cartesian3.fromDegrees(-75.59677, 40.03883, 0.0);
    const positionBetween = Cartesian3.fromDegrees(-75.59727, 40.03883, 0.0);

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

    it("rejects without url", async function () {
      await expectAsync(
        ModelInstanceCollection.fromGltfAsync({
          instances: [{ modelMatrix: Matrix4.IDENTITY }],
        }),
      ).toBeRejectedWithDeveloperError();
    });

    it("rejects without instances", async function () {
      await expectAsync(
        ModelInstanceCollection.fromGltfAsync({ url: boxUrl }),
      ).toBeRejectedWithDeveloperError();

      await expectAsync(
        ModelInstanceCollection.fromGltfAsync({ url: boxUrl, instances: [] }),
      ).toBeRejectedWithDeveloperError();
    });

    it("rejects when the glTF fails to load", async function () {
      await expectAsync(
        ModelInstanceCollection.fromGltfAsync({
          url: "./Data/Models/glTF-2.0/DoesNotExist.gltf",
          instances: [{ modelMatrix: Matrix4.IDENTITY }],
        }),
      ).toBeRejectedWithError(RuntimeError);
    });

    it("renders each instance", async function () {
      const collection = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [
          {
            modelMatrix:
              FixedFrameTransforms.eastNorthUpToFixedFrame(positionA),
          },
          {
            modelMatrix:
              FixedFrameTransforms.eastNorthUpToFixedFrame(positionB),
          },
        ],
      });
      scene.primitives.add(collection);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return collection.ready;
      });

      expect(collection.length).toBe(2);

      scene.camera.lookAt(positionA, new HeadingPitchRange(0.0, 0.0, 4.0));
      expect({ scene, time }).notToRender(background);

      scene.camera.lookAt(positionB, new HeadingPitchRange(0.0, 0.0, 4.0));
      expect({ scene, time }).notToRender(background);

      scene.camera.lookAt(
        positionBetween,
        new HeadingPitchRange(0.0, 0.0, 4.0),
      );
      expect({ scene, time }).toRender(background);
    });

    it("applies instance scale", async function () {
      const enu = FixedFrameTransforms.eastNorthUpToFixedFrame(positionA);
      const eastOfInstance = Matrix4.multiplyByPoint(
        enu,
        new Cartesian3(3.0, 0.0, 0.0),
        new Cartesian3(),
      );

      const unscaled = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [{ modelMatrix: enu }],
      });
      scene.primitives.add(unscaled);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return unscaled.ready;
      });

      scene.camera.lookAt(
        eastOfInstance,
        new HeadingPitchRange(0.0, 0.0, 20.0),
      );
      expect({ scene, time }).toRender(background);

      scene.primitives.remove(unscaled);

      const scaled = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [
          {
            modelMatrix: Matrix4.multiplyByUniformScale(
              enu,
              10.0,
              new Matrix4(),
            ),
          },
        ],
      });
      scene.primitives.add(scaled);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return scaled.ready;
      });

      scene.camera.lookAt(
        eastOfInstance,
        new HeadingPitchRange(0.0, 0.0, 20.0),
      );
      expect({ scene, time }).notToRender(background);
    });

    it("applies the glTF node hierarchy to each instance", async function () {
      const modelMatrix = Matrix4.fromTranslation(positionA);

      const model = await Model.fromGltfAsync({
        url: boxWithOffsetUrl,
        modelMatrix,
      });
      scene.primitives.add(model);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return model.ready;
      });
      const expectedCenter = Cartesian3.clone(model.boundingSphere.center);
      scene.primitives.remove(model);

      const collection = await ModelInstanceCollection.fromGltfAsync({
        url: boxWithOffsetUrl,
        instances: [{ modelMatrix }],
      });
      scene.primitives.add(collection);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return collection.ready;
      });

      expect(collection.boundingSphere.center).toEqualEpsilon(
        expectedCenter,
        CesiumMath.EPSILON9,
      );

      scene.camera.lookAt(expectedCenter, new HeadingPitchRange(0.0, 0.0, 4.0));
      expect({ scene, time }).notToRender(background);
    });

    it("does not render when show is false", async function () {
      const collection = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [
          {
            modelMatrix:
              FixedFrameTransforms.eastNorthUpToFixedFrame(positionA),
          },
        ],
        show: false,
      });
      scene.primitives.add(collection);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return collection.ready;
      });

      scene.camera.lookAt(positionA, new HeadingPitchRange(0.0, 0.0, 4.0));
      expect({ scene, time }).toRender(background);

      collection.show = true;
      expect({ scene, time }).notToRender(background);
    });

    it("raises readyEvent with the collection", async function () {
      const collection = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [
          {
            modelMatrix:
              FixedFrameTransforms.eastNorthUpToFixedFrame(positionA),
          },
        ],
      });
      let readyCollection;
      collection.readyEvent.addEventListener(function (value) {
        readyCollection = value;
      });
      scene.primitives.add(collection);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return collection.ready;
      });

      expect(readyCollection).toBe(collection);
    });

    it("shares glTF resources between collections", async function () {
      const first = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [
          {
            modelMatrix:
              FixedFrameTransforms.eastNorthUpToFixedFrame(positionA),
          },
        ],
      });
      const second = await ModelInstanceCollection.fromGltfAsync({
        url: boxUrl,
        instances: [
          {
            modelMatrix:
              FixedFrameTransforms.eastNorthUpToFixedFrame(positionB),
          },
        ],
      });
      scene.primitives.add(first);
      scene.primitives.add(second);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return first.ready && second.ready;
      });

      const cacheEntries = Object.values(ResourceCache.cacheEntries);
      expect(cacheEntries.length).toBeGreaterThan(0);

      scene.primitives.remove(first);
      expect(first.isDestroyed()).toBe(true);
      for (const cacheEntry of cacheEntries) {
        expect(cacheEntry.referenceCount).toBeGreaterThan(0);
      }

      scene.primitives.remove(second);
      expect(second.isDestroyed()).toBe(true);
      for (const cacheEntry of cacheEntries) {
        expect(cacheEntry.referenceCount).toBe(0);
      }
    });
  },
  "WebGL",
);
