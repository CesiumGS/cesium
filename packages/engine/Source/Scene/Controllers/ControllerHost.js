// @ts-check
/** @import Controller from './Controller.js'; */
/** @import Scene from '../Scene.js'; */
/** @import JulianDate from '../../Core/JulianDate.js'; */

/**
 * TODO: Docs
 */
export default class ControllerHost {
  constructor() {
    /**
     * @type {Controller[]}
     * @private
     * @readonly
     */
    this._controllers = [];
    this._needsUpdate = new Set();
  }

  /**
   * The number of controllers registered to this host.
   * @type {number}
   */
  get controllerCount() {
    return this._controllers.length;
  }

  /**
   * @param {Controller} controller
   * @param {HTMLElement} element
   * @param {number} [priority=0] An index, less than or equal to the current count of registed controllers, that defines the precedence of the new controller relative to those previously registered. A priority of <code>0</code> would mean the new controller would apply it's updates before any other controller. As subsequent controllers are updated, their effects are applied on top of any previous update effects. If omitted, the new controller becomes the highest priority, i.e., it's updates are applied after all other controllers.
   */
  registerController(controller, element, priority) {
    const index = priority ?? this.controllerCount;
    this._controllers.splice(index, 0, controller);
    this._needsUpdate.add(controller);
    controller.connectedCallback(element);
    // TODO: disconnect automatically?
  }

  /**
   * @param {Controller} controller
   * @param {HTMLElement} element
   */
  unregisterController(controller, element) {
    const controllers = this._controllers;
    const index = controllers.indexOf(controller);
    if (index !== -1) {
      controllers.splice(index, 1);
      controller.disconnectedCallback(element);
    }
  }

  /**
   * @param {Scene} scene
   * @param {JulianDate} time The current simulation time.
   */
  update(scene, time) {
    for (const controller of this._controllers) {
      if (!controller.enabled) {
        continue;
      }

      if (this._needsUpdate.has(controller)) {
        controller.firstUpdate(scene, time);
        this._needsUpdate.delete(controller);
      }

      controller.update(scene, time);
    }
  }
}
