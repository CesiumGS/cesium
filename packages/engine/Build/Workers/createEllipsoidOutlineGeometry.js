define(['./defaultValue-0a909f67', './EllipsoidOutlineGeometry-3e8779bf', './Transforms-26539bce', './Matrix3-315394f6', './Check-666ab1a0', './Math-2dbd6b93', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './IndexDatatype-a55ceaa1'], (function (defaultValue, EllipsoidOutlineGeometry, Transforms, Matrix3, Check, Math, Matrix2, RuntimeError, combine, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, IndexDatatype) { 'use strict';

  function createEllipsoidOutlineGeometry(ellipsoidGeometry, offset) {
    if (defaultValue.defined(ellipsoidGeometry.buffer)) {
      ellipsoidGeometry = EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.unpack(
        ellipsoidGeometry,
        offset
      );
    }
    return EllipsoidOutlineGeometry.EllipsoidOutlineGeometry.createGeometry(ellipsoidGeometry);
  }

  return createEllipsoidOutlineGeometry;

}));
