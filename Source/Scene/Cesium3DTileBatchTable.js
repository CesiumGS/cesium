import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import deprecationWarning from "../Core/deprecationWarning.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import RuntimeError from "../Core/RuntimeError.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import BatchTexture from "./BatchTexture.js";
import BatchTableHierarchy from "./BatchTableHierarchy.js";
import BlendingState from "./BlendingState.js";
import Cesium3DTileColorBlendMode from "./Cesium3DTileColorBlendMode.js";
import CullFace from "./CullFace.js";
import getBinaryAccessor from "./getBinaryAccessor.js";
import StencilConstants from "./StencilConstants.js";
import StencilFunction from "./StencilFunction.js";
import StencilOperation from "./StencilOperation.js";

var DEFAULT_COLOR_VALUE = BatchTexture.DEFAULT_COLOR_VALUE;
var DEFAULT_SHOW_VALUE = BatchTexture.DEFAULT_SHOW_VALUE;

/**
 * @private
 * @constructor
 */
function Cesium3DTileBatchTable(
  content,
  featuresLength,
  batchTableJson,
  batchTableBinary,
  colorChangedCallback
) {
  /**
   * @readonly
   */
  this.featuresLength = featuresLength;

  var extensions;
  if (defined(batchTableJson)) {
    extensions = batchTableJson.extensions;
  }
  this._extensions = defaultValue(extensions, {});

  var properties = initializeProperties(batchTableJson);
  this._properties = properties;

  this._batchTableHierarchy = initializeHierarchy(
    this,
    batchTableJson,
    batchTableBinary
  );
  this._batchTableBinaryProperties = getBinaryProperties(
    featuresLength,
    properties,
    batchTableBinary
  );

  this._content = content;

  this._batchTexture = new BatchTexture({
    featuresLength: featuresLength,
    colorChangedCallback: colorChangedCallback,
    content: content,
    statistics: content.tileset._statistics,
  });
}

// This can be overridden for testing purposes
Cesium3DTileBatchTable._deprecationWarning = deprecationWarning;

Object.defineProperties(Cesium3DTileBatchTable.prototype, {
  memorySizeInBytes: {
    get: function () {
      return this._batchTexture.memorySizeInBytes;
    },
  },
});

function initializeProperties(jsonHeader) {
  var properties = {};

  if (!defined(jsonHeader)) {
    return properties;
  }

  for (var propertyName in jsonHeader) {
    if (
      jsonHeader.hasOwnProperty(propertyName) &&
      propertyName !== "HIERARCHY" && // Deprecated HIERARCHY property
      propertyName !== "extensions" &&
      propertyName !== "extras"
    ) {
      properties[propertyName] = clone(jsonHeader[propertyName], true);
    }
  }

  return properties;
}

function initializeHierarchy(batchTable, jsonHeader, binaryBody) {
  if (!defined(jsonHeader)) {
    return;
  }

  var hierarchy = batchTable._extensions["3DTILES_batch_table_hierarchy"];

  var legacyHierarchy = jsonHeader.HIERARCHY;
  if (defined(legacyHierarchy)) {
    Cesium3DTileBatchTable._deprecationWarning(
      "batchTableHierarchyExtension",
      "The batch table HIERARCHY property has been moved to an extension. Use extensions.3DTILES_batch_table_hierarchy instead."
    );
    batchTable._extensions["3DTILES_batch_table_hierarchy"] = legacyHierarchy;
    hierarchy = legacyHierarchy;
  }

  if (!defined(hierarchy)) {
    return;
  }

  return new BatchTableHierarchy({
    extension: hierarchy,
    binaryBody: binaryBody,
  });
}

function getBinaryProperties(featuresLength, properties, binaryBody) {
  var binaryProperties;
  for (var name in properties) {
    if (properties.hasOwnProperty(name)) {
      var property = properties[name];
      var byteOffset = property.byteOffset;
      if (defined(byteOffset)) {
        // This is a binary property
        var componentType = property.componentType;
        var type = property.type;
        if (!defined(componentType)) {
          throw new RuntimeError("componentType is required.");
        }
        if (!defined(type)) {
          throw new RuntimeError("type is required.");
        }
        if (!defined(binaryBody)) {
          throw new RuntimeError(
            "Property " + name + " requires a batch table binary."
          );
        }

        var binaryAccessor = getBinaryAccessor(property);
        var componentCount = binaryAccessor.componentsPerAttribute;
        var classType = binaryAccessor.classType;
        var typedArray = binaryAccessor.createArrayBufferView(
          binaryBody.buffer,
          binaryBody.byteOffset + byteOffset,
          featuresLength
        );

        if (!defined(binaryProperties)) {
          binaryProperties = {};
        }

        // Store any information needed to access the binary data, including the typed array,
        // componentCount (e.g. a VEC4 would be 4), and the type used to pack and unpack (e.g. Cartesian4).
        binaryProperties[name] = {
          typedArray: typedArray,
          componentCount: componentCount,
          type: classType,
        };
      }
    }
  }
  return binaryProperties;
}

Cesium3DTileBatchTable.getBinaryProperties = function (
  featuresLength,
  batchTableJson,
  batchTableBinary
) {
  return getBinaryProperties(featuresLength, batchTableJson, batchTableBinary);
};

Cesium3DTileBatchTable.prototype.setShow = function (batchId, show) {
  this._batchTexture.setShow(batchId, show);
};

Cesium3DTileBatchTable.prototype.setAllShow = function (show) {
  this._batchTexture.setAllShow(show);
};

Cesium3DTileBatchTable.prototype.getShow = function (batchId) {
  return this._batchTexture.getShow(batchId);
};

Cesium3DTileBatchTable.prototype.setColor = function (batchId, color) {
  this._batchTexture.setColor(batchId, color);
};

Cesium3DTileBatchTable.prototype.setAllColor = function (color) {
  this._batchTexture.setAllColor(color);
};

Cesium3DTileBatchTable.prototype.getColor = function (batchId, result) {
  return this._batchTexture.getColor(batchId, result);
};

Cesium3DTileBatchTable.prototype.getPickColor = function (batchId) {
  return this._batchTexture.getPickColor(batchId);
};

var scratchColor = new Color();

Cesium3DTileBatchTable.prototype.applyStyle = function (style) {
  if (!defined(style)) {
    this.setAllColor(DEFAULT_COLOR_VALUE);
    this.setAllShow(DEFAULT_SHOW_VALUE);
    return;
  }

  var content = this._content;
  var length = this.featuresLength;
  for (var i = 0; i < length; ++i) {
    var feature = content.getFeature(i);
    var color = defined(style.color)
      ? defaultValue(
          style.color.evaluateColor(feature, scratchColor),
          DEFAULT_COLOR_VALUE
        )
      : DEFAULT_COLOR_VALUE;
    var show = defined(style.show)
      ? defaultValue(style.show.evaluate(feature), DEFAULT_SHOW_VALUE)
      : DEFAULT_SHOW_VALUE;
    this.setColor(i, color);
    this.setShow(i, show);
  }
};

function getBinaryProperty(binaryProperty, index) {
  var typedArray = binaryProperty.typedArray;
  var componentCount = binaryProperty.componentCount;
  if (componentCount === 1) {
    return typedArray[index];
  }
  return binaryProperty.type.unpack(typedArray, index * componentCount);
}

function setBinaryProperty(binaryProperty, index, value) {
  var typedArray = binaryProperty.typedArray;
  var componentCount = binaryProperty.componentCount;
  if (componentCount === 1) {
    typedArray[index] = value;
  } else {
    binaryProperty.type.pack(value, typedArray, index * componentCount);
  }
}

function checkBatchId(batchId, featuresLength) {
  if (!defined(batchId) || batchId < 0 || batchId >= featuresLength) {
    throw new DeveloperError(
      "batchId is required and between zero and featuresLength - 1 (" +
        featuresLength -
        +")."
    );
  }
}

Cesium3DTileBatchTable.prototype.isClass = function (batchId, className) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this.featuresLength);
  Check.typeOf.string("className", className);
  //>>includeEnd('debug');

  var hierarchy = this._batchTableHierarchy;
  if (!defined(hierarchy)) {
    return false;
  }

  return hierarchy.isClass(batchId, className);
};

Cesium3DTileBatchTable.prototype.isExactClass = function (batchId, className) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.string("className", className);
  //>>includeEnd('debug');

  return this.getExactClassName(batchId) === className;
};

Cesium3DTileBatchTable.prototype.getExactClassName = function (batchId) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this.featuresLength);
  //>>includeEnd('debug');

  var hierarchy = this._batchTableHierarchy;
  if (!defined(hierarchy)) {
    return undefined;
  }

  return hierarchy.getClassName(batchId);
};

Cesium3DTileBatchTable.prototype.hasProperty = function (batchId, name) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this.featuresLength);
  Check.typeOf.string("name", name);
  //>>includeEnd('debug');

  return (
    defined(this._properties[name]) ||
    (defined(this._batchTableHierarchy) &&
      this._batchTableHierarchy.hasProperty(batchId, name))
  );
};

Cesium3DTileBatchTable.prototype.getPropertyNames = function (
  batchId,
  results
) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this.featuresLength);
  //>>includeEnd('debug');

  results = defined(results) ? results : [];
  results.length = 0;

  var scratchPropertyNames = Object.keys(this._properties);
  results.push.apply(results, scratchPropertyNames);

  if (defined(this._batchTableHierarchy)) {
    results.push.apply(
      results,
      this._batchTableHierarchy.getPropertyIds(batchId, scratchPropertyNames)
    );
  }

  return results;
};

Cesium3DTileBatchTable.prototype.getProperty = function (batchId, name) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this.featuresLength);
  Check.typeOf.string("name", name);
  //>>includeEnd('debug');

  if (defined(this._batchTableBinaryProperties)) {
    var binaryProperty = this._batchTableBinaryProperties[name];
    if (defined(binaryProperty)) {
      return getBinaryProperty(binaryProperty, batchId);
    }
  }

  var propertyValues = this._properties[name];
  if (defined(propertyValues)) {
    return clone(propertyValues[batchId], true);
  }

  if (defined(this._batchTableHierarchy)) {
    var hierarchyProperty = this._batchTableHierarchy.getProperty(
      batchId,
      name
    );
    if (defined(hierarchyProperty)) {
      return hierarchyProperty;
    }
  }

  return undefined;
};

Cesium3DTileBatchTable.prototype.setProperty = function (batchId, name, value) {
  var featuresLength = this.featuresLength;
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, featuresLength);
  Check.typeOf.string("name", name);
  //>>includeEnd('debug');

  if (defined(this._batchTableBinaryProperties)) {
    var binaryProperty = this._batchTableBinaryProperties[name];
    if (defined(binaryProperty)) {
      setBinaryProperty(binaryProperty, batchId, value);
      return;
    }
  }

  if (defined(this._batchTableHierarchy)) {
    if (this._batchTableHierarchy.setProperty(batchId, name, value)) {
      return;
    }
  }

  var propertyValues = this._properties[name];
  if (!defined(propertyValues)) {
    // Property does not exist. Create it.
    this._properties[name] = new Array(featuresLength);
    propertyValues = this._properties[name];
  }

  propertyValues[batchId] = clone(value, true);
};

function getGlslComputeSt(batchTable) {
  // GLSL batchId is zero-based: [0, featuresLength - 1]
  if (batchTable._batchTexture.textureDimensions.y === 1) {
    return (
      "uniform vec4 tile_textureStep; \n" +
      "vec2 computeSt(float batchId) \n" +
      "{ \n" +
      "    float stepX = tile_textureStep.x; \n" +
      "    float centerX = tile_textureStep.y; \n" +
      "    return vec2(centerX + (batchId * stepX), 0.5); \n" +
      "} \n"
    );
  }

  return (
    "uniform vec4 tile_textureStep; \n" +
    "uniform vec2 tile_textureDimensions; \n" +
    "vec2 computeSt(float batchId) \n" +
    "{ \n" +
    "    float stepX = tile_textureStep.x; \n" +
    "    float centerX = tile_textureStep.y; \n" +
    "    float stepY = tile_textureStep.z; \n" +
    "    float centerY = tile_textureStep.w; \n" +
    "    float xId = mod(batchId, tile_textureDimensions.x); \n" +
    "    float yId = floor(batchId / tile_textureDimensions.x); \n" +
    "    return vec2(centerX + (xId * stepX), centerY + (yId * stepY)); \n" +
    "} \n"
  );
}

Cesium3DTileBatchTable.prototype.getVertexShaderCallback = function (
  handleTranslucent,
  batchIdAttributeName,
  diffuseAttributeOrUniformName
) {
  if (this.featuresLength === 0) {
    return;
  }

  var that = this;
  return function (source) {
    // If the color blend mode is HIGHLIGHT, the highlight color will always be applied in the fragment shader.
    // No need to apply the highlight color in the vertex shader as well.
    var renamedSource = modifyDiffuse(
      source,
      diffuseAttributeOrUniformName,
      false
    );
    var newMain;

    if (ContextLimits.maximumVertexTextureImageUnits > 0) {
      // When VTF is supported, perform per-feature show/hide in the vertex shader
      newMain = "";
      if (handleTranslucent) {
        newMain += "uniform bool tile_translucentCommand; \n";
      }
      newMain +=
        "uniform sampler2D tile_batchTexture; \n" +
        "varying vec4 tile_featureColor; \n" +
        "varying vec2 tile_featureSt; \n" +
        "void main() \n" +
        "{ \n" +
        "    vec2 st = computeSt(" +
        batchIdAttributeName +
        "); \n" +
        "    vec4 featureProperties = texture2D(tile_batchTexture, st); \n" +
        "    tile_color(featureProperties); \n" +
        "    float show = ceil(featureProperties.a); \n" + // 0 - false, non-zeo - true
        "    gl_Position *= show; \n"; // Per-feature show/hide
      if (handleTranslucent) {
        newMain +=
          "    bool isStyleTranslucent = (featureProperties.a != 1.0); \n" +
          "    if (czm_pass == czm_passTranslucent) \n" +
          "    { \n" +
          "        if (!isStyleTranslucent && !tile_translucentCommand) \n" + // Do not render opaque features in the translucent pass
          "        { \n" +
          "            gl_Position *= 0.0; \n" +
          "        } \n" +
          "    } \n" +
          "    else \n" +
          "    { \n" +
          "        if (isStyleTranslucent) \n" + // Do not render translucent features in the opaque pass
          "        { \n" +
          "            gl_Position *= 0.0; \n" +
          "        } \n" +
          "    } \n";
      }
      newMain +=
        "    tile_featureColor = featureProperties; \n" +
        "    tile_featureSt = st; \n" +
        "}";
    } else {
      // When VTF is not supported, color blend mode MIX will look incorrect due to the feature's color not being available in the vertex shader
      newMain =
        "varying vec2 tile_featureSt; \n" +
        "void main() \n" +
        "{ \n" +
        "    tile_color(vec4(1.0)); \n" +
        "    tile_featureSt = computeSt(" +
        batchIdAttributeName +
        "); \n" +
        "}";
    }

    return renamedSource + "\n" + getGlslComputeSt(that) + newMain;
  };
};

function getDefaultShader(source, applyHighlight) {
  source = ShaderSource.replaceMain(source, "tile_main");

  if (!applyHighlight) {
    return (
      source +
      "void tile_color(vec4 tile_featureColor) \n" +
      "{ \n" +
      "    tile_main(); \n" +
      "} \n"
    );
  }

  // The color blend mode is intended for the RGB channels so alpha is always just multiplied.
  // gl_FragColor is multiplied by the tile color only when tile_colorBlend is 0.0 (highlight)
  return (
    source +
    "uniform float tile_colorBlend; \n" +
    "void tile_color(vec4 tile_featureColor) \n" +
    "{ \n" +
    "    tile_main(); \n" +
    "    tile_featureColor = czm_gammaCorrect(tile_featureColor); \n" +
    "    gl_FragColor.a *= tile_featureColor.a; \n" +
    "    float highlight = ceil(tile_colorBlend); \n" +
    "    gl_FragColor.rgb *= mix(tile_featureColor.rgb, vec3(1.0), highlight); \n" +
    "} \n"
  );
}

function replaceDiffuseTextureCalls(source, diffuseAttributeOrUniformName) {
  var functionCall = "texture2D(" + diffuseAttributeOrUniformName;

  var fromIndex = 0;
  var startIndex = source.indexOf(functionCall, fromIndex);
  var endIndex;

  while (startIndex > -1) {
    var nestedLevel = 0;
    for (var i = startIndex; i < source.length; ++i) {
      var character = source.charAt(i);
      if (character === "(") {
        ++nestedLevel;
      } else if (character === ")") {
        --nestedLevel;
        if (nestedLevel === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    var extractedFunction = source.slice(startIndex, endIndex);
    var replacedFunction =
      "tile_diffuse_final(" + extractedFunction + ", tile_diffuse)";

    source =
      source.slice(0, startIndex) + replacedFunction + source.slice(endIndex);
    fromIndex = startIndex + replacedFunction.length;
    startIndex = source.indexOf(functionCall, fromIndex);
  }

  return source;
}

function modifyDiffuse(source, diffuseAttributeOrUniformName, applyHighlight) {
  // If the glTF does not specify the _3DTILESDIFFUSE semantic, return the default shader.
  // Otherwise if _3DTILESDIFFUSE is defined prefer the shader below that can switch the color mode at runtime.
  if (!defined(diffuseAttributeOrUniformName)) {
    return getDefaultShader(source, applyHighlight);
  }

  // Find the diffuse uniform. Examples matches:
  //   uniform vec3 u_diffuseColor;
  //   uniform sampler2D diffuseTexture;
  var regex = new RegExp(
    "(uniform|attribute|in)\\s+(vec[34]|sampler2D)\\s+" +
      diffuseAttributeOrUniformName +
      ";"
  );
  var uniformMatch = source.match(regex);

  if (!defined(uniformMatch)) {
    // Could not find uniform declaration of type vec3, vec4, or sampler2D
    return getDefaultShader(source, applyHighlight);
  }

  var declaration = uniformMatch[0];
  var type = uniformMatch[2];

  source = ShaderSource.replaceMain(source, "tile_main");
  source = source.replace(declaration, ""); // Remove uniform declaration for now so the replace below doesn't affect it

  // If the tile color is white, use the source color. This implies the feature has not been styled.
  // Highlight: tile_colorBlend is 0.0 and the source color is used
  // Replace: tile_colorBlend is 1.0 and the tile color is used
  // Mix: tile_colorBlend is between 0.0 and 1.0, causing the source color and tile color to mix
  var finalDiffuseFunction =
    "bool isWhite(vec3 color) \n" +
    "{ \n" +
    "    return all(greaterThan(color, vec3(1.0 - czm_epsilon3))); \n" +
    "} \n" +
    "vec4 tile_diffuse_final(vec4 sourceDiffuse, vec4 tileDiffuse) \n" +
    "{ \n" +
    "    vec4 blendDiffuse = mix(sourceDiffuse, tileDiffuse, tile_colorBlend); \n" +
    "    vec4 diffuse = isWhite(tileDiffuse.rgb) ? sourceDiffuse : blendDiffuse; \n" +
    "    return vec4(diffuse.rgb, sourceDiffuse.a); \n" +
    "} \n";

  // The color blend mode is intended for the RGB channels so alpha is always just multiplied.
  // gl_FragColor is multiplied by the tile color only when tile_colorBlend is 0.0 (highlight)
  var highlight =
    "    tile_featureColor = czm_gammaCorrect(tile_featureColor); \n" +
    "    gl_FragColor.a *= tile_featureColor.a; \n" +
    "    float highlight = ceil(tile_colorBlend); \n" +
    "    gl_FragColor.rgb *= mix(tile_featureColor.rgb, vec3(1.0), highlight); \n";

  var setColor;
  if (type === "vec3" || type === "vec4") {
    var sourceDiffuse =
      type === "vec3"
        ? "vec4(" + diffuseAttributeOrUniformName + ", 1.0)"
        : diffuseAttributeOrUniformName;
    var replaceDiffuse = type === "vec3" ? "tile_diffuse.xyz" : "tile_diffuse";
    regex = new RegExp(diffuseAttributeOrUniformName, "g");
    source = source.replace(regex, replaceDiffuse);
    setColor =
      "    vec4 source = " +
      sourceDiffuse +
      "; \n" +
      "    tile_diffuse = tile_diffuse_final(source, tile_featureColor); \n" +
      "    tile_main(); \n";
  } else if (type === "sampler2D") {
    // Handles any number of nested parentheses
    // E.g. texture2D(u_diffuse, uv)
    // E.g. texture2D(u_diffuse, computeUV(index))
    source = replaceDiffuseTextureCalls(source, diffuseAttributeOrUniformName);
    setColor =
      "    tile_diffuse = tile_featureColor; \n" + "    tile_main(); \n";
  }

  source =
    "uniform float tile_colorBlend; \n" +
    "vec4 tile_diffuse = vec4(1.0); \n" +
    finalDiffuseFunction +
    declaration +
    "\n" +
    source +
    "\n" +
    "void tile_color(vec4 tile_featureColor) \n" +
    "{ \n" +
    setColor;

  if (applyHighlight) {
    source += highlight;
  }

  source += "} \n";
  return source;
}

Cesium3DTileBatchTable.prototype.getFragmentShaderCallback = function (
  handleTranslucent,
  diffuseAttributeOrUniformName,
  hasPremultipliedAlpha
) {
  if (this.featuresLength === 0) {
    return;
  }
  return function (source) {
    source = modifyDiffuse(source, diffuseAttributeOrUniformName, true);
    if (ContextLimits.maximumVertexTextureImageUnits > 0) {
      // When VTF is supported, per-feature show/hide already happened in the fragment shader
      source +=
        "uniform sampler2D tile_pickTexture; \n" +
        "varying vec2 tile_featureSt; \n" +
        "varying vec4 tile_featureColor; \n" +
        "void main() \n" +
        "{ \n" +
        "    tile_color(tile_featureColor); \n";

      if (hasPremultipliedAlpha) {
        source += "    gl_FragColor.rgb *= gl_FragColor.a; \n";
      }

      source += "}";
    } else {
      if (handleTranslucent) {
        source += "uniform bool tile_translucentCommand; \n";
      }
      source +=
        "uniform sampler2D tile_pickTexture; \n" +
        "uniform sampler2D tile_batchTexture; \n" +
        "varying vec2 tile_featureSt; \n" +
        "void main() \n" +
        "{ \n" +
        "    vec4 featureProperties = texture2D(tile_batchTexture, tile_featureSt); \n" +
        "    if (featureProperties.a == 0.0) { \n" + // show: alpha == 0 - false, non-zeo - true
        "        discard; \n" +
        "    } \n";

      if (handleTranslucent) {
        source +=
          "    bool isStyleTranslucent = (featureProperties.a != 1.0); \n" +
          "    if (czm_pass == czm_passTranslucent) \n" +
          "    { \n" +
          "        if (!isStyleTranslucent && !tile_translucentCommand) \n" + // Do not render opaque features in the translucent pass
          "        { \n" +
          "            discard; \n" +
          "        } \n" +
          "    } \n" +
          "    else \n" +
          "    { \n" +
          "        if (isStyleTranslucent) \n" + // Do not render translucent features in the opaque pass
          "        { \n" +
          "            discard; \n" +
          "        } \n" +
          "    } \n";
      }

      source += "    tile_color(featureProperties); \n";

      if (hasPremultipliedAlpha) {
        source += "    gl_FragColor.rgb *= gl_FragColor.a; \n";
      }

      source += "} \n";
    }
    return source;
  };
};

Cesium3DTileBatchTable.prototype.getClassificationFragmentShaderCallback = function () {
  if (this.featuresLength === 0) {
    return;
  }
  return function (source) {
    source = ShaderSource.replaceMain(source, "tile_main");
    if (ContextLimits.maximumVertexTextureImageUnits > 0) {
      // When VTF is supported, per-feature show/hide already happened in the fragment shader
      source +=
        "uniform sampler2D tile_pickTexture;\n" +
        "varying vec2 tile_featureSt; \n" +
        "varying vec4 tile_featureColor; \n" +
        "void main() \n" +
        "{ \n" +
        "    tile_main(); \n" +
        "    gl_FragColor = tile_featureColor; \n" +
        "    gl_FragColor.rgb *= gl_FragColor.a; \n" +
        "}";
    } else {
      source +=
        "uniform sampler2D tile_batchTexture; \n" +
        "uniform sampler2D tile_pickTexture;\n" +
        "varying vec2 tile_featureSt; \n" +
        "void main() \n" +
        "{ \n" +
        "    tile_main(); \n" +
        "    vec4 featureProperties = texture2D(tile_batchTexture, tile_featureSt); \n" +
        "    if (featureProperties.a == 0.0) { \n" + // show: alpha == 0 - false, non-zeo - true
        "        discard; \n" +
        "    } \n" +
        "    gl_FragColor = featureProperties; \n" +
        "    gl_FragColor.rgb *= gl_FragColor.a; \n" +
        "} \n";
    }
    return source;
  };
};

function getColorBlend(batchTable) {
  var tileset = batchTable._content.tileset;
  var colorBlendMode = tileset.colorBlendMode;
  var colorBlendAmount = tileset.colorBlendAmount;
  if (colorBlendMode === Cesium3DTileColorBlendMode.HIGHLIGHT) {
    return 0.0;
  }
  if (colorBlendMode === Cesium3DTileColorBlendMode.REPLACE) {
    return 1.0;
  }
  if (colorBlendMode === Cesium3DTileColorBlendMode.MIX) {
    // The value 0.0 is reserved for highlight, so clamp to just above 0.0.
    return CesiumMath.clamp(colorBlendAmount, CesiumMath.EPSILON4, 1.0);
  }
  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    'Invalid color blend mode "' + colorBlendMode + '".'
  );
  //>>includeEnd('debug');
}

Cesium3DTileBatchTable.prototype.getUniformMapCallback = function () {
  if (this.featuresLength === 0) {
    return;
  }

  var that = this;
  return function (uniformMap) {
    var batchUniformMap = {
      tile_batchTexture: function () {
        // PERFORMANCE_IDEA: we could also use a custom shader that avoids the texture read.
        return defaultValue(
          that._batchTexture.batchTexture,
          that._batchTexture.defaultTexture
        );
      },
      tile_textureDimensions: function () {
        return that._batchTexture.textureDimensions;
      },
      tile_textureStep: function () {
        return that._batchTexture.textureStep;
      },
      tile_colorBlend: function () {
        return getColorBlend(that);
      },
      tile_pickTexture: function () {
        return that._batchTexture.pickTexture;
      },
    };

    return combine(uniformMap, batchUniformMap);
  };
};

Cesium3DTileBatchTable.prototype.getPickId = function () {
  return "texture2D(tile_pickTexture, tile_featureSt)";
};

///////////////////////////////////////////////////////////////////////////

var StyleCommandsNeeded = {
  ALL_OPAQUE: 0,
  ALL_TRANSLUCENT: 1,
  OPAQUE_AND_TRANSLUCENT: 2,
};

Cesium3DTileBatchTable.prototype.addDerivedCommands = function (
  frameState,
  commandStart
) {
  var commandList = frameState.commandList;
  var commandEnd = commandList.length;
  var tile = this._content._tile;
  var finalResolution = tile._finalResolution;
  var tileset = tile.tileset;
  var bivariateVisibilityTest =
    tileset._skipLevelOfDetail &&
    tileset._hasMixedContent &&
    frameState.context.stencilBuffer;
  var styleCommandsNeeded = getStyleCommandsNeeded(this);

  for (var i = commandStart; i < commandEnd; ++i) {
    var command = commandList[i];
    var derivedCommands = command.derivedCommands.tileset;
    if (!defined(derivedCommands) || command.dirty) {
      derivedCommands = {};
      command.derivedCommands.tileset = derivedCommands;
      derivedCommands.originalCommand = deriveCommand(command);
      command.dirty = false;
    }
    var originalCommand = derivedCommands.originalCommand;

    if (
      styleCommandsNeeded !== StyleCommandsNeeded.ALL_OPAQUE &&
      command.pass !== Pass.TRANSLUCENT
    ) {
      if (!defined(derivedCommands.translucent)) {
        derivedCommands.translucent = deriveTranslucentCommand(originalCommand);
      }
    }

    if (
      styleCommandsNeeded !== StyleCommandsNeeded.ALL_TRANSLUCENT &&
      command.pass !== Pass.TRANSLUCENT
    ) {
      if (!defined(derivedCommands.opaque)) {
        derivedCommands.opaque = deriveOpaqueCommand(originalCommand);
      }

      if (bivariateVisibilityTest) {
        if (!finalResolution) {
          if (!defined(derivedCommands.zback)) {
            derivedCommands.zback = deriveZBackfaceCommand(
              frameState.context,
              originalCommand
            );
          }
          tileset._backfaceCommands.push(derivedCommands.zback);
        }
        if (
          !defined(derivedCommands.stencil) ||
          tile._selectionDepth !==
            getLastSelectionDepth(derivedCommands.stencil)
        ) {
          if (command.renderState.depthMask) {
            derivedCommands.stencil = deriveStencilCommand(
              originalCommand,
              tile._selectionDepth
            );
          } else {
            // Ignore if tile does not write depth
            derivedCommands.stencil = derivedCommands.opaque;
          }
        }
      }
    }

    var opaqueCommand = bivariateVisibilityTest
      ? derivedCommands.stencil
      : derivedCommands.opaque;
    var translucentCommand = derivedCommands.translucent;

    // If the command was originally opaque:
    //    * If the styling applied to the tile is all opaque, use the opaque command
    //      (with one additional uniform needed for the shader).
    //    * If the styling is all translucent, use new (cached) derived commands (front
    //      and back faces) with a translucent render state.
    //    * If the styling causes both opaque and translucent features in this tile,
    //      then use both sets of commands.
    if (command.pass !== Pass.TRANSLUCENT) {
      if (styleCommandsNeeded === StyleCommandsNeeded.ALL_OPAQUE) {
        commandList[i] = opaqueCommand;
      }
      if (styleCommandsNeeded === StyleCommandsNeeded.ALL_TRANSLUCENT) {
        commandList[i] = translucentCommand;
      }
      if (styleCommandsNeeded === StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT) {
        // PERFORMANCE_IDEA: if the tile has multiple commands, we do not know what features are in what
        // commands so this case may be overkill.
        commandList[i] = opaqueCommand;
        commandList.push(translucentCommand);
      }
    } else {
      // Command was originally translucent so no need to derive new commands;
      // as of now, a style can't change an originally translucent feature to
      // opaque since the style's alpha is modulated, not a replacement.  When
      // this changes, we need to derive new opaque commands here.
      commandList[i] = originalCommand;
    }
  }
};

function getStyleCommandsNeeded(batchTable) {
  var translucentFeaturesLength =
    batchTable._batchTexture.translucentFeaturesLength;

  if (translucentFeaturesLength === 0) {
    return StyleCommandsNeeded.ALL_OPAQUE;
  } else if (translucentFeaturesLength === batchTable.featuresLength) {
    return StyleCommandsNeeded.ALL_TRANSLUCENT;
  }

  return StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT;
}

function deriveCommand(command) {
  var derivedCommand = DrawCommand.shallowClone(command);

  // Add a uniform to indicate if the original command was translucent so
  // the shader knows not to cull vertices that were originally transparent
  // even though their style is opaque.
  var translucentCommand = derivedCommand.pass === Pass.TRANSLUCENT;

  derivedCommand.uniformMap = defined(derivedCommand.uniformMap)
    ? derivedCommand.uniformMap
    : {};
  derivedCommand.uniformMap.tile_translucentCommand = function () {
    return translucentCommand;
  };

  return derivedCommand;
}

function deriveTranslucentCommand(command) {
  var derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.pass = Pass.TRANSLUCENT;
  derivedCommand.renderState = getTranslucentRenderState(command.renderState);
  return derivedCommand;
}

function deriveOpaqueCommand(command) {
  var derivedCommand = DrawCommand.shallowClone(command);
  derivedCommand.renderState = getOpaqueRenderState(command.renderState);
  return derivedCommand;
}

function getLogDepthPolygonOffsetFragmentShaderProgram(context, shaderProgram) {
  var shader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "zBackfaceLogDepth"
  );
  if (!defined(shader)) {
    var fs = shaderProgram.fragmentShaderSource.clone();
    fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
    fs.defines.push("POLYGON_OFFSET");

    fs.sources.unshift(
      "#ifdef GL_OES_standard_derivatives\n#extension GL_OES_standard_derivatives : enable\n#endif\n"
    );
    shader = context.shaderCache.createDerivedShaderProgram(
      shaderProgram,
      "zBackfaceLogDepth",
      {
        vertexShaderSource: shaderProgram.vertexShaderSource,
        fragmentShaderSource: fs,
        attributeLocations: shaderProgram._attributeLocations,
      }
    );
  }

  return shader;
}

function deriveZBackfaceCommand(context, command) {
  // Write just backface depth of unresolved tiles so resolved stenciled tiles do not appear in front
  var derivedCommand = DrawCommand.shallowClone(command);
  var rs = clone(derivedCommand.renderState, true);
  rs.cull.enabled = true;
  rs.cull.face = CullFace.FRONT;
  // Back faces do not need to write color.
  rs.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };
  // Push back face depth away from the camera so it is less likely that back faces and front faces of the same tile
  // intersect and overlap. This helps avoid flickering for very thin double-sided walls.
  rs.polygonOffset = {
    enabled: true,
    factor: 5.0,
    units: 5.0,
  };
  // Set the 3D Tiles bit
  rs.stencilTest = StencilConstants.setCesium3DTileBit();
  rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;

  derivedCommand.renderState = RenderState.fromCache(rs);
  derivedCommand.castShadows = false;
  derivedCommand.receiveShadows = false;
  derivedCommand.uniformMap = clone(command.uniformMap);

  var polygonOffset = new Cartesian2(5.0, 5.0);
  derivedCommand.uniformMap.u_polygonOffset = function () {
    return polygonOffset;
  };

  // Make the log depth depth fragment write account for the polygon offset, too.
  // Otherwise, the back face commands will cause the higher resolution
  // tiles to disappear.
  derivedCommand.shaderProgram = getLogDepthPolygonOffsetFragmentShaderProgram(
    context,
    command.shaderProgram
  );
  return derivedCommand;
}

function deriveStencilCommand(command, reference) {
  // Tiles only draw if their selection depth is >= the tile drawn already. They write their
  // selection depth to the stencil buffer to prevent ancestor tiles from drawing on top
  var derivedCommand = DrawCommand.shallowClone(command);
  var rs = clone(derivedCommand.renderState, true);
  // Stencil test is masked to the most significant 3 bits so the reference is shifted. Writes 0 for the terrain bit
  rs.stencilTest.enabled = true;
  rs.stencilTest.mask = StencilConstants.SKIP_LOD_MASK;
  rs.stencilTest.reference =
    StencilConstants.CESIUM_3D_TILE_MASK |
    (reference << StencilConstants.SKIP_LOD_BIT_SHIFT);
  rs.stencilTest.frontFunction = StencilFunction.GREATER_OR_EQUAL;
  rs.stencilTest.frontOperation.zPass = StencilOperation.REPLACE;
  rs.stencilTest.backFunction = StencilFunction.GREATER_OR_EQUAL;
  rs.stencilTest.backOperation.zPass = StencilOperation.REPLACE;
  rs.stencilMask =
    StencilConstants.CESIUM_3D_TILE_MASK | StencilConstants.SKIP_LOD_MASK;
  derivedCommand.renderState = RenderState.fromCache(rs);
  return derivedCommand;
}

function getLastSelectionDepth(stencilCommand) {
  // Isolate the selection depth from the stencil reference.
  var reference = stencilCommand.renderState.stencilTest.reference;
  return (
    (reference & StencilConstants.SKIP_LOD_MASK) >>>
    StencilConstants.SKIP_LOD_BIT_SHIFT
  );
}

function getTranslucentRenderState(renderState) {
  var rs = clone(renderState, true);
  rs.cull.enabled = false;
  rs.depthTest.enabled = true;
  rs.depthMask = false;
  rs.blending = BlendingState.ALPHA_BLEND;
  rs.stencilTest = StencilConstants.setCesium3DTileBit();
  rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;

  return RenderState.fromCache(rs);
}

function getOpaqueRenderState(renderState) {
  var rs = clone(renderState, true);
  rs.stencilTest = StencilConstants.setCesium3DTileBit();
  rs.stencilMask = StencilConstants.CESIUM_3D_TILE_MASK;

  return RenderState.fromCache(rs);
}

Cesium3DTileBatchTable.prototype.update = function (tileset, frameState) {
  this._batchTexture.update(tileset, frameState);
};

Cesium3DTileBatchTable.prototype.isDestroyed = function () {
  return false;
};

Cesium3DTileBatchTable.prototype.destroy = function () {
  this._batchTexture = this._batchTexture && this._batchTexture.destroy();
  return destroyObject(this);
};
export default Cesium3DTileBatchTable;
