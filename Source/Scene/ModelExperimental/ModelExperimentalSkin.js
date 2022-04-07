import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";

/**
 * An in-memory representation of a skin that affects nodes in the {@link ModelExperimentalSceneGraph}.
 * Skins should only be initialized after all of the {@link ModelExperimentalNode}s have been instantiated
 * by the scene graph.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.Skin} options.skin The corresponding skin components from the 3D model
 * @param {ModelExperimentalSceneGraph} options.sceneGraph The scene graph this skin belongs to.
 *
 * @alias ModelExperimentalSkin
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalSkin(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.skin", options.skin);
  Check.typeOf.object("options.sceneGraph", options.sceneGraph);
  //>>includeEnd('debug');

  this._sceneGraph = options.sceneGraph;
  const skin = options.skin;

  this._skin = skin;

  this._inverseBindMatrices = undefined;
  this._joints = [];
  this._computedJointMatrices = [];

  initialize(this);
}

Object.defineProperties(ModelExperimentalSkin.prototype, {
  /**
   * The internal skin this runtime skin represents.
   *
   * @memberof ModelExperimentalSkin.prototype
   * @type {ModelComponents.Skin}
   * @readonly
   *
   * @private
   */
  skin: {
    get: function () {
      return this._skin;
    },
  },

  /**
   * The scene graph this skin belongs to.
   *
   * @type {ModelExperimentalSceneGraph}
   * @readonly
   *
   * @private
   */
  sceneGraph: {
    get: function () {
      return this._sceneGraph;
    },
  },

  /**
   * The inverse bind matrices of the skin.
   *
   * @memberof ModelExperimentalSkin.prototype
   * @type {Matrix4[]}
   * @readonly
   *
   * @private
   */
  inverseBindMatrices: {
    get: function () {
      return this._inverseBindMatrices;
    },
  },

  /**
   * The joints of the skin.
   *
   * @memberof ModelExperimentalSkin.prototype
   * @type {ModelExperimentalNode[]}
   * @readonly
   *
   * @private
   */
  joints: {
    get: function () {
      return this._joints;
    },
  },

  /**
   * The computed joint matrices for the skin.
   *
   * @memberof ModelExperimentalSkin.prototype
   * @type {Matrix4[]}
   * @readonly
   *
   * @private
   */
  computedJointMatrices: {
    get: function () {
      return this._computedJointMatrices;
    },
  },
});

function initialize(runtimeSkin) {
  const skin = runtimeSkin._skin;
  runtimeSkin._inverseBindMatrices = skin.inverseBindMatrices;

  const joints = skin.joints;
  const length = joints.length;

  const runtimeNodes = runtimeSkin._sceneGraph._runtimeNodes;
  const runtimeJoints = runtimeSkin.joints;
  for (let i = 0; i < length; i++) {
    const jointIndex = joints[i].index;
    const runtimeNode = runtimeNodes[jointIndex];
    runtimeJoints.push(runtimeNode);
  }

  // TODO: compute matrices
  runtimeSkin._computedJointMatrices = new Array(length);
}

/**
 * Updates the joint matrices for the skin.
 *
 * @private
 */
ModelExperimentalSkin.prototype.updateSkin = function () {};
