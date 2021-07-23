import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import FeatureDetection from "../../Core/FeatureDetection.js";
import knockout from "../knockout.js";
import getElement from "../getElement.js";
import SceneModePickerViewModel from "./SceneModePickerViewModel.js";

var globePath =
  "m 32.401392,4.9330437 c -7.087603,0 -14.096095,2.884602 -19.10793,7.8946843 -5.0118352,5.010083 -7.9296167,11.987468 -7.9296167,19.072999 0,7.085531 2.9177815,14.097848 7.9296167,19.107931 4.837653,4.835961 11.541408,7.631372 18.374354,7.82482 0.05712,0.01231 0.454119,0.139729 0.454119,0.139729 l 0.03493,-0.104797 c 0.08246,7.84e-4 0.162033,0.03493 0.244525,0.03493 0.08304,0 0.161515,-0.03414 0.244526,-0.03493 l 0.03493,0.104797 c 0,0 0.309474,-0.129487 0.349323,-0.139729 6.867765,-0.168094 13.582903,-2.965206 18.444218,-7.82482 2.558195,-2.5573 4.551081,-5.638134 5.903547,-8.977584 1.297191,-3.202966 2.02607,-6.661489 2.02607,-10.130347 0,-6.237309 -2.366261,-12.31219 -6.322734,-17.116794 -0.0034,-0.02316 0.0049,-0.04488 0,-0.06986 -0.01733,-0.08745 -0.104529,-0.278855 -0.104797,-0.279458 -5.31e-4,-0.0012 -0.522988,-0.628147 -0.523984,-0.62878 \
        -3.47e-4,-2.2e-4 -0.133444,-0.03532 -0.244525,-0.06987 C 51.944299,13.447603 51.751076,13.104317 51.474391,12.827728 46.462556,7.8176457 39.488996,4.9330437 32.401392,4.9330437 z m -2.130866,3.5281554 0.104797,9.6762289 c -4.111695,-0.08361 -7.109829,-0.423664 -9.257041,-0.943171 1.198093,-2.269271 2.524531,-4.124404 3.91241,-5.414496 2.167498,-2.0147811 3.950145,-2.8540169 5.239834,-3.3185619 z m 2.794579,0 c 1.280302,0.4754953 3.022186,1.3285948 5.065173,3.2486979 1.424667,1.338973 2.788862,3.303645 3.982275,5.728886 -2.29082,0.403367 -5.381258,0.621049 -8.942651,0.698645 L 33.065105,8.4611991 z m 5.728886,0.2445256 c 4.004072,1.1230822 7.793098,3.1481363 10.724195,6.0782083 0.03468,0.03466 0.07033,0.06991 0.104797,0.104797 -0.45375,0.313891 -0.923054,0.663002 -1.956205,1.082899 -0.647388,0.263114 -1.906242,0.477396 -2.829511,0.733577 -1.382296,-2.988132 \
        -3.027146,-5.368585 -4.785716,-7.0213781 -0.422866,-0.397432 -0.835818,-0.6453247 -1.25756,-0.9781032 z m -15.33525,0.7685092 c -0.106753,0.09503 -0.207753,0.145402 -0.31439,0.244526 -1.684973,1.5662541 -3.298068,3.8232211 -4.680919,6.5672591 -0.343797,-0.14942 -1.035052,-0.273198 -1.292493,-0.419186 -0.956528,-0.542427 -1.362964,-1.022024 -1.537018,-1.292493 -0.0241,-0.03745 -0.01868,-0.0401 -0.03493,-0.06986 2.250095,-2.163342 4.948824,-3.869984 7.859752,-5.0302421 z m -9.641296,7.0912431 c 0.464973,0.571618 0.937729,1.169056 1.956205,1.746612 0.349907,0.198425 1.107143,0.335404 1.537018,0.523983 -1.20166,3.172984 -1.998037,7.051901 -2.165798,11.772162 C 14.256557,30.361384 12.934823,30.161483 12.280427,29.90959 10.644437,29.279855 9.6888882,28.674891 9.1714586,28.267775 8.6540289,27.860658 8.6474751,27.778724 8.6474751,27.778724 l -0.069864,0.03493 C 9.3100294,23.691285 \
        11.163248,19.798527 13.817445,16.565477 z m 37.552149,0.523984 c 2.548924,3.289983 4.265057,7.202594 4.890513,11.318043 -0.650428,0.410896 -1.756876,1.001936 -3.563088,1.606882 -1.171552,0.392383 -3.163859,0.759153 -4.960377,1.117832 -0.04367,-4.752703 -0.784809,-8.591423 -1.88634,-11.807094 0.917574,-0.263678 2.170552,-0.486495 2.864443,-0.76851 1.274693,-0.518066 2.003942,-1.001558 2.654849,-1.467153 z m -31.439008,2.619917 c 2.487341,0.672766 5.775813,1.137775 10.479669,1.222628 l 0.104797,10.689263 0,0.03493 0,0.733577 c -5.435005,-0.09059 -9.512219,-0.519044 -12.610536,-1.117831 0.106127,-4.776683 0.879334,-8.55791 2.02607,-11.562569 z m 23.264866,0.31439 c 1.073459,3.067541 1.833795,6.821314 1.816476,11.702298 -3.054474,0.423245 -7.062018,0.648559 -11.702298,0.698644 l 0,-0.838373 -0.104796,-10.654331 c 4.082416,-0.0864 7.404468,-0.403886 9.990618,-0.908238 z \
        M 8.2632205,30.922625 c 0.7558676,0.510548 1.5529563,1.013339 3.0041715,1.57195 0.937518,0.360875 2.612202,0.647642 3.91241,0.978102 0.112814,3.85566 0.703989,7.107756 1.606883,9.920754 -1.147172,-0.324262 -2.644553,-0.640648 -3.423359,-0.978102 -1.516688,-0.657177 -2.386627,-1.287332 -2.864443,-1.71168 -0.477816,-0.424347 -0.489051,-0.489051 -0.489051,-0.489051 L 9.8002387,40.319395 C 8.791691,37.621767 8.1584238,34.769583 8.1584238,31.900727 c 0,-0.330153 0.090589,-0.648169 0.1047967,-0.978102 z m 48.2763445,0.419186 c 0.0047,0.188973 0.06986,0.36991 0.06986,0.558916 0,2.938869 -0.620228,5.873558 -1.676747,8.628261 -0.07435,0.07583 -0.06552,0.07411 -0.454119,0.349323 -0.606965,0.429857 -1.631665,1.042044 -3.318562,1.676747 -1.208528,0.454713 -3.204964,0.850894 -5.135038,1.25756 0.84593,-2.765726 1.41808,-6.005357 1.606883,-9.815957 2.232369,-0.413371 4.483758,-0.840201 \
        5.938479,-1.327425 1.410632,-0.472457 2.153108,-0.89469 2.96924,-1.327425 z m -38.530252,2.864443 c 3.208141,0.56697 7.372279,0.898588 12.575603,0.978103 l 0.174662,9.885821 c -4.392517,-0.06139 -8.106722,-0.320566 -10.863925,-0.803441 -1.051954,-2.664695 -1.692909,-6.043794 -1.88634,-10.060483 z m 26.793022,0.31439 c -0.246298,3.923551 -0.877762,7.263679 -1.816476,9.885822 -2.561957,0.361954 -5.766249,0.560708 -9.431703,0.62878 l -0.174661,-9.815957 c 4.491734,-0.04969 8.334769,-0.293032 11.42284,-0.698645 z M 12.035901,44.860585 c 0.09977,0.04523 0.105535,0.09465 0.209594,0.139729 1.337656,0.579602 3.441099,1.058072 5.589157,1.537018 1.545042,3.399208 3.548524,5.969402 5.589157,7.789888 -3.034411,-1.215537 -5.871615,-3.007978 -8.174142,-5.309699 -1.245911,-1.245475 -2.271794,-2.662961 -3.213766,-4.156936 z m 40.69605,0 c -0.941972,1.493975 -1.967855,2.911461 \
        -3.213765,4.156936 -2.74253,2.741571 -6.244106,4.696717 -9.955686,5.868615 0.261347,-0.241079 0.507495,-0.394491 0.768509,-0.663713 1.674841,-1.727516 3.320792,-4.181056 4.645987,-7.265904 2.962447,-0.503021 5.408965,-1.122293 7.161107,-1.781544 0.284034,-0.106865 0.337297,-0.207323 0.593848,-0.31439 z m -31.404076,2.305527 c 2.645807,0.376448 5.701178,0.649995 9.466635,0.698645 l 0.139729,7.789888 c -1.38739,-0.480844 -3.316218,-1.29837 -5.659022,-3.388427 -1.388822,-1.238993 -2.743668,-3.0113 -3.947342,-5.100106 z m 20.365491,0.104797 c -1.04872,2.041937 -2.174337,3.779068 -3.353494,4.995309 -1.853177,1.911459 -3.425515,2.82679 -4.611055,3.353494 l -0.139729,-7.789887 c 3.13091,-0.05714 5.728238,-0.278725 8.104278,-0.558916 z";
var flatMapPath =
  "m 2.9825053,17.550598 0,1.368113 0,26.267766 0,1.368113 1.36811,0 54.9981397,0 1.36811,0 0,-1.368113 0,-26.267766 0,-1.368113 -1.36811,0 -54.9981397,0 -1.36811,0 z m 2.73623,2.736226 10.3292497,0 0,10.466063 -10.3292497,0 0,-10.466063 z m 13.0654697,0 11.69737,0 0,10.466063 -11.69737,0 0,-10.466063 z m 14.43359,0 11.69737,0 0,10.466063 -11.69737,0 0,-10.466063 z m 14.43359,0 10.32926,0 0,10.466063 -10.32926,0 0,-10.466063 z m -41.9326497,13.202288 10.3292497,0 0,10.329252 -10.3292497,0 0,-10.329252 z m 13.0654697,0 11.69737,0 0,10.329252 -11.69737,0 0,-10.329252 z m 14.43359,0 11.69737,0 0,10.329252 -11.69737,0 0,-10.329252 z m 14.43359,0 10.32926,0 0,10.329252 -10.32926,0 0,-10.329252 z";
var columbusViewPath =
  "m 14.723969,17.675598 -0.340489,0.817175 -11.1680536,26.183638 -0.817175,1.872692 2.076986,0 54.7506996,0 2.07698,0 -0.81717,-1.872692 -11.16805,-26.183638 -0.34049,-0.817175 -0.91933,0 -32.414586,0 -0.919322,0 z m 1.838643,2.723916 6.196908,0 -2.928209,10.418977 -7.729111,0 4.460412,-10.418977 z m 9.02297,0 4.903049,0 0,10.418977 -7.831258,0 2.928209,-10.418977 z m 7.626964,0 5.584031,0 2.62176,10.418977 -8.205791,0 0,-10.418977 z m 8.410081,0 5.51593,0 4.46042,10.418977 -7.38863,0 -2.58772,-10.418977 z m -30.678091,13.142892 8.103649,0 -2.89416,10.282782 -9.6018026,0 4.3923136,-10.282782 z m 10.929711,0 8.614384,0 0,10.282782 -11.508544,0 2.89416,-10.282782 z m 11.338299,0 8.852721,0 2.58772,10.282782 -11.440441,0 0,-10.282782 z m 11.678781,0 7.86531,0 4.39231,10.282782 -9.6699,0 -2.58772,-10.282782 z";

/**
 * <img src="Images/sceneModePicker.png" style="float: left; margin-right: 10px;" width="44" height="116" />
 * <p>The SceneModePicker is a single button widget for switching between scene modes;
 * shown to the left in its expanded state. Programatic switching of scene modes will
 * be automatically reflected in the widget as long as the specified Scene
 * is used to perform the change.</p><p style="clear: both;"></p><br/>
 *
 * @alias SceneModePicker
 * @constructor
 *
 * @param {Element|String} container The DOM element or ID that will contain the widget.
 * @param {Scene} scene The Scene instance to use.
 * @param {Number} [duration=2.0] The time, in seconds, it takes for the scene to transition.
 *
 * @exception {DeveloperError} Element with id "container" does not exist in the document.
 *
 * @example
 * // In HTML head, include a link to the SceneModePicker.css stylesheet,
 * // and in the body, include: <div id="sceneModePickerContainer"></div>
 * // Note: This code assumes you already have a Scene instance.
 *
 * var sceneModePicker = new Cesium.SceneModePicker('sceneModePickerContainer', scene);
 */
function SceneModePicker(container, scene, duration) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(container)) {
    throw new DeveloperError("container is required.");
  }
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  container = getElement(container);

  var viewModel = new SceneModePickerViewModel(scene, duration);

  viewModel._globePath = globePath;
  viewModel._flatMapPath = flatMapPath;
  viewModel._columbusViewPath = columbusViewPath;

  var wrapper = document.createElement("span");
  wrapper.className = "cesium-sceneModePicker-wrapper cesium-toolbar-button";
  container.appendChild(wrapper);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "cesium-button cesium-toolbar-button";
  button.setAttribute(
    "data-bind",
    '\
css: { "cesium-sceneModePicker-button2D": sceneMode === _sceneMode.SCENE2D,\
       "cesium-sceneModePicker-button3D": sceneMode === _sceneMode.SCENE3D,\
       "cesium-sceneModePicker-buttonColumbusView": sceneMode === _sceneMode.COLUMBUS_VIEW,\
       "cesium-sceneModePicker-selected": dropDownVisible },\
attr: { title: selectedTooltip },\
click: toggleDropDown'
  );
  button.innerHTML =
    '\
<!-- ko cesiumSvgPath: { path: _globePath, width: 64, height: 64, css: "cesium-sceneModePicker-slide-svg cesium-sceneModePicker-icon3D" } --><!-- /ko -->\
<!-- ko cesiumSvgPath: { path: _flatMapPath, width: 64, height: 64, css: "cesium-sceneModePicker-slide-svg cesium-sceneModePicker-icon2D" } --><!-- /ko -->\
<!-- ko cesiumSvgPath: { path: _columbusViewPath, width: 64, height: 64, css: "cesium-sceneModePicker-slide-svg cesium-sceneModePicker-iconColumbusView" } --><!-- /ko -->';
  wrapper.appendChild(button);

  var morphTo3DButton = document.createElement("button");
  morphTo3DButton.type = "button";
  morphTo3DButton.className =
    "cesium-button cesium-toolbar-button cesium-sceneModePicker-dropDown-icon";
  morphTo3DButton.setAttribute(
    "data-bind",
    '\
css: { "cesium-sceneModePicker-visible" : (dropDownVisible && (sceneMode !== _sceneMode.SCENE3D)) || (!dropDownVisible && (sceneMode === _sceneMode.SCENE3D)),\
       "cesium-sceneModePicker-none" : sceneMode === _sceneMode.SCENE3D,\
       "cesium-sceneModePicker-hidden" : !dropDownVisible },\
attr: { title: tooltip3D },\
click: morphTo3D,\
cesiumSvgPath: { path: _globePath, width: 64, height: 64 }'
  );
  wrapper.appendChild(morphTo3DButton);

  var morphTo2DButton = document.createElement("button");
  morphTo2DButton.type = "button";
  morphTo2DButton.className =
    "cesium-button cesium-toolbar-button cesium-sceneModePicker-dropDown-icon";
  morphTo2DButton.setAttribute(
    "data-bind",
    '\
css: { "cesium-sceneModePicker-visible" : (dropDownVisible && (sceneMode !== _sceneMode.SCENE2D)),\
       "cesium-sceneModePicker-none" : sceneMode === _sceneMode.SCENE2D,\
       "cesium-sceneModePicker-hidden" : !dropDownVisible },\
attr: { title: tooltip2D },\
click: morphTo2D,\
cesiumSvgPath: { path: _flatMapPath, width: 64, height: 64 }'
  );
  wrapper.appendChild(morphTo2DButton);

  var morphToCVButton = document.createElement("button");
  morphToCVButton.type = "button";
  morphToCVButton.className =
    "cesium-button cesium-toolbar-button cesium-sceneModePicker-dropDown-icon";
  morphToCVButton.setAttribute(
    "data-bind",
    '\
css: { "cesium-sceneModePicker-visible" : (dropDownVisible && (sceneMode !== _sceneMode.COLUMBUS_VIEW)) || (!dropDownVisible && (sceneMode === _sceneMode.COLUMBUS_VIEW)),\
       "cesium-sceneModePicker-none" : sceneMode === _sceneMode.COLUMBUS_VIEW,\
       "cesium-sceneModePicker-hidden" : !dropDownVisible},\
attr: { title: tooltipColumbusView },\
click: morphToColumbusView,\
cesiumSvgPath: { path: _columbusViewPath, width: 64, height: 64 }'
  );
  wrapper.appendChild(morphToCVButton);

  knockout.applyBindings(viewModel, wrapper);

  this._viewModel = viewModel;
  this._container = container;
  this._wrapper = wrapper;

  this._closeDropDown = function (e) {
    if (!wrapper.contains(e.target)) {
      viewModel.dropDownVisible = false;
    }
  };
  if (FeatureDetection.supportsPointerEvents()) {
    document.addEventListener("pointerdown", this._closeDropDown, true);
  } else {
    document.addEventListener("mousedown", this._closeDropDown, true);
    document.addEventListener("touchstart", this._closeDropDown, true);
  }
}

Object.defineProperties(SceneModePicker.prototype, {
  /**
   * Gets the parent container.
   * @memberof SceneModePicker.prototype
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
   * @memberof SceneModePicker.prototype
   *
   * @type {SceneModePickerViewModel}
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
SceneModePicker.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
SceneModePicker.prototype.destroy = function () {
  this._viewModel.destroy();

  if (FeatureDetection.supportsPointerEvents()) {
    document.removeEventListener("pointerdown", this._closeDropDown, true);
  } else {
    document.removeEventListener("mousedown", this._closeDropDown, true);
    document.removeEventListener("touchstart", this._closeDropDown, true);
  }

  knockout.cleanNode(this._wrapper);
  this._container.removeChild(this._wrapper);

  return destroyObject(this);
};
export default SceneModePicker;
