import { destroyObject } from "../../index.js";

describe("Core/destroyObject", function () {
  it("destroys prototype-based class", function () {
    function Parent() {}
    Parent.prototype.isDestroyed = () => false;
    Parent.prototype.inheritedFn = () => true;

    function Child() {}
    Child.prototype = new Parent();
    Child.prototype.instanceFn = () => true;
    Child.staticFn = () => true;

    Object.defineProperty(Child.prototype, "getterFn", {
      get: () => {
        // destroyObject must not execute getters on the target object;
        // doing so may throw errors if the getter accesses properties
        // that have already been removed.
        throw new Error("Getter must not be called.");
      },
    });

    const object = new Child();

    expect(object.isDestroyed()).toBe(false);
    expect(() => object.inheritedFn()).not.toThrowDeveloperError();
    expect(() => object.instanceFn()).not.toThrowDeveloperError();
    expect(() => Child.staticFn()).not.toThrowDeveloperError();

    destroyObject(object);

    expect(object.isDestroyed()).toBe(true);
    expect(() => object.inheritedFn()).toThrowDeveloperError();
    expect(() => object.instanceFn()).toThrowDeveloperError();
    expect(() => Child.staticFn()).not.toThrowDeveloperError();
  });

  it("destroys ES6 class", function () {
    class Parent {
      isDestroyed() {
        return false;
      }
      inheritedFn() {
        return true;
      }
    }

    class Child extends Parent {
      instanceFn() {
        return true;
      }
      staticFn() {
        return true;
      }
      get getterFn() {
        // destroyObject must not execute getters on the target object;
        // doing so may throw errors if the getter accesses properties
        // that have already been removed.
        throw new Error("Getter must not be called.");
      }
    }

    const object = new Child();

    expect(object.isDestroyed()).toBe(false);
    expect(() => object.inheritedFn()).not.toThrowDeveloperError();
    expect(() => object.instanceFn()).not.toThrowDeveloperError();
    expect(() => Child.staticFn()).not.toThrowDeveloperError();

    destroyObject(object);

    expect(object.isDestroyed()).toBe(true);
    expect(() => object.inheritedFn()).toThrowDeveloperError();
    expect(() => object.instanceFn()).toThrowDeveloperError();
    expect(() => Child.staticFn()).not.toThrowDeveloperError();
  });
});
