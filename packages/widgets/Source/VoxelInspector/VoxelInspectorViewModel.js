import {
  Cartesian3,
  Check,
  defined,
  destroyObject,
  HeadingPitchRoll,
  Matrix3,
  Matrix4,
  CustomShader,
  VoxelShapeType,
} from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";

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
  this._modelMatrixReady = false;

  const that = this;
  function addProperty(options) {
    const { name, initialValue } = options;

    that._definedProperties.push(name);

    let setPrimitiveFunction = options.setPrimitiveFunction;
    if (setPrimitiveFunction === true) {
      setPrimitiveFunction = function (value) {
        that._voxelPrimitive[name] = value;
      };
    }

    let getPrimitiveFunction = options.getPrimitiveFunction;
    if (getPrimitiveFunction === true) {
      getPrimitiveFunction = function () {
        that[name] = that._voxelPrimitive[name];
      };
    }
    if (defined(getPrimitiveFunction)) {
      that._getPrimitiveFunctions.push(getPrimitiveFunction);
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

    that[name] = initialValue;

    return knock;
  }

  function getBoundSetter(boundKey, component) {
    return function (value) {
      const bound = that._voxelPrimitive[boundKey].clone();
      bound[component] = value;
      that._voxelPrimitive[boundKey] = bound;
    };
  }

  addProperty({
    name: "inspectorVisible",
    initialValue: true,
  });

  addProperty({
    name: "displayVisible",
    initialValue: false,
  });

  addProperty({
    name: "transformVisible",
    initialValue: false,
  });

  addProperty({
    name: "boundsVisible",
    initialValue: false,
  });

  addProperty({
    name: "clippingVisible",
    initialValue: false,
  });

  addProperty({
    name: "shaderVisible",
    initialValue: false,
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
    setPrimitiveFunction: getBoundSetter("maxBounds", "x"),
    getPrimitiveFunction: function () {
      that.boundsBoxMaxX = that._voxelPrimitive.maxBounds.x;
    },
  });
  addProperty({
    name: "boundsBoxMinX",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "x"),
    getPrimitiveFunction: function () {
      that.boundsBoxMinX = that._voxelPrimitive.minBounds.x;
    },
  });
  addProperty({
    name: "boundsBoxMaxY",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "y"),
    getPrimitiveFunction: function () {
      that.boundsBoxMaxY = that._voxelPrimitive.maxBounds.y;
    },
  });
  addProperty({
    name: "boundsBoxMinY",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "y"),
    getPrimitiveFunction: function () {
      that.boundsBoxMinY = that._voxelPrimitive.minBounds.y;
    },
  });
  addProperty({
    name: "boundsBoxMaxZ",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "z"),
    getPrimitiveFunction: function () {
      that.boundsBoxMaxZ = that._voxelPrimitive.maxBounds.z;
    },
  });
  addProperty({
    name: "boundsBoxMinZ",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "z"),
    getPrimitiveFunction: function () {
      that.boundsBoxMinZ = that._voxelPrimitive.minBounds.z;
    },
  });
  addProperty({
    name: "boundsEllipsoidMaxLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "x"),
    getPrimitiveFunction: function () {
      that.boundsEllipsoidMaxLongitude = that._voxelPrimitive.maxBounds.x;
    },
  });
  addProperty({
    name: "boundsEllipsoidMinLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "x"),
    getPrimitiveFunction: function () {
      that.boundsEllipsoidMinLongitude = that._voxelPrimitive.minBounds.x;
    },
  });
  addProperty({
    name: "boundsEllipsoidMaxLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "y"),
    getPrimitiveFunction: function () {
      that.boundsEllipsoidMaxLatitude = that._voxelPrimitive.maxBounds.y;
    },
  });
  addProperty({
    name: "boundsEllipsoidMinLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "y"),
    getPrimitiveFunction: function () {
      that.boundsEllipsoidMinLatitude = that._voxelPrimitive.minBounds.y;
    },
  });
  addProperty({
    name: "boundsEllipsoidMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "z"),
    getPrimitiveFunction: function () {
      that.boundsEllipsoidMaxHeight = that._voxelPrimitive.maxBounds.z;
    },
  });
  addProperty({
    name: "boundsEllipsoidMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "z"),
    getPrimitiveFunction: function () {
      that.boundsEllipsoidMinHeight = that._voxelPrimitive.minBounds.z;
    },
  });
  addProperty({
    name: "boundsCylinderMaxRadius",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "x"),
    getPrimitiveFunction: function () {
      that.boundsCylinderMaxRadius = that._voxelPrimitive.maxBounds.x;
    },
  });
  addProperty({
    name: "boundsCylinderMinRadius",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "x"),
    getPrimitiveFunction: function () {
      that.boundsCylinderMinRadius = that._voxelPrimitive.minBounds.x;
    },
  });
  addProperty({
    name: "boundsCylinderMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "y"),
    getPrimitiveFunction: function () {
      that.boundsCylinderMaxHeight = that._voxelPrimitive.maxBounds.y;
    },
  });
  addProperty({
    name: "boundsCylinderMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "y"),
    getPrimitiveFunction: function () {
      that.boundsCylinderMinHeight = that._voxelPrimitive.minBounds.y;
    },
  });
  addProperty({
    name: "boundsCylinderMaxAngle",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxBounds", "z"),
    getPrimitiveFunction: function () {
      that.boundsCylinderMaxAngle = that._voxelPrimitive.maxBounds.z;
    },
  });
  addProperty({
    name: "boundsCylinderMinAngle",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minBounds", "z"),
    getPrimitiveFunction: function () {
      that.boundsCylinderMinAngle = that._voxelPrimitive.minBounds.z;
    },
  });
  addProperty({
    name: "clippingBoxMaxX",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "x"),
    getPrimitiveFunction: function () {
      that.clippingBoxMaxX = that._voxelPrimitive.maxClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingBoxMinX",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "x"),
    getPrimitiveFunction: function () {
      that.clippingBoxMinX = that._voxelPrimitive.minClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingBoxMaxY",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "y"),
    getPrimitiveFunction: function () {
      that.clippingBoxMaxY = that._voxelPrimitive.maxClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingBoxMinY",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "y"),
    getPrimitiveFunction: function () {
      that.clippingBoxMinY = that._voxelPrimitive.minClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingBoxMaxZ",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "z"),
    getPrimitiveFunction: function () {
      that.clippingBoxMaxZ = that._voxelPrimitive.maxClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingBoxMinZ",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "z"),
    getPrimitiveFunction: function () {
      that.clippingBoxMinZ = that._voxelPrimitive.minClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingEllipsoidMaxLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "x"),
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMaxLongitude =
        that._voxelPrimitive.maxClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingEllipsoidMinLongitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "x"),
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMinLongitude =
        that._voxelPrimitive.minClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingEllipsoidMaxLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "y"),
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMaxLatitude =
        that._voxelPrimitive.maxClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingEllipsoidMinLatitude",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "y"),
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMinLatitude =
        that._voxelPrimitive.minClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingEllipsoidMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "z"),
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMaxHeight =
        that._voxelPrimitive.maxClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingEllipsoidMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "z"),
    getPrimitiveFunction: function () {
      that.clippingEllipsoidMinHeight =
        that._voxelPrimitive.minClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingCylinderMaxRadius",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "x"),
    getPrimitiveFunction: function () {
      that.clippingCylinderMaxRadius = that._voxelPrimitive.maxClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingCylinderMinRadius",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "x"),
    getPrimitiveFunction: function () {
      that.clippingCylinderMinRadius = that._voxelPrimitive.minClippingBounds.x;
    },
  });
  addProperty({
    name: "clippingCylinderMaxHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "y"),
    getPrimitiveFunction: function () {
      that.clippingCylinderMaxHeight = that._voxelPrimitive.maxClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingCylinderMinHeight",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "y"),
    getPrimitiveFunction: function () {
      that.clippingCylinderMinHeight = that._voxelPrimitive.minClippingBounds.y;
    },
  });
  addProperty({
    name: "clippingCylinderMaxAngle",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("maxClippingBounds", "z"),
    getPrimitiveFunction: function () {
      that.clippingCylinderMaxAngle = that._voxelPrimitive.maxClippingBounds.z;
    },
  });
  addProperty({
    name: "clippingCylinderMinAngle",
    initialValue: 0.0,
    setPrimitiveFunction: getBoundSetter("minClippingBounds", "z"),
    getPrimitiveFunction: function () {
      that.clippingCylinderMinAngle = that._voxelPrimitive.minClippingBounds.z;
    },
  });

  addProperty({
    name: "translationX",
    initialValue: 0.0,
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
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
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
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
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
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
    initialValue: 1.0,
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
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
    initialValue: 1.0,
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
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
    initialValue: 1.0,
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
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
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
    },
  });

  addProperty({
    name: "angleY",
    initialValue: 0.0,
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
    },
  });

  addProperty({
    name: "angleZ",
    initialValue: 0.0,
    setPrimitiveFunction: function () {
      if (that._modelMatrixReady) {
        setModelMatrix(that);
      }
    },
  });
}

const scratchTranslation = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchHeadingPitchRoll = new HeadingPitchRoll();
const scratchRotation = new Matrix3();

function setModelMatrix(viewModel) {
  const translation = Cartesian3.fromElements(
    viewModel.translationX,
    viewModel.translationY,
    viewModel.translationZ,
    scratchTranslation
  );
  const scale = Cartesian3.fromElements(
    viewModel.scaleX,
    viewModel.scaleY,
    viewModel.scaleZ,
    scratchScale
  );
  const hpr = scratchHeadingPitchRoll;
  hpr.heading = viewModel.angleX;
  hpr.pitch = viewModel.angleY;
  hpr.roll = viewModel.angleZ;
  const rotation = Matrix3.fromHeadingPitchRoll(hpr, scratchRotation);
  const rotationScale = Matrix3.multiplyByScale(rotation, scale, rotation);
  viewModel._voxelPrimitive.modelMatrix = Matrix4.fromRotationTranslation(
    rotationScale,
    translation,
    viewModel._voxelPrimitive.modelMatrix
  );
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
        that._modelMatrixReady = false;
        for (let i = 0; i < that._getPrimitiveFunctions.length; i++) {
          that._getPrimitiveFunctions[i]();
        }
        that._modelMatrixReady = true;
        setModelMatrix(that);
      }
    },
  },
});

/**
 * Toggles the inspector visibility
 */
VoxelInspectorViewModel.prototype.toggleInspector = function () {
  this.inspectorVisible = !this.inspectorVisible;
};

/**
 * Toggles the visibility of the display section
 */
VoxelInspectorViewModel.prototype.toggleDisplay = function () {
  this.displayVisible = !this.displayVisible;
};

/**
 * Toggles the visibility of the transform section
 */
VoxelInspectorViewModel.prototype.toggleTransform = function () {
  this.transformVisible = !this.transformVisible;
};

/**
 * Toggles the visibility of the bounds section
 */
VoxelInspectorViewModel.prototype.toggleBounds = function () {
  this.boundsVisible = !this.boundsVisible;
};

/**
 * Toggles the visibility of the clipping section
 */
VoxelInspectorViewModel.prototype.toggleClipping = function () {
  this.clippingVisible = !this.clippingVisible;
};

/**
 * Toggles the visibility of the shader section
 */
VoxelInspectorViewModel.prototype.toggleShader = function () {
  this.shaderVisible = !this.shaderVisible;
};

/**
 * Compiles the shader in the shader editor.
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
 * @returns {boolean} true if the object has been destroyed, false otherwise.
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
