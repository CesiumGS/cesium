/* This file is automatically rebuilt by the Cesium build process. */
define(['./BoxGeometry-a4d1ac7c', './when-e6985d2a', './GeometryOffsetAttribute-93be55c3', './Check-24cae389', './Transforms-ee5c1729', './Cartesian2-eb270219', './Math-ae27e6c0', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './VertexFormat-2df57ea4'], function (BoxGeometry, when, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, VertexFormat) { 'use strict';

  function createBoxGeometry(boxGeometry, offset) {
    if (when.defined(offset)) {
      boxGeometry = BoxGeometry.BoxGeometry.unpack(boxGeometry, offset);
    }
    return BoxGeometry.BoxGeometry.createGeometry(boxGeometry);
  }

  return createBoxGeometry;

});
