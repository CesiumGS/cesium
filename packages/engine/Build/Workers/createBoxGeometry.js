define(['./BoxGeometry-33c10a4f', './defaultValue-0a909f67', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './Math-2dbd6b93', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './VertexFormat-6b480673'], (function (BoxGeometry, defaultValue, Transforms, Matrix3, Check, Math, Matrix2, RuntimeError, combine, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, VertexFormat) { 'use strict';

  function createBoxGeometry(boxGeometry, offset) {
    if (defaultValue.defined(offset)) {
      boxGeometry = BoxGeometry.BoxGeometry.unpack(boxGeometry, offset);
    }
    return BoxGeometry.BoxGeometry.createGeometry(boxGeometry);
  }

  return createBoxGeometry;

}));
