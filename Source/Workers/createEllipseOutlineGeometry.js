/* This file is automatically rebuilt by the Cesium build process. */
define(['./Cartesian2-eb270219', './when-e6985d2a', './EllipseOutlineGeometry-4145c92a', './Check-24cae389', './Math-ae27e6c0', './GeometryOffsetAttribute-93be55c3', './Transforms-ee5c1729', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './EllipseGeometryLibrary-31b1e4b4', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './IndexDatatype-21fdd02b'], function (Cartesian2, when, EllipseOutlineGeometry, Check, _Math, GeometryOffsetAttribute, Transforms, RuntimeError, ComponentDatatype, WebGLConstants, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, IndexDatatype) { 'use strict';

  function createEllipseOutlineGeometry(ellipseGeometry, offset) {
    if (when.defined(offset)) {
      ellipseGeometry = EllipseOutlineGeometry.EllipseOutlineGeometry.unpack(ellipseGeometry, offset);
    }
    ellipseGeometry._center = Cartesian2.Cartesian3.clone(ellipseGeometry._center);
    ellipseGeometry._ellipsoid = Cartesian2.Ellipsoid.clone(ellipseGeometry._ellipsoid);
    return EllipseOutlineGeometry.EllipseOutlineGeometry.createGeometry(ellipseGeometry);
  }

  return createEllipseOutlineGeometry;

});
