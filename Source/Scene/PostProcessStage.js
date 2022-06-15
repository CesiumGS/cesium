import BoundingRectangle from "../Core/BoundingRectangle.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";
import Resource from "../Core/Resource.js";
import PassState from "../Renderer/PassState.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RenderState from "../Renderer/RenderState.js";
import Sampler from "../Renderer/Sampler.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import PostProcessStageSampleMode from "./PostProcessStageSampleMode.js";

/**
 * Runs a post-process stage on either the texture rendered by the scene or the output of a previous post-process stage.
 *
 * @alias PostProcessStage
 * @constructor
 *
 * @param {Object} options An object with the following properties:
 * @param {String} options.fragmentShader The fragment shader to use. The default <code>sampler2D</code> uniforms are <code>colorTexture</code> and <code>depthTexture</code>. The color texture is the output of rendering the scene or the previous stage. The depth texture is the output from rendering the scene. The shader should contain one or both uniforms. There is also a <code>vec2</code> varying named <code>v_textureCoordinates</code> that can be used to sample the textures.
 * @param {Object} [options.uniforms] An object whose properties will be used to set the shaders uniforms. The properties can be constant values or a function. A constant value can also be a URI, data URI, or HTML element to use as a texture.
 * @param {Number} [options.textureScale=1.0] A number in the range (0.0, 1.0] used to scale the texture dimensions. A scale of 1.0 will render this post-process stage  to a texture the size of the viewport.
 * @param {Boolean} [options.forcePowerOfTwo=false] Whether or not to force the texture dimensions to be both equal powers of two. The power of two will be the next power of two of the minimum of the dimensions.
 * @param {PostProcessStageSampleMode} [options.sampleMode=PostProcessStageSampleMode.NEAREST] How to sample the input color texture.
 * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] The color pixel format of the output texture.
 * @param {PixelDatatype} [options.pixelDatatype=PixelDatatype.UNSIGNED_BYTE] The pixel data type of the output texture.
 * @param {Color} [options.clearColor=Color.BLACK] The color to clear the output texture to.
 * @param {BoundingRectangle} [options.scissorRectangle] The rectangle to use for the scissor test.
 * @param {String} [options.name=createGuid()] The unique name of this post-process stage for reference by other stages in a composite. If a name is not supplied, a GUID will be generated.
 *
 * @exception {DeveloperError} options.textureScale must be greater than 0.0 and less than or equal to 1.0.
 * @exception {DeveloperError} options.pixelFormat must be a color format.
 * @exception {DeveloperError} When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.
 *
 * @see PostProcessStageComposite
 *
 * @example
 * // Simple stage to change the color
 * const fs =`
 *     uniform sampler2D colorTexture;
 *     varying vec2 v_textureCoordinates;
 *     uniform float scale;
 *     uniform vec3 offset;
 *     void main() {
 *         vec4 color = texture2D(colorTexture, v_textureCoordinates);
 *         gl_FragColor = vec4(color.rgb * scale + offset, 1.0);
 *     }`;
 * scene.postProcessStages.add(new Cesium.PostProcessStage({
 *     fragmentShader : fs,
 *     uniforms : {
 *         scale : 1.1,
 *         offset : function() {
 *             return new Cesium.Cartesian3(0.1, 0.2, 0.3);
 *         }
 *     }
 * }));
 *
 * @example
 * // Simple stage to change the color of what is selected.
 * // If czm_selected returns true, the current fragment belongs to geometry in the selected array.
 * const fs =`
 *     uniform sampler2D colorTexture;
 *     varying vec2 v_textureCoordinates;
 *     uniform vec4 highlight;
 *     void main() {
 *         vec4 color = texture2D(colorTexture, v_textureCoordinates);
 *         if (czm_selected()) {
 *             vec3 highlighted = highlight.a * highlight.rgb + (1.0 - highlight.a) * color.rgb;
 *             gl_FragColor = vec4(highlighted, 1.0);
 *         } else {
 *             gl_FragColor = color;
 *         }
 *     }`;
 * const stage = scene.postProcessStages.add(new Cesium.PostProcessStage({
 *     fragmentShader : fs,
 *     uniforms : {
 *         highlight : function() {
 *             return new Cesium.Color(1.0, 0.0, 0.0, 0.5);
 *         }
 *     }
 * }));
 * stage.selected = [cesium3DTileFeature];
 */
function PostProcessStage(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const fragmentShader = options.fragmentShader;
  const textureScale = defaultValue(options.textureScale, 1.0);
  const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("options.fragmentShader", fragmentShader);
  Check.typeOf.number.greaterThan("options.textureScale", textureScale, 0.0);
  Check.typeOf.number.lessThanOrEquals(
    "options.textureScale",
    textureScale,
    1.0
  );
  if (!PixelFormat.isColorFormat(pixelFormat)) {
    throw new DeveloperError("options.pixelFormat must be a color format.");
  }
  //>>includeEnd('debug');

  this._fragmentShader = fragmentShader;
  this._uniforms = options.uniforms;
  this._textureScale = textureScale;
  this._forcePowerOfTwo = defaultValue(options.forcePowerOfTwo, false);
  this._sampleMode = defaultValue(
    options.sampleMode,
    PostProcessStageSampleMode.NEAREST
  );
  this._pixelFormat = pixelFormat;
  this._pixelDatatype = defaultValue(
    options.pixelDatatype,
    PixelDatatype.UNSIGNED_BYTE
  );
  this._clearColor = defaultValue(options.clearColor, Color.BLACK);

  this._uniformMap = undefined;
  this._command = undefined;

  this._colorTexture = undefined;
  this._depthTexture = undefined;
  this._idTexture = undefined;

  this._actualUniforms = {};
  this._dirtyUniforms = [];
  this._texturesToRelease = [];
  this._texturesToCreate = [];
  this._texturePromise = undefined;

  const passState = new PassState();
  passState.scissorTest = {
    enabled: true,
    rectangle: defined(options.scissorRectangle)
      ? BoundingRectangle.clone(options.scissorRectangle)
      : new BoundingRectangle(),
  };
  this._passState = passState;

  this._ready = false;

  let name = options.name;
  if (!defined(name)) {
    name = createGuid();
  }
  this._name = name;

  this._logDepthChanged = undefined;
  this._useLogDepth = undefined;

  this._selectedIdTexture = undefined;
  this._selected = undefined;
  this._selectedShadow = undefined;
  this._parentSelected = undefined;
  this._parentSelectedShadow = undefined;
  this._combinedSelected = undefined;
  this._combinedSelectedShadow = undefined;
  this._selectedLength = 0;
  this._parentSelectedLength = 0;
  this._selectedDirty = true;

  // set by PostProcessStageCollection
  this._textureCache = undefined;
  this._index = undefined;

  /**
   * Whether or not to execute this post-process stage when ready.
   *
   * @type {Boolean}
   */
  this.enabled = true;
  this._enabled = true;
}

Object.defineProperties(PostProcessStage.prototype, {
  /**
   * Determines if this post-process stage is ready to be executed. A stage is only executed when both <code>ready</code>
   * and {@link PostProcessStage#enabled} are <code>true</code>. A stage will not be ready while it is waiting on textures
   * to load.
   *
   * @memberof PostProcessStage.prototype
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },
  /**
   * The unique name of this post-process stage for reference by other stages in a {@link PostProcessStageComposite}.
   *
   * @memberof PostProcessStage.prototype
   * @type {String}
   * @readonly
   */
  name: {
    get: function () {
      return this._name;
    },
  },
  /**
   * The fragment shader to use when execute this post-process stage.
   * <p>
   * The shader must contain a sampler uniform declaration for <code>colorTexture</code>, <code>depthTexture</code>,
   * or both.
   * </p>
   * <p>
   * The shader must contain a <code>vec2</code> varying declaration for <code>v_textureCoordinates</code> for sampling
   * the texture uniforms.
   * </p>
   *
   * @memberof PostProcessStage.prototype
   * @type {String}
   * @readonly
   */
  fragmentShader: {
    get: function () {
      return this._fragmentShader;
    },
  },
  /**
   * An object whose properties are used to set the uniforms of the fragment shader.
   * <p>
   * The object property values can be either a constant or a function. The function will be called
   * each frame before the post-process stage is executed.
   * </p>
   * <p>
   * A constant value can also be a URI to an image, a data URI, or an HTML element that can be used as a texture, such as HTMLImageElement or HTMLCanvasElement.
   * </p>
   * <p>
   * If this post-process stage is part of a {@link PostProcessStageComposite} that does not execute in series, the constant value can also be
   * the name of another stage in a composite. This will set the uniform to the output texture the stage with that name.
   * </p>
   *
   * @memberof PostProcessStage.prototype
   * @type {Object}
   * @readonly
   */
  uniforms: {
    get: function () {
      return this._uniforms;
    },
  },
  /**
   * A number in the range (0.0, 1.0] used to scale the output texture dimensions. A scale of 1.0 will render this post-process stage to a texture the size of the viewport.
   *
   * @memberof PostProcessStage.prototype
   * @type {Number}
   * @readonly
   */
  textureScale: {
    get: function () {
      return this._textureScale;
    },
  },
  /**
   * Whether or not to force the output texture dimensions to be both equal powers of two. The power of two will be the next power of two of the minimum of the dimensions.
   *
   * @memberof PostProcessStage.prototype
   * @type {Number}
   * @readonly
   */
  forcePowerOfTwo: {
    get: function () {
      return this._forcePowerOfTwo;
    },
  },
  /**
   * How to sample the input color texture.
   *
   * @memberof PostProcessStage.prototype
   * @type {PostProcessStageSampleMode}
   * @readonly
   */
  sampleMode: {
    get: function () {
      return this._sampleMode;
    },
  },
  /**
   * The color pixel format of the output texture.
   *
   * @memberof PostProcessStage.prototype
   * @type {PixelFormat}
   * @readonly
   */
  pixelFormat: {
    get: function () {
      return this._pixelFormat;
    },
  },
  /**
   * The pixel data type of the output texture.
   *
   * @memberof PostProcessStage.prototype
   * @type {PixelDatatype}
   * @readonly
   */
  pixelDatatype: {
    get: function () {
      return this._pixelDatatype;
    },
  },
  /**
   * The color to clear the output texture to.
   *
   * @memberof PostProcessStage.prototype
   * @type {Color}
   * @readonly
   */
  clearColor: {
    get: function () {
      return this._clearColor;
    },
  },
  /**
   * The {@link BoundingRectangle} to use for the scissor test. A default bounding rectangle will disable the scissor test.
   *
   * @memberof PostProcessStage.prototype
   * @type {BoundingRectangle}
   * @readonly
   */
  scissorRectangle: {
    get: function () {
      return this._passState.scissorTest.rectangle;
    },
  },
  /**
   * A reference to the texture written to when executing this post process stage.
   *
   * @memberof PostProcessStage.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  outputTexture: {
    get: function () {
      if (defined(this._textureCache)) {
        const framebuffer = this._textureCache.getFramebuffer(this._name);
        if (defined(framebuffer)) {
          return framebuffer.getColorTexture(0);
        }
      }
      return undefined;
    },
  },
  /**
   * The features selected for applying the post-process.
   * <p>
   * In the fragment shader, use <code>czm_selected</code> to determine whether or not to apply the post-process
   * stage to that fragment. For example:
   * <code>
   * if (czm_selected(v_textureCoordinates)) {
   *     // apply post-process stage
   * } else {
   *     gl_FragColor = texture2D(colorTexture, v_textureCoordinates);
   * }
   * </code>
   * </p>
   *
   * @memberof PostProcessStage.prototype
   * @type {Array}
   */
  selected: {
    get: function () {
      return this._selected;
    },
    set: function (value) {
      this._selected = value;
    },
  },
  /**
   * @private
   */
  parentSelected: {
    get: function () {
      return this._parentSelected;
    },
    set: function (value) {
      this._parentSelected = value;
    },
  },
});

const depthTextureRegex = /uniform\s+sampler2D\s+depthTexture/g;

/**
 * @private
 */
PostProcessStage.prototype._isSupported = function (context) {
  return !depthTextureRegex.test(this._fragmentShader) || context.depthTexture;
};

function getUniformValueGetterAndSetter(stage, uniforms, name) {
  const currentValue = uniforms[name];
  if (
    typeof currentValue === "string" ||
    currentValue instanceof HTMLCanvasElement ||
    currentValue instanceof HTMLImageElement ||
    currentValue instanceof HTMLVideoElement ||
    currentValue instanceof ImageData
  ) {
    stage._dirtyUniforms.push(name);
  }

  return {
    get: function () {
      return uniforms[name];
    },
    set: function (value) {
      const currentValue = uniforms[name];
      uniforms[name] = value;

      const actualUniforms = stage._actualUniforms;
      const actualValue = actualUniforms[name];
      if (
        defined(actualValue) &&
        actualValue !== currentValue &&
        actualValue instanceof Texture &&
        !defined(stage._textureCache.getStageByName(name))
      ) {
        stage._texturesToRelease.push(actualValue);
        delete actualUniforms[name];
        delete actualUniforms[`${name}Dimensions`];
      }

      if (currentValue instanceof Texture) {
        stage._texturesToRelease.push(currentValue);
      }

      if (
        typeof value === "string" ||
        value instanceof HTMLCanvasElement ||
        value instanceof HTMLImageElement ||
        value instanceof HTMLVideoElement ||
        value instanceof ImageData
      ) {
        stage._dirtyUniforms.push(name);
      } else {
        actualUniforms[name] = value;
      }
    },
  };
}

function getUniformMapFunction(stage, name) {
  return function () {
    const value = stage._actualUniforms[name];
    if (typeof value === "function") {
      return value();
    }
    return value;
  };
}

function getUniformMapDimensionsFunction(uniformMap, name) {
  return function () {
    const texture = uniformMap[name]();
    if (defined(texture)) {
      return texture.dimensions;
    }
    return undefined;
  };
}

function createUniformMap(stage) {
  if (defined(stage._uniformMap)) {
    return;
  }

  const uniformMap = {};
  const newUniforms = {};
  const uniforms = stage._uniforms;
  const actualUniforms = stage._actualUniforms;
  for (const name in uniforms) {
    if (uniforms.hasOwnProperty(name)) {
      if (typeof uniforms[name] !== "function") {
        uniformMap[name] = getUniformMapFunction(stage, name);
        newUniforms[name] = getUniformValueGetterAndSetter(
          stage,
          uniforms,
          name
        );
      } else {
        uniformMap[name] = uniforms[name];
        newUniforms[name] = uniforms[name];
      }

      actualUniforms[name] = uniforms[name];

      const value = uniformMap[name]();
      if (
        typeof value === "string" ||
        value instanceof Texture ||
        value instanceof HTMLImageElement ||
        value instanceof HTMLCanvasElement ||
        value instanceof HTMLVideoElement
      ) {
        uniformMap[`${name}Dimensions`] = getUniformMapDimensionsFunction(
          uniformMap,
          name
        );
      }
    }
  }

  stage._uniforms = {};
  Object.defineProperties(stage._uniforms, newUniforms);

  stage._uniformMap = combine(uniformMap, {
    colorTexture: function () {
      return stage._colorTexture;
    },
    colorTextureDimensions: function () {
      return stage._colorTexture.dimensions;
    },
    depthTexture: function () {
      return stage._depthTexture;
    },
    depthTextureDimensions: function () {
      return stage._depthTexture.dimensions;
    },
    czm_idTexture: function () {
      return stage._idTexture;
    },
    czm_selectedIdTexture: function () {
      return stage._selectedIdTexture;
    },
    czm_selectedIdTextureStep: function () {
      return 1.0 / stage._selectedIdTexture.width;
    },
  });
}

function createDrawCommand(stage, context) {
  if (
    defined(stage._command) &&
    !stage._logDepthChanged &&
    !stage._selectedDirty
  ) {
    return;
  }

  let fs = stage._fragmentShader;
  if (defined(stage._selectedIdTexture)) {
    const width = stage._selectedIdTexture.width;

    fs = fs.replace(/varying\s+vec2\s+v_textureCoordinates;/g, "");
    fs =
      `${
        "#define CZM_SELECTED_FEATURE \n" +
        "uniform sampler2D czm_idTexture; \n" +
        "uniform sampler2D czm_selectedIdTexture; \n" +
        "uniform float czm_selectedIdTextureStep; \n" +
        "varying vec2 v_textureCoordinates; \n" +
        "bool czm_selected(vec2 offset) \n" +
        "{ \n" +
        "    bool selected = false;\n" +
        "    vec4 id = texture2D(czm_idTexture, v_textureCoordinates + offset); \n" +
        "    for (int i = 0; i < "
      }${width}; ++i) \n` +
      `    { \n` +
      `        vec4 selectedId = texture2D(czm_selectedIdTexture, vec2((float(i) + 0.5) * czm_selectedIdTextureStep, 0.5)); \n` +
      `        if (all(equal(id, selectedId))) \n` +
      `        { \n` +
      `            return true; \n` +
      `        } \n` +
      `    } \n` +
      `    return false; \n` +
      `} \n\n` +
      `bool czm_selected() \n` +
      `{ \n` +
      `    return czm_selected(vec2(0.0)); \n` +
      `} \n\n${fs}`;
  }

  const fragmentShader = new ShaderSource({
    defines: [stage._useLogDepth ? "LOG_DEPTH" : ""],
    sources: [fs],
  });
  stage._command = context.createViewportQuadCommand(fragmentShader, {
    uniformMap: stage._uniformMap,
    owner: stage,
  });
}

function createSampler(stage) {
  const mode = stage._sampleMode;

  let minFilter;
  let magFilter;

  if (mode === PostProcessStageSampleMode.LINEAR) {
    minFilter = TextureMinificationFilter.LINEAR;
    magFilter = TextureMagnificationFilter.LINEAR;
  } else {
    minFilter = TextureMinificationFilter.NEAREST;
    magFilter = TextureMagnificationFilter.NEAREST;
  }

  const sampler = stage._sampler;
  if (
    !defined(sampler) ||
    sampler.minificationFilter !== minFilter ||
    sampler.magnificationFilter !== magFilter
  ) {
    stage._sampler = new Sampler({
      wrapS: TextureWrap.CLAMP_TO_EDGE,
      wrapT: TextureWrap.CLAMP_TO_EDGE,
      minificationFilter: minFilter,
      magnificationFilter: magFilter,
    });
  }
}

function createLoadImageFunction(stage, name) {
  return function (image) {
    stage._texturesToCreate.push({
      name: name,
      source: image,
    });
  };
}

function createStageOutputTextureFunction(stage, name) {
  return function () {
    return stage._textureCache.getOutputTexture(name);
  };
}

function updateUniformTextures(stage, context) {
  let i;
  let texture;
  let name;

  const texturesToRelease = stage._texturesToRelease;
  let length = texturesToRelease.length;
  for (i = 0; i < length; ++i) {
    texture = texturesToRelease[i];
    texture = texture && texture.destroy();
  }
  texturesToRelease.length = 0;

  const texturesToCreate = stage._texturesToCreate;
  length = texturesToCreate.length;
  for (i = 0; i < length; ++i) {
    const textureToCreate = texturesToCreate[i];
    name = textureToCreate.name;
    const source = textureToCreate.source;
    stage._actualUniforms[name] = new Texture({
      context: context,
      source: source,
    });
  }
  texturesToCreate.length = 0;

  const dirtyUniforms = stage._dirtyUniforms;
  if (dirtyUniforms.length === 0 && !defined(stage._texturePromise)) {
    stage._ready = true;
    return;
  }

  if (dirtyUniforms.length === 0 || defined(stage._texturePromise)) {
    return;
  }

  length = dirtyUniforms.length;
  const uniforms = stage._uniforms;
  const promises = [];
  for (i = 0; i < length; ++i) {
    name = dirtyUniforms[i];
    const stageNameUrlOrImage = uniforms[name];
    const stageWithName = stage._textureCache.getStageByName(
      stageNameUrlOrImage
    );
    if (defined(stageWithName)) {
      stage._actualUniforms[name] = createStageOutputTextureFunction(
        stage,
        stageNameUrlOrImage
      );
    } else if (typeof stageNameUrlOrImage === "string") {
      const resource = new Resource({
        url: stageNameUrlOrImage,
      });

      promises.push(
        resource.fetchImage().then(createLoadImageFunction(stage, name))
      );
    } else {
      stage._texturesToCreate.push({
        name: name,
        source: stageNameUrlOrImage,
      });
    }
  }

  dirtyUniforms.length = 0;

  if (promises.length > 0) {
    stage._ready = false;
    stage._texturePromise = Promise.all(promises).then(function () {
      stage._ready = true;
      stage._texturePromise = undefined;
    });
  } else {
    stage._ready = true;
  }
}

function releaseResources(stage) {
  if (defined(stage._command)) {
    stage._command.shaderProgram =
      stage._command.shaderProgram && stage._command.shaderProgram.destroy();
    stage._command = undefined;
  }

  stage._selectedIdTexture =
    stage._selectedIdTexture && stage._selectedIdTexture.destroy();

  const textureCache = stage._textureCache;
  if (!defined(textureCache)) {
    return;
  }

  const uniforms = stage._uniforms;
  const actualUniforms = stage._actualUniforms;
  for (const name in actualUniforms) {
    if (actualUniforms.hasOwnProperty(name)) {
      if (actualUniforms[name] instanceof Texture) {
        if (!defined(textureCache.getStageByName(uniforms[name]))) {
          actualUniforms[name].destroy();
        }
        stage._dirtyUniforms.push(name);
      }
    }
  }
}

function isSelectedTextureDirty(stage) {
  let length = defined(stage._selected) ? stage._selected.length : 0;
  const parentLength = defined(stage._parentSelected)
    ? stage._parentSelected
    : 0;
  let dirty =
    stage._selected !== stage._selectedShadow ||
    length !== stage._selectedLength;
  dirty =
    dirty ||
    stage._parentSelected !== stage._parentSelectedShadow ||
    parentLength !== stage._parentSelectedLength;

  if (defined(stage._selected) && defined(stage._parentSelected)) {
    stage._combinedSelected = stage._selected.concat(stage._parentSelected);
  } else if (defined(stage._parentSelected)) {
    stage._combinedSelected = stage._parentSelected;
  } else {
    stage._combinedSelected = stage._selected;
  }

  if (!dirty && defined(stage._combinedSelected)) {
    if (!defined(stage._combinedSelectedShadow)) {
      return true;
    }

    length = stage._combinedSelected.length;
    for (let i = 0; i < length; ++i) {
      if (stage._combinedSelected[i] !== stage._combinedSelectedShadow[i]) {
        return true;
      }
    }
  }
  return dirty;
}

function createSelectedTexture(stage, context) {
  if (!stage._selectedDirty) {
    return;
  }

  stage._selectedIdTexture =
    stage._selectedIdTexture && stage._selectedIdTexture.destroy();
  stage._selectedIdTexture = undefined;

  const features = stage._combinedSelected;
  if (!defined(features)) {
    return;
  }

  let i;
  let feature;

  let textureLength = 0;
  const length = features.length;
  for (i = 0; i < length; ++i) {
    feature = features[i];
    if (defined(feature.pickIds)) {
      textureLength += feature.pickIds.length;
    } else if (defined(feature.pickId)) {
      ++textureLength;
    }
  }

  if (length === 0 || textureLength === 0) {
    // max pick id is reserved
    const empty = new Uint8Array(4);
    empty[0] = 255;
    empty[1] = 255;
    empty[2] = 255;
    empty[3] = 255;

    stage._selectedIdTexture = new Texture({
      context: context,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
      source: {
        arrayBufferView: empty,
        width: 1,
        height: 1,
      },
      sampler: Sampler.NEAREST,
    });
    return;
  }

  let pickColor;
  let offset = 0;
  const ids = new Uint8Array(textureLength * 4);
  for (i = 0; i < length; ++i) {
    feature = features[i];
    if (defined(feature.pickIds)) {
      const pickIds = feature.pickIds;
      const pickIdsLength = pickIds.length;
      for (let j = 0; j < pickIdsLength; ++j) {
        pickColor = pickIds[j].color;
        ids[offset] = Color.floatToByte(pickColor.red);
        ids[offset + 1] = Color.floatToByte(pickColor.green);
        ids[offset + 2] = Color.floatToByte(pickColor.blue);
        ids[offset + 3] = Color.floatToByte(pickColor.alpha);
        offset += 4;
      }
    } else if (defined(feature.pickId)) {
      pickColor = feature.pickId.color;
      ids[offset] = Color.floatToByte(pickColor.red);
      ids[offset + 1] = Color.floatToByte(pickColor.green);
      ids[offset + 2] = Color.floatToByte(pickColor.blue);
      ids[offset + 3] = Color.floatToByte(pickColor.alpha);
      offset += 4;
    }
  }

  stage._selectedIdTexture = new Texture({
    context: context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    source: {
      arrayBufferView: ids,
      width: textureLength,
      height: 1,
    },
    sampler: Sampler.NEAREST,
  });
}

/**
 * A function that will be called before execute. Used to create WebGL resources and load any textures.
 * @param {Context} context The context.
 * @param {Boolean} useLogDepth Whether the scene uses a logarithmic depth buffer.
 * @private
 */
PostProcessStage.prototype.update = function (context, useLogDepth) {
  if (this.enabled !== this._enabled && !this.enabled) {
    releaseResources(this);
  }

  this._enabled = this.enabled;
  if (!this._enabled) {
    return;
  }

  this._logDepthChanged = useLogDepth !== this._useLogDepth;
  this._useLogDepth = useLogDepth;

  this._selectedDirty = isSelectedTextureDirty(this);

  this._selectedShadow = this._selected;
  this._parentSelectedShadow = this._parentSelected;
  this._combinedSelectedShadow = this._combinedSelected;
  this._selectedLength = defined(this._selected) ? this._selected.length : 0;
  this._parentSelectedLength = defined(this._parentSelected)
    ? this._parentSelected.length
    : 0;

  createSelectedTexture(this, context);
  createUniformMap(this);
  updateUniformTextures(this, context);
  createDrawCommand(this, context);
  createSampler(this);

  this._selectedDirty = false;

  if (!this._ready) {
    return;
  }

  const framebuffer = this._textureCache.getFramebuffer(this._name);
  this._command.framebuffer = framebuffer;

  if (!defined(framebuffer)) {
    return;
  }

  const colorTexture = framebuffer.getColorTexture(0);
  let renderState;
  if (
    colorTexture.width !== context.drawingBufferWidth ||
    colorTexture.height !== context.drawingBufferHeight
  ) {
    renderState = this._renderState;
    if (
      !defined(renderState) ||
      colorTexture.width !== renderState.viewport.width ||
      colorTexture.height !== renderState.viewport.height
    ) {
      this._renderState = RenderState.fromCache({
        viewport: new BoundingRectangle(
          0,
          0,
          colorTexture.width,
          colorTexture.height
        ),
      });
    }
  }

  this._command.renderState = renderState;
};

/**
 * Executes the post-process stage. The color texture is the texture rendered to by the scene or from the previous stage.
 * @param {Context} context The context.
 * @param {Texture} colorTexture The input color texture.
 * @param {Texture} depthTexture The input depth texture.
 * @param {Texture} idTexture The id texture.
 * @private
 */
PostProcessStage.prototype.execute = function (
  context,
  colorTexture,
  depthTexture,
  idTexture
) {
  if (
    !defined(this._command) ||
    !defined(this._command.framebuffer) ||
    !this._ready ||
    !this._enabled
  ) {
    return;
  }

  this._colorTexture = colorTexture;
  this._depthTexture = depthTexture;
  this._idTexture = idTexture;

  if (!Sampler.equals(this._colorTexture.sampler, this._sampler)) {
    this._colorTexture.sampler = this._sampler;
  }

  const passState =
    this.scissorRectangle.width > 0 && this.scissorRectangle.height > 0
      ? this._passState
      : undefined;
  if (defined(passState)) {
    passState.context = context;
  }

  this._command.execute(context, passState);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see PostProcessStage#destroy
 */
PostProcessStage.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PostProcessStage#isDestroyed
 */
PostProcessStage.prototype.destroy = function () {
  releaseResources(this);
  return destroyObject(this);
};
export default PostProcessStage;
