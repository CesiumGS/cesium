import buildModuleUrl from "../Core/buildModuleUrl.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import AcesTonemapping from "../Shaders/PostProcessStages/AcesTonemappingStage.js";
import AmbientOcclusionGenerate from "../Shaders/PostProcessStages/AmbientOcclusionGenerate.js";
import AmbientOcclusionModulate from "../Shaders/PostProcessStages/AmbientOcclusionModulate.js";
import AtmosphericScattering from "../Shaders/PostProcessStages/AtmosphericScattering.js";
import BlackAndWhite from "../Shaders/PostProcessStages/BlackAndWhite.js";
import BloomComposite from "../Shaders/PostProcessStages/BloomComposite.js";
import Brightness from "../Shaders/PostProcessStages/Brightness.js";
import ContrastBias from "../Shaders/PostProcessStages/ContrastBias.js";
import DepthOfField from "../Shaders/PostProcessStages/DepthOfField.js";
import DepthView from "../Shaders/PostProcessStages/DepthView.js";
import EdgeDetection from "../Shaders/PostProcessStages/EdgeDetection.js";
import FilmicTonemapping from "../Shaders/PostProcessStages/FilmicTonemapping.js";
import FXAA from "../Shaders/PostProcessStages/FXAA.js";
import GaussianBlur1D from "../Shaders/PostProcessStages/GaussianBlur1D.js";
import LensFlare from "../Shaders/PostProcessStages/LensFlare.js";
import ModifiedReinhardTonemapping from "../Shaders/PostProcessStages/ModifiedReinhardTonemapping.js";
import NightVision from "../Shaders/PostProcessStages/NightVision.js";
import ReinhardTonemapping from "../Shaders/PostProcessStages/ReinhardTonemapping.js";
import Silhouette from "../Shaders/PostProcessStages/Silhouette.js";
import FXAA3_11 from "../Shaders/FXAA3_11.js";
import AutoExposure from "./AutoExposure.js";
import PostProcessStage from "./PostProcessStage.js";
import PostProcessStageComposite from "./PostProcessStageComposite.js";
import PostProcessStageSampleMode from "./PostProcessStageSampleMode.js";

/**
 * Contains functions for creating common post-process stages.
 *
 * @namespace PostProcessStageLibrary
 */
const PostProcessStageLibrary = {};

function createBlur(name) {
  const delta = 1.0;
  const sigma = 2.0;
  const stepSize = 1.0;

  const blurShader = `#define USE_STEP_SIZE\n${GaussianBlur1D}`;
  const blurX = new PostProcessStage({
    name: `${name}_x_direction`,
    fragmentShader: blurShader,
    uniforms: {
      delta: delta,
      sigma: sigma,
      stepSize: stepSize,
      direction: 0.0,
    },
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });
  const blurY = new PostProcessStage({
    name: `${name}_y_direction`,
    fragmentShader: blurShader,
    uniforms: {
      delta: delta,
      sigma: sigma,
      stepSize: stepSize,
      direction: 1.0,
    },
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    delta: {
      get: function () {
        return blurX.uniforms.delta;
      },
      set: function (value) {
        const blurXUniforms = blurX.uniforms;
        const blurYUniforms = blurY.uniforms;
        blurXUniforms.delta = blurYUniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blurX.uniforms.sigma;
      },
      set: function (value) {
        const blurXUniforms = blurX.uniforms;
        const blurYUniforms = blurY.uniforms;
        blurXUniforms.sigma = blurYUniforms.sigma = value;
      },
    },
    stepSize: {
      get: function () {
        return blurX.uniforms.stepSize;
      },
      set: function (value) {
        const blurXUniforms = blurX.uniforms;
        const blurYUniforms = blurY.uniforms;
        blurXUniforms.stepSize = blurYUniforms.stepSize = value;
      },
    },
  });
  return new PostProcessStageComposite({
    name: name,
    stages: [blurX, blurY],
    uniforms: uniforms,
  });
}

/**
 * Creates a post-process stage that applies a Gaussian blur to the input texture. This stage is usually applied in conjunction with another stage.
 * <p>
 * This stage has the following uniforms: <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
 * </p>
 * <p>
 * <code>delta</code> and <code>sigma</code> are used to compute the weights of a Gaussian filter. The equation is <code>exp((-0.5 * delta * delta) / (sigma * sigma))</code>.
 * The default value for <code>delta</code> is <code>1.0</code>. The default value for <code>sigma</code> is <code>2.0</code>.
 * <code>stepSize</code> is the distance to the next texel. The default is <code>1.0</code>.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage that applies a Gaussian blur to the input texture.
 */
PostProcessStageLibrary.createBlurStage = function () {
  return createBlur("czm_blur");
};

/**
 * Creates a post-process stage that applies a depth of field effect.
 * <p>
 * Depth of field simulates camera focus. Objects in the scene that are in focus
 * will be clear whereas objects not in focus will be blurred.
 * </p>
 * <p>
 * This stage has the following uniforms: <code>focalDistance</code>, <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
 * </p>
 * <p>
 * <code>focalDistance</code> is the distance in meters from the camera to set the camera focus.
 * </p>
 * <p>
 * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
 * The blur is applied to the areas out of focus.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage that applies a depth of field effect.
 */
PostProcessStageLibrary.createDepthOfFieldStage = function () {
  const blur = createBlur("czm_depth_of_field_blur");
  const dof = new PostProcessStage({
    name: "czm_depth_of_field_composite",
    fragmentShader: DepthOfField,
    uniforms: {
      focalDistance: 5.0,
      blurTexture: blur.name,
    },
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    focalDistance: {
      get: function () {
        return dof.uniforms.focalDistance;
      },
      set: function (value) {
        dof.uniforms.focalDistance = value;
      },
    },
    delta: {
      get: function () {
        return blur.uniforms.delta;
      },
      set: function (value) {
        blur.uniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blur.uniforms.sigma;
      },
      set: function (value) {
        blur.uniforms.sigma = value;
      },
    },
    stepSize: {
      get: function () {
        return blur.uniforms.stepSize;
      },
      set: function (value) {
        blur.uniforms.stepSize = value;
      },
    },
  });
  return new PostProcessStageComposite({
    name: "czm_depth_of_field",
    stages: [blur, dof],
    inputPreviousStageTexture: false,
    uniforms: uniforms,
  });
};

/**
 * Whether or not a depth of field stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isDepthOfFieldSupported = function (scene) {
  return scene.context.depthTexture;
};

/**
 * Creates a post-process stage that detects edges.
 * <p>
 * Writes the color to the output texture with alpha set to 1.0 when it is on an edge.
 * </p>
 * <p>
 * This stage has the following uniforms: <code>color</code> and <code>length</code>
 * </p>
 * <ul>
 * <li><code>color</code> is the color of the highlighted edge. The default is {@link Color#BLACK}.</li>
 * <li><code>length</code> is the length of the edges in pixels. The default is <code>0.5</code>.</li>
 * </ul>
 * <p>
 * This stage is not supported in 2D.
 * </p>
 * @return {PostProcessStage} A post-process stage that applies an edge detection effect.
 *
 * @example
 * // multiple silhouette effects
 * const yellowEdge = Cesium.PostProcessLibrary.createEdgeDetectionStage();
 * yellowEdge.uniforms.color = Cesium.Color.YELLOW;
 * yellowEdge.selected = [feature0];
 *
 * const greenEdge = Cesium.PostProcessLibrary.createEdgeDetectionStage();
 * greenEdge.uniforms.color = Cesium.Color.LIME;
 * greenEdge.selected = [feature1];
 *
 * // draw edges around feature0 and feature1
 * postProcessStages.add(Cesium.PostProcessLibrary.createSilhouetteStage([yellowEdge, greenEdge]);
 */
PostProcessStageLibrary.createEdgeDetectionStage = function () {
  // unique name generated on call so more than one effect can be added
  const name = createGuid();
  return new PostProcessStage({
    name: `czm_edge_detection_${name}`,
    fragmentShader: EdgeDetection,
    uniforms: {
      length: 0.25,
      color: Color.clone(Color.BLACK),
    },
  });
};

/**
 * Whether or not an edge detection stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isEdgeDetectionSupported = function (scene) {
  return scene.context.depthTexture;
};

function getSilhouetteEdgeDetection(edgeDetectionStages) {
  if (!defined(edgeDetectionStages)) {
    return PostProcessStageLibrary.createEdgeDetectionStage();
  }

  const edgeDetection = new PostProcessStageComposite({
    name: "czm_edge_detection_multiple",
    stages: edgeDetectionStages,
    inputPreviousStageTexture: false,
  });

  const compositeUniforms = {};
  let fsDecl = "";
  let fsLoop = "";
  for (let i = 0; i < edgeDetectionStages.length; ++i) {
    fsDecl += `uniform sampler2D edgeTexture${i}; \n`;
    fsLoop +=
      `        vec4 edge${i} = texture2D(edgeTexture${i}, v_textureCoordinates); \n` +
      `        if (edge${i}.a > 0.0) \n` +
      `        { \n` +
      `            color = edge${i}; \n` +
      `            break; \n` +
      `        } \n`;
    compositeUniforms[`edgeTexture${i}`] = edgeDetectionStages[i].name;
  }

  const fs =
    `${fsDecl}varying vec2 v_textureCoordinates; \n` +
    `void main() { \n` +
    `    vec4 color = vec4(0.0); \n` +
    `    for (int i = 0; i < ${edgeDetectionStages.length}; i++) \n` +
    `    { \n${fsLoop}    } \n` +
    `    gl_FragColor = color; \n` +
    `} \n`;

  const edgeComposite = new PostProcessStage({
    name: "czm_edge_detection_combine",
    fragmentShader: fs,
    uniforms: compositeUniforms,
  });
  return new PostProcessStageComposite({
    name: "czm_edge_detection_composite",
    stages: [edgeDetection, edgeComposite],
  });
}

/**
 * Creates a post-process stage that applies a silhouette effect.
 * <p>
 * A silhouette effect composites the color from the edge detection pass with input color texture.
 * </p>
 * <p>
 * This stage has the following uniforms when <code>edgeDetectionStages</code> is <code>undefined</code>: <code>color</code> and <code>length</code>
 * </p>
 * <p>
 * <code>color</code> is the color of the highlighted edge. The default is {@link Color#BLACK}.
 * <code>length</code> is the length of the edges in pixels. The default is <code>0.5</code>.
 * </p>
 * @param {PostProcessStage[]} [edgeDetectionStages] An array of edge detection post process stages.
 * @return {PostProcessStageComposite} A post-process stage that applies a silhouette effect.
 */
PostProcessStageLibrary.createSilhouetteStage = function (edgeDetectionStages) {
  const edgeDetection = getSilhouetteEdgeDetection(edgeDetectionStages);
  const silhouetteProcess = new PostProcessStage({
    name: "czm_silhouette_color_edges",
    fragmentShader: Silhouette,
    uniforms: {
      silhouetteTexture: edgeDetection.name,
    },
  });

  return new PostProcessStageComposite({
    name: "czm_silhouette",
    stages: [edgeDetection, silhouetteProcess],
    inputPreviousStageTexture: false,
    uniforms: edgeDetection.uniforms,
  });
};

/**
 * Whether or not a silhouette stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isSilhouetteSupported = function (scene) {
  return scene.context.depthTexture;
};

/**
 * Creates a post-process stage that applies a bloom effect to the input texture.
 * <p>
 * A bloom effect adds glow effect, makes bright areas brighter, and dark areas darker.
 * </p>
 * <p>
 * This post-process stage has the following uniforms: <code>contrast</code>, <code>brightness</code>, <code>glowOnly</code>,
 * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code>.
 * </p>
 * <ul>
 * <li><code>contrast</code> is a scalar value in the range [-255.0, 255.0] and affects the contract of the effect. The default value is <code>128.0</code>.</li>
 * <li><code>brightness</code> is a scalar value. The input texture RGB value is converted to hue, saturation, and brightness (HSB) then this value is
 * added to the brightness. The default value is <code>-0.3</code>.</li>
 * <li><code>glowOnly</code> is a boolean value. When <code>true</code>, only the glow effect will be shown. When <code>false</code>, the glow will be added to the input texture.
 * The default value is <code>false</code>. This is a debug option for viewing the effects when changing the other uniform values.</li>
 * </ul>
 * <p>
 * <code>delta</code>, <code>sigma</code>, and <code>stepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage to applies a bloom effect.
 *
 * @private
 */
PostProcessStageLibrary.createBloomStage = function () {
  const contrastBias = new PostProcessStage({
    name: "czm_bloom_contrast_bias",
    fragmentShader: ContrastBias,
    uniforms: {
      contrast: 128.0,
      brightness: -0.3,
    },
  });
  const blur = createBlur("czm_bloom_blur");
  const generateComposite = new PostProcessStageComposite({
    name: "czm_bloom_contrast_bias_blur",
    stages: [contrastBias, blur],
  });

  const bloomComposite = new PostProcessStage({
    name: "czm_bloom_generate_composite",
    fragmentShader: BloomComposite,
    uniforms: {
      glowOnly: false,
      bloomTexture: generateComposite.name,
    },
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    glowOnly: {
      get: function () {
        return bloomComposite.uniforms.glowOnly;
      },
      set: function (value) {
        bloomComposite.uniforms.glowOnly = value;
      },
    },
    contrast: {
      get: function () {
        return contrastBias.uniforms.contrast;
      },
      set: function (value) {
        contrastBias.uniforms.contrast = value;
      },
    },
    brightness: {
      get: function () {
        return contrastBias.uniforms.brightness;
      },
      set: function (value) {
        contrastBias.uniforms.brightness = value;
      },
    },
    delta: {
      get: function () {
        return blur.uniforms.delta;
      },
      set: function (value) {
        blur.uniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blur.uniforms.sigma;
      },
      set: function (value) {
        blur.uniforms.sigma = value;
      },
    },
    stepSize: {
      get: function () {
        return blur.uniforms.stepSize;
      },
      set: function (value) {
        blur.uniforms.stepSize = value;
      },
    },
  });

  return new PostProcessStageComposite({
    name: "czm_bloom",
    stages: [generateComposite, bloomComposite],
    inputPreviousStageTexture: false,
    uniforms: uniforms,
  });
};

/**
 * Creates a post-process stage that Horizon-based Ambient Occlusion (HBAO) to the input texture.
 * <p>
 * Ambient occlusion simulates shadows from ambient light. These shadows would always be present when the
 * surface receives light and regardless of the light's position.
 * </p>
 * <p>
 * The uniforms have the following properties: <code>intensity</code>, <code>bias</code>, <code>lengthCap</code>,
 * <code>stepSize</code>, <code>frustumLength</code>, <code>randomTexture</code>, <code>ambientOcclusionOnly</code>,
 * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code>.
 * </p>
 * <ul>
 * <li><code>intensity</code> is a scalar value used to lighten or darken the shadows exponentially. Higher values make the shadows darker. The default value is <code>3.0</code>.</li>
 * <li><code>bias</code> is a scalar value representing an angle in radians. If the dot product between the normal of the sample and the vector to the camera is less than this value,
 * sampling stops in the current direction. This is used to remove shadows from near planar edges. The default value is <code>0.1</code>.</li>
 * <li><code>lengthCap</code> is a scalar value representing a length in meters. If the distance from the current sample to first sample is greater than this value,
 * sampling stops in the current direction. The default value is <code>0.26</code>.</li>
 * <li><code>stepSize</code> is a scalar value indicating the distance to the next texel sample in the current direction. The default value is <code>1.95</code>.</li>
 * <li><code>frustumLength</code> is a scalar value in meters. If the current fragment has a distance from the camera greater than this value, ambient occlusion is not computed for the fragment.
 * The default value is <code>1000.0</code>.</li>
 * <li><code>randomTexture</code> is a texture where the red channel is a random value in [0.0, 1.0]. The default value is <code>undefined</code>. This texture needs to be set.</li>
 * <li><code>ambientOcclusionOnly</code> is a boolean value. When <code>true</code>, only the shadows generated are written to the output. When <code>false</code>, the input texture is modulated
 * with the ambient occlusion. This is a useful debug option for seeing the effects of changing the uniform values. The default value is <code>false</code>.</li>
 * </ul>
 * <p>
 * <code>delta</code>, <code>sigma</code>, and <code>blurStepSize</code> are the same properties as {@link PostProcessStageLibrary#createBlurStage}.
 * The blur is applied to the shadows generated from the image to make them smoother.
 * </p>
 * @return {PostProcessStageComposite} A post-process stage that applies an ambient occlusion effect.
 *
 * @private
 */
PostProcessStageLibrary.createAmbientOcclusionStage = function () {
  const generate = new PostProcessStage({
    name: "czm_ambient_occlusion_generate",
    fragmentShader: AmbientOcclusionGenerate,
    uniforms: {
      intensity: 3.0,
      bias: 0.1,
      lengthCap: 0.26,
      stepSize: 1.95,
      frustumLength: 1000.0,
      randomTexture: undefined,
    },
  });
  const blur = createBlur("czm_ambient_occlusion_blur");
  blur.uniforms.stepSize = 0.86;
  const generateAndBlur = new PostProcessStageComposite({
    name: "czm_ambient_occlusion_generate_blur",
    stages: [generate, blur],
  });

  const ambientOcclusionModulate = new PostProcessStage({
    name: "czm_ambient_occlusion_composite",
    fragmentShader: AmbientOcclusionModulate,
    uniforms: {
      ambientOcclusionOnly: false,
      ambientOcclusionTexture: generateAndBlur.name,
    },
  });

  const uniforms = {};
  Object.defineProperties(uniforms, {
    intensity: {
      get: function () {
        return generate.uniforms.intensity;
      },
      set: function (value) {
        generate.uniforms.intensity = value;
      },
    },
    bias: {
      get: function () {
        return generate.uniforms.bias;
      },
      set: function (value) {
        generate.uniforms.bias = value;
      },
    },
    lengthCap: {
      get: function () {
        return generate.uniforms.lengthCap;
      },
      set: function (value) {
        generate.uniforms.lengthCap = value;
      },
    },
    stepSize: {
      get: function () {
        return generate.uniforms.stepSize;
      },
      set: function (value) {
        generate.uniforms.stepSize = value;
      },
    },
    frustumLength: {
      get: function () {
        return generate.uniforms.frustumLength;
      },
      set: function (value) {
        generate.uniforms.frustumLength = value;
      },
    },
    randomTexture: {
      get: function () {
        return generate.uniforms.randomTexture;
      },
      set: function (value) {
        generate.uniforms.randomTexture = value;
      },
    },
    delta: {
      get: function () {
        return blur.uniforms.delta;
      },
      set: function (value) {
        blur.uniforms.delta = value;
      },
    },
    sigma: {
      get: function () {
        return blur.uniforms.sigma;
      },
      set: function (value) {
        blur.uniforms.sigma = value;
      },
    },
    blurStepSize: {
      get: function () {
        return blur.uniforms.stepSize;
      },
      set: function (value) {
        blur.uniforms.stepSize = value;
      },
    },
    ambientOcclusionOnly: {
      get: function () {
        return ambientOcclusionModulate.uniforms.ambientOcclusionOnly;
      },
      set: function (value) {
        ambientOcclusionModulate.uniforms.ambientOcclusionOnly = value;
      },
    },
  });

  return new PostProcessStageComposite({
    name: "czm_ambient_occlusion",
    stages: [generateAndBlur, ambientOcclusionModulate],
    inputPreviousStageTexture: false,
    uniforms: uniforms,
  });
};

/**
 * Whether or not an ambient occlusion stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isAmbientOcclusionSupported = function (scene) {
  return scene.context.depthTexture;
};

/**
 * Creates a post-process stage that renders atmospheric light scattering.
 * <p>
 * Shader by Dimas Leenman, Shared under the MIT license
 * https://github.com/Dimev/Realistic-Atmosphere-Godot-and-UE4/blob/master/godot/shader/atmosphere.shade
 *
 * </p>
 * <p>
 * The uniforms have the following properties: <code>planetRadius</code>.
 * </p>
 * <p>
 * This stage requires to disable native Cesium skyAtmosphere and groundAtmosphere.
 * <code>viewer.scene.skyAtmosphere.show = false;</code>
 * <code>viewer.scene.globe.showGroundAtmosphere = false;</code>
 * </p>
 * <ul>
 * <li><code>planetRadius</code> is a scalar value to be used to adjust earth radius based on viewer position. The default value is <code>6357000.0</code> and represent the minimum earth radius at the pole.</li>
 * </ul>
 * @param {Number} [primarySteps=16] The number of steps along the 'primary' ray, more looks better but is slower.
 * @param {Number} [lightSteps=4] The number of steps along the light ray, more looks better but is slower
 * @return {PostProcessStage} A post-process stage that applies atmosphere light scattering.
 *
 */
PostProcessStageLibrary.createAtmosphereScatteringStage = function (
  primarySteps,
  lightSteps
) {
  let fs = `#define PRIMARY_STEPS ${defaultValue(primarySteps, 16)} \n`;
  fs += `#define LIGHT_STEPS ${defaultValue(lightSteps, 4)}\n`;
  fs += AtmosphericScattering;

  return new PostProcessStage({
    name: "czm_atmosphere_scattering_generate",
    fragmentShader: fs,
    uniforms: {
      planetRadius: Ellipsoid.WGS84.minimumRadius,
    },
  });
};

/**
 * Whether or not the atmosphere scattering stage is supported.
 * <p>
 * This stage requires the WEBGL_depth_texture extension.
 * </p>
 *
 * @param {Scene} scene The scene.
 * @return {Boolean} Whether this post process stage is supported.
 *
 * @see {Context#depthTexture}
 * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
 */
PostProcessStageLibrary.isAtmosphereScatteringSupported = function (scene) {
  return scene.context.depthTexture;
};

const fxaaFS = `#define FXAA_QUALITY_PRESET 39 \n${FXAA3_11}\n${FXAA}`;

/**
 * Creates a post-process stage that applies Fast Approximate Anti-aliasing (FXAA) to the input texture.
 * @return {PostProcessStage} A post-process stage that applies Fast Approximate Anti-aliasing to the input texture.
 *
 * @private
 */
PostProcessStageLibrary.createFXAAStage = function () {
  return new PostProcessStage({
    name: "czm_FXAA",
    fragmentShader: fxaaFS,
    sampleMode: PostProcessStageSampleMode.LINEAR,
  });
};

/**
 * Creates a post-process stage that applies ACES tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies ACES tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createAcesTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += AcesTonemapping;
  return new PostProcessStage({
    name: "czm_aces",
    fragmentShader: fs,
    uniforms: {
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that applies filmic tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies filmic tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createFilmicTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += FilmicTonemapping;
  return new PostProcessStage({
    name: "czm_filmic",
    fragmentShader: fs,
    uniforms: {
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that applies Reinhard tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies Reinhard tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createReinhardTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += ReinhardTonemapping;
  return new PostProcessStage({
    name: "czm_reinhard",
    fragmentShader: fs,
    uniforms: {
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that applies modified Reinhard tonemapping operator.
 * @param {Boolean} useAutoExposure Whether or not to use auto-exposure.
 * @return {PostProcessStage} A post-process stage that applies modified Reinhard tonemapping operator.
 * @private
 */
PostProcessStageLibrary.createModifiedReinhardTonemappingStage = function (
  useAutoExposure
) {
  let fs = useAutoExposure ? "#define AUTO_EXPOSURE\n" : "";
  fs += ModifiedReinhardTonemapping;
  return new PostProcessStage({
    name: "czm_modified_reinhard",
    fragmentShader: fs,
    uniforms: {
      white: Color.WHITE,
      autoExposure: undefined,
    },
  });
};

/**
 * Creates a post-process stage that finds the average luminance of the input texture.
 * @return {PostProcessStage} A post-process stage that finds the average luminance of the input texture.
 * @private
 */
PostProcessStageLibrary.createAutoExposureStage = function () {
  return new AutoExposure();
};

/**
 * Creates a post-process stage that renders the input texture with black and white gradations.
 * <p>
 * This stage has one uniform value, <code>gradations</code>, which scales the luminance of each pixel.
 * </p>
 * @return {PostProcessStage} A post-process stage that renders the input texture with black and white gradations.
 */
PostProcessStageLibrary.createBlackAndWhiteStage = function () {
  return new PostProcessStage({
    name: "czm_black_and_white",
    fragmentShader: BlackAndWhite,
    uniforms: {
      gradations: 5.0,
    },
  });
};

/**
 * Creates a post-process stage that saturates the input texture.
 * <p>
 * This stage has one uniform value, <code>brightness</code>, which scales the saturation of each pixel.
 * </p>
 * @return {PostProcessStage} A post-process stage that saturates the input texture.
 */
PostProcessStageLibrary.createBrightnessStage = function () {
  return new PostProcessStage({
    name: "czm_brightness",
    fragmentShader: Brightness,
    uniforms: {
      brightness: 0.5,
    },
  });
};

/**
 * Creates a post-process stage that adds a night vision effect to the input texture.
 * @return {PostProcessStage} A post-process stage that adds a night vision effect to the input texture.
 */
PostProcessStageLibrary.createNightVisionStage = function () {
  return new PostProcessStage({
    name: "czm_night_vision",
    fragmentShader: NightVision,
  });
};

/**
 * Creates a post-process stage that replaces the input color texture with a black and white texture representing the fragment depth at each pixel.
 * @return {PostProcessStage} A post-process stage that replaces the input color texture with a black and white texture representing the fragment depth at each pixel.
 *
 * @private
 */
PostProcessStageLibrary.createDepthViewStage = function () {
  return new PostProcessStage({
    name: "czm_depth_view",
    fragmentShader: DepthView,
  });
};

/**
 * Creates a post-process stage that applies an effect simulating light flaring a camera lens.
 * <p>
 * This stage has the following uniforms: <code>dirtTexture</code>, <code>starTexture</code>, <code>intensity</code>, <code>distortion</code>, <code>ghostDispersal</code>,
 * <code>haloWidth</code>, <code>dirtAmount</code>, and <code>earthRadius</code>.
 * <ul>
 * <li><code>dirtTexture</code> is a texture sampled to simulate dirt on the lens.</li>
 * <li><code>starTexture</code> is the texture sampled for the star pattern of the flare.</li>
 * <li><code>intensity</code> is a scalar multiplied by the result of the lens flare. The default value is <code>2.0</code>.</li>
 * <li><code>distortion</code> is a scalar value that affects the chromatic effect distortion. The default value is <code>10.0</code>.</li>
 * <li><code>ghostDispersal</code> is a scalar indicating how far the halo effect is from the center of the texture. The default value is <code>0.4</code>.</li>
 * <li><code>haloWidth</code> is a scalar representing the width of the halo  from the ghost dispersal. The default value is <code>0.4</code>.</li>
 * <li><code>dirtAmount</code> is a scalar representing the amount of dirt on the lens. The default value is <code>0.4</code>.</li>
 * <li><code>earthRadius</code> is the maximum radius of the earth. The default value is <code>Ellipsoid.WGS84.maximumRadius</code>.</li>
 * </ul>
 * </p>
 * @return {PostProcessStage} A post-process stage for applying a lens flare effect.
 */
PostProcessStageLibrary.createLensFlareStage = function () {
  return new PostProcessStage({
    name: "czm_lens_flare",
    fragmentShader: LensFlare,
    uniforms: {
      dirtTexture: buildModuleUrl("Assets/Textures/LensFlare/DirtMask.jpg"),
      starTexture: buildModuleUrl("Assets/Textures/LensFlare/StarBurst.jpg"),
      intensity: 2.0,
      distortion: 10.0,
      ghostDispersal: 0.4,
      haloWidth: 0.4,
      dirtAmount: 0.4,
      earthRadius: Ellipsoid.WGS84.maximumRadius,
    },
  });
};
export default PostProcessStageLibrary;
