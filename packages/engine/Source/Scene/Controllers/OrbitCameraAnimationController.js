import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import getTimestamp from "../../Core/getTimestamp.js";
import HeadingPitchRange from "../../Core/HeadingPitchRange.js";
import TimeConstants from "../../Core/TimeConstants.js";

const scratchPixelSize = new Cartesian2();

export default class OrbitCameraAnimationController {
  constructor() {
    this.enabled = true;
    this.speed = 100.0;
    this.target = new Cartesian3();

    this._lastUpdateTime = undefined;
    this._headingPitchRange = new HeadingPitchRange();
  }

  get range() {
    return this._headingPitchRange.range;
  }

  set range(value) {
    this._headingPitchRange.range = value;
  }

  connectedCallback(element) {}
  disconnectedCallback(element) {}

  firstUpdate(scene, time) {
    this._lastUpdateTime = getTimestamp();
  }

  update(scene, time) {
    const now = getTimestamp();
    const ds =
      (now - this._lastUpdateTime) * TimeConstants.SECONDS_PER_MILLISECOND;

    const camera = scene.camera;
    const distance = Cartesian3.distance(camera.positionWC, this.target);

    const { drawingBufferWidth, drawingBufferHeight, pixelRatio } = scene;
    const pixelSize = camera.frustum.getPixelDimensions(
      drawingBufferWidth,
      drawingBufferHeight,
      distance,
      pixelRatio,
      scratchPixelSize,
    );

    const p = Math.max(pixelSize.x, pixelSize.y);

    const moveRate = this.speed * p * ds;

    this._headingPitchRange.range = distance;

    camera.moveForward(moveRate);
    //camera.lookAt(this.target, this._headingPitchRange);

    this._lastUpdateTime = getTimestamp();
  }
}
