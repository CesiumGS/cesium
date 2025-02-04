import ArcType from "../Core/ArcType.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import defined from "../Core/defined.js";
import Rectangle from "../Core/Rectangle.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";
import Cartesian3 from "../Core/Cartesian3.js";

class PolygonFeatureGeometry {
  constructor({
    hierarchy,
    show = true,
    arcType = ArcType.GEODESIC,
    ellipsoid = Ellipsoid.default,
  }) {
    this._show = show;
    this._hierarchy = hierarchy;
    this._arcType = arcType;
    this._ellipsoid = ellipsoid;

    this._debugWireframe = false;

    this._rectangle = undefined;

    // Saved so polygon rings can be dropped if
    // the area is too small for the current view
    this._outerRingArea = undefined;
    this._holeAreas = [];
  }

  get geometryType() {
    return "POLYGON"; // TODO: ENUM
  }

  get primitiveType() {
    return PrimitiveType.TRIANGLES;
  }

  get show() {
    return this._show;
  }
  set show(value) {
    this._show = value;
  }

  get positions() {
    return this._hierarchy.positions;
  }

  get rectangle() {
    if (!defined(this._rectangle)) {
      this._rectangle = Rectangle.fromCartesianArray(
        this.positions,
        this._ellipsoid,
      );
    }

    return this._rectangle;
  }

  // Rough approximation of area of outer ring
  // based on its bounding rectangle
  get area() {
    if (!defined(this._outerRingArea)) {
      const rectangle = this.rectangle;

      this._outerRingArea = this._ellipsoid.surfaceArea(rectangle);
    }

    return this._outerRingArea;
  }
}

PolygonFeatureGeometry.fromGeoJsonGeometry = function ({ type, coordinates }) {
  if (coordinates.length === 0 || coordinates[0].length === 0) {
    return;
  }

  if (type === "MultiPolygon") {
    // TODO: Multiple geometries
    const hierarchy = new PolygonHierarchy(
      coordinates[0][0].map((degrees) => Cartesian3.fromDegrees(...degrees)),
    );
    return new PolygonFeatureGeometry({
      hierarchy,
    });
  }

  // TODO: Holes
  // TODO: CRS
  const hierarchy = new PolygonHierarchy(
    coordinates[0].map((degrees) => Cartesian3.fromDegrees(...degrees)),
  );
  return new PolygonFeatureGeometry({
    hierarchy,
  });
};

export default PolygonFeatureGeometry;
