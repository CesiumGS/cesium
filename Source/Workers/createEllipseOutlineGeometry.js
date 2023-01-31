/* This file is automatically rebuilt by the Cesium build process. */
define(['./Cartesian2-ea36f114', './when-9f8cafad', './EllipseOutlineGeometry-3c39670d', './Check-c23b5bd5', './Math-cf2f57e0', './GeometryOffsetAttribute-a43cd3fe', './Transforms-0a60c469', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './EllipseGeometryLibrary-426a25d8', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './IndexDatatype-d65a2d74'], function (Cartesian2, when, EllipseOutlineGeometry, Check, _Math, GeometryOffsetAttribute, Transforms, RuntimeError, ComponentDatatype, WebGLConstants, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, IndexDatatype) { 'use strict';

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
