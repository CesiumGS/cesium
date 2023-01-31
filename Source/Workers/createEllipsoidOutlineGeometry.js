/* This file is automatically rebuilt by the Cesium build process. */
define(['./when-9f8cafad', './EllipsoidOutlineGeometry-da838404', './GeometryOffsetAttribute-a43cd3fe', './Check-c23b5bd5', './Transforms-0a60c469', './Cartesian2-ea36f114', './Math-cf2f57e0', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './IndexDatatype-d65a2d74'], function (when, EllipsoidOutlineGeometry, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, IndexDatatype) { 'use strict';

  function createEllipsoidOutlineGeometry(ellipsoidGeometry, offset) {
    if (when.defined(ellipsoidGeometry.buffer)) {
      ellipsoidGeometry = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.unpack(
        ellipsoidGeometry,
        offset
      );
    }
    return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
  }

  return createEllipsoidOutlineGeometry;

});
