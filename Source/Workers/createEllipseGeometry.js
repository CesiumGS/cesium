/* This file is automatically rebuilt by the Cesium build process. */
define(['./Cartesian2-eb270219', './when-e6985d2a', './EllipseGeometry-a9b64cbd', './Check-24cae389', './Math-ae27e6c0', './GeometryOffsetAttribute-93be55c3', './Transforms-ee5c1729', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './EllipseGeometryLibrary-31b1e4b4', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './GeometryInstance-45be308f', './GeometryPipeline-4d0f4a58', './AttributeCompression-be503b68', './EncodedCartesian3-69ca3453', './IndexDatatype-21fdd02b', './IntersectionTests-a2675a5c', './Plane-18686069', './VertexFormat-2df57ea4'], function (Cartesian2, when, EllipseGeometry, Check, _Math, GeometryOffsetAttribute, Transforms, RuntimeError, ComponentDatatype, WebGLConstants, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, VertexFormat) { 'use strict';

  function createEllipseGeometry(ellipseGeometry, offset) {
    if (when.defined(offset)) {
      ellipseGeometry = EllipseGeometry.EllipseGeometry.unpack(ellipseGeometry, offset);
    }
    ellipseGeometry._center = Cartesian2.Cartesian3.clone(ellipseGeometry._center);
    ellipseGeometry._ellipsoid = Cartesian2.Ellipsoid.clone(ellipseGeometry._ellipsoid);
    return EllipseGeometry.EllipseGeometry.createGeometry(ellipseGeometry);
  }

  return createEllipseGeometry;

});
