import ArcType from "../Core/ArcType.js";
import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import ClockRange from "../Core/ClockRange.js";
import ClockStep from "../Core/ClockStep.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import getExtensionFromUri from "../Core/getExtensionFromUri.js";
import getFilenameFromUri from "../Core/getFilenameFromUri.js";
import getTimestamp from "../Core/getTimestamp.js";
import HeadingPitchRange from "../Core/HeadingPitchRange.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import Iso8601 from "../Core/Iso8601.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import objectToQuery from "../Core/objectToQuery.js";
import oneTimeWarning from "../Core/oneTimeWarning.js";
import PinBuilder from "../Core/PinBuilder.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";
import queryToObject from "../Core/queryToObject.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import TimeInterval from "../Core/TimeInterval.js";
import TimeIntervalCollection from "../Core/TimeIntervalCollection.js";
import HeightReference from "../Scene/HeightReference.js";
import HorizontalOrigin from "../Scene/HorizontalOrigin.js";
import LabelStyle from "../Scene/LabelStyle.js";
import SceneMode from "../Scene/SceneMode.js";
import Autolinker from "../ThirdPartyNpm/Autolinker.js";
import Uri from "../ThirdParty/Uri.js";
import when from "../ThirdPartyNpm/when.js";
import zip from "../ThirdPartyNpm/zip.js";
import BillboardGraphics from "./BillboardGraphics.js";
import CompositePositionProperty from "./CompositePositionProperty.js";
import DataSource from "./DataSource.js";
import DataSourceClock from "./DataSourceClock.js";
import Entity from "./Entity.js";
import EntityCluster from "./EntityCluster.js";
import EntityCollection from "./EntityCollection.js";
import KmlCamera from "./KmlCamera.js";
import KmlLookAt from "./KmlLookAt.js";
import KmlTour from "./KmlTour.js";
import KmlTourFlyTo from "./KmlTourFlyTo.js";
import KmlTourWait from "./KmlTourWait.js";
import LabelGraphics from "./LabelGraphics.js";
import PathGraphics from "./PathGraphics.js";
import PolygonGraphics from "./PolygonGraphics.js";
import PolylineGraphics from "./PolylineGraphics.js";
import PositionPropertyArray from "./PositionPropertyArray.js";
import RectangleGraphics from "./RectangleGraphics.js";
import ReferenceProperty from "./ReferenceProperty.js";
import SampledPositionProperty from "./SampledPositionProperty.js";
import ScaledPositionProperty from "./ScaledPositionProperty.js";
import TimeIntervalCollectionProperty from "./TimeIntervalCollectionProperty.js";
import WallGraphics from "./WallGraphics.js";

//This is by no means an exhaustive list of MIME types.
//The purpose of this list is to be able to accurately identify content embedded
//in KMZ files. Eventually, we can make this configurable by the end user so they can add
//there own content types if they have KMZ files that require it.
var MimeTypes = {
  avi: "video/x-msvideo",
  bmp: "image/bmp",
  bz2: "application/x-bzip2",
  chm: "application/vnd.ms-htmlhelp",
  css: "text/css",
  csv: "text/csv",
  doc: "application/msword",
  dvi: "application/x-dvi",
  eps: "application/postscript",
  flv: "video/x-flv",
  gif: "image/gif",
  gz: "application/x-gzip",
  htm: "text/html",
  html: "text/html",
  ico: "image/vnd.microsoft.icon",
  jnlp: "application/x-java-jnlp-file",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  m3u: "audio/x-mpegurl",
  m4v: "video/mp4",
  mathml: "application/mathml+xml",
  mid: "audio/midi",
  midi: "audio/midi",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  mp4v: "video/mp4",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  ogg: "application/ogg",
  pdf: "application/pdf",
  png: "image/png",
  pps: "application/vnd.ms-powerpoint",
  ppt: "application/vnd.ms-powerpoint",
  ps: "application/postscript",
  qt: "video/quicktime",
  rdf: "application/rdf+xml",
  rss: "application/rss+xml",
  rtf: "application/rtf",
  svg: "image/svg+xml",
  swf: "application/x-shockwave-flash",
  text: "text/plain",
  tif: "image/tiff",
  tiff: "image/tiff",
  txt: "text/plain",
  wav: "audio/x-wav",
  wma: "audio/x-ms-wma",
  wmv: "video/x-ms-wmv",
  xml: "application/xml",
  zip: "application/zip",

  detectFromFilename: function (filename) {
    var ext = filename.toLowerCase();
    ext = getExtensionFromUri(ext);
    return MimeTypes[ext];
  },
};

var parser;
if (typeof DOMParser !== "undefined") {
  parser = new DOMParser();
}

var autolinker = new Autolinker({
  stripPrefix: false,
  email: false,
  replaceFn: function (match) {
    if (!match.protocolUrlMatch) {
      //Prevent matching of non-explicit urls.
      //i.e. foo.id won't match but http://foo.id will
      return false;
    }
  },
});

var BILLBOARD_SIZE = 32;

var BILLBOARD_NEAR_DISTANCE = 2414016;
var BILLBOARD_NEAR_RATIO = 1.0;
var BILLBOARD_FAR_DISTANCE = 1.6093e7;
var BILLBOARD_FAR_RATIO = 0.1;

var kmlNamespaces = [
  null,
  undefined,
  "http://www.opengis.net/kml/2.2",
  "http://earth.google.com/kml/2.2",
  "http://earth.google.com/kml/2.1",
  "http://earth.google.com/kml/2.0",
];
var gxNamespaces = ["http://www.google.com/kml/ext/2.2"];
var atomNamespaces = ["http://www.w3.org/2005/Atom"];
var namespaces = {
  kml: kmlNamespaces,
  gx: gxNamespaces,
  atom: atomNamespaces,
  kmlgx: kmlNamespaces.concat(gxNamespaces),
};

// Ensure Specs/Data/KML/unsupported.kml is kept up to date with these supported types
var featureTypes = {
  Document: processDocument,
  Folder: processFolder,
  Placemark: processPlacemark,
  NetworkLink: processNetworkLink,
  GroundOverlay: processGroundOverlay,
  PhotoOverlay: processUnsupportedFeature,
  ScreenOverlay: processUnsupportedFeature,
  Tour: processTour,
};

function DeferredLoading(dataSource) {
  this._dataSource = dataSource;
  this._deferred = when.defer();
  this._stack = [];
  this._promises = [];
  this._timeoutSet = false;
  this._used = false;

  this._started = 0;
  this._timeThreshold = 1000; // Initial load is 1 second
}

Object.defineProperties(DeferredLoading.prototype, {
  dataSource: {
    get: function () {
      return this._dataSource;
    },
  },
});

DeferredLoading.prototype.addNodes = function (nodes, processingData) {
  this._stack.push({
    nodes: nodes,
    index: 0,
    processingData: processingData,
  });
  this._used = true;
};

DeferredLoading.prototype.addPromise = function (promise) {
  this._promises.push(promise);
};

DeferredLoading.prototype.wait = function () {
  // Case where we had a non-document/folder as the root
  var deferred = this._deferred;
  if (!this._used) {
    deferred.resolve();
  }

  return when.join(deferred.promise, when.all(this._promises));
};

DeferredLoading.prototype.process = function () {
  var isFirstCall = this._stack.length === 1;
  if (isFirstCall) {
    this._started = KmlDataSource._getTimestamp();
  }

  return this._process(isFirstCall);
};

DeferredLoading.prototype._giveUpTime = function () {
  if (this._timeoutSet) {
    // Timeout was already set so just return
    return;
  }

  this._timeoutSet = true;
  this._timeThreshold = 50; // After the first load lower threshold to 0.5 seconds
  var that = this;
  setTimeout(function () {
    that._timeoutSet = false;
    that._started = KmlDataSource._getTimestamp();
    that._process(true);
  }, 0);
};

DeferredLoading.prototype._nextNode = function () {
  var stack = this._stack;
  var top = stack[stack.length - 1];
  var index = top.index;
  var nodes = top.nodes;
  if (index === nodes.length) {
    return;
  }
  ++top.index;

  return nodes[index];
};

DeferredLoading.prototype._pop = function () {
  var stack = this._stack;
  stack.pop();

  // Return false if we are done
  if (stack.length === 0) {
    this._deferred.resolve();
    return false;
  }

  return true;
};

DeferredLoading.prototype._process = function (isFirstCall) {
  var dataSource = this.dataSource;
  var processingData = this._stack[this._stack.length - 1].processingData;

  var child = this._nextNode();
  while (defined(child)) {
    var featureProcessor = featureTypes[child.localName];
    if (
      defined(featureProcessor) &&
      (namespaces.kml.indexOf(child.namespaceURI) !== -1 ||
        namespaces.gx.indexOf(child.namespaceURI) !== -1)
    ) {
      featureProcessor(dataSource, child, processingData, this);

      // Give up time and continue loading later
      if (
        this._timeoutSet ||
        KmlDataSource._getTimestamp() > this._started + this._timeThreshold
      ) {
        this._giveUpTime();
        return;
      }
    }

    child = this._nextNode();
  }

  // If we are a recursive call from a subfolder, just return so the parent folder can continue processing
  // If we aren't then make another call to processNodes because there is stuff still left in the queue
  if (this._pop() && isFirstCall) {
    this._process(true);
  }
};

function isZipFile(blob) {
  var magicBlob = blob.slice(0, Math.min(4, blob.size));
  var deferred = when.defer();
  var reader = new FileReader();
  reader.addEventListener("load", function () {
    deferred.resolve(
      new DataView(reader.result).getUint32(0, false) === 0x504b0304
    );
  });
  reader.addEventListener("error", function () {
    deferred.reject(reader.error);
  });
  reader.readAsArrayBuffer(magicBlob);
  return deferred.promise;
}

function readBlobAsText(blob) {
  var deferred = when.defer();
  var reader = new FileReader();
  reader.addEventListener("load", function () {
    deferred.resolve(reader.result);
  });
  reader.addEventListener("error", function () {
    deferred.reject(reader.error);
  });
  reader.readAsText(blob);
  return deferred.promise;
}

function insertNamespaces(text) {
  var namespaceMap = {
    xsi: "http://www.w3.org/2001/XMLSchema-instance",
  };
  var firstPart, lastPart, reg, declaration;

  for (var key in namespaceMap) {
    if (namespaceMap.hasOwnProperty(key)) {
      reg = RegExp("[< ]" + key + ":");
      declaration = "xmlns:" + key + "=";
      if (reg.test(text) && text.indexOf(declaration) === -1) {
        if (!defined(firstPart)) {
          firstPart = text.substr(0, text.indexOf("<kml") + 4);
          lastPart = text.substr(firstPart.length);
        }
        firstPart += " " + declaration + '"' + namespaceMap[key] + '"';
      }
    }
  }

  if (defined(firstPart)) {
    text = firstPart + lastPart;
  }

  return text;
}

function removeDuplicateNamespaces(text) {
  var index = text.indexOf("xmlns:");
  var endDeclaration = text.indexOf(">", index);
  var namespace, startIndex, endIndex;

  while (index !== -1 && index < endDeclaration) {
    namespace = text.slice(index, text.indexOf('"', index));
    startIndex = index;
    index = text.indexOf(namespace, index + 1);
    if (index !== -1) {
      endIndex = text.indexOf('"', text.indexOf('"', index) + 1);
      text = text.slice(0, index - 1) + text.slice(endIndex + 1, text.length);
      index = text.indexOf("xmlns:", startIndex - 1);
    } else {
      index = text.indexOf("xmlns:", startIndex + 1);
    }
  }

  return text;
}

function loadXmlFromZip(entry, uriResolver, deferred) {
  entry.getData(new zip.TextWriter(), function (text) {
    text = insertNamespaces(text);
    text = removeDuplicateNamespaces(text);
    uriResolver.kml = parser.parseFromString(text, "application/xml");
    deferred.resolve();
  });
}

function loadDataUriFromZip(entry, uriResolver, deferred) {
  var mimeType = defaultValue(
    MimeTypes.detectFromFilename(entry.filename),
    "application/octet-stream"
  );
  entry.getData(new zip.Data64URIWriter(mimeType), function (dataUri) {
    uriResolver[entry.filename] = dataUri;
    deferred.resolve();
  });
}

function embedDataUris(div, elementType, attributeName, uriResolver) {
  var keys = uriResolver.keys;
  var baseUri = new Uri(".");
  var elements = div.querySelectorAll(elementType);
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var value = element.getAttribute(attributeName);
    var uri = new Uri(value).resolve(baseUri).toString();
    var index = keys.indexOf(uri);
    if (index !== -1) {
      var key = keys[index];
      element.setAttribute(attributeName, uriResolver[key]);
      if (elementType === "a" && element.getAttribute("download") === null) {
        element.setAttribute("download", key);
      }
    }
  }
}

function applyBasePath(div, elementType, attributeName, sourceResource) {
  var elements = div.querySelectorAll(elementType);
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var value = element.getAttribute(attributeName);
    var resource = resolveHref(value, sourceResource);
    element.setAttribute(attributeName, resource.url);
  }
}

// an optional context is passed to allow for some malformed kmls (those with multiple geometries with same ids) to still parse
// correctly, as they do in Google Earth.
function createEntity(node, entityCollection, context) {
  var id = queryStringAttribute(node, "id");
  id = defined(id) && id.length !== 0 ? id : createGuid();
  if (defined(context)) {
    id = context + id;
  }

  // If we have a duplicate ID just generate one.
  // This isn't valid KML but Google Earth handles this case.
  var entity = entityCollection.getById(id);
  if (defined(entity)) {
    id = createGuid();
    if (defined(context)) {
      id = context + id;
    }
  }

  entity = entityCollection.add(new Entity({ id: id }));
  if (!defined(entity.kml)) {
    entity.addProperty("kml");
    entity.kml = new KmlFeatureData();
  }
  return entity;
}

function isExtrudable(altitudeMode, gxAltitudeMode) {
  return (
    altitudeMode === "absolute" ||
    altitudeMode === "relativeToGround" ||
    gxAltitudeMode === "relativeToSeaFloor"
  );
}

function readCoordinate(value, ellipsoid) {
  //Google Earth treats empty or missing coordinates as 0.
  if (!defined(value)) {
    return Cartesian3.fromDegrees(0, 0, 0, ellipsoid);
  }

  var digits = value.match(/[^\s,\n]+/g);
  if (!defined(digits)) {
    return Cartesian3.fromDegrees(0, 0, 0, ellipsoid);
  }

  var longitude = parseFloat(digits[0]);
  var latitude = parseFloat(digits[1]);
  var height = parseFloat(digits[2]);

  longitude = isNaN(longitude) ? 0.0 : longitude;
  latitude = isNaN(latitude) ? 0.0 : latitude;
  height = isNaN(height) ? 0.0 : height;

  return Cartesian3.fromDegrees(longitude, latitude, height, ellipsoid);
}

function readCoordinates(element, ellipsoid) {
  if (!defined(element)) {
    return undefined;
  }

  var tuples = element.textContent.match(/[^\s\n]+/g);
  if (!defined(tuples)) {
    return undefined;
  }

  var length = tuples.length;
  var result = new Array(length);
  var resultIndex = 0;
  for (var i = 0; i < length; i++) {
    result[resultIndex++] = readCoordinate(tuples[i], ellipsoid);
  }
  return result;
}

function queryNumericAttribute(node, attributeName) {
  if (!defined(node)) {
    return undefined;
  }

  var value = node.getAttribute(attributeName);
  if (value !== null) {
    var result = parseFloat(value);
    return !isNaN(result) ? result : undefined;
  }
  return undefined;
}

function queryStringAttribute(node, attributeName) {
  if (!defined(node)) {
    return undefined;
  }
  var value = node.getAttribute(attributeName);
  return value !== null ? value : undefined;
}

function queryFirstNode(node, tagName, namespace) {
  if (!defined(node)) {
    return undefined;
  }
  var childNodes = node.childNodes;
  var length = childNodes.length;
  for (var q = 0; q < length; q++) {
    var child = childNodes[q];
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
  var result = [];
  var childNodes = node.getElementsByTagNameNS("*", tagName);
  var length = childNodes.length;
  for (var q = 0; q < length; q++) {
    var child = childNodes[q];
    if (
      child.localName === tagName &&
      namespace.indexOf(child.namespaceURI) !== -1
    ) {
      result.push(child);
    }
  }
  return result;
}

function queryChildNodes(node, tagName, namespace) {
  if (!defined(node)) {
    return [];
  }
  var result = [];
  var childNodes = node.childNodes;
  var length = childNodes.length;
  for (var q = 0; q < length; q++) {
    var child = childNodes[q];
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
  var resultNode = queryFirstNode(node, tagName, namespace);
  if (defined(resultNode)) {
    var result = parseFloat(resultNode.textContent);
    return !isNaN(result) ? result : undefined;
  }
  return undefined;
}

function queryStringValue(node, tagName, namespace) {
  var result = queryFirstNode(node, tagName, namespace);
  if (defined(result)) {
    return result.textContent.trim();
  }
  return undefined;
}

function queryBooleanValue(node, tagName, namespace) {
  var result = queryFirstNode(node, tagName, namespace);
  if (defined(result)) {
    var value = result.textContent.trim();
    return value === "1" || /^true$/i.test(value);
  }
  return undefined;
}

function resolveHref(href, sourceResource, uriResolver) {
  if (!defined(href)) {
    return undefined;
  }

  var resource;
  if (defined(uriResolver)) {
    // To resolve issues with KML sources defined in Windows style paths.
    href = href.replace(/\\/g, "/");
    var blob = uriResolver[href];
    if (defined(blob)) {
      resource = new Resource({
        url: blob,
      });
    } else {
      // Needed for multiple levels of KML files in a KMZ
      var baseUri = new Uri(sourceResource.getUrlComponent());
      var uri = new Uri(href);
      blob = uriResolver[uri.resolve(baseUri)];
      if (defined(blob)) {
        resource = new Resource({
          url: blob,
        });
      }
    }
  }

  if (!defined(resource)) {
    resource = sourceResource.getDerivedResource({
      url: href,
    });
  }

  return resource;
}

var colorOptions = {
  maximumRed: undefined,
  red: undefined,
  maximumGreen: undefined,
  green: undefined,
  maximumBlue: undefined,
  blue: undefined,
};

function parseColorString(value, isRandom) {
  if (!defined(value) || /^\s*$/gm.test(value)) {
    return undefined;
  }

  if (value[0] === "#") {
    value = value.substring(1);
  }

  var alpha = parseInt(value.substring(0, 2), 16) / 255.0;
  var blue = parseInt(value.substring(2, 4), 16) / 255.0;
  var green = parseInt(value.substring(4, 6), 16) / 255.0;
  var red = parseInt(value.substring(6, 8), 16) / 255.0;

  if (!isRandom) {
    return new Color(red, green, blue, alpha);
  }

  if (red > 0) {
    colorOptions.maximumRed = red;
    colorOptions.red = undefined;
  } else {
    colorOptions.maximumRed = undefined;
    colorOptions.red = 0;
  }
  if (green > 0) {
    colorOptions.maximumGreen = green;
    colorOptions.green = undefined;
  } else {
    colorOptions.maximumGreen = undefined;
    colorOptions.green = 0;
  }
  if (blue > 0) {
    colorOptions.maximumBlue = blue;
    colorOptions.blue = undefined;
  } else {
    colorOptions.maximumBlue = undefined;
    colorOptions.blue = 0;
  }
  colorOptions.alpha = alpha;
  return Color.fromRandom(colorOptions);
}

function queryColorValue(node, tagName, namespace) {
  var value = queryStringValue(node, tagName, namespace);
  if (!defined(value)) {
    return undefined;
  }
  return parseColorString(
    value,
    queryStringValue(node, "colorMode", namespace) === "random"
  );
}

function processTimeStamp(featureNode) {
  var node = queryFirstNode(featureNode, "TimeStamp", namespaces.kmlgx);
  var whenString = queryStringValue(node, "when", namespaces.kmlgx);

  if (!defined(node) || !defined(whenString) || whenString.length === 0) {
    return undefined;
  }

  //According to the KML spec, a TimeStamp represents a "single moment in time"
  //However, since Cesium animates much differently than Google Earth, that doesn't
  //Make much sense here.  Instead, we use the TimeStamp as the moment the feature
  //comes into existence.  This works much better and gives a similar feel to
  //GE's experience.
  var when = JulianDate.fromIso8601(whenString);
  var result = new TimeIntervalCollection();
  result.addInterval(
    new TimeInterval({
      start: when,
      stop: Iso8601.MAXIMUM_VALUE,
    })
  );
  return result;
}

function processTimeSpan(featureNode) {
  var node = queryFirstNode(featureNode, "TimeSpan", namespaces.kmlgx);
  if (!defined(node)) {
    return undefined;
  }
  var result;

  var beginNode = queryFirstNode(node, "begin", namespaces.kmlgx);
  var beginDate = defined(beginNode)
    ? JulianDate.fromIso8601(beginNode.textContent)
    : undefined;

  var endNode = queryFirstNode(node, "end", namespaces.kmlgx);
  var endDate = defined(endNode)
    ? JulianDate.fromIso8601(endNode.textContent)
    : undefined;

  if (defined(beginDate) && defined(endDate)) {
    if (JulianDate.lessThan(endDate, beginDate)) {
      var tmp = beginDate;
      beginDate = endDate;
      endDate = tmp;
    }
    result = new TimeIntervalCollection();
    result.addInterval(
      new TimeInterval({
        start: beginDate,
        stop: endDate,
      })
    );
  } else if (defined(beginDate)) {
    result = new TimeIntervalCollection();
    result.addInterval(
      new TimeInterval({
        start: beginDate,
        stop: Iso8601.MAXIMUM_VALUE,
      })
    );
  } else if (defined(endDate)) {
    result = new TimeIntervalCollection();
    result.addInterval(
      new TimeInterval({
        start: Iso8601.MINIMUM_VALUE,
        stop: endDate,
      })
    );
  }

  return result;
}

function createDefaultBillboard() {
  var billboard = new BillboardGraphics();
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
  return billboard;
}

function createDefaultPolygon() {
  var polygon = new PolygonGraphics();
  polygon.outline = true;
  polygon.outlineColor = Color.WHITE;
  return polygon;
}

function createDefaultLabel() {
  var label = new LabelGraphics();
  label.translucencyByDistance = new NearFarScalar(3000000, 1.0, 5000000, 0.0);
  label.pixelOffset = new Cartesian2(17, 0);
  label.horizontalOrigin = HorizontalOrigin.LEFT;
  label.font = "16px sans-serif";
  label.style = LabelStyle.FILL_AND_OUTLINE;
  return label;
}

function getIconHref(
  iconNode,
  dataSource,
  sourceResource,
  uriResolver,
  canRefresh
) {
  var href = queryStringValue(iconNode, "href", namespaces.kml);
  if (!defined(href) || href.length === 0) {
    return undefined;
  }

  if (href.indexOf("root://icons/palette-") === 0) {
    var palette = href.charAt(21);

    // Get the icon number
    var x = defaultValue(queryNumericValue(iconNode, "x", namespaces.gx), 0);
    var y = defaultValue(queryNumericValue(iconNode, "y", namespaces.gx), 0);
    x = Math.min(x / 32, 7);
    y = 7 - Math.min(y / 32, 7);
    var iconNum = 8 * y + x;

    href =
      "https://maps.google.com/mapfiles/kml/pal" +
      palette +
      "/icon" +
      iconNum +
      ".png";
  }

  var hrefResource = resolveHref(href, sourceResource, uriResolver);

  if (canRefresh) {
    var refreshMode = queryStringValue(iconNode, "refreshMode", namespaces.kml);
    var viewRefreshMode = queryStringValue(
      iconNode,
      "viewRefreshMode",
      namespaces.kml
    );
    if (refreshMode === "onInterval" || refreshMode === "onExpire") {
      oneTimeWarning(
        "kml-refreshMode-" + refreshMode,
        "KML - Unsupported Icon refreshMode: " + refreshMode
      );
    } else if (viewRefreshMode === "onStop" || viewRefreshMode === "onRegion") {
      oneTimeWarning(
        "kml-refreshMode-" + viewRefreshMode,
        "KML - Unsupported Icon viewRefreshMode: " + viewRefreshMode
      );
    }

    var viewBoundScale = defaultValue(
      queryStringValue(iconNode, "viewBoundScale", namespaces.kml),
      1.0
    );
    var defaultViewFormat =
      viewRefreshMode === "onStop"
        ? "BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth]"
        : "";
    var viewFormat = defaultValue(
      queryStringValue(iconNode, "viewFormat", namespaces.kml),
      defaultViewFormat
    );
    var httpQuery = queryStringValue(iconNode, "httpQuery", namespaces.kml);
    if (defined(viewFormat)) {
      hrefResource.setQueryParameters(queryToObject(cleanupString(viewFormat)));
    }
    if (defined(httpQuery)) {
      hrefResource.setQueryParameters(queryToObject(cleanupString(httpQuery)));
    }

    var ellipsoid = dataSource._ellipsoid;
    processNetworkLinkQueryString(
      hrefResource,
      dataSource._camera,
      dataSource._canvas,
      viewBoundScale,
      dataSource._lastCameraView.bbox,
      ellipsoid
    );

    return hrefResource;
  }

  return hrefResource;
}

function processBillboardIcon(
  dataSource,
  node,
  targetEntity,
  sourceResource,
  uriResolver
) {
  var scale = queryNumericValue(node, "scale", namespaces.kml);
  var heading = queryNumericValue(node, "heading", namespaces.kml);
  var color = queryColorValue(node, "color", namespaces.kml);

  var iconNode = queryFirstNode(node, "Icon", namespaces.kml);
  var icon = getIconHref(
    iconNode,
    dataSource,
    sourceResource,
    uriResolver,
    false
  );

  // If icon tags are present but blank, we do not want to show an icon
  if (defined(iconNode) && !defined(icon)) {
    icon = false;
  }

  var x = queryNumericValue(iconNode, "x", namespaces.gx);
  var y = queryNumericValue(iconNode, "y", namespaces.gx);
  var w = queryNumericValue(iconNode, "w", namespaces.gx);
  var h = queryNumericValue(iconNode, "h", namespaces.gx);

  var hotSpotNode = queryFirstNode(node, "hotSpot", namespaces.kml);
  var hotSpotX = queryNumericAttribute(hotSpotNode, "x");
  var hotSpotY = queryNumericAttribute(hotSpotNode, "y");
  var hotSpotXUnit = queryStringAttribute(hotSpotNode, "xunits");
  var hotSpotYUnit = queryStringAttribute(hotSpotNode, "yunits");

  var billboard = targetEntity.billboard;
  if (!defined(billboard)) {
    billboard = createDefaultBillboard();
    targetEntity.billboard = billboard;
  }

  billboard.image = icon;
  billboard.scale = scale;
  billboard.color = color;

  if (defined(x) || defined(y) || defined(w) || defined(h)) {
    billboard.imageSubRegion = new BoundingRectangle(x, y, w, h);
  }

  //GE treats a heading of zero as no heading
  //You can still point north using a 360 degree angle (or any multiple of 360)
  if (defined(heading) && heading !== 0) {
    billboard.rotation = CesiumMath.toRadians(-heading);
    billboard.alignedAxis = Cartesian3.UNIT_Z;
  }

  //Hotpot is the KML equivalent of pixel offset
  //The hotspot origin is the lower left, but we leave
  //our billboard origin at the center and simply
  //modify the pixel offset to take this into account
  scale = defaultValue(scale, 1.0);

  var xOffset;
  var yOffset;
  if (defined(hotSpotX)) {
    if (hotSpotXUnit === "pixels") {
      xOffset = -hotSpotX * scale;
    } else if (hotSpotXUnit === "insetPixels") {
      xOffset = (hotSpotX - BILLBOARD_SIZE) * scale;
    } else if (hotSpotXUnit === "fraction") {
      xOffset = -hotSpotX * BILLBOARD_SIZE * scale;
    }
    xOffset += BILLBOARD_SIZE * 0.5 * scale;
  }

  if (defined(hotSpotY)) {
    if (hotSpotYUnit === "pixels") {
      yOffset = hotSpotY * scale;
    } else if (hotSpotYUnit === "insetPixels") {
      yOffset = (-hotSpotY + BILLBOARD_SIZE) * scale;
    } else if (hotSpotYUnit === "fraction") {
      yOffset = hotSpotY * BILLBOARD_SIZE * scale;
    }

    yOffset -= BILLBOARD_SIZE * 0.5 * scale;
  }

  if (defined(xOffset) || defined(yOffset)) {
    billboard.pixelOffset = new Cartesian2(xOffset, yOffset);
  }
}

function applyStyle(
  dataSource,
  styleNode,
  targetEntity,
  sourceResource,
  uriResolver
) {
  for (var i = 0, len = styleNode.childNodes.length; i < len; i++) {
    var node = styleNode.childNodes.item(i);
    if (node.localName === "IconStyle") {
      processBillboardIcon(
        dataSource,
        node,
        targetEntity,
        sourceResource,
        uriResolver
      );
    } else if (node.localName === "LabelStyle") {
      var label = targetEntity.label;
      if (!defined(label)) {
        label = createDefaultLabel();
        targetEntity.label = label;
      }
      label.scale = defaultValue(
        queryNumericValue(node, "scale", namespaces.kml),
        label.scale
      );
      label.fillColor = defaultValue(
        queryColorValue(node, "color", namespaces.kml),
        label.fillColor
      );
      label.text = targetEntity.name;
    } else if (node.localName === "LineStyle") {
      var polyline = targetEntity.polyline;
      if (!defined(polyline)) {
        polyline = new PolylineGraphics();
        targetEntity.polyline = polyline;
      }
      polyline.width = queryNumericValue(node, "width", namespaces.kml);
      polyline.material = queryColorValue(node, "color", namespaces.kml);
      if (defined(queryColorValue(node, "outerColor", namespaces.gx))) {
        oneTimeWarning(
          "kml-gx:outerColor",
          "KML - gx:outerColor is not supported in a LineStyle"
        );
      }
      if (defined(queryNumericValue(node, "outerWidth", namespaces.gx))) {
        oneTimeWarning(
          "kml-gx:outerWidth",
          "KML - gx:outerWidth is not supported in a LineStyle"
        );
      }
      if (defined(queryNumericValue(node, "physicalWidth", namespaces.gx))) {
        oneTimeWarning(
          "kml-gx:physicalWidth",
          "KML - gx:physicalWidth is not supported in a LineStyle"
        );
      }
      if (defined(queryBooleanValue(node, "labelVisibility", namespaces.gx))) {
        oneTimeWarning(
          "kml-gx:labelVisibility",
          "KML - gx:labelVisibility is not supported in a LineStyle"
        );
      }
    } else if (node.localName === "PolyStyle") {
      var polygon = targetEntity.polygon;
      if (!defined(polygon)) {
        polygon = createDefaultPolygon();
        targetEntity.polygon = polygon;
      }
      polygon.material = defaultValue(
        queryColorValue(node, "color", namespaces.kml),
        polygon.material
      );
      polygon.fill = defaultValue(
        queryBooleanValue(node, "fill", namespaces.kml),
        polygon.fill
      );
      polygon.outline = defaultValue(
        queryBooleanValue(node, "outline", namespaces.kml),
        polygon.outline
      );
    } else if (node.localName === "BalloonStyle") {
      var bgColor = defaultValue(
        parseColorString(queryStringValue(node, "bgColor", namespaces.kml)),
        Color.WHITE
      );
      var textColor = defaultValue(
        parseColorString(queryStringValue(node, "textColor", namespaces.kml)),
        Color.BLACK
      );
      var text = queryStringValue(node, "text", namespaces.kml);

      //This is purely an internal property used in style processing,
      //it never ends up on the final entity.
      targetEntity.addProperty("balloonStyle");
      targetEntity.balloonStyle = {
        bgColor: bgColor,
        textColor: textColor,
        text: text,
      };
    } else if (node.localName === "ListStyle") {
      var listItemType = queryStringValue(node, "listItemType", namespaces.kml);
      if (listItemType === "radioFolder" || listItemType === "checkOffOnly") {
        oneTimeWarning(
          "kml-listStyle-" + listItemType,
          "KML - Unsupported ListStyle with listItemType: " + listItemType
        );
      }
    }
  }
}

//Processes and merges any inline styles for the provided node into the provided entity.
function computeFinalStyle(
  dataSource,
  placeMark,
  styleCollection,
  sourceResource,
  uriResolver
) {
  var result = new Entity();
  var styleEntity;

  //Google earth seems to always use the last inline Style/StyleMap only
  var styleIndex = -1;
  var childNodes = placeMark.childNodes;
  var length = childNodes.length;
  for (var q = 0; q < length; q++) {
    var child = childNodes[q];
    if (child.localName === "Style" || child.localName === "StyleMap") {
      styleIndex = q;
    }
  }

  if (styleIndex !== -1) {
    var inlineStyleNode = childNodes[styleIndex];
    if (inlineStyleNode.localName === "Style") {
      applyStyle(
        dataSource,
        inlineStyleNode,
        result,
        sourceResource,
        uriResolver
      );
    } else {
      // StyleMap
      var pairs = queryChildNodes(inlineStyleNode, "Pair", namespaces.kml);
      for (var p = 0; p < pairs.length; p++) {
        var pair = pairs[p];
        var key = queryStringValue(pair, "key", namespaces.kml);
        if (key === "normal") {
          var styleUrl = queryStringValue(pair, "styleUrl", namespaces.kml);
          if (defined(styleUrl)) {
            styleEntity = styleCollection.getById(styleUrl);
            if (!defined(styleEntity)) {
              styleEntity = styleCollection.getById("#" + styleUrl);
            }
            if (defined(styleEntity)) {
              result.merge(styleEntity);
            }
          } else {
            var node = queryFirstNode(pair, "Style", namespaces.kml);
            applyStyle(dataSource, node, result, sourceResource, uriResolver);
          }
        } else {
          oneTimeWarning(
            "kml-styleMap-" + key,
            "KML - Unsupported StyleMap key: " + key
          );
        }
      }
    }
  }

  //Google earth seems to always use the first external style only.
  var externalStyle = queryStringValue(placeMark, "styleUrl", namespaces.kml);
  if (defined(externalStyle)) {
    var id = externalStyle;
    if (externalStyle[0] !== "#" && externalStyle.indexOf("#") !== -1) {
      var tokens = externalStyle.split("#");
      var uri = tokens[0];
      var resource = sourceResource.getDerivedResource({
        url: uri,
      });

      id = resource.getUrlComponent() + "#" + tokens[1];
    }

    styleEntity = styleCollection.getById(id);
    if (!defined(styleEntity)) {
      styleEntity = styleCollection.getById("#" + id);
    }
    if (defined(styleEntity)) {
      result.merge(styleEntity);
    }
  }

  return result;
}

//Asynchronously processes an external style file.
function processExternalStyles(dataSource, resource, styleCollection) {
  return resource.fetchXML().then(function (styleKml) {
    return processStyles(dataSource, styleKml, styleCollection, resource, true);
  });
}

//Processes all shared and external styles and stores
//their id into the provided styleCollection.
//Returns an array of promises that will resolve when
//each style is loaded.
function processStyles(
  dataSource,
  kml,
  styleCollection,
  sourceResource,
  isExternal,
  uriResolver
) {
  var i;
  var id;
  var styleEntity;

  var node;
  var styleNodes = queryNodes(kml, "Style", namespaces.kml);
  if (defined(styleNodes)) {
    var styleNodesLength = styleNodes.length;
    for (i = 0; i < styleNodesLength; i++) {
      node = styleNodes[i];
      id = queryStringAttribute(node, "id");
      if (defined(id)) {
        id = "#" + id;
        if (isExternal && defined(sourceResource)) {
          id = sourceResource.getUrlComponent() + id;
        }
        if (!defined(styleCollection.getById(id))) {
          styleEntity = new Entity({
            id: id,
          });
          styleCollection.add(styleEntity);
          applyStyle(
            dataSource,
            node,
            styleEntity,
            sourceResource,
            uriResolver
          );
        }
      }
    }
  }

  var styleMaps = queryNodes(kml, "StyleMap", namespaces.kml);
  if (defined(styleMaps)) {
    var styleMapsLength = styleMaps.length;
    for (i = 0; i < styleMapsLength; i++) {
      var styleMap = styleMaps[i];
      id = queryStringAttribute(styleMap, "id");
      if (defined(id)) {
        var pairs = queryChildNodes(styleMap, "Pair", namespaces.kml);
        for (var p = 0; p < pairs.length; p++) {
          var pair = pairs[p];
          var key = queryStringValue(pair, "key", namespaces.kml);
          if (key === "normal") {
            id = "#" + id;
            if (isExternal && defined(sourceResource)) {
              id = sourceResource.getUrlComponent() + id;
            }
            if (!defined(styleCollection.getById(id))) {
              styleEntity = styleCollection.getOrCreateEntity(id);

              var styleUrl = queryStringValue(pair, "styleUrl", namespaces.kml);
              if (defined(styleUrl)) {
                if (styleUrl[0] !== "#") {
                  styleUrl = "#" + styleUrl;
                }

                if (isExternal && defined(sourceResource)) {
                  styleUrl = sourceResource.getUrlComponent() + styleUrl;
                }
                var base = styleCollection.getById(styleUrl);

                if (defined(base)) {
                  styleEntity.merge(base);
                }
              } else {
                node = queryFirstNode(pair, "Style", namespaces.kml);
                applyStyle(
                  dataSource,
                  node,
                  styleEntity,
                  sourceResource,
                  uriResolver
                );
              }
            }
          } else {
            oneTimeWarning(
              "kml-styleMap-" + key,
              "KML - Unsupported StyleMap key: " + key
            );
          }
        }
      }
    }
  }

  var promises = [];
  var styleUrlNodes = kml.getElementsByTagName("styleUrl");
  var styleUrlNodesLength = styleUrlNodes.length;
  for (i = 0; i < styleUrlNodesLength; i++) {
    var styleReference = styleUrlNodes[i].textContent;
    if (styleReference[0] !== "#") {
      //According to the spec, all local styles should start with a #
      //and everything else is an external style that has a # seperating
      //the URL of the document and the style.  However, Google Earth
      //also accepts styleUrls without a # as meaning a local style.
      var tokens = styleReference.split("#");
      if (tokens.length === 2) {
        var uri = tokens[0];
        var resource = sourceResource.getDerivedResource({
          url: uri,
        });

        promises.push(
          processExternalStyles(dataSource, resource, styleCollection)
        );
      }
    }
  }

  return promises;
}

function createDropLine(entityCollection, entity, styleEntity) {
  var entityPosition = new ReferenceProperty(entityCollection, entity.id, [
    "position",
  ]);
  var surfacePosition = new ScaledPositionProperty(entity.position);
  entity.polyline = defined(styleEntity.polyline)
    ? styleEntity.polyline.clone()
    : new PolylineGraphics();
  entity.polyline.positions = new PositionPropertyArray([
    entityPosition,
    surfacePosition,
  ]);
}

function heightReferenceFromAltitudeMode(altitudeMode, gxAltitudeMode) {
  if (
    (!defined(altitudeMode) && !defined(gxAltitudeMode)) ||
    altitudeMode === "clampToGround"
  ) {
    return HeightReference.CLAMP_TO_GROUND;
  }

  if (altitudeMode === "relativeToGround") {
    return HeightReference.RELATIVE_TO_GROUND;
  }

  if (altitudeMode === "absolute") {
    return HeightReference.NONE;
  }

  if (gxAltitudeMode === "clampToSeaFloor") {
    oneTimeWarning(
      "kml-gx:altitudeMode-clampToSeaFloor",
      "KML - <gx:altitudeMode>:clampToSeaFloor is currently not supported, using <kml:altitudeMode>:clampToGround."
    );
    return HeightReference.CLAMP_TO_GROUND;
  }

  if (gxAltitudeMode === "relativeToSeaFloor") {
    oneTimeWarning(
      "kml-gx:altitudeMode-relativeToSeaFloor",
      "KML - <gx:altitudeMode>:relativeToSeaFloor is currently not supported, using <kml:altitudeMode>:relativeToGround."
    );
    return HeightReference.RELATIVE_TO_GROUND;
  }

  if (defined(altitudeMode)) {
    oneTimeWarning(
      "kml-altitudeMode-unknown",
      "KML - Unknown <kml:altitudeMode>:" +
        altitudeMode +
        ", using <kml:altitudeMode>:CLAMP_TO_GROUND."
    );
  } else {
    oneTimeWarning(
      "kml-gx:altitudeMode-unknown",
      "KML - Unknown <gx:altitudeMode>:" +
        gxAltitudeMode +
        ", using <kml:altitudeMode>:CLAMP_TO_GROUND."
    );
  }

  // Clamp to ground is the default
  return HeightReference.CLAMP_TO_GROUND;
}

function createPositionPropertyFromAltitudeMode(
  property,
  altitudeMode,
  gxAltitudeMode
) {
  if (
    gxAltitudeMode === "relativeToSeaFloor" ||
    altitudeMode === "absolute" ||
    altitudeMode === "relativeToGround"
  ) {
    //Just return the ellipsoid referenced property until we support MSL
    return property;
  }

  if (
    (defined(altitudeMode) && altitudeMode !== "clampToGround") || //
    (defined(gxAltitudeMode) && gxAltitudeMode !== "clampToSeaFloor")
  ) {
    oneTimeWarning(
      "kml-altitudeMode-unknown",
      "KML - Unknown altitudeMode: " +
        defaultValue(altitudeMode, gxAltitudeMode)
    );
  }

  // Clamp to ground is the default
  return new ScaledPositionProperty(property);
}

function createPositionPropertyArrayFromAltitudeMode(
  properties,
  altitudeMode,
  gxAltitudeMode,
  ellipsoid
) {
  if (!defined(properties)) {
    return undefined;
  }

  if (
    gxAltitudeMode === "relativeToSeaFloor" ||
    altitudeMode === "absolute" ||
    altitudeMode === "relativeToGround"
  ) {
    //Just return the ellipsoid referenced property until we support MSL
    return properties;
  }

  if (
    (defined(altitudeMode) && altitudeMode !== "clampToGround") || //
    (defined(gxAltitudeMode) && gxAltitudeMode !== "clampToSeaFloor")
  ) {
    oneTimeWarning(
      "kml-altitudeMode-unknown",
      "KML - Unknown altitudeMode: " +
        defaultValue(altitudeMode, gxAltitudeMode)
    );
  }

  // Clamp to ground is the default
  var propertiesLength = properties.length;
  for (var i = 0; i < propertiesLength; i++) {
    var property = properties[i];
    ellipsoid.scaleToGeodeticSurface(property, property);
  }
  return properties;
}

function processPositionGraphics(
  dataSource,
  entity,
  styleEntity,
  heightReference
) {
  var label = entity.label;
  if (!defined(label)) {
    label = defined(styleEntity.label)
      ? styleEntity.label.clone()
      : createDefaultLabel();
    entity.label = label;
  }
  label.text = entity.name;

  var billboard = entity.billboard;
  if (!defined(billboard)) {
    billboard = defined(styleEntity.billboard)
      ? styleEntity.billboard.clone()
      : createDefaultBillboard();
    entity.billboard = billboard;
  }

  if (!defined(billboard.image)) {
    billboard.image = dataSource._pinBuilder.fromColor(Color.YELLOW, 64);

    // If there were empty <Icon> tags in the KML, then billboard.image was set to false above
    // However, in this case, the false value would have been converted to a property afterwards
    // Thus, we check if billboard.image is defined with value of false
  } else if (!billboard.image.getValue()) {
    billboard.image = undefined;
  }

  var scale = 1.0;
  if (defined(billboard.scale)) {
    scale = billboard.scale.getValue();
    if (scale !== 0) {
      label.pixelOffset = new Cartesian2(scale * 16 + 1, 0);
    } else {
      //Minor tweaks to better match Google Earth.
      label.pixelOffset = undefined;
      label.horizontalOrigin = undefined;
    }
  }

  if (defined(heightReference) && dataSource._clampToGround) {
    billboard.heightReference = heightReference;
    label.heightReference = heightReference;
  }
}

function processPathGraphics(entity, styleEntity) {
  var path = entity.path;
  if (!defined(path)) {
    path = new PathGraphics();
    path.leadTime = 0;
    entity.path = path;
  }

  var polyline = styleEntity.polyline;
  if (defined(polyline)) {
    path.material = polyline.material;
    path.width = polyline.width;
  }
}

function processPoint(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity
) {
  var coordinatesString = queryStringValue(
    geometryNode,
    "coordinates",
    namespaces.kml
  );
  var altitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.kml
  );
  var gxAltitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.gx
  );
  var extrude = queryBooleanValue(geometryNode, "extrude", namespaces.kml);
  var ellipsoid = dataSource._ellipsoid;
  var position = readCoordinate(coordinatesString, ellipsoid);

  entity.position = position;
  processPositionGraphics(
    dataSource,
    entity,
    styleEntity,
    heightReferenceFromAltitudeMode(altitudeMode, gxAltitudeMode)
  );

  if (extrude && isExtrudable(altitudeMode, gxAltitudeMode)) {
    createDropLine(entityCollection, entity, styleEntity);
  }

  return true;
}

function processLineStringOrLinearRing(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity
) {
  var coordinatesNode = queryFirstNode(
    geometryNode,
    "coordinates",
    namespaces.kml
  );
  var altitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.kml
  );
  var gxAltitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.gx
  );
  var extrude = queryBooleanValue(geometryNode, "extrude", namespaces.kml);
  var tessellate = queryBooleanValue(
    geometryNode,
    "tessellate",
    namespaces.kml
  );
  var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);
  var zIndex = queryNumericValue(geometryNode, "drawOrder", namespaces.gx);

  var ellipsoid = dataSource._ellipsoid;
  var coordinates = readCoordinates(coordinatesNode, ellipsoid);
  var polyline = styleEntity.polyline;
  if (canExtrude && extrude) {
    var wall = new WallGraphics();
    entity.wall = wall;
    wall.positions = coordinates;
    var polygon = styleEntity.polygon;

    if (defined(polygon)) {
      wall.fill = polygon.fill;
      wall.material = polygon.material;
    }

    //Always outline walls so they show up in 2D.
    wall.outline = true;
    if (defined(polyline)) {
      wall.outlineColor = defined(polyline.material)
        ? polyline.material.color
        : Color.WHITE;
      wall.outlineWidth = polyline.width;
    } else if (defined(polygon)) {
      wall.outlineColor = defined(polygon.material)
        ? polygon.material.color
        : Color.WHITE;
    }
  } else if (dataSource._clampToGround && !canExtrude && tessellate) {
    var polylineGraphics = new PolylineGraphics();
    polylineGraphics.clampToGround = true;
    entity.polyline = polylineGraphics;
    polylineGraphics.positions = coordinates;
    if (defined(polyline)) {
      polylineGraphics.material = defined(polyline.material)
        ? polyline.material.color.getValue(Iso8601.MINIMUM_VALUE)
        : Color.WHITE;
      polylineGraphics.width = defaultValue(polyline.width, 1.0);
    } else {
      polylineGraphics.material = Color.WHITE;
      polylineGraphics.width = 1.0;
    }
    polylineGraphics.zIndex = zIndex;
  } else {
    if (defined(zIndex)) {
      oneTimeWarning(
        "kml-gx:drawOrder",
        "KML - gx:drawOrder is not supported in LineStrings when clampToGround is false"
      );
    }
    if (dataSource._clampToGround && !tessellate) {
      oneTimeWarning(
        "kml-line-tesselate",
        "Ignoring clampToGround for KML lines without the tessellate flag."
      );
    }

    polyline = defined(polyline) ? polyline.clone() : new PolylineGraphics();
    entity.polyline = polyline;
    polyline.positions = createPositionPropertyArrayFromAltitudeMode(
      coordinates,
      altitudeMode,
      gxAltitudeMode,
      ellipsoid
    );
    if (!tessellate || canExtrude) {
      polyline.arcType = ArcType.NONE;
    }
  }

  return true;
}

function processPolygon(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity
) {
  var outerBoundaryIsNode = queryFirstNode(
    geometryNode,
    "outerBoundaryIs",
    namespaces.kml
  );
  var linearRingNode = queryFirstNode(
    outerBoundaryIsNode,
    "LinearRing",
    namespaces.kml
  );
  var coordinatesNode = queryFirstNode(
    linearRingNode,
    "coordinates",
    namespaces.kml
  );
  var ellipsoid = dataSource._ellipsoid;
  var coordinates = readCoordinates(coordinatesNode, ellipsoid);
  var extrude = queryBooleanValue(geometryNode, "extrude", namespaces.kml);
  var altitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.kml
  );
  var gxAltitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.gx
  );
  var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);

  var polygon = defined(styleEntity.polygon)
    ? styleEntity.polygon.clone()
    : createDefaultPolygon();

  var polyline = styleEntity.polyline;
  if (defined(polyline)) {
    polygon.outlineColor = defined(polyline.material)
      ? polyline.material.color
      : Color.WHITE;
    polygon.outlineWidth = polyline.width;
  }
  entity.polygon = polygon;

  if (canExtrude) {
    polygon.perPositionHeight = true;
    polygon.extrudedHeight = extrude ? 0 : undefined;
  } else if (!dataSource._clampToGround) {
    polygon.height = 0;
  }

  if (defined(coordinates)) {
    var hierarchy = new PolygonHierarchy(coordinates);
    var innerBoundaryIsNodes = queryChildNodes(
      geometryNode,
      "innerBoundaryIs",
      namespaces.kml
    );
    for (var j = 0; j < innerBoundaryIsNodes.length; j++) {
      linearRingNode = queryChildNodes(
        innerBoundaryIsNodes[j],
        "LinearRing",
        namespaces.kml
      );
      for (var k = 0; k < linearRingNode.length; k++) {
        coordinatesNode = queryFirstNode(
          linearRingNode[k],
          "coordinates",
          namespaces.kml
        );
        coordinates = readCoordinates(coordinatesNode, ellipsoid);
        if (defined(coordinates)) {
          hierarchy.holes.push(new PolygonHierarchy(coordinates));
        }
      }
    }
    polygon.hierarchy = hierarchy;
  }

  return true;
}

function processTrack(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity
) {
  var altitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.kml
  );
  var gxAltitudeMode = queryStringValue(
    geometryNode,
    "altitudeMode",
    namespaces.gx
  );
  var coordNodes = queryChildNodes(geometryNode, "coord", namespaces.gx);
  var angleNodes = queryChildNodes(geometryNode, "angles", namespaces.gx);
  var timeNodes = queryChildNodes(geometryNode, "when", namespaces.kml);
  var extrude = queryBooleanValue(geometryNode, "extrude", namespaces.kml);
  var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);
  var ellipsoid = dataSource._ellipsoid;

  if (angleNodes.length > 0) {
    oneTimeWarning(
      "kml-gx:angles",
      "KML - gx:angles are not supported in gx:Tracks"
    );
  }

  var length = Math.min(coordNodes.length, timeNodes.length);
  var coordinates = [];
  var times = [];
  for (var i = 0; i < length; i++) {
    var position = readCoordinate(coordNodes[i].textContent, ellipsoid);
    coordinates.push(position);
    times.push(JulianDate.fromIso8601(timeNodes[i].textContent));
  }
  var property = new SampledPositionProperty();
  property.addSamples(times, coordinates);
  entity.position = property;
  processPositionGraphics(
    dataSource,
    entity,
    styleEntity,
    heightReferenceFromAltitudeMode(altitudeMode, gxAltitudeMode)
  );
  processPathGraphics(entity, styleEntity);

  entity.availability = new TimeIntervalCollection();

  if (timeNodes.length > 0) {
    entity.availability.addInterval(
      new TimeInterval({
        start: times[0],
        stop: times[times.length - 1],
      })
    );
  }

  if (canExtrude && extrude) {
    createDropLine(entityCollection, entity, styleEntity);
  }

  return true;
}

function addToMultiTrack(
  times,
  positions,
  composite,
  availability,
  dropShowProperty,
  extrude,
  altitudeMode,
  gxAltitudeMode,
  includeEndPoints
) {
  var start = times[0];
  var stop = times[times.length - 1];

  var data = new SampledPositionProperty();
  data.addSamples(times, positions);

  composite.intervals.addInterval(
    new TimeInterval({
      start: start,
      stop: stop,
      isStartIncluded: includeEndPoints,
      isStopIncluded: includeEndPoints,
      data: createPositionPropertyFromAltitudeMode(
        data,
        altitudeMode,
        gxAltitudeMode
      ),
    })
  );
  availability.addInterval(
    new TimeInterval({
      start: start,
      stop: stop,
      isStartIncluded: includeEndPoints,
      isStopIncluded: includeEndPoints,
    })
  );
  dropShowProperty.intervals.addInterval(
    new TimeInterval({
      start: start,
      stop: stop,
      isStartIncluded: includeEndPoints,
      isStopIncluded: includeEndPoints,
      data: extrude,
    })
  );
}

function processMultiTrack(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity
) {
  // Multitrack options do not work in GE as detailed in the spec,
  // rather than altitudeMode being at the MultiTrack level,
  // GE just defers all settings to the underlying track.

  var interpolate = queryBooleanValue(
    geometryNode,
    "interpolate",
    namespaces.gx
  );
  var trackNodes = queryChildNodes(geometryNode, "Track", namespaces.gx);

  var times;
  var lastStop;
  var lastStopPosition;
  var needDropLine = false;
  var dropShowProperty = new TimeIntervalCollectionProperty();
  var availability = new TimeIntervalCollection();
  var composite = new CompositePositionProperty();
  var ellipsoid = dataSource._ellipsoid;
  for (var i = 0, len = trackNodes.length; i < len; i++) {
    var trackNode = trackNodes[i];
    var timeNodes = queryChildNodes(trackNode, "when", namespaces.kml);
    var coordNodes = queryChildNodes(trackNode, "coord", namespaces.gx);
    var altitudeMode = queryStringValue(
      trackNode,
      "altitudeMode",
      namespaces.kml
    );
    var gxAltitudeMode = queryStringValue(
      trackNode,
      "altitudeMode",
      namespaces.gx
    );
    var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);
    var extrude = queryBooleanValue(trackNode, "extrude", namespaces.kml);

    var length = Math.min(coordNodes.length, timeNodes.length);

    var positions = [];
    times = [];
    for (var x = 0; x < length; x++) {
      var position = readCoordinate(coordNodes[x].textContent, ellipsoid);
      positions.push(position);
      times.push(JulianDate.fromIso8601(timeNodes[x].textContent));
    }

    if (interpolate) {
      //If we are interpolating, then we need to fill in the end of
      //the last track and the beginning of this one with a sampled
      //property.  From testing in Google Earth, this property
      //is never extruded and always absolute.
      if (defined(lastStop)) {
        addToMultiTrack(
          [lastStop, times[0]],
          [lastStopPosition, positions[0]],
          composite,
          availability,
          dropShowProperty,
          false,
          "absolute",
          undefined,
          false
        );
      }
      lastStop = times[length - 1];
      lastStopPosition = positions[positions.length - 1];
    }

    addToMultiTrack(
      times,
      positions,
      composite,
      availability,
      dropShowProperty,
      canExtrude && extrude,
      altitudeMode,
      gxAltitudeMode,
      true
    );
    needDropLine = needDropLine || (canExtrude && extrude);
  }

  entity.availability = availability;
  entity.position = composite;
  processPositionGraphics(dataSource, entity, styleEntity);
  processPathGraphics(entity, styleEntity);
  if (needDropLine) {
    createDropLine(entityCollection, entity, styleEntity);
    entity.polyline.show = dropShowProperty;
  }

  return true;
}

var geometryTypes = {
  Point: processPoint,
  LineString: processLineStringOrLinearRing,
  LinearRing: processLineStringOrLinearRing,
  Polygon: processPolygon,
  Track: processTrack,
  MultiTrack: processMultiTrack,
  MultiGeometry: processMultiGeometry,
  Model: processUnsupportedGeometry,
};

function processMultiGeometry(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity,
  context
) {
  var childNodes = geometryNode.childNodes;
  var hasGeometry = false;
  for (var i = 0, len = childNodes.length; i < len; i++) {
    var childNode = childNodes.item(i);
    var geometryProcessor = geometryTypes[childNode.localName];
    if (defined(geometryProcessor)) {
      var childEntity = createEntity(childNode, entityCollection, context);
      childEntity.parent = entity;
      childEntity.name = entity.name;
      childEntity.availability = entity.availability;
      childEntity.description = entity.description;
      childEntity.kml = entity.kml;
      if (
        geometryProcessor(
          dataSource,
          entityCollection,
          childNode,
          childEntity,
          styleEntity
        )
      ) {
        hasGeometry = true;
      }
    }
  }

  return hasGeometry;
}

function processUnsupportedGeometry(
  dataSource,
  entityCollection,
  geometryNode,
  entity,
  styleEntity
) {
  oneTimeWarning(
    "kml-unsupportedGeometry",
    "KML - Unsupported geometry: " + geometryNode.localName
  );
  return false;
}

function processExtendedData(node, entity) {
  var extendedDataNode = queryFirstNode(node, "ExtendedData", namespaces.kml);

  if (!defined(extendedDataNode)) {
    return undefined;
  }

  if (defined(queryFirstNode(extendedDataNode, "SchemaData", namespaces.kml))) {
    oneTimeWarning("kml-schemaData", "KML - SchemaData is unsupported");
  }
  if (defined(queryStringAttribute(extendedDataNode, "xmlns:prefix"))) {
    oneTimeWarning(
      "kml-extendedData",
      "KML - ExtendedData with xmlns:prefix is unsupported"
    );
  }

  var result = {};
  var dataNodes = queryChildNodes(extendedDataNode, "Data", namespaces.kml);
  if (defined(dataNodes)) {
    var length = dataNodes.length;
    for (var i = 0; i < length; i++) {
      var dataNode = dataNodes[i];
      var name = queryStringAttribute(dataNode, "name");
      if (defined(name)) {
        result[name] = {
          displayName: queryStringValue(
            dataNode,
            "displayName",
            namespaces.kml
          ),
          value: queryStringValue(dataNode, "value", namespaces.kml),
        };
      }
    }
  }
  entity.kml.extendedData = result;
}

var scratchDiv;
if (typeof document !== "undefined") {
  scratchDiv = document.createElement("div");
}

function processDescription(
  node,
  entity,
  styleEntity,
  uriResolver,
  sourceResource
) {
  var i;
  var key;
  var keys;

  var kmlData = entity.kml;
  var extendedData = kmlData.extendedData;
  var description = queryStringValue(node, "description", namespaces.kml);

  var balloonStyle = defaultValue(
    entity.balloonStyle,
    styleEntity.balloonStyle
  );

  var background = Color.WHITE;
  var foreground = Color.BLACK;
  var text = description;

  if (defined(balloonStyle)) {
    background = defaultValue(balloonStyle.bgColor, Color.WHITE);
    foreground = defaultValue(balloonStyle.textColor, Color.BLACK);
    text = defaultValue(balloonStyle.text, description);
  }

  var value;
  if (defined(text)) {
    text = text.replace("$[name]", defaultValue(entity.name, ""));
    text = text.replace("$[description]", defaultValue(description, ""));
    text = text.replace("$[address]", defaultValue(kmlData.address, ""));
    text = text.replace("$[Snippet]", defaultValue(kmlData.snippet, ""));
    text = text.replace("$[id]", entity.id);

    //While not explicitly defined by the OGC spec, in Google Earth
    //The appearance of geDirections adds the directions to/from links
    //We simply replace this string with nothing.
    text = text.replace("$[geDirections]", "");

    if (defined(extendedData)) {
      var matches = text.match(/\$\[.+?\]/g);
      if (matches !== null) {
        for (i = 0; i < matches.length; i++) {
          var token = matches[i];
          var propertyName = token.substr(2, token.length - 3);
          var isDisplayName = /\/displayName$/.test(propertyName);
          propertyName = propertyName.replace(/\/displayName$/, "");

          value = extendedData[propertyName];
          if (defined(value)) {
            value = isDisplayName ? value.displayName : value.value;
          }
          if (defined(value)) {
            text = text.replace(token, defaultValue(value, ""));
          }
        }
      }
    }
  } else if (defined(extendedData)) {
    //If no description exists, build a table out of the extended data
    keys = Object.keys(extendedData);
    if (keys.length > 0) {
      text =
        '<table class="cesium-infoBox-defaultTable cesium-infoBox-defaultTable-lighter"><tbody>';
      for (i = 0; i < keys.length; i++) {
        key = keys[i];
        value = extendedData[key];
        text +=
          "<tr><th>" +
          defaultValue(value.displayName, key) +
          "</th><td>" +
          defaultValue(value.value, "") +
          "</td></tr>";
      }
      text += "</tbody></table>";
    }
  }

  if (!defined(text)) {
    //No description
    return;
  }

  //Turns non-explicit links into clickable links.
  text = autolinker.link(text);

  //Use a temporary div to manipulate the links
  //so that they open in a new window.
  scratchDiv.innerHTML = text;
  var links = scratchDiv.querySelectorAll("a");
  for (i = 0; i < links.length; i++) {
    links[i].setAttribute("target", "_blank");
  }

  //Rewrite any KMZ embedded urls
  if (defined(uriResolver) && uriResolver.keys.length > 1) {
    embedDataUris(scratchDiv, "a", "href", uriResolver);
    embedDataUris(scratchDiv, "img", "src", uriResolver);
  }

  //Make relative urls absolute using the sourceResource
  applyBasePath(scratchDiv, "a", "href", sourceResource);
  applyBasePath(scratchDiv, "img", "src", sourceResource);

  var tmp = '<div class="cesium-infoBox-description-lighter" style="';
  tmp += "overflow:auto;";
  tmp += "word-wrap:break-word;";
  tmp += "background-color:" + background.toCssColorString() + ";";
  tmp += "color:" + foreground.toCssColorString() + ";";
  tmp += '">';
  tmp += scratchDiv.innerHTML + "</div>";
  scratchDiv.innerHTML = "";

  //Set the final HTML as the description.
  entity.description = tmp;
}

function processFeature(dataSource, featureNode, processingData) {
  var entityCollection = processingData.entityCollection;
  var parent = processingData.parentEntity;
  var sourceResource = processingData.sourceResource;
  var uriResolver = processingData.uriResolver;

  var entity = createEntity(
    featureNode,
    entityCollection,
    processingData.context
  );
  var kmlData = entity.kml;
  var styleEntity = computeFinalStyle(
    dataSource,
    featureNode,
    processingData.styleCollection,
    sourceResource,
    uriResolver
  );

  var name = queryStringValue(featureNode, "name", namespaces.kml);
  entity.name = name;
  entity.parent = parent;

  var availability = processTimeSpan(featureNode);
  if (!defined(availability)) {
    availability = processTimeStamp(featureNode);
  }
  entity.availability = availability;

  mergeAvailabilityWithParent(entity);

  // Per KML spec "A Feature is visible only if it and all its ancestors are visible."
  function ancestryIsVisible(parentEntity) {
    if (!parentEntity) {
      return true;
    }
    return parentEntity.show && ancestryIsVisible(parentEntity.parent);
  }

  var visibility = queryBooleanValue(featureNode, "visibility", namespaces.kml);
  entity.show = ancestryIsVisible(parent) && defaultValue(visibility, true);
  //var open = queryBooleanValue(featureNode, 'open', namespaces.kml);

  var authorNode = queryFirstNode(featureNode, "author", namespaces.atom);
  var author = kmlData.author;
  author.name = queryStringValue(authorNode, "name", namespaces.atom);
  author.uri = queryStringValue(authorNode, "uri", namespaces.atom);
  author.email = queryStringValue(authorNode, "email", namespaces.atom);

  var linkNode = queryFirstNode(featureNode, "link", namespaces.atom);
  var link = kmlData.link;
  link.href = queryStringAttribute(linkNode, "href");
  link.hreflang = queryStringAttribute(linkNode, "hreflang");
  link.rel = queryStringAttribute(linkNode, "rel");
  link.type = queryStringAttribute(linkNode, "type");
  link.title = queryStringAttribute(linkNode, "title");
  link.length = queryStringAttribute(linkNode, "length");

  kmlData.address = queryStringValue(featureNode, "address", namespaces.kml);
  kmlData.phoneNumber = queryStringValue(
    featureNode,
    "phoneNumber",
    namespaces.kml
  );
  kmlData.snippet = queryStringValue(featureNode, "Snippet", namespaces.kml);

  processExtendedData(featureNode, entity);
  processDescription(
    featureNode,
    entity,
    styleEntity,
    uriResolver,
    sourceResource
  );

  var ellipsoid = dataSource._ellipsoid;
  processLookAt(featureNode, entity, ellipsoid);
  processCamera(featureNode, entity, ellipsoid);

  if (defined(queryFirstNode(featureNode, "Region", namespaces.kml))) {
    oneTimeWarning("kml-region", "KML - Placemark Regions are unsupported");
  }

  return {
    entity: entity,
    styleEntity: styleEntity,
  };
}

function processDocument(dataSource, node, processingData, deferredLoading) {
  deferredLoading.addNodes(node.childNodes, processingData);
  deferredLoading.process();
}

function processFolder(dataSource, node, processingData, deferredLoading) {
  var r = processFeature(dataSource, node, processingData);
  var newProcessingData = clone(processingData);
  newProcessingData.parentEntity = r.entity;
  processDocument(dataSource, node, newProcessingData, deferredLoading);
}

function processPlacemark(
  dataSource,
  placemark,
  processingData,
  deferredLoading
) {
  var r = processFeature(dataSource, placemark, processingData);
  var entity = r.entity;
  var styleEntity = r.styleEntity;

  var hasGeometry = false;
  var childNodes = placemark.childNodes;
  for (var i = 0, len = childNodes.length; i < len && !hasGeometry; i++) {
    var childNode = childNodes.item(i);
    var geometryProcessor = geometryTypes[childNode.localName];
    if (defined(geometryProcessor)) {
      // pass the placemark entity id as a context for case of defining multiple child entities together to handle case
      // where some malformed kmls reuse the same id across placemarks, which works in GE, but is not technically to spec.
      geometryProcessor(
        dataSource,
        processingData.entityCollection,
        childNode,
        entity,
        styleEntity,
        entity.id
      );
      hasGeometry = true;
    }
  }

  if (!hasGeometry) {
    entity.merge(styleEntity);
    processPositionGraphics(dataSource, entity, styleEntity);
  }
}

var playlistNodeProcessors = {
  FlyTo: processTourFlyTo,
  Wait: processTourWait,
  SoundCue: processTourUnsupportedNode,
  AnimatedUpdate: processTourUnsupportedNode,
  TourControl: processTourUnsupportedNode,
};

function processTour(dataSource, node, processingData, deferredLoading) {
  var name = queryStringValue(node, "name", namespaces.kml);
  var id = queryStringAttribute(node, "id");
  var tour = new KmlTour(name, id);

  var playlistNode = queryFirstNode(node, "Playlist", namespaces.gx);
  if (playlistNode) {
    var ellipsoid = dataSource._ellipsoid;
    var childNodes = playlistNode.childNodes;
    for (var i = 0; i < childNodes.length; i++) {
      var entryNode = childNodes[i];
      if (entryNode.localName) {
        var playlistNodeProcessor = playlistNodeProcessors[entryNode.localName];
        if (playlistNodeProcessor) {
          playlistNodeProcessor(tour, entryNode, ellipsoid);
        } else {
          console.log(
            "Unknown KML Tour playlist entry type " + entryNode.localName
          );
        }
      }
    }
  }

  dataSource._kmlTours.push(tour);
}

function processTourUnsupportedNode(tour, entryNode) {
  oneTimeWarning("KML Tour unsupported node " + entryNode.localName);
}

function processTourWait(tour, entryNode) {
  var duration = queryNumericValue(entryNode, "duration", namespaces.gx);
  tour.addPlaylistEntry(new KmlTourWait(duration));
}

function processTourFlyTo(tour, entryNode, ellipsoid) {
  var duration = queryNumericValue(entryNode, "duration", namespaces.gx);
  var flyToMode = queryStringValue(entryNode, "flyToMode", namespaces.gx);

  var t = { kml: {} };

  processLookAt(entryNode, t, ellipsoid);
  processCamera(entryNode, t, ellipsoid);

  var view = t.kml.lookAt || t.kml.camera;

  var flyto = new KmlTourFlyTo(duration, flyToMode, view);
  tour.addPlaylistEntry(flyto);
}

function processCamera(featureNode, entity, ellipsoid) {
  var camera = queryFirstNode(featureNode, "Camera", namespaces.kml);
  if (defined(camera)) {
    var lon = defaultValue(
      queryNumericValue(camera, "longitude", namespaces.kml),
      0.0
    );
    var lat = defaultValue(
      queryNumericValue(camera, "latitude", namespaces.kml),
      0.0
    );
    var altitude = defaultValue(
      queryNumericValue(camera, "altitude", namespaces.kml),
      0.0
    );

    var heading = defaultValue(
      queryNumericValue(camera, "heading", namespaces.kml),
      0.0
    );
    var tilt = defaultValue(
      queryNumericValue(camera, "tilt", namespaces.kml),
      0.0
    );
    var roll = defaultValue(
      queryNumericValue(camera, "roll", namespaces.kml),
      0.0
    );

    var position = Cartesian3.fromDegrees(lon, lat, altitude, ellipsoid);
    var hpr = HeadingPitchRoll.fromDegrees(heading, tilt - 90.0, roll);

    entity.kml.camera = new KmlCamera(position, hpr);
  }
}

function processLookAt(featureNode, entity, ellipsoid) {
  var lookAt = queryFirstNode(featureNode, "LookAt", namespaces.kml);
  if (defined(lookAt)) {
    var lon = defaultValue(
      queryNumericValue(lookAt, "longitude", namespaces.kml),
      0.0
    );
    var lat = defaultValue(
      queryNumericValue(lookAt, "latitude", namespaces.kml),
      0.0
    );
    var altitude = defaultValue(
      queryNumericValue(lookAt, "altitude", namespaces.kml),
      0.0
    );
    var heading = queryNumericValue(lookAt, "heading", namespaces.kml);
    var tilt = queryNumericValue(lookAt, "tilt", namespaces.kml);
    var range = defaultValue(
      queryNumericValue(lookAt, "range", namespaces.kml),
      0.0
    );

    tilt = CesiumMath.toRadians(defaultValue(tilt, 0.0));
    heading = CesiumMath.toRadians(defaultValue(heading, 0.0));

    var hpr = new HeadingPitchRange(
      heading,
      tilt - CesiumMath.PI_OVER_TWO,
      range
    );
    var viewPoint = Cartesian3.fromDegrees(lon, lat, altitude, ellipsoid);

    entity.kml.lookAt = new KmlLookAt(viewPoint, hpr);
  }
}

function processGroundOverlay(
  dataSource,
  groundOverlay,
  processingData,
  deferredLoading
) {
  var r = processFeature(dataSource, groundOverlay, processingData);
  var entity = r.entity;

  var geometry;
  var isLatLonQuad = false;

  var ellipsoid = dataSource._ellipsoid;
  var positions = readCoordinates(
    queryFirstNode(groundOverlay, "LatLonQuad", namespaces.gx),
    ellipsoid
  );
  var zIndex = queryNumericValue(groundOverlay, "drawOrder", namespaces.kml);
  if (defined(positions)) {
    geometry = createDefaultPolygon();
    geometry.hierarchy = new PolygonHierarchy(positions);
    geometry.zIndex = zIndex;
    entity.polygon = geometry;
    isLatLonQuad = true;
  } else {
    geometry = new RectangleGraphics();
    geometry.zIndex = zIndex;
    entity.rectangle = geometry;

    var latLonBox = queryFirstNode(groundOverlay, "LatLonBox", namespaces.kml);
    if (defined(latLonBox)) {
      var west = queryNumericValue(latLonBox, "west", namespaces.kml);
      var south = queryNumericValue(latLonBox, "south", namespaces.kml);
      var east = queryNumericValue(latLonBox, "east", namespaces.kml);
      var north = queryNumericValue(latLonBox, "north", namespaces.kml);

      if (defined(west)) {
        west = CesiumMath.negativePiToPi(CesiumMath.toRadians(west));
      }
      if (defined(south)) {
        south = CesiumMath.clampToLatitudeRange(CesiumMath.toRadians(south));
      }
      if (defined(east)) {
        east = CesiumMath.negativePiToPi(CesiumMath.toRadians(east));
      }
      if (defined(north)) {
        north = CesiumMath.clampToLatitudeRange(CesiumMath.toRadians(north));
      }
      geometry.coordinates = new Rectangle(west, south, east, north);

      var rotation = queryNumericValue(latLonBox, "rotation", namespaces.kml);
      if (defined(rotation)) {
        var rotationRadians = CesiumMath.toRadians(rotation);
        geometry.rotation = rotationRadians;
        geometry.stRotation = rotationRadians;
      }
    }
  }

  var iconNode = queryFirstNode(groundOverlay, "Icon", namespaces.kml);
  var href = getIconHref(
    iconNode,
    dataSource,
    processingData.sourceResource,
    processingData.uriResolver,
    true
  );
  if (defined(href)) {
    if (isLatLonQuad) {
      oneTimeWarning(
        "kml-gx:LatLonQuad",
        "KML - gx:LatLonQuad Icon does not support texture projection."
      );
    }
    var x = queryNumericValue(iconNode, "x", namespaces.gx);
    var y = queryNumericValue(iconNode, "y", namespaces.gx);
    var w = queryNumericValue(iconNode, "w", namespaces.gx);
    var h = queryNumericValue(iconNode, "h", namespaces.gx);

    if (defined(x) || defined(y) || defined(w) || defined(h)) {
      oneTimeWarning(
        "kml-groundOverlay-xywh",
        "KML - gx:x, gx:y, gx:w, gx:h aren't supported for GroundOverlays"
      );
    }

    geometry.material = href;
    geometry.material.color = queryColorValue(
      groundOverlay,
      "color",
      namespaces.kml
    );
    geometry.material.transparent = true;
  } else {
    geometry.material = queryColorValue(groundOverlay, "color", namespaces.kml);
  }

  var altitudeMode = queryStringValue(
    groundOverlay,
    "altitudeMode",
    namespaces.kml
  );

  if (defined(altitudeMode)) {
    if (altitudeMode === "absolute") {
      //Use height above ellipsoid until we support MSL.
      geometry.height = queryNumericValue(
        groundOverlay,
        "altitude",
        namespaces.kml
      );
      geometry.zIndex = undefined;
    } else if (altitudeMode !== "clampToGround") {
      oneTimeWarning(
        "kml-altitudeMode-unknown",
        "KML - Unknown altitudeMode: " + altitudeMode
      );
    }
    // else just use the default of 0 until we support 'clampToGround'
  } else {
    altitudeMode = queryStringValue(
      groundOverlay,
      "altitudeMode",
      namespaces.gx
    );
    if (altitudeMode === "relativeToSeaFloor") {
      oneTimeWarning(
        "kml-altitudeMode-relativeToSeaFloor",
        "KML - altitudeMode relativeToSeaFloor is currently not supported, treating as absolute."
      );
      geometry.height = queryNumericValue(
        groundOverlay,
        "altitude",
        namespaces.kml
      );
      geometry.zIndex = undefined;
    } else if (altitudeMode === "clampToSeaFloor") {
      oneTimeWarning(
        "kml-altitudeMode-clampToSeaFloor",
        "KML - altitudeMode clampToSeaFloor is currently not supported, treating as clampToGround."
      );
    } else if (defined(altitudeMode)) {
      oneTimeWarning(
        "kml-altitudeMode-unknown",
        "KML - Unknown altitudeMode: " + altitudeMode
      );
    }
  }
}

function processUnsupportedFeature(
  dataSource,
  node,
  processingData,
  deferredLoading
) {
  dataSource._unsupportedNode.raiseEvent(
    dataSource,
    processingData.parentEntity,
    node,
    processingData.entityCollection,
    processingData.styleCollection,
    processingData.sourceResource,
    processingData.uriResolver
  );
  oneTimeWarning(
    "kml-unsupportedFeature-" + node.nodeName,
    "KML - Unsupported feature: " + node.nodeName
  );
}

var RefreshMode = {
  INTERVAL: 0,
  EXPIRE: 1,
  STOP: 2,
};

function cleanupString(s) {
  if (!defined(s) || s.length === 0) {
    return "";
  }

  var sFirst = s[0];
  if (sFirst === "&" || sFirst === "?") {
    s = s.substring(1);
  }

  return s;
}

var zeroRectangle = new Rectangle();
var scratchCartographic = new Cartographic();
var scratchCartesian2 = new Cartesian2();
var scratchCartesian3 = new Cartesian3();

function processNetworkLinkQueryString(
  resource,
  camera,
  canvas,
  viewBoundScale,
  bbox,
  ellipsoid
) {
  function fixLatitude(value) {
    if (value < -CesiumMath.PI_OVER_TWO) {
      return -CesiumMath.PI_OVER_TWO;
    } else if (value > CesiumMath.PI_OVER_TWO) {
      return CesiumMath.PI_OVER_TWO;
    }
    return value;
  }

  function fixLongitude(value) {
    if (value > CesiumMath.PI) {
      return value - CesiumMath.TWO_PI;
    } else if (value < -CesiumMath.PI) {
      return value + CesiumMath.TWO_PI;
    }

    return value;
  }

  var queryString = objectToQuery(resource.queryParameters);

  // objectToQuery escapes [ and ], so fix that
  queryString = queryString.replace(/%5B/g, "[").replace(/%5D/g, "]");

  if (defined(camera) && camera._mode !== SceneMode.MORPHING) {
    var centerCartesian;
    var centerCartographic;

    bbox = defaultValue(bbox, zeroRectangle);
    if (defined(canvas)) {
      scratchCartesian2.x = canvas.clientWidth * 0.5;
      scratchCartesian2.y = canvas.clientHeight * 0.5;
      centerCartesian = camera.pickEllipsoid(
        scratchCartesian2,
        ellipsoid,
        scratchCartesian3
      );
    }

    if (defined(centerCartesian)) {
      centerCartographic = ellipsoid.cartesianToCartographic(
        centerCartesian,
        scratchCartographic
      );
    } else {
      centerCartographic = Rectangle.center(bbox, scratchCartographic);
      centerCartesian = ellipsoid.cartographicToCartesian(centerCartographic);
    }

    if (
      defined(viewBoundScale) &&
      !CesiumMath.equalsEpsilon(viewBoundScale, 1.0, CesiumMath.EPSILON9)
    ) {
      var newHalfWidth = bbox.width * viewBoundScale * 0.5;
      var newHalfHeight = bbox.height * viewBoundScale * 0.5;
      bbox = new Rectangle(
        fixLongitude(centerCartographic.longitude - newHalfWidth),
        fixLatitude(centerCartographic.latitude - newHalfHeight),
        fixLongitude(centerCartographic.longitude + newHalfWidth),
        fixLatitude(centerCartographic.latitude + newHalfHeight)
      );
    }

    queryString = queryString.replace(
      "[bboxWest]",
      CesiumMath.toDegrees(bbox.west).toString()
    );
    queryString = queryString.replace(
      "[bboxSouth]",
      CesiumMath.toDegrees(bbox.south).toString()
    );
    queryString = queryString.replace(
      "[bboxEast]",
      CesiumMath.toDegrees(bbox.east).toString()
    );
    queryString = queryString.replace(
      "[bboxNorth]",
      CesiumMath.toDegrees(bbox.north).toString()
    );

    var lon = CesiumMath.toDegrees(centerCartographic.longitude).toString();
    var lat = CesiumMath.toDegrees(centerCartographic.latitude).toString();
    queryString = queryString.replace("[lookatLon]", lon);
    queryString = queryString.replace("[lookatLat]", lat);
    queryString = queryString.replace(
      "[lookatTilt]",
      CesiumMath.toDegrees(camera.pitch).toString()
    );
    queryString = queryString.replace(
      "[lookatHeading]",
      CesiumMath.toDegrees(camera.heading).toString()
    );
    queryString = queryString.replace(
      "[lookatRange]",
      Cartesian3.distance(camera.positionWC, centerCartesian)
    );
    queryString = queryString.replace("[lookatTerrainLon]", lon);
    queryString = queryString.replace("[lookatTerrainLat]", lat);
    queryString = queryString.replace(
      "[lookatTerrainAlt]",
      centerCartographic.height.toString()
    );

    ellipsoid.cartesianToCartographic(camera.positionWC, scratchCartographic);
    queryString = queryString.replace(
      "[cameraLon]",
      CesiumMath.toDegrees(scratchCartographic.longitude).toString()
    );
    queryString = queryString.replace(
      "[cameraLat]",
      CesiumMath.toDegrees(scratchCartographic.latitude).toString()
    );
    queryString = queryString.replace(
      "[cameraAlt]",
      CesiumMath.toDegrees(scratchCartographic.height).toString()
    );

    var frustum = camera.frustum;
    var aspectRatio = frustum.aspectRatio;
    var horizFov = "";
    var vertFov = "";
    if (defined(aspectRatio)) {
      var fov = CesiumMath.toDegrees(frustum.fov);
      if (aspectRatio > 1.0) {
        horizFov = fov;
        vertFov = fov / aspectRatio;
      } else {
        vertFov = fov;
        horizFov = fov * aspectRatio;
      }
    }
    queryString = queryString.replace("[horizFov]", horizFov.toString());
    queryString = queryString.replace("[vertFov]", vertFov.toString());
  } else {
    queryString = queryString.replace("[bboxWest]", "-180");
    queryString = queryString.replace("[bboxSouth]", "-90");
    queryString = queryString.replace("[bboxEast]", "180");
    queryString = queryString.replace("[bboxNorth]", "90");

    queryString = queryString.replace("[lookatLon]", "");
    queryString = queryString.replace("[lookatLat]", "");
    queryString = queryString.replace("[lookatRange]", "");
    queryString = queryString.replace("[lookatTilt]", "");
    queryString = queryString.replace("[lookatHeading]", "");
    queryString = queryString.replace("[lookatTerrainLon]", "");
    queryString = queryString.replace("[lookatTerrainLat]", "");
    queryString = queryString.replace("[lookatTerrainAlt]", "");

    queryString = queryString.replace("[cameraLon]", "");
    queryString = queryString.replace("[cameraLat]", "");
    queryString = queryString.replace("[cameraAlt]", "");
    queryString = queryString.replace("[horizFov]", "");
    queryString = queryString.replace("[vertFov]", "");
  }

  if (defined(canvas)) {
    queryString = queryString.replace("[horizPixels]", canvas.clientWidth);
    queryString = queryString.replace("[vertPixels]", canvas.clientHeight);
  } else {
    queryString = queryString.replace("[horizPixels]", "");
    queryString = queryString.replace("[vertPixels]", "");
  }

  queryString = queryString.replace("[terrainEnabled]", "1");
  queryString = queryString.replace("[clientVersion]", "1");
  queryString = queryString.replace("[kmlVersion]", "2.2");
  queryString = queryString.replace("[clientName]", "Cesium");
  queryString = queryString.replace("[language]", "English");

  resource.setQueryParameters(queryToObject(queryString));
}

function processNetworkLink(dataSource, node, processingData, deferredLoading) {
  var r = processFeature(dataSource, node, processingData);
  var networkEntity = r.entity;

  var sourceResource = processingData.sourceResource;
  var uriResolver = processingData.uriResolver;

  var link = queryFirstNode(node, "Link", namespaces.kml);

  if (!defined(link)) {
    link = queryFirstNode(node, "Url", namespaces.kml);
  }
  if (defined(link)) {
    var href = queryStringValue(link, "href", namespaces.kml);
    var viewRefreshMode;
    var viewBoundScale;
    if (defined(href)) {
      var newSourceUri = href;
      href = resolveHref(href, sourceResource, processingData.uriResolver);

      // We need to pass in the original path if resolveHref returns a data uri because the network link
      //  references a document in a KMZ archive
      if (/^data:/.test(href.getUrlComponent())) {
        // So if sourceUri isn't the kmz file, then its another kml in the archive, so resolve it
        if (!/\.kmz/i.test(sourceResource.getUrlComponent())) {
          newSourceUri = sourceResource.getDerivedResource({
            url: newSourceUri,
          });
        }
      } else {
        newSourceUri = href.clone(); // Not a data uri so use the fully qualified uri
        viewRefreshMode = queryStringValue(
          link,
          "viewRefreshMode",
          namespaces.kml
        );
        viewBoundScale = defaultValue(
          queryStringValue(link, "viewBoundScale", namespaces.kml),
          1.0
        );
        var defaultViewFormat =
          viewRefreshMode === "onStop"
            ? "BBOX=[bboxWest],[bboxSouth],[bboxEast],[bboxNorth]"
            : "";
        var viewFormat = defaultValue(
          queryStringValue(link, "viewFormat", namespaces.kml),
          defaultViewFormat
        );
        var httpQuery = queryStringValue(link, "httpQuery", namespaces.kml);
        if (defined(viewFormat)) {
          href.setQueryParameters(queryToObject(cleanupString(viewFormat)));
        }
        if (defined(httpQuery)) {
          href.setQueryParameters(queryToObject(cleanupString(httpQuery)));
        }

        var ellipsoid = dataSource._ellipsoid;
        processNetworkLinkQueryString(
          href,
          dataSource._camera,
          dataSource._canvas,
          viewBoundScale,
          dataSource._lastCameraView.bbox,
          ellipsoid
        );
      }

      var options = {
        sourceUri: newSourceUri,
        uriResolver: uriResolver,
        context: networkEntity.id,
      };
      var networkLinkCollection = new EntityCollection();
      var promise = load(dataSource, networkLinkCollection, href, options)
        .then(function (rootElement) {
          var entities = dataSource._entityCollection;
          var newEntities = networkLinkCollection.values;
          entities.suspendEvents();
          for (var i = 0; i < newEntities.length; i++) {
            var newEntity = newEntities[i];
            if (!defined(newEntity.parent)) {
              newEntity.parent = networkEntity;
              mergeAvailabilityWithParent(newEntity);
            }

            entities.add(newEntity);
          }
          entities.resumeEvents();

          // Add network links to a list if we need they will need to be updated
          var refreshMode = queryStringValue(
            link,
            "refreshMode",
            namespaces.kml
          );
          var refreshInterval = defaultValue(
            queryNumericValue(link, "refreshInterval", namespaces.kml),
            0
          );
          if (
            (refreshMode === "onInterval" && refreshInterval > 0) ||
            refreshMode === "onExpire" ||
            viewRefreshMode === "onStop"
          ) {
            var networkLinkControl = queryFirstNode(
              rootElement,
              "NetworkLinkControl",
              namespaces.kml
            );
            var hasNetworkLinkControl = defined(networkLinkControl);

            var now = JulianDate.now();
            var networkLinkInfo = {
              id: createGuid(),
              href: href,
              cookie: {},
              lastUpdated: now,
              updating: false,
              entity: networkEntity,
              viewBoundScale: viewBoundScale,
              needsUpdate: false,
              cameraUpdateTime: now,
            };

            var minRefreshPeriod = 0;
            if (hasNetworkLinkControl) {
              networkLinkInfo.cookie = queryToObject(
                defaultValue(
                  queryStringValue(
                    networkLinkControl,
                    "cookie",
                    namespaces.kml
                  ),
                  ""
                )
              );
              minRefreshPeriod = defaultValue(
                queryNumericValue(
                  networkLinkControl,
                  "minRefreshPeriod",
                  namespaces.kml
                ),
                0
              );
            }

            if (refreshMode === "onInterval") {
              if (hasNetworkLinkControl) {
                refreshInterval = Math.max(minRefreshPeriod, refreshInterval);
              }
              networkLinkInfo.refreshMode = RefreshMode.INTERVAL;
              networkLinkInfo.time = refreshInterval;
            } else if (refreshMode === "onExpire") {
              var expires;
              if (hasNetworkLinkControl) {
                expires = queryStringValue(
                  networkLinkControl,
                  "expires",
                  namespaces.kml
                );
              }
              if (defined(expires)) {
                try {
                  var date = JulianDate.fromIso8601(expires);
                  var diff = JulianDate.secondsDifference(date, now);
                  if (diff > 0 && diff < minRefreshPeriod) {
                    JulianDate.addSeconds(now, minRefreshPeriod, date);
                  }
                  networkLinkInfo.refreshMode = RefreshMode.EXPIRE;
                  networkLinkInfo.time = date;
                } catch (e) {
                  oneTimeWarning(
                    "kml-refreshMode-onInterval-onExpire",
                    "KML - NetworkLinkControl expires is not a valid date"
                  );
                }
              } else {
                oneTimeWarning(
                  "kml-refreshMode-onExpire",
                  "KML - refreshMode of onExpire requires the NetworkLinkControl to have an expires element"
                );
              }
            } else if (dataSource._camera) {
              // Only allow onStop refreshes if we have a camera
              networkLinkInfo.refreshMode = RefreshMode.STOP;
              networkLinkInfo.time = defaultValue(
                queryNumericValue(link, "viewRefreshTime", namespaces.kml),
                0
              );
            } else {
              oneTimeWarning(
                "kml-refrehMode-onStop-noCamera",
                "A NetworkLink with viewRefreshMode=onStop requires a camera be passed in when creating the KmlDataSource"
              );
            }

            if (defined(networkLinkInfo.refreshMode)) {
              dataSource._networkLinks.set(networkLinkInfo.id, networkLinkInfo);
            }
          } else if (viewRefreshMode === "onRegion") {
            oneTimeWarning(
              "kml-refrehMode-onRegion",
              "KML - Unsupported viewRefreshMode: onRegion"
            );
          }
        })
        .otherwise(function (error) {
          oneTimeWarning("An error occured during loading " + href.url);
          dataSource._error.raiseEvent(dataSource, error);
        });

      deferredLoading.addPromise(promise);
    }
  }
}

function processFeatureNode(dataSource, node, processingData, deferredLoading) {
  var featureProcessor = featureTypes[node.localName];
  if (defined(featureProcessor)) {
    return featureProcessor(dataSource, node, processingData, deferredLoading);
  }

  return processUnsupportedFeature(
    dataSource,
    node,
    processingData,
    deferredLoading
  );
}

function loadKml(
  dataSource,
  entityCollection,
  kml,
  sourceResource,
  uriResolver,
  context
) {
  entityCollection.removeAll();

  var documentElement = kml.documentElement;
  var document =
    documentElement.localName === "Document"
      ? documentElement
      : queryFirstNode(documentElement, "Document", namespaces.kml);
  var name = queryStringValue(document, "name", namespaces.kml);
  if (!defined(name)) {
    name = getFilenameFromUri(sourceResource.getUrlComponent());
  }

  // Only set the name from the root document
  if (!defined(dataSource._name)) {
    dataSource._name = name;
  }

  var deferredLoading = new KmlDataSource._DeferredLoading(dataSource);
  var styleCollection = new EntityCollection(dataSource);
  return when
    .all(
      processStyles(
        dataSource,
        kml,
        styleCollection,
        sourceResource,
        false,
        uriResolver
      )
    )
    .then(function () {
      var element = kml.documentElement;
      if (element.localName === "kml") {
        var childNodes = element.childNodes;
        for (var i = 0; i < childNodes.length; i++) {
          var tmp = childNodes[i];
          if (defined(featureTypes[tmp.localName])) {
            element = tmp;
            break;
          }
        }
      }

      var processingData = {
        parentEntity: undefined,
        entityCollection: entityCollection,
        styleCollection: styleCollection,
        sourceResource: sourceResource,
        uriResolver: uriResolver,
        context: context,
      };

      entityCollection.suspendEvents();
      processFeatureNode(dataSource, element, processingData, deferredLoading);
      entityCollection.resumeEvents();

      return deferredLoading.wait().then(function () {
        return kml.documentElement;
      });
    });
}

function loadKmz(dataSource, entityCollection, blob, sourceResource) {
  var deferred = when.defer();
  zip.createReader(
    new zip.BlobReader(blob),
    function (reader) {
      reader.getEntries(function (entries) {
        var promises = [];
        var uriResolver = {};
        var docEntry;
        var docDefer;
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (!entry.directory) {
            var innerDefer = when.defer();
            promises.push(innerDefer.promise);
            if (/\.kml$/i.test(entry.filename)) {
              // We use the first KML document we come across
              //  https://developers.google.com/kml/documentation/kmzarchives
              // Unless we come across a .kml file at the root of the archive because GE does this
              if (!defined(docEntry) || !/\//i.test(entry.filename)) {
                if (defined(docEntry)) {
                  // We found one at the root so load the initial kml as a data uri
                  loadDataUriFromZip(docEntry, uriResolver, docDefer);
                }
                docEntry = entry;
                docDefer = innerDefer;
              } else {
                // Wasn't the first kml and wasn't at the root
                loadDataUriFromZip(entry, uriResolver, innerDefer);
              }
            } else {
              loadDataUriFromZip(entry, uriResolver, innerDefer);
            }
          }
        }

        // Now load the root KML document
        if (defined(docEntry)) {
          loadXmlFromZip(docEntry, uriResolver, docDefer);
        }
        when
          .all(promises)
          .then(function () {
            reader.close();
            if (!defined(uriResolver.kml)) {
              deferred.reject(
                new RuntimeError("KMZ file does not contain a KML document.")
              );
              return;
            }
            uriResolver.keys = Object.keys(uriResolver);
            return loadKml(
              dataSource,
              entityCollection,
              uriResolver.kml,
              sourceResource,
              uriResolver
            );
          })
          .then(deferred.resolve)
          .otherwise(deferred.reject);
      });
    },
    function (e) {
      deferred.reject(e);
    }
  );

  return deferred.promise;
}

function load(dataSource, entityCollection, data, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var sourceUri = options.sourceUri;
  var uriResolver = options.uriResolver;
  var context = options.context;

  var promise = data;
  if (typeof data === "string" || data instanceof Resource) {
    data = Resource.createIfNeeded(data);
    promise = data.fetchBlob();
    sourceUri = defaultValue(sourceUri, data.clone());

    // Add resource credits to our list of credits to display
    var resourceCredits = dataSource._resourceCredits;
    var credits = data.credits;
    if (defined(credits)) {
      var length = credits.length;
      for (var i = 0; i < length; i++) {
        resourceCredits.push(credits[i]);
      }
    }
  } else {
    sourceUri = defaultValue(sourceUri, Resource.DEFAULT.clone());
  }

  sourceUri = Resource.createIfNeeded(sourceUri);

  return when(promise)
    .then(function (dataToLoad) {
      if (dataToLoad instanceof Blob) {
        return isZipFile(dataToLoad).then(function (isZip) {
          if (isZip) {
            return loadKmz(dataSource, entityCollection, dataToLoad, sourceUri);
          }
          return readBlobAsText(dataToLoad).then(function (text) {
            //There's no official way to validate if a parse was successful.
            //The following check detects the error on various browsers.

            //Insert missing namespaces
            text = insertNamespaces(text);

            //Remove Duplicate Namespaces
            text = removeDuplicateNamespaces(text);

            //IE raises an exception
            var kml;
            var error;
            try {
              kml = parser.parseFromString(text, "application/xml");
            } catch (e) {
              error = e.toString();
            }

            //The parse succeeds on Chrome and Firefox, but the error
            //handling is different in each.
            if (
              defined(error) ||
              kml.body ||
              kml.documentElement.tagName === "parsererror"
            ) {
              //Firefox has error information as the firstChild nodeValue.
              var msg = defined(error)
                ? error
                : kml.documentElement.firstChild.nodeValue;

              //Chrome has it in the body text.
              if (!msg) {
                msg = kml.body.innerText;
              }

              //Return the error
              throw new RuntimeError(msg);
            }
            return loadKml(
              dataSource,
              entityCollection,
              kml,
              sourceUri,
              uriResolver,
              context
            );
          });
        });
      }
      return loadKml(
        dataSource,
        entityCollection,
        dataToLoad,
        sourceUri,
        uriResolver,
        context
      );
    })
    .otherwise(function (error) {
      dataSource._error.raiseEvent(dataSource, error);
      console.log(error);
      return when.reject(error);
    });
}

/**
 * @typedef {Object} KmlDataSource.LoadOptions
 *
 * Initialization options for the `load` method.
 *
 * @property {Camera} camera The camera that is used for viewRefreshModes and sending camera properties to network links.
 * @property {HTMLCanvasElement} canvas The canvas that is used for sending viewer properties to network links.
 * @property {String} [sourceUri] Overrides the url to use for resolving relative links and other KML network features.
 * @property {Boolean} [clampToGround=false] true if we want the geometry features (Polygons, LineStrings and LinearRings) clamped to the ground.
 * @property {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The global ellipsoid used for geographical calculations.
 * @property {Credit|String} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * A {@link DataSource} which processes Keyhole Markup Language 2.2 (KML).
 * <p>
 * KML support in Cesium is incomplete, but a large amount of the standard,
 * as well as Google's <code>gx</code> extension namespace, is supported. See Github issue
 * {@link https://github.com/CesiumGS/cesium/issues/873|#873} for a
 * detailed list of what is and isn't support. Cesium will also write information to the
 * console when it encounters most unsupported features.
 * </p>
 * <p>
 * Non visual feature data, such as <code>atom:author</code> and <code>ExtendedData</code>
 * is exposed via an instance of {@link KmlFeatureData}, which is added to each {@link Entity}
 * under the <code>kml</code> property.
 * </p>
 *
 * @alias KmlDataSource
 * @constructor
 *
 * @param {Object} options An object with the following properties:
 * @param {Camera} options.camera The camera that is used for viewRefreshModes and sending camera properties to network links.
 * @param {HTMLCanvasElement} options.canvas The canvas that is used for sending viewer properties to network links.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The global ellipsoid used for geographical calculations.
 * @param {Credit|String} [options.credit] A credit for the data source, which is displayed on the canvas.
 *
 * @see {@link http://www.opengeospatial.org/standards/kml/|Open Geospatial Consortium KML Standard}
 * @see {@link https://developers.google.com/kml/|Google KML Documentation}
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=KML.html|Cesium Sandcastle KML Demo}
 *
 * @example
 * var viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.dataSources.add(Cesium.KmlDataSource.load('../../SampleData/facilities.kmz',
 *      {
 *           camera: viewer.scene.camera,
 *           canvas: viewer.scene.canvas
 *      })
 * );
 */
function KmlDataSource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var camera = options.camera;
  var canvas = options.canvas;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(camera)) {
    throw new DeveloperError("options.camera is required.");
  }
  if (!defined(canvas)) {
    throw new DeveloperError("options.canvas is required.");
  }
  //>>includeEnd('debug');

  this._changed = new Event();
  this._error = new Event();
  this._loading = new Event();
  this._refresh = new Event();
  this._unsupportedNode = new Event();

  this._clock = undefined;
  this._entityCollection = new EntityCollection(this);
  this._name = undefined;
  this._isLoading = false;
  this._pinBuilder = new PinBuilder();
  this._networkLinks = new AssociativeArray();
  this._entityCluster = new EntityCluster();

  this._canvas = canvas;
  this._camera = camera;
  this._lastCameraView = {
    position: defined(camera) ? Cartesian3.clone(camera.positionWC) : undefined,
    direction: defined(camera)
      ? Cartesian3.clone(camera.directionWC)
      : undefined,
    up: defined(camera) ? Cartesian3.clone(camera.upWC) : undefined,
    bbox: defined(camera)
      ? camera.computeViewRectangle()
      : Rectangle.clone(Rectangle.MAX_VALUE),
  };

  this._ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  // User specified credit
  var credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  this._credit = credit;

  // Create a list of Credit's from the resource that the user can't remove
  this._resourceCredits = [];

  this._kmlTours = [];
}

/**
 * Creates a Promise to a new instance loaded with the provided KML data.
 *
 * @param {Resource|String|Document|Blob} data A url, parsed KML document, or Blob containing binary KMZ data or a parsed KML document.
 * @param {KmlDataSource.LoadOptions} [options] An object specifying configuration options
 *
 * @returns {Promise.<KmlDataSource>} A promise that will resolve to a new KmlDataSource instance once the KML is loaded.
 */
KmlDataSource.load = function (data, options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var dataSource = new KmlDataSource(options);
  return dataSource.load(data, options);
};

Object.defineProperties(KmlDataSource.prototype, {
  /**
   * Gets or sets a human-readable name for this instance.
   * This will be automatically be set to the KML document name on load.
   * @memberof KmlDataSource.prototype
   * @type {String}
   */
  name: {
    get: function () {
      return this._name;
    },
    set: function (value) {
      if (this._name !== value) {
        this._name = value;
        this._changed.raiseEvent(this);
      }
    },
  },
  /**
   * Gets the clock settings defined by the loaded KML. This represents the total
   * availability interval for all time-dynamic data. If the KML does not contain
   * time-dynamic data, this value is undefined.
   * @memberof KmlDataSource.prototype
   * @type {DataSourceClock}
   */
  clock: {
    get: function () {
      return this._clock;
    },
  },
  /**
   * Gets the collection of {@link Entity} instances.
   * @memberof KmlDataSource.prototype
   * @type {EntityCollection}
   */
  entities: {
    get: function () {
      return this._entityCollection;
    },
  },
  /**
   * Gets a value indicating if the data source is currently loading data.
   * @memberof KmlDataSource.prototype
   * @type {Boolean}
   */
  isLoading: {
    get: function () {
      return this._isLoading;
    },
  },
  /**
   * Gets an event that will be raised when the underlying data changes.
   * @memberof KmlDataSource.prototype
   * @type {Event}
   */
  changedEvent: {
    get: function () {
      return this._changed;
    },
  },
  /**
   * Gets an event that will be raised if an error is encountered during processing.
   * @memberof KmlDataSource.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._error;
    },
  },
  /**
   * Gets an event that will be raised when the data source either starts or stops loading.
   * @memberof KmlDataSource.prototype
   * @type {Event}
   */
  loadingEvent: {
    get: function () {
      return this._loading;
    },
  },
  /**
   * Gets an event that will be raised when the data source refreshes a network link.
   * @memberof KmlDataSource.prototype
   * @type {Event}
   */
  refreshEvent: {
    get: function () {
      return this._refresh;
    },
  },
  /**
   * Gets an event that will be raised when the data source finds an unsupported node type.
   * @memberof KmlDataSource.prototype
   * @type {Event}
   */
  unsupportedNodeEvent: {
    get: function () {
      return this._unsupportedNode;
    },
  },
  /**
   * Gets whether or not this data source should be displayed.
   * @memberof KmlDataSource.prototype
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
   * @memberof KmlDataSource.prototype
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
  /**
   * Gets the credit that will be displayed for the data source
   * @memberof KmlDataSource.prototype
   * @type {Credit}
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },
  /**
   * Gets the KML Tours that are used to guide the camera to specified destinations on given time intervals.
   * @memberof KmlDataSource.prototype
   * @type {KmlTour[]}
   */
  kmlTours: {
    get: function () {
      return this._kmlTours;
    },
  },
});

/**
 * Asynchronously loads the provided KML data, replacing any existing data.
 *
 * @param {Resource|String|Document|Blob} data A url, parsed KML document, or Blob containing binary KMZ data or a parsed KML document.
 * @param {Object} [options] An object with the following properties:
 * @param {Resource|String} [options.sourceUri] Overrides the url to use for resolving relative links and other KML network features.
 * @param {Boolean} [options.clampToGround=false] true if we want the geometry features (Polygons, LineStrings and LinearRings) clamped to the ground. If true, lines will use corridors so use Entity.corridor instead of Entity.polyline.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The global ellipsoid used for geographical calculations.
 *
 * @returns {Promise.<KmlDataSource>} A promise that will resolve to this instances once the KML is loaded.
 */
KmlDataSource.prototype.load = function (data, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(data)) {
    throw new DeveloperError("data is required.");
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  DataSource.setLoading(this, true);

  var oldName = this._name;
  this._name = undefined;
  this._clampToGround = defaultValue(options.clampToGround, false);

  var that = this;
  return load(this, this._entityCollection, data, options)
    .then(function () {
      var clock;

      var availability = that._entityCollection.computeAvailability();

      var start = availability.start;
      var stop = availability.stop;
      var isMinStart = JulianDate.equals(start, Iso8601.MINIMUM_VALUE);
      var isMaxStop = JulianDate.equals(stop, Iso8601.MAXIMUM_VALUE);
      if (!isMinStart || !isMaxStop) {
        var date;

        //If start is min time just start at midnight this morning, local time
        if (isMinStart) {
          date = new Date();
          date.setHours(0, 0, 0, 0);
          start = JulianDate.fromDate(date);
        }

        //If stop is max value just stop at midnight tonight, local time
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

      var changed = false;
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

function mergeAvailabilityWithParent(child) {
  var parent = child.parent;
  if (defined(parent)) {
    var parentAvailability = parent.availability;
    if (defined(parentAvailability)) {
      var childAvailability = child.availability;
      if (defined(childAvailability)) {
        childAvailability.intersect(parentAvailability);
      } else {
        child.availability = parentAvailability;
      }
    }
  }
}

function getNetworkLinkUpdateCallback(
  dataSource,
  networkLink,
  newEntityCollection,
  networkLinks,
  processedHref
) {
  return function (rootElement) {
    if (!networkLinks.contains(networkLink.id)) {
      // Got into the odd case where a parent network link was updated while a child
      //  network link update was in flight, so just throw it away.
      return;
    }
    var remove = false;
    var networkLinkControl = queryFirstNode(
      rootElement,
      "NetworkLinkControl",
      namespaces.kml
    );
    var hasNetworkLinkControl = defined(networkLinkControl);

    var minRefreshPeriod = 0;
    if (hasNetworkLinkControl) {
      if (
        defined(queryFirstNode(networkLinkControl, "Update", namespaces.kml))
      ) {
        oneTimeWarning(
          "kml-networkLinkControl-update",
          "KML - NetworkLinkControl updates aren't supported."
        );
        networkLink.updating = false;
        networkLinks.remove(networkLink.id);
        return;
      }
      networkLink.cookie = queryToObject(
        defaultValue(
          queryStringValue(networkLinkControl, "cookie", namespaces.kml),
          ""
        )
      );
      minRefreshPeriod = defaultValue(
        queryNumericValue(
          networkLinkControl,
          "minRefreshPeriod",
          namespaces.kml
        ),
        0
      );
    }

    var now = JulianDate.now();
    var refreshMode = networkLink.refreshMode;
    if (refreshMode === RefreshMode.INTERVAL) {
      if (defined(networkLinkControl)) {
        networkLink.time = Math.max(minRefreshPeriod, networkLink.time);
      }
    } else if (refreshMode === RefreshMode.EXPIRE) {
      var expires;
      if (defined(networkLinkControl)) {
        expires = queryStringValue(
          networkLinkControl,
          "expires",
          namespaces.kml
        );
      }
      if (defined(expires)) {
        try {
          var date = JulianDate.fromIso8601(expires);
          var diff = JulianDate.secondsDifference(date, now);
          if (diff > 0 && diff < minRefreshPeriod) {
            JulianDate.addSeconds(now, minRefreshPeriod, date);
          }
          networkLink.time = date;
        } catch (e) {
          oneTimeWarning(
            "kml-networkLinkControl-expires",
            "KML - NetworkLinkControl expires is not a valid date"
          );
          remove = true;
        }
      } else {
        oneTimeWarning(
          "kml-refreshMode-onExpire",
          "KML - refreshMode of onExpire requires the NetworkLinkControl to have an expires element"
        );
        remove = true;
      }
    }

    var networkLinkEntity = networkLink.entity;
    var entityCollection = dataSource._entityCollection;
    var newEntities = newEntityCollection.values;

    function removeChildren(entity) {
      entityCollection.remove(entity);
      var children = entity._children;
      var count = children.length;
      for (var i = 0; i < count; ++i) {
        removeChildren(children[i]);
      }
    }

    // Remove old entities
    entityCollection.suspendEvents();
    var entitiesCopy = entityCollection.values.slice();
    var i;
    for (i = 0; i < entitiesCopy.length; ++i) {
      var entityToRemove = entitiesCopy[i];
      if (entityToRemove.parent === networkLinkEntity) {
        entityToRemove.parent = undefined;
        removeChildren(entityToRemove);
      }
    }
    entityCollection.resumeEvents();

    // Add new entities
    entityCollection.suspendEvents();
    for (i = 0; i < newEntities.length; i++) {
      var newEntity = newEntities[i];
      if (!defined(newEntity.parent)) {
        newEntity.parent = networkLinkEntity;
        mergeAvailabilityWithParent(newEntity);
      }
      entityCollection.add(newEntity);
    }
    entityCollection.resumeEvents();

    // No refresh information remove it, otherwise update lastUpdate time
    if (remove) {
      networkLinks.remove(networkLink.id);
    } else {
      networkLink.lastUpdated = now;
    }

    var availability = entityCollection.computeAvailability();

    var start = availability.start;
    var stop = availability.stop;
    var isMinStart = JulianDate.equals(start, Iso8601.MINIMUM_VALUE);
    var isMaxStop = JulianDate.equals(stop, Iso8601.MAXIMUM_VALUE);
    if (!isMinStart || !isMaxStop) {
      var clock = dataSource._clock;

      if (clock.startTime !== start || clock.stopTime !== stop) {
        clock.startTime = start;
        clock.stopTime = stop;
        dataSource._changed.raiseEvent(dataSource);
      }
    }

    networkLink.updating = false;
    networkLink.needsUpdate = false;
    dataSource._refresh.raiseEvent(
      dataSource,
      processedHref.getUrlComponent(true)
    );
  };
}

var entitiesToIgnore = new AssociativeArray();

/**
 * Updates any NetworkLink that require updating.
 *
 * @param {JulianDate} time The simulation time.
 * @returns {Boolean} True if this data source is ready to be displayed at the provided time, false otherwise.
 */
KmlDataSource.prototype.update = function (time) {
  var networkLinks = this._networkLinks;
  if (networkLinks.length === 0) {
    return true;
  }

  var now = JulianDate.now();
  var that = this;

  entitiesToIgnore.removeAll();

  function recurseIgnoreEntities(entity) {
    var children = entity._children;
    var count = children.length;
    for (var i = 0; i < count; ++i) {
      var child = children[i];
      entitiesToIgnore.set(child.id, child);
      recurseIgnoreEntities(child);
    }
  }

  var cameraViewUpdate = false;
  var lastCameraView = this._lastCameraView;
  var camera = this._camera;
  if (
    defined(camera) &&
    !(
      camera.positionWC.equalsEpsilon(
        lastCameraView.position,
        CesiumMath.EPSILON7
      ) &&
      camera.directionWC.equalsEpsilon(
        lastCameraView.direction,
        CesiumMath.EPSILON7
      ) &&
      camera.upWC.equalsEpsilon(lastCameraView.up, CesiumMath.EPSILON7)
    )
  ) {
    // Camera has changed so update the last view
    lastCameraView.position = Cartesian3.clone(camera.positionWC);
    lastCameraView.direction = Cartesian3.clone(camera.directionWC);
    lastCameraView.up = Cartesian3.clone(camera.upWC);
    lastCameraView.bbox = camera.computeViewRectangle();
    cameraViewUpdate = true;
  }

  var newNetworkLinks = new AssociativeArray();
  var changed = false;
  networkLinks.values.forEach(function (networkLink) {
    var entity = networkLink.entity;
    if (entitiesToIgnore.contains(entity.id)) {
      return;
    }

    if (!networkLink.updating) {
      var doUpdate = false;
      if (networkLink.refreshMode === RefreshMode.INTERVAL) {
        if (
          JulianDate.secondsDifference(now, networkLink.lastUpdated) >
          networkLink.time
        ) {
          doUpdate = true;
        }
      } else if (networkLink.refreshMode === RefreshMode.EXPIRE) {
        if (JulianDate.greaterThan(now, networkLink.time)) {
          doUpdate = true;
        }
      } else if (networkLink.refreshMode === RefreshMode.STOP) {
        if (cameraViewUpdate) {
          networkLink.needsUpdate = true;
          networkLink.cameraUpdateTime = now;
        }

        if (
          networkLink.needsUpdate &&
          JulianDate.secondsDifference(now, networkLink.cameraUpdateTime) >=
            networkLink.time
        ) {
          doUpdate = true;
        }
      }

      if (doUpdate) {
        recurseIgnoreEntities(entity);
        networkLink.updating = true;
        var newEntityCollection = new EntityCollection();
        var href = networkLink.href.clone();

        href.setQueryParameters(networkLink.cookie);
        var ellipsoid = defaultValue(that._ellipsoid, Ellipsoid.WGS84);
        processNetworkLinkQueryString(
          href,
          that._camera,
          that._canvas,
          networkLink.viewBoundScale,
          lastCameraView.bbox,
          ellipsoid
        );

        load(that, newEntityCollection, href, { context: entity.id })
          .then(
            getNetworkLinkUpdateCallback(
              that,
              networkLink,
              newEntityCollection,
              newNetworkLinks,
              href
            )
          )
          .otherwise(function (error) {
            var msg =
              "NetworkLink " + networkLink.href + " refresh failed: " + error;
            console.log(msg);
            that._error.raiseEvent(that, msg);
          });
        changed = true;
      }
    }
    newNetworkLinks.set(networkLink.id, networkLink);
  });

  if (changed) {
    this._networkLinks = newNetworkLinks;
    this._changed.raiseEvent(this);
  }

  return true;
};

/**
 * Contains KML Feature data loaded into the <code>Entity.kml</code> property by {@link KmlDataSource}.
 * @alias KmlFeatureData
 * @constructor
 */
function KmlFeatureData() {
  /**
   * @typedef KmlFeatureData.Author
   * @type {Object}
   * @property {String} name Gets the name.
   * @property {String} uri Gets the URI.
   * @property {Number} age Gets the email.
   */

  /**
   * Gets the atom syndication format author field.
   * @type {KmlFeatureData.Author}
   */
  this.author = {
    name: undefined,
    uri: undefined,
    email: undefined,
  };

  /**
   * @typedef KmlFeatureData.Link
   * @type {Object}
   * @property {String} href Gets the href.
   * @property {String} hreflang Gets the language of the linked resource.
   * @property {String} rel Gets the link relation.
   * @property {String} type Gets the link type.
   * @property {String} title Gets the link title.
   * @property {String} length Gets the link length.
   */

  /**
   * Gets the link.
   * @type {KmlFeatureData.Link}
   */
  this.link = {
    href: undefined,
    hreflang: undefined,
    rel: undefined,
    type: undefined,
    title: undefined,
    length: undefined,
  };

  /**
   * Gets the unstructured address field.
   * @type {String}
   */
  this.address = undefined;
  /**
   * Gets the phone number.
   * @type {String}
   */
  this.phoneNumber = undefined;
  /**
   * Gets the snippet.
   * @type {String}
   */
  this.snippet = undefined;
  /**
   * Gets the extended data, parsed into a JSON object.
   * Currently only the <code>Data</code> property is supported.
   * <code>SchemaData</code> and custom data are ignored.
   * @type {String}
   */
  this.extendedData = undefined;
}

// For testing
KmlDataSource._DeferredLoading = DeferredLoading;
KmlDataSource._getTimestamp = getTimestamp;

export default KmlDataSource;
