/* This file is automatically rebuilt by the Cesium build process. */
define(['./BoxGeometry-8ee79487', './when-9f8cafad', './GeometryOffsetAttribute-a43cd3fe', './Check-c23b5bd5', './Transforms-0a60c469', './Cartesian2-ea36f114', './Math-cf2f57e0', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './VertexFormat-acf66ec0'], function (BoxGeometry, when, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, VertexFormat) { 'use strict';

  function createBoxGeometry(boxGeometry, offset) {
    if (when.defined(offset)) {
      boxGeometry = BoxGeometry.BoxGeometry.unpack(boxGeometry, offset);
    }
    return BoxGeometry.BoxGeometry.createGeometry(boxGeometry);
  }

  return createBoxGeometry;

});
