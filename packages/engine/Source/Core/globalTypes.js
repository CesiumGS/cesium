/**
 * Union of all numeric typed array types.
 * @typedef {Float64Array|Float32Array|Uint32Array|Uint16Array|Uint8Array|Int32Array|Int16Array|Int8Array} TypedArray
 */

/**
 * Union of all numeric typed array constructor types.
 * @typedef {Float64ArrayConstructor|Float32ArrayConstructor|Uint32ArrayConstructor|Uint16ArrayConstructor|Uint8ArrayConstructor|Int32ArrayConstructor|Int16ArrayConstructor|Int8ArrayConstructor} TypedArrayConstructor
 */

/**
 * @typedef {{destroy: Function}} Destroyable
 */

/**
 * A GeoJSON position expressed as [longitude, latitude] or [longitude, latitude, altitude].
 * @typedef {Array.<number>} GeoJsonPosition
 */

/**
 * A GeoJSON geometry object.
 * @typedef {{type: string, coordinates: (unknown|undefined), geometries: (Array.<GeoJsonGeometry>|undefined)}} GeoJsonGeometry
 */

/**
 * A GeoJSON feature object.
 * @typedef {{type: string, geometry: (GeoJsonGeometry|null), properties: (Object.<string, *>|null), id: (string|number|undefined)}} GeoJsonFeature
 */

/**
 * A GeoJSON feature collection object.
 * @typedef {{type: string, features: Array.<GeoJsonFeature>}} GeoJsonFeatureCollection
 */

/**
 * A top-level GeoJSON object (Geometry, Feature, or FeatureCollection).
 * @typedef {GeoJsonGeometry|GeoJsonFeature|GeoJsonFeatureCollection} GeoJson
 */

/**
 * This file is omitted from 'workspaceSourceFiles' in 'scripts/build.js', and
 * must provide type-only exports exclusively, without runtime values.
 * @ignore
 */
export default null;
