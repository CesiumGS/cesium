import {
  Color,
  EasingFunction,
  TweenCollection,
} from "../../index.js";;

describe(
  "Scene/TweenCollection",
  function () {
    it("add() adds a tween", function () {
      const startObject = {
        value: 0.0,
      };
      const stopObject = {
        value: 1.0,
      };
      function update(value) {}
      function complete() {}
      function cancel() {}

      const tweens = new TweenCollection();
      const tween = tweens.add({
        startObject: startObject,
        stopObject: stopObject,
        duration: 1.0,
        delay: 0.5,
        easingFunction: EasingFunction.QUADRATIC_IN,
        update: update,
        complete: complete,
        cancel: cancel,
      });

      expect(tween.startObject).toEqual(startObject);
      expect(tween.stopObject).toEqual(stopObject);
      expect(tween.duration).toEqual(1.0);
      expect(tween.delay).toEqual(0.5);
      expect(tween.easingFunction).toEqual(EasingFunction.QUADRATIC_IN);
      expect(tween.update).toBe(update);
      expect(tween.complete).toBe(complete);
      expect(tween.cancel).toBe(cancel);
    });

    it("add() adds a tween with defaults", function () {
      const startObject = {
        value: 0.0,
      };
      const stopObject = {
        value: 1.0,
      };

      const tweens = new TweenCollection();
      const tween = tweens.add({
        startObject: startObject,
        stopObject: stopObject,
        duration: 1.0,
      });

      expect(tween.startObject).toEqual(startObject);
      expect(tween.stopObject).toEqual(stopObject);
      expect(tween.duration).toEqual(1.0);
      expect(tween.delay).toEqual(0.0);
      expect(tween.easingFunction).toEqual(EasingFunction.LINEAR_NONE);
      expect(tween.update).not.toBeDefined();
      expect(tween.complete).not.toBeDefined();
      expect(tween.cancel).not.toBeDefined();
    });

    it("add() adds with a duration of zero", function () {
      const complete = jasmine.createSpy("complete");

      const tweens = new TweenCollection();
      tweens.add({
        startObject: {},
        stopObject: {},
        duration: 0.0,
        complete: complete,
      });

      expect(tweens.length).toEqual(0);
      expect(complete).toHaveBeenCalled();
    });

    it("add() throws without startObject", function () {
      const tweens = new TweenCollection();
      expect(function () {
        tweens.add({
          stopObject: {},
          duration: 1.0,
        });
      }).toThrowDeveloperError();
    });

    it("add() throws without stopObject", function () {
      const tweens = new TweenCollection();
      expect(function () {
        tweens.add({
          startObject: {},
          duration: 1.0,
        });
      }).toThrowDeveloperError();
    });

    it("add() throws without duration", function () {
      const tweens = new TweenCollection();
      expect(function () {
        tweens.add({
          startObject: {},
          stopObject: {},
        });
      }).toThrowDeveloperError();
    });

    it("add() throws with negative duration", function () {
      const tweens = new TweenCollection();
      expect(function () {
        tweens.add({
          startObject: {},
          stopObject: {},
          duration: -1.0,
        });
      }).toThrowDeveloperError();
    });

    it("cancelTween() cancels a tween", function () {
      const cancel = jasmine.createSpy("cancel");

      const tweens = new TweenCollection();
      const tween = tweens.add({
        startObject: {},
        stopObject: {},
        duration: 1.0,
        cancel: cancel,
      });

      expect(tweens.length).toEqual(1);

      tween.cancelTween();
      expect(cancel).toHaveBeenCalled();
      expect(tweens.length).toEqual(0);
    });

    it("remove() removes a tween", function () {
      const cancel = jasmine.createSpy("cancel");

      const tweens = new TweenCollection();
      const tween = tweens.add({
        startObject: {},
        stopObject: {},
        duration: 1.0,
        cancel: cancel,
      });

      expect(tweens.length).toEqual(1);
      expect(tweens.contains(tween)).toEqual(true);

      let b = tweens.remove(tween);
      expect(b).toEqual(true);
      expect(tweens.length).toEqual(0);
      expect(tweens.contains(tween)).toEqual(false);
      expect(cancel).toHaveBeenCalled();

      b = tweens.remove(tween);
      expect(b).toEqual(false);
    });

    it("removeAll() removes a tween", function () {
      const cancel = jasmine.createSpy("cancel");

      const tweens = new TweenCollection();
      tweens.add({
        startObject: {},
        stopObject: {},
        duration: 1.0,
        cancel: cancel,
      });
      tweens.add({
        startObject: {},
        stopObject: {},
        duration: 1.0,
        cancel: cancel,
      });

      expect(tweens.length).toEqual(2);

      tweens.removeAll();
      expect(tweens.length).toEqual(0);
      expect(cancel.calls.count()).toEqual(2);
    });

    it("contains() throws without an index", function () {
      const tweens = new TweenCollection();
      expect(function () {
        return tweens.get();
      }).toThrowDeveloperError();
    });

    it("get() returns a tween", function () {
      const tweens = new TweenCollection();
      const tween = tweens.add({
        startObject: {},
        stopObject: {},
        duration: 1.0,
      });
      const anotherTween = tweens.add({
        startObject: {},
        stopObject: {},
        duration: 1.0,
      });

      expect(tweens.get(0)).toBe(tween);
      expect(tweens.get(1)).toBe(anotherTween);
    });

    it("update() animates a tween", function () {
      const update = jasmine.createSpy("update");
      const complete = jasmine.createSpy("complete");

      const startObject = {
        value: 0.0,
      };
      const stopObject = {
        value: 1.0,
      };

      const tweens = new TweenCollection();
      tweens.add({
        startObject: startObject,
        stopObject: stopObject,
        duration: 1.0,
        update: update,
        complete: complete,
      });
      expect(tweens.length).toEqual(1);

      tweens.update(0.0);
      expect(update).toHaveBeenCalledWith({ value: 0.0 });
      expect(startObject.value).toEqual(0.0);

      tweens.update(0.5);
      expect(update).toHaveBeenCalledWith({ value: 0.5 });
      expect(startObject.value).toEqual(0.5);

      tweens.update(1.0);
      expect(update).toHaveBeenCalledWith({ value: 1.0 });
      expect(startObject.value).toEqual(1.0);

      expect(complete).toHaveBeenCalled();
      expect(tweens.length).toEqual(0);
    });

    it("update() animations a tween created with addProperty()", function () {
      const tweens = new TweenCollection();
      const object = {
        property: 0.0,
      };
      tweens.addProperty({
        object: object,
        property: "property",
        startValue: 0.0,
        stopValue: 1.0,
        duration: 1.0,
      });
      tweens.update(0.0);
      tweens.update(0.5);
      expect(object.property).toEqual(0.5);
    });

    it("addProperty() throws without an object", function () {
      const tweens = new TweenCollection();
      expect(function () {
        return tweens.addProperty({
          property: "property",
          startValue: 0.0,
          stopValue: 1.0,
        });
      }).toThrowDeveloperError();
    });

    it("addProperty() throws without a property", function () {
      const tweens = new TweenCollection();
      const object = {
        property: 0.0,
      };
      expect(function () {
        return tweens.addProperty({
          object: object,
          startValue: 0.0,
          stopValue: 1.0,
        });
      }).toThrowDeveloperError();
    });

    it("addProperty() throws when object does not contain property", function () {
      const tweens = new TweenCollection();
      const object = {
        property: 0.0,
      };
      expect(function () {
        return tweens.addProperty({
          object: object,
          property: "another-property",
          startValue: 0.0,
          stopValue: 1.0,
        });
      }).toThrowDeveloperError();
    });

    it("addProperty() throws without a startValue", function () {
      const tweens = new TweenCollection();
      const object = {
        property: 0.0,
      };
      expect(function () {
        return tweens.addProperty({
          object: object,
          property: "property",
          stopValue: 1.0,
        });
      }).toThrowDeveloperError();
    });

    it("addProperty() throws without a stopValue", function () {
      const tweens = new TweenCollection();
      const object = {
        property: 0.0,
      };
      expect(function () {
        return tweens.addProperty({
          object: object,
          property: "property",
          startValue: 0.0,
        });
      }).toThrowDeveloperError();
    });

    it("update() animations a tween created with addAlpha()", function () {
      const tweens = new TweenCollection();
      const material = {
        uniforms: {
          lightColor: new Color(),
          darkColor: new Color(),
        },
      };
      tweens.addAlpha({
        material: material,
        duration: 1.0,
      });
      tweens.update(0.0);
      tweens.update(0.5);
      expect(material.uniforms.lightColor.alpha).toEqual(0.5);
      expect(material.uniforms.darkColor.alpha).toEqual(0.5);
    });

    it("addAlpha() throws without a material", function () {
      const tweens = new TweenCollection();
      expect(function () {
        return tweens.addAlpha({});
      }).toThrowDeveloperError();
    });

    it("addAlpha() throws without a material with color uniforms", function () {
      const tweens = new TweenCollection();
      const material = {
        uniforms: {},
      };
      expect(function () {
        return tweens.addAlpha({
          material: material,
        });
      }).toThrowDeveloperError();
    });

    it("update() animations a tween created with addOffsetIncrement()", function () {
      const tweens = new TweenCollection();
      const material = {
        uniforms: {
          offset: 0.0,
        },
      };
      tweens.addOffsetIncrement({
        material: material,
        duration: 1.0,
      });
      tweens.update(0.0);
      tweens.update(0.5);
      expect(material.uniforms.offset).toEqual(0.5);
    });

    it("addOffsetIncrement() throws without a material", function () {
      const tweens = new TweenCollection();
      expect(function () {
        return tweens.addOffsetIncrement({});
      }).toThrowDeveloperError();
    });

    it("addOffsetIncrement() throws without a material with an offset uniform", function () {
      const tweens = new TweenCollection();
      const material = {
        uniforms: {},
      };
      expect(function () {
        return tweens.addOffsetIncrement({
          material: material,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
