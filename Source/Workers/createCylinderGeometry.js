/* This file is automatically rebuilt by the Cesium build process. */
define(['./CylinderGeometry-4ff92afc', './when-e6985d2a', './GeometryOffsetAttribute-93be55c3', './Check-24cae389', './Transforms-ee5c1729', './Cartesian2-eb270219', './Math-ae27e6c0', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './CylinderGeometryLibrary-c60bdeda', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './IndexDatatype-21fdd02b', './VertexFormat-2df57ea4'], function (CylinderGeometry, when, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, CylinderGeometryLibrary, GeometryAttribute, GeometryAttributes, IndexDatatype, VertexFormat) { 'use strict';

  function createCylinderGeometry(cylinderGeometry, offset) {
    if (when.defined(offset)) {
      cylinderGeometry = CylinderGeometry.CylinderGeometry.unpack(cylinderGeometry, offset);
    }
    return CylinderGeometry.CylinderGeometry.createGeometry(cylinderGeometry);
  }

  return createCylinderGeometry;

});
