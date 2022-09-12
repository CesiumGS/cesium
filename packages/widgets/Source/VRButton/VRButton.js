import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import knockout from "../../ThirdParty/knockout.js";
import getElement from "../getElement.js";
import VRButtonViewModel from "./VRButtonViewModel.js";

const enterVRPath =
  "M 5.3125 6.375 C 4.008126 6.375 2.96875 7.4141499 2.96875 8.71875 L 2.96875 19.5 C 2.96875 20.8043 4.008126 21.875 5.3125 21.875 L 13.65625 21.875 C 13.71832 20.0547 14.845166 18.59375 16.21875 18.59375 C 17.592088 18.59375 18.71881 20.0552 18.78125 21.875 L 27.09375 21.875 C 28.398125 21.875 29.4375 20.8043 29.4375 19.5 L 29.4375 8.71875 C 29.4375 7.4141499 28.398125 6.375 27.09375 6.375 L 5.3125 6.375 z M 9.625 10.4375 C 11.55989 10.4375 13.125 12.03385 13.125 13.96875 C 13.125 15.90365 11.55989 17.46875 9.625 17.46875 C 7.69011 17.46875 6.125 15.90365 6.125 13.96875 C 6.125 12.03385 7.69011 10.4375 9.625 10.4375 z M 22.46875 10.4375 C 24.40364 10.4375 25.96875 12.03385 25.96875 13.96875 C 25.96875 15.90365 24.40364 17.46875 22.46875 17.46875 C 20.53386 17.46875 18.96875 15.90365 18.96875 13.96875 C 18.96875 12.03385 20.53386 10.4375 22.46875 10.4375 z";
const exitVRPath =
  "M 25.770585,2.4552065 C 15.72282,13.962707 10.699956,19.704407 8.1768352,22.580207 c -1.261561,1.4379 -1.902282,2.1427 -2.21875,2.5 -0.141624,0.1599 -0.208984,0.2355 -0.25,0.2813 l 0.6875,0.75 c 10e-5,-10e-5 0.679191,0.727 0.6875,0.7187 0.01662,-0.016 0.02451,-0.024 0.03125,-0.031 0.01348,-0.014 0.04013,-0.038 0.0625,-0.062 0.04474,-0.05 0.120921,-0.1315 0.28125,-0.3126 0.320657,-0.3619 0.956139,-1.0921 2.2187499,-2.5312 2.5252219,-2.8781 7.5454589,-8.6169 17.5937499,-20.1250005 l -1.5,-1.3125 z m -20.5624998,3.9063 c -1.304375,0 -2.34375,1.0391 -2.34375,2.3437 l 0,10.8125005 c 0,1.3043 1.039375,2.375 2.34375,2.375 l 2.25,0 c 1.9518039,-2.2246 7.4710958,-8.5584 13.5624998,-15.5312005 l -15.8124998,0 z m 21.1249998,0 c -1.855467,2.1245 -2.114296,2.4005 -3.59375,4.0936995 1.767282,0.1815 3.15625,1.685301 3.15625,3.500001 0,1.9349 -1.56511,3.5 -3.5,3.5 -1.658043,0 -3.043426,-1.1411 -3.40625,-2.6875 -1.089617,1.2461 -2.647139,2.9988 -3.46875,3.9375 0.191501,-0.062 0.388502,-0.094 0.59375,-0.094 1.373338,0 2.50006,1.4614 2.5625,3.2812 l 8.3125,0 c 1.304375,0 2.34375,-1.0707 2.34375,-2.375 l 0,-10.8125005 c 0,-1.3046 -1.039375,-2.3437 -2.34375,-2.3437 l -0.65625,0 z M 9.5518351,10.423906 c 1.9348899,0 3.4999999,1.596401 3.4999999,3.531301 0,1.9349 -1.56511,3.5 -3.4999999,3.5 -1.9348899,0 -3.4999999,-1.5651 -3.4999999,-3.5 0,-1.9349 1.56511,-3.531301 3.4999999,-3.531301 z m 4.2187499,10.312601 c -0.206517,0.2356 -0.844218,0.9428 -1.03125,1.1562 l 0.8125,0 c 0.01392,-0.4081 0.107026,-0.7968 0.21875,-1.1562 z";

/**
 * A single button widget for toggling vr mode.
 *
 * @alias VRButton
 * @constructor
 *
 * @param {Element|String} container The DOM element or ID that will contain the widget.
 * @param {Scene} scene The scene.
 * @param {Element|String} [vrElement=document.body] The element or id to be placed into vr mode.
 *
 * @exception {DeveloperError} Element with id "container" does not exist in the document.
 */
function VRButton(container, scene, vrElement) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(container)) {
    throw new DeveloperError("container is required.");
  }
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  container = getElement(container);

  const viewModel = new VRButtonViewModel(scene, vrElement);

  viewModel._exitVRPath = exitVRPath;
  viewModel._enterVRPath = enterVRPath;

  const element = document.createElement("button");
  element.type = "button";
  element.className = "cesium-button cesium-vrButton";
  element.setAttribute(
    "data-bind",
    '\
css: { "cesium-button-disabled" : _isOrthographic }, \
attr: { title: tooltip },\
click: command,\
enable: isVREnabled,\
cesiumSvgPath: { path: isVRMode ? _exitVRPath : _enterVRPath, width: 32, height: 32 }'
  );

  container.appendChild(element);

  knockout.applyBindings(viewModel, element);

  this._container = container;
  this._viewModel = viewModel;
  this._element = element;
}

Object.defineProperties(VRButton.prototype, {
  /**
   * Gets the parent container.
   * @memberof VRButton.prototype
   *
   * @type {Element}
   */
  container: {
    get: function () {
      return this._container;
    },
  },

  /**
   * Gets the view model.
   * @memberof VRButton.prototype
   *
   * @type {VRButtonViewModel}
   */
  viewModel: {
    get: function () {
      return this._viewModel;
    },
  },
});

/**
 * @returns {Boolean} true if the object has been destroyed, false otherwise.
 */
VRButton.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
VRButton.prototype.destroy = function () {
  this._viewModel.destroy();

  knockout.cleanNode(this._element);
  this._container.removeChild(this._element);

  return destroyObject(this);
};
export default VRButton;
