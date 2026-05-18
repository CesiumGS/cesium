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
 * @typedef {number[]} GeoJsonPosition
 */

/**
 * A GeoJSON geometry object.
 * @typedef {{ type: string; coordinates?: unknown; geometries?: GeoJsonGeometry[] }} GeoJsonGeometry
 */

/**
 * A GeoJSON feature object.
 * @typedef {{ type: "Feature"; geometry: GeoJsonGeometry | null; properties: Record<string, unknown> | null; id?: string | number }} GeoJsonFeature
 */

/**
 * A top-level GeoJSON object (Geometry, Feature, or FeatureCollection).
 * @typedef {GeoJsonGeometry | GeoJsonFeature | { type: "FeatureCollection"; features: GeoJsonFeature[] }} GeoJson
 */

/**
 * This file is omitted from 'workspaceSourceFiles' in 'scripts/build.js', and
 * must provide type-only exports exclusively, without runtime values.
 * @ignore
 */
export default null;
