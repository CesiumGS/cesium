import { ControllerHost } from "../../../index.js";

describe("Scene/Controllers/ControllerHost", function () {
  const element = {};

  function createController() {
    return jasmine.createSpyObj(
      "Controller",
      ["connectedCallback", "disconnectedCallback", "firstUpdate", "update"],
      { enabled: true },
    );
  }

  it("controllers is empty by default", function () {
    const host = new ControllerHost();
    expect(host.controllers).toEqual([]);
    expect(host.controllerCount).toBe(0);
  });

  it("controllers returns the registered controllers in update order", function () {
    const host = new ControllerHost();
    const first = createController();
    const second = createController();
    const third = createController();

    host.registerController(first, element);
    host.registerController(second, element);
    host.registerController(third, element, 0);

    expect(host.controllers).toEqual([third, first, second]);
  });

  it("controllers returns a new array each time", function () {
    const host = new ControllerHost();
    const controller = createController();
    host.registerController(controller, element);

    const controllers = host.controllers;
    controllers.pop();

    expect(controllers).toEqual([]);
    expect(host.controllers).toEqual([controller]);
    expect(host.controllers).not.toBe(host.controllers);
  });

  it("controllers doesn't include unregistered controllers", function () {
    const host = new ControllerHost();
    const first = createController();
    const second = createController();
    host.registerController(first, element);
    host.registerController(second, element);

    host.unregisterController(first, element);

    expect(host.controllers).toEqual([second]);
  });
});
