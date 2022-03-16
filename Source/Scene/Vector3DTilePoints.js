import arraySlice from "../Core/arraySlice.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import defer from "../Core/defer.js";
import destroyObject from "../Core/destroyObject.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import Rectangle from "../Core/Rectangle.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import BillboardCollection from "./BillboardCollection.js";
import Cesium3DTilePointFeature from "./Cesium3DTilePointFeature.js";
import HorizontalOrigin from "./HorizontalOrigin.js";
import LabelCollection from "./LabelCollection.js";
import LabelStyle from "./LabelStyle.js";
import PolylineCollection from "./PolylineCollection.js";
import VerticalOrigin from "./VerticalOrigin.js";

/**
 * Creates a batch of points or billboards and labels.
 *
 * @alias Vector3DTilePoints
 * @constructor
 *
 * @param {Object} options An object with following properties:
 * @param {Uint16Array} options.positions The positions of the polygons.
 * @param {Number} options.minimumHeight The minimum height of the terrain covered by the tile.
 * @param {Number} options.maximumHeight The maximum height of the terrain covered by the tile.
 * @param {Rectangle} options.rectangle The rectangle containing the tile.
 * @param {Cesium3DTileBatchTable} options.batchTable The batch table for the tile containing the batched polygons.
 * @param {Uint16Array} options.batchIds The batch ids for each polygon.
 *
 * @private
 */
function Vector3DTilePoints(options) {
  // released after the first update
  this._positions = options.positions;

  this._batchTable = options.batchTable;
  this._batchIds = options.batchIds;

  this._rectangle = options.rectangle;
  this._minHeight = options.minimumHeight;
  this._maxHeight = options.maximumHeight;

  this._billboardCollection = undefined;
  this._labelCollection = undefined;
  this._polylineCollection = undefined;

  this._verticesPromise = undefined;
  this._packedBuffer = undefined;

  this._ready = false;
  this._readyPromise = defer();
  this._resolvedPromise = false;
}

Object.defineProperties(Vector3DTilePoints.prototype, {
  /**
   * Gets the number of points.
   *
   * @memberof Vector3DTilePoints.prototype
   *
   * @type {Number}
   * @readonly
   */
  pointsLength: {
    get: function () {
      return this._billboardCollection.length;
    },
  },

  /**
   * Gets the texture atlas memory in bytes.
   *
   * @memberof Vector3DTilePoints.prototype
   *
   * @type {Number}
   * @readonly
   */
  texturesByteLength: {
    get: function () {
      const billboardSize = this._billboardCollection.textureAtlas.texture
        .sizeInBytes;
      const labelSize = this._labelCollection._textureAtlas.texture.sizeInBytes;
      return billboardSize + labelSize;
    },
  },

  /**
   * Gets a promise that resolves when the primitive is ready to render.
   * @memberof Vector3DTilePoints.prototype
   * @type {Promise<void>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

function packBuffer(points, ellipsoid) {
  const rectangle = points._rectangle;
  const minimumHeight = points._minHeight;
  const maximumHeight = points._maxHeight;

  const packedLength = 2 + Rectangle.packedLength + Ellipsoid.packedLength;
  const packedBuffer = new Float64Array(packedLength);

  let offset = 0;
  packedBuffer[offset++] = minimumHeight;
  packedBuffer[offset++] = maximumHeight;

  Rectangle.pack(rectangle, packedBuffer, offset);
  offset += Rectangle.packedLength;

  Ellipsoid.pack(ellipsoid, packedBuffer, offset);

  return packedBuffer;
}

const createVerticesTaskProcessor = new TaskProcessor(
  "createVectorTilePoints",
  5
);
const scratchPosition = new Cartesian3();

function createPoints(points, ellipsoid) {
  if (defined(points._billboardCollection)) {
    return;
  }

  let positions;
  if (!defined(points._verticesPromise)) {
    positions = points._positions;
    let packedBuffer = points._packedBuffer;

    if (!defined(packedBuffer)) {
      // Copy because they may be the views on the same buffer.
      positions = points._positions = arraySlice(positions);
      points._batchIds = arraySlice(points._batchIds);

      packedBuffer = points._packedBuffer = packBuffer(points, ellipsoid);
    }

    const transferrableObjects = [positions.buffer, packedBuffer.buffer];
    const parameters = {
      positions: positions.buffer,
      packedBuffer: packedBuffer.buffer,
    };

    const verticesPromise = (points._verticesPromise = createVerticesTaskProcessor.scheduleTask(
      parameters,
      transferrableObjects
    ));
    if (!defined(verticesPromise)) {
      // Postponed
      return;
    }

    verticesPromise.then(function (result) {
      points._positions = new Float64Array(result.positions);
      points._ready = true;
    });
  }

  if (points._ready && !defined(points._billboardCollection)) {
    positions = points._positions;
    const batchTable = points._batchTable;
    const batchIds = points._batchIds;

    const billboardCollection = (points._billboardCollection = new BillboardCollection(
      { batchTable: batchTable }
    ));
    const labelCollection = (points._labelCollection = new LabelCollection({
      batchTable: batchTable,
    }));
    const polylineCollection = (points._polylineCollection = new PolylineCollection());
    polylineCollection._useHighlightColor = true;

    const numberOfPoints = positions.length / 3;
    for (let i = 0; i < numberOfPoints; ++i) {
      const id = batchIds[i];

      const position = Cartesian3.unpack(positions, i * 3, scratchPosition);

      const b = billboardCollection.add();
      b.position = position;
      b._batchIndex = id;

      const l = labelCollection.add();
      l.text = " ";
      l.position = position;
      l._batchIndex = id;

      const p = polylineCollection.add();
      p.positions = [Cartesian3.clone(position), Cartesian3.clone(position)];
    }

    points._positions = undefined;
    points._packedBuffer = undefined;
  }
}

/**
 * Creates features for each point and places it at the batch id index of features.
 *
 * @param {Vector3DTileContent} content The vector tile content.
 * @param {Cesium3DTileFeature[]} features An array of features where the point features will be placed.
 */
Vector3DTilePoints.prototype.createFeatures = function (content, features) {
  const billboardCollection = this._billboardCollection;
  const labelCollection = this._labelCollection;
  const polylineCollection = this._polylineCollection;

  const batchIds = this._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];

    const billboard = billboardCollection.get(i);
    const label = labelCollection.get(i);
    const polyline = polylineCollection.get(i);

    features[batchId] = new Cesium3DTilePointFeature(
      content,
      batchId,
      billboard,
      label,
      polyline
    );
  }
};

/**
 * Colors the entire tile when enabled is true. The resulting color will be (batch table color * color).
 *
 * @param {Boolean} enabled Whether to enable debug coloring.
 * @param {Color} color The debug color.
 */
Vector3DTilePoints.prototype.applyDebugSettings = function (enabled, color) {
  if (enabled) {
    Color.clone(color, this._billboardCollection._highlightColor);
    Color.clone(color, this._labelCollection._highlightColor);
    Color.clone(color, this._polylineCollection._highlightColor);
  } else {
    Color.clone(Color.WHITE, this._billboardCollection._highlightColor);
    Color.clone(Color.WHITE, this._labelCollection._highlightColor);
    Color.clone(Color.WHITE, this._polylineCollection._highlightColor);
  }
};

function clearStyle(polygons, features) {
  const batchIds = polygons._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    const feature = features[batchId];

    feature.show = true;
    feature.pointSize = Cesium3DTilePointFeature.defaultPointSize;
    feature.color = Cesium3DTilePointFeature.defaultColor;
    feature.pointOutlineColor =
      Cesium3DTilePointFeature.defaultPointOutlineColor;
    feature.pointOutlineWidth =
      Cesium3DTilePointFeature.defaultPointOutlineWidth;
    feature.labelColor = Color.WHITE;
    feature.labelOutlineColor = Color.WHITE;
    feature.labelOutlineWidth = 1.0;
    feature.font = "30px sans-serif";
    feature.labelStyle = LabelStyle.FILL;
    feature.labelText = undefined;
    feature.backgroundColor = new Color(0.165, 0.165, 0.165, 0.8);
    feature.backgroundPadding = new Cartesian2(7, 5);
    feature.backgroundEnabled = false;
    feature.scaleByDistance = undefined;
    feature.translucencyByDistance = undefined;
    feature.distanceDisplayCondition = undefined;
    feature.heightOffset = 0.0;
    feature.anchorLineEnabled = false;
    feature.anchorLineColor = Color.WHITE;
    feature.image = undefined;
    feature.disableDepthTestDistance = 0.0;
    feature.horizontalOrigin = HorizontalOrigin.CENTER;
    feature.verticalOrigin = VerticalOrigin.CENTER;
    feature.labelHorizontalOrigin = HorizontalOrigin.RIGHT;
    feature.labelVerticalOrigin = VerticalOrigin.BASELINE;
  }
}

const scratchColor = new Color();
const scratchColor2 = new Color();
const scratchColor3 = new Color();
const scratchColor4 = new Color();
const scratchColor5 = new Color();
const scratchColor6 = new Color();
const scratchScaleByDistance = new NearFarScalar();
const scratchTranslucencyByDistance = new NearFarScalar();
const scratchDistanceDisplayCondition = new DistanceDisplayCondition();

/**
 * Apply a style to the content.
 *
 * @param {Cesium3DTileStyle} style The style.
 * @param {Cesium3DTileFeature[]} features The array of features.
 */
Vector3DTilePoints.prototype.applyStyle = function (style, features) {
  if (!defined(style)) {
    clearStyle(this, features);
    return;
  }

  const batchIds = this._batchIds;
  const length = batchIds.length;
  for (let i = 0; i < length; ++i) {
    const batchId = batchIds[i];
    const feature = features[batchId];

    if (defined(style.show)) {
      feature.show = style.show.evaluate(feature);
    }

    if (defined(style.pointSize)) {
      feature.pointSize = style.pointSize.evaluate(feature);
    }

    if (defined(style.color)) {
      feature.color = style.color.evaluateColor(feature, scratchColor);
    }

    if (defined(style.pointOutlineColor)) {
      feature.pointOutlineColor = style.pointOutlineColor.evaluateColor(
        feature,
        scratchColor2
      );
    }

    if (defined(style.pointOutlineWidth)) {
      feature.pointOutlineWidth = style.pointOutlineWidth.evaluate(feature);
    }

    if (defined(style.labelColor)) {
      feature.labelColor = style.labelColor.evaluateColor(
        feature,
        scratchColor3
      );
    }

    if (defined(style.labelOutlineColor)) {
      feature.labelOutlineColor = style.labelOutlineColor.evaluateColor(
        feature,
        scratchColor4
      );
    }

    if (defined(style.labelOutlineWidth)) {
      feature.labelOutlineWidth = style.labelOutlineWidth.evaluate(feature);
    }

    if (defined(style.font)) {
      feature.font = style.font.evaluate(feature);
    }

    if (defined(style.labelStyle)) {
      feature.labelStyle = style.labelStyle.evaluate(feature);
    }

    if (defined(style.labelText)) {
      feature.labelText = style.labelText.evaluate(feature);
    } else {
      feature.labelText = undefined;
    }

    if (defined(style.backgroundColor)) {
      feature.backgroundColor = style.backgroundColor.evaluateColor(
        feature,
        scratchColor5
      );
    }

    if (defined(style.backgroundPadding)) {
      feature.backgroundPadding = style.backgroundPadding.evaluate(feature);
    }

    if (defined(style.backgroundEnabled)) {
      feature.backgroundEnabled = style.backgroundEnabled.evaluate(feature);
    }

    if (defined(style.scaleByDistance)) {
      const scaleByDistanceCart4 = style.scaleByDistance.evaluate(feature);
      scratchScaleByDistance.near = scaleByDistanceCart4.x;
      scratchScaleByDistance.nearValue = scaleByDistanceCart4.y;
      scratchScaleByDistance.far = scaleByDistanceCart4.z;
      scratchScaleByDistance.farValue = scaleByDistanceCart4.w;
      feature.scaleByDistance = scratchScaleByDistance;
    } else {
      feature.scaleByDistance = undefined;
    }

    if (defined(style.translucencyByDistance)) {
      const translucencyByDistanceCart4 = style.translucencyByDistance.evaluate(
        feature
      );
      scratchTranslucencyByDistance.near = translucencyByDistanceCart4.x;
      scratchTranslucencyByDistance.nearValue = translucencyByDistanceCart4.y;
      scratchTranslucencyByDistance.far = translucencyByDistanceCart4.z;
      scratchTranslucencyByDistance.farValue = translucencyByDistanceCart4.w;
      feature.translucencyByDistance = scratchTranslucencyByDistance;
    } else {
      feature.translucencyByDistance = undefined;
    }

    if (defined(style.distanceDisplayCondition)) {
      const distanceDisplayConditionCart2 = style.distanceDisplayCondition.evaluate(
        feature
      );
      scratchDistanceDisplayCondition.near = distanceDisplayConditionCart2.x;
      scratchDistanceDisplayCondition.far = distanceDisplayConditionCart2.y;
      feature.distanceDisplayCondition = scratchDistanceDisplayCondition;
    } else {
      feature.distanceDisplayCondition = undefined;
    }

    if (defined(style.heightOffset)) {
      feature.heightOffset = style.heightOffset.evaluate(feature);
    }

    if (defined(style.anchorLineEnabled)) {
      feature.anchorLineEnabled = style.anchorLineEnabled.evaluate(feature);
    }

    if (defined(style.anchorLineColor)) {
      feature.anchorLineColor = style.anchorLineColor.evaluateColor(
        feature,
        scratchColor6
      );
    }

    if (defined(style.image)) {
      feature.image = style.image.evaluate(feature);
    } else {
      feature.image = undefined;
    }

    if (defined(style.disableDepthTestDistance)) {
      feature.disableDepthTestDistance = style.disableDepthTestDistance.evaluate(
        feature
      );
    }

    if (defined(style.horizontalOrigin)) {
      feature.horizontalOrigin = style.horizontalOrigin.evaluate(feature);
    }

    if (defined(style.verticalOrigin)) {
      feature.verticalOrigin = style.verticalOrigin.evaluate(feature);
    }

    if (defined(style.labelHorizontalOrigin)) {
      feature.labelHorizontalOrigin = style.labelHorizontalOrigin.evaluate(
        feature
      );
    }

    if (defined(style.labelVerticalOrigin)) {
      feature.labelVerticalOrigin = style.labelVerticalOrigin.evaluate(feature);
    }
  }
};

/**
 * @private
 */
Vector3DTilePoints.prototype.update = function (frameState) {
  createPoints(this, frameState.mapProjection.ellipsoid);

  if (!this._ready) {
    return;
  }

  this._polylineCollection.update(frameState);
  this._billboardCollection.update(frameState);
  this._labelCollection.update(frameState);

  if (!this._resolvedPromise) {
    this._readyPromise.resolve();
    this._resolvedPromise = true;
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 */
Vector3DTilePoints.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
Vector3DTilePoints.prototype.destroy = function () {
  this._billboardCollection =
    this._billboardCollection && this._billboardCollection.destroy();
  this._labelCollection =
    this._labelCollection && this._labelCollection.destroy();
  this._polylineCollection =
    this._polylineCollection && this._polylineCollection.destroy();
  return destroyObject(this);
};
export default Vector3DTilePoints;
