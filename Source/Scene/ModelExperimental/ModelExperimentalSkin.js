import Matrix4 from "../../Core/Matrix4.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";

/**
 * An in-memory representation of a skin that affects nodes in the {@link ModelExperimentalSceneGraph}.
 * Skins should only be initialized after all of the {@link ModelExperimentalRuntimeNode}s have been instantiated
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
  this._jointMatrices = [];

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
   * @memberof ModelExperimentalSkin.prototype
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
   * @type {ModelExperimentalRuntimeNode[]}
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
   * The joint matrices for the skin, where each joint matrix is computed as
   * jointMatrix = jointWorldTransform * inverseBindMatrix.
   *
   * Each node that references this skin is responsible for pre-multiplying its inverse
   * world transform to the joint matrices for its own use.
   *
   * @memberof ModelExperimentalSkin.prototype
   * @type {Matrix4[]}
   * @readonly
   *
   * @private
   */
  jointMatrices: {
    get: function () {
      return this._jointMatrices;
    },
  },
});

function initialize(runtimeSkin) {
  const skin = runtimeSkin.skin;
  const inverseBindMatrices = skin.inverseBindMatrices;
  runtimeSkin._inverseBindMatrices = inverseBindMatrices;

  const joints = skin.joints;
  const length = joints.length;

  const runtimeNodes = runtimeSkin.sceneGraph._runtimeNodes;
  const runtimeJoints = runtimeSkin.joints;
  const runtimeJointMatrices = runtimeSkin._jointMatrices;
  for (let i = 0; i < length; i++) {
    const jointIndex = joints[i].index;
    const runtimeNode = runtimeNodes[jointIndex];
    runtimeJoints.push(runtimeNode);

    const inverseBindMatrix = inverseBindMatrices[i];
    const jointMatrix = computeJointMatrix(
      runtimeNode,
      inverseBindMatrix,
      new Matrix4()
    );
    runtimeJointMatrices.push(jointMatrix);
  }
}

function computeJointMatrix(joint, inverseBindMatrix, result) {
  const jointWorldTransform = Matrix4.multiplyTransformation(
    joint.transformToRoot,
    joint.transform,
    result
  );

  result = Matrix4.multiplyTransformation(
    jointWorldTransform,
    inverseBindMatrix,
    result
  );

  return result;
}

/**
 * Updates the joint matrices for the skin.
 *
 * @private
 */
ModelExperimentalSkin.prototype.updateJointMatrices = function () {
  const jointMatrices = this._jointMatrices;
  const length = jointMatrices.length;
  for (let i = 0; i < length; i++) {
    const joint = this.joints[i];
    const inverseBindMatrix = this.inverseBindMatrices[i];
    jointMatrices[i] = computeJointMatrix(
      joint,
      inverseBindMatrix,
      jointMatrices[i]
    );
  }
};
