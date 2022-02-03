import buildModuleUrl from "../Core/buildModuleUrl.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Iso8601 from "../Core/Iso8601.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import Rectangle from "../Core/Rectangle.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TimeInterval from "../Core/TimeInterval.js";
import TimeIntervalCollection from "../Core/TimeIntervalCollection.js";
import HeightReference from "../Scene/HeightReference.js";
import HorizontalOrigin from "../Scene/HorizontalOrigin.js";
import VerticalOrigin from "../Scene/VerticalOrigin.js";
import when from "../ThirdParty/when.js";
import zip from "../ThirdParty/zip.js";
import BillboardGraphics from "./BillboardGraphics.js";
import CompositePositionProperty from "./CompositePositionProperty.js";
import ModelGraphics from "./ModelGraphics.js";
import RectangleGraphics from "./RectangleGraphics.js";
import SampledPositionProperty from "./SampledPositionProperty.js";
import SampledProperty from "./SampledProperty.js";
import ScaledPositionProperty from "./ScaledPositionProperty.js";

const BILLBOARD_SIZE = 32;
const kmlNamespace = "http://www.opengis.net/kml/2.2";
const gxNamespace = "http://www.google.com/kml/ext/2.2";
const xmlnsNamespace = "http://www.w3.org/2000/xmlns/";

//
// Handles files external to the KML (eg. textures and models)
//
function ExternalFileHandler(modelCallback) {
  this._files = {};
  this._promises = [];
  this._count = 0;
  this._modelCallback = modelCallback;
}

const imageTypeRegex = /^data:image\/([^,;]+)/;
ExternalFileHandler.prototype.texture = function (texture) {
  const that = this;
  let filename;

  if (typeof texture === "string" || texture instanceof Resource) {
    texture = Resource.createIfNeeded(texture);
    if (!texture.isDataUri) {
      return texture.url;
    }

    // If its a data URI try and get the correct extension and then fetch the blob
    const regexResult = texture.url.match(imageTypeRegex);
    filename = `texture_${++this._count}`;
    if (defined(regexResult)) {
      filename += `.${regexResult[1]}`;
    }

    const promise = texture.fetchBlob().then(function (blob) {
      that._files[filename] = blob;
    });

    this._promises.push(promise);

    return filename;
  }

  if (texture instanceof HTMLCanvasElement) {
    const deferred = when.defer();
    this._promises.push(deferred.promise);

    filename = `texture_${++this._count}.png`;
    texture.toBlob(function (blob) {
      that._files[filename] = blob;
      deferred.resolve();
    });

    return filename;
  }

  return "";
};

function getModelBlobHander(that, filename) {
  return function (blob) {
    that._files[filename] = blob;
  };
}

ExternalFileHandler.prototype.model = function (model, time) {
  const modelCallback = this._modelCallback;
  if (!defined(modelCallback)) {
    throw new RuntimeError(
      "Encountered a model entity while exporting to KML, but no model callback was supplied."
    );
  }

  const externalFiles = {};
  const url = modelCallback(model, time, externalFiles);

  // Iterate through external files and add them to our list once the promise resolves
  for (const filename in externalFiles) {
    if (externalFiles.hasOwnProperty(filename)) {
      const promise = when(externalFiles[filename]);
      this._promises.push(promise);

      promise.then(getModelBlobHander(this, filename));
    }
  }

  return url;
};

Object.defineProperties(ExternalFileHandler.prototype, {
  promise: {
    get: function () {
      return when.all(this._promises);
    },
  },
  files: {
    get: function () {
      return this._files;
    },
  },
});

//
// Handles getting values from properties taking the desired time and default values into account
//
function ValueGetter(time) {
  this._time = time;
}

ValueGetter.prototype.get = function (property, defaultVal, result) {
  let value;
  if (defined(property)) {
    value = defined(property.getValue)
      ? property.getValue(this._time, result)
      : property;
  }

  return defaultValue(value, defaultVal);
};

ValueGetter.prototype.getColor = function (property, defaultVal) {
  const result = this.get(property, defaultVal);
  if (defined(result)) {
    return colorToString(result);
  }
};

ValueGetter.prototype.getMaterialType = function (property) {
  if (!defined(property)) {
    return;
  }

  return property.getType(this._time);
};

//
// Caches styles so we don't generate a ton of duplicate styles
//
function StyleCache() {
  this._ids = {};
  this._styles = {};
  this._count = 0;
}

StyleCache.prototype.get = function (element) {
  const ids = this._ids;
  const key = element.innerHTML;
  if (defined(ids[key])) {
    return ids[key];
  }

  let styleId = `style-${++this._count}`;
  element.setAttribute("id", styleId);

  // Store with #
  styleId = `#${styleId}`;
  ids[key] = styleId;
  this._styles[key] = element;

  return styleId;
};

StyleCache.prototype.save = function (parentElement) {
  const styles = this._styles;

  const firstElement = parentElement.childNodes[0];
  for (const key in styles) {
    if (styles.hasOwnProperty(key)) {
      parentElement.insertBefore(styles[key], firstElement);
    }
  }
};

//
// Manages the generation of IDs because an entity may have geometry and a Folder for children
//
function IdManager() {
  this._ids = {};
}

IdManager.prototype.get = function (id) {
  if (!defined(id)) {
    return this.get(createGuid());
  }

  const ids = this._ids;
  if (!defined(ids[id])) {
    ids[id] = 0;
    return id;
  }

  return `${id.toString()}-${++ids[id]}`;
};

/**
 * @typedef exportKmlResultKml
 * @type {Object}
 * @property {String} kml The generated KML.
 * @property {Object.<string, Blob>} externalFiles An object dictionary of external files
 */

/**
 * @typedef exportKmlResultKmz
 * @type {Object}
 * @property {Blob} kmz The generated kmz file.
 */

/**
 * Exports an EntityCollection as a KML document. Only Point, Billboard, Model, Path, Polygon, Polyline geometries
 * will be exported. Note that there is not a 1 to 1 mapping of Entity properties to KML Feature properties. For
 * example, entity properties that are time dynamic but cannot be dynamic in KML are exported with their values at
 * options.time or the beginning of the EntityCollection's time interval if not specified. For time-dynamic properties
 * that are supported in KML, we use the samples if it is a {@link SampledProperty} otherwise we sample the value using
 * the options.sampleDuration. Point, Billboard, Model and Path geometries with time-dynamic positions will be exported
 * as gx:Track Features. Not all Materials are representable in KML, so for more advanced Materials just the primary
 * color is used. Canvas objects are exported as PNG images.
 *
 * @function exportKml
 *
 * @param {Object} options An object with the following properties:
 * @param {EntityCollection} options.entities The EntityCollection to export as KML.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid for the output file.
 * @param {exportKmlModelCallback} [options.modelCallback] A callback that will be called with a {@link ModelGraphics} instance and should return the URI to use in the KML. Required if a model exists in the entity collection.
 * @param {JulianDate} [options.time=entities.computeAvailability().start] The time value to use to get properties that are not time varying in KML.
 * @param {TimeInterval} [options.defaultAvailability=entities.computeAvailability()] The interval that will be sampled if an entity doesn't have an availability.
 * @param {Number} [options.sampleDuration=60] The number of seconds to sample properties that are varying in KML.
 * @param {Boolean} [options.kmz=false] If true KML and external files will be compressed into a kmz file.
 *
 * @returns {Promise<exportKmlResultKml|exportKmlResultKmz>} A promise that resolved to an object containing the KML string and a dictionary of external file blobs, or a kmz file as a blob if options.kmz is true.
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Export%20KML.html|Cesium Sandcastle KML Export Demo}
 * @example
 * Cesium.exportKml({
 *      entities: entityCollection
 *  })
 *   .then(function(result) {
 *     // The XML string is in result.kml
 *
 *     const externalFiles = result.externalFiles
 *     for(const file in externalFiles) {
 *       // file is the name of the file used in the KML document as the href
 *       // externalFiles[file] is a blob with the contents of the file
 *     }
 *   });
 *
 */
function exportKml(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const entities = options.entities;
  const kmz = defaultValue(options.kmz, false);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(entities)) {
    throw new DeveloperError("entities is required.");
  }
  //>>includeEnd('debug');

  // Get the state that is passed around during the recursion
  // This is separated out for testing.
  const state = exportKml._createState(options);

  // Filter EntityCollection so we only have top level entities
  const rootEntities = entities.values.filter(function (entity) {
    return !defined(entity.parent);
  });

  // Add the <Document>
  const kmlDoc = state.kmlDoc;
  const kmlElement = kmlDoc.documentElement;
  kmlElement.setAttributeNS(xmlnsNamespace, "xmlns:gx", gxNamespace);
  const kmlDocumentElement = kmlDoc.createElement("Document");
  kmlElement.appendChild(kmlDocumentElement);

  // Create the KML Hierarchy
  recurseEntities(state, kmlDocumentElement, rootEntities);

  // Write out the <Style> elements
  state.styleCache.save(kmlDocumentElement);

  // Once all the blobs have resolved return the KML string along with the blob collection
  const externalFileHandler = state.externalFileHandler;
  return externalFileHandler.promise.then(function () {
    const serializer = new XMLSerializer();
    const kmlString = serializer.serializeToString(state.kmlDoc);
    if (kmz) {
      return createKmz(kmlString, externalFileHandler.files);
    }

    return {
      kml: kmlString,
      externalFiles: externalFileHandler.files,
    };
  });
}

function createKmz(kmlString, externalFiles) {
  const zWorkerUrl = buildModuleUrl("ThirdParty/Workers/z-worker-pako.js");
  zip.configure({
    workerScripts: {
      deflate: [zWorkerUrl, "./pako_deflate.min.js"],
      inflate: [zWorkerUrl, "./pako_inflate.min.js"],
    },
  });
  const blobWriter = new zip.BlobWriter();
  const writer = new zip.ZipWriter(blobWriter);
  // We need to only write one file at a time so the zip doesn't get corrupted
  return when(writer.add("doc.kml", new zip.TextReader(kmlString)))
    .then(function () {
      const keys = Object.keys(externalFiles);
      return addExternalFilesToZip(writer, keys, externalFiles, 0);
    })
    .then(function () {
      return when(writer.close()).then(function (blob) {
        return {
          kmz: blob,
        };
      });
    });
}

function addExternalFilesToZip(writer, keys, externalFiles, index) {
  if (keys.length === index) {
    return;
  }
  const filename = keys[index];
  return when(
    writer.add(filename, new zip.BlobReader(externalFiles[filename]))
  ).then(function () {
    return addExternalFilesToZip(writer, keys, externalFiles, index + 1);
  });
}

exportKml._createState = function (options) {
  const entities = options.entities;

  const styleCache = new StyleCache();

  // Use the start time as the default because just in case they define
  //  properties with an interval even if they don't change.
  const entityAvailability = entities.computeAvailability();
  const time = defined(options.time) ? options.time : entityAvailability.start;

  // Figure out how we will sample dynamic position properties
  let defaultAvailability = defaultValue(
    options.defaultAvailability,
    entityAvailability
  );
  const sampleDuration = defaultValue(options.sampleDuration, 60);

  // Make sure we don't have infinite availability if we need to sample
  if (defaultAvailability.start === Iso8601.MINIMUM_VALUE) {
    if (defaultAvailability.stop === Iso8601.MAXIMUM_VALUE) {
      // Infinite, so just use the default
      defaultAvailability = new TimeInterval();
    } else {
      // No start time, so just sample 10 times before the stop
      JulianDate.addSeconds(
        defaultAvailability.stop,
        -10 * sampleDuration,
        defaultAvailability.start
      );
    }
  } else if (defaultAvailability.stop === Iso8601.MAXIMUM_VALUE) {
    // No stop time, so just sample 10 times after the start
    JulianDate.addSeconds(
      defaultAvailability.start,
      10 * sampleDuration,
      defaultAvailability.stop
    );
  }

  const externalFileHandler = new ExternalFileHandler(options.modelCallback);

  const kmlDoc = document.implementation.createDocument(kmlNamespace, "kml");
  return {
    kmlDoc: kmlDoc,
    ellipsoid: defaultValue(options.ellipsoid, Ellipsoid.WGS84),
    idManager: new IdManager(),
    styleCache: styleCache,
    externalFileHandler: externalFileHandler,
    time: time,
    valueGetter: new ValueGetter(time),
    sampleDuration: sampleDuration,
    // Wrap it in a TimeIntervalCollection because that is what entity.availability is
    defaultAvailability: new TimeIntervalCollection([defaultAvailability]),
  };
};

function recurseEntities(state, parentNode, entities) {
  const kmlDoc = state.kmlDoc;
  const styleCache = state.styleCache;
  const valueGetter = state.valueGetter;
  const idManager = state.idManager;

  const count = entities.length;
  let overlays;
  let geometries;
  let styles;
  for (let i = 0; i < count; ++i) {
    const entity = entities[i];
    overlays = [];
    geometries = [];
    styles = [];

    createPoint(state, entity, geometries, styles);
    createLineString(state, entity.polyline, geometries, styles);
    createPolygon(state, entity.rectangle, geometries, styles, overlays);
    createPolygon(state, entity.polygon, geometries, styles, overlays);
    createModel(state, entity, entity.model, geometries, styles);

    let timeSpan;
    const availability = entity.availability;
    if (defined(availability)) {
      timeSpan = kmlDoc.createElement("TimeSpan");

      if (!JulianDate.equals(availability.start, Iso8601.MINIMUM_VALUE)) {
        timeSpan.appendChild(
          createBasicElementWithText(
            kmlDoc,
            "begin",
            JulianDate.toIso8601(availability.start)
          )
        );
      }

      if (!JulianDate.equals(availability.stop, Iso8601.MAXIMUM_VALUE)) {
        timeSpan.appendChild(
          createBasicElementWithText(
            kmlDoc,
            "end",
            JulianDate.toIso8601(availability.stop)
          )
        );
      }
    }

    for (let overlayIndex = 0; overlayIndex < overlays.length; ++overlayIndex) {
      const overlay = overlays[overlayIndex];

      overlay.setAttribute("id", idManager.get(entity.id));
      overlay.appendChild(
        createBasicElementWithText(kmlDoc, "name", entity.name)
      );
      overlay.appendChild(
        createBasicElementWithText(kmlDoc, "visibility", entity.show)
      );
      overlay.appendChild(
        createBasicElementWithText(kmlDoc, "description", entity.description)
      );

      if (defined(timeSpan)) {
        overlay.appendChild(timeSpan);
      }

      parentNode.appendChild(overlay);
    }

    const geometryCount = geometries.length;
    if (geometryCount > 0) {
      const placemark = kmlDoc.createElement("Placemark");
      placemark.setAttribute("id", idManager.get(entity.id));

      let name = entity.name;
      const labelGraphics = entity.label;
      if (defined(labelGraphics)) {
        const labelStyle = kmlDoc.createElement("LabelStyle");

        // KML only shows the name as a label, so just change the name if we need to show a label
        const text = valueGetter.get(labelGraphics.text);
        name = defined(text) && text.length > 0 ? text : name;

        const color = valueGetter.getColor(labelGraphics.fillColor);
        if (defined(color)) {
          labelStyle.appendChild(
            createBasicElementWithText(kmlDoc, "color", color)
          );
          labelStyle.appendChild(
            createBasicElementWithText(kmlDoc, "colorMode", "normal")
          );
        }

        const scale = valueGetter.get(labelGraphics.scale);
        if (defined(scale)) {
          labelStyle.appendChild(
            createBasicElementWithText(kmlDoc, "scale", scale)
          );
        }

        styles.push(labelStyle);
      }

      placemark.appendChild(createBasicElementWithText(kmlDoc, "name", name));
      placemark.appendChild(
        createBasicElementWithText(kmlDoc, "visibility", entity.show)
      );
      placemark.appendChild(
        createBasicElementWithText(kmlDoc, "description", entity.description)
      );

      if (defined(timeSpan)) {
        placemark.appendChild(timeSpan);
      }

      parentNode.appendChild(placemark);

      const styleCount = styles.length;
      if (styleCount > 0) {
        const style = kmlDoc.createElement("Style");
        for (let styleIndex = 0; styleIndex < styleCount; ++styleIndex) {
          style.appendChild(styles[styleIndex]);
        }

        placemark.appendChild(
          createBasicElementWithText(kmlDoc, "styleUrl", styleCache.get(style))
        );
      }

      if (geometries.length === 1) {
        placemark.appendChild(geometries[0]);
      } else if (geometries.length > 1) {
        const multigeometry = kmlDoc.createElement("MultiGeometry");
        for (
          let geometryIndex = 0;
          geometryIndex < geometryCount;
          ++geometryIndex
        ) {
          multigeometry.appendChild(geometries[geometryIndex]);
        }
        placemark.appendChild(multigeometry);
      }
    }

    const children = entity._children;
    if (children.length > 0) {
      const folderNode = kmlDoc.createElement("Folder");
      folderNode.setAttribute("id", idManager.get(entity.id));
      folderNode.appendChild(
        createBasicElementWithText(kmlDoc, "name", entity.name)
      );
      folderNode.appendChild(
        createBasicElementWithText(kmlDoc, "visibility", entity.show)
      );
      folderNode.appendChild(
        createBasicElementWithText(kmlDoc, "description", entity.description)
      );

      parentNode.appendChild(folderNode);

      recurseEntities(state, folderNode, children);
    }
  }
}

const scratchCartesian3 = new Cartesian3();
const scratchCartographic = new Cartographic();
const scratchJulianDate = new JulianDate();

function createPoint(state, entity, geometries, styles) {
  const kmlDoc = state.kmlDoc;
  const ellipsoid = state.ellipsoid;
  const valueGetter = state.valueGetter;

  const pointGraphics = defaultValue(entity.billboard, entity.point);
  if (!defined(pointGraphics) && !defined(entity.path)) {
    return;
  }

  // If the point isn't constant then create gx:Track or gx:MultiTrack
  const entityPositionProperty = entity.position;
  if (!entityPositionProperty.isConstant) {
    createTracks(state, entity, pointGraphics, geometries, styles);
    return;
  }

  valueGetter.get(entityPositionProperty, undefined, scratchCartesian3);
  const coordinates = createBasicElementWithText(
    kmlDoc,
    "coordinates",
    getCoordinates(scratchCartesian3, ellipsoid)
  );

  const pointGeometry = kmlDoc.createElement("Point");

  // Set altitude mode
  const altitudeMode = kmlDoc.createElement("altitudeMode");
  altitudeMode.appendChild(
    getAltitudeMode(state, pointGraphics.heightReference)
  );
  pointGeometry.appendChild(altitudeMode);

  pointGeometry.appendChild(coordinates);
  geometries.push(pointGeometry);

  // Create style
  const iconStyle =
    pointGraphics instanceof BillboardGraphics
      ? createIconStyleFromBillboard(state, pointGraphics)
      : createIconStyleFromPoint(state, pointGraphics);
  styles.push(iconStyle);
}

function createTracks(state, entity, pointGraphics, geometries, styles) {
  const kmlDoc = state.kmlDoc;
  const ellipsoid = state.ellipsoid;
  const valueGetter = state.valueGetter;

  let intervals;
  const entityPositionProperty = entity.position;
  let useEntityPositionProperty = true;
  if (entityPositionProperty instanceof CompositePositionProperty) {
    intervals = entityPositionProperty.intervals;
    useEntityPositionProperty = false;
  } else {
    intervals = defaultValue(entity.availability, state.defaultAvailability);
  }

  const isModel = pointGraphics instanceof ModelGraphics;

  let i, j, times;
  const tracks = [];
  for (i = 0; i < intervals.length; ++i) {
    const interval = intervals.get(i);
    let positionProperty = useEntityPositionProperty
      ? entityPositionProperty
      : interval.data;

    const trackAltitudeMode = kmlDoc.createElement("altitudeMode");
    // This is something that KML importing uses to handle clampToGround,
    //  so just extract the internal property and set the altitudeMode.
    if (positionProperty instanceof ScaledPositionProperty) {
      positionProperty = positionProperty._value;
      trackAltitudeMode.appendChild(
        getAltitudeMode(state, HeightReference.CLAMP_TO_GROUND)
      );
    } else if (defined(pointGraphics)) {
      trackAltitudeMode.appendChild(
        getAltitudeMode(state, pointGraphics.heightReference)
      );
    } else {
      // Path graphics only, which has no height reference
      trackAltitudeMode.appendChild(
        getAltitudeMode(state, HeightReference.NONE)
      );
    }

    const positionTimes = [];
    const positionValues = [];

    if (positionProperty.isConstant) {
      valueGetter.get(positionProperty, undefined, scratchCartesian3);
      const constCoordinates = createBasicElementWithText(
        kmlDoc,
        "coordinates",
        getCoordinates(scratchCartesian3, ellipsoid)
      );

      // This interval is constant so add a track with the same position
      positionTimes.push(JulianDate.toIso8601(interval.start));
      positionValues.push(constCoordinates);
      positionTimes.push(JulianDate.toIso8601(interval.stop));
      positionValues.push(constCoordinates);
    } else if (positionProperty instanceof SampledPositionProperty) {
      times = positionProperty._property._times;

      for (j = 0; j < times.length; ++j) {
        positionTimes.push(JulianDate.toIso8601(times[j]));
        positionProperty.getValueInReferenceFrame(
          times[j],
          ReferenceFrame.FIXED,
          scratchCartesian3
        );
        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));
      }
    } else if (positionProperty instanceof SampledProperty) {
      times = positionProperty._times;
      const values = positionProperty._values;

      for (j = 0; j < times.length; ++j) {
        positionTimes.push(JulianDate.toIso8601(times[j]));
        Cartesian3.fromArray(values, j * 3, scratchCartesian3);
        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));
      }
    } else {
      const duration = state.sampleDuration;
      interval.start.clone(scratchJulianDate);
      if (!interval.isStartIncluded) {
        JulianDate.addSeconds(scratchJulianDate, duration, scratchJulianDate);
      }

      const stopDate = interval.stop;
      while (JulianDate.lessThan(scratchJulianDate, stopDate)) {
        positionProperty.getValue(scratchJulianDate, scratchCartesian3);

        positionTimes.push(JulianDate.toIso8601(scratchJulianDate));
        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));

        JulianDate.addSeconds(scratchJulianDate, duration, scratchJulianDate);
      }

      if (
        interval.isStopIncluded &&
        JulianDate.equals(scratchJulianDate, stopDate)
      ) {
        positionProperty.getValue(scratchJulianDate, scratchCartesian3);

        positionTimes.push(JulianDate.toIso8601(scratchJulianDate));
        positionValues.push(getCoordinates(scratchCartesian3, ellipsoid));
      }
    }

    const trackGeometry = kmlDoc.createElementNS(gxNamespace, "Track");
    trackGeometry.appendChild(trackAltitudeMode);

    for (let k = 0; k < positionTimes.length; ++k) {
      const when = createBasicElementWithText(kmlDoc, "when", positionTimes[k]);
      const coord = createBasicElementWithText(
        kmlDoc,
        "coord",
        positionValues[k],
        gxNamespace
      );

      trackGeometry.appendChild(when);
      trackGeometry.appendChild(coord);
    }

    if (isModel) {
      trackGeometry.appendChild(createModelGeometry(state, pointGraphics));
    }

    tracks.push(trackGeometry);
  }

  // If one track, then use it otherwise combine into a multitrack
  if (tracks.length === 1) {
    geometries.push(tracks[0]);
  } else if (tracks.length > 1) {
    const multiTrackGeometry = kmlDoc.createElementNS(
      gxNamespace,
      "MultiTrack"
    );

    for (i = 0; i < tracks.length; ++i) {
      multiTrackGeometry.appendChild(tracks[i]);
    }

    geometries.push(multiTrackGeometry);
  }

  // Create style
  if (defined(pointGraphics) && !isModel) {
    const iconStyle =
      pointGraphics instanceof BillboardGraphics
        ? createIconStyleFromBillboard(state, pointGraphics)
        : createIconStyleFromPoint(state, pointGraphics);
    styles.push(iconStyle);
  }

  // See if we have a line that needs to be drawn
  const path = entity.path;
  if (defined(path)) {
    const width = valueGetter.get(path.width);
    const material = path.material;
    if (defined(material) || defined(width)) {
      const lineStyle = kmlDoc.createElement("LineStyle");
      if (defined(width)) {
        lineStyle.appendChild(
          createBasicElementWithText(kmlDoc, "width", width)
        );
      }

      processMaterial(state, material, lineStyle);
      styles.push(lineStyle);
    }
  }
}

function createIconStyleFromPoint(state, pointGraphics) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;

  const iconStyle = kmlDoc.createElement("IconStyle");

  const color = valueGetter.getColor(pointGraphics.color);
  if (defined(color)) {
    iconStyle.appendChild(createBasicElementWithText(kmlDoc, "color", color));
    iconStyle.appendChild(
      createBasicElementWithText(kmlDoc, "colorMode", "normal")
    );
  }

  const pixelSize = valueGetter.get(pointGraphics.pixelSize);
  if (defined(pixelSize)) {
    iconStyle.appendChild(
      createBasicElementWithText(kmlDoc, "scale", pixelSize / BILLBOARD_SIZE)
    );
  }

  return iconStyle;
}

function createIconStyleFromBillboard(state, billboardGraphics) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;
  const externalFileHandler = state.externalFileHandler;

  const iconStyle = kmlDoc.createElement("IconStyle");

  let image = valueGetter.get(billboardGraphics.image);
  if (defined(image)) {
    image = externalFileHandler.texture(image);

    const icon = kmlDoc.createElement("Icon");
    icon.appendChild(createBasicElementWithText(kmlDoc, "href", image));

    const imageSubRegion = valueGetter.get(billboardGraphics.imageSubRegion);
    if (defined(imageSubRegion)) {
      icon.appendChild(
        createBasicElementWithText(kmlDoc, "x", imageSubRegion.x, gxNamespace)
      );
      icon.appendChild(
        createBasicElementWithText(kmlDoc, "y", imageSubRegion.y, gxNamespace)
      );
      icon.appendChild(
        createBasicElementWithText(
          kmlDoc,
          "w",
          imageSubRegion.width,
          gxNamespace
        )
      );
      icon.appendChild(
        createBasicElementWithText(
          kmlDoc,
          "h",
          imageSubRegion.height,
          gxNamespace
        )
      );
    }

    iconStyle.appendChild(icon);
  }

  const color = valueGetter.getColor(billboardGraphics.color);
  if (defined(color)) {
    iconStyle.appendChild(createBasicElementWithText(kmlDoc, "color", color));
    iconStyle.appendChild(
      createBasicElementWithText(kmlDoc, "colorMode", "normal")
    );
  }

  let scale = valueGetter.get(billboardGraphics.scale);
  if (defined(scale)) {
    iconStyle.appendChild(createBasicElementWithText(kmlDoc, "scale", scale));
  }

  const pixelOffset = valueGetter.get(billboardGraphics.pixelOffset);
  if (defined(pixelOffset)) {
    scale = defaultValue(scale, 1.0);

    Cartesian2.divideByScalar(pixelOffset, scale, pixelOffset);

    const width = valueGetter.get(billboardGraphics.width, BILLBOARD_SIZE);
    const height = valueGetter.get(billboardGraphics.height, BILLBOARD_SIZE);

    // KML Hotspots are from the bottom left, but we work from the top left

    // Move to left
    const horizontalOrigin = valueGetter.get(
      billboardGraphics.horizontalOrigin,
      HorizontalOrigin.CENTER
    );
    if (horizontalOrigin === HorizontalOrigin.CENTER) {
      pixelOffset.x -= width * 0.5;
    } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
      pixelOffset.x -= width;
    }

    // Move to bottom
    const verticalOrigin = valueGetter.get(
      billboardGraphics.verticalOrigin,
      VerticalOrigin.CENTER
    );
    if (verticalOrigin === VerticalOrigin.TOP) {
      pixelOffset.y += height;
    } else if (verticalOrigin === VerticalOrigin.CENTER) {
      pixelOffset.y += height * 0.5;
    }

    const hotSpot = kmlDoc.createElement("hotSpot");
    hotSpot.setAttribute("x", -pixelOffset.x);
    hotSpot.setAttribute("y", pixelOffset.y);
    hotSpot.setAttribute("xunits", "pixels");
    hotSpot.setAttribute("yunits", "pixels");

    iconStyle.appendChild(hotSpot);
  }

  // We can only specify heading so if axis isn't Z, then we skip the rotation
  // GE treats a heading of zero as no heading but can still point north using a 360 degree angle
  let rotation = valueGetter.get(billboardGraphics.rotation);
  const alignedAxis = valueGetter.get(billboardGraphics.alignedAxis);
  if (defined(rotation) && Cartesian3.equals(Cartesian3.UNIT_Z, alignedAxis)) {
    rotation = CesiumMath.toDegrees(-rotation);
    if (rotation === 0) {
      rotation = 360;
    }

    iconStyle.appendChild(
      createBasicElementWithText(kmlDoc, "heading", rotation)
    );
  }

  return iconStyle;
}

function createLineString(state, polylineGraphics, geometries, styles) {
  const kmlDoc = state.kmlDoc;
  const ellipsoid = state.ellipsoid;
  const valueGetter = state.valueGetter;

  if (!defined(polylineGraphics)) {
    return;
  }

  const lineStringGeometry = kmlDoc.createElement("LineString");

  // Set altitude mode
  const altitudeMode = kmlDoc.createElement("altitudeMode");
  const clampToGround = valueGetter.get(polylineGraphics.clampToGround, false);
  let altitudeModeText;
  if (clampToGround) {
    lineStringGeometry.appendChild(
      createBasicElementWithText(kmlDoc, "tessellate", true)
    );
    altitudeModeText = kmlDoc.createTextNode("clampToGround");
  } else {
    altitudeModeText = kmlDoc.createTextNode("absolute");
  }
  altitudeMode.appendChild(altitudeModeText);
  lineStringGeometry.appendChild(altitudeMode);

  // Set coordinates
  const positionsProperty = polylineGraphics.positions;
  const cartesians = valueGetter.get(positionsProperty);
  const coordinates = createBasicElementWithText(
    kmlDoc,
    "coordinates",
    getCoordinates(cartesians, ellipsoid)
  );
  lineStringGeometry.appendChild(coordinates);

  // Set draw order
  const zIndex = valueGetter.get(polylineGraphics.zIndex);
  if (clampToGround && defined(zIndex)) {
    lineStringGeometry.appendChild(
      createBasicElementWithText(kmlDoc, "drawOrder", zIndex, gxNamespace)
    );
  }

  geometries.push(lineStringGeometry);

  // Create style
  const lineStyle = kmlDoc.createElement("LineStyle");

  const width = valueGetter.get(polylineGraphics.width);
  if (defined(width)) {
    lineStyle.appendChild(createBasicElementWithText(kmlDoc, "width", width));
  }

  processMaterial(state, polylineGraphics.material, lineStyle);

  styles.push(lineStyle);
}

function getRectangleBoundaries(state, rectangleGraphics, extrudedHeight) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;

  let height = valueGetter.get(rectangleGraphics.height, 0.0);

  if (extrudedHeight > 0) {
    // We extrude up and KML extrudes down, so if we extrude, set the polygon height to
    // the extruded height so KML will look similar to Cesium
    height = extrudedHeight;
  }

  const coordinatesProperty = rectangleGraphics.coordinates;
  const rectangle = valueGetter.get(coordinatesProperty);

  const coordinateStrings = [];
  const cornerFunction = [
    Rectangle.northeast,
    Rectangle.southeast,
    Rectangle.southwest,
    Rectangle.northwest,
  ];

  for (let i = 0; i < 4; ++i) {
    cornerFunction[i](rectangle, scratchCartographic);
    coordinateStrings.push(
      `${CesiumMath.toDegrees(
        scratchCartographic.longitude
      )},${CesiumMath.toDegrees(scratchCartographic.latitude)},${height}`
    );
  }

  const coordinates = createBasicElementWithText(
    kmlDoc,
    "coordinates",
    coordinateStrings.join(" ")
  );

  const outerBoundaryIs = kmlDoc.createElement("outerBoundaryIs");
  const linearRing = kmlDoc.createElement("LinearRing");
  linearRing.appendChild(coordinates);
  outerBoundaryIs.appendChild(linearRing);

  return [outerBoundaryIs];
}

function getLinearRing(state, positions, height, perPositionHeight) {
  const kmlDoc = state.kmlDoc;
  const ellipsoid = state.ellipsoid;

  const coordinateStrings = [];
  const positionCount = positions.length;
  for (let i = 0; i < positionCount; ++i) {
    Cartographic.fromCartesian(positions[i], ellipsoid, scratchCartographic);
    coordinateStrings.push(
      `${CesiumMath.toDegrees(
        scratchCartographic.longitude
      )},${CesiumMath.toDegrees(scratchCartographic.latitude)},${
        perPositionHeight ? scratchCartographic.height : height
      }`
    );
  }

  const coordinates = createBasicElementWithText(
    kmlDoc,
    "coordinates",
    coordinateStrings.join(" ")
  );
  const linearRing = kmlDoc.createElement("LinearRing");
  linearRing.appendChild(coordinates);

  return linearRing;
}

function getPolygonBoundaries(state, polygonGraphics, extrudedHeight) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;

  let height = valueGetter.get(polygonGraphics.height, 0.0);
  const perPositionHeight = valueGetter.get(
    polygonGraphics.perPositionHeight,
    false
  );

  if (!perPositionHeight && extrudedHeight > 0) {
    // We extrude up and KML extrudes down, so if we extrude, set the polygon height to
    // the extruded height so KML will look similar to Cesium
    height = extrudedHeight;
  }

  const boundaries = [];
  const hierarchyProperty = polygonGraphics.hierarchy;
  const hierarchy = valueGetter.get(hierarchyProperty);

  // Polygon hierarchy can sometimes just be an array of positions
  const positions = Array.isArray(hierarchy) ? hierarchy : hierarchy.positions;

  // Polygon boundaries
  const outerBoundaryIs = kmlDoc.createElement("outerBoundaryIs");
  outerBoundaryIs.appendChild(
    getLinearRing(state, positions, height, perPositionHeight)
  );
  boundaries.push(outerBoundaryIs);

  // Hole boundaries
  const holes = hierarchy.holes;
  if (defined(holes)) {
    const holeCount = holes.length;
    for (let i = 0; i < holeCount; ++i) {
      const innerBoundaryIs = kmlDoc.createElement("innerBoundaryIs");
      innerBoundaryIs.appendChild(
        getLinearRing(state, holes[i].positions, height, perPositionHeight)
      );
      boundaries.push(innerBoundaryIs);
    }
  }

  return boundaries;
}

function createPolygon(state, geometry, geometries, styles, overlays) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;

  if (!defined(geometry)) {
    return;
  }

  // Detect textured quads and use ground overlays instead
  const isRectangle = geometry instanceof RectangleGraphics;
  if (
    isRectangle &&
    valueGetter.getMaterialType(geometry.material) === "Image"
  ) {
    createGroundOverlay(state, geometry, overlays);
    return;
  }

  const polygonGeometry = kmlDoc.createElement("Polygon");

  const extrudedHeight = valueGetter.get(geometry.extrudedHeight, 0.0);
  if (extrudedHeight > 0) {
    polygonGeometry.appendChild(
      createBasicElementWithText(kmlDoc, "extrude", true)
    );
  }

  // Set boundaries
  const boundaries = isRectangle
    ? getRectangleBoundaries(state, geometry, extrudedHeight)
    : getPolygonBoundaries(state, geometry, extrudedHeight);

  const boundaryCount = boundaries.length;
  for (let i = 0; i < boundaryCount; ++i) {
    polygonGeometry.appendChild(boundaries[i]);
  }

  // Set altitude mode
  const altitudeMode = kmlDoc.createElement("altitudeMode");
  altitudeMode.appendChild(getAltitudeMode(state, geometry.heightReference));
  polygonGeometry.appendChild(altitudeMode);

  geometries.push(polygonGeometry);

  // Create style
  const polyStyle = kmlDoc.createElement("PolyStyle");

  const fill = valueGetter.get(geometry.fill, false);
  if (fill) {
    polyStyle.appendChild(createBasicElementWithText(kmlDoc, "fill", fill));
  }

  processMaterial(state, geometry.material, polyStyle);

  const outline = valueGetter.get(geometry.outline, false);
  if (outline) {
    polyStyle.appendChild(
      createBasicElementWithText(kmlDoc, "outline", outline)
    );

    // Outline uses LineStyle
    const lineStyle = kmlDoc.createElement("LineStyle");

    const outlineWidth = valueGetter.get(geometry.outlineWidth, 1.0);
    lineStyle.appendChild(
      createBasicElementWithText(kmlDoc, "width", outlineWidth)
    );

    const outlineColor = valueGetter.getColor(
      geometry.outlineColor,
      Color.BLACK
    );
    lineStyle.appendChild(
      createBasicElementWithText(kmlDoc, "color", outlineColor)
    );
    lineStyle.appendChild(
      createBasicElementWithText(kmlDoc, "colorMode", "normal")
    );

    styles.push(lineStyle);
  }

  styles.push(polyStyle);
}

function createGroundOverlay(state, rectangleGraphics, overlays) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;
  const externalFileHandler = state.externalFileHandler;

  const groundOverlay = kmlDoc.createElement("GroundOverlay");

  // Set altitude mode
  const altitudeMode = kmlDoc.createElement("altitudeMode");
  altitudeMode.appendChild(
    getAltitudeMode(state, rectangleGraphics.heightReference)
  );
  groundOverlay.appendChild(altitudeMode);

  const height = valueGetter.get(rectangleGraphics.height);
  if (defined(height)) {
    groundOverlay.appendChild(
      createBasicElementWithText(kmlDoc, "altitude", height)
    );
  }

  const rectangle = valueGetter.get(rectangleGraphics.coordinates);
  const latLonBox = kmlDoc.createElement("LatLonBox");
  latLonBox.appendChild(
    createBasicElementWithText(
      kmlDoc,
      "north",
      CesiumMath.toDegrees(rectangle.north)
    )
  );
  latLonBox.appendChild(
    createBasicElementWithText(
      kmlDoc,
      "south",
      CesiumMath.toDegrees(rectangle.south)
    )
  );
  latLonBox.appendChild(
    createBasicElementWithText(
      kmlDoc,
      "east",
      CesiumMath.toDegrees(rectangle.east)
    )
  );
  latLonBox.appendChild(
    createBasicElementWithText(
      kmlDoc,
      "west",
      CesiumMath.toDegrees(rectangle.west)
    )
  );
  groundOverlay.appendChild(latLonBox);

  // We should only end up here if we have an ImageMaterialProperty
  const material = valueGetter.get(rectangleGraphics.material);
  const href = externalFileHandler.texture(material.image);
  const icon = kmlDoc.createElement("Icon");
  icon.appendChild(createBasicElementWithText(kmlDoc, "href", href));
  groundOverlay.appendChild(icon);

  const color = material.color;
  if (defined(color)) {
    groundOverlay.appendChild(
      createBasicElementWithText(kmlDoc, "color", colorToString(material.color))
    );
  }

  overlays.push(groundOverlay);
}

function createModelGeometry(state, modelGraphics) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;
  const externalFileHandler = state.externalFileHandler;

  const modelGeometry = kmlDoc.createElement("Model");

  const scale = valueGetter.get(modelGraphics.scale);
  if (defined(scale)) {
    const scaleElement = kmlDoc.createElement("scale");
    scaleElement.appendChild(createBasicElementWithText(kmlDoc, "x", scale));
    scaleElement.appendChild(createBasicElementWithText(kmlDoc, "y", scale));
    scaleElement.appendChild(createBasicElementWithText(kmlDoc, "z", scale));
    modelGeometry.appendChild(scaleElement);
  }

  const link = kmlDoc.createElement("Link");
  const uri = externalFileHandler.model(modelGraphics, state.time);

  link.appendChild(createBasicElementWithText(kmlDoc, "href", uri));
  modelGeometry.appendChild(link);

  return modelGeometry;
}

function createModel(state, entity, modelGraphics, geometries, styles) {
  const kmlDoc = state.kmlDoc;
  const ellipsoid = state.ellipsoid;
  const valueGetter = state.valueGetter;

  if (!defined(modelGraphics)) {
    return;
  }

  // If the point isn't constant then create gx:Track or gx:MultiTrack
  const entityPositionProperty = entity.position;
  if (!entityPositionProperty.isConstant) {
    createTracks(state, entity, modelGraphics, geometries, styles);
    return;
  }

  const modelGeometry = createModelGeometry(state, modelGraphics);

  // Set altitude mode
  const altitudeMode = kmlDoc.createElement("altitudeMode");
  altitudeMode.appendChild(
    getAltitudeMode(state, modelGraphics.heightReference)
  );
  modelGeometry.appendChild(altitudeMode);

  valueGetter.get(entityPositionProperty, undefined, scratchCartesian3);
  Cartographic.fromCartesian(scratchCartesian3, ellipsoid, scratchCartographic);
  const location = kmlDoc.createElement("Location");
  location.appendChild(
    createBasicElementWithText(
      kmlDoc,
      "longitude",
      CesiumMath.toDegrees(scratchCartographic.longitude)
    )
  );
  location.appendChild(
    createBasicElementWithText(
      kmlDoc,
      "latitude",
      CesiumMath.toDegrees(scratchCartographic.latitude)
    )
  );
  location.appendChild(
    createBasicElementWithText(kmlDoc, "altitude", scratchCartographic.height)
  );
  modelGeometry.appendChild(location);

  geometries.push(modelGeometry);
}

function processMaterial(state, materialProperty, style) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;

  if (!defined(materialProperty)) {
    return;
  }

  const material = valueGetter.get(materialProperty);
  if (!defined(material)) {
    return;
  }

  let color;
  const type = valueGetter.getMaterialType(materialProperty);
  let outlineColor;
  let outlineWidth;
  switch (type) {
    case "Image":
      // Image materials are only able to be represented on rectangles, so if we make it
      //  here we can't texture a generic polygon or polyline in KML, so just use white.
      color = colorToString(Color.WHITE);
      break;
    case "Color":
    case "Grid":
    case "PolylineGlow":
    case "PolylineArrow":
    case "PolylineDash":
      color = colorToString(material.color);
      break;
    case "PolylineOutline":
      color = colorToString(material.color);

      outlineColor = colorToString(material.outlineColor);
      outlineWidth = material.outlineWidth;
      style.appendChild(
        createBasicElementWithText(
          kmlDoc,
          "outerColor",
          outlineColor,
          gxNamespace
        )
      );
      style.appendChild(
        createBasicElementWithText(
          kmlDoc,
          "outerWidth",
          outlineWidth,
          gxNamespace
        )
      );
      break;
    case "Stripe":
      color = colorToString(material.oddColor);
      break;
  }

  if (defined(color)) {
    style.appendChild(createBasicElementWithText(kmlDoc, "color", color));
    style.appendChild(
      createBasicElementWithText(kmlDoc, "colorMode", "normal")
    );
  }
}

function getAltitudeMode(state, heightReferenceProperty) {
  const kmlDoc = state.kmlDoc;
  const valueGetter = state.valueGetter;

  const heightReference = valueGetter.get(
    heightReferenceProperty,
    HeightReference.NONE
  );
  let altitudeModeText;
  switch (heightReference) {
    case HeightReference.NONE:
      altitudeModeText = kmlDoc.createTextNode("absolute");
      break;
    case HeightReference.CLAMP_TO_GROUND:
      altitudeModeText = kmlDoc.createTextNode("clampToGround");
      break;
    case HeightReference.RELATIVE_TO_GROUND:
      altitudeModeText = kmlDoc.createTextNode("relativeToGround");
      break;
  }

  return altitudeModeText;
}

function getCoordinates(coordinates, ellipsoid) {
  if (!Array.isArray(coordinates)) {
    coordinates = [coordinates];
  }

  const count = coordinates.length;
  const coordinateStrings = [];
  for (let i = 0; i < count; ++i) {
    Cartographic.fromCartesian(coordinates[i], ellipsoid, scratchCartographic);
    coordinateStrings.push(
      `${CesiumMath.toDegrees(
        scratchCartographic.longitude
      )},${CesiumMath.toDegrees(scratchCartographic.latitude)},${
        scratchCartographic.height
      }`
    );
  }

  return coordinateStrings.join(" ");
}

function createBasicElementWithText(
  kmlDoc,
  elementName,
  elementValue,
  namespace
) {
  elementValue = defaultValue(elementValue, "");

  if (typeof elementValue === "boolean") {
    elementValue = elementValue ? "1" : "0";
  }

  // Create element with optional namespace
  const element = defined(namespace)
    ? kmlDoc.createElementNS(namespace, elementName)
    : kmlDoc.createElement(elementName);

  // Wrap value in CDATA section if it contains HTML
  const text =
    elementValue === "string" && elementValue.indexOf("<") !== -1
      ? kmlDoc.createCDATASection(elementValue)
      : kmlDoc.createTextNode(elementValue);

  element.appendChild(text);

  return element;
}

function colorToString(color) {
  let result = "";
  const bytes = color.toBytes();
  for (let i = 3; i >= 0; --i) {
    result +=
      bytes[i] < 16 ? `0${bytes[i].toString(16)}` : bytes[i].toString(16);
  }

  return result;
}

/**
 * Since KML does not support glTF models, this callback is required to specify what URL to use for the model in the KML document.
 * It can also be used to add additional files to the <code>externalFiles</code> object, which is the list of files embedded in the exported KMZ,
 * or otherwise returned with the KML string when exporting.
 *
 * @callback exportKmlModelCallback
 *
 * @param {ModelGraphics} model The ModelGraphics instance for an Entity.
 * @param {JulianDate} time The time that any properties should use to get the value.
 * @param {Object} externalFiles An object that maps a filename to a Blob or a Promise that resolves to a Blob.
 * @returns {String} The URL to use for the href in the KML document.
 */
export default exportKml;
