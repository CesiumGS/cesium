import {
  Math as CesiumMath,
  Check,
  CustomShader,
  defined,
  destroyObject,
  getElement,
  PixelDatatype,
  PixelFormat,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  TextureUniform,
  UniformType,
} from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";
import InspectorShared from "../InspectorShared.js";
import VoxelInspectorViewModel from "./VoxelInspectorViewModel.js";

/**
 * Inspector widget to aid in debugging voxels
 *
 * @alias VoxelInspector
 * @constructor
 *
 * @param {Element|string} container The DOM element or ID that will contain the widget.
 * @param {Scene} scene the Scene instance to use.
 */
function VoxelInspector(container, scene) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("container", container);
  Check.typeOf.object("scene", scene);
  //>>includeEnd('debug');

  container = getElement(container);
  const element = document.createElement("div");
  const viewModel = new VoxelInspectorViewModel(scene);

  this._viewModel = viewModel;
  this._container = container;
  this._element = element;

  const text = document.createElement("div");
  text.textContent = "Voxel Inspector";
  text.className = "cesium-cesiumInspector-button";
  text.setAttribute("data-bind", "click: toggleInspector");
  element.appendChild(text);
  element.className = "cesium-cesiumInspector cesium-VoxelInspector";
  element.setAttribute(
    "data-bind",
    'css: { "cesium-cesiumInspector-visible" : inspectorVisible, "cesium-cesiumInspector-hidden" : !inspectorVisible}',
  );
  container.appendChild(element);

  const panel = document.createElement("div");
  panel.className = "cesium-cesiumInspector-dropDown";
  element.appendChild(panel);

  const { createSection, createCheckbox, createRangeInput, createButton } =
    InspectorShared;

  const displayPanelContents = createSection(
    panel,
    "Display",
    "displayVisible",
    "toggleDisplay",
  );

  const transformPanelContents = createSection(
    panel,
    "Transform",
    "transformVisible",
    "toggleTransform",
  );

  const clippingPanelContents = createSection(
    panel,
    "Clipping",
    "clippingVisible",
    "toggleClipping",
  );

  const shaderPanelContents = createSection(
    panel,
    "Shader",
    "shaderVisible",
    "toggleShader",
  );

  // Display
  displayPanelContents.appendChild(createCheckbox("Depth Test", "depthTest"));
  displayPanelContents.appendChild(createCheckbox("Show", "show"));
  displayPanelContents.appendChild(
    createCheckbox("Disable Update", "disableUpdate"),
  );
  displayPanelContents.appendChild(createCheckbox("Debug Draw", "debugDraw"));
  displayPanelContents.appendChild(createCheckbox("Jitter", "jitter"));
  displayPanelContents.appendChild(
    createCheckbox("Nearest Sampling", "nearestSampling"),
  );

  displayPanelContents.appendChild(
    createRangeInput("Screen Space Error", "screenSpaceError", 0, 128),
  );

  displayPanelContents.appendChild(
    createRangeInput("Step Size", "stepSize", 0.0, 2.0),
  );

  // Transform
  const maxTrans = 10.0;
  const maxScale = 10.0;
  const maxAngle = CesiumMath.PI;

  transformPanelContents.appendChild(
    createRangeInput("Translation X", "translationX", -maxTrans, +maxTrans),
  );
  transformPanelContents.appendChild(
    createRangeInput("Translation Y", "translationY", -maxTrans, +maxTrans),
  );
  transformPanelContents.appendChild(
    createRangeInput("Translation Z", "translationZ", -maxTrans, +maxTrans),
  );
  transformPanelContents.appendChild(
    createRangeInput("Scale X", "scaleX", 0, +maxScale),
  );
  transformPanelContents.appendChild(
    createRangeInput("Scale Y", "scaleY", 0, +maxScale),
  );
  transformPanelContents.appendChild(
    createRangeInput("Scale Z", "scaleZ", 0, +maxScale),
  );
  transformPanelContents.appendChild(
    createRangeInput("Heading", "angleX", -maxAngle, +maxAngle),
  );
  transformPanelContents.appendChild(
    createRangeInput("Pitch", "angleY", -maxAngle, +maxAngle),
  );
  transformPanelContents.appendChild(
    createRangeInput("Roll", "angleZ", -maxAngle, +maxAngle),
  );

  // Clipping
  makeCoordinateRangeWithDynamicMinMax(
    "Max X",
    "Min X",
    "Max Y",
    "Min Y",
    "Max Z",
    "Min Z",
    "clippingBoxMaxX",
    "clippingBoxMinX",
    "clippingBoxMaxY",
    "clippingBoxMinY",
    "clippingBoxMaxZ",
    "clippingBoxMinZ",
    "shapeIsBox",
    clippingPanelContents,
  );

  makeCoordinateRangeWithDynamicMinMax(
    "Max Longitude",
    "Min Longitude",
    "Max Latitude",
    "Min Latitude",
    "Max Height",
    "Min Height",
    "clippingEllipsoidMaxLongitude",
    "clippingEllipsoidMinLongitude",
    "clippingEllipsoidMaxLatitude",
    "clippingEllipsoidMinLatitude",
    "clippingEllipsoidMaxHeight",
    "clippingEllipsoidMinHeight",
    "shapeIsEllipsoid",
    clippingPanelContents,
  );

  makeCoordinateRangeWithDynamicMinMax(
    "Max Radius",
    "Min Radius",
    "Max Angle",
    "Min Angle",
    "Max Height",
    "Min Height",
    "clippingCylinderMaxRadius",
    "clippingCylinderMinRadius",
    "clippingCylinderMaxAngle",
    "clippingCylinderMinAngle",
    "clippingCylinderMaxHeight",
    "clippingCylinderMinHeight",
    "shapeIsCylinder",
    clippingPanelContents,
  );

  // Shader
  const shaderPanelEditor = document.createElement("div");
  shaderPanelContents.appendChild(shaderPanelEditor);

  const shaderEditor = document.createElement("textarea");
  shaderEditor.setAttribute(
    "data-bind",
    "textInput: shaderString, event: { keydown: shaderEditorKeyPress }",
  );
  shaderPanelEditor.className = "cesium-cesiumInspector-styleEditor";
  shaderPanelEditor.appendChild(shaderEditor);
  const compileShaderButton = createButton(
    "Compile (Ctrl+Enter)",
    "compileShader",
  );
  shaderPanelEditor.appendChild(compileShaderButton);

  const compilationText = document.createElement("label");
  compilationText.style.display = "block";
  compilationText.setAttribute(
    "data-bind",
    "text: shaderCompilationMessage, style: {color: shaderCompilationSuccess ? 'green' : 'red'}",
  );
  shaderPanelEditor.appendChild(compilationText);

  // Transfer Function
  const transferFunctionPanelContents = createSection(
    panel,
    "Transfer Function",
    "transferFunctionVisible",
    "toggleTransferFunction",
  );

  const transferCanvas = document.createElement("canvas");
  transferCanvas.className = "cesium-VoxelInspector-transferFunctionCanvas";
  transferCanvas.width = 256;
  transferCanvas.height = 100;
  transferFunctionPanelContents.appendChild(transferCanvas);

  const tfCtx = transferCanvas.getContext("2d");
  const tfW = transferCanvas.width;
  const tfH = transferCanvas.height;

  // Points are stored in normalized [0,1] x [0,1] space (x = input, y = output).
  // Start with the identity line: bottom-left to top-right.
  const tfPoints = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ];

  const TF_POINT_RADIUS = 4;
  const TF_HIT_RADIUS = 8;

  // Evaluate the TF polyline at position t in [0,1] by linear interpolation.
  function sampleTfPolyline(points, t) {
    if (points.length === 0) {
      return 0;
    }
    if (t <= points[0].x) {
      return points[0].y;
    }
    if (t >= points[points.length - 1].x) {
      return points[points.length - 1].y;
    }
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      if (t >= p0.x && t <= p1.x) {
        const u = p1.x === p0.x ? 0 : (t - p0.x) / (p1.x - p0.x);
        return p0.y + u * (p1.y - p0.y);
      }
    }
    return 0;
  }

  // Build a 256×1 RGBA TextureUniform from the current TF polyline.
  function buildTfTextureUniform(points) {
    const size = 256;
    const data = new Uint8Array(size * 4);
    for (let i = 0; i < size; i++) {
      const t = i / (size - 1);
      const alpha = Math.round(sampleTfPolyline(points, t) * 255);
      data[i * 4 + 0] = 255;
      data[i * 4 + 1] = 255;
      data[i * 4 + 2] = 255;
      data[i * 4 + 3] = alpha;
    }
    return new TextureUniform({
      typedArray: data,
      width: size,
      height: 1,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      repeat: false,
      minificationFilter: TextureMinificationFilter.LINEAR,
      magnificationFilter: TextureMagnificationFilter.LINEAR,
    });
  }

  const TF_UNIFORM = "u_transferFunction";
  const TF_FRAGMENT_SHADER = `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
{
    material.diffuse = fsInput.metadata.color.rgb;
    float rawScalar = fsInput.metadata.color.a;
    float scalar = clamp((rawScalar - u_tfMin) / max(u_tfMax - u_tfMin, 0.0001), 0.0, 1.0);
    float tfAlpha = texture(u_transferFunction, vec2(scalar, 0.5)).a;
    material.alpha = tfAlpha;
}`;

  // Tracks the data range read from the provider for the TF scalar channel.
  let tfDataMin = 0.0;
  let tfDataMax = 1.0;

  // Read the min/max of the scalar channel (last component of attribute 0) from the provider.
  function refreshDataRange() {
    const primitive = viewModel.voxelPrimitive;
    if (!defined(primitive)) {
      tfDataMin = 0.0;
      tfDataMax = 1.0;
      return;
    }
    const provider = primitive.provider;
    const minVals = provider.minimumValues;
    const maxVals = provider.maximumValues;
    if (
      defined(minVals) &&
      defined(maxVals) &&
      minVals.length > 0 &&
      defined(minVals[0]) &&
      defined(maxVals[0])
    ) {
      const attr0Min = minVals[0];
      const attr0Max = maxVals[0];
      // Use the last component (alpha for VEC4, the only component for SCALAR)
      const compIdx = attr0Min.length - 1;
      const lo = attr0Min[compIdx];
      const hi = attr0Max[compIdx];
      if (defined(lo) && defined(hi) && hi > lo) {
        tfDataMin = lo;
        tfDataMax = hi;
        return;
      }
    }
    tfDataMin = 0.0;
    tfDataMax = 1.0;
  }

  // Update the voxel primitive's custom shader to use the current TF.
  // If the shader already has u_transferFunction, only updates uniforms (no recompile).
  // Otherwise creates a new CustomShader that drives opacity via the TF.
  function applyTransferFunction() {
    const primitive = viewModel.voxelPrimitive;
    if (!defined(primitive)) {
      return;
    }
    refreshDataRange();
    const texUniform = buildTfTextureUniform(tfPoints);
    const existingShader = primitive.customShader;
    if (
      defined(existingShader) &&
      defined(existingShader.uniforms[TF_UNIFORM])
    ) {
      existingShader.setUniform(TF_UNIFORM, texUniform);
      existingShader.setUniform("u_tfMin", tfDataMin);
      existingShader.setUniform("u_tfMax", tfDataMax);
    } else {
      primitive.customShader = new CustomShader({
        uniforms: {
          [TF_UNIFORM]: {
            type: UniformType.SAMPLER_2D,
            value: texUniform,
          },
          u_tfMin: {
            type: UniformType.FLOAT,
            value: tfDataMin,
          },
          u_tfMax: {
            type: UniformType.FLOAT,
            value: tfDataMax,
          },
        },
        fragmentShaderText: TF_FRAGMENT_SHADER,
      });
    }
    drawTransferFunction();
  }

  function drawTransferFunction() {
    tfCtx.clearRect(0, 0, tfW, tfH);

    if (tfPoints.length === 0) {
      return;
    }

    // Draw the polyline
    tfCtx.strokeStyle = "white";
    tfCtx.lineWidth = 2;
    tfCtx.beginPath();
    tfPoints.forEach(function (pt, i) {
      const px = pt.x * (tfW - 1);
      const py = (1 - pt.y) * (tfH - 1);
      if (i === 0) {
        tfCtx.moveTo(px, py);
      } else {
        tfCtx.lineTo(px, py);
      }
    });
    tfCtx.stroke();

    // Draw the control points
    tfCtx.fillStyle = "white";
    tfPoints.forEach(function (pt) {
      const px = pt.x * (tfW - 1);
      const py = (1 - pt.y) * (tfH - 1);
      tfCtx.beginPath();
      tfCtx.arc(px, py, TF_POINT_RADIUS, 0, Math.PI * 2);
      tfCtx.fill();
    });

    // Draw x-axis range labels
    tfCtx.font = "9px monospace";
    tfCtx.fillStyle = "rgba(180,180,180,0.9)";
    tfCtx.textBaseline = "bottom";
    tfCtx.textAlign = "left";
    tfCtx.fillText(tfDataMin.toPrecision(3), 2, tfH);
    tfCtx.textAlign = "right";
    tfCtx.fillText(tfDataMax.toPrecision(3), tfW - 2, tfH);
  }

  function getCanvasPos(event) {
    const rect = transferCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (tfW / rect.width),
      y: (event.clientY - rect.top) * (tfH / rect.height),
    };
  }

  function canvasPosToNorm(pos) {
    return {
      x: Math.max(0, Math.min(1, pos.x / (tfW - 1))),
      y: Math.max(0, Math.min(1, 1 - pos.y / (tfH - 1))),
    };
  }

  function findNearestPointIndex(pos) {
    let nearest = -1;
    let minDist = TF_HIT_RADIUS * TF_HIT_RADIUS;
    tfPoints.forEach(function (pt, i) {
      const px = pt.x * (tfW - 1);
      const py = (1 - pt.y) * (tfH - 1);
      const dx = pos.x - px;
      const dy = pos.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist) {
        minDist = d2;
        nearest = i;
      }
    });
    return nearest;
  }

  let tfDragIndex = -1;
  let tfDidDrag = false;

  transferCanvas.addEventListener("mousedown", function (event) {
    if (event.button !== 0) {
      return;
    }
    const pos = getCanvasPos(event);
    const idx = findNearestPointIndex(pos);
    if (idx !== -1) {
      tfDragIndex = idx;
      tfDidDrag = false;
      event.preventDefault();
    }
  });

  window.addEventListener("mousemove", function (event) {
    if (tfDragIndex === -1) {
      return;
    }
    tfDidDrag = true;
    const pos = getCanvasPos(event);
    const norm = canvasPosToNorm(pos);
    tfPoints[tfDragIndex].x = norm.x;
    tfPoints[tfDragIndex].y = norm.y;
    // Re-sort and update drag index to follow the point
    const pt = tfPoints[tfDragIndex];
    tfPoints.sort(function (a, b) {
      return a.x - b.x;
    });
    tfDragIndex = tfPoints.indexOf(pt);
    drawTransferFunction();
    applyTransferFunction();
  });

  window.addEventListener("mouseup", function (event) {
    if (event.button === 0 && tfDragIndex !== -1) {
      tfDragIndex = -1;
      applyTransferFunction();
    }
  });

  transferCanvas.addEventListener("click", function (event) {
    // Suppress point insertion when the mousedown was a drag
    if (tfDidDrag) {
      tfDidDrag = false;
      return;
    }
    const pos = getCanvasPos(event);
    // If clicking near an existing point, don't add a duplicate
    if (findNearestPointIndex(pos) !== -1) {
      return;
    }
    const norm = canvasPosToNorm(pos);
    tfPoints.push(norm);
    // Keep sorted by x so the polyline is well-ordered
    tfPoints.sort(function (a, b) {
      return a.x - b.x;
    });
    drawTransferFunction();
    applyTransferFunction();
  });

  transferCanvas.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    const pos = getCanvasPos(event);
    const idx = findNearestPointIndex(pos);
    if (idx !== -1) {
      tfPoints.splice(idx, 1);
      drawTransferFunction();
      applyTransferFunction();
    }
  });

  drawTransferFunction();

  // Shader code display
  const tfShaderLabel = document.createElement("label");
  tfShaderLabel.textContent = "Fragment shader:";
  tfShaderLabel.style.display = "block";
  tfShaderLabel.style.marginTop = "6px";
  transferFunctionPanelContents.appendChild(tfShaderLabel);

  const tfShaderDisplay = document.createElement("pre");
  tfShaderDisplay.className = "cesium-VoxelInspector-tfShaderCode";
  tfShaderDisplay.textContent = TF_FRAGMENT_SHADER;
  transferFunctionPanelContents.appendChild(tfShaderDisplay);

  knockout.applyBindings(viewModel, element);
}

Object.defineProperties(VoxelInspector.prototype, {
  /**
   * Gets the parent container.
   * @memberof VoxelInspector.prototype
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
   * @memberof VoxelInspector.prototype
   *
   * @type {VoxelInspectorViewModel}
   */
  viewModel: {
    get: function () {
      return this._viewModel;
    },
  },
});

/**
 * @returns {boolean} true if the object has been destroyed, false otherwise.
 */
VoxelInspector.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the widget.  Should be called if permanently
 * removing the widget from layout.
 */
VoxelInspector.prototype.destroy = function () {
  knockout.cleanNode(this._element);
  this._container.removeChild(this._element);
  this.viewModel.destroy();

  return destroyObject(this);
};

function makeCoordinateRangeWithDynamicMinMax(
  maxXTitle,
  minXTitle,
  maxYTitle,
  minYTitle,
  maxZTitle,
  minZTitle,
  maxXVar,
  minXVar,
  maxYVar,
  minYVar,
  maxZVar,
  minZVar,
  allowedShape,
  parentContainer,
) {
  const createRangeInput = InspectorShared.createRangeInputWithDynamicMinMax;

  const boundsElement = parentContainer.appendChild(
    document.createElement("div"),
  );
  boundsElement.setAttribute("data-bind", `if: ${allowedShape}`);
  boundsElement.appendChild(createRangeInput(maxXTitle, maxXVar));
  boundsElement.appendChild(createRangeInput(minXTitle, minXVar));
  boundsElement.appendChild(createRangeInput(maxYTitle, maxYVar));
  boundsElement.appendChild(createRangeInput(minYTitle, minYVar));
  boundsElement.appendChild(createRangeInput(maxZTitle, maxZVar));
  boundsElement.appendChild(createRangeInput(minZTitle, minZVar));
}

export default VoxelInspector;
