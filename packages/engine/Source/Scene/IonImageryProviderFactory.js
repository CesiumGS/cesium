import IonResource from "../Core/IonResource.js";
import ArcGisMapServerImageryProvider from "./ArcGisMapServerImageryProvider.js";
import BingMapsImageryProvider from "./BingMapsImageryProvider.js";
import TileMapServiceImageryProvider from "./TileMapServiceImageryProvider.js";
import GoogleEarthEnterpriseMapsProvider from "./GoogleEarthEnterpriseMapsProvider.js";
import MapboxImageryProvider from "./MapboxImageryProvider.js";
import SingleTileImageryProvider from "./SingleTileImageryProvider.js";
import UrlTemplateImageryProvider from "./UrlTemplateImageryProvider.js";
import WebMapServiceImageryProvider from "./WebMapServiceImageryProvider.js";
import WebMapTileServiceImageryProvider from "./WebMapTileServiceImageryProvider.js";
import Google2DImageryProvider from "./Google2DImageryProvider.js";
import Azure2DImageryProvider from "./Azure2DImageryProvider.js";

/**
 * An asynchronous callback function that creates an ImageryProvider from
 * a Cesium ion asset endpoint.
 * @template {ImageryProvider} T
 * @callback IonImageryProviderFactoryCallback
 * @param {string} url The URL of the imagery service.
 * @param {object} endpoint The result of the Cesium ion asset endpoint service.
 * @param {Resource} endpointResource The original resource used to retrieve the endpoint.
 * @returns {Promise<T>} A promise that resolves to an instance of an ImageryProvider.
 * @private
 */

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<TileMapServiceImageryProvider>}
 */
export const defaultFactoryCallback = async (url, endpoint, endpointResource) =>
  TileMapServiceImageryProvider.fromUrl(
    new IonResource(endpoint, endpointResource),
  );

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<ArcGisMapServerImageryProvider>}
 */
export const ARCGIS_MAPSERVER = async (url, { options }) =>
  ArcGisMapServerImageryProvider.fromUrl(url, options);

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<BingMapsImageryProvider>}
 */
export const BING = async (url, { options }) => {
  return BingMapsImageryProvider.fromUrl(url, options);
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<GoogleEarthEnterpriseMapsProvider>}
 */
export const GOOGLE_EARTH = async (url, { options }) => {
  const channel = options.channel;
  delete options.channel;
  return GoogleEarthEnterpriseMapsProvider.fromUrl(url, channel, options);
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<MapboxImageryProvider>}
 */
export const MAPBOX = async (url, { options }) => {
  return new MapboxImageryProvider({
    url: url,
    ...options,
  });
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<SingleTileImageryProvider>}
 */
export const SINGLE_TILE = async (url, { options }) =>
  SingleTileImageryProvider.fromUrl(url, options);

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<TileMapServiceImageryProvider>}
 */
export const TMS = async (url, { options }) =>
  TileMapServiceImageryProvider.fromUrl(url, options);

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<UrlTemplateImageryProvider>}
 */
export const URL_TEMPLATE = async (url, { options }) => {
  return new UrlTemplateImageryProvider({
    url: url,
    ...options,
  });
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<WebMapServiceImageryProvider>}
 */
export const WMS = async (url, { options }) => {
  return new WebMapServiceImageryProvider({
    url: url,
    ...options,
  });
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<WebMapTileServiceImageryProvider>}
 */
export const WMTS = async (url, { options }) => {
  return new WebMapTileServiceImageryProvider({
    url: url,
    ...options,
  });
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<Google2DImageryProvider>}
 */
export const GOOGLE_2D_MAPS = async (url, endpoint, endpointResource) => {
  delete endpoint.externalType;
  endpoint.url = url;

  const ionResource = new IonResource(endpoint, endpointResource);

  const callback = (ionRoot, endpoint) => {
    delete endpoint.externalType;
    endpoint.url = url;

    const { options } = endpoint;
    ionRoot.setQueryParameters({
      session: options.session,
      key: options.key,
    });
  };

  ionResource.refreshCallback = callback;
  return new Google2DImageryProvider({
    ...endpoint.options,
    url: ionResource,
  });
};

/**
 * @private
 * @type {IonImageryProviderFactoryCallback<Azure2DImageryProvider>}
 */
export const AZURE_MAPS = async (url, endpoint, endpointResource) => {
  delete endpoint.externalType;
  endpoint.url = url;

  const ionResource = new IonResource(endpoint, endpointResource);

  const callback = (ionRoot, endpoint) => {
    delete endpoint.externalType;
    endpoint.url = url;

    const { options } = endpoint;
    ionRoot.setQueryParameters({
      "subscription-key": options["subscription-key"],
    });
  };

  ionResource.refreshCallback = callback;
  return new Azure2DImageryProvider({
    ...endpoint.options,
    url: ionResource,
  });
};

/**
 * Mapping of supported external imagery asset types returned from Cesium ion to their
 * corresponding ImageryProvider constructors.
 * @private
 * @type {object<string, IonImageryProviderFactoryCallback>}
 */
const IonImageryProviderFactory = {
  ARCGIS_MAPSERVER,
  BING,
  GOOGLE_EARTH,
  MAPBOX,
  SINGLE_TILE,
  TMS,
  URL_TEMPLATE,
  WMS,
  WMTS,
  GOOGLE_2D_MAPS,
  AZURE_MAPS,
  defaultFactoryCallback,
};

export default Object.freeze(IonImageryProviderFactory);
