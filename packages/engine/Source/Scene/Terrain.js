import Check from "../Core/Check.js";
import Event from "../Core/Event.js";
import createWorldBathymetryAsync from "../Core/createWorldBathymetryAsync.js";
import createWorldTerrainAsync from "../Core/createWorldTerrainAsync.js";

/**
 * A helper to manage async operations of a terrain provider.
 *
 * @alias Terrain
 * @constructor
 *
 * @see Terrain.fromWorldTerrain
 * @see CesiumTerrainProvider
 * @see VRTheWorldTerrainProvider
 * @see GoogleEarthEnterpriseTerrainProvider
 *
 * @example
 * // Create
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   terrain: new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromUrl("https://myTestTerrain.com"));
 * });
 *
 * @example
 * // Handle loading events
 * const terrain = new Cesium.Terrain(Cesium.CesiumTerrainProvider.fromUrl("https://myTestTerrain.com"));
 *
 * scene.setTerrain(terrain);
 *
 * terrain.readyEvent.addEventListener(provider => {
 *   scene.globe.enableLighting = true;
 *
 *   terrain.provider.errorEvent.addEventListener(error => {
 *     alert(`Encountered an error while loading terrain tiles! ${error}`);
 *   });
 * });
 *
 * terrain.errorEvent.addEventListener(error => {
 *   alert(`Encountered an error while creating terrain! ${error}`);
 * });
 *
 * @param {Promise<TerrainProvider>} terrainProviderPromise A promise which resolves to a terrain provider
 */
function Terrain(terrainProviderPromise) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("terrainProviderPromise", terrainProviderPromise);
  //>>includeEnd('debug');

  this._ready = false;
  this._provider = undefined;
  this._errorEvent = new Event();
  this._readyEvent = new Event();

  handlePromise(this, terrainProviderPromise);
}

Object.defineProperties(Terrain.prototype, {
  /**
   * Gets an event that is raised when the terrain provider encounters an asynchronous error.  By subscribing
   * to the event, you will be notified of the error and can potentially recover from it.  Event listeners
   * are passed an instance of the thrown error.
   * @memberof Terrain.prototype
   * @type {Event<Terrain.ErrorEventCallback>}
   * @readonly
   */
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },

  /**
   * Gets an event that is raised when the terrain provider has been successfully created. Event listeners
   * are passed the created instance of {@link TerrainProvider}.
   * @memberof Terrain.prototype
   * @type {Event<Terrain.ReadyEventCallback>}
   * @readonly
   */
  readyEvent: {
    get: function () {
      return this._readyEvent;
    },
  },

  /**
   * Returns true when the terrain provider has been successfully created. Otherwise, returns false.
   * @memberof Viewer.prototype
   *
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * The terrain provider providing surface geometry to a globe. Do not use until {@link Terrain.readyEvent} is raised.
   * @memberof Viewer.prototype
   *
   * @type {TerrainProvider}
   * @readonly
   */
  provider: {
    get: function () {
      return this._provider;
    },
  },
});
/**
 * Creates a {@link Terrain} instance for {@link https://cesium.com/content/#cesium-world-terrain|Cesium World Terrain}.
 *
 * @function
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server if available.
 * @param {Boolean} [options.requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server if available.
 * @returns {Terrain} An asynchronous helper object for a CesiumTerrainProvider
 *
 * @see Ion
 * @see createWorldTerrainAsync
 *
 * @example
 * // Create Cesium World Terrain with default settings
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   terrain: Cesium.Terrain.fromWorldTerrain()
 * });
 *
 * @example
 * // Create Cesium World Terrain with water and normals.
 * const viewer1 = new Cesium.Viewer("cesiumContainer", {
 *   terrain: Cesium.Terrain.fromWorldTerrain({
 *      requestWaterMask: true,
 *      requestVertexNormals: true
 *    });
 * });
 *
 * @example
 * // Handle loading events
 * const terrain = Cesium.Terrain.fromWorldTerrain();
 *
 * scene.setTerrain(terrain);
 *
 * terrain.readyEvent.addEventListener(provider => {
 *   scene.globe.enableLighting = true;
 *
 *   terrain.provider.errorEvent.addEventListener(error => {
 *     alert(`Encountered an error while loading terrain tiles! ${error}`);
 *   });
 * });
 *
 * terrain.errorEvent.addEventListener(error => {
 *   alert(`Encountered an error while creating terrain! ${error}`);
 * });
 */
Terrain.fromWorldTerrain = function (options) {
  return new Terrain(createWorldTerrainAsync(options));
};

/**
 * Creates a {@link Terrain} instance for {@link https://cesium.com/content/#cesium-world-bathymetry|Cesium World Bathymetry}.
 *
 * @function
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server if available.
 * @returns {Terrain} An asynchronous helper object for a CesiumTerrainProvider
 *
 * @see Ion
 * @see createWorldBathymetryAsync
 *
 * @example
 * // Create Cesium World Bathymetry with default settings
 * const viewer = new Cesium.Viewer("cesiumContainer", {
 *   terrain: Cesium.Terrain.fromWorldBathymetry)
 * });
 *
 * @example
 * // Create Cesium World Terrain with normals.
 * const viewer1 = new Cesium.Viewer("cesiumContainer", {
 *   terrain: Cesium.Terrain.fromWorldBathymetry({
 *      requestVertexNormals: true
 *    });
 * });
 *
 * @example
 * // Handle loading events
 * const bathymetry = Cesium.Terrain.fromWorldBathymetry();
 *
 * scene.setTerrain(bathymetry);
 *
 * bathymetry.readyEvent.addEventListener(provider => {
 *   scene.globe.enableLighting = true;
 *
 *   bathymetry.provider.errorEvent.addEventListener(error => {
 *     alert(`Encountered an error while loading bathymetric terrain tiles! ${error}`);
 *   });
 * });
 *
 * bathymetry.errorEvent.addEventListener(error => {
 *   alert(`Encountered an error while creating bathymetric terrain! ${error}`);
 * });
 */
Terrain.fromWorldBathymetry = function (options) {
  return new Terrain(createWorldBathymetryAsync(options));
};

function handleError(errorEvent, error) {
  if (errorEvent.numberOfListeners > 0) {
    errorEvent.raiseEvent(error);
  } else {
    // Default handler is to log to the console
    console.error(error);
  }
}

async function handlePromise(instance, promise) {
  let provider;
  try {
    provider = await Promise.resolve(promise);
    instance._provider = provider;
    instance._ready = true;
    instance._readyEvent.raiseEvent(provider);
  } catch (error) {
    handleError(instance._errorEvent, error);
  }
}

export default Terrain;

/**
 * A function that is called when an error occurs.
 * @callback Terrain.ErrorEventCallback
 *
 * @this Terrain
 * @param {Error} err An object holding details about the error that occurred.
 */

/**
 * A function that is called when the provider has been created
 * @callback Terrain.ReadyEventCallback
 *
 * @this Terrain
 * @param {TerrainProvider} provider The created terrain provider.
 */
