import ArcType from "../Core/ArcType.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import defined from "../Core/defined";
import PinBuilder from "../Core/PinBuilder.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";
import RuntimeError from "../Core/RuntimeError.js";
import HeightReference from "../Scene/HeightReference.js";
import VerticalOrigin from "../Scene/VerticalOrigin.js";
import BillboardGraphics from "./BillboardGraphics.js";
import CallbackProperty from "./CallbackProperty.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import ConstantPositionProperty from "./ConstantPositionProperty.js";
import ConstantProperty from "./ConstantProperty.js";
import Entity from "./Entity.js";
import PolygonGraphics from "./PolygonGraphics.js";

/**
 * @typedef {Object} GeoJson
 */

/**
 * @typedef {Object} ParseOptions
 * @property {DescribeFunction} describe
 * @property {number} markerSize
 * @property {any} markerSymbol
 * @property {Color} markerColor
 * @property {ConstantProperty} strokeWidthProperty
 * @property {ColorMaterialProperty} strokeMaterialProperty
 * @property {ColorMaterialProperty} fillMaterialProperty
 * @property {boolean} clampToGround
 * @property {boolean} preventDuplicates
 */

/**
 * @callback CrsFunction
 * @param {number[]} coordinates
 * @returns {Cartesian3}
 */

/** @type {CrsFunction} */
function defaultCrsFunction(coordinates) {
  return Cartesian3.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
}

// const crsNames = {
//   "urn:ogc:def:crs:OGC:1.3:CRS84": defaultCrsFunction,
//   "EPSG:4326": defaultCrsFunction,
//   "urn:ogc:def:crs:EPSG::4326": defaultCrsFunction,
// };
// const crsLinkHrefs = {};
// const crsLinkTypes = {};
const defaultMarkerSize = 48;
let defaultMarkerSymbol;
const defaultMarkerColor = Color.ROYALBLUE;
const defaultStroke = Color.YELLOW;
const defaultStrokeWidth = 2;
const defaultFill = Color.fromBytes(255, 255, 0, 100);
const defaultClampToGround = false;

const sizes = {
  small: 24,
  medium: 48,
  large: 64,
};

const simpleStyleIdentifiers = [
  "title",
  "description", //
  "marker-size",
  "marker-symbol",
  "marker-color",
  "stroke", //
  "stroke-opacity",
  "stroke-width",
  "fill",
  "fill-opacity",
];

function defaultDescribe(properties, nameProperty) {
  let html = "";
  for (const key in properties) {
    if (properties.hasOwnProperty(key)) {
      if (key === nameProperty || simpleStyleIdentifiers.indexOf(key) !== -1) {
        continue;
      }
      const value = properties[key];
      if (defined(value)) {
        if (typeof value === "object") {
          html += `<tr><th>${key}</th><td>${defaultDescribe(value)}</td></tr>`;
        } else {
          html += `<tr><th>${key}</th><td>${value}</td></tr>`;
        }
      }
    }
  }

  if (html.length > 0) {
    html = `<table class="cesium-infoBox-defaultTable"><tbody>${html}</tbody></table>`;
  }

  return html;
}

function createDescriptionCallback(describe, properties, nameProperty) {
  let description;
  return function (time, result) {
    if (!defined(description)) {
      description = describe(properties, nameProperty);
    }
    return description;
  };
}

function defaultDescribeProperty(properties, nameProperty) {
  return new CallbackProperty(
    createDescriptionCallback(defaultDescribe, properties, nameProperty),
    true,
  );
}

/**
 * @param {number[][]} coordinates
 * @param {CrsFunction} crsFunction
 * @returns {Cartesian3[]}
 */
function coordinatesArrayToCartesianArray(coordinates, crsFunction) {
  const positions = new Array(coordinates.length);
  for (let i = 0; i < coordinates.length; i++) {
    positions[i] = crsFunction(coordinates[i]);
  }
  return positions;
}

/**
 * @callback DescribeFunction
 * @param {Object} properties
 * @param {string|undefined} nameProperty
 */

/**
 * Create the base Entity for the given geojson
 *
 * @private
 * @param {Object} geoJson
 * @param {DescribeFunction} describe
 * @returns {Entity}
 */
function createObject(geoJson, describe) {
  //GeoJSON specifies only the Feature object has a usable id property
  //But since "multi" geometries create multiple entity,
  //we can't use it for them either.
  let id = geoJson.id;
  if (!defined(id) || geoJson.type !== "Feature") {
    id = createGuid();
  }

  const entity = new Entity({ id });
  const properties = geoJson.properties;
  if (defined(properties)) {
    entity.properties = properties;

    let nameProperty;

    //Check for the simplestyle specified name first.
    const name = properties.title;
    if (defined(name)) {
      entity.name = name;
      nameProperty = "title";
    } else {
      //Else, find the name by selecting an appropriate property.
      //The name will be obtained based on this order:
      //1) The first case-insensitive property with the name 'title',
      //2) The first case-insensitive property with the name 'name',
      //3) The first property containing the word 'title'.
      //4) The first property containing the word 'name',
      let namePropertyPrecedence = Number.MAX_VALUE;
      for (const key in properties) {
        if (properties.hasOwnProperty(key) && properties[key]) {
          const lowerKey = key.toLowerCase();

          if (namePropertyPrecedence > 1 && lowerKey === "title") {
            namePropertyPrecedence = 1;
            nameProperty = key;
            break;
          } else if (namePropertyPrecedence > 2 && lowerKey === "name") {
            namePropertyPrecedence = 2;
            nameProperty = key;
          } else if (namePropertyPrecedence > 3 && /title/i.test(key)) {
            namePropertyPrecedence = 3;
            nameProperty = key;
          } else if (namePropertyPrecedence > 4 && /name/i.test(key)) {
            namePropertyPrecedence = 4;
            nameProperty = key;
          }
        }
      }
      if (defined(nameProperty)) {
        entity.name = properties[nameProperty];
      }
    }

    const description = properties.description;
    if (description !== null) {
      entity.description = !defined(description)
        ? describe(properties, nameProperty)
        : new ConstantProperty(description);
    }
  }
  return entity;
}

/**
 * @param {GeoJson} geoJson
 * @param {CrsFunction} crsFunction
 * @param {number[][][]} coordinates For type "Polygon", the "coordinates" member MUST be an array of
      linear ring coordinate arrays.
 * @param {ParseOptions} options
 * @returns {Entity|undefined}
 */
function createPolygon(geoJson, crsFunction, coordinates, options) {
  if (coordinates.length === 0 || coordinates[0].length === 0) {
    return;
  }

  let outlineColorProperty = options.strokeMaterialProperty.color;
  let material = options.fillMaterialProperty;
  let widthProperty = options.strokeWidthProperty;

  const properties = geoJson.properties;
  if (defined(properties)) {
    const width = properties["stroke-width"];
    if (defined(width)) {
      widthProperty = new ConstantProperty(width);
    }

    let color;
    const stroke = properties.stroke;
    if (defined(stroke)) {
      color = Color.fromCssColorString(stroke);
    }
    let opacity = properties["stroke-opacity"];
    if (defined(opacity) && opacity !== 1.0) {
      if (!defined(color)) {
        color = outlineColorProperty.getValue().clone();
      }
      color.alpha = opacity;
    }

    if (defined(color)) {
      outlineColorProperty = new ConstantProperty(color);
    }

    let fillColor;
    const fill = properties.fill;
    const materialColor = material.color.getValue();
    if (defined(fill)) {
      fillColor = Color.fromCssColorString(fill);
      fillColor.alpha = materialColor.alpha;
    }
    opacity = properties["fill-opacity"];
    if (defined(opacity) && opacity !== materialColor.alpha) {
      if (!defined(fillColor)) {
        fillColor = materialColor.clone();
      }
      fillColor.alpha = opacity;
    }
    if (defined(fillColor)) {
      material = new ColorMaterialProperty(fillColor);
    }
  }

  const polygon = new PolygonGraphics();
  polygon.outline = new ConstantProperty(true);
  polygon.outlineColor = outlineColorProperty;
  polygon.outlineWidth = widthProperty;
  polygon.material = material;
  polygon.arcType = ArcType.RHUMB;

  const holes = [];
  for (let i = 1, len = coordinates.length; i < len; i++) {
    holes.push(
      new PolygonHierarchy(
        coordinatesArrayToCartesianArray(coordinates[i], crsFunction),
      ),
    );
  }

  const positions = coordinates[0];
  polygon.hierarchy = new ConstantProperty(
    new PolygonHierarchy(
      coordinatesArrayToCartesianArray(positions, crsFunction),
      holes,
    ),
  );
  if (positions[0].length > 2) {
    polygon.perPositionHeight = new ConstantProperty(true);
  } else if (!options.clampToGround) {
    polygon.height = 0;
  }

  const entity = createObject(geoJson, options.describe);
  if (!defined(entity)) {
    return;
  }
  entity.polygon = polygon;
  return entity;
}

/**
 * @param {DataSource} dataSource
 * @param {GeoJson} geoJson
 * @param {{coordinates: number[][][]}} geometry
 * @param {CrsFunction} crsFunction
 * @param {ParseOptions} options
 * @returns {Entity | undefined}
 */
function processPolygon(geoJson, geometry, crsFunction, options) {
  return createPolygon(geoJson, crsFunction, geometry.coordinates, options);
}

/**
 * @param {DataSource} dataSource
 * @param {GeoJson} geoJson
 * @param {{coordinates: number[][][][]}} geometry
 * @param {CrsFunction} crsFunction
 * @param {ParseOptions} options
 * @returns {Entity[]}
 */
function processMultiPolygon(geoJson, geometry, crsFunction, options) {
  const polygons = geometry.coordinates;
  return polygons
    .map((polygon, i) =>
      createPolygon(
        { ...geoJson, id: `${geoJson.id}_${i}` },
        crsFunction,
        polygon,
        options,
      ),
    )
    .filter((entity) => defined(entity));
}

// TODO: this should be customizable probably
const pinBuilder = new PinBuilder();

function createPoint(geoJson, crsFunction, coordinates, options) {
  let symbol = options.markerSymbol;
  let color = options.markerColor;
  let size = options.markerSize;

  const properties = geoJson.properties;
  if (defined(properties)) {
    const cssColor = properties["marker-color"];
    if (defined(cssColor)) {
      color = Color.fromCssColorString(cssColor);
    }

    size = sizes[properties["marker-size"]] ?? size;
    const markerSymbol = properties["marker-symbol"];
    if (defined(markerSymbol)) {
      symbol = markerSymbol;
    }
  }

  let canvasOrPromise;
  if (defined(symbol)) {
    if (symbol.length === 1) {
      canvasOrPromise = pinBuilder.fromText(symbol.toUpperCase(), color, size);
    } else {
      canvasOrPromise = pinBuilder.fromMakiIconId(symbol, color, size);
    }
  } else {
    canvasOrPromise = pinBuilder.fromColor(color, size);
  }

  const billboard = new BillboardGraphics();
  billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);

  // Clamp to ground if there isn't a height specified
  if (coordinates.length === 2 && options.clampToGround) {
    billboard.heightReference = HeightReference.CLAMP_TO_GROUND;
  }

  const entity = createObject(geoJson, options.describe);
  if (!defined(entity)) {
    return;
  }
  entity.billboard = billboard;
  entity.position = new ConstantPositionProperty(crsFunction(coordinates));

  // TODO: await this promise somehow/somewhere??
  // eslint-disable-next-line no-unused-vars
  const promise = Promise.resolve(canvasOrPromise)
    .then(function (image) {
      billboard.image = new ConstantProperty(image);
    })
    .catch(function () {
      billboard.image = new ConstantProperty(pinBuilder.fromColor(color, size));
    });

  return entity;
}

function processPoint(geoJson, geometry, crsFunction, options) {
  return createPoint(geoJson, crsFunction, geometry.coordinates, options);
}

const geoJsonObjectTypes = {
  Feature: processFeature,
  FeatureCollection: processFeatureCollection,
  // GeometryCollection: processGeometryCollection,
  // LineString: processLineString,
  // MultiLineString: processMultiLineString,
  // MultiPoint: processMultiPoint,
  // MultiPolygon: processMultiPolygon,
  Point: processPoint,
  // Polygon: processPolygon,
  // Topology: processTopology,
};

const geometryTypes = {
  // GeometryCollection: processGeometryCollection,
  // LineString: processLineString,
  // MultiLineString: processMultiLineString,
  // MultiPoint: processMultiPoint,
  MultiPolygon: processMultiPolygon,
  Point: processPoint,
  Polygon: processPolygon,
  // Topology: processTopology,
};

// GeoJSON processing functions
function processFeature(feature, notUsed, crsFunction, options) {
  if (feature.geometry === null) {
    //Null geometry is allowed, so just create an empty entity instance for it.
    createObject(feature, options.describe);
    return;
  }

  if (!defined(feature.geometry)) {
    throw new RuntimeError("feature.geometry is required.");
  }

  const geometryType = feature.geometry.type;
  const geometryHandler = geometryTypes[geometryType];
  if (!defined(geometryHandler)) {
    throw new RuntimeError(`Unknown geometry type: ${geometryType}`);
  }
  return geometryHandler(feature, feature.geometry, crsFunction, options);
}

function processFeatureCollection(
  featureCollection,
  notUsed,
  crsFunction,
  options,
) {
  const features = featureCollection.features;
  return features.map((feature) =>
    processFeature(feature, undefined, crsFunction, options),
  );
}

// function load(that, geoJson, options, sourceUri, clear) {
//   let name;
//   if (defined(sourceUri)) {
//     name = getFilenameFromUri(sourceUri);
//   }

//   if (defined(name) && that._name !== name) {
//     that._name = name;
//     that._changed.raiseEvent(that);
//   }

//   const typeHandler = geoJsonObjectTypes[geoJson.type];
//   if (!defined(typeHandler)) {
//     throw new RuntimeError(`Unsupported GeoJSON object type: ${geoJson.type}`);
//   }

//   //Check for a Coordinate Reference System.
//   const crs = geoJson.crs;
//   let crsFunction = crs !== null ? defaultCrsFunction : null;

//   if (defined(crs)) {
//     if (!defined(crs.properties)) {
//       throw new RuntimeError("crs.properties is undefined.");
//     }

//     const properties = crs.properties;
//     if (crs.type === "name") {
//       crsFunction = crsNames[properties.name];
//       if (!defined(crsFunction)) {
//         throw new RuntimeError(`Unknown crs name: ${properties.name}`);
//       }
//     } else if (crs.type === "link") {
//       let handler = crsLinkHrefs[properties.href];
//       if (!defined(handler)) {
//         handler = crsLinkTypes[properties.type];
//       }

//       if (!defined(handler)) {
//         throw new RuntimeError(
//           `Unable to resolve crs link: ${JSON.stringify(properties)}`,
//         );
//       }

//       crsFunction = handler(properties);
//     } else if (crs.type === "EPSG") {
//       crsFunction = crsNames[`EPSG:${properties.code}`];
//       if (!defined(crsFunction)) {
//         throw new RuntimeError(`Unknown crs EPSG code: ${properties.code}`);
//       }
//     } else {
//       throw new RuntimeError(`Unknown crs type: ${crs.type}`);
//     }
//   }

//   return Promise.resolve(crsFunction).then(function (crsFunction) {
//     if (clear) {
//       that._entityCollection.removeAll();
//     }

//     // null is a valid value for the crs, but means the entire load process becomes a no-op
//     // because we can't assume anything about the coordinates.
//     if (crsFunction !== null) {
//       typeHandler(that, geoJson, geoJson, crsFunction, options);
//     }

//     return Promise.all(that._promises).then(function () {
//       that._promises.length = 0;
//       DataSource.setLoading(that, false);
//       return that;
//     });
//   });
// }

/**
 *
 * @param {GeoJson} geoJson
 * @param {ParseOptions} [options]
 * @returns {Entity | Entity[] | undefined}
 */
function parseGeoJson(geoJson, options) {
  const typeHandler = geoJsonObjectTypes[geoJson.type];
  if (!defined(typeHandler)) {
    throw new RuntimeError(`Unsupported GeoJSON object type: ${geoJson.type}`);
  }
  const crsFunction = defaultCrsFunction;

  options = {
    describe: options?.describe ?? defaultDescribeProperty,
    markerSize: options?.markerSize ?? defaultMarkerSize,
    markerSymbol: options?.markerSymbol ?? defaultMarkerSymbol,
    markerColor: options?.markerColor ?? defaultMarkerColor,
    strokeWidthProperty: new ConstantProperty(
      options?.strokeWidth ?? defaultStrokeWidth,
    ),
    strokeMaterialProperty: new ColorMaterialProperty(
      options?.stroke ?? defaultStroke,
    ),
    fillMaterialProperty: new ColorMaterialProperty(
      options?.fill ?? defaultFill,
    ),
    clampToGround: options?.clampToGround ?? defaultClampToGround,
    preventDuplicates: options?.preventDuplicates ?? false,
  };
  return typeHandler(geoJson, geoJson, crsFunction, options);
}

export default parseGeoJson;
