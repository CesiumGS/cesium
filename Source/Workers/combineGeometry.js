/* This file is automatically rebuilt by the Cesium build process. */
define(['./PrimitivePipeline-1622a6cf', './createTaskProcessorWorker', './Transforms-0a60c469', './Cartesian2-ea36f114', './Check-c23b5bd5', './when-9f8cafad', './Math-cf2f57e0', './RuntimeError-40167735', './ComponentDatatype-ec57da04', './WebGLConstants-daaa9be0', './GeometryAttribute-abbafb10', './GeometryAttributes-fcb70320', './GeometryPipeline-8ffde617', './AttributeCompression-953fe0fc', './EncodedCartesian3-daa43175', './IndexDatatype-d65a2d74', './IntersectionTests-b2d4b64d', './Plane-ed60195c', './WebMercatorProjection-c11d982d'], function (PrimitivePipeline, createTaskProcessorWorker, Transforms, Cartesian2, Check, when, _Math, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryPipeline, AttributeCompression, EncodedCartesian3, IndexDatatype, IntersectionTests, Plane, WebMercatorProjection) { 'use strict';

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
