/* This file is automatically rebuilt by the Cesium build process. */
define(['./when-9f8cafad', './EllipsoidGeometry-8fb6a6ac', './GeometryOffsetAttribute-a43cd3fe', './Check-c23b5bd5', './Transforms-0a60c469', './Cartesian2-ea36f114', './Math-cf2f57e0', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './IndexDatatype-d65a2d74', './VertexFormat-acf66ec0'], function (when, EllipsoidGeometry, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, IndexDatatype, VertexFormat) { 'use strict';

  function createEllipsoidGeometry(ellipsoidGeometry, offset) {
    if (when.defined(offset)) {
      ellipsoidGeometry = EllipsoidGeometry.EllipsoidGeometry.unpack(ellipsoidGeometry, offset);
    }
    return EllipsoidGeometry.EllipsoidGeometry.createGeometry(ellipsoidGeometry);
  }

  return createEllipsoidGeometry;

});
