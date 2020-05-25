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
import when from "../ThirdParty/when.js";
import PostProcessStageSampleMode from "./PostProcessStageSampleMode.js";

/**
 * Runs a post-process stage on either the texture rendered by the scene or the output of a previous post-process stage.
 * <p>
 * 对已被场景渲染的纹理进行后期处理或对上一个后期处理的结果再进行后期处理。
 * </p>
 * <p>参考：{@link https://learnopengl-cn.readthedocs.io/zh/latest/04%20Advanced%20OpenGL/05%20Framebuffers/ 帧缓冲}、{@link https://www.cnblogs.com/webgl-angela/p/9272810.html Cesium源码剖析}</p>
 *
 * @alias PostProcessStage
 * @constructor
 *
 * @param {Object} options An object with the following properties:<br/>接收对象类型参数，它的属性值如下：
 * @param {String} options.fragmentShader The fragment shader to use. The default <code>sampler2D</code> uniforms are <code>colorTexture</code> and <code>depthTexture</code>. The color texture is the output of rendering the scene or the previous stage. The depth texture is the output from rendering the scene. The shader should contain one or both uniforms. There is also a <code>vec2</code> varying named <code>v_textureCoordinates</code> that can be used to sample the textures.
 * <br/> 片段着色器代码。默认有两个全局取样器<code>uniform</code> <code>sampler2D</code>变量：<code>colorTexture</code>和<code>depthTexture</code>；其中颜色纹理（color texture）来自场景渲染的纹理或上一个后期处理，深度纹理（depth texture）来自场景的渲染纹理；着色器中必须至少要包含其中一个<code>uniform</code>。
 * <br/> 此外还必须提供<code>vec2 varying v_textureCoordinates</code>,用于纹理采样。
 * @param {Object} [options.uniforms] An object whose properties will be used to set the shaders uniforms. The properties can be constant values or a function. A constant value can also be a URI, data URI, or HTML element to use as a texture.
 * <br/> 一个对象，为片段着色器中自定义的<code>uniforms</code>变量赋对应的值。值可以是一个常量或一个函数，当为常量时也可以是一个<code>URI</code>,<code>data URI</code>或者HTML元素（作为一个纹理）。
 * @param {Number} [options.textureScale=1.0] A number in the range (0.0, 1.0] used to scale the texture dimensions. A scale of 1.0 will render this post-process stage  to a texture the size of the viewport.
 * <br/> 设置纹理尺寸的缩放，可选的范围为：(0.0, 1.0]。当为1时，此后期处理的纹理大小将与视口大小一致
 * @param {Boolean} [options.forcePowerOfTwo=false] Whether or not to force the texture dimensions to be both equal powers of two. The power of two will be the next power of two of the minimum of the dimensions.
 * <br/>强制设置纹理的尺寸为2的幂。（后面意思是关于怎么取值的，没看明白，(lll￢ω￢)）。
 * <br/>参考：{@link https://qastack.cn/gamedev/26187/why-are-textures-always-square-powers-of-two-what-if-they-arent 为什么纹理总是平方为2的幂？}、{@link https://www.zhihu.com/question/24622091 为何上传到显卡的纹理尺寸最好是2的次幂？}、{@link https://gameinstitute.qq.com/community/detail/114710 如何把WebGL显存占用减少84.2% }
 * @param {PostProcessStageSampleMode} [options.sampleMode=PostProcessStageSampleMode.NEAREST] How to sample the input color texture.
 * <br/>输入的纹理的颜色采样方式。
 * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGBA] The color pixel format of the output texture.
 * <br/>输出纹理的像素颜色格式。
 * @param {PixelDatatype} [options.pixelDatatype=PixelDatatype.UNSIGNED_BYTE] The pixel data type of the output texture.
 * <br/>输出纹理像素的数据类型。
 * @param {Color} [options.clearColor=Color.BLACK] The color to clear the output texture to.
 * <br/>清除输出纹理时的颜色。
 * @param {BoundingRectangle} [options.scissorRectangle] The rectangle to use for the scissor test.
 * <br/>设置裁剪测试的矩形区域。
 * <br/>参考：{@link https://juejin.im/post/5b3c2f8cf265da0f955ca8da OpenGL 裁剪测试及注意点}
 * @param {String} [options.name=createGuid()] The unique name of this post-process stage for reference by other stages in a composite. If a name is not supplied, a GUID will be generated.
 * <br/>指定唯一的name，可选，如果没有提供，则内部会生成一个唯一的name值。
 *
 * @exception {DeveloperError} options.textureScale must be greater than 0.0 and less than or equal to 1.0.
 * <br/>textureScale的值必须大于0.0且小于或等于1.0。
 * @exception {DeveloperError} options.pixelFormat must be a color format.
 * <br/>pixelFormat必须是一个颜色格式
 * @exception {DeveloperError} When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.
 * <br/>当pixelDatatype是<code>FLOAT</code>类型，那么需要WebGL支持<code>OES_texture_float</code>扩展。检查<code>context.floatingPointTexture</code>（没明白，(lll￢ω￢)）。
 * @see PostProcessStageComposite
 *
 * @example
 * // Simple stage to change the color
 * // 更改颜色
 * var fs =
 *     'uniform sampler2D colorTexture;\n' +
 *     'varying vec2 v_textureCoordinates;\n' +
 *     'uniform float scale;\n' +
 *     'uniform vec3 offset;\n' +
 *     'void main() {\n' +
 *     '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
 *     '    gl_FragColor = vec4(color.rgb * scale + offset, 1.0);\n' +
 *     '}\n';
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
 * // 更改选中对象的颜色
 * // If czm_selected returns true, the current fragment belongs to geometry in the selected array.
 * // 当czm_selected返回true，那么当前片段着色器应用于selected数组中的几何图形。
 * var fs =
 *     'uniform sampler2D colorTexture;\n' +
 *     'varying vec2 v_textureCoordinates;\n' +
 *     'uniform vec4 highlight;\n' +
 *     'void main() {\n' +
 *     '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
 *     '    if (czm_selected()) {\n' +
 *     '        vec3 highlighted = highlight.a * highlight.rgb + (1.0 - highlight.a) * color.rgb;\n' +
 *     '        gl_FragColor = vec4(highlighted, 1.0);\n' +
 *     '    } else { \n' +
 *     '        gl_FragColor = color;\n' +
 *     '    }\n' +
 *     '}\n';
 * var stage = scene.postProcessStages.add(new Cesium.PostProcessStage({
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
  var fragmentShader = options.fragmentShader;
  var textureScale = defaultValue(options.textureScale, 1.0);
  var pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);

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

  var passState = new PassState();
  passState.scissorTest = {
    enabled: true,
    rectangle: defined(options.scissorRectangle)
      ? BoundingRectangle.clone(options.scissorRectangle)
      : new BoundingRectangle(),
  };
  this._passState = passState;

  this._ready = false;

  var name = options.name;
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
   * <p>
   *    确定此后期处理阶段是否已准备好执行。后期处理阶段只有在<code>ready</code>和{@link PostProcessStage#enabled}都为<code>true</code>的时候才能执行。
   *    当等待纹理加载的时候,<code>ready</code>状态为<code>false</code>。
   * </p>
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
   * <p>
   *    用于在{@link PostProcessStageComposite}中与其它后期处理阶段进行区分的唯一名称。
   * </p>
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
   * <p>在此后期处理阶段执行的片段着色器代码。</p>
   * <p>
   * The shader must contain a sampler uniform declaration for <code>colorTexture</code>, <code>depthTexture</code>,
   * or both.
   * </p>
   * <p>片段着色器代码中必须包含其中一个或两个<code>uniform sampler2D</code>声明的 <code>colorTexture</code>, <code>depthTexture</code>变量。</p>
   * <p>
   * The shader must contain a <code>vec2</code> varying declaration for <code>v_textureCoordinates</code> for sampling
   * the texture uniforms.
   * </p>
   * <p>片段着色器还必须提供<code>vec2 varying v_textureCoordinates</code>,用于纹理采样</p>
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
   * <p>一个对象,它的属性名称与片段着色器中<code>uniform</code>声明的变量名称一致,并将值赋给对应的片段着色器中的<code>uniform</code>变量</p>
   * <p>
   * The object property values can be either a constant or a function. The function will be called
   * each frame before the post-process stage is executed.
   * </p>
   * <p>
   *  对象的属性值可以是一个常量或一个函数。当为一个函数时,将会在后期处理阶段执行完毕前每一帧都调用。
   * </p>
   * <p>
   * A constant value can also be a URI to an image, a data URI, or an HTML element that can be used as a texture, such as HTMLImageElement or HTMLCanvasElement.
   * </p>
   * <p>
   *  常量值也可以是一个图片的URI地址,或data URI,或一个作为纹理的HTML标签(比如<img>标签或<canvas>标签)。
   * </p>
   * <p>
   * If this post-process stage is part of a {@link PostProcessStageComposite} that does not execute in series, the constant value can also be
   * the name of another stage in a composite. This will set the uniform to the output texture the stage with that name.
   * </p>
   * <p>（不明白，(lll￢ω￢)）</p>
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
   * <br/>设置纹理尺寸的缩放，可选的范围为：(0.0, 1.0]。当为1时，此后期处理的纹理大小将与视口大小一致。
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
   * <br/>强制设置纹理的尺寸为2的幂。（后面意思是关于怎么取值的，没看明白，(lll￢ω￢)）。
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
   * <br/>输入的纹理的颜色采样方式。
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
   * <br/>输出纹理的像素颜色格式。
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
   * <br/>输出纹理像素的数据类型。
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
   * <br/>清除输出纹理时的颜色。
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
   * <br/>设置裁剪测试的矩形区域。
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
   * 获取后期处理阶段执行时的纹理
   * @memberof PostProcessStage.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  outputTexture: {
    get: function () {
      if (defined(this._textureCache)) {
        var framebuffer = this._textureCache.getFramebuffer(this._name);
        if (defined(framebuffer)) {
          return framebuffer.getColorTexture(0);
        }
      }
      return undefined;
    },
  },
  /**
   * The features selected for applying the post-process.
   * <p>给后期处理阶段使用的选中的features</p>
   * <p>
   * In the fragment shader, use <code>czm_selected</code> to determine whether or not to apply the post-process
   * stage to that fragment. For example:
   * <br/>在片段着色器中，使用<code>czm_selected</code> 判断是否可以再次后期处理阶段使用。示例如下：
   * <br/>
   * <code>
   * if (czm_selected(v_textureCoordinates)) {
   *     // apply post-process stage
   * } else {
   *     gl_FragColor = texture2D(colorTexture, v_textureCordinates);
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

var depthTextureRegex = /uniform\s+sampler2D\s+depthTexture/g;

/**
 * @private
 */
PostProcessStage.prototype._isSupported = function (context) {
  return !depthTextureRegex.test(this._fragmentShader) || context.depthTexture;
};

function getUniformValueGetterAndSetter(stage, uniforms, name) {
  var currentValue = uniforms[name];
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
      var currentValue = uniforms[name];
      uniforms[name] = value;

      var actualUniforms = stage._actualUniforms;
      var actualValue = actualUniforms[name];
      if (
        defined(actualValue) &&
        actualValue !== currentValue &&
        actualValue instanceof Texture &&
        !defined(stage._textureCache.getStageByName(name))
      ) {
        stage._texturesToRelease.push(actualValue);
        delete actualUniforms[name];
        delete actualUniforms[name + "Dimensions"];
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
    var value = stage._actualUniforms[name];
    if (typeof value === "function") {
      return value();
    }
    return value;
  };
}

function getUniformMapDimensionsFunction(uniformMap, name) {
  return function () {
    var texture = uniformMap[name]();
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

  var uniformMap = {};
  var newUniforms = {};
  var uniforms = stage._uniforms;
  var actualUniforms = stage._actualUniforms;
  for (var name in uniforms) {
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

      var value = uniformMap[name]();
      if (
        typeof value === "string" ||
        value instanceof Texture ||
        value instanceof HTMLImageElement ||
        value instanceof HTMLCanvasElement ||
        value instanceof HTMLVideoElement
      ) {
        uniformMap[name + "Dimensions"] = getUniformMapDimensionsFunction(
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

  var fs = stage._fragmentShader;
  if (defined(stage._selectedIdTexture)) {
    var width = stage._selectedIdTexture.width;

    fs = fs.replace(/varying\s+vec2\s+v_textureCoordinates;/g, "");
    fs =
      "#define CZM_SELECTED_FEATURE \n" +
      "uniform sampler2D czm_idTexture; \n" +
      "uniform sampler2D czm_selectedIdTexture; \n" +
      "uniform float czm_selectedIdTextureStep; \n" +
      "varying vec2 v_textureCoordinates; \n" +
      "bool czm_selected(vec2 offset) \n" +
      "{ \n" +
      "    bool selected = false;\n" +
      "    vec4 id = texture2D(czm_idTexture, v_textureCoordinates + offset); \n" +
      "    for (int i = 0; i < " +
      width +
      "; ++i) \n" +
      "    { \n" +
      "        vec4 selectedId = texture2D(czm_selectedIdTexture, vec2((float(i) + 0.5) * czm_selectedIdTextureStep, 0.5)); \n" +
      "        if (all(equal(id, selectedId))) \n" +
      "        { \n" +
      "            return true; \n" +
      "        } \n" +
      "    } \n" +
      "    return false; \n" +
      "} \n\n" +
      "bool czm_selected() \n" +
      "{ \n" +
      "    return czm_selected(vec2(0.0)); \n" +
      "} \n\n" +
      fs;
  }

  var fragmentShader = new ShaderSource({
    defines: [stage._useLogDepth ? "LOG_DEPTH" : ""],
    sources: [fs],
  });
  stage._command = context.createViewportQuadCommand(fragmentShader, {
    uniformMap: stage._uniformMap,
    owner: stage,
  });
}

function createSampler(stage) {
  var mode = stage._sampleMode;

  var minFilter;
  var magFilter;

  if (mode === PostProcessStageSampleMode.LINEAR) {
    minFilter = TextureMinificationFilter.LINEAR;
    magFilter = TextureMagnificationFilter.LINEAR;
  } else {
    minFilter = TextureMinificationFilter.NEAREST;
    magFilter = TextureMagnificationFilter.NEAREST;
  }

  var sampler = stage._sampler;
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
  var i;
  var texture;
  var name;

  var texturesToRelease = stage._texturesToRelease;
  var length = texturesToRelease.length;
  for (i = 0; i < length; ++i) {
    texture = texturesToRelease[i];
    texture = texture && texture.destroy();
  }
  texturesToRelease.length = 0;

  var texturesToCreate = stage._texturesToCreate;
  length = texturesToCreate.length;
  for (i = 0; i < length; ++i) {
    var textureToCreate = texturesToCreate[i];
    name = textureToCreate.name;
    var source = textureToCreate.source;
    stage._actualUniforms[name] = new Texture({
      context: context,
      source: source,
    });
  }
  texturesToCreate.length = 0;

  var dirtyUniforms = stage._dirtyUniforms;
  if (dirtyUniforms.length === 0 && !defined(stage._texturePromise)) {
    stage._ready = true;
    return;
  }

  if (dirtyUniforms.length === 0 || defined(stage._texturePromise)) {
    return;
  }

  length = dirtyUniforms.length;
  var uniforms = stage._uniforms;
  var promises = [];
  for (i = 0; i < length; ++i) {
    name = dirtyUniforms[i];
    var stageNameUrlOrImage = uniforms[name];
    var stageWithName = stage._textureCache.getStageByName(stageNameUrlOrImage);
    if (defined(stageWithName)) {
      stage._actualUniforms[name] = createStageOutputTextureFunction(
        stage,
        stageNameUrlOrImage
      );
    } else if (typeof stageNameUrlOrImage === "string") {
      var resource = new Resource({
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
    stage._texturePromise = when.all(promises).then(function () {
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

  var textureCache = stage._textureCache;
  if (!defined(textureCache)) {
    return;
  }

  var uniforms = stage._uniforms;
  var actualUniforms = stage._actualUniforms;
  for (var name in actualUniforms) {
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
  var length = defined(stage._selected) ? stage._selected.length : 0;
  var parentLength = defined(stage._parentSelected) ? stage._parentSelected : 0;
  var dirty =
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
    for (var i = 0; i < length; ++i) {
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

  var features = stage._combinedSelected;
  if (!defined(features)) {
    return;
  }

  var i;
  var feature;

  var textureLength = 0;
  var length = features.length;
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
    var empty = new Uint8Array(4);
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

  var pickColor;
  var offset = 0;
  var ids = new Uint8Array(textureLength * 4);
  for (i = 0; i < length; ++i) {
    feature = features[i];
    if (defined(feature.pickIds)) {
      var pickIds = feature.pickIds;
      var pickIdsLength = pickIds.length;
      for (var j = 0; j < pickIdsLength; ++j) {
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
 * <br/>在执行前调用，用于加载任何纹理和WebGL资源。
 * @param {Context} context The context.
 * @param {Boolean} useLogDepth Whether the scene uses a logarithmic depth buffer.
 * <br/>场景中是否使用对数深度缓冲。
 * <br/>参考：{@link https://www.dazhuanlan.com/2019/09/25/5d8b48b9e235f/ 混合多视锥的对数深度缓冲}
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

  var framebuffer = this._textureCache.getFramebuffer(this._name);
  this._command.framebuffer = framebuffer;

  if (!defined(framebuffer)) {
    return;
  }

  var colorTexture = framebuffer.getColorTexture(0);
  var renderState;
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
 * <br/>执行后期处理。颜色纹理（color texture）来自于场景中渲染的纹理或上一个后期处理。
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

  var passState =
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
 * 判定是否已销毁，true为已销毁，否则未销毁。
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 * <p>
 *  如果已销毁，就不要再调用任何方法；否则将会出现{@link DeveloperError}错误
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.<br/>已销毁返回true,否则返回false。
 *
 * @see PostProcessStage#destroy
 */
PostProcessStage.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br/>销毁WebGL资源（主动销毁，而不依赖垃圾回收）。
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 * <p>
 *  如果已销毁，就不要再调用任何方法；否则将会出现{@link DeveloperError}错误。返回<code>undefined</code>意味着对象已被销毁。
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
