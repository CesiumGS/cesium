define(['./Matrix3-315394f6', './defaultValue-0a909f67', './EllipseGeometry-49a3ac21', './Check-666ab1a0', './Math-2dbd6b93', './Transforms-26539bce', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './EllipseGeometryLibrary-b891b2f8', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryInstance-451dc1cd', './GeometryOffsetAttribute-04332ce7', './GeometryPipeline-0166905d', './AttributeCompression-b646d393', './EncodedCartesian3-81f70735', './IndexDatatype-a55ceaa1', './IntersectionTests-a93d3de9', './Plane-900aa728', './VertexFormat-6b480673'], (function (Matrix3, defaultValue, EllipseGeometry, Check, Math, Transforms, Matrix2, RuntimeError, combine, ComponentDatatype, WebGLConstants, EllipseGeometryLibrary, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryOffsetAttribute, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, VertexFormat) { 'use strict';

  function createEllipseGeometry(ellipseGeometry, offset) {
    if (defaultValue.defined(offset)) {
      ellipseGeometry = EllipseGeometry.EllipseGeometry.unpack(ellipseGeometry, offset);
    }
    ellipseGeometry._center = Matrix3.Cartesian3.clone(ellipseGeometry._center);
    ellipseGeometry._ellipsoid = Matrix3.Ellipsoid.clone(ellipseGeometry._ellipsoid);
    return EllipseGeometry.EllipseGeometry.createGeometry(ellipseGeometry);
  }

  return createEllipseGeometry;

}));
