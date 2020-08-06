import Uri from "../ThirdParty/Uri.js";
import when from "../ThirdParty/when.js";
import Check from "./Check.js";
import Credit from "./Credit.js";
import defaultValue from "./defaultValue.js";
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
 * @param {Object} endpoint The result of the Cesium ion asset endpoint service.
 * @param {Resource} endpointResource The resource used to retreive the endpoint.
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

  var options;
  var externalType = endpoint.externalType;
  var isExternal = defined(externalType);

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
      "Ion.createResource does not support external imagery assets; use IonImageryProvider instead."
    );
  }

  Resource.call(this, options);

  // The asset endpoint data returned from ion.
  this._ionEndpoint = endpoint;
  this._ionEndpointDomain = isExternal
    ? undefined
    : new Uri(endpoint.url).authority;

  // The endpoint resource to fetch when a new token is needed
  this._ionEndpointResource = endpointResource;

  // The primary IonResource from which an instance is derived
  this._ionRoot = undefined;

  // Shared promise for endpooint requests amd credits (only ever set on the root request)
  this._pendingPromise = undefined;
  this._credits = undefined;
  this._isExternal = isExternal;
}

if (defined(Object.create)) {
  IonResource.prototype = Object.create(Resource.prototype);
  IonResource.prototype.constructor = IonResource;
}

/**
 * Asynchronously creates an instance.
 *
 * @param {Number} assetId The Cesium ion asset id.
 * @param {Object} [options] An object with the following properties:
 * @param {String} [options.accessToken=Ion.defaultAccessToken] The access token to use.
 * @param {String|Resource} [options.server=Ion.defaultServer] The resource to the Cesium ion API server.
 * @returns {Promise.<IonResource>} A Promise to am instance representing the Cesium ion Asset.
 *
 * @example
 * //Load a Cesium3DTileset with asset ID of 124624234
 * viewer.scene.primitives.add(new Cesium.Cesium3DTileset({ url: Cesium.IonResource.fromAssetId(124624234) }));
 *
 * @example
 * //Load a CZML file with asset ID of 10890
 * Cesium.IonResource.fromAssetId(10890)
 *   .then(function (resource) {
 *     viewer.dataSources.add(Cesium.CzmlDataSource.load(resource));
 *   });
 */
IonResource.fromAssetId = function (assetId, options) {
  var endpointResource = IonResource._createEndpointResource(assetId, options);

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
        this._ionEndpointResource
      );

      return this._credits;
    },
  },
});

/** @private */
IonResource.getCreditsFromEndpoint = function (endpoint, endpointResource) {
  var credits = endpoint.attributions.map(Credit.getIonCredit);
  var defaultTokenCredit = Ion.getDefaultTokenCredit(
    endpointResource.queryParameters.access_token
  );
  if (defined(defaultTokenCredit)) {
    credits.push(Credit.clone(defaultTokenCredit));
  }
  return credits;
};

/** @inheritdoc */
IonResource.prototype.clone = function (result) {
  // We always want to use the root's information because it's the most up-to-date
  var ionRoot = defaultValue(this._ionRoot, this);

  if (!defined(result)) {
    result = new IonResource(
      ionRoot._ionEndpoint,
      ionRoot._ionEndpointResource
    );
  }

  result = Resource.prototype.clone.call(this, result);
  result._ionRoot = ionRoot;
  result._isExternal = this._isExternal;

  return result;
};

IonResource.prototype.fetchImage = function (options) {
  if (!this._isExternal) {
    var userOptions = options;
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
    new Uri(this.url).authority !== this._ionEndpointDomain
  ) {
    return Resource.prototype._makeRequest.call(this, options);
  }

  if (!defined(options.headers)) {
    options.headers = {};
  }
  options.headers.Authorization = "Bearer " + this._ionEndpoint.accessToken;

  return Resource.prototype._makeRequest.call(this, options);
};

/**
 * @private
 */
IonResource._createEndpointResource = function (assetId, options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("assetId", assetId);
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var server = defaultValue(options.server, Ion.defaultServer);
  var accessToken = defaultValue(options.accessToken, Ion.defaultAccessToken);
  server = Resource.createIfNeeded(server);

  var resourceOptions = {
    url: "v1/assets/" + assetId + "/endpoint",
  };

  if (defined(accessToken)) {
    resourceOptions.queryParameters = { access_token: accessToken };
  }

  return server.getDerivedResource(resourceOptions);
};

function retryCallback(that, error) {
  var ionRoot = defaultValue(that._ionRoot, that);
  var endpointResource = ionRoot._ionEndpointResource;

  // We only want to retry in the case of invalid credentials (401) or image
  // requests(since Image failures can not provide a status code)
  if (
    !defined(error) ||
    (error.statusCode !== 401 && !(error.target instanceof Image))
  ) {
    return when.resolve(false);
  }

  // We use a shared pending promise for all derived assets, since they share
  // a common access_token.  If we're already requesting a new token for this
  // asset, we wait on the same promise.
  if (!defined(ionRoot._pendingPromise)) {
    ionRoot._pendingPromise = endpointResource
      .fetchJson()
      .then(function (newEndpoint) {
        //Set the token for root resource so new derived resources automatically pick it up
        ionRoot._ionEndpoint = newEndpoint;
        return newEndpoint;
      })
      .always(function (newEndpoint) {
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
