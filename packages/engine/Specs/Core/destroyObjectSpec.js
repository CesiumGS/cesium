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
