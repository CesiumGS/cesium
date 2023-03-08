define(['./defaultValue-0a909f67', './EllipsoidGeometry-a351dba8', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './Math-2dbd6b93', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './IndexDatatype-a55ceaa1', './VertexFormat-6b480673'], (function (defaultValue, EllipsoidGeometry, Transforms, Matrix3, Check, Math, Matrix2, RuntimeError, combine, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, IndexDatatype, VertexFormat) { 'use strict';

  function createEllipsoidGeometry(ellipsoidGeometry, offset) {
    if (defaultValue.defined(offset)) {
      ellipsoidGeometry = EllipsoidGeometry.EllipsoidGeometry.unpack(ellipsoidGeometry, offset);
    }
    return EllipsoidGeometry.EllipsoidGeometry.createGeometry(ellipsoidGeometry);
  }

  return createEllipsoidGeometry;

}));
