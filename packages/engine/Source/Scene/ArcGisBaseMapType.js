// @ts-check

/**
 * ArcGisBaseMapType enumerates the ArcGIS image tile layers that are supported by default.
 *
 * @enum {number}
 * @see ArcGisMapServerImageryProvider
 */
const ArcGisBaseMapType = {
  SATELLITE: 1,
  OCEANS: 2,
  HILLSHADE: 3,
};

Object.freeze(ArcGisBaseMapType);

export default ArcGisBaseMapType;
