import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import HeadingPitchRoll from "../../Core/HeadingPitchRoll.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import CustomShader from "../../Scene/Model/CustomShader.js";
import VoxelShapeType from "../../Scene/VoxelShapeType.js";
import knockout from "../../ThirdParty/knockout.js";

function formatShaderString(str) {
  // This function:
  // A) removes whitespace lines at the beginning of the string
  // B) removes unnecessary spaces from the beginning of each line

  const lines = str.split("\n");
  let firstLineIdx;
  for (firstLineIdx = 0; firstLineIdx < lines.length; firstLineIdx++) {
    if (lines[firstLineIdx].match(/\S/)) {
      // Found the first line that's not entirely whitespace
      break;
    }
  }
  if (firstLineIdx === lines.length) {
    // All lines are empty
    return "";
  }

  let finalStr = "";
  const pattern = /^\s*/;
  const firstLine = lines[firstLineIdx];
  const spacesInFrontOfFirstLine = firstLine.match(pattern)[0].length;
  for (let i = firstLineIdx; i < lines.length; i++) {
    let line = lines[i];
    const spacesInFront = line.match(pattern)[0].length;
    if (spacesInFront >= spacesInFrontOfFirstLine) {
      line = line.slice(spacesInFrontOfFirstLine);
    }
    finalStr += `${line}\n`;
  }
  return finalStr;
}

/**
 * The view model for {@link VoxelInspector}.
 * @alias VoxelInspectorViewModel
 * @constructor
 *
 * @param {Scene} scene The scene instance to use.
 */
function VoxelInspectorViewModel(scene) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("scene", scene);
  //>>includeEnd('debug');

  this._scene = scene;
  this._voxelPrimitive = undefined;
  this._customShaderCompilationRemoveCallback = undefined;

  this._definedProperties = [];
  this._getPrimitiveFunctions = [];

  const that = this;
  function addProperty(options) {
    const name = options.name;
    const initialValue = options.initialValue;
    const toggle = defaultValue(options.toggle, false);
    let setPrimitiveFunction = options.setPrimitiveFunction;
    let getPrimitiveFunction = options.getPrimitiveFunction;

    that[name] = initialValue;
    that._definedProperties.push(name);

    if (setPrimitiveFunction === true) {
      setPrimitiveFunction = function (value) {
        that._voxelPrimitive[name] = value;
      };
    }
    if (getPrimitiveFunction === true) {
      getPrimitiveFunction = function () {
        that[name] = that._voxelPrimitive[name];
      };
    }
    if (defined(getPrimitiveFunction)) {
      that._getPrimitiveFunctions.push(getPrimitiveFunction);
    }

    if (toggle) {
      that.constructor.prototype[`${name}Toggle`] = function () {
        that[name] = !that[name];
      };
    }

    const knock = knockout.observable();
    knockout.defineProperty(that, name, {
      get: function () {
        return knock();
      },
      set: function (value) {
        // Convert input values to the correct type
        if (typeof initialValue === "number" && typeof value === "string") {
          value = Number(value);
          if (isNaN(value)) {
            value = initialValue;
          }
        }
        if (typeof initialValue === "boolean" && typeof value === "number") {
          value = value === 1 ? true : false;
        }
        knock(value);
        if (defined(setPrimitiveFunction) && defined(that._voxelPrimitive)) {
          setPrimitiveFunction(value);
          scene.requestRender();
        }
      },
    });
    return knock;
  }

  addProperty({
    name: "inspectorVisible",
    initialValue: false,
    toggle: true,
  });
  addProperty({
    name: "displayVisible",
    initialValue: false,
    toggle: true,
  });
  addProperty({
    name: "shaderVisible",
    initialValue: false,
    toggle: true,
  });
  addProperty({
    name: "shaderString",
    initialValue: "",
    getPrimitiveFunction: function () {
      const shaderString = that._voxelPrimitive.customShader.fragmentShaderText;
      that.shaderString = formatShaderString(shaderString);
    },
  });
  addProperty({
    name: "shaderCompilationMessage",
    initialValue: "",
  });
  addProperty({
    name: "shaderCompilationSuccess",
    initialValue: true,
  });
  addProperty({
    name: "transformVisible",
    initialValue: false,
    toggle: true,
  });
  addProperty({
    name: "boundsVisible",
    initialValue: false,
    toggle: true,
  });
  addProperty({
    name: "clippingVisible",
    initialValue: false,
    toggle: true,
  });
  addProperty({
    name: "depthTest",
    initialValue: false,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "show",
    initialValue: true,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "disableUpdate",
    initialValue: false,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "debugDraw",
    initialValue: false,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "jitter",
    initialValue: true,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "nearestSampling",
    initialValue: true,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "levelBlendFactor",
    initialValue: 1.0,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "screenSpaceError",
    initialValue: 4.0,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "stepSize",
    initialValue: 1.0,
    setPrimitiveFunction: true,
    getPrimitiveFunction: true,
  });
  addProperty({
    name: "shapeIsBox",
    getPrimitiveFunction: function () {
      const shapeType = that._voxelPrimitive.shape;
      that.shapeIsBox = shapeType === VoxelShapeType.BOX;
    },
  });
  addProperty({
    name: "shapeIsEllipsoid",
    getPrimitiveFunction: function () {
      const shapeType = that._voxelPrimitive.shape;
      that.shapeIsEllipsoid = shapeType === VoxelShapeType.ELLIPSOID;
    },
  });
  addProperty({
    name: "shapeIsCylinder",
    getPrimitiveFunction: function () {
      const shapeType = that._voxelPrimitive.shape;
      that.shapeIsCylinder = shapeType === VoxelShapeType.CYLINDER;
    },
  });
  addProperty({
    name: "boundsBoxMaxX",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        value,
        maxBounds.y,
        maxBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsBoxMaxX = maxBounds.x;
    },
  });
  addProperty({
    name: "boundsBoxMinX",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        value,
        minBounds.y,
        minBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsBoxMinX = minBounds.x;
    },
  });
  addProperty({
    name: "boundsBoxMaxY",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        maxBounds.x,
        value,
        maxBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsBoxMaxY = maxBounds.y;
    },
  });
  addProperty({
    name: "boundsBoxMinY",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        minBounds.x,
        value,
        minBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsBoxMinY = minBounds.y;
    },
  });
  addProperty({
    name: "boundsBoxMaxZ",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        maxBounds.x,
        maxBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsBoxMaxZ = maxBounds.z;
    },
  });
  addProperty({
    name: "boundsBoxMinZ",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        minBounds.x,
        minBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsBoxMinZ = minBounds.z;
    },
  });
  addProperty({
    name: "boundsEllipsoidMaxLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        value,
        maxBounds.y,
        maxBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsEllipsoidMaxLongitude = maxBounds.x;
    },
  });
  addProperty({
    name: "boundsEllipsoidMinLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        value,
        minBounds.y,
        minBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsEllipsoidMinLongitude = minBounds.x;
    },
  });
  addProperty({
    name: "boundsEllipsoidMaxLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        maxBounds.x,
        value,
        maxBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsEllipsoidMaxLatitude = maxBounds.y;
    },
  });
  addProperty({
    name: "boundsEllipsoidMinLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        minBounds.x,
        value,
        minBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsEllipsoidMinLatitude = minBounds.y;
    },
  });
  addProperty({
    name: "boundsEllipsoidMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        maxBounds.x,
        maxBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsEllipsoidMaxHeight = maxBounds.z;
    },
  });
  addProperty({
    name: "boundsEllipsoidMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        minBounds.x,
        minBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsEllipsoidMinHeight = minBounds.z;
    },
  });
  addProperty({
    name: "boundsCylinderMaxRadius",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        value,
        maxBounds.y,
        maxBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsCylinderMaxRadius = maxBounds.x;
    },
  });
  addProperty({
    name: "boundsCylinderMinRadius",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        value,
        minBounds.y,
        minBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsCylinderMinRadius = minBounds.x;
    },
  });
  addProperty({
    name: "boundsCylinderMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        maxBounds.x,
        value,
        maxBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsCylinderMaxHeight = maxBounds.y;
    },
  });
  addProperty({
    name: "boundsCylinderMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        minBounds.x,
        value,
        minBounds.z
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsCylinderMinHeight = minBounds.y;
    },
  });
  addProperty({
    name: "boundsCylinderMaxAngle",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that._voxelPrimitive.maxBounds = new Cartesian3(
        maxBounds.x,
        maxBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      const maxBounds = that._voxelPrimitive.maxBounds;
      that.boundsCylinderMaxAngle = maxBounds.z;
    },
  });
  addProperty({
    name: "boundsCylinderMinAngle",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minBounds = that._voxelPrimitive.minBounds;
      that._voxelPrimitive.minBounds = new Cartesian3(
        minBounds.x,
        minBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      const minBounds = that._voxelPrimitive.minBounds;
      that.boundsCylinderMinAngle = minBounds.z;
    },
  });
  addProperty({
    name: "clippingBoxMaxX",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        value,
        maxClippingBounds.y,
        maxClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingBoxMaxX = that._voxelPrimitive.maxClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingBoxMinX",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        value,
        minClippingBounds.y,
        minClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingBoxMinX = that._voxelPrimitive.minClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingBoxMaxY",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        maxClippingBounds.x,
        value,
        maxClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingBoxMaxY = that._voxelPrimitive.maxClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingBoxMinY",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        minClippingBounds.x,
        value,
        minClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingBoxMinY = that._voxelPrimitive.minClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingBoxMaxZ",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        maxClippingBounds.x,
        maxClippingBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      that.clippingBoxMaxZ = that._voxelPrimitive.maxClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingBoxMinZ",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        minClippingBounds.x,
        minClippingBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      that.clippingBoxMinZ = that._voxelPrimitive.minClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingEllipsoidMaxLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        value,
        maxClippingBounds.y,
        maxClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMaxLongitude =
        that._voxelPrimitive.maxClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingEllipsoidMinLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        value,
        minClippingBounds.y,
        minClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMinLongitude =
        that._voxelPrimitive.minClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingEllipsoidMaxLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        maxClippingBounds.x,
        value,
        maxClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMaxLatitude =
        that._voxelPrimitive.maxClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingEllipsoidMinLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        minClippingBounds.x,
        value,
        minClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMinLatitude =
        that._voxelPrimitive.minClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingEllipsoidMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        maxClippingBounds.x,
        maxClippingBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMaxHeight =
        that._voxelPrimitive.maxClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingEllipsoidMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        minClippingBounds.x,
        minClippingBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMinHeight =
        that._voxelPrimitive.minClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingCylinderMaxRadius",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        value,
        maxClippingBounds.y,
        maxClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingCylinderMaxRadius = that._voxelPrimitive.maxClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingCylinderMinRadius",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        value,
        minClippingBounds.y,
        minClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingCylinderMinRadius = that._voxelPrimitive.minClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingCylinderMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        maxClippingBounds.x,
        value,
        maxClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingCylinderMaxHeight = that._voxelPrimitive.maxClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingCylinderMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        minClippingBounds.x,
        value,
        minClippingBounds.z
      );
    },
    getPrimitiveFunction: function () {
      that.clippingCylinderMinHeight = that._voxelPrimitive.minClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingCylinderMaxAngle",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const maxClippingBounds = that._voxelPrimitive.maxClippingBounds;
      that._voxelPrimitive.maxClippingBounds = new Cartesian3(
        maxClippingBounds.x,
        maxClippingBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      that.clippingCylinderMaxAngle = that._voxelPrimitive.maxClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingCylinderMinAngle",
    initialValue: 0.0,
    setPrimitiveFunction: function (value) {
      const minClippingBounds = that._voxelPrimitive.minClippingBounds;
      that._voxelPrimitive.minClippingBounds = new Cartesian3(
        minClippingBounds.x,
        minClippingBounds.y,
        value
      );
    },
    getPrimitiveFunction: function () {
      that.clippingCylinderMinAngle = that._voxelPrimitive.minClippingBounds.z;
    },
  });

  addProperty({
    name: "translationX",
    initialValue: 0.0,
    setPrimitiveFunction: function (translationX) {
      const originalTranslation = Matrix4.getTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      );
      that._voxelPrimitive.modelMatrix = Matrix4.setTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3(
          translationX,
          originalTranslation.y,
          originalTranslation.z
        ),
        that._voxelPrimitive.modelMatrix
      );
    },
    getPrimitiveFunction: function () {
      that.translationX = Matrix4.getTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      ).x;
    },
  });
  addProperty({
    name: "translationY",
    initialValue: 0.0,
    setPrimitiveFunction: function (translationY) {
      const originalTranslation = Matrix4.getTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      );

      that._voxelPrimitive.modelMatrix = Matrix4.setTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3(
          originalTranslation.x,
          translationY,
          originalTranslation.z
        ),
        that._voxelPrimitive.modelMatrix
      );
    },
    getPrimitiveFunction: function () {
      that.translationY = Matrix4.getTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      ).y;
    },
  });
  addProperty({
    name: "translationZ",
    initialValue: 0.0,
    setPrimitiveFunction: function (translationZ) {
      const originalTranslation = Matrix4.getTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      );

      that._voxelPrimitive.modelMatrix = Matrix4.setTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3(
          originalTranslation.x,
          originalTranslation.y,
          translationZ
        ),
        that._voxelPrimitive.modelMatrix
      );
    },
    getPrimitiveFunction: function () {
      that.translationZ = Matrix4.getTranslation(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      ).z;
    },
  });

  addProperty({
    name: "scaleX",
    initialValue: 0.0,
    setPrimitiveFunction: function (scaleX) {
      const originalScale = Matrix4.getScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      );
      that._voxelPrimitive.modelMatrix = Matrix4.setScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3(scaleX, originalScale.y, originalScale.z),
        that._voxelPrimitive.modelMatrix
      );
    },
    getPrimitiveFunction: function () {
      that.scaleX = Matrix4.getScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      ).x;
    },
  });
  addProperty({
    name: "scaleY",
    initialValue: 0.0,
    setPrimitiveFunction: function (scaleY) {
      const originalScale = Matrix4.getScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      );
      that._voxelPrimitive.modelMatrix = Matrix4.setScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3(originalScale.x, scaleY, originalScale.z),
        that._voxelPrimitive.modelMatrix
      );
    },
    getPrimitiveFunction: function () {
      that.scaleY = Matrix4.getScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      ).y;
    },
  });
  addProperty({
    name: "scaleZ",
    initialValue: 0.0,
    setPrimitiveFunction: function (scaleZ) {
      const originalScale = Matrix4.getScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      );
      that._voxelPrimitive.modelMatrix = Matrix4.setScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3(originalScale.x, originalScale.y, scaleZ),
        that._voxelPrimitive.modelMatrix
      );
    },
    getPrimitiveFunction: function () {
      that.scaleZ = Matrix4.getScale(
        that._voxelPrimitive.modelMatrix,
        new Cartesian3()
      ).z;
    },
  });

  addProperty({
    name: "angleX",
    initialValue: 0.0,
    setPrimitiveFunction: function () {
      that._voxelPrimitive.modelMatrix = Matrix4.setRotation(
        that._voxelPrimitive.modelMatrix,
        Matrix3.fromHeadingPitchRoll(
          new HeadingPitchRoll(that.angleX, that.angleY, that.angleZ)
        ),
        that._voxelPrimitive.modelMatrix
      );
    },
  });

  addProperty({
    name: "angleY",
    initialValue: 0.0,
    setPrimitiveFunction: function () {
      that._voxelPrimitive.modelMatrix = Matrix4.setRotation(
        that._voxelPrimitive.modelMatrix,
        Matrix3.fromHeadingPitchRoll(
          new HeadingPitchRoll(that.angleX, that.angleY, that.angleZ)
        ),
        that._voxelPrimitive.modelMatrix
      );
    },
  });

  addProperty({
    name: "angleZ",
    initialValue: 0.0,
    setPrimitiveFunction: function () {
      that._voxelPrimitive.modelMatrix = Matrix4.setRotation(
        that._voxelPrimitive.modelMatrix,
        Matrix3.fromHeadingPitchRoll(
          new HeadingPitchRoll(that.angleX, that.angleY, that.angleZ)
        ),
        that._voxelPrimitive.modelMatrix
      );
    },
  });
}

Object.defineProperties(VoxelInspectorViewModel.prototype, {
  /**
   * Gets the scene
   * @memberof VoxelInspectorViewModel.prototype
   * @type {Scene}
   * @readonly
   */
  scene: {
    get: function () {
      return this._scene;
    },
  },

  /**
   * Gets or sets the primitive of the view model.
   * @memberof VoxelInspectorViewModel.prototype
   * @type {VoxelPrimitive}
   */
  voxelPrimitive: {
    get: function () {
      return this._voxelPrimitive;
    },
    set: function (voxelPrimitive) {
      if (defined(this._customShaderCompilationRemoveCallback)) {
        this._customShaderCompilationRemoveCallback();
      }

      // Update properties from the new primitive
      if (defined(voxelPrimitive)) {
        this._voxelPrimitive = voxelPrimitive;

        const that = this;
        that._voxelPrimitive.readyPromise.then(function () {
          that._customShaderCompilationRemoveCallback = that._voxelPrimitive.customShaderCompilationEvent.addEventListener(
            function (error) {
              const shaderString =
                that._voxelPrimitive.customShader.fragmentShaderText;
              that.shaderString = formatShaderString(shaderString);

              if (!defined(error)) {
                that.shaderCompilationMessage = "Shader compiled successfully!";
                that.shaderCompilationSuccess = true;
              } else {
                that.shaderCompilationMessage = error.message;
                that.shaderCompilationSuccess = false;
              }
            }
          );
          for (let i = 0; i < that._getPrimitiveFunctions.length; i++) {
            that._getPrimitiveFunctions[i]();
          }
        });
      }
    },
  },
});

/**
 * Compiles the shader in the shader editor.
 * @private
 */
VoxelInspectorViewModel.prototype.compileShader = function () {
  if (defined(this._voxelPrimitive)) {
    // It's assumed that the same uniforms are going to be used regardless of edits.
    this._voxelPrimitive.customShader = new CustomShader({
      fragmentShaderText: this.shaderString,
      uniforms: this._voxelPrimitive.customShader.uniforms,
    });
  }
};

/**
 * Handles key press events on the shader editor.
 * @private
 */
VoxelInspectorViewModel.prototype.shaderEditorKeyPress = function (
  sender,
  event
) {
  if (event.keyCode === 9) {
    //tab
    event.preventDefault();
    const textArea = event.target;
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    let newEnd = end;
    const selected = textArea.value.slice(start, end);
    const lines = selected.split("\n");
    const length = lines.length;
    let i;
    if (!event.shiftKey) {
      for (i = 0; i < length; ++i) {
        lines[i] = `  ${lines[i]}`;
        newEnd += 2;
      }
    } else {
      for (i = 0; i < length; ++i) {
        if (lines[i][0] === " ") {
          if (lines[i][1] === " ") {
            lines[i] = lines[i].substr(2);
            newEnd -= 2;
          } else {
            lines[i] = lines[i].substr(1);
            newEnd -= 1;
          }
        }
      }
    }
    const newText = lines.join("\n");
    textArea.value =
      textArea.value.slice(0, start) + newText + textArea.value.slice(end);
    textArea.selectionStart = start !== end ? start : newEnd;
    textArea.selectionEnd = newEnd;
  } else if (event.ctrlKey && (event.keyCode === 10 || event.keyCode === 13)) {
    //ctrl + enter
    this.compileShader();
  }
  return true;
};

/**
 * @returns {Boolean} true if the object has been destroyed, false otherwise.
 */
VoxelInspectorViewModel.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
VoxelInspectorViewModel.prototype.destroy = function () {
  const that = this;
  this._definedProperties.forEach(function (property) {
    knockout.getObservable(that, property).dispose();
  });

  return destroyObject(this);
};

export default VoxelInspectorViewModel;
