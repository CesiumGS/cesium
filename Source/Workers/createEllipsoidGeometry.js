/* This file is automatically rebuilt by the Cesium build process. */
define(['./when-e6985d2a', './EllipsoidGeometry-51908654', './GeometryOffsetAttribute-93be55c3', './Check-24cae389', './Transforms-ee5c1729', './Cartesian2-eb270219', './Math-ae27e6c0', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './IndexDatatype-21fdd02b', './VertexFormat-2df57ea4'], function (when, EllipsoidGeometry, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, IndexDatatype, VertexFormat) { 'use strict';

  function createEllipsoidGeometry(ellipsoidGeometry, offset) {
    if (when.defined(offset)) {
      ellipsoidGeometry = EllipsoidGeometry.EllipsoidGeometry.unpack(ellipsoidGeometry, offset);
    }
    return EllipsoidGeometry.EllipsoidGeometry.createGeometry(ellipsoidGeometry);
  }

  return createEllipsoidGeometry;

});
