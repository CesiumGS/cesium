import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import Ellipsoid from "../../Core/Ellipsoid.js";
import IndexDatatype from "../../Core/IndexDatatype.js";
import Matrix4 from "../../Core/Matrix4.js";
import PrimitiveType from "../../Core/PrimitiveType.js";
import RuntimeError from "../../Core/RuntimeError.js";
import Transforms from "../../Core/Transforms.js";
import AttributeType from "../AttributeType.js";
import JsonMetadataTable from "../JsonMetadataTable.js";
import MetadataSchema from "../MetadataSchema.js";
import ModelComponents from "../ModelComponents.js";
import PropertyTable from "../PropertyTable.js";
import ResourceLoader from "../ResourceLoader.js";
import StructuralMetadata from "../StructuralMetadata.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";

/**
 * Loads a GeoJson model as part of the <code>MAXAR_content_geojson</code> extension with the following constraints:
 * <ul>
 *   <li>The top level GeoJSON type must be FeatureCollection or Feature.</li>
 *   <li>The geometry types must be LineString, MultiLineString, MultiPolygon, or Polygon.</li>
 *   <li>All geometries are converted to geodesic lines.</li>
 *   <li>Only WGS84 geographic coordinates are supported.</li>
 * </ul>
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GeoJsonLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Object} options.geoJson The GeoJson object.
 */
export default function GeoJsonLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.geoJson", options.geoJson);
  //>>includeEnd('debug');

  this._geoJson = options.geoJson;
  this._promise = undefined;
  this._process = function (loader, frameState) {};
  this._components = undefined;
}

if (defined(Object.create)) {
  GeoJsonLoader.prototype = Object.create(ResourceLoader.prototype);
  GeoJsonLoader.prototype.constructor = GeoJsonLoader;
}

Object.defineProperties(GeoJsonLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready, , or undefined if the resource has not yet started loading.
   *
   * @memberof GeoJsonLoader.prototype
   *
   * @type {Promise.<GeoJsonLoader>|Undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GeoJsonLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return undefined;
    },
  },
  /**
   * The loaded components.
   *
   * @memberof GeoJsonLoader.prototype
   *
   * @type {ModelComponents.Components}
   * @readonly
   * @private
   */
  components: {
    get: function () {
      return this._components;
    },
  },
});

/**
 * Loads the resource.
 * @returns {Promise.<GeoJsonLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
GeoJsonLoader.prototype.load = function () {
  const loader = this;
  const promise = new Promise(function (resolve) {
    loader._process = function (loader, frameState) {
      if (defined(loader._components)) {
        return;
      }

      loader._components = parse(loader._geoJson, frameState);
      loader._geoJson = undefined;
      resolve(loader);
    };
  });

  this._promise = promise;
  return promise;
};

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GeoJsonLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  this._process(this, frameState);
};

function ParsedFeature() {
  this.lines = undefined;
  this.properties = undefined;
}

function ParseResult() {
  this.features = [];
}

function parsePosition(position) {
  const x = position[0];
  const y = position[1];
  const z = defaultValue(position[2], 0.0);
  return new Cartesian3(x, y, z);
}

function parseLineString(coordinates) {
  const positionsLength = coordinates.length;
  const line = new Array(positionsLength);
  for (let i = 0; i < positionsLength; i++) {
    line[i] = parsePosition(coordinates[i]);
  }
  const lines = [line];
  return lines;
}

function parseMultiLineString(coordinates) {
  const linesLength = coordinates.length;
  const lines = new Array(linesLength);
  for (let i = 0; i < linesLength; i++) {
    lines[i] = parseLineString(coordinates[i])[0];
  }
  return lines;
}

function parsePolygon(coordinates) {
  // Treat exterior polygon and interior polygons as lines
  const linesLength = coordinates.length;
  const lines = new Array(linesLength);
  for (let i = 0; i < linesLength; i++) {
    lines[i] = parseLineString(coordinates[i])[0];
  }
  return lines;
}

function parseMultiPolygon(coordinates) {
  const polygonsLength = coordinates.length;
  const lines = [];
  for (let i = 0; i < polygonsLength; i++) {
    Array.prototype.push.apply(lines, parsePolygon(coordinates[i]));
  }
  return lines;
}

const geometryTypes = {
  LineString: parseLineString,
  MultiLineString: parseMultiLineString,
  MultiPolygon: parseMultiPolygon,
  Polygon: parsePolygon,
};

function parseFeature(feature, result) {
  if (!defined(feature.geometry)) {
    return;
  }

  const geometryType = feature.geometry.type;
  const geometryFunction = geometryTypes[geometryType];
  const coordinates = feature.geometry.coordinates;

  if (!defined(geometryFunction)) {
    return;
  }

  if (!defined(coordinates)) {
    return;
  }

  const parsedFeature = new ParsedFeature();
  parsedFeature.lines = geometryFunction(coordinates);
  parsedFeature.properties = feature.properties;

  result.features.push(parsedFeature);
}

function parseFeatureCollection(featureCollection, result) {
  const features = featureCollection.features;
  const featuresLength = features.length;
  for (let i = 0; i < featuresLength; i++) {
    parseFeature(features[i], result);
  }
}

const geoJsonObjectTypes = {
  FeatureCollection: parseFeatureCollection,
  Feature: parseFeature,
};

const scratchCartesian = new Cartesian3();

function parse(geoJson, frameState) {
  const result = new ParseResult();

  // Parse the GeoJSON
  const parseFunction = geoJsonObjectTypes[geoJson.type];
  if (defined(parseFunction)) {
    parseFunction(geoJson, result);
  }

  const featureCount = result.features.length;

  if (featureCount === 0) {
    throw new RuntimeError("GeoJSON must have at least one feature");
  }

  // Allocate space for property values
  const properties = {};
  for (let i = 0; i < featureCount; i++) {
    const feature = result.features[i];
    const featureProperties = defaultValue(
      feature.properties,
      defaultValue.EMPTY_OBJECT
    );
    for (const propertyId in featureProperties) {
      if (featureProperties.hasOwnProperty(propertyId)) {
        if (!defined(properties[propertyId])) {
          properties[propertyId] = new Array(featureCount);
        }
      }
    }
  }

  // Fill in the property values. Default to empty string for undefined values.
  for (let i = 0; i < featureCount; i++) {
    const feature = result.features[i];
    for (const propertyId in properties) {
      if (properties.hasOwnProperty(propertyId)) {
        const value = defaultValue(feature.properties[propertyId], "");
        properties[propertyId][i] = value;
      }
    }
  }

  const jsonMetadataTable = new JsonMetadataTable({
    count: featureCount,
    properties: properties,
  });

  const propertyTable = new PropertyTable({
    id: 0,
    count: featureCount,
    jsonMetadataTable: jsonMetadataTable,
  });
  const propertyTables = [propertyTable];

  const schema = new MetadataSchema({});

  const structuralMetadata = new StructuralMetadata({
    schema: schema,
    propertyTables: propertyTables,
  });

  // Find the cartographic bounding box
  const cartographicMin = new Cartesian3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  );

  const cartographicMax = new Cartesian3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  );

  for (let i = 0; i < featureCount; i++) {
    const feature = result.features[i];
    const linesLength = feature.lines.length;
    for (let j = 0; j < linesLength; j++) {
      const line = feature.lines[j];
      const positionsLength = line.length;
      for (let k = 0; k < positionsLength; k++) {
        Cartesian3.minimumByComponent(
          cartographicMin,
          line[k],
          cartographicMin
        );
        Cartesian3.maximumByComponent(
          cartographicMax,
          line[k],
          cartographicMax
        );
      }
    }
  }

  // Compute the ENU matrix
  const cartographicCenter = Cartesian3.midpoint(
    cartographicMin,
    cartographicMax,
    new Cartesian3()
  );
  const ecefCenter = Cartesian3.fromDegrees(
    cartographicCenter.x,
    cartographicCenter.y,
    cartographicCenter.z,
    Ellipsoid.WGS84,
    new Cartesian3()
  );
  const toGlobal = Transforms.eastNorthUpToFixedFrame(
    ecefCenter,
    Ellipsoid.WGS84,
    new Matrix4()
  );
  const toLocal = Matrix4.inverseTransformation(toGlobal, new Matrix4());

  // Count the number of vertices and indices
  let vertexCount = 0;
  let indexCount = 0;

  for (let i = 0; i < featureCount; i++) {
    const feature = result.features[i];
    const linesLength = feature.lines.length;
    for (let j = 0; j < linesLength; j++) {
      const line = feature.lines[j];
      vertexCount += line.length;
      indexCount += (line.length - 1) * 2;
    }
  }

  // Allocate typed arrays
  const positionsTypedArray = new Float32Array(vertexCount * 3);
  const featureIdsTypedArray = new Float32Array(vertexCount);
  const indicesTypedArray = IndexDatatype.createTypedArray(
    vertexCount,
    indexCount
  );
  const indexDatatype = IndexDatatype.fromTypedArray(indicesTypedArray);

  // Process the data. Convert positions to local ENU. Generate indices.
  const localMin = new Cartesian3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  );

  const localMax = new Cartesian3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  );

  let vertexCounter = 0;
  let segmentCounter = 0;

  for (let i = 0; i < featureCount; i++) {
    const feature = result.features[i];
    const linesLength = feature.lines.length;
    for (let j = 0; j < linesLength; j++) {
      const line = feature.lines[j];
      const positionsLength = line.length;
      for (let k = 0; k < positionsLength; k++) {
        const cartographic = line[k];
        const globalCartesian = Cartesian3.fromDegrees(
          cartographic.x,
          cartographic.y,
          cartographic.z,
          Ellipsoid.WGS84,
          scratchCartesian
        );
        const localCartesian = Matrix4.multiplyByPoint(
          toLocal,
          globalCartesian,
          scratchCartesian
        );

        Cartesian3.minimumByComponent(localMin, localCartesian, localMin);
        Cartesian3.maximumByComponent(localMax, localCartesian, localMax);

        Cartesian3.pack(localCartesian, positionsTypedArray, vertexCounter * 3);

        featureIdsTypedArray[vertexCounter] = i;

        if (k < positionsLength - 1) {
          indicesTypedArray[segmentCounter * 2] = vertexCounter;
          indicesTypedArray[segmentCounter * 2 + 1] = vertexCounter + 1;
          segmentCounter++;
        }

        vertexCounter++;
      }
    }
  }

  // Create GPU buffers
  const positionBuffer = Buffer.createVertexBuffer({
    typedArray: positionsTypedArray,
    context: frameState.context,
    usage: BufferUsage.STATIC_DRAW,
  });
  positionBuffer.vertexArrayDestroyable = false;

  const featureIdBuffer = Buffer.createVertexBuffer({
    typedArray: featureIdsTypedArray,
    context: frameState.context,
    usage: BufferUsage.STATIC_DRAW,
  });
  featureIdBuffer.vertexArrayDestroyable = false;

  const indexBuffer = Buffer.createIndexBuffer({
    typedArray: indicesTypedArray,
    context: frameState.context,
    usage: BufferUsage.STATIC_DRAW,
    indexDatatype: indexDatatype,
  });
  indexBuffer.vertexArrayDestroyable = false;

  // Create ModelComponents
  const positionAttribute = new ModelComponents.Attribute();
  positionAttribute.semantic = VertexAttributeSemantic.POSITION;
  positionAttribute.componentDatatype = ComponentDatatype.FLOAT;
  positionAttribute.type = AttributeType.VEC3;
  positionAttribute.count = vertexCount;
  positionAttribute.min = localMin;
  positionAttribute.max = localMax;
  positionAttribute.buffer = positionBuffer;

  const featureIdAttribute = new ModelComponents.Attribute();
  featureIdAttribute.semantic = VertexAttributeSemantic.FEATURE_ID;
  featureIdAttribute.setIndex = 0;
  featureIdAttribute.componentDatatype = ComponentDatatype.FLOAT;
  featureIdAttribute.type = AttributeType.SCALAR;
  featureIdAttribute.count = vertexCount;
  featureIdAttribute.buffer = featureIdBuffer;

  const attributes = [positionAttribute, featureIdAttribute];

  const material = new ModelComponents.Material();
  material.unlit = true;

  const indices = new ModelComponents.Indices();
  indices.indexDatatype = indexDatatype;
  indices.count = indicesTypedArray.length;
  indices.buffer = indexBuffer;

  const featureId = new ModelComponents.FeatureIdAttribute();
  featureId.featureCount = featureCount;
  featureId.propertyTableId = 0;
  featureId.setIndex = 0;
  featureId.positionalLabel = "featureId_0";

  const featureIds = [featureId];

  const primitive = new ModelComponents.Primitive();
  primitive.attributes = attributes;
  primitive.indices = indices;
  primitive.featureIds = featureIds;
  primitive.primitiveType = PrimitiveType.LINES;
  primitive.material = material;

  const primitives = [primitive];

  const node = new ModelComponents.Node();
  node.index = 0;
  node.primitives = primitives;

  const nodes = [node];

  const scene = new ModelComponents.Scene();
  scene.nodes = nodes;

  const components = new ModelComponents.Components();
  components.scene = scene;
  components.nodes = nodes;
  components.transform = toGlobal;
  components.structuralMetadata = structuralMetadata;

  return components;
}

/**
 * Unloads the resource.
 * @private
 */
GeoJsonLoader.prototype.unload = function () {
  this._components = undefined;
};
