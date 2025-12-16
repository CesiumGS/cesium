import defined from "../../Core/defined.js";
import getTimestamp from "../../Core/getTimestamp.js";
import TimeConstants from "../../Core/TimeConstants.js";
import InputEventMap from "./InputEventMap.js";

export const FORWARD = "forward";
export const BACKWARD = "backward";
export const LEFT = "left";
export const RIGHT = "right";
export const UP = "up";
export const DOWN = "down";

export default class FirstPersonKeyboardController {
  constructor() {
    this._enabled = true;
    this.moveSpeed = 1000000.0;

    this._lastUpdateTime = undefined;

    this._inputEvents = new InputEventMap();

    // Default bindings
    this._inputEvents.addKeyBinding(FORWARD, "W");
    this._inputEvents.addKeyBinding(FORWARD, "ArrowUp");
    this._inputEvents.addKeyBinding(BACKWARD, "S");
    this._inputEvents.addKeyBinding(BACKWARD, "ArrowDown");
    this._inputEvents.addKeyBinding(LEFT, "A");
    this._inputEvents.addKeyBinding(LEFT, "ArrowLeft");
    this._inputEvents.addKeyBinding(RIGHT, "D");
    this._inputEvents.addKeyBinding(RIGHT, "ArrowRight");
    this._inputEvents.addKeyBinding(UP, "Q");
    this._inputEvents.addKeyBinding(UP, "PageUp");
    this._inputEvents.addKeyBinding(DOWN, "E");
    this._inputEvents.addKeyBinding(DOWN, "PageDown");

    this._isKeyDown = new Map();
    this._isKeyDown.set(FORWARD, false);
    this._isKeyDown.set(BACKWARD, false);
    this._isKeyDown.set(LEFT, false);
    this._isKeyDown.set(RIGHT, false);
    this._isKeyDown.set(UP, false);
    this._isKeyDown.set(DOWN, false);
  }

  get enabled() {
    return this._enabled;
  }
  
  set enabled(value) {
    this._enabled = value;

    if (value) {
      this._lastUpdateTime = getTimestamp();
    }
  }

  get inputEvents() {
    return this._inputEvents;
  }

  connectedCallback(element) {
    element.addEventListener("keydown", this._handleKeyDown.bind(this), false);
    element.addEventListener("keyup", this._handleKeyUp.bind(this), false);
  }

  disconnectedCallback(element) {
    // TODO
  }

  firstUpdate(scene, time) {
    this._lastUpdateTime = getTimestamp();
  }

  update(scene, time) {
    const now = getTimestamp();
    const ds = (now - this._lastUpdateTime) * TimeConstants.SECONDS_PER_MILLISECOND;

    const camera = scene.camera;
    const moveRate = this.moveSpeed * ds;

    if (this._isKeyDown.get(FORWARD)) {
      camera.moveForward(moveRate);
    }
    if (this._isKeyDown.get(BACKWARD)) {
      camera.moveBackward(moveRate);
    }
    if (this._isKeyDown.get(LEFT)) {
      camera.moveLeft(moveRate);
    }
    if (this._isKeyDown.get(RIGHT)) {
      camera.moveRight(moveRate);
    }
    if (this._isKeyDown.get(UP)) {
      camera.moveUp(moveRate);
    }
    if (this._isKeyDown.get(DOWN)) {
      camera.moveDown(moveRate);
    }

    this._lastUpdateTime = getTimestamp();
  }

  _handleKeyDown(event) {
    const eventName = this._inputEvents.getKeyboardInputEvent(event);

    if (!defined(eventName)) {
      return;
    }

    this._isKeyDown.set(eventName, true);
  }

  _handleKeyUp(event) {
    const eventName = this._inputEvents.getKeyboardInputEvent(event);

    if (!defined(eventName)) {
      return;
    }

    this._isKeyDown.set(eventName, false);
  }
}
