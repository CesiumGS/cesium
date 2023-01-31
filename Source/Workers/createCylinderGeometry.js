/* This file is automatically rebuilt by the Cesium build process. */
define(['./CylinderGeometry-18d3468a', './when-9f8cafad', './GeometryOffsetAttribute-a43cd3fe', './Check-c23b5bd5', './Transforms-0a60c469', './Cartesian2-ea36f114', './Math-cf2f57e0', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './CylinderGeometryLibrary-4b448340', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './IndexDatatype-d65a2d74', './VertexFormat-acf66ec0'], function (CylinderGeometry, when, GeometryOffsetAttribute, Check, Transforms, Cartesian2, _Math, RuntimeError, ComponentDatatype, WebGLConstants, CylinderGeometryLibrary, GeometryAttribute, GeometryAttributes, IndexDatatype, VertexFormat) { 'use strict';

  function createCylinderGeometry(cylinderGeometry, offset) {
    if (when.defined(offset)) {
      cylinderGeometry = CylinderGeometry.CylinderGeometry.unpack(cylinderGeometry, offset);
    }
    return CylinderGeometry.CylinderGeometry.createGeometry(cylinderGeometry);
  }

  return createCylinderGeometry;

});
