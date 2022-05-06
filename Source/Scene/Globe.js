import BoundingSphere from "../Core/BoundingSphere.js";
import buildModuleUrl from "../Core/buildModuleUrl.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidTerrainProvider from "../Core/EllipsoidTerrainProvider.js";
import Event from "../Core/Event.js";
import IntersectionTests from "../Core/IntersectionTests.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import Ray from "../Core/Ray.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import Texture from "../Renderer/Texture.js";
import GlobeFS from "../Shaders/GlobeFS.js";
import GlobeVS from "../Shaders/GlobeVS.js";
import AtmosphereCommon from "../Shaders/AtmosphereCommon.js";
import GroundAtmosphere from "../Shaders/GroundAtmosphere.js";
import GlobeSurfaceShaderSet from "./GlobeSurfaceShaderSet.js";
import GlobeSurfaceTileProvider from "./GlobeSurfaceTileProvider.js";
import GlobeTranslucency from "./GlobeTranslucency.js";
import ImageryLayerCollection from "./ImageryLayerCollection.js";
import QuadtreePrimitive from "./QuadtreePrimitive.js";
import SceneMode from "./SceneMode.js";
import ShadowMode from "./ShadowMode.js";

/**
 * The globe rendered in the scene, including its terrain ({@link Globe#terrainProvider})
 * and imagery layers ({@link Globe#imageryLayers}).  Access the globe using {@link Scene#globe}.
 *
 * @alias Globe
 * @constructor
 *
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] Determines the size and shape of the
 * globe.
 */
function Globe(ellipsoid) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  const terrainProvider = new EllipsoidTerrainProvider({
    ellipsoid: ellipsoid,
  });
  const imageryLayerCollection = new ImageryLayerCollection();

  this._ellipsoid = ellipsoid;
  this._imageryLayerCollection = imageryLayerCollection;

  this._surfaceShaderSet = new GlobeSurfaceShaderSet();
  this._material = undefined;

  this._surface = new QuadtreePrimitive({
    tileProvider: new GlobeSurfaceTileProvider({
      terrainProvider: terrainProvider,
      imageryLayers: imageryLayerCollection,
      surfaceShaderSet: this._surfaceShaderSet,
    }),
  });

  this._terrainProvider = terrainProvider;
  this._terrainProviderChanged = new Event();

  this._undergroundColor = Color.clone(Color.BLACK);
  this._undergroundColorAlphaByDistance = new NearFarScalar(
    ellipsoid.maximumRadius / 1000.0,
    0.0,
    ellipsoid.maximumRadius / 5.0,
    1.0
  );

  this._translucency = new GlobeTranslucency();

  makeShadersDirty(this);

  /**
   * Determines if the globe will be shown.
   *
   * @type {Boolean}
   * @default true
   */
  this.show = true;

  this._oceanNormalMapResourceDirty = true;
  this._oceanNormalMapResource = new Resource({
    url: buildModuleUrl("Assets/Textures/waterNormalsSmall.jpg"),
  });

  /**
   * The maximum screen-space error used to drive level-of-detail refinement.  Higher
   * values will provide better performance but lower visual quality.
   *
   * @type {Number}
   * @default 2
   */
  this.maximumScreenSpaceError = 2;

  /**
   * The size of the terrain tile cache, expressed as a number of tiles.  Any additional
   * tiles beyond this number will be freed, as long as they aren't needed for rendering
   * this frame.  A larger number will consume more memory but will show detail faster
   * when, for example, zooming out and then back in.
   *
   * @type {Number}
   * @default 100
   */
  this.tileCacheSize = 100;

  /**
   * Gets or sets the number of loading descendant tiles that is considered "too many".
   * If a tile has too many loading descendants, that tile will be loaded and rendered before any of
   * its descendants are loaded and rendered. This means more feedback for the user that something
   * is happening at the cost of a longer overall load time. Setting this to 0 will cause each
   * tile level to be loaded successively, significantly increasing load time. Setting it to a large
   * number (e.g. 1000) will minimize the number of tiles that are loaded but tend to make
   * detail appear all at once after a long wait.
   * @type {Number}
   * @default 20
   */
  this.loadingDescendantLimit = 20;

  /**
   * Gets or sets a value indicating whether the ancestors of rendered tiles should be preloaded.
   * Setting this to true optimizes the zoom-out experience and provides more detail in
   * newly-exposed areas when panning. The down side is that it requires loading more tiles.
   * @type {Boolean}
   * @default true
   */
  this.preloadAncestors = true;

  /**
   * Gets or sets a value indicating whether the siblings of rendered tiles should be preloaded.
   * Setting this to true causes tiles with the same parent as a rendered tile to be loaded, even
   * if they are culled. Setting this to true may provide a better panning experience at the
   * cost of loading more tiles.
   * @type {Boolean}
   * @default false
   */
  this.preloadSiblings = false;

  /**
   * The color to use to highlight terrain fill tiles. If undefined, fill tiles are not
   * highlighted at all. The alpha value is used to alpha blend with the tile's
   * actual color. Because terrain fill tiles do not represent the actual terrain surface,
   * it may be useful in some applications to indicate visually that they are not to be trusted.
   * @type {Color}
   * @default undefined
   */
  this.fillHighlightColor = undefined;

  /**
   * Enable lighting the globe with the scene's light source.
   *
   * @type {Boolean}
   * @default false
   */
  this.enableLighting = false;

  /**
   * A multiplier to adjust terrain lambert lighting.
   * This number is multiplied by the result of <code>czm_getLambertDiffuse</code> in GlobeFS.glsl.
   * This only takes effect when <code>enableLighting</code> is <code>true</code>.
   *
   * @type {Number}
   * @default 0.9
   */
  this.lambertDiffuseMultiplier = 0.9;

  /**
   * Enable dynamic lighting effects on atmosphere and fog. This only takes effect
   * when <code>enableLighting</code> is <code>true</code>.
   *
   * @type {Boolean}
   * @default true
   */
  this.dynamicAtmosphereLighting = true;

  /**
   * Whether dynamic atmosphere lighting uses the sun direction instead of the scene's
   * light direction. This only takes effect when <code>enableLighting</code> and
   * <code>dynamicAtmosphereLighting</code> are <code>true</code>.
   *
   * @type {Boolean}
   * @default false
   */
  this.dynamicAtmosphereLightingFromSun = false;

  /**
   * Enable the ground atmosphere, which is drawn over the globe when viewed from a distance between <code>lightingFadeInDistance</code> and <code>lightingFadeOutDistance</code>.
   *
   * @type {Boolean}
   * @default true
   */
  this.showGroundAtmosphere = true;

  /**
   * The intensity of the light that is used for computing the ground atmosphere color.
   *
   * @type {Number}
   * @default 10.0
   */
  this.atmosphereLightIntensity = 10.0;

  /**
   * The Rayleigh scattering coefficient used in the atmospheric scattering equations for the ground atmosphere.
   *
   * @type {Cartesian3}
   * @default Cartesian3(5.5e-6, 13.0e-6, 28.4e-6)
   */
  this.atmosphereRayleighCoefficient = new Cartesian3(5.5e-6, 13.0e-6, 28.4e-6);

  /**
   * The Mie scattering coefficient used in the atmospheric scattering equations for the ground atmosphere.
   *
   * @type {Cartesian3}
   * @default Cartesian3(21e-6, 21e-6, 21e-6)
   */
  this.atmosphereMieCoefficient = new Cartesian3(21e-6, 21e-6, 21e-6);

  /**
   * The Rayleigh scale height used in the atmospheric scattering equations for the ground atmosphere, in meters.
   *
   * @type {Number}
   * @default 10000.0
   */
  this.atmosphereRayleighScaleHeight = 10000.0;

  /**
   * The Mie scale height used in the atmospheric scattering equations for the ground atmosphere, in meters.
   *
   * @type {Number}
   * @default 3200.0
   */
  this.atmosphereMieScaleHeight = 3200.0;

  /**
   * The anisotropy of the medium to consider for Mie scattering.
   * <p>
   * Valid values are between -1.0 and 1.0.
   * </p>
   * @type {Number}
   * @default 0.9
   */
  this.atmosphereMieAnisotropy = 0.9;

  /**
   * The distance where everything becomes lit. This only takes effect
   * when <code>enableLighting</code> or <code>showGroundAtmosphere</code> is <code>true</code>.
   *
   * @type {Number}
   * @default 10000000.0
   */
  this.lightingFadeOutDistance = 1.0e7;

  /**
   * The distance where lighting resumes. This only takes effect
   * when <code>enableLighting</code> or <code>showGroundAtmosphere</code> is <code>true</code>.
   *
   * @type {Number}
   * @default 20000000.0
   */
  this.lightingFadeInDistance = 2.0e7;

  /**
   * The distance where the darkness of night from the ground atmosphere fades out to a lit ground atmosphere.
   * This only takes effect when <code>showGroundAtmosphere</code>, <code>enableLighting</code>, and
   * <code>dynamicAtmosphereLighting</code> are <code>true</code>.
   *
   * @type {Number}
   * @default 10000000.0
   */
  this.nightFadeOutDistance = 1.0e7;

  /**
   * The distance where the darkness of night from the ground atmosphere fades in to an unlit ground atmosphere.
   * This only takes effect when <code>showGroundAtmosphere</code>, <code>enableLighting</code>, and
   * <code>dynamicAtmosphereLighting</code> are <code>true</code>.
   *
   * @type {Number}
   * @default 50000000.0
   */
  this.nightFadeInDistance = 5.0e7;

  /**
   * True if an animated wave effect should be shown in areas of the globe
   * covered by water; otherwise, false.  This property is ignored if the
   * <code>terrainProvider</code> does not provide a water mask.
   *
   * @type {Boolean}
   * @default true
   */
  this.showWaterEffect = true;

  /**
   * True if primitives such as billboards, polylines, labels, etc. should be depth-tested
   * against the terrain surface, or false if such primitives should always be drawn on top
   * of terrain unless they're on the opposite side of the globe.  The disadvantage of depth
   * testing primitives against terrain is that slight numerical noise or terrain level-of-detail
   * switched can sometimes make a primitive that should be on the surface disappear underneath it.
   *
   * @type {Boolean}
   * @default false
   *
   */
  this.depthTestAgainstTerrain = false;

  /**
   * Determines whether the globe casts or receives shadows from light sources. Setting the globe
   * to cast shadows may impact performance since the terrain is rendered again from the light's perspective.
   * Currently only terrain that is in view casts shadows. By default the globe does not cast shadows.
   *
   * @type {ShadowMode}
   * @default ShadowMode.RECEIVE_ONLY
   */
  this.shadows = ShadowMode.RECEIVE_ONLY;

  /**
   * The hue shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A hue shift of 1.0 indicates a complete rotation of the hues available.
   * @type {Number}
   * @default 0.0
   */
  this.atmosphereHueShift = 0.0;

  /**
   * The saturation shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A saturation shift of -1.0 is monochrome.
   * @type {Number}
   * @default 0.0
   */
  this.atmosphereSaturationShift = 0.0;

  /**
   * The brightness shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A brightness shift of -1.0 is complete darkness, which will let space show through.
   * @type {Number}
   * @default 0.0
   */
  this.atmosphereBrightnessShift = 0.0;

  /**
   * A scalar used to exaggerate the terrain. Defaults to <code>1.0</code> (no exaggeration).
   * A value of <code>2.0</code> scales the terrain by 2x.
   * A value of <code>0.0</code> makes the terrain completely flat.
   * Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
   * @type {Number}
   * @default 1.0
   */
  this.terrainExaggeration = 1.0;

  /**
   * The height from which terrain is exaggerated. Defaults to <code>0.0</code> (scaled relative to ellipsoid surface).
   * Terrain that is above this height will scale upwards and terrain that is below this height will scale downwards.
   * Note that terrain exaggeration will not modify any other primitive as they are positioned relative to the ellipsoid.
   * If {@link Globe#terrainExaggeration} is <code>1.0</code> this value will have no effect.
   * @type {Number}
   * @default 0.0
   */
  this.terrainExaggerationRelativeHeight = 0.0;

  /**
   * Whether to show terrain skirts. Terrain skirts are geometry extending downwards from a tile's edges used to hide seams between neighboring tiles.
   * Skirts are always hidden when the camera is underground or translucency is enabled.
   *
   * @type {Boolean}
   * @default true
   */
  this.showSkirts = true;

  /**
   * Whether to cull back-facing terrain. Back faces are not culled when the camera is underground or translucency is enabled.
   *
   * @type {Boolean}
   * @default true
   */
  this.backFaceCulling = true;

  this._oceanNormalMap = undefined;
  this._zoomedOutOceanSpecularIntensity = undefined;
}

Object.defineProperties(Globe.prototype, {
  /**
   * Gets an ellipsoid describing the shape of this globe.
   * @memberof Globe.prototype
   * @type {Ellipsoid}
   */
  ellipsoid: {
    get: function () {
      return this._ellipsoid;
    },
  },
  /**
   * Gets the collection of image layers that will be rendered on this globe.
   * @memberof Globe.prototype
   * @type {ImageryLayerCollection}
   */
  imageryLayers: {
    get: function () {
      return this._imageryLayerCollection;
    },
  },
  /**
   * Gets an event that's raised when an imagery layer is added, shown, hidden, moved, or removed.
   *
   * @memberof Globe.prototype
   * @type {Event}
   * @readonly
   */
  imageryLayersUpdatedEvent: {
    get: function () {
      return this._surface.tileProvider.imageryLayersUpdatedEvent;
    },
  },
  /**
   * Returns <code>true</code> when the tile load queue is empty, <code>false</code> otherwise.  When the load queue is empty,
   * all terrain and imagery for the current view have been loaded.
   * @memberof Globe.prototype
   * @type {Boolean}
   * @readonly
   */
  tilesLoaded: {
    get: function () {
      if (!defined(this._surface)) {
        return true;
      }
      return (
        this._surface.tileProvider.ready &&
        this._surface._tileLoadQueueHigh.length === 0 &&
        this._surface._tileLoadQueueMedium.length === 0 &&
        this._surface._tileLoadQueueLow.length === 0
      );
    },
  },
  /**
   * Gets or sets the color of the globe when no imagery is available.
   * @memberof Globe.prototype
   * @type {Color}
   */
  baseColor: {
    get: function () {
      return this._surface.tileProvider.baseColor;
    },
    set: function (value) {
      this._surface.tileProvider.baseColor = value;
    },
  },
  /**
   * A property specifying a {@link ClippingPlaneCollection} used to selectively disable rendering on the outside of each plane.
   *
   * @memberof Globe.prototype
   * @type {ClippingPlaneCollection}
   */
  clippingPlanes: {
    get: function () {
      return this._surface.tileProvider.clippingPlanes;
    },
    set: function (value) {
      this._surface.tileProvider.clippingPlanes = value;
    },
  },
  /**
   * A property specifying a {@link Rectangle} used to limit globe rendering to a cartographic area.
   * Defaults to the maximum extent of cartographic coordinates.
   *
   * @memberof Globe.prototype
   * @type {Rectangle}
   * @default {@link Rectangle.MAX_VALUE}
   */
  cartographicLimitRectangle: {
    get: function () {
      return this._surface.tileProvider.cartographicLimitRectangle;
    },
    set: function (value) {
      if (!defined(value)) {
        value = Rectangle.clone(Rectangle.MAX_VALUE);
      }
      this._surface.tileProvider.cartographicLimitRectangle = value;
    },
  },
  /**
   * The normal map to use for rendering waves in the ocean.  Setting this property will
   * only have an effect if the configured terrain provider includes a water mask.
   * @memberof Globe.prototype
   * @type {String}
   * @default buildModuleUrl('Assets/Textures/waterNormalsSmall.jpg')
   */
  oceanNormalMapUrl: {
    get: function () {
      return this._oceanNormalMapResource.url;
    },
    set: function (value) {
      this._oceanNormalMapResource.url = value;
      this._oceanNormalMapResourceDirty = true;
    },
  },
  /**
   * The terrain provider providing surface geometry for this globe.
   * @type {TerrainProvider}
   *
   * @memberof Globe.prototype
   * @type {TerrainProvider}
   *
   */
  terrainProvider: {
    get: function () {
      return this._terrainProvider;
    },
    set: function (value) {
      if (value !== this._terrainProvider) {
        this._terrainProvider = value;
        this._terrainProviderChanged.raiseEvent(value);
        if (defined(this._material)) {
          makeShadersDirty(this);
        }
      }
    },
  },
  /**
   * Gets an event that's raised when the terrain provider is changed
   *
   * @memberof Globe.prototype
   * @type {Event}
   * @readonly
   */
  terrainProviderChanged: {
    get: function () {
      return this._terrainProviderChanged;
    },
  },
  /**
   * Gets an event that's raised when the length of the tile load queue has changed since the last render frame.  When the load queue is empty,
   * all terrain and imagery for the current view have been loaded.  The event passes the new length of the tile load queue.
   *
   * @memberof Globe.prototype
   * @type {Event}
   */
  tileLoadProgressEvent: {
    get: function () {
      return this._surface.tileLoadProgressEvent;
    },
  },

  /**
   * Gets or sets the material appearance of the Globe.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
   * {@link https://github.com/CesiumGS/cesium/wiki/Fabric|Fabric}.
   * @memberof Globe.prototype
   * @type {Material | undefined}
   */
  material: {
    get: function () {
      return this._material;
    },
    set: function (material) {
      if (this._material !== material) {
        this._material = material;
        makeShadersDirty(this);
      }
    },
  },

  /**
   * The color to render the back side of the globe when the camera is underground or the globe is translucent,
   * blended with the globe color based on the camera's distance.
   * <br /><br />
   * To disable underground coloring, set <code>undergroundColor</code> to <code>undefined</code>.
   *
   * @memberof Globe.prototype
   * @type {Color}
   * @default {@link Color.BLACK}
   *
   * @see Globe#undergroundColorAlphaByDistance
   */
  undergroundColor: {
    get: function () {
      return this._undergroundColor;
    },
    set: function (value) {
      this._undergroundColor = Color.clone(value, this._undergroundColor);
    },
  },

  /**
   * Gets or sets the near and far distance for blending {@link Globe#undergroundColor} with the globe color.
   * The alpha will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the alpha remains clamped to the nearest bound. If undefined,
   * the underground color will not be blended with the globe color.
   * <br /> <br />
   * When the camera is above the ellipsoid the distance is computed from the nearest
   * point on the ellipsoid instead of the camera's position.
   *
   * @memberof Globe.prototype
   * @type {NearFarScalar}
   *
   * @see Globe#undergroundColor
   *
   */
  undergroundColorAlphaByDistance: {
    get: function () {
      return this._undergroundColorAlphaByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far < value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');
      this._undergroundColorAlphaByDistance = NearFarScalar.clone(
        value,
        this._undergroundColorAlphaByDistance
      );
    },
  },

  /**
   * Properties for controlling globe translucency.
   *
   * @memberof Globe.prototype
   * @type {GlobeTranslucency}
   */
  translucency: {
    get: function () {
      return this._translucency;
    },
  },
});

function makeShadersDirty(globe) {
  const defines = [];

  const requireNormals =
    defined(globe._material) &&
    (globe._material.shaderSource.match(/slope/) ||
      globe._material.shaderSource.match("normalEC"));

  const fragmentSources = [AtmosphereCommon, GroundAtmosphere];
  if (
    defined(globe._material) &&
    (!requireNormals || globe._terrainProvider.requestVertexNormals)
  ) {
    fragmentSources.push(globe._material.shaderSource);
    defines.push("APPLY_MATERIAL");
    globe._surface._tileProvider.materialUniformMap = globe._material._uniforms;
  } else {
    globe._surface._tileProvider.materialUniformMap = undefined;
  }
  fragmentSources.push(GlobeFS);

  globe._surfaceShaderSet.baseVertexShaderSource = new ShaderSource({
    sources: [AtmosphereCommon, GroundAtmosphere, GlobeVS],
    defines: defines,
  });

  globe._surfaceShaderSet.baseFragmentShaderSource = new ShaderSource({
    sources: fragmentSources,
    defines: defines,
  });
  globe._surfaceShaderSet.material = globe._material;
}

function createComparePickTileFunction(rayOrigin) {
  return function (a, b) {
    const aDist = BoundingSphere.distanceSquaredTo(
      a.pickBoundingSphere,
      rayOrigin
    );
    const bDist = BoundingSphere.distanceSquaredTo(
      b.pickBoundingSphere,
      rayOrigin
    );

    return aDist - bDist;
  };
}

const scratchArray = [];
const scratchSphereIntersectionResult = {
  start: 0.0,
  stop: 0.0,
};

/**
 * Find an intersection between a ray and the globe surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {Scene} scene The scene.
 * @param {Boolean} [cullBackFaces=true] Set to true to not pick back faces.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.  The returned position is in projected coordinates for 2D and Columbus View.
 *
 * @private
 */
Globe.prototype.pickWorldCoordinates = function (
  ray,
  scene,
  cullBackFaces,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(ray)) {
    throw new DeveloperError("ray is required");
  }
  if (!defined(scene)) {
    throw new DeveloperError("scene is required");
  }
  //>>includeEnd('debug');

  cullBackFaces = defaultValue(cullBackFaces, true);

  const mode = scene.mode;
  const projection = scene.mapProjection;

  const sphereIntersections = scratchArray;
  sphereIntersections.length = 0;

  const tilesToRender = this._surface._tilesToRender;
  let length = tilesToRender.length;

  let tile;
  let i;

  for (i = 0; i < length; ++i) {
    tile = tilesToRender[i];
    const surfaceTile = tile.data;

    if (!defined(surfaceTile)) {
      continue;
    }

    let boundingVolume = surfaceTile.pickBoundingSphere;
    if (mode !== SceneMode.SCENE3D) {
      surfaceTile.pickBoundingSphere = boundingVolume = BoundingSphere.fromRectangleWithHeights2D(
        tile.rectangle,
        projection,
        surfaceTile.tileBoundingRegion.minimumHeight,
        surfaceTile.tileBoundingRegion.maximumHeight,
        boundingVolume
      );
      Cartesian3.fromElements(
        boundingVolume.center.z,
        boundingVolume.center.x,
        boundingVolume.center.y,
        boundingVolume.center
      );
    } else if (defined(surfaceTile.renderedMesh)) {
      BoundingSphere.clone(
        surfaceTile.tileBoundingRegion.boundingSphere,
        boundingVolume
      );
    } else {
      // So wait how did we render this thing then? It shouldn't be possible to get here.
      continue;
    }

    const boundingSphereIntersection = IntersectionTests.raySphere(
      ray,
      boundingVolume,
      scratchSphereIntersectionResult
    );
    if (defined(boundingSphereIntersection)) {
      sphereIntersections.push(surfaceTile);
    }
  }

  sphereIntersections.sort(createComparePickTileFunction(ray.origin));

  let intersection;
  length = sphereIntersections.length;
  for (i = 0; i < length; ++i) {
    intersection = sphereIntersections[i].pick(
      ray,
      scene.frameState,
      scene.mapProjection,
      cullBackFaces,
      result
    );
    if (defined(intersection)) {
      break;
    }
  }

  return intersection;
};

const cartoScratch = new Cartographic();
/**
 * Find an intersection between a ray and the globe surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Ray} ray The ray to test for intersection.
 * @param {Scene} scene The scene.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @example
 * // find intersection of ray through a pixel and the globe
 * const ray = viewer.camera.getPickRay(windowCoordinates);
 * const intersection = globe.pick(ray, scene);
 */
Globe.prototype.pick = function (ray, scene, result) {
  result = this.pickWorldCoordinates(ray, scene, true, result);
  if (defined(result) && scene.mode !== SceneMode.SCENE3D) {
    result = Cartesian3.fromElements(result.y, result.z, result.x, result);
    const carto = scene.mapProjection.unproject(result, cartoScratch);
    result = scene.globe.ellipsoid.cartographicToCartesian(carto, result);
  }

  return result;
};

const scratchGetHeightCartesian = new Cartesian3();
const scratchGetHeightIntersection = new Cartesian3();
const scratchGetHeightCartographic = new Cartographic();
const scratchGetHeightRay = new Ray();

function tileIfContainsCartographic(tile, cartographic) {
  return defined(tile) && Rectangle.contains(tile.rectangle, cartographic)
    ? tile
    : undefined;
}

/**
 * Get the height of the surface at a given cartographic.
 *
 * @param {Cartographic} cartographic The cartographic for which to find the height.
 * @returns {Number|undefined} The height of the cartographic or undefined if it could not be found.
 */
Globe.prototype.getHeight = function (cartographic) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartographic)) {
    throw new DeveloperError("cartographic is required");
  }
  //>>includeEnd('debug');

  const levelZeroTiles = this._surface._levelZeroTiles;
  if (!defined(levelZeroTiles)) {
    return;
  }

  let tile;
  let i;

  const length = levelZeroTiles.length;
  for (i = 0; i < length; ++i) {
    tile = levelZeroTiles[i];
    if (Rectangle.contains(tile.rectangle, cartographic)) {
      break;
    }
  }

  if (i >= length) {
    return undefined;
  }

  let tileWithMesh = tile;

  while (defined(tile)) {
    tile =
      tileIfContainsCartographic(tile._southwestChild, cartographic) ||
      tileIfContainsCartographic(tile._southeastChild, cartographic) ||
      tileIfContainsCartographic(tile._northwestChild, cartographic) ||
      tile._northeastChild;

    if (
      defined(tile) &&
      defined(tile.data) &&
      defined(tile.data.renderedMesh)
    ) {
      tileWithMesh = tile;
    }
  }

  tile = tileWithMesh;

  // This tile was either rendered or culled.
  // It is sometimes useful to get a height from a culled tile,
  // e.g. when we're getting a height in order to place a billboard
  // on terrain, and the camera is looking at that same billboard.
  // The culled tile must have a valid mesh, though.
  if (
    !defined(tile) ||
    !defined(tile.data) ||
    !defined(tile.data.renderedMesh)
  ) {
    // Tile was not rendered (culled).
    return undefined;
  }

  const projection = this._surface._tileProvider.tilingScheme.projection;
  const ellipsoid = this._surface._tileProvider.tilingScheme.ellipsoid;

  //cartesian has to be on the ellipsoid surface for `ellipsoid.geodeticSurfaceNormal`
  const cartesian = Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    0.0,
    ellipsoid,
    scratchGetHeightCartesian
  );

  const ray = scratchGetHeightRay;
  const surfaceNormal = ellipsoid.geodeticSurfaceNormal(
    cartesian,
    ray.direction
  );

  // Try to find the intersection point between the surface normal and z-axis.
  // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
  const rayOrigin = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
    cartesian,
    11500.0,
    ray.origin
  );

  // Theoretically, not with Earth datums, the intersection point can be outside the ellipsoid
  if (!defined(rayOrigin)) {
    // intersection point is outside the ellipsoid, try other value
    // minimum height (-11500.0) for the terrain set, need to get this information from the terrain provider
    let minimumHeight;
    if (defined(tile.data.tileBoundingRegion)) {
      minimumHeight = tile.data.tileBoundingRegion.minimumHeight;
    }
    const magnitude = Math.min(defaultValue(minimumHeight, 0.0), -11500.0);

    // multiply by the *positive* value of the magnitude
    const vectorToMinimumPoint = Cartesian3.multiplyByScalar(
      surfaceNormal,
      Math.abs(magnitude) + 1,
      scratchGetHeightIntersection
    );
    Cartesian3.subtract(cartesian, vectorToMinimumPoint, ray.origin);
  }

  const intersection = tile.data.pick(
    ray,
    // why is mode passed as undefined? I'm not sure, it's always been this way
    undefined,
    projection,
    false,
    scratchGetHeightIntersection
  );
  if (!defined(intersection)) {
    return undefined;
  }

  return ellipsoid.cartesianToCartographic(
    intersection,
    scratchGetHeightCartographic
  ).height;
};

/**
 * @private
 */
Globe.prototype.update = function (frameState) {
  if (!this.show) {
    return;
  }

  if (frameState.passes.render) {
    this._surface.update(frameState);
  }
};

/**
 * @private
 */
Globe.prototype.beginFrame = function (frameState) {
  const surface = this._surface;
  const tileProvider = surface.tileProvider;
  const terrainProvider = this.terrainProvider;
  const hasWaterMask =
    this.showWaterEffect &&
    terrainProvider.ready &&
    terrainProvider.hasWaterMask;

  if (hasWaterMask && this._oceanNormalMapResourceDirty) {
    // url changed, load new normal map asynchronously
    this._oceanNormalMapResourceDirty = false;
    const oceanNormalMapResource = this._oceanNormalMapResource;
    const oceanNormalMapUrl = oceanNormalMapResource.url;
    if (defined(oceanNormalMapUrl)) {
      const that = this;
      oceanNormalMapResource.fetchImage().then(function (image) {
        if (oceanNormalMapUrl !== that._oceanNormalMapResource.url) {
          // url changed while we were loading
          return;
        }

        that._oceanNormalMap =
          that._oceanNormalMap && that._oceanNormalMap.destroy();
        that._oceanNormalMap = new Texture({
          context: frameState.context,
          source: image,
        });
      });
    } else {
      this._oceanNormalMap =
        this._oceanNormalMap && this._oceanNormalMap.destroy();
    }
  }

  const pass = frameState.passes;
  const mode = frameState.mode;

  if (pass.render) {
    if (this.showGroundAtmosphere) {
      this._zoomedOutOceanSpecularIntensity = 0.4;
    } else {
      this._zoomedOutOceanSpecularIntensity = 0.5;
    }

    surface.maximumScreenSpaceError = this.maximumScreenSpaceError;
    surface.tileCacheSize = this.tileCacheSize;
    surface.loadingDescendantLimit = this.loadingDescendantLimit;
    surface.preloadAncestors = this.preloadAncestors;
    surface.preloadSiblings = this.preloadSiblings;

    tileProvider.terrainProvider = this.terrainProvider;
    tileProvider.lightingFadeOutDistance = this.lightingFadeOutDistance;
    tileProvider.lightingFadeInDistance = this.lightingFadeInDistance;
    tileProvider.nightFadeOutDistance = this.nightFadeOutDistance;
    tileProvider.nightFadeInDistance = this.nightFadeInDistance;
    tileProvider.zoomedOutOceanSpecularIntensity =
      mode === SceneMode.SCENE3D ? this._zoomedOutOceanSpecularIntensity : 0.0;
    tileProvider.hasWaterMask = hasWaterMask;
    tileProvider.oceanNormalMap = this._oceanNormalMap;
    tileProvider.enableLighting = this.enableLighting;
    tileProvider.dynamicAtmosphereLighting = this.dynamicAtmosphereLighting;
    tileProvider.dynamicAtmosphereLightingFromSun = this.dynamicAtmosphereLightingFromSun;
    tileProvider.showGroundAtmosphere = this.showGroundAtmosphere;
    tileProvider.atmosphereLightIntensity = this.atmosphereLightIntensity;
    tileProvider.atmosphereRayleighCoefficient = this.atmosphereRayleighCoefficient;
    tileProvider.atmosphereMieCoefficient = this.atmosphereMieCoefficient;
    tileProvider.atmosphereRayleighScaleHeight = this.atmosphereRayleighScaleHeight;
    tileProvider.atmosphereMieScaleHeight = this.atmosphereMieScaleHeight;
    tileProvider.atmosphereMieAnisotropy = this.atmosphereMieAnisotropy;
    tileProvider.shadows = this.shadows;
    tileProvider.hueShift = this.atmosphereHueShift;
    tileProvider.saturationShift = this.atmosphereSaturationShift;
    tileProvider.brightnessShift = this.atmosphereBrightnessShift;
    tileProvider.fillHighlightColor = this.fillHighlightColor;
    tileProvider.showSkirts = this.showSkirts;
    tileProvider.backFaceCulling = this.backFaceCulling;
    tileProvider.undergroundColor = this._undergroundColor;
    tileProvider.undergroundColorAlphaByDistance = this._undergroundColorAlphaByDistance;
    tileProvider.lambertDiffuseMultiplier = this.lambertDiffuseMultiplier;
    surface.beginFrame(frameState);
  }
};

/**
 * @private
 */
Globe.prototype.render = function (frameState) {
  if (!this.show) {
    return;
  }

  if (defined(this._material)) {
    this._material.update(frameState.context);
  }

  this._surface.render(frameState);
};

/**
 * @private
 */
Globe.prototype.endFrame = function (frameState) {
  if (!this.show) {
    return;
  }

  if (frameState.passes.render) {
    this._surface.endFrame(frameState);
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 *
 * @see Globe#destroy
 */
Globe.prototype.isDestroyed = function () {
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
 * globe = globe && globe.destroy();
 *
 * @see Globe#isDestroyed
 */
Globe.prototype.destroy = function () {
  this._surfaceShaderSet =
    this._surfaceShaderSet && this._surfaceShaderSet.destroy();
  this._surface = this._surface && this._surface.destroy();
  this._oceanNormalMap = this._oceanNormalMap && this._oceanNormalMap.destroy();
  return destroyObject(this);
};
export default Globe;
