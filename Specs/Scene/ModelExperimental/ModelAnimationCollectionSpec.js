import {
  JulianDate,
  ModelAnimationLoop,
  Model,
  ResourceCache,
  Math as CesiumMath,
} from "../../../Source/Cesium.js";

import createScene from "../../createScene.js";
import loadAndZoomToModel from "./loadAndZoomToModel.js";
import pollToPromise from "../../pollToPromise.js";

describe("Scene/ModelExperimental/ModelAnimationCollection", function () {
  const animatedTriangleUrl =
    "./Data/Models/GltfLoader/AnimatedTriangle/glTF/AnimatedTriangle.gltf";
  const interpolationTestUrl =
    "./Data/Models/InterpolationTest/InterpolationTest.glb";

  const defaultDate = JulianDate.fromDate(
    new Date("January 1, 2014 12:00:00 UTC")
  );
  const scratchJulianDate = new JulianDate();
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

  it("initializes", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      expect(animationCollection).toBeDefined();
      expect(animationCollection.model).toBe(model);
      expect(animationCollection.length).toBe(0);
    });
  });

  it("throws when add is called on non-ready model", function () {
    const model = Model.fromGltf({
      gltf: animatedTriangleUrl,
    });

    expect(function () {
      model.activeAnimations.add({
        index: 0,
      });
    }).toThrowDeveloperError();
  });

  it("throws when add is not given a name or index", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      expect(function () {
        model.activeAnimations.add({});
      }).toThrowDeveloperError();
    });
  });

  it("throws when add is given invalid name", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      expect(function () {
        model.activeAnimations.add({
          name: "Invalid name",
        });
      }).toThrowDeveloperError();
    });
  });

  it("throws when add is given invalid index", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      expect(function () {
        model.activeAnimations.add({
          index: 2,
        });
      }).toThrowDeveloperError();
    });
  });

  it("throws when add is given invalid multiplier", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      expect(function () {
        model.activeAnimations.add({
          index: 0,
          multiplier: 0.0,
        });
      }).toThrowDeveloperError();
    });
  });

  it("add works with name", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const runtimeAnimation = model.activeAnimations.add({
        name: "Sample Animation",
      });

      const animationCollection = model.activeAnimations;
      expect(animationCollection.length).toBe(1);

      expect(runtimeAnimation).toBe(animationCollection._runtimeAnimations[0]);
      expect(runtimeAnimation.startTime).toBeUndefined();
      expect(runtimeAnimation.delay).toBe(0.0);
      expect(runtimeAnimation.stopTime).toBeUndefined();
      expect(runtimeAnimation.removeOnStop).toBe(false);
      expect(runtimeAnimation.multiplier).toBe(1.0);
      expect(runtimeAnimation.reverse).toBe(false);
      expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.NONE);
    });
  });

  it("add works with index", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const runtimeAnimation = model.activeAnimations.add({
        index: 0,
      });

      const animationCollection = model.activeAnimations;
      expect(animationCollection.length).toBe(1);

      expect(runtimeAnimation).toBe(animationCollection._runtimeAnimations[0]);
      expect(runtimeAnimation.startTime).toBeUndefined();
      expect(runtimeAnimation.delay).toBe(0.0);
      expect(runtimeAnimation.stopTime).toBeUndefined();
      expect(runtimeAnimation.removeOnStop).toBe(false);
      expect(runtimeAnimation.multiplier).toBe(1.0);
      expect(runtimeAnimation.reverse).toBe(false);
      expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.NONE);
    });
  });

  it("add works with options", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const options = {
        index: 0,
        startTime: JulianDate.fromDate(
          new Date("January 1, 2014 12:00:00 UTC")
        ),
        delay: 5.0,
        stopTime: JulianDate.fromDate(new Date("January 1, 2014 12:01:30 UTC")),
        multiplier: 0.5,
        reverse: true,
        loop: ModelAnimationLoop.REPEAT,
        removeOnStop: true,
      };
      const runtimeAnimation = model.activeAnimations.add(options);

      const animationCollection = model.activeAnimations;
      expect(animationCollection.length).toBe(1);

      expect(runtimeAnimation).toBe(animationCollection._runtimeAnimations[0]);
      expect(runtimeAnimation.startTime).toEqual(options.startTime);
      expect(runtimeAnimation.delay).toBe(5.0);
      expect(runtimeAnimation.stopTime).toEqual(options.stopTime);
      expect(runtimeAnimation.removeOnStop).toBe(true);
      expect(runtimeAnimation.multiplier).toBe(0.5);
      expect(runtimeAnimation.reverse).toBe(true);
      expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.REPEAT);
    });
  });

  it("throws when addAll is called on non-ready model", function () {
    const model = Model.fromGltf({
      gltf: animatedTriangleUrl,
    });

    expect(function () {
      model.activeAnimations.addAll();
    }).toThrowDeveloperError();
  });

  it("throws when addAll is given invalid multiplier", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      expect(function () {
        model.activeAnimations.addAll({
          multiplier: 0.0,
        });
      }).toThrowDeveloperError();
    });
  });

  it("addAll works", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      const runtimeAnimations = model.activeAnimations.addAll();

      const animationCollection = model.activeAnimations;
      const length = animationCollection.length;
      expect(length).toBe(9);

      for (let i = 0; i < length; i++) {
        const runtimeAnimation = runtimeAnimations[i];
        expect(runtimeAnimation).toBe(
          animationCollection._runtimeAnimations[i]
        );
        expect(runtimeAnimation.startTime).toBeUndefined();
        expect(runtimeAnimation.delay).toBe(0.0);
        expect(runtimeAnimation.stopTime).toBeUndefined();
        expect(runtimeAnimation.removeOnStop).toBe(false);
        expect(runtimeAnimation.multiplier).toBe(1.0);
        expect(runtimeAnimation.reverse).toBe(false);
        expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.NONE);
      }
    });
  });

  it("addAll works with options", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      const options = {
        startTime: JulianDate.fromDate(
          new Date("January 1, 2014 12:00:00 UTC")
        ),
        delay: 5.0,
        stopTime: JulianDate.fromDate(new Date("January 1, 2014 12:01:30 UTC")),
        multiplier: 0.5,
        reverse: true,
        loop: ModelAnimationLoop.REPEAT,
        removeOnStop: true,
      };
      const runtimeAnimations = model.activeAnimations.addAll(options);

      const animationCollection = model.activeAnimations;
      const length = animationCollection.length;
      expect(length).toBe(9);

      for (let i = 0; i < length; i++) {
        const runtimeAnimation = runtimeAnimations[i];
        expect(runtimeAnimation).toBe(
          animationCollection._runtimeAnimations[i]
        );
        expect(runtimeAnimation.startTime).toEqual(options.startTime);
        expect(runtimeAnimation.delay).toBe(5.0);
        expect(runtimeAnimation.stopTime).toEqual(options.stopTime);
        expect(runtimeAnimation.removeOnStop).toBe(true);
        expect(runtimeAnimation.multiplier).toBe(0.5);
        expect(runtimeAnimation.reverse).toBe(true);
        expect(runtimeAnimation.loop).toBe(ModelAnimationLoop.REPEAT);
      }
    });
  });

  it("contains returns false for undefined", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      animationCollection.add({ index: 0 });
      expect(animationCollection.contains(undefined)).toBe(false);
    });
  });

  it("contains returns false for animation not in collection", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (firstModel) {
      return loadAndZoomToModel(
        {
          gltf: animatedTriangleUrl,
        },
        scene
      ).then(function (secondModel) {
        const firstCollection = firstModel.activeAnimations;
        const animation = firstCollection.add({ index: 0 });
        const secondCollection = secondModel.activeAnimations;
        expect(secondCollection.contains(animation)).toBe(false);
      });
    });
  });

  it("contains returns true for animation in collection", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({ index: 0 });
      expect(animationCollection.contains(animation)).toBe(true);
    });
  });

  it("throws when get is not given index", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      animationCollection.add({ index: 0 });
      expect(function () {
        animationCollection.get();
      }).toThrowDeveloperError();
    });
  });

  it("throws when get is given out-of-range index", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      animationCollection.add({ index: 0 });
      expect(function () {
        animationCollection.get(2);
      }).toThrowDeveloperError();
    });
  });

  it("get works", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({ index: 3 });
      expect(animationCollection.get(0)).toBe(animation);
    });
  });

  it("remove returns false for undefined", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      animationCollection.add({ index: 0 });
      expect(animationCollection.remove(undefined)).toBe(false);
    });
  });

  it("remove returns false for animation not in collection", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (firstModel) {
      return loadAndZoomToModel(
        {
          gltf: animatedTriangleUrl,
        },
        scene
      ).then(function (secondModel) {
        const firstCollection = firstModel.activeAnimations;
        const animation = firstCollection.add({ index: 0 });
        const secondCollection = secondModel.activeAnimations;
        expect(secondCollection.remove(animation)).toBe(false);
      });
    });
  });

  it("remove returns true for animation in collection", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      const animationToRemove = animationCollection.add({ index: 0 });
      animationCollection.add({ index: 1 });
      expect(animationCollection.length).toBe(2);

      expect(animationCollection.remove(animationToRemove)).toBe(true);
      expect(animationCollection.length).toBe(1);

      // Should not be true again
      expect(animationCollection.remove(animationToRemove)).toBe(false);
    });
  });

  it("removeAll works", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      animationCollection.addAll();
      expect(animationCollection.length).toBe(9);
      animationCollection.removeAll();
      expect(animationCollection.length).toBe(0);
    });
  });

  it("update returns false when there are no animations", function () {
    return loadAndZoomToModel(
      {
        gltf: interpolationTestUrl,
      },
      scene
    ).then(function (model) {
      const animationCollection = model.activeAnimations;
      expect(animationCollection.length).toBe(0);
      expect(animationCollection.update()).toBe(false);
    });
  });

  it("raises animation start, update, and stop events when removeOnStop is true", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      let time = defaultDate;
      const animations = model.activeAnimations;
      const animation = animations.add({
        index: 0,
        startTime: time,
        removeOnStop: true,
      });
      const spyStart = jasmine.createSpy("listener");
      animation.start.addEventListener(spyStart);

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      let stopped = false;
      animation.stop.addEventListener(function (model, animation) {
        stopped = true;
      });
      const spyStop = jasmine.createSpy("listener");
      animation.stop.addEventListener(spyStop);

      return pollToPromise(
        function () {
          scene.renderForSpecs(time);
          time = JulianDate.addSeconds(time, 1.0, scratchJulianDate);
          return stopped;
        },
        { timeout: 10000 }
      ).then(function () {
        expect(spyStart).toHaveBeenCalledWith(model, animation);

        expect(spyUpdate.calls.count()).toEqual(2);
        expect(spyUpdate.calls.argsFor(0)[0]).toBe(model);
        expect(spyUpdate.calls.argsFor(0)[1]).toBe(animation);

        // The animation lasts for one second, so expect the update event
        // to have been raised twice.
        expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
        expect(spyUpdate.calls.argsFor(1)[2]).toEqual(1.0);

        expect(spyStop).toHaveBeenCalledWith(model, animation);
        expect(animations.length).toEqual(0);
      });
    });
  });

  it("finishes animation when it reaches its end", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(1.0);
      // Animation has reached its final time value.
      expect(spyUpdate.calls.argsFor(2)[2]).toEqual(1.0);
    });
  });

  it("animates with a delay", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
        delay: 1.0,
      });

      const spyStart = jasmine.createSpy("listener");
      animation.start.addEventListener(spyStart);

      scene.renderForSpecs(time); // Does not fire start event
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));

      expect(spyStart.calls.count()).toEqual(1);
    });
  });

  it("animates with startTime", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(
        JulianDate.addSeconds(time, -2.0, scratchJulianDate)
      );
      scene.renderForSpecs(
        JulianDate.addSeconds(time, -1.0, scratchJulianDate)
      );
      scene.renderForSpecs(time);

      expect(spyUpdate.calls.count()).toEqual(1);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
    });
  });

  it("animates with an explicit stopTime", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = JulianDate.fromDate(
        new Date("January 1, 2014 12:00:00 UTC")
      );
      const endDate = new Date("January 1, 2014 12:00:00 UTC");
      endDate.setMilliseconds(500);
      const stopTime = JulianDate.fromDate(endDate);

      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
        stopTime: stopTime,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(0.5);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(0.5);
    });
  });

  it("animates with an explicit animation time", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      let animationTime = 0;
      const animation = animationCollection.add({
        index: 0,
        animationTime: function (duration) {
          return animationTime / duration;
        },
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      animationTime = 0.1;
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));
      // no update because animationTime didn't change
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, scratchJulianDate));
      animationTime = 0.2;
      // no update because scene time didn't change
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, scratchJulianDate));
      animationTime = 0.3;
      scene.renderForSpecs(JulianDate.addSeconds(time, 3.0, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        0.1,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        0.3,
        CesiumMath.EPSILON14
      );
    });
  });

  it("animates while paused with an explicit animation time", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      animationCollection.animateWhilePaused = true;
      let animationTime = 0;
      const animation = animationCollection.add({
        index: 0,
        animationTime: function (duration) {
          return animationTime / duration;
        },
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      animationTime = 0.1;
      scene.renderForSpecs(time);
      // no update because animationTime didn't change
      scene.renderForSpecs(time);
      animationTime = 0.3;
      scene.renderForSpecs(time);

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        0.1,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        0.3,
        CesiumMath.EPSILON14
      );
    });
  });

  it("animates with a multiplier", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
        multiplier: 0.5,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(0.5);
      expect(spyUpdate.calls.argsFor(2)[2]).toEqual(1.0);
    });
  });

  it("animates with reverse", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
        reverse: true,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(1.0);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(0.5);
      expect(spyUpdate.calls.argsFor(2)[2]).toEqual(0.0);
    });
  });

  it("animates with REPEAT", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
        loop: ModelAnimationLoop.REPEAT,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.5, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(4);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(0.5);
      expect(spyUpdate.calls.argsFor(2)[2]).toEqual(0.0);
      expect(spyUpdate.calls.argsFor(3)[2]).toEqual(0.5);
    });
  });

  it("animates with MIRRORED_REPEAT", function () {
    return loadAndZoomToModel(
      {
        gltf: animatedTriangleUrl,
      },
      scene
    ).then(function (model) {
      const time = defaultDate;
      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
        startTime: time,
        loop: ModelAnimationLoop.MIRRORED_REPEAT,
      });

      const spyUpdate = jasmine.createSpy("listener");
      animation.update.addEventListener(spyUpdate);

      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.5, scratchJulianDate));
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, scratchJulianDate));

      expect(spyUpdate.calls.count()).toEqual(5);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqual(0.0);
      expect(spyUpdate.calls.argsFor(1)[2]).toEqual(0.5);
      expect(spyUpdate.calls.argsFor(2)[2]).toEqual(1.0);
      expect(spyUpdate.calls.argsFor(3)[2]).toEqual(0.5);
      expect(spyUpdate.calls.argsFor(4)[2]).toEqual(0.0);
    });
  });
});
