import ArcType from "../Core/ArcType.js";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import ClockRange from "../Core/ClockRange.js";
import ClockStep from "../Core/ClockStep.js";
import Color from "../Core/Color.js";
import CornerType from "../Core/CornerType.js";
import Credit from "../Core/Credit.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import ExtrapolationType from "../Core/ExtrapolationType.js";
import getFilenameFromUri from "../Core/getFilenameFromUri.js";
import HermitePolynomialApproximation from "../Core/HermitePolynomialApproximation.js";
import Iso8601 from "../Core/Iso8601.js";
import JulianDate from "../Core/JulianDate.js";
import LagrangePolynomialApproximation from "../Core/LagrangePolynomialApproximation.js";
import LinearApproximation from "../Core/LinearApproximation.js";
import CesiumMath from "../Core/Math.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";
import Quaternion from "../Core/Quaternion.js";
import Rectangle from "../Core/Rectangle.js";
import ReferenceFrame from "../Core/ReferenceFrame.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Spherical from "../Core/Spherical.js";
import TimeInterval from "../Core/TimeInterval.js";
import TimeIntervalCollection from "../Core/TimeIntervalCollection.js";
import ClassificationType from "../Scene/ClassificationType.js";
import ColorBlendMode from "../Scene/ColorBlendMode.js";
import HeightReference from "../Scene/HeightReference.js";
import HorizontalOrigin from "../Scene/HorizontalOrigin.js";
import LabelStyle from "../Scene/LabelStyle.js";
import ShadowMode from "../Scene/ShadowMode.js";
import VerticalOrigin from "../Scene/VerticalOrigin.js";
import Uri from "urijs";
import BillboardGraphics from "./BillboardGraphics.js";
import BoxGraphics from "./BoxGraphics.js";
import CallbackProperty from "./CallbackProperty.js";
import CheckerboardMaterialProperty from "./CheckerboardMaterialProperty.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import CompositeMaterialProperty from "./CompositeMaterialProperty.js";
import CompositePositionProperty from "./CompositePositionProperty.js";
import CompositeProperty from "./CompositeProperty.js";
import ConstantPositionProperty from "./ConstantPositionProperty.js";
import ConstantProperty from "./ConstantProperty.js";
import CorridorGraphics from "./CorridorGraphics.js";
import CylinderGraphics from "./CylinderGraphics.js";
import DataSource from "./DataSource.js";
import DataSourceClock from "./DataSourceClock.js";
import EllipseGraphics from "./EllipseGraphics.js";
import EllipsoidGraphics from "./EllipsoidGraphics.js";
import EntityCluster from "./EntityCluster.js";
import EntityCollection from "./EntityCollection.js";
import GridMaterialProperty from "./GridMaterialProperty.js";
import ImageMaterialProperty from "./ImageMaterialProperty.js";
import LabelGraphics from "./LabelGraphics.js";
import ModelGraphics from "./ModelGraphics.js";
import NodeTransformationProperty from "./NodeTransformationProperty.js";
import PathGraphics from "./PathGraphics.js";
import PointGraphics from "./PointGraphics.js";
import PolygonGraphics from "./PolygonGraphics.js";
import PolylineArrowMaterialProperty from "./PolylineArrowMaterialProperty.js";
import PolylineDashMaterialProperty from "./PolylineDashMaterialProperty.js";
import PolylineGlowMaterialProperty from "./PolylineGlowMaterialProperty.js";
import PolylineGraphics from "./PolylineGraphics.js";
import PolylineOutlineMaterialProperty from "./PolylineOutlineMaterialProperty.js";
import PolylineVolumeGraphics from "./PolylineVolumeGraphics.js";
import PositionPropertyArray from "./PositionPropertyArray.js";
import Property from "./Property.js";
import PropertyArray from "./PropertyArray.js";
import PropertyBag from "./PropertyBag.js";
import RectangleGraphics from "./RectangleGraphics.js";
import ReferenceProperty from "./ReferenceProperty.js";
import Rotation from "./Rotation.js";
import SampledPositionProperty from "./SampledPositionProperty.js";
import SampledProperty from "./SampledProperty.js";
import StripeMaterialProperty from "./StripeMaterialProperty.js";
import StripeOrientation from "./StripeOrientation.js";
import TimeIntervalCollectionPositionProperty from "./TimeIntervalCollectionPositionProperty.js";
import TimeIntervalCollectionProperty from "./TimeIntervalCollectionProperty.js";
import VelocityOrientationProperty from "./VelocityOrientationProperty.js";
import VelocityVectorProperty from "./VelocityVectorProperty.js";
import WallGraphics from "./WallGraphics.js";
import Cesium3DTilesetGraphics from "./Cesium3DTilesetGraphics.js";
import SensorVolumePortionToDisplay from "../Scene/SensorVolumePortionToDisplay.js";

// A marker type to distinguish CZML properties where we need to end up with a unit vector.
// The data is still loaded into Cartesian3 objects but they are normalized.
function UnitCartesian3() {}
UnitCartesian3.packedLength = Cartesian3.packedLength;
UnitCartesian3.unpack = Cartesian3.unpack;
UnitCartesian3.pack = Cartesian3.pack;

// As a side note, for the purposes of CZML, Quaternion always indicates a unit quaternion.

let currentId;

function createReferenceProperty(entityCollection, referenceString) {
  if (referenceString[0] === "#") {
    referenceString = currentId + referenceString;
  }
  return ReferenceProperty.fromString(entityCollection, referenceString);
}

function createSpecializedProperty(type, entityCollection, packetData) {
  if (defined(packetData.reference)) {
    return createReferenceProperty(entityCollection, packetData.reference);
  }

  if (defined(packetData.velocityReference)) {
    const referenceProperty = createReferenceProperty(
      entityCollection,
      packetData.velocityReference
    );
    switch (type) {
      case Cartesian3:
      case UnitCartesian3:
        return new VelocityVectorProperty(
          referenceProperty,
          type === UnitCartesian3
        );
      case Quaternion:
        return new VelocityOrientationProperty(referenceProperty);
    }
  }

  throw new RuntimeError(`${JSON.stringify(packetData)} is not valid CZML.`);
}

function createAdapterProperty(property, adapterFunction) {
  return new CallbackProperty(function (time, result) {
    return adapterFunction(property.getValue(time, result));
  }, property.isConstant);
}

const scratchCartesian = new Cartesian3();
const scratchSpherical = new Spherical();
const scratchCartographic = new Cartographic();
const scratchTimeInterval = new TimeInterval();
const scratchQuaternion = new Quaternion();

function unwrapColorInterval(czmlInterval) {
  let rgbaf = czmlInterval.rgbaf;
  if (defined(rgbaf)) {
    return rgbaf;
  }

  const rgba = czmlInterval.rgba;
  if (!defined(rgba)) {
    return undefined;
  }

  const length = rgba.length;
  if (length === Color.packedLength) {
    return [
      Color.byteToFloat(rgba[0]),
      Color.byteToFloat(rgba[1]),
      Color.byteToFloat(rgba[2]),
      Color.byteToFloat(rgba[3]),
    ];
  }

  rgbaf = new Array(length);
  for (let i = 0; i < length; i += 5) {
    rgbaf[i] = rgba[i];
    rgbaf[i + 1] = Color.byteToFloat(rgba[i + 1]);
    rgbaf[i + 2] = Color.byteToFloat(rgba[i + 2]);
    rgbaf[i + 3] = Color.byteToFloat(rgba[i + 3]);
    rgbaf[i + 4] = Color.byteToFloat(rgba[i + 4]);
  }
  return rgbaf;
}

function unwrapUriInterval(czmlInterval, sourceUri) {
  const uri = defaultValue(czmlInterval.uri, czmlInterval);
  if (defined(sourceUri)) {
    return sourceUri.getDerivedResource({
      url: uri,
    });
  }

  return Resource.createIfNeeded(uri);
}

function unwrapRectangleInterval(czmlInterval) {
  let wsen = czmlInterval.wsen;
  if (defined(wsen)) {
    return wsen;
  }

  const wsenDegrees = czmlInterval.wsenDegrees;
  if (!defined(wsenDegrees)) {
    return undefined;
  }

  const length = wsenDegrees.length;
  if (length === Rectangle.packedLength) {
    return [
      CesiumMath.toRadians(wsenDegrees[0]),
      CesiumMath.toRadians(wsenDegrees[1]),
      CesiumMath.toRadians(wsenDegrees[2]),
      CesiumMath.toRadians(wsenDegrees[3]),
    ];
  }

  wsen = new Array(length);
  for (let i = 0; i < length; i += 5) {
    wsen[i] = wsenDegrees[i];
    wsen[i + 1] = CesiumMath.toRadians(wsenDegrees[i + 1]);
    wsen[i + 2] = CesiumMath.toRadians(wsenDegrees[i + 2]);
    wsen[i + 3] = CesiumMath.toRadians(wsenDegrees[i + 3]);
    wsen[i + 4] = CesiumMath.toRadians(wsenDegrees[i + 4]);
  }
  return wsen;
}

function convertUnitSphericalToCartesian(unitSpherical) {
  const length = unitSpherical.length;
  scratchSpherical.magnitude = 1.0;
  if (length === 2) {
    scratchSpherical.clock = unitSpherical[0];
    scratchSpherical.cone = unitSpherical[1];
    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
    return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
  }

  const result = new Array((length / 3) * 4);
  for (let i = 0, j = 0; i < length; i += 3, j += 4) {
    result[j] = unitSpherical[i];

    scratchSpherical.clock = unitSpherical[i + 1];
    scratchSpherical.cone = unitSpherical[i + 2];
    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

    result[j + 1] = scratchCartesian.x;
    result[j + 2] = scratchCartesian.y;
    result[j + 3] = scratchCartesian.z;
  }
  return result;
}

function convertSphericalToCartesian(spherical) {
  const length = spherical.length;
  if (length === 3) {
    scratchSpherical.clock = spherical[0];
    scratchSpherical.cone = spherical[1];
    scratchSpherical.magnitude = spherical[2];
    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);
    return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
  }

  const result = new Array(length);
  for (let i = 0; i < length; i += 4) {
    result[i] = spherical[i];

    scratchSpherical.clock = spherical[i + 1];
    scratchSpherical.cone = spherical[i + 2];
    scratchSpherical.magnitude = spherical[i + 3];
    Cartesian3.fromSpherical(scratchSpherical, scratchCartesian);

    result[i + 1] = scratchCartesian.x;
    result[i + 2] = scratchCartesian.y;
    result[i + 3] = scratchCartesian.z;
  }
  return result;
}

function convertCartographicRadiansToCartesian(cartographicRadians) {
  const length = cartographicRadians.length;
  if (length === 3) {
    scratchCartographic.longitude = cartographicRadians[0];
    scratchCartographic.latitude = cartographicRadians[1];
    scratchCartographic.height = cartographicRadians[2];
    Ellipsoid.default.cartographicToCartesian(
      scratchCartographic,
      scratchCartesian
    );
    return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
  }

  const result = new Array(length);
  for (let i = 0; i < length; i += 4) {
    result[i] = cartographicRadians[i];

    scratchCartographic.longitude = cartographicRadians[i + 1];
    scratchCartographic.latitude = cartographicRadians[i + 2];
    scratchCartographic.height = cartographicRadians[i + 3];
    Ellipsoid.default.cartographicToCartesian(
      scratchCartographic,
      scratchCartesian
    );

    result[i + 1] = scratchCartesian.x;
    result[i + 2] = scratchCartesian.y;
    result[i + 3] = scratchCartesian.z;
  }
  return result;
}

function convertCartographicDegreesToCartesian(cartographicDegrees) {
  const length = cartographicDegrees.length;
  if (length === 3) {
    scratchCartographic.longitude = CesiumMath.toRadians(
      cartographicDegrees[0]
    );
    scratchCartographic.latitude = CesiumMath.toRadians(cartographicDegrees[1]);
    scratchCartographic.height = cartographicDegrees[2];
    Ellipsoid.default.cartographicToCartesian(
      scratchCartographic,
      scratchCartesian
    );
    return [scratchCartesian.x, scratchCartesian.y, scratchCartesian.z];
  }

  const result = new Array(length);
  for (let i = 0; i < length; i += 4) {
    result[i] = cartographicDegrees[i];

    scratchCartographic.longitude = CesiumMath.toRadians(
      cartographicDegrees[i + 1]
    );
    scratchCartographic.latitude = CesiumMath.toRadians(
      cartographicDegrees[i + 2]
    );
    scratchCartographic.height = cartographicDegrees[i + 3];
    Ellipsoid.default.cartographicToCartesian(
      scratchCartographic,
      scratchCartesian
    );

    result[i + 1] = scratchCartesian.x;
    result[i + 2] = scratchCartesian.y;
    result[i + 3] = scratchCartesian.z;
  }
  return result;
}

function unwrapCartesianInterval(czmlInterval) {
  const cartesian = czmlInterval.cartesian;
  if (defined(cartesian)) {
    return cartesian;
  }

  const cartesianVelocity = czmlInterval.cartesianVelocity;
  if (defined(cartesianVelocity)) {
    return cartesianVelocity;
  }

  const unitCartesian = czmlInterval.unitCartesian;
  if (defined(unitCartesian)) {
    return unitCartesian;
  }

  const unitSpherical = czmlInterval.unitSpherical;
  if (defined(unitSpherical)) {
    return convertUnitSphericalToCartesian(unitSpherical);
  }

  const spherical = czmlInterval.spherical;
  if (defined(spherical)) {
    return convertSphericalToCartesian(spherical);
  }

  const cartographicRadians = czmlInterval.cartographicRadians;
  if (defined(cartographicRadians)) {
    return convertCartographicRadiansToCartesian(cartographicRadians);
  }

  const cartographicDegrees = czmlInterval.cartographicDegrees;
  if (defined(cartographicDegrees)) {
    return convertCartographicDegreesToCartesian(cartographicDegrees);
  }

  throw new RuntimeError(
    `${JSON.stringify(czmlInterval)} is not a valid CZML interval.`
  );
}

function normalizePackedCartesianArray(array, startingIndex) {
  Cartesian3.unpack(array, startingIndex, scratchCartesian);
  Cartesian3.normalize(scratchCartesian, scratchCartesian);
  Cartesian3.pack(scratchCartesian, array, startingIndex);
}

function unwrapUnitCartesianInterval(czmlInterval) {
  const cartesian = unwrapCartesianInterval(czmlInterval);
  if (cartesian.length === 3) {
    normalizePackedCartesianArray(cartesian, 0);
    return cartesian;
  }

  for (let i = 1; i < cartesian.length; i += 4) {
    normalizePackedCartesianArray(cartesian, i);
  }

  return cartesian;
}

function normalizePackedQuaternionArray(array, startingIndex) {
  Quaternion.unpack(array, startingIndex, scratchQuaternion);
  Quaternion.normalize(scratchQuaternion, scratchQuaternion);
  Quaternion.pack(scratchQuaternion, array, startingIndex);
}

function unwrapQuaternionInterval(czmlInterval) {
  const unitQuaternion = czmlInterval.unitQuaternion;
  if (defined(unitQuaternion)) {
    if (unitQuaternion.length === 4) {
      normalizePackedQuaternionArray(unitQuaternion, 0);
      return unitQuaternion;
    }

    for (let i = 1; i < unitQuaternion.length; i += 5) {
      normalizePackedQuaternionArray(unitQuaternion, i);
    }
  }
  return unitQuaternion;
}

function getPropertyType(czmlInterval) {
  // The associations in this function need to be kept in sync with the
  // associations in unwrapInterval.

  // Intentionally omitted due to conficts in CZML property names:
  // * Image (conflicts with Uri)
  // * Rotation (conflicts with Number)
  //
  // cartesianVelocity is also omitted due to incomplete support for
  // derivative information in CZML properties.
  // (Currently cartesianVelocity is hacked directly into the position processing code)
  if (typeof czmlInterval === "boolean") {
    return Boolean;
  } else if (typeof czmlInterval === "number") {
    return Number;
  } else if (typeof czmlInterval === "string") {
    return String;
  } else if (czmlInterval.hasOwnProperty("array")) {
    return Array;
  } else if (czmlInterval.hasOwnProperty("boolean")) {
    return Boolean;
  } else if (czmlInterval.hasOwnProperty("boundingRectangle")) {
    return BoundingRectangle;
  } else if (czmlInterval.hasOwnProperty("cartesian2")) {
    return Cartesian2;
  } else if (
    czmlInterval.hasOwnProperty("cartesian") ||
    czmlInterval.hasOwnProperty("spherical") ||
    czmlInterval.hasOwnProperty("cartographicRadians") ||
    czmlInterval.hasOwnProperty("cartographicDegrees")
  ) {
    return Cartesian3;
  } else if (
    czmlInterval.hasOwnProperty("unitCartesian") ||
    czmlInterval.hasOwnProperty("unitSpherical")
  ) {
    return UnitCartesian3;
  } else if (
    czmlInterval.hasOwnProperty("rgba") ||
    czmlInterval.hasOwnProperty("rgbaf")
  ) {
    return Color;
  } else if (czmlInterval.hasOwnProperty("arcType")) {
    return ArcType;
  } else if (czmlInterval.hasOwnProperty("classificationType")) {
    return ClassificationType;
  } else if (czmlInterval.hasOwnProperty("colorBlendMode")) {
    return ColorBlendMode;
  } else if (czmlInterval.hasOwnProperty("cornerType")) {
    return CornerType;
  } else if (czmlInterval.hasOwnProperty("heightReference")) {
    return HeightReference;
  } else if (czmlInterval.hasOwnProperty("horizontalOrigin")) {
    return HorizontalOrigin;
  } else if (czmlInterval.hasOwnProperty("date")) {
    return JulianDate;
  } else if (czmlInterval.hasOwnProperty("labelStyle")) {
    return LabelStyle;
  } else if (czmlInterval.hasOwnProperty("number")) {
    return Number;
  } else if (czmlInterval.hasOwnProperty("nearFarScalar")) {
    return NearFarScalar;
  } else if (czmlInterval.hasOwnProperty("distanceDisplayCondition")) {
    return DistanceDisplayCondition;
  } else if (
    czmlInterval.hasOwnProperty("object") ||
    czmlInterval.hasOwnProperty("value")
  ) {
    return Object;
  } else if (czmlInterval.hasOwnProperty("unitQuaternion")) {
    return Quaternion;
  } else if (czmlInterval.hasOwnProperty("shadowMode")) {
    return ShadowMode;
  } else if (czmlInterval.hasOwnProperty("string")) {
    return String;
  } else if (czmlInterval.hasOwnProperty("stripeOrientation")) {
    return StripeOrientation;
  } else if (
    czmlInterval.hasOwnProperty("wsen") ||
    czmlInterval.hasOwnProperty("wsenDegrees")
  ) {
    return Rectangle;
  } else if (czmlInterval.hasOwnProperty("uri")) {
    return Uri;
  } else if (czmlInterval.hasOwnProperty("verticalOrigin")) {
    return VerticalOrigin;
  }
  // fallback case
  return Object;
}

function unwrapInterval(type, czmlInterval, sourceUri) {
  // The associations in this function need to be kept in sync with the
  // associations in getPropertyType
  switch (type) {
    case ArcType:
      return ArcType[defaultValue(czmlInterval.arcType, czmlInterval)];
    case Array:
      return czmlInterval.array;
    case Boolean:
      return defaultValue(czmlInterval["boolean"], czmlInterval);
    case BoundingRectangle:
      return czmlInterval.boundingRectangle;
    case Cartesian2:
      return czmlInterval.cartesian2;
    case Cartesian3:
      return unwrapCartesianInterval(czmlInterval);
    case UnitCartesian3:
      return unwrapUnitCartesianInterval(czmlInterval);
    case Color:
      return unwrapColorInterval(czmlInterval);
    case ClassificationType:
      return ClassificationType[
        defaultValue(czmlInterval.classificationType, czmlInterval)
      ];
    case ColorBlendMode:
      return ColorBlendMode[
        defaultValue(czmlInterval.colorBlendMode, czmlInterval)
      ];
    case CornerType:
      return CornerType[defaultValue(czmlInterval.cornerType, czmlInterval)];
    case HeightReference:
      return HeightReference[
        defaultValue(czmlInterval.heightReference, czmlInterval)
      ];
    case HorizontalOrigin:
      return HorizontalOrigin[
        defaultValue(czmlInterval.horizontalOrigin, czmlInterval)
      ];
    case Image:
      return unwrapUriInterval(czmlInterval, sourceUri);
    case JulianDate:
      return JulianDate.fromIso8601(
        defaultValue(czmlInterval.date, czmlInterval)
      );
    case LabelStyle:
      return LabelStyle[defaultValue(czmlInterval.labelStyle, czmlInterval)];
    case Number:
      return defaultValue(czmlInterval.number, czmlInterval);
    case NearFarScalar:
      return czmlInterval.nearFarScalar;
    case DistanceDisplayCondition:
      return czmlInterval.distanceDisplayCondition;
    case Object:
      return defaultValue(
        defaultValue(czmlInterval.object, czmlInterval.value),
        czmlInterval
      );
    case Quaternion:
      return unwrapQuaternionInterval(czmlInterval);
    case Rotation:
      return defaultValue(czmlInterval.number, czmlInterval);
    case SensorVolumePortionToDisplay:
      return SensorVolumePortionToDisplay[
        defaultValue(czmlInterval.portionToDisplay, czmlInterval)
      ];
    case ShadowMode:
      return ShadowMode[
        defaultValue(
          defaultValue(czmlInterval.shadowMode, czmlInterval.shadows),
          czmlInterval
        )
      ];
    case String:
      return defaultValue(czmlInterval.string, czmlInterval);
    case StripeOrientation:
      return StripeOrientation[
        defaultValue(czmlInterval.stripeOrientation, czmlInterval)
      ];
    case Rectangle:
      return unwrapRectangleInterval(czmlInterval);
    case Uri:
      return unwrapUriInterval(czmlInterval, sourceUri);
    case VerticalOrigin:
      return VerticalOrigin[
        defaultValue(czmlInterval.verticalOrigin, czmlInterval)
      ];
    default:
      throw new RuntimeError(`Unknown CzmlDataSource interval type: ${type}`);
  }
}

const interpolators = {
  HERMITE: HermitePolynomialApproximation,
  LAGRANGE: LagrangePolynomialApproximation,
  LINEAR: LinearApproximation,
};

function updateInterpolationSettings(packetData, property) {
  const interpolationAlgorithm = packetData.interpolationAlgorithm;
  const interpolationDegree = packetData.interpolationDegree;
  if (defined(interpolationAlgorithm) || defined(interpolationDegree)) {
    property.setInterpolationOptions({
      interpolationAlgorithm: interpolators[interpolationAlgorithm],
      interpolationDegree: interpolationDegree,
    });
  }

  const forwardExtrapolationType = packetData.forwardExtrapolationType;
  if (defined(forwardExtrapolationType)) {
    property.forwardExtrapolationType =
      ExtrapolationType[forwardExtrapolationType];
  }

  const forwardExtrapolationDuration = packetData.forwardExtrapolationDuration;
  if (defined(forwardExtrapolationDuration)) {
    property.forwardExtrapolationDuration = forwardExtrapolationDuration;
  }

  const backwardExtrapolationType = packetData.backwardExtrapolationType;
  if (defined(backwardExtrapolationType)) {
    property.backwardExtrapolationType =
      ExtrapolationType[backwardExtrapolationType];
  }

  const backwardExtrapolationDuration =
    packetData.backwardExtrapolationDuration;
  if (defined(backwardExtrapolationDuration)) {
    property.backwardExtrapolationDuration = backwardExtrapolationDuration;
  }
}

const iso8601Scratch = {
  iso8601: undefined,
};

function intervalFromString(intervalString) {
  if (!defined(intervalString)) {
    return undefined;
  }
  iso8601Scratch.iso8601 = intervalString;
  return TimeInterval.fromIso8601(iso8601Scratch);
}

function wrapPropertyInInfiniteInterval(property) {
  const interval = Iso8601.MAXIMUM_INTERVAL.clone();
  interval.data = property;
  return interval;
}

function convertPropertyToComposite(property) {
  // Create the composite and add the old property, wrapped in an infinite interval.
  const composite = new CompositeProperty();
  composite.intervals.addInterval(wrapPropertyInInfiniteInterval(property));
  return composite;
}

function convertPositionPropertyToComposite(property) {
  // Create the composite and add the old property, wrapped in an infinite interval.
  const composite = new CompositePositionProperty(property.referenceFrame);
  composite.intervals.addInterval(wrapPropertyInInfiniteInterval(property));
  return composite;
}

function processProperty(
  type,
  object,
  propertyName,
  packetData,
  constrainedInterval,
  sourceUri,
  entityCollection
) {
  let combinedInterval = intervalFromString(packetData.interval);
  if (defined(constrainedInterval)) {
    if (defined(combinedInterval)) {
      combinedInterval = TimeInterval.intersect(
        combinedInterval,
        constrainedInterval,
        scratchTimeInterval
      );
    } else {
      combinedInterval = constrainedInterval;
    }
  }

  let packedLength;
  let unwrappedInterval;
  let unwrappedIntervalLength;

  // CZML properties can be defined in many ways.  Most ways represent a structure for
  // encoding a single value (number, string, cartesian, etc.)  Regardless of the value type,
  // if it encodes a single value it will get loaded into a ConstantProperty eventually.
  // Alternatively, there are ways of defining a property that require specialized
  // client-side representation. Currently, these are ReferenceProperty,
  // and client-side velocity computation properties such as VelocityVectorProperty.
  const isValue =
    !defined(packetData.reference) && !defined(packetData.velocityReference);
  const hasInterval =
    defined(combinedInterval) &&
    !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);

  if (packetData.delete === true) {
    // If deleting this property for all time, we can simply set to undefined and return.
    if (!hasInterval) {
      object[propertyName] = undefined;
      return;
    }

    // Deleting depends on the type of property we have.
    return removePropertyData(object[propertyName], combinedInterval);
  }

  let isSampled = false;

  if (isValue) {
    unwrappedInterval = unwrapInterval(type, packetData, sourceUri);
    if (!defined(unwrappedInterval)) {
      // not a known value type, bail
      return;
    }
    packedLength = defaultValue(type.packedLength, 1);
    unwrappedIntervalLength = defaultValue(unwrappedInterval.length, 1);
    isSampled =
      !defined(packetData.array) &&
      typeof unwrappedInterval !== "string" &&
      unwrappedIntervalLength > packedLength &&
      type !== Object;
  }

  // Rotation is a special case because it represents a native type (Number)
  // and therefore does not need to be unpacked when loaded as a constant value.
  const needsUnpacking = typeof type.unpack === "function" && type !== Rotation;

  // Any time a constant value is assigned, it completely blows away anything else.
  if (!isSampled && !hasInterval) {
    if (isValue) {
      object[propertyName] = new ConstantProperty(
        needsUnpacking ? type.unpack(unwrappedInterval, 0) : unwrappedInterval
      );
    } else {
      object[propertyName] = createSpecializedProperty(
        type,
        entityCollection,
        packetData
      );
    }
    return;
  }

  let property = object[propertyName];

  let epoch;
  const packetEpoch = packetData.epoch;
  if (defined(packetEpoch)) {
    epoch = JulianDate.fromIso8601(packetEpoch);
  }

  // Without an interval, any sampled value is infinite, meaning it completely
  // replaces any non-sampled property that may exist.
  if (isSampled && !hasInterval) {
    if (!(property instanceof SampledProperty)) {
      object[propertyName] = property = new SampledProperty(type);
    }
    property.addSamplesPackedArray(unwrappedInterval, epoch);
    updateInterpolationSettings(packetData, property);
    return;
  }

  let interval;

  // A constant value with an interval is normally part of a TimeIntervalCollection,
  // However, if the current property is not a time-interval collection, we need
  // to turn it into a Composite, preserving the old data with the new interval.
  if (!isSampled && hasInterval) {
    // Create a new interval for the constant value.
    combinedInterval = combinedInterval.clone();
    if (isValue) {
      combinedInterval.data = needsUnpacking
        ? type.unpack(unwrappedInterval, 0)
        : unwrappedInterval;
    } else {
      combinedInterval.data = createSpecializedProperty(
        type,
        entityCollection,
        packetData
      );
    }

    // If no property exists, simply use a new interval collection
    if (!defined(property)) {
      object[propertyName] = property = isValue
        ? new TimeIntervalCollectionProperty()
        : new CompositeProperty();
    }

    if (isValue && property instanceof TimeIntervalCollectionProperty) {
      // If we created a collection, or it already was one, use it.
      property.intervals.addInterval(combinedInterval);
    } else if (property instanceof CompositeProperty) {
      // If the collection was already a CompositeProperty, use it.
      if (isValue) {
        combinedInterval.data = new ConstantProperty(combinedInterval.data);
      }
      property.intervals.addInterval(combinedInterval);
    } else {
      // Otherwise, create a CompositeProperty but preserve the existing data.
      object[propertyName] = property = convertPropertyToComposite(property);

      // Change the new data to a ConstantProperty and add it.
      if (isValue) {
        combinedInterval.data = new ConstantProperty(combinedInterval.data);
      }
      property.intervals.addInterval(combinedInterval);
    }

    return;
  }

  // isSampled && hasInterval
  if (!defined(property)) {
    object[propertyName] = property = new CompositeProperty();
  }

  // Create a CompositeProperty but preserve the existing data.
  if (!(property instanceof CompositeProperty)) {
    object[propertyName] = property = convertPropertyToComposite(property);
  }

  // Check if the interval already exists in the composite.
  const intervals = property.intervals;
  interval = intervals.findInterval(combinedInterval);
  if (!defined(interval) || !(interval.data instanceof SampledProperty)) {
    // If not, create a SampledProperty for it.
    interval = combinedInterval.clone();
    interval.data = new SampledProperty(type);
    intervals.addInterval(interval);
  }
  interval.data.addSamplesPackedArray(unwrappedInterval, epoch);
  updateInterpolationSettings(packetData, interval.data);
}

function removePropertyData(property, interval) {
  if (property instanceof SampledProperty) {
    property.removeSamples(interval);
    return;
  } else if (property instanceof TimeIntervalCollectionProperty) {
    property.intervals.removeInterval(interval);
    return;
  } else if (property instanceof CompositeProperty) {
    const intervals = property.intervals;
    for (let i = 0; i < intervals.length; ++i) {
      const intersection = TimeInterval.intersect(
        intervals.get(i),
        interval,
        scratchTimeInterval
      );
      if (!intersection.isEmpty) {
        // remove data from the contained properties
        removePropertyData(intersection.data, interval);
      }
    }
    // remove the intervals from the composite
    intervals.removeInterval(interval);
    return;
  }
}

function processPacketData(
  type,
  object,
  propertyName,
  packetData,
  interval,
  sourceUri,
  entityCollection
) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, len = packetData.length; i < len; ++i) {
      processProperty(
        type,
        object,
        propertyName,
        packetData[i],
        interval,
        sourceUri,
        entityCollection
      );
    }
  } else {
    processProperty(
      type,
      object,
      propertyName,
      packetData,
      interval,
      sourceUri,
      entityCollection
    );
  }
}

function processPositionProperty(
  object,
  propertyName,
  packetData,
  constrainedInterval,
  sourceUri,
  entityCollection
) {
  let combinedInterval = intervalFromString(packetData.interval);
  if (defined(constrainedInterval)) {
    if (defined(combinedInterval)) {
      combinedInterval = TimeInterval.intersect(
        combinedInterval,
        constrainedInterval,
        scratchTimeInterval
      );
    } else {
      combinedInterval = constrainedInterval;
    }
  }

  const numberOfDerivatives = defined(packetData.cartesianVelocity) ? 1 : 0;
  const packedLength = Cartesian3.packedLength * (numberOfDerivatives + 1);
  let unwrappedInterval;
  let unwrappedIntervalLength;
  const isValue = !defined(packetData.reference);
  const hasInterval =
    defined(combinedInterval) &&
    !combinedInterval.equals(Iso8601.MAXIMUM_INTERVAL);

  if (packetData.delete === true) {
    // If deleting this property for all time, we can simply set to undefined and return.
    if (!hasInterval) {
      object[propertyName] = undefined;
      return;
    }

    // Deleting depends on the type of property we have.
    return removePositionPropertyData(object[propertyName], combinedInterval);
  }

  let referenceFrame;
  let isSampled = false;

  if (isValue) {
    if (defined(packetData.referenceFrame)) {
      referenceFrame = ReferenceFrame[packetData.referenceFrame];
    }
    referenceFrame = defaultValue(referenceFrame, ReferenceFrame.FIXED);
    unwrappedInterval = unwrapCartesianInterval(packetData);
    unwrappedIntervalLength = defaultValue(unwrappedInterval.length, 1);
    isSampled = unwrappedIntervalLength > packedLength;
  }

  // Any time a constant value is assigned, it completely blows away anything else.
  if (!isSampled && !hasInterval) {
    if (isValue) {
      object[propertyName] = new ConstantPositionProperty(
        Cartesian3.unpack(unwrappedInterval),
        referenceFrame
      );
    } else {
      object[propertyName] = createReferenceProperty(
        entityCollection,
        packetData.reference
      );
    }
    return;
  }

  let property = object[propertyName];

  let epoch;
  const packetEpoch = packetData.epoch;
  if (defined(packetEpoch)) {
    epoch = JulianDate.fromIso8601(packetEpoch);
  }

  // Without an interval, any sampled value is infinite, meaning it completely
  // replaces any non-sampled property that may exist.
  if (isSampled && !hasInterval) {
    if (
      !(property instanceof SampledPositionProperty) ||
      (defined(referenceFrame) && property.referenceFrame !== referenceFrame)
    ) {
      object[propertyName] = property = new SampledPositionProperty(
        referenceFrame,
        numberOfDerivatives
      );
    }
    property.addSamplesPackedArray(unwrappedInterval, epoch);
    updateInterpolationSettings(packetData, property);
    return;
  }

  let interval;

  // A constant value with an interval is normally part of a TimeIntervalCollection,
  // However, if the current property is not a time-interval collection, we need
  // to turn it into a Composite, preserving the old data with the new interval.
  if (!isSampled && hasInterval) {
    // Create a new interval for the constant value.
    combinedInterval = combinedInterval.clone();
    if (isValue) {
      combinedInterval.data = Cartesian3.unpack(unwrappedInterval);
    } else {
      combinedInterval.data = createReferenceProperty(
        entityCollection,
        packetData.reference
      );
    }

    // If no property exists, simply use a new interval collection
    if (!defined(property)) {
      if (isValue) {
        property = new TimeIntervalCollectionPositionProperty(referenceFrame);
      } else {
        property = new CompositePositionProperty(referenceFrame);
      }
      object[propertyName] = property;
    }

    if (
      isValue &&
      property instanceof TimeIntervalCollectionPositionProperty &&
      defined(referenceFrame) &&
      property.referenceFrame === referenceFrame
    ) {
      // If we create a collection, or it already existed, use it.
      property.intervals.addInterval(combinedInterval);
    } else if (property instanceof CompositePositionProperty) {
      // If the collection was already a CompositePositionProperty, use it.
      if (isValue) {
        combinedInterval.data = new ConstantPositionProperty(
          combinedInterval.data,
          referenceFrame
        );
      }
      property.intervals.addInterval(combinedInterval);
    } else {
      // Otherwise, create a CompositePositionProperty but preserve the existing data.
      object[propertyName] = property = convertPositionPropertyToComposite(
        property
      );

      // Change the new data to a ConstantPositionProperty and add it.
      if (isValue) {
        combinedInterval.data = new ConstantPositionProperty(
          combinedInterval.data,
          referenceFrame
        );
      }
      property.intervals.addInterval(combinedInterval);
    }

    return;
  }

  // isSampled && hasInterval
  if (!defined(property)) {
    object[propertyName] = property = new CompositePositionProperty(
      referenceFrame
    );
  } else if (!(property instanceof CompositePositionProperty)) {
    // Create a CompositeProperty but preserve the existing data.
    object[propertyName] = property = convertPositionPropertyToComposite(
      property
    );
  }

  // Check if the interval already exists in the composite.
  const intervals = property.intervals;
  interval = intervals.findInterval(combinedInterval);
  if (
    !defined(interval) ||
    !(interval.data instanceof SampledPositionProperty) ||
    (defined(referenceFrame) && interval.data.referenceFrame !== referenceFrame)
  ) {
    // If not, create a SampledPositionProperty for it.
    interval = combinedInterval.clone();
    interval.data = new SampledPositionProperty(
      referenceFrame,
      numberOfDerivatives
    );
    intervals.addInterval(interval);
  }
  interval.data.addSamplesPackedArray(unwrappedInterval, epoch);
  updateInterpolationSettings(packetData, interval.data);
}

function removePositionPropertyData(property, interval) {
  if (property instanceof SampledPositionProperty) {
    property.removeSamples(interval);
    return;
  } else if (property instanceof TimeIntervalCollectionPositionProperty) {
    property.intervals.removeInterval(interval);
    return;
  } else if (property instanceof CompositePositionProperty) {
    const intervals = property.intervals;
    for (let i = 0; i < intervals.length; ++i) {
      const intersection = TimeInterval.intersect(
        intervals.get(i),
        interval,
        scratchTimeInterval
      );
      if (!intersection.isEmpty) {
        // remove data from the contained properties
        removePositionPropertyData(intersection.data, interval);
      }
    }
    // remove the intervals from the composite
    intervals.removeInterval(interval);
    return;
  }
}

function processPositionPacketData(
  object,
  propertyName,
  packetData,
  interval,
  sourceUri,
  entityCollection
) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, len = packetData.length; i < len; ++i) {
      processPositionProperty(
        object,
        propertyName,
        packetData[i],
        interval,
        sourceUri,
        entityCollection
      );
    }
  } else {
    processPositionProperty(
      object,
      propertyName,
      packetData,
      interval,
      sourceUri,
      entityCollection
    );
  }
}

function processShapePacketData(
  object,
  propertyName,
  packetData,
  entityCollection
) {
  if (defined(packetData.references)) {
    processReferencesArrayPacketData(
      object,
      propertyName,
      packetData.references,
      packetData.interval,
      entityCollection,
      PropertyArray,
      CompositeProperty
    );
  } else {
    if (defined(packetData.cartesian2)) {
      packetData.array = Cartesian2.unpackArray(packetData.cartesian2);
    } else if (defined(packetData.cartesian)) {
      // for backwards compatibility, also accept `cartesian`
      packetData.array = Cartesian2.unpackArray(packetData.cartesian);
    }

    if (defined(packetData.array)) {
      processPacketData(
        Array,
        object,
        propertyName,
        packetData,
        undefined,
        undefined,
        entityCollection
      );
    }
  }
}

function processMaterialProperty(
  object,
  propertyName,
  packetData,
  constrainedInterval,
  sourceUri,
  entityCollection
) {
  let combinedInterval = intervalFromString(packetData.interval);
  if (defined(constrainedInterval)) {
    if (defined(combinedInterval)) {
      combinedInterval = TimeInterval.intersect(
        combinedInterval,
        constrainedInterval,
        scratchTimeInterval
      );
    } else {
      combinedInterval = constrainedInterval;
    }
  }

  let property = object[propertyName];
  let existingMaterial;
  let existingInterval;

  if (defined(combinedInterval)) {
    if (!(property instanceof CompositeMaterialProperty)) {
      property = new CompositeMaterialProperty();
      object[propertyName] = property;
    }
    //See if we already have data at that interval.
    const thisIntervals = property.intervals;
    existingInterval = thisIntervals.findInterval({
      start: combinedInterval.start,
      stop: combinedInterval.stop,
    });
    if (defined(existingInterval)) {
      //We have an interval, but we need to make sure the
      //new data is the same type of material as the old data.
      existingMaterial = existingInterval.data;
    } else {
      //If not, create it.
      existingInterval = combinedInterval.clone();
      thisIntervals.addInterval(existingInterval);
    }
  } else {
    existingMaterial = property;
  }

  let materialData;
  if (defined(packetData.solidColor)) {
    if (!(existingMaterial instanceof ColorMaterialProperty)) {
      existingMaterial = new ColorMaterialProperty();
    }
    materialData = packetData.solidColor;
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      undefined,
      entityCollection
    );
  } else if (defined(packetData.grid)) {
    if (!(existingMaterial instanceof GridMaterialProperty)) {
      existingMaterial = new GridMaterialProperty();
    }
    materialData = packetData.grid;
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "cellAlpha",
      materialData.cellAlpha,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Cartesian2,
      existingMaterial,
      "lineCount",
      materialData.lineCount,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Cartesian2,
      existingMaterial,
      "lineThickness",
      materialData.lineThickness,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Cartesian2,
      existingMaterial,
      "lineOffset",
      materialData.lineOffset,
      undefined,
      sourceUri,
      entityCollection
    );
  } else if (defined(packetData.image)) {
    if (!(existingMaterial instanceof ImageMaterialProperty)) {
      existingMaterial = new ImageMaterialProperty();
    }
    materialData = packetData.image;
    processPacketData(
      Image,
      existingMaterial,
      "image",
      materialData.image,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Cartesian2,
      existingMaterial,
      "repeat",
      materialData.repeat,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Boolean,
      existingMaterial,
      "transparent",
      materialData.transparent,
      undefined,
      sourceUri,
      entityCollection
    );
  } else if (defined(packetData.stripe)) {
    if (!(existingMaterial instanceof StripeMaterialProperty)) {
      existingMaterial = new StripeMaterialProperty();
    }
    materialData = packetData.stripe;
    processPacketData(
      StripeOrientation,
      existingMaterial,
      "orientation",
      materialData.orientation,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Color,
      existingMaterial,
      "evenColor",
      materialData.evenColor,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Color,
      existingMaterial,
      "oddColor",
      materialData.oddColor,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "offset",
      materialData.offset,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "repeat",
      materialData.repeat,
      undefined,
      sourceUri,
      entityCollection
    );
  } else if (defined(packetData.polylineOutline)) {
    if (!(existingMaterial instanceof PolylineOutlineMaterialProperty)) {
      existingMaterial = new PolylineOutlineMaterialProperty();
    }
    materialData = packetData.polylineOutline;
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Color,
      existingMaterial,
      "outlineColor",
      materialData.outlineColor,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "outlineWidth",
      materialData.outlineWidth,
      undefined,
      sourceUri,
      entityCollection
    );
  } else if (defined(packetData.polylineGlow)) {
    if (!(existingMaterial instanceof PolylineGlowMaterialProperty)) {
      existingMaterial = new PolylineGlowMaterialProperty();
    }
    materialData = packetData.polylineGlow;
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "glowPower",
      materialData.glowPower,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "taperPower",
      materialData.taperPower,
      undefined,
      sourceUri,
      entityCollection
    );
  } else if (defined(packetData.polylineArrow)) {
    if (!(existingMaterial instanceof PolylineArrowMaterialProperty)) {
      existingMaterial = new PolylineArrowMaterialProperty();
    }
    materialData = packetData.polylineArrow;
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      undefined,
      entityCollection
    );
  } else if (defined(packetData.polylineDash)) {
    if (!(existingMaterial instanceof PolylineDashMaterialProperty)) {
      existingMaterial = new PolylineDashMaterialProperty();
    }
    materialData = packetData.polylineDash;
    processPacketData(
      Color,
      existingMaterial,
      "color",
      materialData.color,
      undefined,
      undefined,
      entityCollection
    );
    processPacketData(
      Color,
      existingMaterial,
      "gapColor",
      materialData.gapColor,
      undefined,
      undefined,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "dashLength",
      materialData.dashLength,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Number,
      existingMaterial,
      "dashPattern",
      materialData.dashPattern,
      undefined,
      sourceUri,
      entityCollection
    );
  } else if (defined(packetData.checkerboard)) {
    if (!(existingMaterial instanceof CheckerboardMaterialProperty)) {
      existingMaterial = new CheckerboardMaterialProperty();
    }
    materialData = packetData.checkerboard;
    processPacketData(
      Color,
      existingMaterial,
      "evenColor",
      materialData.evenColor,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Color,
      existingMaterial,
      "oddColor",
      materialData.oddColor,
      undefined,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Cartesian2,
      existingMaterial,
      "repeat",
      materialData.repeat,
      undefined,
      sourceUri,
      entityCollection
    );
  }

  if (defined(existingInterval)) {
    existingInterval.data = existingMaterial;
  } else {
    object[propertyName] = existingMaterial;
  }
}

function processMaterialPacketData(
  object,
  propertyName,
  packetData,
  interval,
  sourceUri,
  entityCollection
) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, len = packetData.length; i < len; ++i) {
      processMaterialProperty(
        object,
        propertyName,
        packetData[i],
        interval,
        sourceUri,
        entityCollection
      );
    }
  } else {
    processMaterialProperty(
      object,
      propertyName,
      packetData,
      interval,
      sourceUri,
      entityCollection
    );
  }
}

function processName(entity, packet, entityCollection, sourceUri) {
  const nameData = packet.name;
  if (defined(nameData)) {
    entity.name = packet.name;
  }
}

function processDescription(entity, packet, entityCollection, sourceUri) {
  const descriptionData = packet.description;
  if (defined(descriptionData)) {
    processPacketData(
      String,
      entity,
      "description",
      descriptionData,
      undefined,
      sourceUri,
      entityCollection
    );
  }
}

function processPosition(entity, packet, entityCollection, sourceUri) {
  const positionData = packet.position;
  if (defined(positionData)) {
    processPositionPacketData(
      entity,
      "position",
      positionData,
      undefined,
      sourceUri,
      entityCollection
    );
  }
}

function processViewFrom(entity, packet, entityCollection, sourceUri) {
  const viewFromData = packet.viewFrom;
  if (defined(viewFromData)) {
    processPacketData(
      Cartesian3,
      entity,
      "viewFrom",
      viewFromData,
      undefined,
      sourceUri,
      entityCollection
    );
  }
}

function processOrientation(entity, packet, entityCollection, sourceUri) {
  const orientationData = packet.orientation;
  if (defined(orientationData)) {
    processPacketData(
      Quaternion,
      entity,
      "orientation",
      orientationData,
      undefined,
      sourceUri,
      entityCollection
    );
  }
}

function processProperties(entity, packet, entityCollection, sourceUri) {
  const propertiesData = packet.properties;
  if (defined(propertiesData)) {
    if (!defined(entity.properties)) {
      entity.properties = new PropertyBag();
    }

    // We cannot simply call processPacketData(entity, 'properties', propertyData, undefined, sourceUri, entityCollection)
    // because each property of "properties" may vary separately.
    // The properties will be accessible as entity.properties.myprop.getValue(time).

    for (const key in propertiesData) {
      if (propertiesData.hasOwnProperty(key)) {
        if (!entity.properties.hasProperty(key)) {
          entity.properties.addProperty(key);
        }

        const propertyData = propertiesData[key];
        if (Array.isArray(propertyData)) {
          for (let i = 0, len = propertyData.length; i < len; ++i) {
            processProperty(
              getPropertyType(propertyData[i]),
              entity.properties,
              key,
              propertyData[i],
              undefined,
              sourceUri,
              entityCollection
            );
          }
        } else {
          processProperty(
            getPropertyType(propertyData),
            entity.properties,
            key,
            propertyData,
            undefined,
            sourceUri,
            entityCollection
          );
        }
      }
    }
  }
}

function processReferencesArrayPacketData(
  object,
  propertyName,
  references,
  interval,
  entityCollection,
  PropertyArrayType,
  CompositePropertyArrayType
) {
  const properties = references.map(function (reference) {
    return createReferenceProperty(entityCollection, reference);
  });

  if (defined(interval)) {
    interval = intervalFromString(interval);
    let property = object[propertyName];
    if (!(property instanceof CompositePropertyArrayType)) {
      // If the property was not already a CompositeProperty,
      // create a CompositeProperty but preserve the existing data.

      // Create the composite and add the old property, wrapped in an infinite interval.
      const composite = new CompositePropertyArrayType();
      composite.intervals.addInterval(wrapPropertyInInfiniteInterval(property));

      object[propertyName] = property = composite;
    }

    interval.data = new PropertyArrayType(properties);
    property.intervals.addInterval(interval);
  } else {
    object[propertyName] = new PropertyArrayType(properties);
  }
}

function processArrayPacketData(
  object,
  propertyName,
  packetData,
  entityCollection
) {
  const references = packetData.references;
  if (defined(references)) {
    processReferencesArrayPacketData(
      object,
      propertyName,
      references,
      packetData.interval,
      entityCollection,
      PropertyArray,
      CompositeProperty
    );
  } else {
    processPacketData(
      Array,
      object,
      propertyName,
      packetData,
      undefined,
      undefined,
      entityCollection
    );
  }
}

function processArray(object, propertyName, packetData, entityCollection) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, length = packetData.length; i < length; ++i) {
      processArrayPacketData(
        object,
        propertyName,
        packetData[i],
        entityCollection
      );
    }
  } else {
    processArrayPacketData(object, propertyName, packetData, entityCollection);
  }
}

function processPositionArrayPacketData(
  object,
  propertyName,
  packetData,
  entityCollection
) {
  const references = packetData.references;
  if (defined(references)) {
    processReferencesArrayPacketData(
      object,
      propertyName,
      references,
      packetData.interval,
      entityCollection,
      PositionPropertyArray,
      CompositePositionProperty
    );
  } else {
    if (defined(packetData.cartesian)) {
      packetData.array = Cartesian3.unpackArray(packetData.cartesian);
    } else if (defined(packetData.cartographicRadians)) {
      packetData.array = Cartesian3.fromRadiansArrayHeights(
        packetData.cartographicRadians,
        Ellipsoid.default
      );
    } else if (defined(packetData.cartographicDegrees)) {
      packetData.array = Cartesian3.fromDegreesArrayHeights(
        packetData.cartographicDegrees,
        Ellipsoid.default
      );
    }

    if (defined(packetData.array)) {
      processPacketData(
        Array,
        object,
        propertyName,
        packetData,
        undefined,
        undefined,
        entityCollection
      );
    }
  }
}

function processPositionArray(
  object,
  propertyName,
  packetData,
  entityCollection
) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, length = packetData.length; i < length; ++i) {
      processPositionArrayPacketData(
        object,
        propertyName,
        packetData[i],
        entityCollection
      );
    }
  } else {
    processPositionArrayPacketData(
      object,
      propertyName,
      packetData,
      entityCollection
    );
  }
}

function unpackCartesianArray(array) {
  return Cartesian3.unpackArray(array);
}

function unpackCartographicRadiansArray(array) {
  return Cartesian3.fromRadiansArrayHeights(array, Ellipsoid.default);
}

function unpackCartographicDegreesArray(array) {
  return Cartesian3.fromDegreesArrayHeights(array, Ellipsoid.default);
}

function processPositionArrayOfArraysPacketData(
  object,
  propertyName,
  packetData,
  entityCollection
) {
  const references = packetData.references;
  if (defined(references)) {
    const properties = references.map(function (referenceArray) {
      const tempObj = {};
      processReferencesArrayPacketData(
        tempObj,
        "positions",
        referenceArray,
        packetData.interval,
        entityCollection,
        PositionPropertyArray,
        CompositePositionProperty
      );
      return tempObj.positions;
    });
    object[propertyName] = new PositionPropertyArray(properties);
  } else {
    if (defined(packetData.cartesian)) {
      packetData.array = packetData.cartesian.map(unpackCartesianArray);
    } else if (defined(packetData.cartographicRadians)) {
      packetData.array = packetData.cartographicRadians.map(
        unpackCartographicRadiansArray
      );
    } else if (defined(packetData.cartographicDegrees)) {
      packetData.array = packetData.cartographicDegrees.map(
        unpackCartographicDegreesArray
      );
    }

    if (defined(packetData.array)) {
      processPacketData(
        Array,
        object,
        propertyName,
        packetData,
        undefined,
        undefined,
        entityCollection
      );
    }
  }
}

function processPositionArrayOfArrays(
  object,
  propertyName,
  packetData,
  entityCollection
) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, length = packetData.length; i < length; ++i) {
      processPositionArrayOfArraysPacketData(
        object,
        propertyName,
        packetData[i],
        entityCollection
      );
    }
  } else {
    processPositionArrayOfArraysPacketData(
      object,
      propertyName,
      packetData,
      entityCollection
    );
  }
}

function processShape(object, propertyName, packetData, entityCollection) {
  if (!defined(packetData)) {
    return;
  }

  if (Array.isArray(packetData)) {
    for (let i = 0, length = packetData.length; i < length; i++) {
      processShapePacketData(
        object,
        propertyName,
        packetData[i],
        entityCollection
      );
    }
  } else {
    processShapePacketData(object, propertyName, packetData, entityCollection);
  }
}

function processAvailability(entity, packet, entityCollection, sourceUri) {
  const packetData = packet.availability;
  if (!defined(packetData)) {
    return;
  }

  let intervals;
  if (Array.isArray(packetData)) {
    for (let i = 0, len = packetData.length; i < len; ++i) {
      if (!defined(intervals)) {
        intervals = new TimeIntervalCollection();
      }
      intervals.addInterval(intervalFromString(packetData[i]));
    }
  } else {
    intervals = new TimeIntervalCollection();
    intervals.addInterval(intervalFromString(packetData));
  }
  entity.availability = intervals;
}

function processAlignedAxis(
  billboard,
  packetData,
  interval,
  sourceUri,
  entityCollection
) {
  if (!defined(packetData)) {
    return;
  }

  processPacketData(
    UnitCartesian3,
    billboard,
    "alignedAxis",
    packetData,
    interval,
    sourceUri,
    entityCollection
  );
}

function processBillboard(entity, packet, entityCollection, sourceUri) {
  const billboardData = packet.billboard;
  if (!defined(billboardData)) {
    return;
  }

  const interval = intervalFromString(billboardData.interval);
  let billboard = entity.billboard;
  if (!defined(billboard)) {
    entity.billboard = billboard = new BillboardGraphics();
  }

  processPacketData(
    Boolean,
    billboard,
    "show",
    billboardData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Image,
    billboard,
    "image",
    billboardData.image,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    billboard,
    "scale",
    billboardData.scale,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian2,
    billboard,
    "pixelOffset",
    billboardData.pixelOffset,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian3,
    billboard,
    "eyeOffset",
    billboardData.eyeOffset,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HorizontalOrigin,
    billboard,
    "horizontalOrigin",
    billboardData.horizontalOrigin,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    VerticalOrigin,
    billboard,
    "verticalOrigin",
    billboardData.verticalOrigin,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    billboard,
    "heightReference",
    billboardData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    billboard,
    "color",
    billboardData.color,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rotation,
    billboard,
    "rotation",
    billboardData.rotation,
    interval,
    sourceUri,
    entityCollection
  );
  processAlignedAxis(
    billboard,
    billboardData.alignedAxis,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    billboard,
    "sizeInMeters",
    billboardData.sizeInMeters,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    billboard,
    "width",
    billboardData.width,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    billboard,
    "height",
    billboardData.height,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    billboard,
    "scaleByDistance",
    billboardData.scaleByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    billboard,
    "translucencyByDistance",
    billboardData.translucencyByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    billboard,
    "pixelOffsetScaleByDistance",
    billboardData.pixelOffsetScaleByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    BoundingRectangle,
    billboard,
    "imageSubRegion",
    billboardData.imageSubRegion,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    billboard,
    "distanceDisplayCondition",
    billboardData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    billboard,
    "disableDepthTestDistance",
    billboardData.disableDepthTestDistance,
    interval,
    sourceUri,
    entityCollection
  );
}

function processBox(entity, packet, entityCollection, sourceUri) {
  const boxData = packet.box;
  if (!defined(boxData)) {
    return;
  }

  const interval = intervalFromString(boxData.interval);
  let box = entity.box;
  if (!defined(box)) {
    entity.box = box = new BoxGraphics();
  }

  processPacketData(
    Boolean,
    box,
    "show",
    boxData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian3,
    box,
    "dimensions",
    boxData.dimensions,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    box,
    "heightReference",
    boxData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    box,
    "fill",
    boxData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    box,
    "material",
    boxData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    box,
    "outline",
    boxData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    box,
    "outlineColor",
    boxData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    box,
    "outlineWidth",
    boxData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    box,
    "shadows",
    boxData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    box,
    "distanceDisplayCondition",
    boxData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
}

function processCorridor(entity, packet, entityCollection, sourceUri) {
  const corridorData = packet.corridor;
  if (!defined(corridorData)) {
    return;
  }

  const interval = intervalFromString(corridorData.interval);
  let corridor = entity.corridor;
  if (!defined(corridor)) {
    entity.corridor = corridor = new CorridorGraphics();
  }

  processPacketData(
    Boolean,
    corridor,
    "show",
    corridorData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPositionArray(
    corridor,
    "positions",
    corridorData.positions,
    entityCollection
  );
  processPacketData(
    Number,
    corridor,
    "width",
    corridorData.width,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    corridor,
    "height",
    corridorData.height,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    corridor,
    "heightReference",
    corridorData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    corridor,
    "extrudedHeight",
    corridorData.extrudedHeight,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    corridor,
    "extrudedHeightReference",
    corridorData.extrudedHeightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    CornerType,
    corridor,
    "cornerType",
    corridorData.cornerType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    corridor,
    "granularity",
    corridorData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    corridor,
    "fill",
    corridorData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    corridor,
    "material",
    corridorData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    corridor,
    "outline",
    corridorData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    corridor,
    "outlineColor",
    corridorData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    corridor,
    "outlineWidth",
    corridorData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    corridor,
    "shadows",
    corridorData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    corridor,
    "distanceDisplayCondition",
    corridorData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ClassificationType,
    corridor,
    "classificationType",
    corridorData.classificationType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    corridor,
    "zIndex",
    corridorData.zIndex,
    interval,
    sourceUri,
    entityCollection
  );
}

function processCylinder(entity, packet, entityCollection, sourceUri) {
  const cylinderData = packet.cylinder;
  if (!defined(cylinderData)) {
    return;
  }

  const interval = intervalFromString(cylinderData.interval);
  let cylinder = entity.cylinder;
  if (!defined(cylinder)) {
    entity.cylinder = cylinder = new CylinderGraphics();
  }

  processPacketData(
    Boolean,
    cylinder,
    "show",
    cylinderData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    cylinder,
    "length",
    cylinderData.length,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    cylinder,
    "topRadius",
    cylinderData.topRadius,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    cylinder,
    "bottomRadius",
    cylinderData.bottomRadius,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    cylinder,
    "heightReference",
    cylinderData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    cylinder,
    "fill",
    cylinderData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    cylinder,
    "material",
    cylinderData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    cylinder,
    "outline",
    cylinderData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    cylinder,
    "outlineColor",
    cylinderData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    cylinder,
    "outlineWidth",
    cylinderData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    cylinder,
    "numberOfVerticalLines",
    cylinderData.numberOfVerticalLines,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    cylinder,
    "slices",
    cylinderData.slices,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    cylinder,
    "shadows",
    cylinderData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    cylinder,
    "distanceDisplayCondition",
    cylinderData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
}

function processDocument(packet, dataSource) {
  const version = packet.version;
  if (defined(version)) {
    if (typeof version === "string") {
      const tokens = version.split(".");
      if (tokens.length === 2) {
        if (tokens[0] !== "1") {
          throw new RuntimeError("Cesium only supports CZML version 1.");
        }
        dataSource._version = version;
      }
    }
  }

  if (!defined(dataSource._version)) {
    throw new RuntimeError(
      "CZML version information invalid.  It is expected to be a property on the document object in the <Major>.<Minor> version format."
    );
  }

  const documentPacket = dataSource._documentPacket;

  if (defined(packet.name)) {
    documentPacket.name = packet.name;
  }

  const clockPacket = packet.clock;
  if (defined(clockPacket)) {
    const clock = documentPacket.clock;
    if (!defined(clock)) {
      documentPacket.clock = {
        interval: clockPacket.interval,
        currentTime: clockPacket.currentTime,
        range: clockPacket.range,
        step: clockPacket.step,
        multiplier: clockPacket.multiplier,
      };
    } else {
      clock.interval = defaultValue(clockPacket.interval, clock.interval);
      clock.currentTime = defaultValue(
        clockPacket.currentTime,
        clock.currentTime
      );
      clock.range = defaultValue(clockPacket.range, clock.range);
      clock.step = defaultValue(clockPacket.step, clock.step);
      clock.multiplier = defaultValue(clockPacket.multiplier, clock.multiplier);
    }
  }
}

function processEllipse(entity, packet, entityCollection, sourceUri) {
  const ellipseData = packet.ellipse;
  if (!defined(ellipseData)) {
    return;
  }

  const interval = intervalFromString(ellipseData.interval);
  let ellipse = entity.ellipse;
  if (!defined(ellipse)) {
    entity.ellipse = ellipse = new EllipseGraphics();
  }

  processPacketData(
    Boolean,
    ellipse,
    "show",
    ellipseData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "semiMajorAxis",
    ellipseData.semiMajorAxis,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "semiMinorAxis",
    ellipseData.semiMinorAxis,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "height",
    ellipseData.height,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    ellipse,
    "heightReference",
    ellipseData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "extrudedHeight",
    ellipseData.extrudedHeight,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    ellipse,
    "extrudedHeightReference",
    ellipseData.extrudedHeightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rotation,
    ellipse,
    "rotation",
    ellipseData.rotation,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rotation,
    ellipse,
    "stRotation",
    ellipseData.stRotation,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "granularity",
    ellipseData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    ellipse,
    "fill",
    ellipseData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    ellipse,
    "material",
    ellipseData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    ellipse,
    "outline",
    ellipseData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    ellipse,
    "outlineColor",
    ellipseData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "outlineWidth",
    ellipseData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "numberOfVerticalLines",
    ellipseData.numberOfVerticalLines,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    ellipse,
    "shadows",
    ellipseData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    ellipse,
    "distanceDisplayCondition",
    ellipseData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ClassificationType,
    ellipse,
    "classificationType",
    ellipseData.classificationType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipse,
    "zIndex",
    ellipseData.zIndex,
    interval,
    sourceUri,
    entityCollection
  );
}

function processEllipsoid(entity, packet, entityCollection, sourceUri) {
  const ellipsoidData = packet.ellipsoid;
  if (!defined(ellipsoidData)) {
    return;
  }

  const interval = intervalFromString(ellipsoidData.interval);
  let ellipsoid = entity.ellipsoid;
  if (!defined(ellipsoid)) {
    entity.ellipsoid = ellipsoid = new EllipsoidGraphics();
  }

  processPacketData(
    Boolean,
    ellipsoid,
    "show",
    ellipsoidData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian3,
    ellipsoid,
    "radii",
    ellipsoidData.radii,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian3,
    ellipsoid,
    "innerRadii",
    ellipsoidData.innerRadii,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "minimumClock",
    ellipsoidData.minimumClock,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "maximumClock",
    ellipsoidData.maximumClock,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "minimumCone",
    ellipsoidData.minimumCone,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "maximumCone",
    ellipsoidData.maximumCone,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    ellipsoid,
    "heightReference",
    ellipsoidData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    ellipsoid,
    "fill",
    ellipsoidData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    ellipsoid,
    "material",
    ellipsoidData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    ellipsoid,
    "outline",
    ellipsoidData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    ellipsoid,
    "outlineColor",
    ellipsoidData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "outlineWidth",
    ellipsoidData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "stackPartitions",
    ellipsoidData.stackPartitions,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "slicePartitions",
    ellipsoidData.slicePartitions,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    ellipsoid,
    "subdivisions",
    ellipsoidData.subdivisions,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    ellipsoid,
    "shadows",
    ellipsoidData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    ellipsoid,
    "distanceDisplayCondition",
    ellipsoidData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
}

function processLabel(entity, packet, entityCollection, sourceUri) {
  const labelData = packet.label;
  if (!defined(labelData)) {
    return;
  }

  const interval = intervalFromString(labelData.interval);
  let label = entity.label;
  if (!defined(label)) {
    entity.label = label = new LabelGraphics();
  }

  processPacketData(
    Boolean,
    label,
    "show",
    labelData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    String,
    label,
    "text",
    labelData.text,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    String,
    label,
    "font",
    labelData.font,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    LabelStyle,
    label,
    "style",
    labelData.style,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    label,
    "scale",
    labelData.scale,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    label,
    "showBackground",
    labelData.showBackground,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    label,
    "backgroundColor",
    labelData.backgroundColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian2,
    label,
    "backgroundPadding",
    labelData.backgroundPadding,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian2,
    label,
    "pixelOffset",
    labelData.pixelOffset,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Cartesian3,
    label,
    "eyeOffset",
    labelData.eyeOffset,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HorizontalOrigin,
    label,
    "horizontalOrigin",
    labelData.horizontalOrigin,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    VerticalOrigin,
    label,
    "verticalOrigin",
    labelData.verticalOrigin,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    label,
    "heightReference",
    labelData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    label,
    "fillColor",
    labelData.fillColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    label,
    "outlineColor",
    labelData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    label,
    "outlineWidth",
    labelData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    label,
    "translucencyByDistance",
    labelData.translucencyByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    label,
    "pixelOffsetScaleByDistance",
    labelData.pixelOffsetScaleByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    label,
    "scaleByDistance",
    labelData.scaleByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    label,
    "distanceDisplayCondition",
    labelData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    label,
    "disableDepthTestDistance",
    labelData.disableDepthTestDistance,
    interval,
    sourceUri,
    entityCollection
  );
}

function processModel(entity, packet, entityCollection, sourceUri) {
  const modelData = packet.model;
  if (!defined(modelData)) {
    return;
  }

  const interval = intervalFromString(modelData.interval);
  let model = entity.model;
  if (!defined(model)) {
    entity.model = model = new ModelGraphics();
  }

  processPacketData(
    Boolean,
    model,
    "show",
    modelData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Uri,
    model,
    "uri",
    modelData.gltf,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    model,
    "scale",
    modelData.scale,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    model,
    "minimumPixelSize",
    modelData.minimumPixelSize,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    model,
    "maximumScale",
    modelData.maximumScale,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    model,
    "incrementallyLoadTextures",
    modelData.incrementallyLoadTextures,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    model,
    "runAnimations",
    modelData.runAnimations,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    model,
    "clampAnimations",
    modelData.clampAnimations,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    model,
    "shadows",
    modelData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    model,
    "heightReference",
    modelData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    model,
    "silhouetteColor",
    modelData.silhouetteColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    model,
    "silhouetteSize",
    modelData.silhouetteSize,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    model,
    "color",
    modelData.color,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ColorBlendMode,
    model,
    "colorBlendMode",
    modelData.colorBlendMode,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    model,
    "colorBlendAmount",
    modelData.colorBlendAmount,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    model,
    "distanceDisplayCondition",
    modelData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );

  let i, len;
  const nodeTransformationsData = modelData.nodeTransformations;
  if (defined(nodeTransformationsData)) {
    if (Array.isArray(nodeTransformationsData)) {
      for (i = 0, len = nodeTransformationsData.length; i < len; ++i) {
        processNodeTransformations(
          model,
          nodeTransformationsData[i],
          interval,
          sourceUri,
          entityCollection
        );
      }
    } else {
      processNodeTransformations(
        model,
        nodeTransformationsData,
        interval,
        sourceUri,
        entityCollection
      );
    }
  }

  const articulationsData = modelData.articulations;
  if (defined(articulationsData)) {
    if (Array.isArray(articulationsData)) {
      for (i = 0, len = articulationsData.length; i < len; ++i) {
        processArticulations(
          model,
          articulationsData[i],
          interval,
          sourceUri,
          entityCollection
        );
      }
    } else {
      processArticulations(
        model,
        articulationsData,
        interval,
        sourceUri,
        entityCollection
      );
    }
  }
}

function processNodeTransformations(
  model,
  nodeTransformationsData,
  constrainedInterval,
  sourceUri,
  entityCollection
) {
  let combinedInterval = intervalFromString(nodeTransformationsData.interval);
  if (defined(constrainedInterval)) {
    if (defined(combinedInterval)) {
      combinedInterval = TimeInterval.intersect(
        combinedInterval,
        constrainedInterval,
        scratchTimeInterval
      );
    } else {
      combinedInterval = constrainedInterval;
    }
  }

  let nodeTransformations = model.nodeTransformations;
  const nodeNames = Object.keys(nodeTransformationsData);
  for (let i = 0, len = nodeNames.length; i < len; ++i) {
    const nodeName = nodeNames[i];
    if (nodeName === "interval") {
      continue;
    }

    const nodeTransformationData = nodeTransformationsData[nodeName];
    if (!defined(nodeTransformationData)) {
      continue;
    }

    if (!defined(nodeTransformations)) {
      model.nodeTransformations = nodeTransformations = new PropertyBag();
    }

    if (!nodeTransformations.hasProperty(nodeName)) {
      nodeTransformations.addProperty(nodeName);
    }

    let nodeTransformation = nodeTransformations[nodeName];
    if (!defined(nodeTransformation)) {
      nodeTransformations[
        nodeName
      ] = nodeTransformation = new NodeTransformationProperty();
    }

    processPacketData(
      Cartesian3,
      nodeTransformation,
      "translation",
      nodeTransformationData.translation,
      combinedInterval,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Quaternion,
      nodeTransformation,
      "rotation",
      nodeTransformationData.rotation,
      combinedInterval,
      sourceUri,
      entityCollection
    );
    processPacketData(
      Cartesian3,
      nodeTransformation,
      "scale",
      nodeTransformationData.scale,
      combinedInterval,
      sourceUri,
      entityCollection
    );
  }
}

function processArticulations(
  model,
  articulationsData,
  constrainedInterval,
  sourceUri,
  entityCollection
) {
  let combinedInterval = intervalFromString(articulationsData.interval);
  if (defined(constrainedInterval)) {
    if (defined(combinedInterval)) {
      combinedInterval = TimeInterval.intersect(
        combinedInterval,
        constrainedInterval,
        scratchTimeInterval
      );
    } else {
      combinedInterval = constrainedInterval;
    }
  }

  let articulations = model.articulations;
  const keys = Object.keys(articulationsData);
  for (let i = 0, len = keys.length; i < len; ++i) {
    const key = keys[i];
    if (key === "interval") {
      continue;
    }

    const articulationStageData = articulationsData[key];
    if (!defined(articulationStageData)) {
      continue;
    }

    if (!defined(articulations)) {
      model.articulations = articulations = new PropertyBag();
    }

    if (!articulations.hasProperty(key)) {
      articulations.addProperty(key);
    }

    processPacketData(
      Number,
      articulations,
      key,
      articulationStageData,
      combinedInterval,
      sourceUri,
      entityCollection
    );
  }
}

function processPath(entity, packet, entityCollection, sourceUri) {
  const pathData = packet.path;
  if (!defined(pathData)) {
    return;
  }

  const interval = intervalFromString(pathData.interval);
  let path = entity.path;
  if (!defined(path)) {
    entity.path = path = new PathGraphics();
  }

  processPacketData(
    Boolean,
    path,
    "show",
    pathData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    path,
    "leadTime",
    pathData.leadTime,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    path,
    "trailTime",
    pathData.trailTime,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    path,
    "width",
    pathData.width,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    path,
    "resolution",
    pathData.resolution,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    path,
    "material",
    pathData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    path,
    "distanceDisplayCondition",
    pathData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
}

function processPoint(entity, packet, entityCollection, sourceUri) {
  const pointData = packet.point;
  if (!defined(pointData)) {
    return;
  }

  const interval = intervalFromString(pointData.interval);
  let point = entity.point;
  if (!defined(point)) {
    entity.point = point = new PointGraphics();
  }

  processPacketData(
    Boolean,
    point,
    "show",
    pointData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    point,
    "pixelSize",
    pointData.pixelSize,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    point,
    "heightReference",
    pointData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    point,
    "color",
    pointData.color,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    point,
    "outlineColor",
    pointData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    point,
    "outlineWidth",
    pointData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    point,
    "scaleByDistance",
    pointData.scaleByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    NearFarScalar,
    point,
    "translucencyByDistance",
    pointData.translucencyByDistance,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    point,
    "distanceDisplayCondition",
    pointData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    point,
    "disableDepthTestDistance",
    pointData.disableDepthTestDistance,
    interval,
    sourceUri,
    entityCollection
  );
}

function PolygonHierarchyProperty(polygon) {
  this.polygon = polygon;
  this._definitionChanged = new Event();
}

Object.defineProperties(PolygonHierarchyProperty.prototype, {
  isConstant: {
    get: function () {
      const positions = this.polygon._positions;
      const holes = this.polygon._holes;
      return (
        (!defined(positions) || positions.isConstant) &&
        (!defined(holes) || holes.isConstant)
      );
    },
  },
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
});

PolygonHierarchyProperty.prototype.getValue = function (time, result) {
  let positions;
  if (defined(this.polygon._positions)) {
    positions = this.polygon._positions.getValue(time);
  }

  let holes;
  if (defined(this.polygon._holes)) {
    holes = this.polygon._holes.getValue(time);
    if (defined(holes)) {
      holes = holes.map(function (holePositions) {
        return new PolygonHierarchy(holePositions);
      });
    }
  }

  if (!defined(result)) {
    return new PolygonHierarchy(positions, holes);
  }

  result.positions = positions;
  result.holes = holes;
  return result;
};

PolygonHierarchyProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof PolygonHierarchyProperty &&
      Property.equals(this.polygon._positions, other.polygon._positions) &&
      Property.equals(this.polygon._holes, other.polygon._holes))
  );
};

function processPolygon(entity, packet, entityCollection, sourceUri) {
  const polygonData = packet.polygon;
  if (!defined(polygonData)) {
    return;
  }

  const interval = intervalFromString(polygonData.interval);
  let polygon = entity.polygon;
  if (!defined(polygon)) {
    entity.polygon = polygon = new PolygonGraphics();
  }

  processPacketData(
    Boolean,
    polygon,
    "show",
    polygonData.show,
    interval,
    sourceUri,
    entityCollection
  );

  // adapt 'position' property producing Cartesian[]
  // and 'holes' property producing Cartesian[][]
  // to a single property producing PolygonHierarchy
  processPositionArray(
    polygon,
    "_positions",
    polygonData.positions,
    entityCollection
  );
  processPositionArrayOfArrays(
    polygon,
    "_holes",
    polygonData.holes,
    entityCollection
  );
  if (defined(polygon._positions) || defined(polygon._holes)) {
    polygon.hierarchy = new PolygonHierarchyProperty(polygon);
  }

  processPacketData(
    Number,
    polygon,
    "height",
    polygonData.height,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    polygon,
    "heightReference",
    polygonData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polygon,
    "extrudedHeight",
    polygonData.extrudedHeight,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    polygon,
    "extrudedHeightReference",
    polygonData.extrudedHeightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rotation,
    polygon,
    "stRotation",
    polygonData.stRotation,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polygon,
    "granularity",
    polygonData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polygon,
    "fill",
    polygonData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    polygon,
    "material",
    polygonData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polygon,
    "outline",
    polygonData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    polygon,
    "outlineColor",
    polygonData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polygon,
    "outlineWidth",
    polygonData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polygon,
    "perPositionHeight",
    polygonData.perPositionHeight,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polygon,
    "closeTop",
    polygonData.closeTop,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polygon,
    "closeBottom",
    polygonData.closeBottom,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ArcType,
    polygon,
    "arcType",
    polygonData.arcType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    polygon,
    "shadows",
    polygonData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    polygon,
    "distanceDisplayCondition",
    polygonData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ClassificationType,
    polygon,
    "classificationType",
    polygonData.classificationType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polygon,
    "zIndex",
    polygonData.zIndex,
    interval,
    sourceUri,
    entityCollection
  );
}

function adaptFollowSurfaceToArcType(followSurface) {
  return followSurface ? ArcType.GEODESIC : ArcType.NONE;
}

function processPolyline(entity, packet, entityCollection, sourceUri) {
  const polylineData = packet.polyline;
  if (!defined(polylineData)) {
    return;
  }

  const interval = intervalFromString(polylineData.interval);
  let polyline = entity.polyline;
  if (!defined(polyline)) {
    entity.polyline = polyline = new PolylineGraphics();
  }

  processPacketData(
    Boolean,
    polyline,
    "show",
    polylineData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPositionArray(
    polyline,
    "positions",
    polylineData.positions,
    entityCollection
  );
  processPacketData(
    Number,
    polyline,
    "width",
    polylineData.width,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polyline,
    "granularity",
    polylineData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    polyline,
    "material",
    polylineData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    polyline,
    "depthFailMaterial",
    polylineData.depthFailMaterial,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ArcType,
    polyline,
    "arcType",
    polylineData.arcType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polyline,
    "clampToGround",
    polylineData.clampToGround,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    polyline,
    "shadows",
    polylineData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    polyline,
    "distanceDisplayCondition",
    polylineData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ClassificationType,
    polyline,
    "classificationType",
    polylineData.classificationType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polyline,
    "zIndex",
    polylineData.zIndex,
    interval,
    sourceUri,
    entityCollection
  );

  // for backwards compatibility, adapt CZML followSurface to arcType.
  if (defined(polylineData.followSurface) && !defined(polylineData.arcType)) {
    const tempObj = {};
    processPacketData(
      Boolean,
      tempObj,
      "followSurface",
      polylineData.followSurface,
      interval,
      sourceUri,
      entityCollection
    );
    polyline.arcType = createAdapterProperty(
      tempObj.followSurface,
      adaptFollowSurfaceToArcType
    );
  }
}

function processPolylineVolume(entity, packet, entityCollection, sourceUri) {
  const polylineVolumeData = packet.polylineVolume;
  if (!defined(polylineVolumeData)) {
    return;
  }

  const interval = intervalFromString(polylineVolumeData.interval);
  let polylineVolume = entity.polylineVolume;
  if (!defined(polylineVolume)) {
    entity.polylineVolume = polylineVolume = new PolylineVolumeGraphics();
  }

  processPositionArray(
    polylineVolume,
    "positions",
    polylineVolumeData.positions,
    entityCollection
  );
  processShape(
    polylineVolume,
    "shape",
    polylineVolumeData.shape,
    entityCollection
  );
  processPacketData(
    Boolean,
    polylineVolume,
    "show",
    polylineVolumeData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    CornerType,
    polylineVolume,
    "cornerType",
    polylineVolumeData.cornerType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polylineVolume,
    "fill",
    polylineVolumeData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    polylineVolume,
    "material",
    polylineVolumeData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    polylineVolume,
    "outline",
    polylineVolumeData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    polylineVolume,
    "outlineColor",
    polylineVolumeData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polylineVolume,
    "outlineWidth",
    polylineVolumeData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    polylineVolume,
    "granularity",
    polylineVolumeData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    polylineVolume,
    "shadows",
    polylineVolumeData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    polylineVolume,
    "distanceDisplayCondition",
    polylineVolumeData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
}

function processRectangle(entity, packet, entityCollection, sourceUri) {
  const rectangleData = packet.rectangle;
  if (!defined(rectangleData)) {
    return;
  }

  const interval = intervalFromString(rectangleData.interval);
  let rectangle = entity.rectangle;
  if (!defined(rectangle)) {
    entity.rectangle = rectangle = new RectangleGraphics();
  }

  processPacketData(
    Boolean,
    rectangle,
    "show",
    rectangleData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rectangle,
    rectangle,
    "coordinates",
    rectangleData.coordinates,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    rectangle,
    "height",
    rectangleData.height,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    rectangle,
    "heightReference",
    rectangleData.heightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    rectangle,
    "extrudedHeight",
    rectangleData.extrudedHeight,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    HeightReference,
    rectangle,
    "extrudedHeightReference",
    rectangleData.extrudedHeightReference,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rotation,
    rectangle,
    "rotation",
    rectangleData.rotation,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Rotation,
    rectangle,
    "stRotation",
    rectangleData.stRotation,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    rectangle,
    "granularity",
    rectangleData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    rectangle,
    "fill",
    rectangleData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    rectangle,
    "material",
    rectangleData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    rectangle,
    "outline",
    rectangleData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    rectangle,
    "outlineColor",
    rectangleData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    rectangle,
    "outlineWidth",
    rectangleData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    rectangle,
    "shadows",
    rectangleData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    rectangle,
    "distanceDisplayCondition",
    rectangleData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ClassificationType,
    rectangle,
    "classificationType",
    rectangleData.classificationType,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    rectangle,
    "zIndex",
    rectangleData.zIndex,
    interval,
    sourceUri,
    entityCollection
  );
}

function processTileset(entity, packet, entityCollection, sourceUri) {
  const tilesetData = packet.tileset;
  if (!defined(tilesetData)) {
    return;
  }

  const interval = intervalFromString(tilesetData.interval);
  let tileset = entity.tileset;
  if (!defined(tileset)) {
    entity.tileset = tileset = new Cesium3DTilesetGraphics();
  }

  processPacketData(
    Boolean,
    tileset,
    "show",
    tilesetData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Uri,
    tileset,
    "uri",
    tilesetData.uri,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    tileset,
    "maximumScreenSpaceError",
    tilesetData.maximumScreenSpaceError,
    interval,
    sourceUri,
    entityCollection
  );
}

function processWall(entity, packet, entityCollection, sourceUri) {
  const wallData = packet.wall;
  if (!defined(wallData)) {
    return;
  }

  const interval = intervalFromString(wallData.interval);
  let wall = entity.wall;
  if (!defined(wall)) {
    entity.wall = wall = new WallGraphics();
  }

  processPacketData(
    Boolean,
    wall,
    "show",
    wallData.show,
    interval,
    sourceUri,
    entityCollection
  );
  processPositionArray(wall, "positions", wallData.positions, entityCollection);
  processArray(
    wall,
    "minimumHeights",
    wallData.minimumHeights,
    entityCollection
  );
  processArray(
    wall,
    "maximumHeights",
    wallData.maximumHeights,
    entityCollection
  );
  processPacketData(
    Number,
    wall,
    "granularity",
    wallData.granularity,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    wall,
    "fill",
    wallData.fill,
    interval,
    sourceUri,
    entityCollection
  );
  processMaterialPacketData(
    wall,
    "material",
    wallData.material,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Boolean,
    wall,
    "outline",
    wallData.outline,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Color,
    wall,
    "outlineColor",
    wallData.outlineColor,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    Number,
    wall,
    "outlineWidth",
    wallData.outlineWidth,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    ShadowMode,
    wall,
    "shadows",
    wallData.shadows,
    interval,
    sourceUri,
    entityCollection
  );
  processPacketData(
    DistanceDisplayCondition,
    wall,
    "distanceDisplayCondition",
    wallData.distanceDisplayCondition,
    interval,
    sourceUri,
    entityCollection
  );
}

function processCzmlPacket(
  packet,
  entityCollection,
  updaterFunctions,
  sourceUri,
  dataSource
) {
  let objectId = packet.id;
  if (!defined(objectId)) {
    objectId = createGuid();
  }

  currentId = objectId;

  if (!defined(dataSource._version) && objectId !== "document") {
    throw new RuntimeError(
      "The first CZML packet is required to be the document object."
    );
  }

  if (packet["delete"] === true) {
    entityCollection.removeById(objectId);
  } else if (objectId === "document") {
    processDocument(packet, dataSource);
  } else {
    const entity = entityCollection.getOrCreateEntity(objectId);

    const parentId = packet.parent;
    if (defined(parentId)) {
      entity.parent = entityCollection.getOrCreateEntity(parentId);
    }

    for (let i = updaterFunctions.length - 1; i > -1; i--) {
      updaterFunctions[i](entity, packet, entityCollection, sourceUri);
    }
  }

  currentId = undefined;
}

function updateClock(dataSource) {
  let clock;
  const clockPacket = dataSource._documentPacket.clock;
  if (!defined(clockPacket)) {
    if (!defined(dataSource._clock)) {
      const availability = dataSource._entityCollection.computeAvailability();
      if (!availability.start.equals(Iso8601.MINIMUM_VALUE)) {
        const startTime = availability.start;
        const stopTime = availability.stop;
        const totalSeconds = JulianDate.secondsDifference(stopTime, startTime);
        const multiplier = Math.round(totalSeconds / 120.0);

        clock = new DataSourceClock();
        clock.startTime = JulianDate.clone(startTime);
        clock.stopTime = JulianDate.clone(stopTime);
        clock.clockRange = ClockRange.LOOP_STOP;
        clock.multiplier = multiplier;
        clock.currentTime = JulianDate.clone(startTime);
        clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        dataSource._clock = clock;
        return true;
      }
    }
    return false;
  }

  if (defined(dataSource._clock)) {
    clock = dataSource._clock.clone();
  } else {
    clock = new DataSourceClock();
    clock.startTime = Iso8601.MINIMUM_VALUE.clone();
    clock.stopTime = Iso8601.MAXIMUM_VALUE.clone();
    clock.currentTime = Iso8601.MINIMUM_VALUE.clone();
    clock.clockRange = ClockRange.LOOP_STOP;
    clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    clock.multiplier = 1.0;
  }

  const interval = intervalFromString(clockPacket.interval);
  if (defined(interval)) {
    clock.startTime = interval.start;
    clock.stopTime = interval.stop;
  }

  if (defined(clockPacket.currentTime)) {
    clock.currentTime = JulianDate.fromIso8601(clockPacket.currentTime);
  }
  if (defined(clockPacket.range)) {
    clock.clockRange = defaultValue(
      ClockRange[clockPacket.range],
      ClockRange.LOOP_STOP
    );
  }
  if (defined(clockPacket.step)) {
    clock.clockStep = defaultValue(
      ClockStep[clockPacket.step],
      ClockStep.SYSTEM_CLOCK_MULTIPLIER
    );
  }
  if (defined(clockPacket.multiplier)) {
    clock.multiplier = clockPacket.multiplier;
  }

  if (!clock.equals(dataSource._clock)) {
    dataSource._clock = clock.clone(dataSource._clock);
    return true;
  }

  return false;
}

function load(dataSource, czml, options, clear) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(czml)) {
    throw new DeveloperError("czml is required.");
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  let promise = czml;
  let sourceUri = options.sourceUri;

  // User specified credit
  let credit = options.credit;
  if (typeof credit === "string") {
    credit = new Credit(credit);
  }
  dataSource._credit = credit;

  // If the czml is a URL
  if (typeof czml === "string" || czml instanceof Resource) {
    czml = Resource.createIfNeeded(czml);
    promise = czml.fetchJson();
    sourceUri = defaultValue(sourceUri, czml.clone());

    // Add resource credits to our list of credits to display
    const resourceCredits = dataSource._resourceCredits;
    const credits = czml.credits;
    if (defined(credits)) {
      const length = credits.length;
      for (let i = 0; i < length; i++) {
        resourceCredits.push(credits[i]);
      }
    }
  }

  sourceUri = Resource.createIfNeeded(sourceUri);

  DataSource.setLoading(dataSource, true);

  return Promise.resolve(promise)
    .then(function (czml) {
      return loadCzml(dataSource, czml, sourceUri, clear);
    })
    .catch(function (error) {
      DataSource.setLoading(dataSource, false);
      dataSource._error.raiseEvent(dataSource, error);
      console.log(error);
      return Promise.reject(error);
    });
}

function loadCzml(dataSource, czml, sourceUri, clear) {
  DataSource.setLoading(dataSource, true);
  const entityCollection = dataSource._entityCollection;

  if (clear) {
    dataSource._version = undefined;
    dataSource._documentPacket = new DocumentPacket();
    entityCollection.removeAll();
  }

  CzmlDataSource._processCzml(
    czml,
    entityCollection,
    sourceUri,
    undefined,
    dataSource
  );

  let raiseChangedEvent = updateClock(dataSource);

  const documentPacket = dataSource._documentPacket;
  if (
    defined(documentPacket.name) &&
    dataSource._name !== documentPacket.name
  ) {
    dataSource._name = documentPacket.name;
    raiseChangedEvent = true;
  } else if (!defined(dataSource._name) && defined(sourceUri)) {
    dataSource._name = getFilenameFromUri(sourceUri.getUrlComponent());
    raiseChangedEvent = true;
  }

  DataSource.setLoading(dataSource, false);
  if (raiseChangedEvent) {
    dataSource._changed.raiseEvent(dataSource);
  }

  return dataSource;
}

function DocumentPacket() {
  this.name = undefined;
  this.clock = undefined;
}

/**
 * @typedef {object} CzmlDataSource.LoadOptions
 *
 * Initialization options for the <code>load</code> method.
 *
 * @property {Resource|string} [sourceUri] Overrides the url to use for resolving relative links.
 * @property {Credit|string} [credit] A credit for the data source, which is displayed on the canvas.
 */

/**
 * A {@link DataSource} which processes {@link https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide|CZML}.
 * @alias CzmlDataSource
 * @constructor
 *
 * @param {string} [name] An optional name for the data source.  This value will be overwritten if a loaded document contains a name.
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=CZML.html|Cesium Sandcastle CZML Demo}
 */
function CzmlDataSource(name) {
  this._name = name;
  this._changed = new Event();
  this._error = new Event();
  this._isLoading = false;
  this._loading = new Event();
  this._clock = undefined;
  this._documentPacket = new DocumentPacket();
  this._version = undefined;
  this._entityCollection = new EntityCollection(this);
  this._entityCluster = new EntityCluster();
  this._credit = undefined;
  this._resourceCredits = [];
}

/**
 * Creates a Promise to a new instance loaded with the provided CZML data.
 *
 * @param {Resource|string|object} czml A url or CZML object to be processed.
 * @param {CzmlDataSource.LoadOptions} [options] An object specifying configuration options
 *
 * @returns {Promise<CzmlDataSource>} A promise that resolves to the new instance once the data is processed.
 */
CzmlDataSource.load = function (czml, options) {
  return new CzmlDataSource().load(czml, options);
};

Object.defineProperties(CzmlDataSource.prototype, {
  /**
   * Gets a human-readable name for this instance.
   * @memberof CzmlDataSource.prototype
   * @type {string}
   */
  name: {
    get: function () {
      return this._name;
    },
  },
  /**
   * Gets the clock settings defined by the loaded CZML.  If no clock is explicitly
   * defined in the CZML, the combined availability of all objects is returned.  If
   * only static data exists, this value is undefined.
   * @memberof CzmlDataSource.prototype
   * @type {DataSourceClock}
   */
  clock: {
    get: function () {
      return this._clock;
    },
  },
  /**
   * Gets the collection of {@link Entity} instances.
   * @memberof CzmlDataSource.prototype
   * @type {EntityCollection}
   */
  entities: {
    get: function () {
      return this._entityCollection;
    },
  },
  /**
   * Gets a value indicating if the data source is currently loading data.
   * @memberof CzmlDataSource.prototype
   * @type {boolean}
   */
  isLoading: {
    get: function () {
      return this._isLoading;
    },
  },
  /**
   * Gets an event that will be raised when the underlying data changes.
   * @memberof CzmlDataSource.prototype
   * @type {Event}
   */
  changedEvent: {
    get: function () {
      return this._changed;
    },
  },
  /**
   * Gets an event that will be raised if an error is encountered during processing.
   * @memberof CzmlDataSource.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._error;
    },
  },
  /**
   * Gets an event that will be raised when the data source either starts or stops loading.
   * @memberof CzmlDataSource.prototype
   * @type {Event}
   */
  loadingEvent: {
    get: function () {
      return this._loading;
    },
  },
  /**
   * Gets whether or not this data source should be displayed.
   * @memberof CzmlDataSource.prototype
   * @type {boolean}
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
   * @memberof CzmlDataSource.prototype
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
   * @memberof CzmlDataSource.prototype
   * @type {Credit}
   */
  credit: {
    get: function () {
      return this._credit;
    },
  },
});

/**
 * @callback CzmlDataSource.UpdaterFunction
 *
 * A CZML processing function that adds or updates entities in the provided
 * collection based on the provided CZML packet.
 *
 * @param {Entity} entity
 * @param {object} packet
 * @param {EntityCollection} entityCollection
 * @param {string} sourceUri
 */

/**
 * Gets the array of CZML processing functions.
 * @memberof CzmlDataSource
 * @type {CzmlDataSource.UpdaterFunction[]}
 */
CzmlDataSource.updaters = [
  processBillboard,
  processBox,
  processCorridor,
  processCylinder,
  processEllipse,
  processEllipsoid,
  processLabel,
  processModel,
  processName,
  processDescription,
  processPath,
  processPoint,
  processPolygon,
  processPolyline,
  processPolylineVolume,
  processProperties,
  processRectangle,
  processPosition,
  processTileset,
  processViewFrom,
  processWall,
  processOrientation,
  processAvailability,
];

/**
 * Add the provided updater to the list of updaters if not already included
 * @private
 * @param {CzmlDataSource.UpdaterFunction} updater
 */
CzmlDataSource.registerUpdater = function (updater) {
  if (!CzmlDataSource.updaters.includes(updater)) {
    CzmlDataSource.updaters.push(updater);
  }
};

/**
 * Remove the provided updater from the list of updaters if already included
 * @private
 * @param {CzmlDataSource.UpdaterFunction} updater
 */
CzmlDataSource.unregisterUpdater = function (updater) {
  if (CzmlDataSource.updaters.includes(updater)) {
    const index = CzmlDataSource.updaters.indexOf(updater);
    CzmlDataSource.updaters.splice(index, 1);
  }
};

/**
 * Processes the provided url or CZML object without clearing any existing data.
 *
 * @param {Resource|string|object} czml A url or CZML object to be processed.
 * @param {CzmlDataSource.LoadOptions} [options] An object specifying configuration options
 *
 * @returns {Promise<CzmlDataSource>} A promise that resolves to this instances once the data is processed.
 */
CzmlDataSource.prototype.process = function (czml, options) {
  return load(this, czml, options, false);
};

/**
 * Loads the provided url or CZML object, replacing any existing data.
 *
 * @param {Resource|string|object} czml A url or CZML object to be processed.
 * @param {CzmlDataSource.LoadOptions} [options] An object specifying configuration options
 *
 * @returns {Promise<CzmlDataSource>} A promise that resolves to this instances once the data is processed.
 */
CzmlDataSource.prototype.load = function (czml, options) {
  return load(this, czml, options, true);
};

/**
 * Updates the data source to the provided time.  This function is optional and
 * is not required to be implemented.  It is provided for data sources which
 * retrieve data based on the current animation time or scene state.
 * If implemented, update will be called by {@link DataSourceDisplay} once a frame.
 *
 * @param {JulianDate} time The simulation time.
 * @returns {boolean} True if this data source is ready to be displayed at the provided time, false otherwise.
 */
CzmlDataSource.prototype.update = function (time) {
  return true;
};

/**
 * A helper function used by custom CZML updater functions
 * which creates or updates a {@link Property} from a CZML packet.
 * @function
 *
 * @param {Function} type The constructor function for the property being processed.
 * @param {object} object The object on which the property will be added or updated.
 * @param {string} propertyName The name of the property on the object.
 * @param {object} packetData The CZML packet being processed.
 * @param {TimeInterval} interval A constraining interval for which the data is valid.
 * @param {string} sourceUri The originating uri of the data being processed.
 * @param {EntityCollection} entityCollection The collection being processsed.
 */
CzmlDataSource.processPacketData = processPacketData;

/**
 * A helper function used by custom CZML updater functions
 * which creates or updates a {@link PositionProperty} from a CZML packet.
 * @function
 *
 * @param {object} object The object on which the property will be added or updated.
 * @param {string} propertyName The name of the property on the object.
 * @param {object} packetData The CZML packet being processed.
 * @param {TimeInterval} interval A constraining interval for which the data is valid.
 * @param {string} sourceUri The originating uri of the data being processed.
 * @param {EntityCollection} entityCollection The collection being processsed.
 */
CzmlDataSource.processPositionPacketData = processPositionPacketData;

/**
 * A helper function used by custom CZML updater functions
 * which creates or updates a {@link MaterialProperty} from a CZML packet.
 * @function
 *
 * @param {object} object The object on which the property will be added or updated.
 * @param {string} propertyName The name of the property on the object.
 * @param {object} packetData The CZML packet being processed.
 * @param {TimeInterval} interval A constraining interval for which the data is valid.
 * @param {string} sourceUri The originating uri of the data being processed.
 * @param {EntityCollection} entityCollection The collection being processsed.
 */
CzmlDataSource.processMaterialPacketData = processMaterialPacketData;

CzmlDataSource._processCzml = function (
  czml,
  entityCollection,
  sourceUri,
  updaterFunctions,
  dataSource
) {
  updaterFunctions = defaultValue(updaterFunctions, CzmlDataSource.updaters);

  if (Array.isArray(czml)) {
    for (let i = 0, len = czml.length; i < len; ++i) {
      processCzmlPacket(
        czml[i],
        entityCollection,
        updaterFunctions,
        sourceUri,
        dataSource
      );
    }
  } else {
    processCzmlPacket(
      czml,
      entityCollection,
      updaterFunctions,
      sourceUri,
      dataSource
    );
  }
};
export default CzmlDataSource;
