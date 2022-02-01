import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import ClockRange from "../Core/ClockRange.js";
import ClockStep from "../Core/ClockStep.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Iso8601 from "../Core/Iso8601.js";
import JulianDate from "../Core/JulianDate.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import PinBuilder from "../Core/PinBuilder.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TimeInterval from "../Core/TimeInterval.js";
import TimeIntervalCollection from "../Core/TimeIntervalCollection.js";
import HeightReference from "../Scene/HeightReference.js";
import HorizontalOrigin from "../Scene/HorizontalOrigin.js";
import LabelStyle from "../Scene/LabelStyle.js";
import VerticalOrigin from "../Scene/VerticalOrigin.js";
import Autolinker from "../ThirdParty/Autolinker.js";
import when from "../ThirdParty/when.js";
import BillboardGraphics from "./BillboardGraphics.js";
import ConstantProperty from "./ConstantProperty.js";
import DataSource from "./DataSource.js";
import DataSourceClock from "./DataSourceClock.js";
import EntityCluster from "./EntityCluster.js";
import EntityCollection from "./EntityCollection.js";
import LabelGraphics from "./LabelGraphics.js";
import PolylineGraphics from "./PolylineGraphics.js";
import PolylineOutlineMaterialProperty from "./PolylineOutlineMaterialProperty.js";
import SampledPositionProperty from "./SampledPositionProperty.js";

let parser;
if (typeof DOMParser !== "undefined") {
  parser = new DOMParser();
}

const autolinker = new Autolinker({
  stripPrefix: false,
  email: false,
  replaceFn: function (linker, match) {
    if (!match.protocolUrlMatch) {
      // Prevent matching of non-explicit urls.
      // i.e. foo.id won't match but http://foo.id will
      return false;
    }
  },
});

const BILLBOARD_SIZE = 32;
const BILLBOARD_NEAR_DISTANCE = 2414016;
const BILLBOARD_NEAR_RATIO = 1.0;
const BILLBOARD_FAR_DISTANCE = 1.6093e7;
const BILLBOARD_FAR_RATIO = 0.1;

const gpxNamespaces = [null, undefined, "http://www.topografix.com/GPX/1/1"];
const namespaces = {
  gpx: gpxNamespaces,
};

function readBlobAsText(blob) {
  const deferred = when.defer();
  const reader = new FileReader();
  reader.addEventListener("load", function () {
    deferred.resolve(reader.result);
  });
  reader.addEventListener("error", function () {
    deferred.reject(reader.error);
  });
  reader.readAsText(blob);
  return deferred;
}

function getOrCreateEntity(node, entityCollection) {
  let id = queryStringAttribute(node, "id");
  id = defined(id) ? id : createGuid();
  const entity = entityCollection.getOrCreateEntity(id);
  return entity;
}

function readCoordinateFromNode(node) {
  const longitude = queryNumericAttribute(node, "lon");
  const latitude = queryNumericAttribute(node, "lat");
  const elevation = queryNumericValue(node, "ele", namespaces.gpx);
  return Cartesian3.fromDegrees(longitude, latitude, elevation);
}

function queryNumericAttribute(node, attributeName) {
  if (!defined(node)) {
    return undefined;
  }

  const value = node.getAttribute(attributeName);
  if (value !== null) {
    const result = parseFloat(value);
    return !isNaN(result) ? result : undefined;
  }
  return undefined;
}

function queryStringAttribute(node, attributeName) {
  if (!defined(node)) {
    return undefined;
  }
  const value = node.getAttribute(attributeName);
  return value !== null ? value : undefined;
}

function queryFirstNode(node, tagName, namespace) {
  if (!defined(node)) {
    return undefined;
  }
  const childNodes = node.childNodes;
  const length = childNodes.length;
  for (let q = 0; q < length; q++) {
    const child = childNodes[q];
    if (
      child.localName === tagName &&
      namespace.indexOf(child.namespaceURI) !== -1
    ) {
      return child;
    }
  }
  return undefined;
}

function queryNodes(node, tagName, namespace) {
  if (!defined(node)) {
    return undefined;
  }
  const result = [];
  const childNodes = node.getElementsByTagName(tagName);
  const length = childNodes.length;
  for (let q = 0; q < length; q++) {
    const child = childNodes[q];
    if (
      child.localName === tagName &&
      namespace.indexOf(child.namespaceURI) !== -1
    ) {
      result.push(child);
    }
  }
  return result;
}

function queryNumericValue(node, tagName, namespace) {
  const resultNode = queryFirstNode(node, tagName, namespace);
  if (defined(resultNode)) {
    const result = parseFloat(resultNode.textContent);
    return !isNaN(result) ? result : undefined;
  }
  return undefined;
}

function queryStringValue(node, tagName, namespace) {
  const result = queryFirstNode(node, tagName, namespace);
  if (defined(result)) {
    return result.textContent.trim();
  }
  return undefined;
}

function createDefaultBillboard(image) {
  const billboard = new BillboardGraphics();
  billboard.width = BILLBOARD_SIZE;
  billboard.height = BILLBOARD_SIZE;
  billboard.scaleByDistance = new NearFarScalar(
    BILLBOARD_NEAR_DISTANCE,
    BILLBOARD_NEAR_RATIO,
    BILLBOARD_FAR_DISTANCE,
    BILLBOARD_FAR_RATIO
  );
  billboard.pixelOffsetScaleByDistance = new NearFarScalar(
    BILLBOARD_NEAR_DISTANCE,
    BILLBOARD_NEAR_RATIO,
    BILLBOARD_FAR_DISTANCE,
    BILLBOARD_FAR_RATIO
  );
  billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
  billboard.image = image;
  return billboard;
}

function createDefaultLabel() {
  const label = new LabelGraphics();
  label.translucencyByDistance = new NearFarScalar(3000000, 1.0, 5000000, 0.0);
  label.pixelOffset = new Cartesian2(17, 0);
  label.horizontalOrigin = HorizontalOrigin.LEFT;
  label.font = "16px sans-serif";
  label.style = LabelStyle.FILL_AND_OUTLINE;
  return label;
}

function createDefaultPolyline(color) {
  const polyline = new PolylineGraphics();
  polyline.width = 4;
  polyline.material = new PolylineOutlineMaterialProperty();
  polyline.material.color = defined(color) ? color : Color.RED;
  polyline.material.outlineWidth = 2;
  polyline.material.outlineColor = Color.BLACK;
  return polyline;
}

// This is a list of the Optional Description Information:
//  <cmt> GPS comment of the waypoint
//  <desc> Descriptive description of the waypoint
//  <src> Source of the waypoint data
//  <type> Type (category) of waypoint
const descriptiveInfoTypes = {
  time: {
    text: "Time",
    tag: "time",
  },
  comment: {
    text: "Comment",
    tag: "cmt",
  },
  description: {
    text: "Description",
    tag: "desc",
  },
  source: {
    text: "Source",
    tag: "src",
  },
  number: {
    text: "GPS track/route number",
    tag: "number",
  },
  type: {
    text: "Type",
    tag: "type",
  },
};

let scratchDiv;
if (typeof document !== "undefined") {
  scratchDiv = document.createElement("div");
}
function processDescription(node, entity) {
  let i;

  let text = "";
  const infoTypeNames = Object.keys(descriptiveInfoTypes);
  const length = infoTypeNames.length;
  for (i = 0; i < length; i++) {
    const infoTypeName = infoTypeNames[i];
    const infoType = descriptiveInfoTypes[infoTypeName];
    infoType.value = defaultValue(
      queryStringValue(node, infoType.tag, namespaces.gpx),
      ""
    );
    if (defined(infoType.value) && infoType.value !== "") {
      text = text + "<p>" + infoType.text + ": " + infoType.value + "</p>";
    }
  }

  if (!defined(text) || text === "") {
    // No description
    return;
  }

  // Turns non-explicit links into clickable links.
  text = autolinker.link(text);

  // Use a temporary div to manipulate the links
  // so that they open in a new window.
  scratchDiv.innerHTML = text;
  const links = scratchDiv.querySelectorAll("a");

  for (i = 0; i < links.length; i++) {
    links[i].setAttribute("target", "_blank");
  }

  const background = Color.WHITE;
  const foreground = Color.BLACK;
  let tmp = '<div class="cesium-infoBox-description-lighter" style="';
  tmp += "overflow:auto;";
  tmp += "word-wrap:break-word;";
  tmp += "background-color:" + background.toCssColorString() + ";";
  tmp += "color:" + foreground.toCssColorString() + ";";
  tmp += '">';
  tmp += scratchDiv.innerHTML + "</div>";
  scratchDiv.innerHTML = "";

  // return the final HTML as the description.
  return tmp;
}

function processWpt(dataSource, geometryNode, entityCollection, options) {
  const position = readCoordinateFromNode(geometryNode);

  const entity = getOrCreateEntity(geometryNode, entityCollection);
  entity.position = position;

  // Get billboard image
  const image = defined(options.wptImage)
    ? options.wptImage
    : dataSource._pinBuilder.fromMakiIconId(
        "marker",
        Color.RED,
        BILLBOARD_SIZE
      );
  entity.billboard = createDefaultBillboard(image);

  const name = queryStringValue(geometryNode, "name", namespaces.gpx);
  entity.name = name;
  entity.label = createDefaultLabel();
  entity.label.text = name;
  entity.description = processDescription(geometryNode, entity);

  if (options.clampToGround) {
    entity.billboard.heightReference = HeightReference.CLAMP_TO_GROUND;
    entity.label.heightReference = HeightReference.CLAMP_TO_GROUND;
  }
}

// rte represents route - an ordered list of waypoints representing a series of turn points leading to a destination
function processRte(dataSource, geometryNode, entityCollection, options) {
  const entity = getOrCreateEntity(geometryNode, entityCollection);
  entity.description = processDescription(geometryNode, entity);

  // a list of wpt
  const routePoints = queryNodes(geometryNode, "rtept", namespaces.gpx);
  const coordinateTuples = new Array(routePoints.length);
  for (let i = 0; i < routePoints.length; i++) {
    processWpt(dataSource, routePoints[i], entityCollection, options);
    coordinateTuples[i] = readCoordinateFromNode(routePoints[i]);
  }
  entity.polyline = createDefaultPolyline(options.trkColor);
  if (options.clampToGround) {
    entity.polyline.clampToGround = true;
  }
  entity.polyline.positions = coordinateTuples;
}

// trk represents a track - an ordered list of points describing a path.
function processTrk(dataSource, geometryNode, entityCollection, options) {
  const entity = getOrCreateEntity(geometryNode, entityCollection);
  entity.description = processDescription(geometryNode, entity);

  const trackSegs = queryNodes(geometryNode, "trkseg", namespaces.gpx);
  let positions = [];
  let times = [];
  let trackSegInfo;
  let isTimeDynamic = true;
  const property = new SampledPositionProperty();
  for (let i = 0; i < trackSegs.length; i++) {
    trackSegInfo = processTrkSeg(trackSegs[i]);
    positions = positions.concat(trackSegInfo.positions);
    if (trackSegInfo.times.length > 0) {
      times = times.concat(trackSegInfo.times);
      property.addSamples(times, positions);
      // if one track segment is non dynamic the whole track must also be
      isTimeDynamic = isTimeDynamic && true;
    } else {
      isTimeDynamic = false;
    }
  }
  if (isTimeDynamic) {
    // Assign billboard image
    const image = defined(options.wptImage)
      ? options.wptImage
      : dataSource._pinBuilder.fromMakiIconId(
          "marker",
          Color.RED,
          BILLBOARD_SIZE
        );
    entity.billboard = createDefaultBillboard(image);
    entity.position = property;
    if (options.clampToGround) {
      entity.billboard.heightReference = HeightReference.CLAMP_TO_GROUND;
    }
    entity.availability = new TimeIntervalCollection();
    entity.availability.addInterval(
      new TimeInterval({
        start: times[0],
        stop: times[times.length - 1],
      })
    );
  }
  entity.polyline = createDefaultPolyline(options.trkColor);
  entity.polyline.positions = positions;
  if (options.clampToGround) {
    entity.polyline.clampToGround = true;
  }
}

function processTrkSeg(node) {
  const result = {
    positions: [],
    times: [],
  };
  const trackPoints = queryNodes(node, "trkpt", namespaces.gpx);
  let time;
  for (let i = 0; i < trackPoints.length; i++) {
    const position = readCoordinateFromNode(trackPoints[i]);
    result.positions.push(position);

    time = queryStringValue(trackPoints[i], "time", namespaces.gpx);
    if (defined(time)) {
      result.times.push(JulianDate.fromIso8601(time));
    }
  }
  return result;
}

// Processes a metadataType node and returns a metadata object
// {@link http://www.topografix.com/gpx/1/1/#type_metadataType|GPX Schema}
function processMetadata(node) {
  const metadataNode = queryFirstNode(node, "metadata", namespaces.gpx);
  if (defined(metadataNode)) {
    const metadata = {
      name: queryStringValue(metadataNode, "name", namespaces.gpx),
      desc: queryStringValue(metadataNode, "desc", namespaces.gpx),
      author: getPerson(metadataNode),
      copyright: getCopyright(metadataNode),
      link: getLink(metadataNode),
      time: queryStringValue(metadataNode, "time", namespaces.gpx),
      keywords: queryStringValue(metadataNode, "keywords", namespaces.gpx),
      bounds: getBounds(metadataNode),
    };
    if (
      defined(metadata.name) ||
      defined(metadata.desc) ||
      defined(metadata.author) ||
      defined(metadata.copyright) ||
      defined(metadata.link) ||
      defined(metadata.time) ||
      defined(metadata.keywords) ||
      defined(metadata.bounds)
    ) {
      return metadata;
    }
  }
  return undefined;
}

// Receives a XML node and returns a personType object, refer to
// {@link http://www.topografix.com/gpx/1/1/#type_personType|GPX Schema}
function getPerson(node) {
  const personNode = queryFirstNode(node, "author", namespaces.gpx);
  if (defined(personNode)) {
    const person = {
      name: queryStringValue(personNode, "name", namespaces.gpx),
      email: getEmail(personNode),
      link: getLink(personNode),
    };
    if (defined(person.name) || defined(person.email) || defined(person.link)) {
      return person;
    }
  }
  return undefined;
}

// Receives a XML node and returns an email address (from emailType), refer to
// {@link http://www.topografix.com/gpx/1/1/#type_emailType|GPX Schema}
function getEmail(node) {
  const emailNode = queryFirstNode(node, "email", namespaces.gpx);
  if (defined(emailNode)) {
    const id = queryStringValue(emailNode, "id", namespaces.gpx);
    const domain = queryStringValue(emailNode, "domain", namespaces.gpx);
    return id + "@" + domain;
  }
  return undefined;
}

// Receives a XML node and returns a linkType object, refer to
// {@link http://www.topografix.com/gpx/1/1/#type_linkType|GPX Schema}
function getLink(node) {
  const linkNode = queryFirstNode(node, "link", namespaces.gpx);
  if (defined(linkNode)) {
    const link = {
      href: queryStringAttribute(linkNode, "href"),
      text: queryStringValue(linkNode, "text", namespaces.gpx),
      mimeType: queryStringValue(linkNode, "type", namespaces.gpx),
    };
    if (defined(link.href) || defined(link.text) || defined(link.mimeType)) {
      return link;
    }
  }
  return undefined;
}

// Receives a XML node and returns a copyrightType object, refer to
// {@link http://www.topografix.com/gpx/1/1/#type_copyrightType|GPX Schema}
function getCopyright(node) {
  const copyrightNode = queryFirstNode(node, "copyright", namespaces.gpx);
  if (defined(copyrightNode)) {
    const copyright = {
      author: queryStringAttribute(copyrightNode, "author"),
      year: queryStringValue(copyrightNode, "year", namespaces.gpx),
      license: queryStringValue(copyrightNode, "license", namespaces.gpx),
    };
    if (
      defined(copyright.author) ||
      defined(copyright.year) ||
      defined(copyright.license)
    ) {
      return copyright;
    }
  }
  return undefined;
}

// Receives a XML node and returns a boundsType object, refer to
// {@link http://www.topografix.com/gpx/1/1/#type_boundsType|GPX Schema}
function getBounds(node) {
  const boundsNode = queryFirstNode(node, "bounds", namespaces.gpx);
  if (defined(boundsNode)) {
    const bounds = {
      minLat: queryNumericValue(boundsNode, "minlat", namespaces.gpx),
      maxLat: queryNumericValue(boundsNode, "maxlat", namespaces.gpx),
      minLon: queryNumericValue(boundsNode, "minlon", namespaces.gpx),
      maxLon: queryNumericValue(boundsNode, "maxlon", namespaces.gpx),
    };
    if (
      defined(bounds.minLat) ||
      defined(bounds.maxLat) ||
      defined(bounds.minLon) ||
      defined(bounds.maxLon)
    ) {
      return bounds;
    }
  }
  return undefined;
}

const complexTypes = {
  wpt: processWpt,
  rte: processRte,
  trk: processTrk,
};

function processGpx(dataSource, node, entityCollection, options) {
  const complexTypeNames = Object.keys(complexTypes);
  const complexTypeNamesLength = complexTypeNames.length;

  for (let i = 0; i < complexTypeNamesLength; i++) {
    const typeName = complexTypeNames[i];
    const processComplexTypeNode = complexTypes[typeName];

    const childNodes = node.childNodes;
    const length = childNodes.length;
    for (let q = 0; q < length; q++) {
      const child = childNodes[q];
      if (
        child.localName === typeName &&
        namespaces.gpx.indexOf(child.namespaceURI) !== -1
      ) {
        processComplexTypeNode(dataSource, child, entityCollection, options);
      }
    }
  }
}

function loadGpx(dataSource, gpx, options) {
  const entityCollection = dataSource._entityCollection;

  entityCollection.removeAll();

  const element = gpx.documentElement;
  const version = queryStringAttribute(element, "version");
  const creator = queryStringAttribute(element, "creator");

  let name;
  const metadata = processMetadata(element);
  if (defined(metadata)) {
    name = metadata.name;
  }

  if (element.localName === "gpx") {
    processGpx(dataSource, element, entityCollection, options);
  } else {
    console.log("GPX - Unsupported node: " + element.localName);
  }

  let clock;
  const availability = entityCollection.computeAvailability();

  let start = availability.start;
  let stop = availability.stop;
  const isMinStart = JulianDate.equals(start, Iso8601.MINIMUM_VALUE);
  const isMaxStop = JulianDate.equals(stop, Iso8601.MAXIMUM_VALUE);
  if (!isMinStart || !isMaxStop) {
    let date;

    // If start is min time just start at midnight this morning, local time
    if (isMinStart) {
      date = new Date();
      date.setHours(0, 0, 0, 0);
      start = JulianDate.fromDate(date);
    }

    // If stop is max value just stop at midnight tonight, local time
    if (isMaxStop) {
      date = new Date();
      date.setHours(24, 0, 0, 0);
      stop = JulianDate.fromDate(date);
    }

    clock = new DataSourceClock();
    clock.startTime = start;
    clock.stopTime = stop;
    clock.currentTime = JulianDate.clone(start);
    clock.clockRange = ClockRange.LOOP_STOP;
    clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    clock.multiplier = Math.round(
      Math.min(
        Math.max(JulianDate.secondsDifference(stop, start) / 60, 1),
        3.15569e7
      )
    );
  }
  let changed = false;
  if (dataSource._name !== name) {
    dataSource._name = name;
    changed = true;
  }

  if (dataSource._creator !== creator) {
    dataSource._creator = creator;
    changed = true;
  }

  if (metadataChanged(dataSource._metadata, metadata)) {
    dataSource._metadata = metadata;
    changed = true;
  }

  if (dataSource._version !== version) {
    dataSource._version = version;
    changed = true;
  }

  if (clock !== dataSource._clock) {
    changed = true;
    dataSource._clock = clock;
  }

  if (changed) {
    dataSource._changed.raiseEvent(dataSource);
  }

  DataSource.setLoading(dataSource, false);
  return dataSource;
}

function metadataChanged(old, current) {
  if (!defined(old) && !defined(current)) {
    return false;
  } else if (defined(old) && defined(current)) {
    if (
      old.name !== current.name ||
      old.dec !== current.desc ||
      old.src !== current.src ||
      old.author !== current.author ||
      old.copyright !== current.copyright ||
      old.link !== current.link ||
      old.time !== current.time ||
      old.bounds !== current.bounds
    ) {
      return true;
    }
    return false;
  }
  return true;
}

function load(dataSource, entityCollection, data, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  let promise = data;
  if (typeof data === "string" || data instanceof Resource) {
    data = Resource.createIfNeeded(data);
    promise = data.fetchBlob();

    // Add resource credits to our list of credits to display
    const resourceCredits = dataSource._resourceCredits;
    const credits = data.credits;
    if (defined(credits)) {
      const length = credits.length;
      for (let i = 0; i < length; i++) {
        resourceCredits.push(credits[i]);
      }
    }
  }

  return when(promise)
    .then(function (dataToLoad) {
      if (dataToLoad instanceof Blob) {
        return readBlobAsText(dataToLoad).then(function (text) {
          // There's no official way to validate if a parse was successful.
          // The following check detects the error on various browsers.
          // IE raises an exception
          let gpx;
          let error;
          try {
            gpx = parser.parseFromString(text, "application/xml");
          } catch (e) {
            error = e.toString();
          }

          // The parse succeeds on Chrome and Firefox, but the error
          // handling is different in each.
          if (
            defined(error) ||
            gpx.body ||
            gpx.documentElement.tagName === "parsererror"
          ) {
            // Firefox has error information as the firstChild nodeValue.
            let msg = defined(error)
              ? error
              : gpx.documentElement.firstChild.nodeValue;

            // Chrome has it in the body text.
            if (!msg) {
              msg = gpx.body.innerText;
            }

            // Return the error
            throw new RuntimeError(msg);
          }
          return loadGpx(dataSource, gpx, options);
        });
      }
      return loadGpx(dataSource, dataToLoad, options);
    })
    .otherwise(function (error) {
      dataSource._error.raiseEvent(dataSource, error);
      console.log(error);
      return when.reject(error);
    });
}

/**
 * A {@link DataSource} which processes the GPS Exchange Format (GPX).
 *
 * @alias GpxDataSource
 * @constructor
 *
 * @see {@link http://www.topografix.com/gpx.asp|Topografix GPX Standard}
 * @see {@link http://www.topografix.com/gpx/1/1/|Topografix GPX Documentation}
 *
 * @demo {@link http://sandcastle.cesium.com/index.html?src=GPX.html}
 *
 * @example
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.dataSources.add(Cesium.GpxDataSource.load('../../SampleData/track.gpx'));
 */
function GpxDataSource() {
  this._changed = new Event();
  this._error = new Event();
  this._loading = new Event();
  this._clock = undefined;
  this._entityCollection = new EntityCollection();
  this._entityCluster = new EntityCluster();
  this._name = undefined;
  this._version = undefined;
  this._creator = undefined;
  this._metadata = undefined;
  this._isLoading = false;
  this._pinBuilder = new PinBuilder();
}

/**
 * Creates a Promise to a new instance loaded with the provided GPX data.
 *
 * @param {String|Document|Blob} data A url, parsed GPX document, or Blob containing binary GPX data.
 * @param {Object} [options] An object with the following properties:
 * @param {Boolean} [options.clampToGround] True if the symbols should be rendered at the same height as the terrain
 * @param {String} [options.wptImage] Image to use for waypoint billboards.
 * @param {String} [options.trkImage] Image to use for track billboards.
 * @param {String} [options.trkColor] Color to use for track lines.
 * @returns {Promise.<GpxDataSource>} A promise that will resolve to a new GpxDataSource instance once the gpx is loaded.
 */
GpxDataSource.load = function (data, options) {
  return new GpxDataSource().load(data, options);
};

Object.defineProperties(GpxDataSource.prototype, {
  /**
   * Gets a human-readable name for this instance.
   * This will be automatically be set to the GPX document name on load.
   * @memberof GpxDataSource.prototype
   * @type {String}
   */
  name: {
    get: function () {
      return this._name;
    },
  },
  /**
   * Gets the version of the GPX Schema in use.
   * @memberof GpxDataSource.prototype
   * @type {String}
   */
  version: {
    get: function () {
      return this._version;
    },
  },
  /**
   * Gets the creator of the GPX document.
   * @memberof GpxDataSource.prototype
   * @type {String}
   */
  creator: {
    get: function () {
      return this._creator;
    },
  },
  /**
   * Gets an object containing metadata about the GPX file.
   * @memberof GpxDataSource.prototype
   * @type {Object}
   */
  metadata: {
    get: function () {
      return this._metadata;
    },
  },
  /**
   * Gets the clock settings defined by the loaded GPX. This represents the total
   * availability interval for all time-dynamic data. If the GPX does not contain
   * time-dynamic data, this value is undefined.
   * @memberof GpxDataSource.prototype
   * @type {DataSourceClock}
   */
  clock: {
    get: function () {
      return this._clock;
    },
  },
  /**
   * Gets the collection of {@link Entity} instances.
   * @memberof GpxDataSource.prototype
   * @type {EntityCollection}
   */
  entities: {
    get: function () {
      return this._entityCollection;
    },
  },
  /**
   * Gets a value indicating if the data source is currently loading data.
   * @memberof GpxDataSource.prototype
   * @type {Boolean}
   */
  isLoading: {
    get: function () {
      return this._isLoading;
    },
  },
  /**
   * Gets an event that will be raised when the underlying data changes.
   * @memberof GpxDataSource.prototype
   * @type {Event}
   */
  changedEvent: {
    get: function () {
      return this._changed;
    },
  },
  /**
   * Gets an event that will be raised if an error is encountered during processing.
   * @memberof GpxDataSource.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._error;
    },
  },
  /**
   * Gets an event that will be raised when the data source either starts or stops loading.
   * @memberof GpxDataSource.prototype
   * @type {Event}
   */
  loadingEvent: {
    get: function () {
      return this._loading;
    },
  },
  /**
   * Gets whether or not this data source should be displayed.
   * @memberof GpxDataSource.prototype
   * @type {Boolean}
   */
  show: {
    get: function () {
      return this._entityCollection.show;
    },
    set: function (value) {
      this._entityCollection.show = value;
    },
  },

  /**
   * Gets or sets the clustering options for this data source. This object can be shared between multiple data sources.
   *
   * @memberof GpxDataSource.prototype
   * @type {EntityCluster}
   */
  clustering: {
    get: function () {
      return this._entityCluster;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value must be defined.");
      }
      //>>includeEnd('debug');
      this._entityCluster = value;
    },
  },
});

/**
 * Updates the data source to the provided time.  This function is optional and
 * is not required to be implemented.  It is provided for data sources which
 * retrieve data based on the current animation time or scene state.
 * If implemented, update will be called by {@link DataSourceDisplay} once a frame.
 *
 * @param {JulianDate} time The simulation time.
 * @returns {Boolean} True if this data source is ready to be displayed at the provided time, false otherwise.
 */
GpxDataSource.prototype.update = function (time) {
  return true;
};

/**
 * Asynchronously loads the provided GPX data, replacing any existing data.
 *
 * @param {String|Document|Blob} data A url, parsed GPX document, or Blob containing binary GPX data or a parsed GPX document.
 * @param {Object} [options] An object with the following properties:
 * @param {Boolean} [options.clampToGround] True if the symbols should be rendered at the same height as the terrain
 * @param {String} [options.wptImage] Image to use for waypoint billboards.
 * @param {String} [options.trkImage] Image to use for track billboards.
 * @param {String} [options.trkColor] Color to use for track lines.
 * @returns {Promise.<GpxDataSource>} A promise that will resolve to this instances once the GPX is loaded.
 */
GpxDataSource.prototype.load = function (data, options) {
  if (!defined(data)) {
    throw new DeveloperError("data is required.");
  }

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  DataSource.setLoading(this, true);
  const oldName = this._name;
  const that = this;
  return load(this, this._entityCollection, data, options)
    .then(function () {
      let clock;

      const availability = that._entityCollection.computeAvailability();

      let start = availability.start;
      let stop = availability.stop;
      const isMinStart = JulianDate.equals(start, Iso8601.MINIMUM_VALUE);
      const isMaxStop = JulianDate.equals(stop, Iso8601.MAXIMUM_VALUE);
      if (!isMinStart || !isMaxStop) {
        let date;

        // If start is min time just start at midnight this morning, local time
        if (isMinStart) {
          date = new Date();
          date.setHours(0, 0, 0, 0);
          start = JulianDate.fromDate(date);
        }

        // If stop is max value just stop at midnight tonight, local time
        if (isMaxStop) {
          date = new Date();
          date.setHours(24, 0, 0, 0);
          stop = JulianDate.fromDate(date);
        }

        clock = new DataSourceClock();
        clock.startTime = start;
        clock.stopTime = stop;
        clock.currentTime = JulianDate.clone(start);
        clock.clockRange = ClockRange.LOOP_STOP;
        clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        clock.multiplier = Math.round(
          Math.min(
            Math.max(JulianDate.secondsDifference(stop, start) / 60, 1),
            3.15569e7
          )
        );
      }

      let changed = false;
      if (clock !== that._clock) {
        that._clock = clock;
        changed = true;
      }

      if (oldName !== that._name) {
        changed = true;
      }

      if (changed) {
        that._changed.raiseEvent(that);
      }

      DataSource.setLoading(that, false);

      return that;
    })
    .otherwise(function (error) {
      DataSource.setLoading(that, false);
      that._error.raiseEvent(that, error);
      console.log(error);
      return when.reject(error);
    });
};

export default GpxDataSource;
