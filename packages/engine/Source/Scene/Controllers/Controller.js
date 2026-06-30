// @ts-check
/** @import JulianDate from '../../Core/JulianDate.js'; */

import DeveloperError from "../../Core/DeveloperError.js";

/**
 * TODO: Docs
 * This type describes an
 * interface and is not intended to be instantiated directly.
 * @abstract
 */
export default class Controller {
  /**
   * TODO
   * @type {boolean}
   */
  get enabled() {
    return DeveloperError.throwInstantiationError();
  }
  set enabled(value) {
    DeveloperError.throwInstantiationError();
  }


  /**
   * Invoked when the controller is added to the DOM. Implement <code>connectedCallback</code> to set up any DOM event listeners.
   *
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  connectedCallback(element) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Invoked when the controller is removed from the DOM. Implement <code>disconnectedCallback</code> to tear down any DOM event listeners.
   *
   * @param {HTMLElement} element The DOM element containing the Cesium scene.
   */
  disconnectedCallback(element) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Invoked once per frame. Implement <code>update</code> to modify the camera or other parts of the scene.
   * @see {@link https://cesium.com/blog/2018/01/24/cesium-scene-rendering-performance/#updaterender-cycle-events|Update/Render Cycle Events}
   * @param {Scene} scene
   * @param {JulianDate} time The current simulation time.
   */
  update(scene, time) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Invoked when the controller is being updated the first time, immediately before <code>update</code> is called. Implement <code>firstUpdate</code> to perform one-time work after the relevant scene has begun it's render loop. Some examples might include initializing simulation time values or adding a primitive to the scene.
   * @see Controller#update
   * @param {Scene} scene
   * @param {JulianDate} time The current simulation time.
   */
  firstUpdate(scene, time) {
    DeveloperError.throwInstantiationError();
  }
}
