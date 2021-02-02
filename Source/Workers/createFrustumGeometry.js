/* This file is automatically rebuilt by the Cesium build process. */
define(['./when-e6985d2a', './FrustumGeometry-6e254695', './Transforms-ee5c1729', './Cartesian2-eb270219', './Check-24cae389', './Math-ae27e6c0', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './Plane-18686069', './VertexFormat-2df57ea4'], function (when, FrustumGeometry, Transforms, Cartesian2, Check, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, Plane, VertexFormat) { 'use strict';

  function createFrustumGeometry(frustumGeometry, offset) {
    if (when.defined(offset)) {
      frustumGeometry = FrustumGeometry.FrustumGeometry.unpack(frustumGeometry, offset);
    }
    return FrustumGeometry.FrustumGeometry.createGeometry(frustumGeometry);
  }

  return createFrustumGeometry;

});
