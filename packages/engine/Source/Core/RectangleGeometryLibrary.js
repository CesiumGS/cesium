import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import GeographicProjection from "./GeographicProjection.js";
import CesiumMath from "./Math.js";
import Matrix2 from "./Matrix2.js";
import Rectangle from "./Rectangle.js";

const cos = Math.cos;
const sin = Math.sin;
const sqrt = Math.sqrt;

/**
 * @private
 */
const RectangleGeometryLibrary = {};

/**
 * @private
 */
RectangleGeometryLibrary.computePosition = function (
  computedOptions,
  ellipsoid,
  computeST,
  row,
  col,
  position,
  st
) {
  const radiiSquared = ellipsoid.radiiSquared;
  const nwCorner = computedOptions.nwCorner;
  const rectangle = computedOptions.boundingRectangle;

  let stLatitude =
    nwCorner.latitude -
    computedOptions.granYCos * row +
    col * computedOptions.granXSin;
  const cosLatitude = cos(stLatitude);
  const nZ = sin(stLatitude);
  const kZ = radiiSquared.z * nZ;

  let stLongitude =
    nwCorner.longitude +
    row * computedOptions.granYSin +
    col * computedOptions.granXCos;
  const nX = cosLatitude * cos(stLongitude);
  const nY = cosLatitude * sin(stLongitude);

  const kX = radiiSquared.x * nX;
  const kY = radiiSquared.y * nY;

  const gamma = sqrt(kX * nX + kY * nY + kZ * nZ);

  position.x = kX / gamma;
  position.y = kY / gamma;
  position.z = kZ / gamma;

  if (computeST) {
    const stNwCorner = computedOptions.stNwCorner;
    if (defined(stNwCorner)) {
      stLatitude =
        stNwCorner.latitude -
        computedOptions.stGranYCos * row +
        col * computedOptions.stGranXSin;
      stLongitude =
        stNwCorner.longitude +
        row * computedOptions.stGranYSin +
        col * computedOptions.stGranXCos;

      st.x = (stLongitude - computedOptions.stWest) * computedOptions.lonScalar;
      st.y = (stLatitude - computedOptions.stSouth) * computedOptions.latScalar;
    } else {
      st.x = (stLongitude - rectangle.west) * computedOptions.lonScalar;
      st.y = (stLatitude - rectangle.south) * computedOptions.latScalar;
    }
  }
};

const rotationMatrixScratch = new Matrix2();
let nwCartesian = new Cartesian3();
const centerScratch = new Cartographic();
let centerCartesian = new Cartesian3();
const proj = new GeographicProjection();

function getRotationOptions(
  nwCorner,
  rotation,
  granularityX,
  granularityY,
  center,
  width,
  height
) {
  const cosRotation = Math.cos(rotation);
  const granYCos = granularityY * cosRotation;
  const granXCos = granularityX * cosRotation;

  const sinRotation = Math.sin(rotation);
  const granYSin = granularityY * sinRotation;
  const granXSin = granularityX * sinRotation;

  proj._ellipsoid = Ellipsoid.default;
  nwCartesian = proj.project(nwCorner, nwCartesian);

  nwCartesian = Cartesian3.subtract(nwCartesian, centerCartesian, nwCartesian);
  const rotationMatrix = Matrix2.fromRotation(rotation, rotationMatrixScratch);
  nwCartesian = Matrix2.multiplyByVector(
    rotationMatrix,
    nwCartesian,
    nwCartesian
  );
  nwCartesian = Cartesian3.add(nwCartesian, centerCartesian, nwCartesian);
  nwCorner = proj.unproject(nwCartesian, nwCorner);

  width -= 1;
  height -= 1;

  const latitude = nwCorner.latitude;
  const latitude0 = latitude + width * granXSin;
  const latitude1 = latitude - granYCos * height;
  const latitude2 = latitude - granYCos * height + width * granXSin;

  const north = Math.max(latitude, latitude0, latitude1, latitude2);
  const south = Math.min(latitude, latitude0, latitude1, latitude2);

  const longitude = nwCorner.longitude;
  const longitude0 = longitude + width * granXCos;
  const longitude1 = longitude + height * granYSin;
  const longitude2 = longitude + height * granYSin + width * granXCos;

  const east = Math.max(longitude, longitude0, longitude1, longitude2);
  const west = Math.min(longitude, longitude0, longitude1, longitude2);

  return {
    north: north,
    south: south,
    east: east,
    west: west,
    granYCos: granYCos,
    granYSin: granYSin,
    granXCos: granXCos,
    granXSin: granXSin,
    nwCorner: nwCorner,
  };
}

/**
 * @private
 */
RectangleGeometryLibrary.computeOptions = function (
  rectangle,
  granularity,
  rotation,
  stRotation,
  boundingRectangleScratch,
  nwCornerResult,
  stNwCornerResult
) {
  let east = rectangle.east;
  let west = rectangle.west;
  let north = rectangle.north;
  let south = rectangle.south;

  let northCap = false;
  let southCap = false;

  if (north === CesiumMath.PI_OVER_TWO) {
    northCap = true;
  }
  if (south === -CesiumMath.PI_OVER_TWO) {
    southCap = true;
  }

  let dx;
  const dy = north - south;
  if (west > east) {
    dx = CesiumMath.TWO_PI - west + east;
  } else {
    dx = east - west;
  }

  const width = Math.ceil(dx / granularity) + 1;
  const height = Math.ceil(dy / granularity) + 1;
  const granularityX = dx / (width - 1);
  const granularityY = dy / (height - 1);

  const nwCorner = Rectangle.northwest(rectangle, nwCornerResult);
  const center = Rectangle.center(rectangle, centerScratch);
  if (rotation !== 0 || stRotation !== 0) {
    if (center.longitude < nwCorner.longitude) {
      center.longitude += CesiumMath.TWO_PI;
    }
    proj._ellipsoid = Ellipsoid.default;
    centerCartesian = proj.project(center, centerCartesian);
  }

  const granYCos = granularityY;
  const granXCos = granularityX;
  const granYSin = 0.0;
  const granXSin = 0.0;

  const boundingRectangle = Rectangle.clone(
    rectangle,
    boundingRectangleScratch
  );

  const computedOptions = {
    granYCos: granYCos,
    granYSin: granYSin,
    granXCos: granXCos,
    granXSin: granXSin,
    nwCorner: nwCorner,
    boundingRectangle: boundingRectangle,
    width: width,
    height: height,
    northCap: northCap,
    southCap: southCap,
  };

  if (rotation !== 0) {
    const rotationOptions = getRotationOptions(
      nwCorner,
      rotation,
      granularityX,
      granularityY,
      center,
      width,
      height
    );
    north = rotationOptions.north;
    south = rotationOptions.south;
    east = rotationOptions.east;
    west = rotationOptions.west;

    //>>includeStart('debug', pragmas.debug);
    if (
      north < -CesiumMath.PI_OVER_TWO ||
      north > CesiumMath.PI_OVER_TWO ||
      south < -CesiumMath.PI_OVER_TWO ||
      south > CesiumMath.PI_OVER_TWO
    ) {
      throw new DeveloperError(
        "Rotated rectangle is invalid.  It crosses over either the north or south pole."
      );
    }
    //>>includeEnd('debug')

    computedOptions.granYCos = rotationOptions.granYCos;
    computedOptions.granYSin = rotationOptions.granYSin;
    computedOptions.granXCos = rotationOptions.granXCos;
    computedOptions.granXSin = rotationOptions.granXSin;

    boundingRectangle.north = north;
    boundingRectangle.south = south;
    boundingRectangle.east = east;
    boundingRectangle.west = west;
  }

  if (stRotation !== 0) {
    rotation = rotation - stRotation;
    const stNwCorner = Rectangle.northwest(boundingRectangle, stNwCornerResult);

    const stRotationOptions = getRotationOptions(
      stNwCorner,
      rotation,
      granularityX,
      granularityY,
      center,
      width,
      height
    );

    computedOptions.stGranYCos = stRotationOptions.granYCos;
    computedOptions.stGranXCos = stRotationOptions.granXCos;
    computedOptions.stGranYSin = stRotationOptions.granYSin;
    computedOptions.stGranXSin = stRotationOptions.granXSin;
    computedOptions.stNwCorner = stNwCorner;
    computedOptions.stWest = stRotationOptions.west;
    computedOptions.stSouth = stRotationOptions.south;
  }

  return computedOptions;
};
export default RectangleGeometryLibrary;
