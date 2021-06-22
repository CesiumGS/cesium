import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import TerrainQuantization from "../Core/TerrainQuantization.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import getClippingFunction from "./getClippingFunction.js";
import SceneMode from "./SceneMode.js";

function GlobeSurfaceShader(
  numberOfDayTextures,
  flags,
  material,
  shaderProgram,
  clippingShaderState
) {
  this.numberOfDayTextures = numberOfDayTextures;
  this.flags = flags;
  this.material = material;
  this.shaderProgram = shaderProgram;
  this.clippingShaderState = clippingShaderState;
}

/**
 * Manages the shaders used to shade the surface of a {@link Globe}.
 *
 * @alias GlobeSurfaceShaderSet
 * @private
 */
function GlobeSurfaceShaderSet() {
  this.baseVertexShaderSource = undefined;
  this.baseFragmentShaderSource = undefined;

  this._shadersByTexturesFlags = [];

  this.material = undefined;
}

function getPositionMode(sceneMode) {
  var getPosition3DMode =
    "vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPosition3DMode(position, height, textureCoordinates); }";
  var getPositionColumbusViewAnd2DMode =
    "vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionColumbusViewMode(position, height, textureCoordinates); }";
  var getPositionMorphingMode =
    "vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionMorphingMode(position, height, textureCoordinates); }";

  var positionMode;

  switch (sceneMode) {
    case SceneMode.SCENE3D:
      positionMode = getPosition3DMode;
      break;
    case SceneMode.SCENE2D:
    case SceneMode.COLUMBUS_VIEW:
      positionMode = getPositionColumbusViewAnd2DMode;
      break;
    case SceneMode.MORPHING:
      positionMode = getPositionMorphingMode;
      break;
  }

  return positionMode;
}

function get2DYPositionFraction(useWebMercatorProjection) {
  var get2DYPositionFractionGeographicProjection =
    "float get2DYPositionFraction(vec2 textureCoordinates) { return get2DGeographicYPositionFraction(textureCoordinates); }";
  var get2DYPositionFractionMercatorProjection =
    "float get2DYPositionFraction(vec2 textureCoordinates) { return get2DMercatorYPositionFraction(textureCoordinates); }";
  return useWebMercatorProjection
    ? get2DYPositionFractionMercatorProjection
    : get2DYPositionFractionGeographicProjection;
}

GlobeSurfaceShaderSet.prototype.getShaderProgram = function (options) {
  var frameState = options.frameState;
  var surfaceTile = options.surfaceTile;
  var numberOfDayTextures = options.numberOfDayTextures;
  var applyBrightness = options.applyBrightness;
  var applyContrast = options.applyContrast;
  var applyHue = options.applyHue;
  var applySaturation = options.applySaturation;
  var applyGamma = options.applyGamma;
  var applyAlpha = options.applyAlpha;
  var applyDayNightAlpha = options.applyDayNightAlpha;
  var applySplit = options.applySplit;
  var showReflectiveOcean = options.showReflectiveOcean;
  var showOceanWaves = options.showOceanWaves;
  var enableLighting = options.enableLighting;
  var dynamicAtmosphereLighting = options.dynamicAtmosphereLighting;
  var dynamicAtmosphereLightingFromSun =
    options.dynamicAtmosphereLightingFromSun;
  var showGroundAtmosphere = options.showGroundAtmosphere;
  var perFragmentGroundAtmosphere = options.perFragmentGroundAtmosphere;
  var hasVertexNormals = options.hasVertexNormals;
  var useWebMercatorProjection = options.useWebMercatorProjection;
  var enableFog = options.enableFog;
  var enableClippingPlanes = options.enableClippingPlanes;
  var clippingPlanes = options.clippingPlanes;
  var clippedByBoundaries = options.clippedByBoundaries;
  var hasImageryLayerCutout = options.hasImageryLayerCutout;
  var colorCorrect = options.colorCorrect;
  var highlightFillTile = options.highlightFillTile;
  var colorToAlpha = options.colorToAlpha;
  var hasGeodeticSurfaceNormals = options.hasGeodeticSurfaceNormals;
  var hasExaggeration = options.hasExaggeration;
  var showUndergroundColor = options.showUndergroundColor;
  var translucent = options.translucent;

  var quantization = 0;
  var quantizationDefine = "";

  var mesh = surfaceTile.renderedMesh;
  var terrainEncoding = mesh.encoding;
  var quantizationMode = terrainEncoding.quantization;
  if (quantizationMode === TerrainQuantization.BITS12) {
    quantization = 1;
    quantizationDefine = "QUANTIZATION_BITS12";
  }

  var cartographicLimitRectangleFlag = 0;
  var cartographicLimitRectangleDefine = "";
  if (clippedByBoundaries) {
    cartographicLimitRectangleFlag = 1;
    cartographicLimitRectangleDefine = "TILE_LIMIT_RECTANGLE";
  }

  var imageryCutoutFlag = 0;
  var imageryCutoutDefine = "";
  if (hasImageryLayerCutout) {
    imageryCutoutFlag = 1;
    imageryCutoutDefine = "APPLY_IMAGERY_CUTOUT";
  }

  var sceneMode = frameState.mode;
  var flags =
    sceneMode |
    (applyBrightness << 2) |
    (applyContrast << 3) |
    (applyHue << 4) |
    (applySaturation << 5) |
    (applyGamma << 6) |
    (applyAlpha << 7) |
    (showReflectiveOcean << 8) |
    (showOceanWaves << 9) |
    (enableLighting << 10) |
    (dynamicAtmosphereLighting << 11) |
    (dynamicAtmosphereLightingFromSun << 12) |
    (showGroundAtmosphere << 13) |
    (perFragmentGroundAtmosphere << 14) |
    (hasVertexNormals << 15) |
    (useWebMercatorProjection << 16) |
    (enableFog << 17) |
    (quantization << 18) |
    (applySplit << 19) |
    (enableClippingPlanes << 20) |
    (cartographicLimitRectangleFlag << 21) |
    (imageryCutoutFlag << 22) |
    (colorCorrect << 23) |
    (highlightFillTile << 24) |
    (colorToAlpha << 25) |
    (hasGeodeticSurfaceNormals << 26) |
    (hasExaggeration << 27) |
    (showUndergroundColor << 28) |
    (translucent << 29) |
    (applyDayNightAlpha << 30);

  var currentClippingShaderState = 0;
  if (defined(clippingPlanes) && clippingPlanes.length > 0) {
    currentClippingShaderState = enableClippingPlanes
      ? clippingPlanes.clippingPlanesState
      : 0;
  }
  var surfaceShader = surfaceTile.surfaceShader;
  if (
    defined(surfaceShader) &&
    surfaceShader.numberOfDayTextures === numberOfDayTextures &&
    surfaceShader.flags === flags &&
    surfaceShader.material === this.material &&
    surfaceShader.clippingShaderState === currentClippingShaderState
  ) {
    return surfaceShader.shaderProgram;
  }

  // New tile, or tile changed number of textures, flags, or clipping planes
  var shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures];
  if (!defined(shadersByFlags)) {
    shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures] = [];
  }

  surfaceShader = shadersByFlags[flags];
  if (
    !defined(surfaceShader) ||
    surfaceShader.material !== this.material ||
    surfaceShader.clippingShaderState !== currentClippingShaderState
  ) {
    // Cache miss - we've never seen this combination of numberOfDayTextures and flags before.
    var vs = this.baseVertexShaderSource.clone();
    var fs = this.baseFragmentShaderSource.clone();

    if (currentClippingShaderState !== 0) {
      fs.sources.unshift(
        getClippingFunction(clippingPlanes, frameState.context)
      ); // Need to go before GlobeFS
    }

    vs.defines.push(quantizationDefine);
    fs.defines.push(
      "TEXTURE_UNITS " + numberOfDayTextures,
      cartographicLimitRectangleDefine,
      imageryCutoutDefine
    );

    if (applyBrightness) {
      fs.defines.push("APPLY_BRIGHTNESS");
    }
    if (applyContrast) {
      fs.defines.push("APPLY_CONTRAST");
    }
    if (applyHue) {
      fs.defines.push("APPLY_HUE");
    }
    if (applySaturation) {
      fs.defines.push("APPLY_SATURATION");
    }
    if (applyGamma) {
      fs.defines.push("APPLY_GAMMA");
    }
    if (applyAlpha) {
      fs.defines.push("APPLY_ALPHA");
    }
    if (applyDayNightAlpha) {
      fs.defines.push("APPLY_DAY_NIGHT_ALPHA");
    }
    if (showReflectiveOcean) {
      fs.defines.push("SHOW_REFLECTIVE_OCEAN");
      vs.defines.push("SHOW_REFLECTIVE_OCEAN");
    }
    if (showOceanWaves) {
      fs.defines.push("SHOW_OCEAN_WAVES");
    }
    if (colorToAlpha) {
      fs.defines.push("APPLY_COLOR_TO_ALPHA");
    }
    if (showUndergroundColor) {
      vs.defines.push("UNDERGROUND_COLOR");
      fs.defines.push("UNDERGROUND_COLOR");
    }
    if (translucent) {
      vs.defines.push("TRANSLUCENT");
      fs.defines.push("TRANSLUCENT");
    }
    if (enableLighting) {
      if (hasVertexNormals) {
        vs.defines.push("ENABLE_VERTEX_LIGHTING");
        fs.defines.push("ENABLE_VERTEX_LIGHTING");
      } else {
        vs.defines.push("ENABLE_DAYNIGHT_SHADING");
        fs.defines.push("ENABLE_DAYNIGHT_SHADING");
      }
    }

    if (dynamicAtmosphereLighting) {
      fs.defines.push("DYNAMIC_ATMOSPHERE_LIGHTING");
      if (dynamicAtmosphereLightingFromSun) {
        fs.defines.push("DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN");
      }
    }

    if (showGroundAtmosphere) {
      vs.defines.push("GROUND_ATMOSPHERE");
      fs.defines.push("GROUND_ATMOSPHERE");
      if (perFragmentGroundAtmosphere) {
        fs.defines.push("PER_FRAGMENT_GROUND_ATMOSPHERE");
      }
    }

    vs.defines.push("INCLUDE_WEB_MERCATOR_Y");
    fs.defines.push("INCLUDE_WEB_MERCATOR_Y");

    if (enableFog) {
      vs.defines.push("FOG");
      fs.defines.push("FOG");
    }

    if (applySplit) {
      fs.defines.push("APPLY_SPLIT");
    }

    if (enableClippingPlanes) {
      fs.defines.push("ENABLE_CLIPPING_PLANES");
    }

    if (colorCorrect) {
      fs.defines.push("COLOR_CORRECT");
    }

    if (highlightFillTile) {
      fs.defines.push("HIGHLIGHT_FILL_TILE");
    }

    if (hasGeodeticSurfaceNormals) {
      vs.defines.push("GEODETIC_SURFACE_NORMALS");
    }

    if (hasExaggeration) {
      vs.defines.push("EXAGGERATION");
    }

    var computeDayColor =
      "\
    vec4 computeDayColor(vec4 initialColor, vec3 textureCoordinates, float nightBlend)\n\
    {\n\
        vec4 color = initialColor;\n";

    if (hasImageryLayerCutout) {
      computeDayColor +=
        "\
        vec4 cutoutAndColorResult;\n\
        bool texelUnclipped;\n";
    }

    for (var i = 0; i < numberOfDayTextures; ++i) {
      if (hasImageryLayerCutout) {
        computeDayColor +=
          "\
        cutoutAndColorResult = u_dayTextureCutoutRectangles[" +
          i +
          "];\n\
        texelUnclipped = v_textureCoordinates.x < cutoutAndColorResult.x || cutoutAndColorResult.z < v_textureCoordinates.x || v_textureCoordinates.y < cutoutAndColorResult.y || cutoutAndColorResult.w < v_textureCoordinates.y;\n\
        cutoutAndColorResult = sampleAndBlend(\n";
      } else {
        computeDayColor += "\
        color = sampleAndBlend(\n";
      }
      computeDayColor +=
        "\
            color,\n\
            u_dayTextures[" +
        i +
        "],\n\
            u_dayTextureUseWebMercatorT[" +
        i +
        "] ? textureCoordinates.xz : textureCoordinates.xy,\n\
            u_dayTextureTexCoordsRectangle[" +
        i +
        "],\n\
            u_dayTextureTranslationAndScale[" +
        i +
        "],\n\
            " +
        (applyAlpha ? "u_dayTextureAlpha[" + i + "]" : "1.0") +
        ",\n\
            " +
        (applyDayNightAlpha ? "u_dayTextureNightAlpha[" + i + "]" : "1.0") +
        ",\n" +
        (applyDayNightAlpha ? "u_dayTextureDayAlpha[" + i + "]" : "1.0") +
        ",\n" +
        (applyBrightness ? "u_dayTextureBrightness[" + i + "]" : "0.0") +
        ",\n\
            " +
        (applyContrast ? "u_dayTextureContrast[" + i + "]" : "0.0") +
        ",\n\
            " +
        (applyHue ? "u_dayTextureHue[" + i + "]" : "0.0") +
        ",\n\
            " +
        (applySaturation ? "u_dayTextureSaturation[" + i + "]" : "0.0") +
        ",\n\
            " +
        (applyGamma ? "u_dayTextureOneOverGamma[" + i + "]" : "0.0") +
        ",\n\
            " +
        (applySplit ? "u_dayTextureSplit[" + i + "]" : "0.0") +
        ",\n\
            " +
        (colorToAlpha ? "u_colorsToAlpha[" + i + "]" : "vec4(0.0)") +
        ",\n\
        nightBlend\
        );\n";
      if (hasImageryLayerCutout) {
        computeDayColor +=
          "\
        color = czm_branchFreeTernary(texelUnclipped, cutoutAndColorResult, color);\n";
      }
    }

    computeDayColor += "\
        return color;\n\
    }";

    fs.sources.push(computeDayColor);

    vs.sources.push(getPositionMode(sceneMode));
    vs.sources.push(get2DYPositionFraction(useWebMercatorProjection));

    var shader = ShaderProgram.fromCache({
      context: frameState.context,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attributeLocations: terrainEncoding.getAttributeLocations(),
    });

    surfaceShader = shadersByFlags[flags] = new GlobeSurfaceShader(
      numberOfDayTextures,
      flags,
      this.material,
      shader,
      currentClippingShaderState
    );
  }

  surfaceTile.surfaceShader = surfaceShader;
  return surfaceShader.shaderProgram;
};

GlobeSurfaceShaderSet.prototype.destroy = function () {
  var flags;
  var shader;

  var shadersByTexturesFlags = this._shadersByTexturesFlags;
  for (var textureCount in shadersByTexturesFlags) {
    if (shadersByTexturesFlags.hasOwnProperty(textureCount)) {
      var shadersByFlags = shadersByTexturesFlags[textureCount];
      if (!defined(shadersByFlags)) {
        continue;
      }

      for (flags in shadersByFlags) {
        if (shadersByFlags.hasOwnProperty(flags)) {
          shader = shadersByFlags[flags];
          if (defined(shader)) {
            shader.shaderProgram.destroy();
          }
        }
      }
    }
  }

  return destroyObject(this);
};
export default GlobeSurfaceShaderSet;
