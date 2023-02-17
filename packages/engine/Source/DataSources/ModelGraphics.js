import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";
import NodeTransformationProperty from "./NodeTransformationProperty.js";
import PropertyBag from "./PropertyBag.js";

function createNodeTransformationProperty(value) {
  return new NodeTransformationProperty(value);
}

function createNodeTransformationPropertyBag(value) {
  return new PropertyBag(value, createNodeTransformationProperty);
}

function createArticulationStagePropertyBag(value) {
  return new PropertyBag(value);
}

/**
 * @typedef {object} ModelGraphics.ConstructorOptions
 *
 * Initialization options for the ModelGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the model.
 * @property {Property | string | Resource} [uri] A string or Resource Property specifying the URI of the glTF asset.
 * @property {Property | number} [scale=1.0] A numeric Property specifying a uniform linear scale.
 * @property {Property | number} [minimumPixelSize=0.0] A numeric Property specifying the approximate minimum pixel size of the model regardless of zoom.
 * @property {Property | number} [maximumScale] The maximum scale size of a model. An upper limit for minimumPixelSize.
 * @property {Property | boolean} [incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @property {Property | boolean} [runAnimations=true] A boolean Property specifying if glTF animations specified in the model should be started.
 * @property {Property | boolean} [clampAnimations=true] A boolean Property specifying if glTF animations should hold the last pose for time durations with no keyframes.
 * @property {Property | ShadowMode} [shadows=ShadowMode.ENABLED] An enum Property specifying whether the model casts or receives shadows from light sources.
 * @property {Property | HeightReference} [heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
 * @property {Property | Color} [silhouetteColor=Color.RED] A Property specifying the {@link Color} of the silhouette.
 * @property {Property | number} [silhouetteSize=0.0] A numeric Property specifying the size of the silhouette in pixels.
 * @property {Property | Color} [color=Color.WHITE] A Property specifying the {@link Color} that blends with the model's rendered color.
 * @property {Property | ColorBlendMode} [colorBlendMode=ColorBlendMode.HIGHLIGHT] An enum Property specifying how the color blends with the model.
 * @property {Property | number} [colorBlendAmount=0.5] A numeric Property specifying the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @property {Property | Cartesian2} [imageBasedLightingFactor=new Cartesian2(1.0, 1.0)] A property specifying the contribution from diffuse and specular image-based lighting.
 * @property {Property | Color} [lightColor] A property specifying the light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this model will be displayed.
 * @property {PropertyBag | Object<string, TranslationRotationScale>} [nodeTransformations] An object, where keys are names of nodes, and values are {@link TranslationRotationScale} Properties describing the transformation to apply to that node. The transformation is applied after the node's existing transformation as specified in the glTF, and does not replace the node's existing transformation.
 * @property {PropertyBag | Object<string, number>} [articulations] An object, where keys are composed of an articulation name, a single space, and a stage name, and the values are numeric properties.
 * @property {Property | ClippingPlaneCollection} [clippingPlanes] A property specifying the {@link ClippingPlaneCollection} used to selectively disable rendering the model.
 * @property {Property | CustomShader} [customShader] A property specifying the {@link CustomShader} to apply to this model.
 */

/**
 * A 3D model based on {@link https://github.com/KhronosGroup/glTF|glTF}, the runtime asset format for WebGL, OpenGL ES, and OpenGL.
 * The position and orientation of the model is determined by the containing {@link Entity}.
 * <p>
 * Cesium includes support for glTF geometry, materials, animations, and skinning.
 * Cameras and lights are not currently supported.
 * </p>
 *
 * @alias ModelGraphics
 * @constructor
 *
 * @param {ModelGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=3D%20Models.html|Cesium Sandcastle 3D Models Demo}
 */
function ModelGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._uri = undefined;
  this._uriSubscription = undefined;
  this._scale = undefined;
  this._scaleSubscription = undefined;
  this._minimumPixelSize = undefined;
  this._minimumPixelSizeSubscription = undefined;
  this._maximumScale = undefined;
  this._maximumScaleSubscription = undefined;
  this._incrementallyLoadTextures = undefined;
  this._incrementallyLoadTexturesSubscription = undefined;
  this._runAnimations = undefined;
  this._runAnimationsSubscription = undefined;
  this._clampAnimations = undefined;
  this._clampAnimationsSubscription = undefined;
  this._shadows = undefined;
  this._shadowsSubscription = undefined;
  this._heightReference = undefined;
  this._heightReferenceSubscription = undefined;
  this._silhouetteColor = undefined;
  this._silhouetteColorSubscription = undefined;
  this._silhouetteSize = undefined;
  this._silhouetteSizeSubscription = undefined;
  this._color = undefined;
  this._colorSubscription = undefined;
  this._colorBlendMode = undefined;
  this._colorBlendModeSubscription = undefined;
  this._colorBlendAmount = undefined;
  this._colorBlendAmountSubscription = undefined;
  this._imageBasedLightingFactor = undefined;
  this._imageBasedLightingFactorSubscription = undefined;
  this._lightColor = undefined;
  this._lightColorSubscription = undefined;
  this._distanceDisplayCondition = undefined;
  this._distanceDisplayConditionSubscription = undefined;
  this._nodeTransformations = undefined;
  this._nodeTransformationsSubscription = undefined;
  this._articulations = undefined;
  this._articulationsSubscription = undefined;
  this._clippingPlanes = undefined;
  this._clippingPlanesSubscription = undefined;
  this._customShader = undefined;
  this._customShaderSubscription = undefined;

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(ModelGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof ModelGraphics.prototype
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },

  /**
   * Gets or sets the boolean Property specifying the visibility of the model.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the string Property specifying the URI of the glTF asset.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  uri: createPropertyDescriptor("uri"),

  /**
   * Gets or sets the numeric Property specifying a uniform linear scale
   * for this model. Values greater than 1.0 increase the size of the model while
   * values less than 1.0 decrease it.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  scale: createPropertyDescriptor("scale"),

  /**
   * Gets or sets the numeric Property specifying the approximate minimum
   * pixel size of the model regardless of zoom. This can be used to ensure that
   * a model is visible even when the viewer zooms out.  When <code>0.0</code>,
   * no minimum size is enforced.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default 0.0
   */
  minimumPixelSize: createPropertyDescriptor("minimumPixelSize"),

  /**
   * Gets or sets the numeric Property specifying the maximum scale
   * size of a model. This property is used as an upper limit for
   * {@link ModelGraphics#minimumPixelSize}.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  maximumScale: createPropertyDescriptor("maximumScale"),

  /**
   * Get or sets the boolean Property specifying whether textures
   * may continue to stream in after the model is loaded.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  incrementallyLoadTextures: createPropertyDescriptor(
    "incrementallyLoadTextures"
  ),

  /**
   * Gets or sets the boolean Property specifying if glTF animations should be run.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  runAnimations: createPropertyDescriptor("runAnimations"),

  /**
   * Gets or sets the boolean Property specifying if glTF animations should hold the last pose for time durations with no keyframes.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  clampAnimations: createPropertyDescriptor("clampAnimations"),

  /**
   * Get or sets the enum Property specifying whether the model
   * casts or receives shadows from light sources.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default ShadowMode.ENABLED
   */
  shadows: createPropertyDescriptor("shadows"),

  /**
   * Gets or sets the Property specifying the {@link HeightReference}.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  heightReference: createPropertyDescriptor("heightReference"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the silhouette.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default Color.RED
   */
  silhouetteColor: createPropertyDescriptor("silhouetteColor"),

  /**
   * Gets or sets the numeric Property specifying the size of the silhouette in pixels.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default 0.0
   */
  silhouetteSize: createPropertyDescriptor("silhouetteSize"),

  /**
   * Gets or sets the Property specifying the {@link Color} that blends with the model's rendered color.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default Color.WHITE
   */
  color: createPropertyDescriptor("color"),

  /**
   * Gets or sets the enum Property specifying how the color blends with the model.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default ColorBlendMode.HIGHLIGHT
   */
  colorBlendMode: createPropertyDescriptor("colorBlendMode"),

  /**
   * A numeric Property specifying the color strength when the <code>colorBlendMode</code> is MIX.
   * A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with
   * any value in-between resulting in a mix of the two.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   * @default 0.5
   */
  colorBlendAmount: createPropertyDescriptor("colorBlendAmount"),

  /**
   * A property specifying the {@link Cartesian2} used to scale the diffuse and specular image-based lighting contribution to the final color.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  imageBasedLightingFactor: createPropertyDescriptor(
    "imageBasedLightingFactor"
  ),

  /**
   * A property specifying the {@link Cartesian3} light color when shading the model. When <code>undefined</code> the scene's light color is used instead.
   * @memberOf ModelGraphics.prototype
   * @type {Property|undefined}
   */
  lightColor: createPropertyDescriptor("lightColor"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this model will be displayed.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),

  /**
   * Gets or sets the set of node transformations to apply to this model.  This is represented as an {@link PropertyBag}, where keys are
   * names of nodes, and values are {@link TranslationRotationScale} Properties describing the transformation to apply to that node.
   * The transformation is applied after the node's existing transformation as specified in the glTF, and does not replace the node's existing transformation.
   * @memberof ModelGraphics.prototype
   * @type {PropertyBag}
   */
  nodeTransformations: createPropertyDescriptor(
    "nodeTransformations",
    undefined,
    createNodeTransformationPropertyBag
  ),

  /**
   * Gets or sets the set of articulation values to apply to this model.  This is represented as an {@link PropertyBag}, where keys are
   * composed as the name of the articulation, a single space, and the name of the stage.
   * @memberof ModelGraphics.prototype
   * @type {PropertyBag}
   */
  articulations: createPropertyDescriptor(
    "articulations",
    undefined,
    createArticulationStagePropertyBag
  ),

  /**
   * A property specifying the {@link ClippingPlaneCollection} used to selectively disable rendering the model.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  clippingPlanes: createPropertyDescriptor("clippingPlanes"),

  /**
   * Gets or sets the {@link CustomShader} to apply to this model. When <code>undefined</code>, no custom shader code is used.
   * @memberof ModelGraphics.prototype
   * @type {Property|undefined}
   */
  customShader: createPropertyDescriptor("customShader"),
});

/**
 * Duplicates this instance.
 *
 * @param {ModelGraphics} [result] The object onto which to store the result.
 * @returns {ModelGraphics} The modified result parameter or a new instance if one was not provided.
 */
ModelGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new ModelGraphics(this);
  }
  result.show = this.show;
  result.uri = this.uri;
  result.scale = this.scale;
  result.minimumPixelSize = this.minimumPixelSize;
  result.maximumScale = this.maximumScale;
  result.incrementallyLoadTextures = this.incrementallyLoadTextures;
  result.runAnimations = this.runAnimations;
  result.clampAnimations = this.clampAnimations;
  result.heightReference = this._heightReference;
  result.silhouetteColor = this.silhouetteColor;
  result.silhouetteSize = this.silhouetteSize;
  result.color = this.color;
  result.colorBlendMode = this.colorBlendMode;
  result.colorBlendAmount = this.colorBlendAmount;
  result.imageBasedLightingFactor = this.imageBasedLightingFactor;
  result.lightColor = this.lightColor;
  result.distanceDisplayCondition = this.distanceDisplayCondition;
  result.nodeTransformations = this.nodeTransformations;
  result.articulations = this.articulations;
  result.clippingPlanes = this.clippingPlanes;
  result.customShader = this.customShader;
  return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {ModelGraphics} source The object to be merged into this object.
 */
ModelGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.uri = defaultValue(this.uri, source.uri);
  this.scale = defaultValue(this.scale, source.scale);
  this.minimumPixelSize = defaultValue(
    this.minimumPixelSize,
    source.minimumPixelSize
  );
  this.maximumScale = defaultValue(this.maximumScale, source.maximumScale);
  this.incrementallyLoadTextures = defaultValue(
    this.incrementallyLoadTextures,
    source.incrementallyLoadTextures
  );
  this.runAnimations = defaultValue(this.runAnimations, source.runAnimations);
  this.clampAnimations = defaultValue(
    this.clampAnimations,
    source.clampAnimations
  );
  this.shadows = defaultValue(this.shadows, source.shadows);
  this.heightReference = defaultValue(
    this.heightReference,
    source.heightReference
  );
  this.silhouetteColor = defaultValue(
    this.silhouetteColor,
    source.silhouetteColor
  );
  this.silhouetteSize = defaultValue(
    this.silhouetteSize,
    source.silhouetteSize
  );
  this.color = defaultValue(this.color, source.color);
  this.colorBlendMode = defaultValue(
    this.colorBlendMode,
    source.colorBlendMode
  );
  this.colorBlendAmount = defaultValue(
    this.colorBlendAmount,
    source.colorBlendAmount
  );
  this.imageBasedLightingFactor = defaultValue(
    this.imageBasedLightingFactor,
    source.imageBasedLightingFactor
  );
  this.lightColor = defaultValue(this.lightColor, source.lightColor);
  this.distanceDisplayCondition = defaultValue(
    this.distanceDisplayCondition,
    source.distanceDisplayCondition
  );
  this.clippingPlanes = defaultValue(
    this.clippingPlanes,
    source.clippingPlanes
  );
  this.customShader = defaultValue(this.customShader, source.customShader);

  const sourceNodeTransformations = source.nodeTransformations;
  if (defined(sourceNodeTransformations)) {
    const targetNodeTransformations = this.nodeTransformations;
    if (defined(targetNodeTransformations)) {
      targetNodeTransformations.merge(sourceNodeTransformations);
    } else {
      this.nodeTransformations = new PropertyBag(
        sourceNodeTransformations,
        createNodeTransformationProperty
      );
    }
  }

  const sourceArticulations = source.articulations;
  if (defined(sourceArticulations)) {
    const targetArticulations = this.articulations;
    if (defined(targetArticulations)) {
      targetArticulations.merge(sourceArticulations);
    } else {
      this.articulations = new PropertyBag(sourceArticulations);
    }
  }
};
export default ModelGraphics;
