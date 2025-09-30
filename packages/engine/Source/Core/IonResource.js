import Uri from "urijs";
import Check from "./Check.js";
import Credit from "./Credit.js";
import Frozen from "./Frozen.js";
import defined from "./defined.js";
import Ion from "./Ion.js";
import Resource from "./Resource.js";
import RuntimeError from "./RuntimeError.js";

/**
 * A {@link Resource} instance that encapsulates Cesium ion asset access.
 * This object is normally not instantiated directly, use {@link IonResource.fromAssetId}.
 *
 * @alias IonResource
 * @constructor
 * @augments Resource
 *
 * @param {object} endpoint The result of the Cesium ion asset endpoint service.
 * @param {Resource} endpointResource The resource used to retrieve the endpoint.
 *
 * @see Ion
 * @see IonImageryProvider
 * @see createWorldTerrain
 * @see https://cesium.com
 */
function IonResource(endpoint, endpointResource) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("endpoint", endpoint);
  Check.defined("endpointResource", endpointResource);
  //>>includeEnd('debug');

  let options;
  const externalType = endpoint.externalType;
  const isExternal = defined(externalType);

  if (!isExternal) {
    options = {
      url: endpoint.url,
      retryAttempts: 1,
      retryCallback: retryCallback,
    };
  } else if (
    externalType === "3DTILES" ||
    externalType === "STK_TERRAIN_SERVER"
  ) {
    // 3D Tiles and STK Terrain Server external assets can still be represented as an IonResource
    options = { url: endpoint.options.url };
  } else {
    //External imagery assets have additional configuration that can't be represented as a Resource
    throw new RuntimeError(
      "Ion.createResource does not support external imagery assets; use IonImageryProvider instead.",
    );
  }

  Resource.call(this, options);

  // The asset endpoint data returned from ion.
  this._ionEndpoint = endpoint;
  this._ionEndpointDomain = isExternal
    ? undefined
    : new Uri(endpoint.url).authority();

  // The endpoint resource to fetch when a new token is needed
  this._ionEndpointResource = endpointResource;

  // The primary IonResource from which an instance is derived
  this._ionRoot = undefined;

  // Shared promise for endpooint requests amd credits (only ever set on the root request)
  this._pendingPromise = undefined;
  this._credits = undefined;
  this._isExternal = isExternal;
  this._createSessionCallback = undefined;
}

if (defined(Object.create)) {
  IonResource.prototype = Object.create(Resource.prototype);
  IonResource.prototype.constructor = IonResource;
}

/**
 * Asynchronously creates an instance.
 *
 * @param {number} assetId The Cesium ion asset id.
 * @param {object} [options] An object with the following properties:
 * @param {string} [options.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {string|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
 * @returns {Promise<IonResource>} A Promise to an instance representing the Cesium ion Asset.
 *
 * @example
 * // Load a Cesium3DTileset with asset ID of 124624234
 * try {
 *   const resource = await Cesium.IonResource.fromAssetId(124624234);
 *   const tileset = await Cesium.Cesium3DTileset.fromUrl(resource);
 *   scene.primitives.add(tileset);
 * } catch (error) {
 *   console.error(`Error creating tileset: ${error}`);
 * }
 *
 * @example
 * //Load a CZML file with asset ID of 10890
 * Cesium.IonResource.fromAssetId(10890)
 *   .then(function (resource) {
 *     viewer.dataSources.add(Cesium.CzmlDataSource.load(resource));
 *   });
 */
IonResource.fromAssetId = function (assetId, options) {
  const endpointResource = IonResource.createEndpointResourceFromAssetId(
    assetId,
    options,
  );

  return endpointResource.fetchJson().then(function (endpoint) {
    return new IonResource(endpoint, endpointResource);
  });
};

Object.defineProperties(IonResource.prototype, {
  /**
   * Gets the credits required for attribution of the asset.
   *
   * @memberof IonResource.prototype
   * @type {Credit[]}
   * @readonly
   */
  credits: {
    get: function () {
      // Only we're not the root, return its credits;
      if (defined(this._ionRoot)) {
        return this._ionRoot.credits;
      }

      // We are the root
      if (defined(this._credits)) {
        return this._credits;
      }

      this._credits = IonResource.getCreditsFromEndpoint(
        this._ionEndpoint,
        this._ionEndpointResource,
      );

      return this._credits;
    },
  },
});

/** @private */
IonResource.getCreditsFromEndpoint = function (endpoint, endpointResource) {
  const credits = endpoint.attributions.map(Credit.getIonCredit);
  const defaultTokenCredit = Ion.getDefaultTokenCredit(
    endpointResource.queryParameters.access_token,
  );
  if (defined(defaultTokenCredit)) {
    credits.push(Credit.clone(defaultTokenCredit));
  }
  return credits;
};

/** @inheritdoc */
IonResource.prototype.clone = function (result) {
  // We always want to use the root's information because it's the most up-to-date
  const ionRoot = this._ionRoot ?? this;

  if (!defined(result)) {
    result = new IonResource(
      ionRoot._ionEndpoint,
      ionRoot._ionEndpointResource,
    );
  }

  result = Resource.prototype.clone.call(this, result);
  result._ionRoot = ionRoot;
  result._isExternal = this._isExternal;

  return result;
};

IonResource.prototype.fetchImage = function (options) {
  if (!this._isExternal) {
    const userOptions = options;
    options = {
      preferBlob: true,
    };
    if (defined(userOptions)) {
      options.flipY = userOptions.flipY;
      options.preferImageBitmap = userOptions.preferImageBitmap;
    }
  }

  return Resource.prototype.fetchImage.call(this, options);
};

IonResource.prototype._makeRequest = function (options) {
  // Don't send ion access token to non-ion servers.
  if (
    this._isExternal ||
    new Uri(this.url).authority() !== this._ionEndpointDomain
  ) {
    return Resource.prototype._makeRequest.call(this, options);
  }

  addClientHeaders(options);
  options.headers.Authorization = `Bearer ${this._ionEndpoint.accessToken}`;

  return Resource.prototype._makeRequest.call(this, options);
};

/**
 * Creates a Resource instance for a Cesium ion endpoint.
 * @private
 * @param {string} url The url of the Cesium ion endpoint, relative to the base server url.
 * @param {object} [options] An object with the following properties:
 * @param {string} [options.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {string|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
 * @returns {Resource} An instance representing the Cesium ion endpoint.
 */
IonResource.createEndpointResource = function (url, options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  let server = options.server ?? Ion.defaultServer;
  const accessToken = options.accessToken ?? Ion.defaultAccessToken;
  server = Resource.createIfNeeded(server);

  const resourceOptions = {
    url,
  };

  if (defined(accessToken)) {
    resourceOptions.queryParameters = { access_token: accessToken };
  }

  if (defined(options.queryParameters)) {
    resourceOptions.queryParameters = {
      ...resourceOptions.queryParameters,
      ...options.queryParameters,
    };
  }

  addClientHeaders(resourceOptions);

  return server.getDerivedResource(resourceOptions);
};

/**
 * Creates a Resource instance for a Cesium ion endpoint corresponding to an asset ID.
 * @private
 * @param {number} assetId The Cesium ion asset id.
 * @param {object} [options] An object with the following properties:
 * @param {string} [options.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {string|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
 * @returns {Resource} An instance representing the Cesium ion endpoint.
 */
IonResource.createEndpointResourceFromAssetId = function (assetId, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("assetId", assetId);
  //>>includeEnd('debug');

  const url = `v1/assets/${assetId}/endpoint`;
  return IonResource.createEndpointResource(url, options);
};

/**
 * A function handling any service-specific logic when a new session is created after the session times out.
 * @callback IonResource.CreateSessionCallback
 * @private
 * @param {IonResource} ionResource The root ion resource.
 * @param {object} newEndpoint The result of the Cesium ion asset endpoint service.
 */

/**
 * Creates a Resource instance for a Cesium ion endpoint to a proxied external service.
 * @private
 * @param {object} options An object with the following properties:
 * @param {string} options.url The url of the Cesium ion endpoint, relative to the base server url.
 * @param {string[]} [options.attributions] The attributions returned from the Cesium ion asset endpoint service.
 * @param {IonResource.CreateSessionCallback} [options.createSessionCallback] A function handling any service-specific logic when a new session is created after the session times out.
 * @param {object} [options.endpointOptions] An object with the following properties:
 * @param {string} [options.endpointOptions.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {string|Resource} [options.endpointOptions.server=Ion.defaultServer] The resource to the Cesium ion API server.
 * @returns {Resource} An instance representing the Cesium ion endpoint.
 */
IonResource.fromExternalEndpoint = function ({
  url,
  attributions = [],
  endpointOptions,
  createSessionCallback,
}) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("url", url);
  //>>includeEnd('debug');

  const endpointResource = IonResource.createEndpointResource(
    url,
    endpointOptions,
  );
  const endpoint = { url, attributions, options: endpointOptions };
  const resource = new IonResource(endpoint, endpointResource);

  resource._createSessionCallback = createSessionCallback;

  return resource;
};

function addClientHeaders(options) {
  if (!defined(options.headers)) {
    options.headers = {};
  }
  options.headers["X-Cesium-Client"] = "CesiumJS";
  /* global CESIUM_VERSION */
  if (typeof CESIUM_VERSION !== "undefined") {
    options.headers["X-Cesium-Client-Version"] = CESIUM_VERSION;
  }
}

function retryCallback(that, error) {
  const ionRoot = that._ionRoot ?? that;
  const endpointResource = ionRoot._ionEndpointResource;

  // Image is not available in worker threads, so this avoids
  // a ReferenceError
  const imageDefined = typeof Image !== "undefined";

  // We only want to retry in the case of invalid credentials (401) or image
  // requests(since Image failures can not provide a status code)
  if (
    !defined(error) ||
    (error.statusCode !== 401 &&
      !(imageDefined && error.target instanceof Image))
  ) {
    return Promise.resolve(false);
  }

  // We use a shared pending promise for all derived assets, since they share
  // a common access_token.  If we're already requesting a new token for this
  // asset, we wait on the same promise.
  if (!defined(ionRoot._pendingPromise)) {
    ionRoot._pendingPromise = endpointResource
      .fetchJson()
      .then(function (newEndpoint) {
        // Set the token for root resource so new derived resources automatically pick it up
        ionRoot._ionEndpoint = newEndpoint;
        if (defined(ionRoot._createSessionCallback)) {
          ionRoot._createSessionCallback(ionRoot, newEndpoint);
        }
        return ionRoot._ionEndpoint;
      })
      .finally(function (newEndpoint) {
        // Pass or fail, we're done with this promise, the next failure should use a new one.
        ionRoot._pendingPromise = undefined;
        return newEndpoint;
      });
  }

  return ionRoot._pendingPromise.then(function (newEndpoint) {
    // Set the new token and endpoint for this resource
    that._ionEndpoint = newEndpoint;
    return true;
  });
}

export default IonResource;
