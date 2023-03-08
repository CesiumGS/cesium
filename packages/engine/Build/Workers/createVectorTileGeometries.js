define(['./Transforms-26539bce', './BoxGeometry-33c10a4f', './Matrix3-315394f6', './Color-1bf9a6e0', './CylinderGeometry-42740df0', './defaultValue-0a909f67', './EllipsoidGeometry-a351dba8', './IndexDatatype-a55ceaa1', './Matrix2-13178034', './createTaskProcessorWorker', './Check-666ab1a0', './Math-2dbd6b93', './combine-ca22a614', './RuntimeError-06c93819', './ComponentDatatype-f7b11d02', './WebGLConstants-a8cc3e8c', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryOffsetAttribute-04332ce7', './VertexFormat-6b480673', './CylinderGeometryLibrary-372c07d8'], (function (Transforms, BoxGeometry, Matrix3, Color, CylinderGeometry, defaultValue, EllipsoidGeometry, IndexDatatype, Matrix2, createTaskProcessorWorker, Check, Math$1, combine, RuntimeError, ComponentDatatype, WebGLConstants, GeometryAttribute, GeometryAttributes, GeometryOffsetAttribute, VertexFormat, CylinderGeometryLibrary) { 'use strict';

  /**
   * Describes a renderable batch of geometry.
   *
   * @alias Vector3DTileBatch
   * @constructor
   *
   * @param {Object} options An object with the following properties:
   * @param {Number} options.offset The offset of the batch into the indices buffer.
   * @param {Number} options.count The number of indices in the batch.
   * @param {Color} options.color The color of the geometry in the batch.
   * @param {Number[]} options.batchIds An array where each element is the batch id of the geometry in the batch.
   *
   * @private
   */
  function Vector3DTileBatch(options) {
    /**
     * The offset of the batch into the indices buffer.
     * @type {Number}
     */
    this.offset = options.offset;
    /**
     * The number of indices in the batch.
     * @type {Number}
     */
    this.count = options.count;
    /**
     * The color of the geometry in the batch.
     * @type {Color}
     */
    this.color = options.color;
    /**
     * An array where each element is the batch id of the geometry in the batch.
     * @type {Number[]}
     */
    this.batchIds = options.batchIds;
  }

  const scratchCartesian = new Matrix3.Cartesian3();

  const packedBoxLength = Matrix2.Matrix4.packedLength + Matrix3.Cartesian3.packedLength;
  const packedCylinderLength = Matrix2.Matrix4.packedLength + 2;
  const packedEllipsoidLength = Matrix2.Matrix4.packedLength + Matrix3.Cartesian3.packedLength;
  const packedSphereLength = Matrix3.Cartesian3.packedLength + 1;

  const scratchModelMatrixAndBV = {
    modelMatrix: new Matrix2.Matrix4(),
    boundingVolume: new Transforms.BoundingSphere(),
  };

  function boxModelMatrixAndBoundingVolume(boxes, index) {
    let boxIndex = index * packedBoxLength;

    const dimensions = Matrix3.Cartesian3.unpack(boxes, boxIndex, scratchCartesian);
    boxIndex += Matrix3.Cartesian3.packedLength;

    const boxModelMatrix = Matrix2.Matrix4.unpack(
      boxes,
      boxIndex,
      scratchModelMatrixAndBV.modelMatrix
    );
    Matrix2.Matrix4.multiplyByScale(boxModelMatrix, dimensions, boxModelMatrix);

    const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
    Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, boundingVolume.center);
    boundingVolume.radius = Math.sqrt(3.0);

    return scratchModelMatrixAndBV;
  }

  function cylinderModelMatrixAndBoundingVolume(cylinders, index) {
    let cylinderIndex = index * packedCylinderLength;

    const cylinderRadius = cylinders[cylinderIndex++];
    const length = cylinders[cylinderIndex++];
    const scale = Matrix3.Cartesian3.fromElements(
      cylinderRadius,
      cylinderRadius,
      length,
      scratchCartesian
    );

    const cylinderModelMatrix = Matrix2.Matrix4.unpack(
      cylinders,
      cylinderIndex,
      scratchModelMatrixAndBV.modelMatrix
    );
    Matrix2.Matrix4.multiplyByScale(cylinderModelMatrix, scale, cylinderModelMatrix);

    const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
    Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, boundingVolume.center);
    boundingVolume.radius = Math.sqrt(2.0);

    return scratchModelMatrixAndBV;
  }

  function ellipsoidModelMatrixAndBoundingVolume(ellipsoids, index) {
    let ellipsoidIndex = index * packedEllipsoidLength;

    const radii = Matrix3.Cartesian3.unpack(ellipsoids, ellipsoidIndex, scratchCartesian);
    ellipsoidIndex += Matrix3.Cartesian3.packedLength;

    const ellipsoidModelMatrix = Matrix2.Matrix4.unpack(
      ellipsoids,
      ellipsoidIndex,
      scratchModelMatrixAndBV.modelMatrix
    );
    Matrix2.Matrix4.multiplyByScale(ellipsoidModelMatrix, radii, ellipsoidModelMatrix);

    const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
    Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, boundingVolume.center);
    boundingVolume.radius = 1.0;

    return scratchModelMatrixAndBV;
  }

  function sphereModelMatrixAndBoundingVolume(spheres, index) {
    let sphereIndex = index * packedSphereLength;

    const sphereRadius = spheres[sphereIndex++];

    const sphereTranslation = Matrix3.Cartesian3.unpack(
      spheres,
      sphereIndex,
      scratchCartesian
    );
    const sphereModelMatrix = Matrix2.Matrix4.fromTranslation(
      sphereTranslation,
      scratchModelMatrixAndBV.modelMatrix
    );
    Matrix2.Matrix4.multiplyByUniformScale(
      sphereModelMatrix,
      sphereRadius,
      sphereModelMatrix
    );

    const boundingVolume = scratchModelMatrixAndBV.boundingVolume;
    Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, boundingVolume.center);
    boundingVolume.radius = 1.0;

    return scratchModelMatrixAndBV;
  }

  const scratchPosition = new Matrix3.Cartesian3();

  function createPrimitive(
    options,
    primitive,
    primitiveBatchIds,
    geometry,
    getModelMatrixAndBoundingVolume
  ) {
    if (!defaultValue.defined(primitive)) {
      return;
    }

    const numberOfPrimitives = primitiveBatchIds.length;
    const geometryPositions = geometry.attributes.position.values;
    const geometryIndices = geometry.indices;

    const positions = options.positions;
    const vertexBatchIds = options.vertexBatchIds;
    const indices = options.indices;

    const batchIds = options.batchIds;
    const batchTableColors = options.batchTableColors;
    const batchedIndices = options.batchedIndices;
    const indexOffsets = options.indexOffsets;
    const indexCounts = options.indexCounts;
    const boundingVolumes = options.boundingVolumes;

    const modelMatrix = options.modelMatrix;
    const center = options.center;

    let positionOffset = options.positionOffset;
    let batchIdIndex = options.batchIdIndex;
    let indexOffset = options.indexOffset;
    const batchedIndicesOffset = options.batchedIndicesOffset;

    for (let i = 0; i < numberOfPrimitives; ++i) {
      const primitiveModelMatrixAndBV = getModelMatrixAndBoundingVolume(
        primitive,
        i
      );
      const primitiveModelMatrix = primitiveModelMatrixAndBV.modelMatrix;
      Matrix2.Matrix4.multiply(modelMatrix, primitiveModelMatrix, primitiveModelMatrix);

      const batchId = primitiveBatchIds[i];

      const positionsLength = geometryPositions.length;
      for (let j = 0; j < positionsLength; j += 3) {
        const position = Matrix3.Cartesian3.unpack(geometryPositions, j, scratchPosition);
        Matrix2.Matrix4.multiplyByPoint(primitiveModelMatrix, position, position);
        Matrix3.Cartesian3.subtract(position, center, position);

        Matrix3.Cartesian3.pack(position, positions, positionOffset * 3 + j);
        vertexBatchIds[batchIdIndex++] = batchId;
      }

      const indicesLength = geometryIndices.length;
      for (let k = 0; k < indicesLength; ++k) {
        indices[indexOffset + k] = geometryIndices[k] + positionOffset;
      }

      const offset = i + batchedIndicesOffset;
      batchedIndices[offset] = new Vector3DTileBatch({
        offset: indexOffset,
        count: indicesLength,
        color: Color.Color.fromRgba(batchTableColors[batchId]),
        batchIds: [batchId],
      });
      batchIds[offset] = batchId;
      indexOffsets[offset] = indexOffset;
      indexCounts[offset] = indicesLength;
      boundingVolumes[offset] = Transforms.BoundingSphere.transform(
        primitiveModelMatrixAndBV.boundingVolume,
        primitiveModelMatrix
      );

      positionOffset += positionsLength / 3;
      indexOffset += indicesLength;
    }

    options.positionOffset = positionOffset;
    options.batchIdIndex = batchIdIndex;
    options.indexOffset = indexOffset;
    options.batchedIndicesOffset += numberOfPrimitives;
  }

  const scratchCenter = new Matrix3.Cartesian3();
  const scratchMatrix4 = new Matrix2.Matrix4();

  function unpackBuffer(buffer) {
    const packedBuffer = new Float64Array(buffer);

    let offset = 0;
    Matrix3.Cartesian3.unpack(packedBuffer, offset, scratchCenter);
    offset += Matrix3.Cartesian3.packedLength;

    Matrix2.Matrix4.unpack(packedBuffer, offset, scratchMatrix4);
  }

  function packedBatchedIndicesLength(batchedIndices) {
    const length = batchedIndices.length;
    let count = 0;
    for (let i = 0; i < length; ++i) {
      count += Color.Color.packedLength + 3 + batchedIndices[i].batchIds.length;
    }
    return count;
  }

  function packBuffer(indicesBytesPerElement, batchedIndices, boundingVolumes) {
    const numBVs = boundingVolumes.length;
    const length =
      1 +
      1 +
      numBVs * Transforms.BoundingSphere.packedLength +
      1 +
      packedBatchedIndicesLength(batchedIndices);

    const packedBuffer = new Float64Array(length);

    let offset = 0;
    packedBuffer[offset++] = indicesBytesPerElement;
    packedBuffer[offset++] = numBVs;

    for (let i = 0; i < numBVs; ++i) {
      Transforms.BoundingSphere.pack(boundingVolumes[i], packedBuffer, offset);
      offset += Transforms.BoundingSphere.packedLength;
    }

    const indicesLength = batchedIndices.length;
    packedBuffer[offset++] = indicesLength;

    for (let j = 0; j < indicesLength; ++j) {
      const batchedIndex = batchedIndices[j];

      Color.Color.pack(batchedIndex.color, packedBuffer, offset);
      offset += Color.Color.packedLength;

      packedBuffer[offset++] = batchedIndex.offset;
      packedBuffer[offset++] = batchedIndex.count;

      const batchIds = batchedIndex.batchIds;
      const batchIdsLength = batchIds.length;
      packedBuffer[offset++] = batchIdsLength;

      for (let k = 0; k < batchIdsLength; ++k) {
        packedBuffer[offset++] = batchIds[k];
      }
    }

    return packedBuffer;
  }

  function createVectorTileGeometries(parameters, transferableObjects) {
    const boxes = defaultValue.defined(parameters.boxes)
      ? new Float32Array(parameters.boxes)
      : undefined;
    const boxBatchIds = defaultValue.defined(parameters.boxBatchIds)
      ? new Uint16Array(parameters.boxBatchIds)
      : undefined;
    const cylinders = defaultValue.defined(parameters.cylinders)
      ? new Float32Array(parameters.cylinders)
      : undefined;
    const cylinderBatchIds = defaultValue.defined(parameters.cylinderBatchIds)
      ? new Uint16Array(parameters.cylinderBatchIds)
      : undefined;
    const ellipsoids = defaultValue.defined(parameters.ellipsoids)
      ? new Float32Array(parameters.ellipsoids)
      : undefined;
    const ellipsoidBatchIds = defaultValue.defined(parameters.ellipsoidBatchIds)
      ? new Uint16Array(parameters.ellipsoidBatchIds)
      : undefined;
    const spheres = defaultValue.defined(parameters.spheres)
      ? new Float32Array(parameters.spheres)
      : undefined;
    const sphereBatchIds = defaultValue.defined(parameters.sphereBatchIds)
      ? new Uint16Array(parameters.sphereBatchIds)
      : undefined;

    const numberOfBoxes = defaultValue.defined(boxes) ? boxBatchIds.length : 0;
    const numberOfCylinders = defaultValue.defined(cylinders) ? cylinderBatchIds.length : 0;
    const numberOfEllipsoids = defaultValue.defined(ellipsoids) ? ellipsoidBatchIds.length : 0;
    const numberOfSpheres = defaultValue.defined(spheres) ? sphereBatchIds.length : 0;

    const boxGeometry = BoxGeometry.BoxGeometry.getUnitBox();
    const cylinderGeometry = CylinderGeometry.CylinderGeometry.getUnitCylinder();
    const ellipsoidGeometry = EllipsoidGeometry.EllipsoidGeometry.getUnitEllipsoid();

    const boxPositions = boxGeometry.attributes.position.values;
    const cylinderPositions = cylinderGeometry.attributes.position.values;
    const ellipsoidPositions = ellipsoidGeometry.attributes.position.values;

    let numberOfPositions = boxPositions.length * numberOfBoxes;
    numberOfPositions += cylinderPositions.length * numberOfCylinders;
    numberOfPositions +=
      ellipsoidPositions.length * (numberOfEllipsoids + numberOfSpheres);

    const boxIndices = boxGeometry.indices;
    const cylinderIndices = cylinderGeometry.indices;
    const ellipsoidIndices = ellipsoidGeometry.indices;

    let numberOfIndices = boxIndices.length * numberOfBoxes;
    numberOfIndices += cylinderIndices.length * numberOfCylinders;
    numberOfIndices +=
      ellipsoidIndices.length * (numberOfEllipsoids + numberOfSpheres);

    const positions = new Float32Array(numberOfPositions);
    const vertexBatchIds = new Uint16Array(numberOfPositions / 3);
    const indices = IndexDatatype.IndexDatatype.createTypedArray(
      numberOfPositions / 3,
      numberOfIndices
    );

    const numberOfGeometries =
      numberOfBoxes + numberOfCylinders + numberOfEllipsoids + numberOfSpheres;
    const batchIds = new Uint16Array(numberOfGeometries);
    const batchedIndices = new Array(numberOfGeometries);
    const indexOffsets = new Uint32Array(numberOfGeometries);
    const indexCounts = new Uint32Array(numberOfGeometries);
    const boundingVolumes = new Array(numberOfGeometries);

    unpackBuffer(parameters.packedBuffer);

    const options = {
      batchTableColors: new Uint32Array(parameters.batchTableColors),
      positions: positions,
      vertexBatchIds: vertexBatchIds,
      indices: indices,
      batchIds: batchIds,
      batchedIndices: batchedIndices,
      indexOffsets: indexOffsets,
      indexCounts: indexCounts,
      boundingVolumes: boundingVolumes,
      positionOffset: 0,
      batchIdIndex: 0,
      indexOffset: 0,
      batchedIndicesOffset: 0,
      modelMatrix: scratchMatrix4,
      center: scratchCenter,
    };

    createPrimitive(
      options,
      boxes,
      boxBatchIds,
      boxGeometry,
      boxModelMatrixAndBoundingVolume
    );
    createPrimitive(
      options,
      cylinders,
      cylinderBatchIds,
      cylinderGeometry,
      cylinderModelMatrixAndBoundingVolume
    );
    createPrimitive(
      options,
      ellipsoids,
      ellipsoidBatchIds,
      ellipsoidGeometry,
      ellipsoidModelMatrixAndBoundingVolume
    );
    createPrimitive(
      options,
      spheres,
      sphereBatchIds,
      ellipsoidGeometry,
      sphereModelMatrixAndBoundingVolume
    );

    const packedBuffer = packBuffer(
      indices.BYTES_PER_ELEMENT,
      batchedIndices,
      boundingVolumes
    );
    transferableObjects.push(
      positions.buffer,
      vertexBatchIds.buffer,
      indices.buffer
    );
    transferableObjects.push(
      batchIds.buffer,
      indexOffsets.buffer,
      indexCounts.buffer
    );
    transferableObjects.push(packedBuffer.buffer);

    return {
      positions: positions.buffer,
      vertexBatchIds: vertexBatchIds.buffer,
      indices: indices.buffer,
      indexOffsets: indexOffsets.buffer,
      indexCounts: indexCounts.buffer,
      batchIds: batchIds.buffer,
      packedBuffer: packedBuffer.buffer,
    };
  }
  var createVectorTileGeometries$1 = createTaskProcessorWorker(createVectorTileGeometries);

  return createVectorTileGeometries$1;

}));
