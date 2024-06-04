import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import getTimestamp from "../Core/getTimestamp.js";
import getElement from "../DataSources/getElement.js";

/**
 * @private
 */
function PerformanceDisplay(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const container = getElement(options.container);
  //>>includeStart('debug', pragmas.debug);
  if (!defined(container)) {
    throw new DeveloperError("container is required");
  }
  //>>includeEnd('debug');

  this._container = container;

  const display = document.createElement("div");
  display.className = "cesium-performanceDisplay";
  const fpsElement = document.createElement("div");
  fpsElement.className = "cesium-performanceDisplay-fps";
  this._fpsText = document.createTextNode("");
  fpsElement.appendChild(this._fpsText);
  const msElement = document.createElement("div");
  msElement.className = "cesium-performanceDisplay-ms";
  this._msText = document.createTextNode("");
  msElement.appendChild(this._msText);
  display.appendChild(msElement);
  display.appendChild(fpsElement);
  this._container.appendChild(display);

  this._lastFpsSampleTime = getTimestamp();
  this._lastMsSampleTime = getTimestamp();
  this._fpsFrameCount = 0;
  this._msFrameCount = 0;

  this._throttled = false;
  const throttledElement = document.createElement("div");
  throttledElement.className = "cesium-performanceDisplay-throttled";
  this._throttledText = document.createTextNode("");
  throttledElement.appendChild(this._throttledText);
  display.appendChild(throttledElement);
}

Object.defineProperties(PerformanceDisplay.prototype, {
  /**
   * The display should indicate the FPS is being throttled.
   * @memberof PerformanceDisplay.prototype
   *
   * @type {boolean}
   */
  throttled: {
    get: function () {
      return this._throttled;
    },
    set: function (value) {
      if (this._throttled === value) {
        return;
      }

      if (value) {
        this._throttledText.nodeValue = "(throttled)";
      } else {
        this._throttledText.nodeValue = "";
      }

      this._throttled = value;
    },
  },
});

/**
 * Update the display.  This function should only be called once per frame, because
 * each call records a frame in the internal buffer and redraws the display.
 *
 * @param {boolean} [renderedThisFrame=true] If provided, the FPS count will only update and display if true.
 */
PerformanceDisplay.prototype.update = function (renderedThisFrame) {
  const time = getTimestamp();
  const updateDisplay = defaultValue(renderedThisFrame, true);

  this._fpsFrameCount++;
  const fpsElapsedTime = time - this._lastFpsSampleTime;
  if (fpsElapsedTime > 1000) {
    let fps = "N/A";
    if (updateDisplay) {
      fps = ((this._fpsFrameCount * 1000) / fpsElapsedTime) | 0;
    }

    this._fpsText.nodeValue = `${fps} FPS`;
    this._lastFpsSampleTime = time;
    this._fpsFrameCount = 0;
  }

  this._msFrameCount++;
  const msElapsedTime = time - this._lastMsSampleTime;
  if (msElapsedTime > 200) {
    let ms = "N/A";
    if (updateDisplay) {
      ms = (msElapsedTime / this._msFrameCount).toFixed(2);
    }

    this._msText.nodeValue = `${ms} MS`;
    this._lastMsSampleTime = time;
    this._msFrameCount = 0;
  }
};

/**
 * Destroys the WebGL resources held by this object.
 */
PerformanceDisplay.prototype.destroy = function () {
  return destroyObject(this);
};
export default PerformanceDisplay;
