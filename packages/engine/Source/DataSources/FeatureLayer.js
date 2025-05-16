import Rectangle from "../Core/Rectangle.js";
import RuntimeError from "../Core/RuntimeError.js";
import defined from "../Core/defined.js";
import PolygonGeometry from "../Core/PolygonGeometry.js";
import Feature from "./Feature.js";
import AssociativeArray from "../Core/AssociativeArray.js";
import CustomDataSource from "./CustomDataSource.js";
import parseGeoJson from "./parseGeoJson.js";
import Cartesian3 from "../Core/Cartesian3.js";

/**
 * @import FeatureProvider from "./FeatureProvider";
 * @import FrameState from "../Scene/FrameState";
 * @import OGCFeaturesProvider from "./OgcFeatureProvider.js";
 */

/**
 * A class for things
 * @constructor
 * @param {FeatureProvider | OGCFeaturesProvider} provider
 * @param {Object} options
 */
function FeatureLayer(provider, options) {
  this.provider = provider;

  this.provider.dataLoaded.addEventListener((json) => {
    // TODO: this should probably take in Features[] instead of json and do the
    // geojson parsing in the OGC provider
    this.addGeoJson(json);
    // console.log("loaded from event", json);
  });

  this.id = options.id;
  // this.name = options.name;
  this._show = options.show ?? true;

  this.rectangle = options.rectangle ?? new Rectangle();

  // TODO: convert this to a PrimitiveCollection
  // this._dataSource = new CustomDataSource();
  // // this._primitives = new EntityCollection();
  // /** @type {EntityCollection} */
  // this._primitives = this._dataSource.entities;
  // this._dataSource = new GeoJsonDataSource(options.id);
  this._customDataSource = new CustomDataSource();
  // this._primitives = this._dataSource.entities;
  this._primitives = [];

  this.features = options.features ?? new AssociativeArray();
}

Object.defineProperties(FeatureLayer.prototype, {
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      this._show = value;
    },
  },
});

FeatureLayer.prototype.addToViewer = function (viewer) {
  // TODO: Ideally this should be removed and the layer itself should be added as a primitive
  // This is just a workaround to work with the entities
  // viewer.entities.add(this._primitives);
  // viewer.dataSources.add(this._dataSource);
  viewer.dataSources.add(this._customDataSource);
};

/**
 * @param {Feature} feature
 */
FeatureLayer.prototype.add = function (feature) {
  if (!this.features.get(feature.id)) {
    this.features.set(feature.id, feature);
  }
};

FeatureLayer.prototype.addGeoJson = function (geoJson) {
  if (geoJson.type !== "FeatureCollection") {
    throw new RuntimeError("Cannot process this type of GeoJSON");
  }

  for (const feature of geoJson.features) {
    this.addGeoJsonFeature(feature);
  }
};

const geometryByType = {
  // TODO: swap for feature versions?
  Polygon: PolygonGeometry,
  MultiPolygon: PolygonGeometry,
  Point: 1, // just here to "add" support...
};

FeatureLayer.prototype.addGeoJsonFeature = function (geoJson) {
  if (geoJson.type !== "Feature") {
    return;
  }

  const featureGeometryType = geometryByType[geoJson.geometry.type];
  if (!defined(featureGeometryType)) {
    // TODO: more types
    console.log(`Feature type ${geoJson.geometry.type} not supported`);
    return;
  }

  const id = geoJson.id;
  // const geometry = featureGeometryType.fromGeoJsonGeometry(geoJson.geometry);
  const geometry = geoJson.geometry;
  const metadata = geoJson.properties;
  const feature = new Feature({
    id,
    geometry, // TODO: Multiple geometries per one feature
    metadata,
  });

  if (!this.features.get(feature.id)) {
    this.add(feature);
    // TODO: this relies on the GeoJsonDataSource
    // this._dataSource.process(geoJson, {
    //   // preventDuplicates: true,
    // });

    let parsedEntities = parseGeoJson(geoJson) ?? [];
    if (!Array.isArray(parsedEntities)) {
      parsedEntities = [parsedEntities];
    }
    // console.log(
    //   geoJson.id,
    //   parsedEntities,
    // );
    parsedEntities.forEach((entity) => {
      // const primitive = entity.polygon;
      // this._primitives.push(primitive);

      this._customDataSource.entities.add(entity);
    });
  }
  // else {
  //   console.log("skipped for duplicate?", feature.id);
  // }

  // if (!this.features.get(feature.id)) {
  //   this.add(feature);
  //   // this._primitives.add(new Entity(geoJson));
  //   let entities = parseGeoJson(geoJson);

  //   if (!defined(entities)) {
  //     return;
  //   }

  //   if (!Array.isArray(entities)) {
  //     entities = [entities];
  //   }
  //   entities.forEach((entity) => {
  //     this._primitives.add(parseGeoJson(geoJson));
  //   });
  // }

  return feature;
};

// const scratchViewRectangle = new Rectangle();

/**
 * @param {FrameState} frameState
 */
FeatureLayer.prototype.update = function (frameState) {
  const { camera, time, context, pixelRatio } = frameState;
  const { positionWC: cameraPosition } = camera;

  const distance = Math.sqrt(
    Cartesian3.distanceSquared(
      this._previousCameraPosition ?? new Cartesian3(),
      cameraPosition,
    ),
  );

  if (distance > 2000) {
    // TODO: fine tune this? or replace with something better
    // console.log(
    //   "camera moved",
    //   distance,
    //   // this._previousCameraPosition?.toString(),
    //   // cameraPosition?.toString(),
    // );
    this.requestMade = false;
    this._previousCameraPosition = cameraPosition.clone();
  }

  if (!this.requestMade) {
    // console.log("requested");

    // const cameraView = camera.computeViewRectangle(
    //   Ellipsoid.default, // TODO: change this
    //   scratchViewRectangle,
    // );

    // TODO: this should probably be debounced even more, it's still kicking off
    // way too many requests even with the request cancellation
    this.provider.requestFeatures({
      camera: camera,
      time: time,
      context: context,
      pixelRatio: pixelRatio,
    });
    this.requestMade = true;
  }
};

FeatureLayer.prototype.isDestroyed = function () {
  return false;
};

FeatureLayer.prototype.destroy = function () {
  this.provider.cancelRequests();
};

export default FeatureLayer;
