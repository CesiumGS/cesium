export default class ControllerHost {
  constructor() {
    this._controllers = [];
    this._needsFirstUpdate = [];
  }

  // TODO: Handle order?

  registerController(controller, element) {
    const index = this._controllers.length;
    this._controllers.push(controller);
    this._needsFirstUpdate.push(index);
    controller.connectedCallback(element);

    // TODO: disconnect automatically?
  }

  unregisterController(controller, element) {
    const controllers = this._controllers;
    const index = controllers.indexOf(controller);
    if (index !== -1) {
      controllers.splice(index, 1);
      controller.disconnectedCallback(element);
    }
  }

  update(scene, time) {
    for (const [index, controller] of this._controllers.entries()) {
      if (!controller.enabled) {
        continue;
      }
      const i = this._needsFirstUpdate.indexOf(index);
      if (i >= 0) {
        controller.firstUpdate(scene, time);
        this._needsFirstUpdate.splice(i, 1);
      }
      controller.update(scene, time);
    }
  }
}
