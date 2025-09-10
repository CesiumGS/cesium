import Cartesian2 from "../Core/Cartesian2.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import createGuid from "../Core/createGuid.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import loadKTX2 from "../Core/loadKTX2.js";
import Matrix2 from "../Core/Matrix2.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import CubeMap from "../Renderer/CubeMap.js";
import Texture from "../Renderer/Texture.js";
import AspectRampMaterial from "../Shaders/Materials/AspectRampMaterial.js";
import BumpMapMaterial from "../Shaders/Materials/BumpMapMaterial.js";
import CheckerboardMaterial from "../Shaders/Materials/CheckerboardMaterial.js";
import DotMaterial from "../Shaders/Materials/DotMaterial.js";
import ElevationBandMaterial from "../Shaders/Materials/ElevationBandMaterial.js";
import ElevationContourMaterial from "../Shaders/Materials/ElevationContourMaterial.js";
import ElevationRampMaterial from "../Shaders/Materials/ElevationRampMaterial.js";
import FadeMaterial from "../Shaders/Materials/FadeMaterial.js";
import GridMaterial from "../Shaders/Materials/GridMaterial.js";
import NormalMapMaterial from "../Shaders/Materials/NormalMapMaterial.js";
import PolylineArrowMaterial from "../Shaders/Materials/PolylineArrowMaterial.js";
import PolylineDashMaterial from "../Shaders/Materials/PolylineDashMaterial.js";
import PolylineGlowMaterial from "../Shaders/Materials/PolylineGlowMaterial.js";
import PolylineOutlineMaterial from "../Shaders/Materials/PolylineOutlineMaterial.js";
import RimLightingMaterial from "../Shaders/Materials/RimLightingMaterial.js";
import Sampler from "../Renderer/Sampler.js";
import SlopeRampMaterial from "../Shaders/Materials/SlopeRampMaterial.js";
import StripeMaterial from "../Shaders/Materials/StripeMaterial.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import WaterMaskMaterial from "../Shaders/Materials/WaterMaskMaterial.js";
import WaterMaterial from "../Shaders/Materials/Water.js";

/**
 * A Material defines surface appearance through a combination of diffuse, specular,
 * normal, emission, and alpha components. These values are specified using a
 * JSON schema called Fabric which gets parsed and assembled into glsl shader code
 * behind-the-scenes. Check out the {@link https://github.com/CesiumGS/cesium/wiki/Fabric|wiki page}
 * for more details on Fabric.
 * <br /><br />
 * <style type="text/css">
 *  #materialDescriptions code {
 *      font-weight: normal;
 *      font-family: Consolas, 'Lucida Console', Monaco, monospace;
 *      color: #A35A00;
 *  }
 *  #materialDescriptions ul, #materialDescriptions ul ul {
 *      list-style-type: none;
 *  }
 *  #materialDescriptions ul ul {
 *      margin-bottom: 10px;
 *  }
 *  #materialDescriptions ul ul li {
 *      font-weight: normal;
 *      color: #000000;
 *      text-indent: -2em;
 *      margin-left: 2em;
 *  }
 *  #materialDescriptions ul li {
 *      font-weight: bold;
 *      color: #0053CF;
 *  }
 * </style>
 *
 * Base material types and their uniforms:
 * <div id='materialDescriptions'>
 * <ul>
 *  <li>Color</li>
 *  <ul>
 *      <li><code>color</code>:  rgba color object.</li>
 *  </ul>
 *  <li>Image</li>
 *  <ul>
 *      <li><code>image</code>:  path to image.</li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of times to repeat the image.</li>
 *  </ul>
 *  <li>DiffuseMap</li>
 *  <ul>
 *      <li><code>image</code>:  path to image.</li>
 *      <li><code>channels</code>:  Three character string containing any combination of r, g, b, and a for selecting the desired image channels.</li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of times to repeat the image.</li>
 *  </ul>
 *  <li>AlphaMap</li>
 *  <ul>
 *      <li><code>image</code>:  path to image.</li>
 *      <li><code>channel</code>:  One character string containing r, g, b, or a for selecting the desired image channel. </li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of times to repeat the image.</li>
 *  </ul>
 *  <li>SpecularMap</li>
 *  <ul>
 *      <li><code>image</code>: path to image.</li>
 *      <li><code>channel</code>: One character string containing r, g, b, or a for selecting the desired image channel. </li>
 *      <li><code>repeat</code>: Object with x and y values specifying the number of times to repeat the image.</li>
 *  </ul>
 *  <li>EmissionMap</li>
 *  <ul>
 *      <li><code>image</code>:  path to image.</li>
 *      <li><code>channels</code>:  Three character string containing any combination of r, g, b, and a for selecting the desired image channels. </li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of times to repeat the image.</li>
 *  </ul>
 *  <li>BumpMap</li>
 *  <ul>
 *      <li><code>image</code>:  path to image.</li>
 *      <li><code>channel</code>:  One character string containing r, g, b, or a for selecting the desired image channel. </li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of times to repeat the image.</li>
 *      <li><code>strength</code>:  Bump strength value between 0.0 and 1.0 where 0.0 is small bumps and 1.0 is large bumps.</li>
 *  </ul>
 *  <li>NormalMap</li>
 *  <ul>
 *      <li><code>image</code>:  path to image.</li>
 *      <li><code>channels</code>:  Three character string containing any combination of r, g, b, and a for selecting the desired image channels. </li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of times to repeat the image.</li>
 *      <li><code>strength</code>:  Bump strength value between 0.0 and 1.0 where 0.0 is small bumps and 1.0 is large bumps.</li>
 *  </ul>
 *  <li>Grid</li>
 *  <ul>
 *      <li><code>color</code>:  rgba color object for the whole material.</li>
 *      <li><code>cellAlpha</code>: Alpha value for the cells between grid lines.  This will be combined with color.alpha.</li>
 *      <li><code>lineCount</code>:  Object with x and y values specifying the number of columns and rows respectively.</li>
 *      <li><code>lineThickness</code>:  Object with x and y values specifying the thickness of grid lines (in pixels where available).</li>
 *      <li><code>lineOffset</code>:  Object with x and y values specifying the offset of grid lines (range is 0 to 1).</li>
 *  </ul>
 *  <li>Stripe</li>
 *  <ul>
 *      <li><code>horizontal</code>:  Boolean that determines if the stripes are horizontal or vertical.</li>
 *      <li><code>evenColor</code>:  rgba color object for the stripe's first color.</li>
 *      <li><code>oddColor</code>:  rgba color object for the stripe's second color.</li>
 *      <li><code>offset</code>:  Number that controls at which point into the pattern to begin drawing; with 0.0 being the beginning of the even color, 1.0 the beginning of the odd color, 2.0 being the even color again, and any multiple or fractional values being in between.</li>
 *      <li><code>repeat</code>:  Number that controls the total number of stripes, half light and half dark.</li>
 *  </ul>
 *  <li>Checkerboard</li>
 *  <ul>
 *      <li><code>lightColor</code>:  rgba color object for the checkerboard's light alternating color.</li>
 *      <li><code>darkColor</code>: rgba color object for the checkerboard's dark alternating color.</li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of columns and rows respectively.</li>
 *  </ul>
 *  <li>Dot</li>
 *  <ul>
 *      <li><code>lightColor</code>:  rgba color object for the dot color.</li>
 *      <li><code>darkColor</code>:  rgba color object for the background color.</li>
 *      <li><code>repeat</code>:  Object with x and y values specifying the number of columns and rows of dots respectively.</li>
 *  </ul>
 *  <li>Water</li>
 *  <ul>
 *      <li><code>baseWaterColor</code>:  rgba color object base color of the water.</li>
 *      <li><code>blendColor</code>:  rgba color object used when blending from water to non-water areas.</li>
 *      <li><code>specularMap</code>:  Single channel texture used to indicate areas of water.</li>
 *      <li><code>normalMap</code>:  Normal map for water normal perturbation.</li>
 *      <li><code>frequency</code>:  Number that controls the number of waves.</li>
 *      <li><code>animationSpeed</code>:  Number that controls the animations speed of the water.</li>
 *      <li><code>amplitude</code>:  Number that controls the amplitude of water waves.</li>
 *      <li><code>specularIntensity</code>:  Number that controls the intensity of specular reflections.</li>
 *  </ul>
 *  <li>RimLighting</li>
 *  <ul>
 *      <li><code>color</code>:  diffuse color and alpha.</li>
 *      <li><code>rimColor</code>:  diffuse color and alpha of the rim.</li>
 *      <li><code>width</code>:  Number that determines the rim's width.</li>
 *  </ul>
 *  <li>Fade</li>
 *  <ul>
 *      <li><code>fadeInColor</code>: diffuse color and alpha at <code>time</code></li>
 *      <li><code>fadeOutColor</code>: diffuse color and alpha at <code>maximumDistance</code> from <code>time</code></li>
 *      <li><code>maximumDistance</code>: Number between 0.0 and 1.0 where the <code>fadeInColor</code> becomes the <code>fadeOutColor</code>. A value of 0.0 gives the entire material a color of <code>fadeOutColor</code> and a value of 1.0 gives the the entire material a color of <code>fadeInColor</code></li>
 *      <li><code>repeat</code>: true if the fade should wrap around the texture coodinates.</li>
 *      <li><code>fadeDirection</code>: Object with x and y values specifying if the fade should be in the x and y directions.</li>
 *      <li><code>time</code>: Object with x and y values between 0.0 and 1.0 of the <code>fadeInColor</code> position</li>
 *  </ul>
 *  <li>PolylineArrow</li>
 *  <ul>
 *      <li><code>color</code>: diffuse color and alpha.</li>
 *  </ul>
 *  <li>PolylineDash</li>
 *  <ul>
 *      <li><code>color</code>: color for the line.</li>
 *      <li><code>gapColor</code>: color for the gaps in the line.</li>
 *      <li><code>dashLength</code>: Dash length in pixels.</li>
 *      <li><code>dashPattern</code>: The 16 bit stipple pattern for the line..</li>
 *  </ul>
 *  <li>PolylineGlow</li>
 *  <ul>
 *      <li><code>color</code>: color and maximum alpha for the glow on the line.</li>
 *      <li><code>glowPower</code>: strength of the glow, as a percentage of the total line width (less than 1.0).</li>
 *      <li><code>taperPower</code>: strength of the tapering effect, as a percentage of the total line length.  If 1.0 or higher, no taper effect is used.</li>
 *  </ul>
 *  <li>PolylineOutline</li>
 *  <ul>
 *      <li><code>color</code>: diffuse color and alpha for the interior of the line.</li>
 *      <li><code>outlineColor</code>: diffuse color and alpha for the outline.</li>
 *      <li><code>outlineWidth</code>: width of the outline in pixels.</li>
 *  </ul>
 *  <li>ElevationContour</li>
 *  <ul>
 *      <li><code>color</code>: color and alpha for the contour line.</li>
 *      <li><code>spacing</code>: spacing for contour lines in meters.</li>
 *      <li><code>width</code>: Number specifying the width of the grid lines in pixels.</li>
 *  </ul>
 *  <li>ElevationRamp</li>
 *  <ul>
 *      <li><code>image</code>: color ramp image to use for coloring the terrain.</li>
 *      <li><code>minimumHeight</code>: minimum height for the ramp.</li>
 *      <li><code>maximumHeight</code>: maximum height for the ramp.</li>
 *  </ul>
 *  <li>SlopeRamp</li>
 *  <ul>
 *      <li><code>image</code>: color ramp image to use for coloring the terrain by slope.</li>
 *  </ul>
 *  <li>AspectRamp</li>
 *  <ul>
 *      <li><code>image</code>: color ramp image to use for color the terrain by aspect.</li>
 *  </ul>
 *  <li>ElevationBand</li>
 *  <ul>
 *      <li><code>heights</code>: image of heights sorted from lowest to highest.</li>
 *      <li><code>colors</code>: image of colors at the corresponding heights.</li>
 * </ul>
 * <li>WaterMask</li>
 * <ul>
 *      <li><code>waterColor</code>: diffuse color and alpha for the areas covered by water.</li>
 *      <li><code>landColor</code>: diffuse color and alpha for the areas covered by land.</li>
 * </ul>
 * </ul>
 * </ul>
 * </div>
 *
 * @alias Material
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.strict=false] Throws errors for issues that would normally be ignored, including unused uniforms or materials.
 * @param {boolean|Function} [options.translucent=true] When <code>true</code> or a function that returns <code>true</code>, the geometry
 *                           with this material is expected to appear translucent.
 * @param {TextureMinificationFilter} [options.minificationFilter=TextureMinificationFilter.LINEAR] The {@link TextureMinificationFilter} to apply to this material's textures.
 * @param {TextureMagnificationFilter} [options.magnificationFilter=TextureMagnificationFilter.LINEAR] The {@link TextureMagnificationFilter} to apply to this material's textures.
 * @param {object} options.fabric The fabric JSON used to generate the material.
 *
 * @exception {DeveloperError} fabric: uniform has invalid type.
 * @exception {DeveloperError} fabric: uniforms and materials cannot share the same property.
 * @exception {DeveloperError} fabric: cannot have source and components in the same section.
 * @exception {DeveloperError} fabric: property name is not valid. It should be 'type', 'materials', 'uniforms', 'components', or 'source'.
 * @exception {DeveloperError} fabric: property name is not valid. It should be 'diffuse', 'specular', 'shininess', 'normal', 'emission', or 'alpha'.
 * @exception {DeveloperError} strict: shader source does not use string.
 * @exception {DeveloperError} strict: shader source does not use uniform.
 * @exception {DeveloperError} strict: shader source does not use material.
 *
 * @see {@link https://github.com/CesiumGS/cesium/wiki/Fabric|Fabric wiki page} for a more detailed options of Fabric.
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Materials.html|Cesium Sandcastle Materials Demo}
 *
 * @example
 * // Create a color material with fromType:
 * polygon.material = Cesium.Material.fromType('Color');
 * polygon.material.uniforms.color = new Cesium.Color(1.0, 1.0, 0.0, 1.0);
 *
 * // Create the default material:
 * polygon.material = new Cesium.Material();
 *
 * // Create a color material with full Fabric notation:
 * polygon.material = new Cesium.Material({
 *   fabric: {
 *     type: 'Color',
 *     uniforms: {
 *       color: new Cesium.Color(1.0, 1.0, 0.0, 1.0)
 *     }
 *   }
 * });
 */
function Material(options) {
  /**
   * The material type. Can be an existing type or a new type. If no type is specified in fabric, type is a GUID.
   * @type {string}
   * @default undefined
   */
  this.type = undefined;

  /**
   * The glsl shader source for this material.
   * @type {string}
   * @default undefined
   */
  this.shaderSource = undefined;

  /**
   * Maps sub-material names to Material objects.
   * @type {object}
   * @default undefined
   */
  this.materials = undefined;

  /**
   * Maps uniform names to their values.
   * @type {object}
   * @default undefined
   */
  this.uniforms = undefined;
  this._uniforms = undefined;

  /**
   * When <code>true</code> or a function that returns <code>true</code>,
   * the geometry is expected to appear translucent.
   * @type {boolean|Function}
   * @default undefined
   */
  this.translucent = undefined;

  this._minificationFilter =
    options.minificationFilter ?? TextureMinificationFilter.LINEAR;
  this._magnificationFilter =
    options.magnificationFilter ?? TextureMagnificationFilter.LINEAR;

  this._strict = undefined;
  this._template = undefined;
  this._count = undefined;

  this._texturePaths = {};
  this._loadedImages = [];
  this._loadedCubeMaps = [];

  this._textures = {};

  this._updateFunctions = [];

  this._defaultTexture = undefined;

  /**
   * Any and all promises that are created when initializing the material.
   * Examples: loading images and cubemaps.
   *
   * @type {Promise[]}
   * @private
   */
  this._initializationPromises = [];

  /**
   * An error that occurred in async operations during material initialization.
   * Only one error is stored.
   *
   * @type {Error|undefined}
   * @private
   */
  this._initializationError = undefined;

  initializeMaterial(options, this);
  Object.defineProperties(this, {
    type: {
      value: this.type,
      writable: false,
    },

    /**
     * The {@link TextureMinificationFilter} to apply to this material's textures.
     * @type {TextureMinificationFilter}
     * @default TextureMinificationFilter.LINEAR
     */
    minificationFilter: {
      get: function () {
        return this._minificationFilter;
      },
      set: function (value) {
        this._minificationFilter = value;
      },
    },

    /**
     * The {@link TextureMagnificationFilter} to apply to this material's textures.
     * @type {TextureMagnificationFilter}
     * @default TextureMagnificationFilter.LINEAR
     */
    magnificationFilter: {
      get: function () {
        return this._magnificationFilter;
      },
      set: function (value) {
        this._magnificationFilter = value;
      },
    },
  });

  if (!defined(Material._uniformList[this.type])) {
    Material._uniformList[this.type] = Object.keys(this._uniforms);
  }
}

// Cached list of combined uniform names indexed by type.
// Used to get the list of uniforms in the same order.
Material._uniformList = {};

/**
 * Creates a new material using an existing material type.
 * <br /><br />
 * Shorthand for: new Material({fabric : {type : type}});
 *
 * @param {string} type The base material type.
 * @param {object} [uniforms] Overrides for the default uniforms.
 * @returns {Material} New material object.
 *
 * @exception {DeveloperError} material with that type does not exist.
 *
 * @example
 * const material = Cesium.Material.fromType('Color', {
 *   color: new Cesium.Color(1.0, 0.0, 0.0, 1.0)
 * });
 */
Material.fromType = function (type, uniforms) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(Material._materialCache.getMaterial(type))) {
    throw new DeveloperError(`material with type '${type}' does not exist.`);
  }
  //>>includeEnd('debug');

  const material = new Material({
    fabric: {
      type: type,
    },
  });

  if (defined(uniforms)) {
    for (const name in uniforms) {
      if (uniforms.hasOwnProperty(name)) {
        material.uniforms[name] = uniforms[name];
      }
    }
  }

  return material;
};

/**
 * Creates a new material using an existing material type and returns a promise that resolves when
 * all of the material's resources have been loaded.
 *
 * @param {string} type The base material type.
 * @param {object} [uniforms] Overrides for the default uniforms.
 * @returns {Promise<Material>} A promise that resolves to a new material object when all resources are loaded.
 *
 * @exception {DeveloperError} material with that type does not exist.
 *
 * @example
 * const material = await Cesium.Material.fromTypeAsync('Image', {
 *    image: '../Images/Cesium_Logo_overlay.png'
 * });
 */
Material.fromTypeAsync = async function (type, uniforms) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(Material._materialCache.getMaterial(type))) {
    throw new DeveloperError(`material with type '${type}' does not exist.`);
  }
  //>>includeEnd('debug');

  const initializationPromises = [];
  // Unlike Material.fromType, we need to specify the uniforms in the Material constructor up front,
  // or else anything that needs to be async loaded won't be kicked off until the next Update call.
  const material = new Material({
    fabric: {
      type: type,
      uniforms: uniforms,
    },
  });

  // Recursively collect initialization promises for this material and its submaterials.
  getInitializationPromises(material, initializationPromises);
  await Promise.all(initializationPromises);
  initializationPromises.length = 0;

  if (defined(material._initializationError)) {
    throw material._initializationError;
  }

  return material;
};

/**
 * Recursively traverses the material and its submaterials to collect all initialization promises.
 * @param {Material} material The material to traverse.
 * @param {Promise[]} initializationPromises The array to collect promises into.
 *
 * @private
 */
function getInitializationPromises(material, initializationPromises) {
  initializationPromises.push(...material._initializationPromises);
  const submaterials = material.materials;
  for (const name in submaterials) {
    if (submaterials.hasOwnProperty(name)) {
      const submaterial = submaterials[name];
      getInitializationPromises(submaterial, initializationPromises);
    }
  }
}

/**
 * Gets whether or not this material is translucent.
 * @returns {boolean} <code>true</code> if this material is translucent, <code>false</code> otherwise.
 */
Material.prototype.isTranslucent = function () {
  if (defined(this.translucent)) {
    if (typeof this.translucent === "function") {
      return this.translucent();
    }

    return this.translucent;
  }

  let translucent = true;
  const funcs = this._translucentFunctions;
  const length = funcs.length;
  for (let i = 0; i < length; ++i) {
    const func = funcs[i];
    if (typeof func === "function") {
      translucent = translucent && func();
    } else {
      translucent = translucent && func;
    }

    if (!translucent) {
      break;
    }
  }
  return translucent;
};

/**
 * @private
 */
Material.prototype.update = function (context) {
  this._defaultTexture = context.defaultTexture;

  let i;
  let uniformId;

  const loadedImages = this._loadedImages;
  let length = loadedImages.length;
  for (i = 0; i < length; ++i) {
    const loadedImage = loadedImages[i];
    uniformId = loadedImage.id;
    let image = loadedImage.image;

    // Images transcoded from KTX2 can contain multiple mip levels:
    // https://github.khronos.org/KTX-Specification/#_mip_level_array
    let mipLevels;
    if (Array.isArray(image)) {
      // highest detail mip should be level 0
      mipLevels = image.slice(1, image.length).map(function (mipLevel) {
        return mipLevel.bufferView;
      });
      image = image[0];
    }

    const sampler = new Sampler({
      minificationFilter: this._minificationFilter,
      magnificationFilter: this._magnificationFilter,
    });

    let texture;
    if (defined(image.internalFormat)) {
      texture = new Texture({
        context: context,
        pixelFormat: image.internalFormat,
        width: image.width,
        height: image.height,
        source: {
          arrayBufferView: image.bufferView,
          mipLevels: mipLevels,
        },
        sampler: sampler,
      });
    } else {
      texture = new Texture({
        context: context,
        source: image,
        sampler: sampler,
      });
    }

    // The material destroys its old texture only after the new one has been loaded.
    // This will ensure a smooth swap of textures and prevent the default texture
    // from appearing for a few frames.
    const oldTexture = this._textures[uniformId];
    if (defined(oldTexture) && oldTexture !== this._defaultTexture) {
      oldTexture.destroy();
    }

    this._textures[uniformId] = texture;

    const uniformDimensionsName = `${uniformId}Dimensions`;
    if (this.uniforms.hasOwnProperty(uniformDimensionsName)) {
      const uniformDimensions = this.uniforms[uniformDimensionsName];
      uniformDimensions.x = texture._width;
      uniformDimensions.y = texture._height;
    }
  }

  loadedImages.length = 0;

  const loadedCubeMaps = this._loadedCubeMaps;
  length = loadedCubeMaps.length;

  for (i = 0; i < length; ++i) {
    const loadedCubeMap = loadedCubeMaps[i];
    uniformId = loadedCubeMap.id;
    const images = loadedCubeMap.images;

    const cubeMap = new CubeMap({
      context: context,
      source: {
        positiveX: images[0],
        negativeX: images[1],
        positiveY: images[2],
        negativeY: images[3],
        positiveZ: images[4],
        negativeZ: images[5],
      },
      sampler: new Sampler({
        minificationFilter: this._minificationFilter,
        magnificationFilter: this._magnificationFilter,
      }),
    });

    this._textures[uniformId] = cubeMap;
  }

  loadedCubeMaps.length = 0;

  const updateFunctions = this._updateFunctions;
  length = updateFunctions.length;
  for (i = 0; i < length; ++i) {
    updateFunctions[i](this, context);
  }

  const subMaterials = this.materials;
  for (const name in subMaterials) {
    if (subMaterials.hasOwnProperty(name)) {
      subMaterials[name].update(context);
    }
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see Material#destroy
 */
Material.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * material = material && material.destroy();
 *
 * @see Material#isDestroyed
 */
Material.prototype.destroy = function () {
  const textures = this._textures;
  for (const texture in textures) {
    if (textures.hasOwnProperty(texture)) {
      const instance = textures[texture];
      if (instance !== this._defaultTexture) {
        instance.destroy();
      }
    }
  }

  const materials = this.materials;
  for (const material in materials) {
    if (materials.hasOwnProperty(material)) {
      materials[material].destroy();
    }
  }
  return destroyObject(this);
};

function initializeMaterial(options, result) {
  options = options ?? Frozen.EMPTY_OBJECT;
  result._strict = options.strict ?? false;
  result._count = options.count ?? 0;
  result._template = clone(options.fabric ?? Frozen.EMPTY_OBJECT);
  result.fabric = clone(options.fabric ?? Frozen.EMPTY_OBJECT);
  result._template.uniforms = clone(
    result._template.uniforms ?? Frozen.EMPTY_OBJECT,
  );
  result._template.materials = clone(
    result._template.materials ?? Frozen.EMPTY_OBJECT,
  );

  result.type = defined(result._template.type)
    ? result._template.type
    : createGuid();

  result.shaderSource = "";
  result.materials = {};
  result.uniforms = {};
  result._uniforms = {};
  result._translucentFunctions = [];

  let translucent;

  // If the cache contains this material type, build the material template off of the stored template.
  const cachedMaterial = Material._materialCache.getMaterial(result.type);
  if (defined(cachedMaterial)) {
    const template = clone(cachedMaterial.fabric, true);
    result._template = combine(result._template, template, true);
    translucent = cachedMaterial.translucent;
  }

  // Make sure the template has no obvious errors. More error checking happens later.
  checkForTemplateErrors(result);

  createMethodDefinition(result);
  createUniforms(result);
  createSubMaterials(result);

  // If the material has a new type, add it to the cache.
  if (!defined(cachedMaterial)) {
    Material._materialCache.addMaterial(result.type, result);
  }

  const defaultTranslucent =
    result._translucentFunctions.length === 0 ? true : undefined;
  translucent = translucent ?? defaultTranslucent;
  translucent = options.translucent ?? translucent;

  if (defined(translucent)) {
    if (typeof translucent === "function") {
      const wrappedTranslucent = function () {
        return translucent(result);
      };
      result._translucentFunctions.push(wrappedTranslucent);
    } else {
      result._translucentFunctions.push(translucent);
    }
  }
}

function checkForValidProperties(object, properties, result, throwNotFound) {
  if (defined(object)) {
    for (const property in object) {
      if (object.hasOwnProperty(property)) {
        const hasProperty = properties.indexOf(property) !== -1;
        if (
          (throwNotFound && !hasProperty) ||
          (!throwNotFound && hasProperty)
        ) {
          result(property, properties);
        }
      }
    }
  }
}

function invalidNameError(property, properties) {
  //>>includeStart('debug', pragmas.debug);
  let errorString = `fabric: property name '${property}' is not valid. It should be `;
  for (let i = 0; i < properties.length; i++) {
    const propertyName = `'${properties[i]}'`;
    errorString +=
      i === properties.length - 1 ? `or ${propertyName}.` : `${propertyName}, `;
  }
  throw new DeveloperError(errorString);
  //>>includeEnd('debug');
}

function duplicateNameError(property, properties) {
  //>>includeStart('debug', pragmas.debug);
  const errorString = `fabric: uniforms and materials cannot share the same property '${property}'`;
  throw new DeveloperError(errorString);
  //>>includeEnd('debug');
}

const templateProperties = [
  "type",
  "materials",
  "uniforms",
  "components",
  "source",
];
const componentProperties = [
  "diffuse",
  "specular",
  "shininess",
  "normal",
  "emission",
  "alpha",
];

function checkForTemplateErrors(material) {
  const template = material._template;
  const uniforms = template.uniforms;
  const materials = template.materials;
  const components = template.components;

  // Make sure source and components do not exist in the same template.
  //>>includeStart('debug', pragmas.debug);
  if (defined(components) && defined(template.source)) {
    throw new DeveloperError(
      "fabric: cannot have source and components in the same template.",
    );
  }
  //>>includeEnd('debug');

  // Make sure all template and components properties are valid.
  checkForValidProperties(template, templateProperties, invalidNameError, true);
  checkForValidProperties(
    components,
    componentProperties,
    invalidNameError,
    true,
  );

  // Make sure uniforms and materials do not share any of the same names.
  const materialNames = [];
  for (const property in materials) {
    if (materials.hasOwnProperty(property)) {
      materialNames.push(property);
    }
  }
  checkForValidProperties(uniforms, materialNames, duplicateNameError, false);
}

function isMaterialFused(shaderComponent, material) {
  const materials = material._template.materials;
  for (const subMaterialId in materials) {
    if (materials.hasOwnProperty(subMaterialId)) {
      if (shaderComponent.indexOf(subMaterialId) > -1) {
        return true;
      }
    }
  }

  return false;
}

// Create the czm_getMaterial method body using source or components.
function createMethodDefinition(material) {
  const components = material._template.components;
  const source = material._template.source;
  if (defined(source)) {
    material.shaderSource += `${source}\n`;
  } else {
    material.shaderSource +=
      "czm_material czm_getMaterial(czm_materialInput materialInput)\n{\n";
    material.shaderSource +=
      "czm_material material = czm_getDefaultMaterial(materialInput);\n";
    if (defined(components)) {
      const isMultiMaterial =
        Object.keys(material._template.materials).length > 0;
      for (const component in components) {
        if (components.hasOwnProperty(component)) {
          if (component === "diffuse" || component === "emission") {
            const isFusion =
              isMultiMaterial &&
              isMaterialFused(components[component], material);
            const componentSource = isFusion
              ? components[component]
              : `czm_gammaCorrect(${components[component]})`;
            material.shaderSource += `material.${component} = ${componentSource}; \n`;
          } else if (component === "alpha") {
            material.shaderSource += `material.alpha = ${components.alpha}; \n`;
          } else {
            material.shaderSource += `material.${component} = ${components[component]};\n`;
          }
        }
      }
    }
    material.shaderSource += "return material;\n}\n";
  }
}

const matrixMap = {
  mat2: Matrix2,
  mat3: Matrix3,
  mat4: Matrix4,
};

const ktx2Regex = /\.ktx2$/i;

function createTexture2DUpdateFunction(uniformId) {
  let oldUniformValue;
  return function (material, context) {
    const uniforms = material.uniforms;
    const uniformValue = uniforms[uniformId];
    const uniformChanged = oldUniformValue !== uniformValue;
    const uniformValueIsDefaultImage =
      !defined(uniformValue) || uniformValue === Material.DefaultImageId;
    oldUniformValue = uniformValue;

    let texture = material._textures[uniformId];
    let uniformDimensionsName;
    let uniformDimensions;

    if (uniformValue instanceof HTMLVideoElement) {
      // HTMLVideoElement.readyState >=2 means we have enough data for the current frame.
      // See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
      if (uniformValue.readyState >= 2) {
        if (uniformChanged && defined(texture)) {
          if (texture !== context.defaultTexture) {
            texture.destroy();
          }
          texture = undefined;
        }

        if (!defined(texture) || texture === context.defaultTexture) {
          const sampler = new Sampler({
            minificationFilter: material._minificationFilter,
            magnificationFilter: material._magnificationFilter,
          });
          texture = new Texture({
            context: context,
            source: uniformValue,
            sampler: sampler,
          });
          material._textures[uniformId] = texture;
          return;
        }

        texture.copyFrom({
          source: uniformValue,
        });
      } else if (!defined(texture)) {
        material._textures[uniformId] = context.defaultTexture;
      }
      return;
    }

    if (uniformValue instanceof Texture && uniformValue !== texture) {
      material._texturePaths[uniformId] = undefined;
      const tmp = material._textures[uniformId];
      if (defined(tmp) && tmp !== material._defaultTexture) {
        tmp.destroy();
      }
      material._textures[uniformId] = uniformValue;

      uniformDimensionsName = `${uniformId}Dimensions`;
      if (uniforms.hasOwnProperty(uniformDimensionsName)) {
        uniformDimensions = uniforms[uniformDimensionsName];
        uniformDimensions.x = uniformValue._width;
        uniformDimensions.y = uniformValue._height;
      }

      return;
    }

    if (uniformChanged && defined(texture) && uniformValueIsDefaultImage) {
      // If the newly-assigned texture is the default texture,
      // we don't need to wait for a new image to load before destroying
      // the old texture.
      if (texture !== material._defaultTexture) {
        texture.destroy();
      }
      texture = undefined;
      material._texturePaths[uniformId] = undefined;
    }

    if (!defined(texture)) {
      texture = material._textures[uniformId] = material._defaultTexture;

      uniformDimensionsName = `${uniformId}Dimensions`;
      if (uniforms.hasOwnProperty(uniformDimensionsName)) {
        uniformDimensions = uniforms[uniformDimensionsName];
        uniformDimensions.x = texture._width;
        uniformDimensions.y = texture._height;
      }
    }

    if (uniformValueIsDefaultImage) {
      return;
    }

    if (
      (uniformValue instanceof HTMLCanvasElement ||
        uniformValue instanceof HTMLImageElement ||
        uniformValue instanceof ImageBitmap ||
        uniformValue instanceof OffscreenCanvas) &&
      uniformValue !== material._texturePaths[uniformId]
    ) {
      material._loadedImages.push({
        id: uniformId,
        image: uniformValue,
      });
      material._texturePaths[uniformId] = uniformValue;
      return;
    }

    // If we get to this point, the image should be a string URL or Resource.
    // Don't wait on the promise to resolve, just start loading the image and poll status from the update loop.
    loadTexture2DImageForUniform(material, uniformId);
  };
}

/**
 * For a given uniform ID, potentially loads a texture image for the material, if the uniform value is a Resource or string URL,
 * and has changed since the last time this was called (either on construction or update).
 *
 * @param {Material} material The material to load the texture for.
 * @param {string} uniformId The ID of the uniform of the image.
 * @returns A promise that resolves when the image is loaded, or a resolved promise if image loading is not necessary.
 *
 * @private
 */
function loadTexture2DImageForUniform(material, uniformId) {
  const uniforms = material.uniforms;
  const uniformValue = uniforms[uniformId];
  if (uniformValue === Material.DefaultImageId) {
    return Promise.resolve();
  }

  // Attempt to make a resource from the uniform value. If it's not already a resource or string, this returns the original object.
  const resource = Resource.createIfNeeded(uniformValue);
  if (!(resource instanceof Resource)) {
    return Promise.resolve();
  }

  // When using the entity layer, the Resource objects get recreated on getValue because
  // they are clonable. That's why we check the url property for Resources
  // because the instances aren't the same and we keep trying to load the same
  // image if it fails to load.
  const oldResource = Resource.createIfNeeded(
    material._texturePaths[uniformId],
  );
  const uniformHasChanged =
    !defined(oldResource) || oldResource.url !== resource.url;
  if (!uniformHasChanged) {
    return Promise.resolve();
  }

  let promise;
  if (ktx2Regex.test(resource.url)) {
    promise = loadKTX2(resource.url);
  } else {
    promise = resource.fetchImage();
  }

  Promise.resolve(promise)
    .then(function (image) {
      material._loadedImages.push({
        id: uniformId,
        image: image,
      });
    })
    .catch(function (error) {
      material._initializationError = error;
      const texture = material._textures[uniformId];
      if (defined(texture) && texture !== material._defaultTexture) {
        texture.destroy();
      }
      material._textures[uniformId] = material._defaultTexture;
    });

  material._texturePaths[uniformId] = uniformValue;
  return promise;
}

function createCubeMapUpdateFunction(uniformId) {
  return function (material, context) {
    const uniformValue = material.uniforms[uniformId];

    if (uniformValue instanceof CubeMap) {
      const tmp = material._textures[uniformId];
      if (tmp !== material._defaultTexture) {
        tmp.destroy();
      }
      material._texturePaths[uniformId] = undefined;
      material._textures[uniformId] = uniformValue;
      return;
    }

    if (!defined(material._textures[uniformId])) {
      material._textures[uniformId] = context.defaultCubeMap;
    }

    loadCubeMapImagesForUniform(material, uniformId);
  };
}

/**
 * Loads the images for a cubemap uniform, if it has changed since the last time this was called.
 *
 * @param {Material} material The material to load the cubemap images for.
 * @param {string} uniformId The ID of the uniform that corresponds to the cubemap images.
 * @returns A promise that resolves when the images are loaded, or a resolved promise if image loading is not necessary.
 */
function loadCubeMapImagesForUniform(material, uniformId) {
  const uniforms = material.uniforms;
  const uniformValue = uniforms[uniformId];
  if (uniformValue === Material.DefaultCubeMapId) {
    return Promise.resolve();
  }

  const path =
    uniformValue.positiveX +
    uniformValue.negativeX +
    uniformValue.positiveY +
    uniformValue.negativeY +
    uniformValue.positiveZ +
    uniformValue.negativeZ;

  // The uniform value is unchanged, no update / image load necessary.
  if (path === material._texturePaths[uniformId]) {
    return Promise.resolve();
  }

  const promises = [
    Resource.createIfNeeded(uniformValue.positiveX).fetchImage(),
    Resource.createIfNeeded(uniformValue.negativeX).fetchImage(),
    Resource.createIfNeeded(uniformValue.positiveY).fetchImage(),
    Resource.createIfNeeded(uniformValue.negativeY).fetchImage(),
    Resource.createIfNeeded(uniformValue.positiveZ).fetchImage(),
    Resource.createIfNeeded(uniformValue.negativeZ).fetchImage(),
  ];

  const allPromise = Promise.all(promises);
  allPromise
    .then(function (images) {
      material._loadedCubeMaps.push({
        id: uniformId,
        images: images,
      });
    })
    .catch(function (error) {
      material._initializationError = error;
    });

  material._texturePaths[uniformId] = path;

  return allPromise;
}

function createUniforms(material) {
  const uniforms = material._template.uniforms;
  for (const uniformId in uniforms) {
    if (uniforms.hasOwnProperty(uniformId)) {
      createUniform(material, uniformId);
    }
  }
}

// Writes uniform declarations to the shader file and connects uniform values with
// corresponding material properties through the returnUniforms function.
function createUniform(material, uniformId) {
  const strict = material._strict;
  const materialUniforms = material._template.uniforms;
  const uniformValue = materialUniforms[uniformId];
  const uniformType = getUniformType(uniformValue);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(uniformType)) {
    throw new DeveloperError(
      `fabric: uniform '${uniformId}' has invalid type.`,
    );
  }
  //>>includeEnd('debug');

  let replacedTokenCount;
  if (uniformType === "channels") {
    replacedTokenCount = replaceToken(material, uniformId, uniformValue, false);
    //>>includeStart('debug', pragmas.debug);
    if (replacedTokenCount === 0 && strict) {
      throw new DeveloperError(
        `strict: shader source does not use channels '${uniformId}'.`,
      );
    }
    //>>includeEnd('debug');
  } else {
    // Since webgl doesn't allow texture dimension queries in glsl, create a uniform to do it.
    // Check if the shader source actually uses texture dimensions before creating the uniform.
    if (uniformType === "sampler2D") {
      const imageDimensionsUniformName = `${uniformId}Dimensions`;
      if (getNumberOfTokens(material, imageDimensionsUniformName) > 0) {
        materialUniforms[imageDimensionsUniformName] = {
          type: "ivec3",
          x: 1,
          y: 1,
        };
        createUniform(material, imageDimensionsUniformName);
      }
    }

    // Add uniform declaration to source code.
    const uniformDeclarationRegex = new RegExp(
      `uniform\\s+${uniformType}\\s+${uniformId}\\s*;`,
    );
    if (!uniformDeclarationRegex.test(material.shaderSource)) {
      const uniformDeclaration = `uniform ${uniformType} ${uniformId};`;
      material.shaderSource = uniformDeclaration + material.shaderSource;
    }

    const newUniformId = `${uniformId}_${material._count++}`;
    replacedTokenCount = replaceToken(material, uniformId, newUniformId);
    //>>includeStart('debug', pragmas.debug);
    if (replacedTokenCount === 1 && strict) {
      throw new DeveloperError(
        `strict: shader source does not use uniform '${uniformId}'.`,
      );
    }
    //>>includeEnd('debug');

    // Set uniform value
    material.uniforms[uniformId] = uniformValue;

    if (uniformType === "sampler2D") {
      material._uniforms[newUniformId] = function () {
        return material._textures[uniformId];
      };
      material._updateFunctions.push(createTexture2DUpdateFunction(uniformId));
      material._initializationPromises.push(
        loadTexture2DImageForUniform(material, uniformId),
      );
    } else if (uniformType === "samplerCube") {
      material._uniforms[newUniformId] = function () {
        return material._textures[uniformId];
      };
      material._updateFunctions.push(createCubeMapUpdateFunction(uniformId));
      material._initializationPromises.push(
        loadCubeMapImagesForUniform(material, uniformId),
      );
    } else if (uniformType.indexOf("mat") !== -1) {
      const scratchMatrix = new matrixMap[uniformType]();
      material._uniforms[newUniformId] = function () {
        return matrixMap[uniformType].fromColumnMajorArray(
          material.uniforms[uniformId],
          scratchMatrix,
        );
      };
    } else {
      material._uniforms[newUniformId] = function () {
        return material.uniforms[uniformId];
      };
    }
  }
}

// Determines the uniform type based on the uniform in the template.
function getUniformType(uniformValue) {
  let uniformType = uniformValue.type;
  if (!defined(uniformType)) {
    const type = typeof uniformValue;
    if (type === "number") {
      uniformType = "float";
    } else if (type === "boolean") {
      uniformType = "bool";
    } else if (
      type === "string" ||
      uniformValue instanceof Resource ||
      uniformValue instanceof HTMLCanvasElement ||
      uniformValue instanceof HTMLImageElement ||
      uniformValue instanceof ImageBitmap ||
      uniformValue instanceof OffscreenCanvas
    ) {
      if (/^([rgba]){1,4}$/i.test(uniformValue)) {
        uniformType = "channels";
      } else if (uniformValue === Material.DefaultCubeMapId) {
        uniformType = "samplerCube";
      } else {
        uniformType = "sampler2D";
      }
    } else if (type === "object") {
      if (Array.isArray(uniformValue)) {
        if (
          uniformValue.length === 4 ||
          uniformValue.length === 9 ||
          uniformValue.length === 16
        ) {
          uniformType = `mat${Math.sqrt(uniformValue.length)}`;
        }
      } else {
        let numAttributes = 0;
        for (const attribute in uniformValue) {
          if (uniformValue.hasOwnProperty(attribute)) {
            numAttributes += 1;
          }
        }
        if (numAttributes >= 2 && numAttributes <= 4) {
          uniformType = `vec${numAttributes}`;
        } else if (numAttributes === 6) {
          uniformType = "samplerCube";
        }
      }
    }
  }
  return uniformType;
}

// Create all sub-materials by combining source and uniforms together.
function createSubMaterials(material) {
  const strict = material._strict;
  const subMaterialTemplates = material._template.materials;
  for (const subMaterialId in subMaterialTemplates) {
    if (subMaterialTemplates.hasOwnProperty(subMaterialId)) {
      // Construct the sub-material.
      const subMaterial = new Material({
        strict: strict,
        fabric: subMaterialTemplates[subMaterialId],
        count: material._count,
      });

      material._count = subMaterial._count;
      material._uniforms = combine(
        material._uniforms,
        subMaterial._uniforms,
        true,
      );
      material.materials[subMaterialId] = subMaterial;
      material._translucentFunctions = material._translucentFunctions.concat(
        subMaterial._translucentFunctions,
      );

      // Make the material's czm_getMaterial unique by appending the sub-material type.
      const originalMethodName = "czm_getMaterial";
      const newMethodName = `${originalMethodName}_${material._count++}`;
      replaceToken(subMaterial, originalMethodName, newMethodName);
      material.shaderSource = subMaterial.shaderSource + material.shaderSource;

      // Replace each material id with an czm_getMaterial method call.
      const materialMethodCall = `${newMethodName}(materialInput)`;
      const tokensReplacedCount = replaceToken(
        material,
        subMaterialId,
        materialMethodCall,
      );
      //>>includeStart('debug', pragmas.debug);
      if (tokensReplacedCount === 0 && strict) {
        throw new DeveloperError(
          `strict: shader source does not use material '${subMaterialId}'.`,
        );
      }
      //>>includeEnd('debug');
    }
  }
}

// Used for searching or replacing a token in a material's shader source with something else.
// If excludePeriod is true, do not accept tokens that are preceded by periods.
// http://stackoverflow.com/questions/641407/javascript-negative-lookbehind-equivalent
function replaceToken(material, token, newToken, excludePeriod) {
  excludePeriod = excludePeriod ?? true;
  let count = 0;
  const suffixChars = "([\\w])?";
  const prefixChars = `([\\w${excludePeriod ? "." : ""}])?`;
  const regExp = new RegExp(prefixChars + token + suffixChars, "g");
  material.shaderSource = material.shaderSource.replace(
    regExp,
    function ($0, $1, $2) {
      if ($1 || $2) {
        return $0;
      }
      count += 1;
      return newToken;
    },
  );
  return count;
}

function getNumberOfTokens(material, token, excludePeriod) {
  return replaceToken(material, token, token, excludePeriod);
}

Material._materialCache = {
  _materials: {},
  addMaterial: function (type, materialTemplate) {
    this._materials[type] = materialTemplate;
  },
  getMaterial: function (type) {
    return this._materials[type];
  },
};

/**
 * Gets or sets the default texture uniform value.
 * @type {string}
 */
Material.DefaultImageId = "czm_defaultImage";

/**
 * Gets or sets the default cube map texture uniform value.
 * @type {string}
 */
Material.DefaultCubeMapId = "czm_defaultCubeMap";

/**
 * Gets the name of the color material.
 * @type {string}
 * @readonly
 */
Material.ColorType = "Color";
Material._materialCache.addMaterial(Material.ColorType, {
  fabric: {
    type: Material.ColorType,
    uniforms: {
      color: new Color(1.0, 0.0, 0.0, 0.5),
    },
    components: {
      diffuse: "color.rgb",
      alpha: "color.a",
    },
  },
  translucent: function (material) {
    return material.uniforms.color.alpha < 1.0;
  },
});

/**
 * Gets the name of the image material.
 * @type {string}
 * @readonly
 */
Material.ImageType = "Image";
Material._materialCache.addMaterial(Material.ImageType, {
  fabric: {
    type: Material.ImageType,
    uniforms: {
      image: Material.DefaultImageId,
      repeat: new Cartesian2(1.0, 1.0),
      color: new Color(1.0, 1.0, 1.0, 1.0),
    },
    components: {
      diffuse:
        "texture(image, fract(repeat * materialInput.st)).rgb * color.rgb",
      alpha: "texture(image, fract(repeat * materialInput.st)).a * color.a",
    },
  },
  translucent: function (material) {
    return material.uniforms.color.alpha < 1.0;
  },
});

/**
 * Gets the name of the diffuce map material.
 * @type {string}
 * @readonly
 */
Material.DiffuseMapType = "DiffuseMap";
Material._materialCache.addMaterial(Material.DiffuseMapType, {
  fabric: {
    type: Material.DiffuseMapType,
    uniforms: {
      image: Material.DefaultImageId,
      channels: "rgb",
      repeat: new Cartesian2(1.0, 1.0),
    },
    components: {
      diffuse: "texture(image, fract(repeat * materialInput.st)).channels",
    },
  },
  translucent: false,
});

/**
 * Gets the name of the alpha map material.
 * @type {string}
 * @readonly
 */
Material.AlphaMapType = "AlphaMap";
Material._materialCache.addMaterial(Material.AlphaMapType, {
  fabric: {
    type: Material.AlphaMapType,
    uniforms: {
      image: Material.DefaultImageId,
      channel: "a",
      repeat: new Cartesian2(1.0, 1.0),
    },
    components: {
      alpha: "texture(image, fract(repeat * materialInput.st)).channel",
    },
  },
  translucent: true,
});

/**
 * Gets the name of the specular map material.
 * @type {string}
 * @readonly
 */
Material.SpecularMapType = "SpecularMap";
Material._materialCache.addMaterial(Material.SpecularMapType, {
  fabric: {
    type: Material.SpecularMapType,
    uniforms: {
      image: Material.DefaultImageId,
      channel: "r",
      repeat: new Cartesian2(1.0, 1.0),
    },
    components: {
      specular: "texture(image, fract(repeat * materialInput.st)).channel",
    },
  },
  translucent: false,
});

/**
 * Gets the name of the emmision map material.
 * @type {string}
 * @readonly
 */
Material.EmissionMapType = "EmissionMap";
Material._materialCache.addMaterial(Material.EmissionMapType, {
  fabric: {
    type: Material.EmissionMapType,
    uniforms: {
      image: Material.DefaultImageId,
      channels: "rgb",
      repeat: new Cartesian2(1.0, 1.0),
    },
    components: {
      emission: "texture(image, fract(repeat * materialInput.st)).channels",
    },
  },
  translucent: false,
});

/**
 * Gets the name of the bump map material.
 * @type {string}
 * @readonly
 */
Material.BumpMapType = "BumpMap";
Material._materialCache.addMaterial(Material.BumpMapType, {
  fabric: {
    type: Material.BumpMapType,
    uniforms: {
      image: Material.DefaultImageId,
      channel: "r",
      strength: 0.8,
      repeat: new Cartesian2(1.0, 1.0),
    },
    source: BumpMapMaterial,
  },
  translucent: false,
});

/**
 * Gets the name of the normal map material.
 * @type {string}
 * @readonly
 */
Material.NormalMapType = "NormalMap";
Material._materialCache.addMaterial(Material.NormalMapType, {
  fabric: {
    type: Material.NormalMapType,
    uniforms: {
      image: Material.DefaultImageId,
      channels: "rgb",
      strength: 0.8,
      repeat: new Cartesian2(1.0, 1.0),
    },
    source: NormalMapMaterial,
  },
  translucent: false,
});

/**
 * Gets the name of the grid material.
 * @type {string}
 * @readonly
 */
Material.GridType = "Grid";
Material._materialCache.addMaterial(Material.GridType, {
  fabric: {
    type: Material.GridType,
    uniforms: {
      color: new Color(0.0, 1.0, 0.0, 1.0),
      cellAlpha: 0.1,
      lineCount: new Cartesian2(8.0, 8.0),
      lineThickness: new Cartesian2(1.0, 1.0),
      lineOffset: new Cartesian2(0.0, 0.0),
    },
    source: GridMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return uniforms.color.alpha < 1.0 || uniforms.cellAlpha < 1.0;
  },
});

/**
 * Gets the name of the stripe material.
 * @type {string}
 * @readonly
 */
Material.StripeType = "Stripe";
Material._materialCache.addMaterial(Material.StripeType, {
  fabric: {
    type: Material.StripeType,
    uniforms: {
      horizontal: true,
      evenColor: new Color(1.0, 1.0, 1.0, 0.5),
      oddColor: new Color(0.0, 0.0, 1.0, 0.5),
      offset: 0.0,
      repeat: 5.0,
    },
    source: StripeMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return uniforms.evenColor.alpha < 1.0 || uniforms.oddColor.alpha < 1.0;
  },
});

/**
 * Gets the name of the checkerboard material.
 * @type {string}
 * @readonly
 */
Material.CheckerboardType = "Checkerboard";
Material._materialCache.addMaterial(Material.CheckerboardType, {
  fabric: {
    type: Material.CheckerboardType,
    uniforms: {
      lightColor: new Color(1.0, 1.0, 1.0, 0.5),
      darkColor: new Color(0.0, 0.0, 0.0, 0.5),
      repeat: new Cartesian2(5.0, 5.0),
    },
    source: CheckerboardMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return uniforms.lightColor.alpha < 1.0 || uniforms.darkColor.alpha < 1.0;
  },
});

/**
 * Gets the name of the dot material.
 * @type {string}
 * @readonly
 */
Material.DotType = "Dot";
Material._materialCache.addMaterial(Material.DotType, {
  fabric: {
    type: Material.DotType,
    uniforms: {
      lightColor: new Color(1.0, 1.0, 0.0, 0.75),
      darkColor: new Color(0.0, 1.0, 1.0, 0.75),
      repeat: new Cartesian2(5.0, 5.0),
    },
    source: DotMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return uniforms.lightColor.alpha < 1.0 || uniforms.darkColor.alpha < 1.0;
  },
});

/**
 * Gets the name of the water material.
 * @type {string}
 * @readonly
 */
Material.WaterType = "Water";
Material._materialCache.addMaterial(Material.WaterType, {
  fabric: {
    type: Material.WaterType,
    uniforms: {
      baseWaterColor: new Color(0.2, 0.3, 0.6, 1.0),
      blendColor: new Color(0.0, 1.0, 0.699, 1.0),
      specularMap: Material.DefaultImageId,
      normalMap: Material.DefaultImageId,
      frequency: 10.0,
      animationSpeed: 0.01,
      amplitude: 1.0,
      specularIntensity: 0.5,
      fadeFactor: 1.0,
    },
    source: WaterMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return (
      uniforms.baseWaterColor.alpha < 1.0 || uniforms.blendColor.alpha < 1.0
    );
  },
});

/**
 * Gets the name of the rim lighting material.
 * @type {string}
 * @readonly
 */
Material.RimLightingType = "RimLighting";
Material._materialCache.addMaterial(Material.RimLightingType, {
  fabric: {
    type: Material.RimLightingType,
    uniforms: {
      color: new Color(1.0, 0.0, 0.0, 0.7),
      rimColor: new Color(1.0, 1.0, 1.0, 0.4),
      width: 0.3,
    },
    source: RimLightingMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return uniforms.color.alpha < 1.0 || uniforms.rimColor.alpha < 1.0;
  },
});

/**
 * Gets the name of the fade material.
 * @type {string}
 * @readonly
 */
Material.FadeType = "Fade";
Material._materialCache.addMaterial(Material.FadeType, {
  fabric: {
    type: Material.FadeType,
    uniforms: {
      fadeInColor: new Color(1.0, 0.0, 0.0, 1.0),
      fadeOutColor: new Color(0.0, 0.0, 0.0, 0.0),
      maximumDistance: 0.5,
      repeat: true,
      fadeDirection: {
        x: true,
        y: true,
      },
      time: new Cartesian2(0.5, 0.5),
    },
    source: FadeMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return (
      uniforms.fadeInColor.alpha < 1.0 || uniforms.fadeOutColor.alpha < 1.0
    );
  },
});

/**
 * Gets the name of the polyline arrow material.
 * @type {string}
 * @readonly
 */
Material.PolylineArrowType = "PolylineArrow";
Material._materialCache.addMaterial(Material.PolylineArrowType, {
  fabric: {
    type: Material.PolylineArrowType,
    uniforms: {
      color: new Color(1.0, 1.0, 1.0, 1.0),
    },
    source: PolylineArrowMaterial,
  },
  translucent: true,
});

/**
 * Gets the name of the polyline glow material.
 * @type {string}
 * @readonly
 */
Material.PolylineDashType = "PolylineDash";
Material._materialCache.addMaterial(Material.PolylineDashType, {
  fabric: {
    type: Material.PolylineDashType,
    uniforms: {
      color: new Color(1.0, 0.0, 1.0, 1.0),
      gapColor: new Color(0.0, 0.0, 0.0, 0.0),
      dashLength: 16.0,
      dashPattern: 255.0,
    },
    source: PolylineDashMaterial,
  },
  translucent: true,
});

/**
 * Gets the name of the polyline glow material.
 * @type {string}
 * @readonly
 */
Material.PolylineGlowType = "PolylineGlow";
Material._materialCache.addMaterial(Material.PolylineGlowType, {
  fabric: {
    type: Material.PolylineGlowType,
    uniforms: {
      color: new Color(0.0, 0.5, 1.0, 1.0),
      glowPower: 0.25,
      taperPower: 1.0,
    },
    source: PolylineGlowMaterial,
  },
  translucent: true,
});

/**
 * Gets the name of the polyline outline material.
 * @type {string}
 * @readonly
 */
Material.PolylineOutlineType = "PolylineOutline";
Material._materialCache.addMaterial(Material.PolylineOutlineType, {
  fabric: {
    type: Material.PolylineOutlineType,
    uniforms: {
      color: new Color(1.0, 1.0, 1.0, 1.0),
      outlineColor: new Color(1.0, 0.0, 0.0, 1.0),
      outlineWidth: 1.0,
    },
    source: PolylineOutlineMaterial,
  },
  translucent: function (material) {
    const uniforms = material.uniforms;
    return uniforms.color.alpha < 1.0 || uniforms.outlineColor.alpha < 1.0;
  },
});

/**
 * Gets the name of the elevation contour material.
 * @type {string}
 * @readonly
 */
Material.ElevationContourType = "ElevationContour";
Material._materialCache.addMaterial(Material.ElevationContourType, {
  fabric: {
    type: Material.ElevationContourType,
    uniforms: {
      spacing: 100.0,
      color: new Color(1.0, 0.0, 0.0, 1.0),
      width: 1.0,
    },
    source: ElevationContourMaterial,
  },
  translucent: false,
});

/**
 * Gets the name of the elevation contour material.
 * @type {string}
 * @readonly
 */
Material.ElevationRampType = "ElevationRamp";
Material._materialCache.addMaterial(Material.ElevationRampType, {
  fabric: {
    type: Material.ElevationRampType,
    uniforms: {
      image: Material.DefaultImageId,
      minimumHeight: 0.0,
      maximumHeight: 10000.0,
    },
    source: ElevationRampMaterial,
  },
  translucent: false,
});

/**
 * Gets the name of the slope ramp material.
 * @type {string}
 * @readonly
 */
Material.SlopeRampMaterialType = "SlopeRamp";
Material._materialCache.addMaterial(Material.SlopeRampMaterialType, {
  fabric: {
    type: Material.SlopeRampMaterialType,
    uniforms: {
      image: Material.DefaultImageId,
    },
    source: SlopeRampMaterial,
  },
  translucent: false,
});

/**
 * Gets the name of the aspect ramp material.
 * @type {string}
 * @readonly
 */
Material.AspectRampMaterialType = "AspectRamp";
Material._materialCache.addMaterial(Material.AspectRampMaterialType, {
  fabric: {
    type: Material.AspectRampMaterialType,
    uniforms: {
      image: Material.DefaultImageId,
    },
    source: AspectRampMaterial,
  },
  translucent: false,
});

/**
 * Gets the name of the elevation band material.
 * @type {string}
 * @readonly
 */
Material.ElevationBandType = "ElevationBand";
Material._materialCache.addMaterial(Material.ElevationBandType, {
  fabric: {
    type: Material.ElevationBandType,
    uniforms: {
      heights: Material.DefaultImageId,
      colors: Material.DefaultImageId,
    },
    source: ElevationBandMaterial,
  },
  translucent: true,
});

/**
 * Gets the name of the water mask material.
 * @type {string}
 * @readonly
 */
Material.WaterMaskType = "WaterMask";
Material._materialCache.addMaterial(Material.WaterMaskType, {
  fabric: {
    type: Material.WaterMaskType,
    source: WaterMaskMaterial,
    uniforms: {
      waterColor: new Color(1.0, 1.0, 1.0, 1.0),
      landColor: new Color(0.0, 0.0, 0.0, 0.0),
    },
  },
  translucent: false,
});

export default Material;
