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
  clippingShaderState,
  clippingPolygonShaderState,
) {
  this.numberOfDayTextures = numberOfDayTextures;
  this.flags = flags;
  this.material = material;
  this.shaderProgram = shaderProgram;
  this.clippingShaderState = clippingShaderState;
  this.clippingPolygonShaderState = clippingPolygonShaderState;
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
  const getPosition3DMode =
    "vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPosition3DMode(position, height, textureCoordinates); }";
  const getPositionColumbusViewAnd2DMode =
    "vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionColumbusViewMode(position, height, textureCoordinates); }";
  const getPositionMorphingMode =
    "vec4 getPosition(vec3 position, float height, vec2 textureCoordinates) { return getPositionMorphingMode(position, height, textureCoordinates); }";

  let positionMode;

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

function getPolygonClippingFunction(context) {
  // return a noop for webgl1
  if (!context.webgl2) {
    return `void clipPolygons(highp sampler2D clippingDistance, int regionsLength, vec2 clippingPosition, int regionIndex) {
    }`;
  }

  return `void clipPolygons(highp sampler2D clippingDistance, int regionsLength, vec2 clippingPosition, int regionIndex) {
    czm_clipPolygons(clippingDistance, regionsLength, clippingPosition, regionIndex);
  }`;
}

function getUnpackClippingFunction(context) {
  // return a noop for webgl1
  if (!context.webgl2) {
    return `vec4 unpackClippingExtents(highp sampler2D extentsTexture, int index) {
      return vec4();
    }`;
  }

  return `vec4 unpackClippingExtents(highp sampler2D extentsTexture, int index) {
    return czm_unpackClippingExtents(extentsTexture, index);
  }`;
}

function get2DYPositionFraction(useWebMercatorProjection) {
  const get2DYPositionFractionGeographicProjection =
    "float get2DYPositionFraction(vec2 textureCoordinates) { return get2DGeographicYPositionFraction(textureCoordinates); }";
  const get2DYPositionFractionMercatorProjection =
    "float get2DYPositionFraction(vec2 textureCoordinates) { return get2DMercatorYPositionFraction(textureCoordinates); }";
  return useWebMercatorProjection
    ? get2DYPositionFractionMercatorProjection
    : get2DYPositionFractionGeographicProjection;
}

GlobeSurfaceShaderSet.prototype.getShaderProgram = function (options) {
  const frameState = options.frameState;
  const surfaceTile = options.surfaceTile;
  const numberOfDayTextures = options.numberOfDayTextures;
  const applyBrightness = options.applyBrightness;
  const applyContrast = options.applyContrast;
  const applyHue = options.applyHue;
  const applySaturation = options.applySaturation;
  const applyGamma = options.applyGamma;
  const applyAlpha = options.applyAlpha;
  const applyDayNightAlpha = options.applyDayNightAlpha;
  const applySplit = options.applySplit;
  const hasWaterMask = options.hasWaterMask;
  const showReflectiveOcean = options.showReflectiveOcean;
  const showOceanWaves = options.showOceanWaves;
  const enableLighting = options.enableLighting;
  const dynamicAtmosphereLighting = options.dynamicAtmosphereLighting;
  const dynamicAtmosphereLightingFromSun =
    options.dynamicAtmosphereLightingFromSun;
  const showGroundAtmosphere = options.showGroundAtmosphere;
  const perFragmentGroundAtmosphere = options.perFragmentGroundAtmosphere;
  const hasVertexNormals = options.hasVertexNormals;
  const useWebMercatorProjection = options.useWebMercatorProjection;
  const enableFog = options.enableFog;
  const enableClippingPlanes = options.enableClippingPlanes;
  const clippingPlanes = options.clippingPlanes;
  const enableClippingPolygons = options.enableClippingPolygons;
  const clippingPolygons = options.clippingPolygons;
  const clippedByBoundaries = options.clippedByBoundaries;
  const hasImageryLayerCutout = options.hasImageryLayerCutout;
  const colorCorrect = options.colorCorrect;
  const highlightFillTile = options.highlightFillTile;
  const colorToAlpha = options.colorToAlpha;
  const hasGeodeticSurfaceNormals = options.hasGeodeticSurfaceNormals;
  const hasExaggeration = options.hasExaggeration;
  const showUndergroundColor = options.showUndergroundColor;
  const translucent = options.translucent;

  let quantization = 0;
  let quantizationDefine = "";

  const mesh = surfaceTile.renderedMesh;
  const terrainEncoding = mesh.encoding;
  const quantizationMode = terrainEncoding.quantization;
  if (quantizationMode === TerrainQuantization.BITS12) {
    quantization = 1;
    quantizationDefine = "QUANTIZATION_BITS12";
  }

  let cartographicLimitRectangleFlag = 0;
  let cartographicLimitRectangleDefine = "";
  if (clippedByBoundaries) {
    cartographicLimitRectangleFlag = 1;
    cartographicLimitRectangleDefine = "TILE_LIMIT_RECTANGLE";
  }

  let imageryCutoutFlag = 0;
  let imageryCutoutDefine = "";
  if (hasImageryLayerCutout) {
    imageryCutoutFlag = 1;
    imageryCutoutDefine = "APPLY_IMAGERY_CUTOUT";
  }

  const sceneMode = frameState.mode;
  const flags =
    sceneMode |
    (applyBrightness << 2) |
    (applyContrast << 3) |
    (applyHue << 4) |
    (applySaturation << 5) |
    (applyGamma << 6) |
    (applyAlpha << 7) |
    (hasWaterMask << 8) |
    (showReflectiveOcean << 9) |
    (showOceanWaves << 10) |
    (enableLighting << 11) |
    (dynamicAtmosphereLighting << 12) |
    (dynamicAtmosphereLightingFromSun << 13) |
    (showGroundAtmosphere << 14) |
    (perFragmentGroundAtmosphere << 15) |
    (hasVertexNormals << 16) |
    (useWebMercatorProjection << 17) |
    (enableFog << 18) |
    (quantization << 19) |
    (applySplit << 20) |
    (enableClippingPlanes << 21) |
    (enableClippingPolygons << 22) |
    (cartographicLimitRectangleFlag << 23) |
    (imageryCutoutFlag << 24) |
    (colorCorrect << 25) |
    (highlightFillTile << 26) |
    (colorToAlpha << 27) |
    (hasGeodeticSurfaceNormals << 28) |
    (hasExaggeration << 29) |
    (showUndergroundColor << 30) |
    (translucent << 31) |
    (applyDayNightAlpha << 32);

  let currentClippingShaderState = 0;
  if (defined(clippingPlanes) && clippingPlanes.length > 0) {
    currentClippingShaderState = enableClippingPlanes
      ? clippingPlanes.clippingPlanesState
      : 0;
  }

  let currentClippingPolygonsShaderState = 0;
  if (defined(clippingPolygons) && clippingPolygons.length > 0) {
    currentClippingPolygonsShaderState = enableClippingPolygons
      ? clippingPolygons.clippingPolygonsState
      : 0;
  }

  let surfaceShader = surfaceTile.surfaceShader;
  if (
    defined(surfaceShader) &&
    surfaceShader.numberOfDayTextures === numberOfDayTextures &&
    surfaceShader.flags === flags &&
    surfaceShader.material === this.material &&
    surfaceShader.clippingShaderState === currentClippingShaderState &&
    surfaceShader.clippingPolygonShaderState ===
      currentClippingPolygonsShaderState
  ) {
    return surfaceShader.shaderProgram;
  }

  // New tile, or tile changed number of textures, flags, or clipping planes
  let shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures];
  if (!defined(shadersByFlags)) {
    shadersByFlags = this._shadersByTexturesFlags[numberOfDayTextures] = [];
  }

  surfaceShader = shadersByFlags[flags];
  if (
    !defined(surfaceShader) ||
    surfaceShader.material !== this.material ||
    surfaceShader.clippingShaderState !== currentClippingShaderState ||
    surfaceShader.clippingPolygonShaderState !==
      currentClippingPolygonsShaderState
  ) {
    // Cache miss - we've never seen this combination of numberOfDayTextures and flags before.
    const vs = this.baseVertexShaderSource.clone();
    const fs = this.baseFragmentShaderSource.clone();

    // Need to go before GlobeFS
    if (currentClippingShaderState !== 0) {
      fs.sources.unshift(
        getClippingFunction(clippingPlanes, frameState.context),
      );
    }

    // Need to go before GlobeFS
    if (currentClippingPolygonsShaderState !== 0) {
      fs.sources.unshift(getPolygonClippingFunction(frameState.context));
      vs.sources.unshift(getUnpackClippingFunction(frameState.context));
    }

    vs.defines.push(quantizationDefine);
    fs.defines.push(
      `TEXTURE_UNITS ${numberOfDayTextures}`,
      cartographicLimitRectangleDefine,
      imageryCutoutDefine,
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
    if (hasWaterMask) {
      fs.defines.push("HAS_WATER_MASK");
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
      vs.defines.push("DYNAMIC_ATMOSPHERE_LIGHTING");
      fs.defines.push("DYNAMIC_ATMOSPHERE_LIGHTING");
      if (dynamicAtmosphereLightingFromSun) {
        vs.defines.push("DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN");
        fs.defines.push("DYNAMIC_ATMOSPHERE_LIGHTING_FROM_SUN");
      }
    }

    if (showGroundAtmosphere) {
      vs.defines.push("GROUND_ATMOSPHERE");
      fs.defines.push("GROUND_ATMOSPHERE");
      if (perFragmentGroundAtmosphere) {
        vs.defines.push("PER_FRAGMENT_GROUND_ATMOSPHERE");
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

    if (enableClippingPolygons) {
      fs.defines.push("ENABLE_CLIPPING_POLYGONS");
      vs.defines.push("ENABLE_CLIPPING_POLYGONS");

      if (clippingPolygons.inverse) {
        fs.defines.push("CLIPPING_INVERSE");
      }

      fs.defines.push(
        `CLIPPING_POLYGON_REGIONS_LENGTH ${clippingPolygons.extentsCount}`,
      );
      vs.defines.push(
        `CLIPPING_POLYGON_REGIONS_LENGTH ${clippingPolygons.extentsCount}`,
      );
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

    let computeDayColor =
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

    for (let i = 0; i < numberOfDayTextures; ++i) {
      if (hasImageryLayerCutout) {
        computeDayColor += `\
        cutoutAndColorResult = u_dayTextureCutoutRectangles[${i}];\n\
        texelUnclipped = v_textureCoordinates.x < cutoutAndColorResult.x || cutoutAndColorResult.z < v_textureCoordinates.x || v_textureCoordinates.y < cutoutAndColorResult.y || cutoutAndColorResult.w < v_textureCoordinates.y;\n\
        cutoutAndColorResult = sampleAndBlend(\n`;
      } else {
        computeDayColor +=
          "\
        color = sampleAndBlend(\n";
      }
      computeDayColor += `\
            color,\n\
            u_dayTextures[${i}],\n\
            u_dayTextureUseWebMercatorT[${i}] ? textureCoordinates.xz : textureCoordinates.xy,\n\
            u_dayTextureTexCoordsRectangle[${i}],\n\
            u_dayTextureTranslationAndScale[${i}],\n\
            ${applyAlpha ? `u_dayTextureAlpha[${i}]` : "1.0"},\n\
            ${applyDayNightAlpha ? `u_dayTextureNightAlpha[${i}]` : "1.0"},\n${
              applyDayNightAlpha ? `u_dayTextureDayAlpha[${i}]` : "1.0"
            },\n${applyBrightness ? `u_dayTextureBrightness[${i}]` : "0.0"},\n\
            ${applyContrast ? `u_dayTextureContrast[${i}]` : "0.0"},\n\
            ${applyHue ? `u_dayTextureHue[${i}]` : "0.0"},\n\
            ${applySaturation ? `u_dayTextureSaturation[${i}]` : "0.0"},\n\
            ${applyGamma ? `u_dayTextureOneOverGamma[${i}]` : "0.0"},\n\
            ${applySplit ? `u_dayTextureSplit[${i}]` : "0.0"},\n\
            ${colorToAlpha ? `u_colorsToAlpha[${i}]` : "vec4(0.0)"},\n\
        nightBlend\
        );\n`;
      if (hasImageryLayerCutout) {
        computeDayColor +=
          "\
        color = czm_branchFreeTernary(texelUnclipped, cutoutAndColorResult, color);\n";
      }
    }

    computeDayColor +=
      "\
        return color;\n\
    }";

    fs.sources.push(computeDayColor);

    vs.sources.push(getPositionMode(sceneMode));
    vs.sources.push(get2DYPositionFraction(useWebMercatorProjection));

    const shader = ShaderProgram.fromCache({
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
      currentClippingShaderState,
      currentClippingPolygonsShaderState,
    );
  }

  surfaceTile.surfaceShader = surfaceShader;
  return surfaceShader.shaderProgram;
};

GlobeSurfaceShaderSet.prototype.destroy = function () {
  let flags;
  let shader;

  const shadersByTexturesFlags = this._shadersByTexturesFlags;
  for (const textureCount in shadersByTexturesFlags) {
    if (shadersByTexturesFlags.hasOwnProperty(textureCount)) {
      const shadersByFlags = shadersByTexturesFlags[textureCount];
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
