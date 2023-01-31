/* This file is automatically rebuilt by the Cesium build process. */
define(['./Cartesian2-ea36f114', './when-9f8cafad', './EllipseGeometry-ffa2ba84', './Check-c23b5bd5', './Math-cf2f57e0', './GeometryOffsetAttribute-a43cd3fe', './Transforms-0a60c469', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './EllipseGeometryLibrary-426a25d8', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './GeometryInstance-7e32a7ef', './GeometryPipeline-8ffde617', './AttributeCompression-953fe0fc', './EncodedCartesian3-daa43175', './IndexDatatype-d65a2d74', './IntersectionTests-b2d4b64d', './Plane-ed60195c', './VertexFormat-acf66ec0'], function (Cartesian2, when, EllipseGeometry, Check, _Math, GeometryOffsetAttribute, Transforms, RuntimeError, ComponentDatatype, WebGLConstants, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, VertexFormat) { 'use strict';

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
