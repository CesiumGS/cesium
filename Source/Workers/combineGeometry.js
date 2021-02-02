/* This file is automatically rebuilt by the Cesium build process. */
define(['./PrimitivePipeline-a8f06886', './createTaskProcessorWorker', './Transforms-ee5c1729', './Cartesian2-eb270219', './Check-24cae389', './when-e6985d2a', './Math-ae27e6c0', './RuntimeError-61701d3e', './ComponentDatatype-cb08e294', './WebGLConstants-34c08bc0', './GeometryAttribute-0599418c', './GeometryAttributes-d6ea8c2b', './GeometryPipeline-4d0f4a58', './AttributeCompression-be503b68', './EncodedCartesian3-69ca3453', './IndexDatatype-21fdd02b', './IntersectionTests-a2675a5c', './Plane-18686069', './WebMercatorProjection-7e20f237'], function (PrimitivePipeline, createTaskProcessorWorker, Transforms, Cartesian2, Check, when, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, WebMercatorProjection) { 'use strict';

  function combineGeometry(packedParameters, transferableObjects) {
    var parameters = PrimitivePipeline.PrimitivePipeline.unpackCombineGeometryParameters(
      packedParameters
    );
    var results = PrimitivePipeline.PrimitivePipeline.combineGeometry(parameters);
    return PrimitivePipeline.PrimitivePipeline.packCombineGeometryResults(
      results,
      transferableObjects
    );
  }
  var combineGeometry$1 = createTaskProcessorWorker(combineGeometry);

  return combineGeometry$1;

});
