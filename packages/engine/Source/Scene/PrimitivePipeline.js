import BoundingSphere from "../Core/BoundingSphere.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import GeographicProjection from "../Core/GeographicProjection.js";
import Geometry from "../Core/Geometry.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import GeometryAttributes from "../Core/GeometryAttributes.js";
import GeometryPipeline from "../Core/GeometryPipeline.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import OffsetGeometryInstanceAttribute from "../Core/OffsetGeometryInstanceAttribute.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";

const scratchMatrix3 = new Matrix3();

/**
 * Expands a triangle strip or triangle fan into an indexed triangle list,
 * optionally reversing the winding order of the resulting triangles. The
 * OpenGL winding alternation rule for consecutive strip triangles is applied.
 *
 * @param {Geometry} geometry The geometry to modify. Its primitive type must be
 *        <code>PrimitiveType.TRIANGLE_STRIP</code> or
 *        <code>PrimitiveType.TRIANGLE_FAN</code>.
 * @param {boolean} reverseWinding When <code>true</code>, the winding order of
 *        the resulting triangles is reversed.
 * @private
 */
function expandStripFanToTriangles(geometry, reverseWinding) {
  const numberOfVertices = Geometry.computeNumberOfVertices(geometry);
  const isFan = geometry.primitiveType === PrimitiveType.TRIANGLE_FAN;
  let sourceIndices = geometry.indices;

  if (!defined(sourceIndices)) {
    // Non-indexed geometry: the implicit index of vertex i is i
    sourceIndices = IndexDatatype.createTypedArray(
      numberOfVertices,
      numberOfVertices,
    );
    for (let i = 0; i < numberOfVertices; ++i) {
      sourceIndices[i] = i;
    }
  }

  const numberOfTriangles = Math.max(sourceIndices.length - 2, 0);
  const indices = IndexDatatype.createTypedArray(
    numberOfVertices,
    numberOfTriangles * 3,
  );

  for (let i = 0, j = 0; i < numberOfTriangles; ++i, j += 3) {
    let i0;
    let i1;
    let i2;

    if (isFan) {
      i0 = sourceIndices[0];
      i1 = sourceIndices[i + 1];
      i2 = sourceIndices[i + 2];
    } else {
      // TRIANGLE_STRIP: the winding of consecutive triangles alternates
      const even = i % 2 === 0;
      i0 = sourceIndices[even ? i : i + 1];
      i1 = sourceIndices[even ? i + 1 : i];
      i2 = sourceIndices[i + 2];
    }

    if (reverseWinding) {
      indices[j] = i2;
      indices[j + 1] = i1;
      indices[j + 2] = i0;
    } else {
      indices[j] = i0;
      indices[j + 1] = i1;
      indices[j + 2] = i2;
    }
  }

  geometry.indices = indices;
  geometry.primitiveType = PrimitiveType.TRIANGLES;
}

/**
 * Reverses the winding order of the triangles in a geometry.
 *
 * Triangle list geometries keep their indexed or non-indexed representation,
 * so a batch of instances can still be combined after the reversal.
 * Triangle strips and fans are expanded to indexed triangle lists instead,
 * since their triangle winding order can not be reversed by reordering the
 * vertices alone.
 *
 * @param {Geometry} geometry The geometry to modify. Its primitive type must
 *        be a triangle-based topology, see {@link PrimitiveType#isTriangles}.
 * @private
 */
function reverseTriangleWindingOrder(geometry) {
  if (geometry.primitiveType === PrimitiveType.TRIANGLES) {
    const indices = geometry.indices;
    if (defined(indices)) {
      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        indices[i] = indices[i + 2];
        indices[i + 2] = i0;
      }
      return;
    }

    const attributes = geometry.attributes;
    for (const name in attributes) {
      if (attributes.hasOwnProperty(name)) {
        const attribute = attributes[name];
        const values = attribute.values;
        const numberOfComponents = attribute.componentsPerAttribute;
        const numberOfVertices = values.length / numberOfComponents;
        for (let i = 0, j = numberOfVertices - 1; i < j; ++i, --j) {
          for (let k = 0; k < numberOfComponents; ++k) {
            const a = i * numberOfComponents + k;
            const b = j * numberOfComponents + k;
            const tmp = values[a];
            values[a] = values[b];
            values[b] = tmp;
          }
        }
      }
    }
    return;
  }

  expandStripFanToTriangles(geometry, true);
}

function transformToWorldCoordinates(
  instances,
  primitiveModelMatrix,
  scene3DOnly,
) {
  let toWorld = !scene3DOnly;
  const length = instances.length;
  let i;

  if (!toWorld && length > 1) {
    const modelMatrix = instances[0].modelMatrix;

    for (i = 1; i < length; ++i) {
      if (!Matrix4.equals(modelMatrix, instances[i].modelMatrix)) {
        toWorld = true;
        break;
      }
    }
  }

  if (toWorld) {
    // The transform applied to the rendered triangles is the product of the
    // instance matrix (baked into the vertices here) and the primitive's model
    // matrix (applied to the draw command afterwards). A product with a
    // negative determinant mirrors the geometry, which flips the front face of
    // every triangle, so the winding order must be reversed to keep back face
    // culling from culling the front faces.
    Matrix4.getMatrix3(primitiveModelMatrix, scratchMatrix3);
    const primitiveDeterminant = Matrix3.determinant(scratchMatrix3);

    const mirrored = new Array(length);
    let mirroredStripOrFan = false;
    for (i = 0; i < length; ++i) {
      const geometry = instances[i].geometry;
      if (!defined(geometry)) {
        mirrored[i] = false;
        continue;
      }
      Matrix4.getMatrix3(instances[i].modelMatrix, scratchMatrix3);
      mirrored[i] =
        primitiveDeterminant * Matrix3.determinant(scratchMatrix3) < 0.0;
      if (
        mirrored[i] &&
        PrimitiveType.isTriangles(geometry.primitiveType) &&
        geometry.primitiveType !== PrimitiveType.TRIANGLES
      ) {
        mirroredStripOrFan = true;
      }
    }

    // Bake the instance matrices into the vertex data. The determinant must be
    // computed beforehand because baking replaces the model matrix with identity.
    for (i = 0; i < length; ++i) {
      const instance = instances[i];
      if (!defined(instance.geometry)) {
        continue;
      }

      GeometryPipeline.transformToWorldCoordinates(instance);

      if (mirrored[i]) {
        if (PrimitiveType.isTriangles(instance.geometry.primitiveType)) {
          reverseTriangleWindingOrder(instance.geometry);
        }
      } else if (
        mirroredStripOrFan &&
        PrimitiveType.isTriangles(instance.geometry.primitiveType) &&
        instance.geometry.primitiveType !== PrimitiveType.TRIANGLES
      ) {
        // A mirrored strip or fan in this batch was expanded to a triangle
        // list; expand the remaining strips and fans too so that all instances
        // keep a consistent representation before they are combined.
        expandStripFanToTriangles(instance.geometry, false);
      }
    }
  } else {
    // Leave the geometry in the local coordinate system and apply the combined
    // model matrix to the draw command instead. A mirrored combined matrix
    // still flips the front faces in that case, which requires mirrored render
    // states rather than a winding order change.
    Matrix4.multiplyTransformation(
      primitiveModelMatrix,
      instances[0].modelMatrix,
      primitiveModelMatrix,
    );
  }
}

function addGeometryBatchId(geometry, batchId) {
  const attributes = geometry.attributes;
  const positionAttr = attributes.position;
  const numberOfComponents =
    positionAttr.values.length / positionAttr.componentsPerAttribute;

  attributes.batchId = new GeometryAttribute({
    componentDatatype: ComponentDatatype.FLOAT,
    componentsPerAttribute: 1,
    values: new Float32Array(numberOfComponents),
  });

  const values = attributes.batchId.values;
  for (let j = 0; j < numberOfComponents; ++j) {
    values[j] = batchId;
  }
}

function addBatchIds(instances) {
  const length = instances.length;

  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    if (defined(instance.geometry)) {
      addGeometryBatchId(instance.geometry, i);
    } else if (
      defined(instance.westHemisphereGeometry) &&
      defined(instance.eastHemisphereGeometry)
    ) {
      addGeometryBatchId(instance.westHemisphereGeometry, i);
      addGeometryBatchId(instance.eastHemisphereGeometry, i);
    }
  }
}

function geometryPipeline(parameters) {
  const instances = parameters.instances;
  const projection = parameters.projection;
  const uintIndexSupport = parameters.elementIndexUintSupported;
  const scene3DOnly = parameters.scene3DOnly;
  const vertexCacheOptimize = parameters.vertexCacheOptimize;
  const compressVertices = parameters.compressVertices;
  const modelMatrix = parameters.modelMatrix;

  let i;
  let geometry;
  let primitiveType;
  let length = instances.length;

  for (i = 0; i < length; ++i) {
    if (defined(instances[i].geometry)) {
      primitiveType = instances[i].geometry.primitiveType;
      break;
    }
  }

  //>>includeStart('debug', pragmas.debug);
  for (i = 1; i < length; ++i) {
    if (
      defined(instances[i].geometry) &&
      instances[i].geometry.primitiveType !== primitiveType
    ) {
      throw new DeveloperError(
        "All instance geometries must have the same primitiveType.",
      );
    }
  }
  //>>includeEnd('debug');

  // Unify to world coordinates before combining.
  transformToWorldCoordinates(instances, modelMatrix, scene3DOnly);

  // Clip to IDL
  if (!scene3DOnly) {
    for (i = 0; i < length; ++i) {
      if (defined(instances[i].geometry)) {
        GeometryPipeline.splitLongitude(instances[i]);
      }
    }
  }

  addBatchIds(instances);

  // Optimize for vertex shader caches
  if (vertexCacheOptimize) {
    for (i = 0; i < length; ++i) {
      const instance = instances[i];
      if (defined(instance.geometry)) {
        GeometryPipeline.reorderForPostVertexCache(instance.geometry);
        GeometryPipeline.reorderForPreVertexCache(instance.geometry);
      } else if (
        defined(instance.westHemisphereGeometry) &&
        defined(instance.eastHemisphereGeometry)
      ) {
        GeometryPipeline.reorderForPostVertexCache(
          instance.westHemisphereGeometry,
        );
        GeometryPipeline.reorderForPreVertexCache(
          instance.westHemisphereGeometry,
        );

        GeometryPipeline.reorderForPostVertexCache(
          instance.eastHemisphereGeometry,
        );
        GeometryPipeline.reorderForPreVertexCache(
          instance.eastHemisphereGeometry,
        );
      }
    }
  }

  // Combine into single geometry for better rendering performance.
  let geometries = GeometryPipeline.combineInstances(instances);

  length = geometries.length;
  for (i = 0; i < length; ++i) {
    geometry = geometries[i];

    // Split positions for GPU RTE
    const attributes = geometry.attributes;
    if (!scene3DOnly) {
      for (const name in attributes) {
        if (
          attributes.hasOwnProperty(name) &&
          attributes[name].componentDatatype === ComponentDatatype.DOUBLE
        ) {
          const name3D = `${name}3D`;
          const name2D = `${name}2D`;

          // Compute 2D positions
          GeometryPipeline.projectTo2D(
            geometry,
            name,
            name3D,
            name2D,
            projection,
          );
          if (defined(geometry.boundingSphere) && name === "position") {
            geometry.boundingSphereCV = BoundingSphere.fromVertices(
              geometry.attributes.position2D.values,
            );
          }

          GeometryPipeline.encodeAttribute(
            geometry,
            name3D,
            `${name3D}High`,
            `${name3D}Low`,
          );
          GeometryPipeline.encodeAttribute(
            geometry,
            name2D,
            `${name2D}High`,
            `${name2D}Low`,
          );
        }
      }
    } else {
      for (const name in attributes) {
        if (
          attributes.hasOwnProperty(name) &&
          attributes[name].componentDatatype === ComponentDatatype.DOUBLE
        ) {
          GeometryPipeline.encodeAttribute(
            geometry,
            name,
            `${name}3DHigh`,
            `${name}3DLow`,
          );
        }
      }
    }

    // oct encode and pack normals, compress texture coordinates
    if (compressVertices) {
      GeometryPipeline.compressVertices(geometry);
    }
  }

  if (!uintIndexSupport) {
    // Break into multiple geometries to fit within unsigned short indices if needed
    let splitGeometries = [];
    length = geometries.length;
    for (i = 0; i < length; ++i) {
      geometry = geometries[i];
      splitGeometries = splitGeometries.concat(
        GeometryPipeline.fitToUnsignedShortIndices(geometry),
      );
    }

    geometries = splitGeometries;
  }

  return geometries;
}

function createPickOffsets(instances, geometryName, geometries, pickOffsets) {
  let offset;
  let indexCount;
  let geometryIndex;

  const offsetIndex = pickOffsets.length - 1;
  if (offsetIndex >= 0) {
    const pickOffset = pickOffsets[offsetIndex];
    offset = pickOffset.offset + pickOffset.count;
    geometryIndex = pickOffset.index;
    indexCount = geometries[geometryIndex].indices.length;
  } else {
    offset = 0;
    geometryIndex = 0;
    indexCount = geometries[geometryIndex].indices.length;
  }

  const length = instances.length;
  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    const geometry = instance[geometryName];
    if (!defined(geometry)) {
      continue;
    }

    const count = geometry.indices.length;

    if (offset + count > indexCount) {
      offset = 0;
      indexCount = geometries[++geometryIndex].indices.length;
    }

    pickOffsets.push({
      index: geometryIndex,
      offset: offset,
      count: count,
    });
    offset += count;
  }
}

function createInstancePickOffsets(instances, geometries) {
  const pickOffsets = [];
  createPickOffsets(instances, "geometry", geometries, pickOffsets);
  createPickOffsets(
    instances,
    "westHemisphereGeometry",
    geometries,
    pickOffsets,
  );
  createPickOffsets(
    instances,
    "eastHemisphereGeometry",
    geometries,
    pickOffsets,
  );
  return pickOffsets;
}

/**
 * @private
 */
const PrimitivePipeline = {};

/**
 * @private
 */
PrimitivePipeline.combineGeometry = function (parameters) {
  let geometries;
  let attributeLocations;
  const instances = parameters.instances;
  const length = instances.length;
  let pickOffsets;

  let offsetInstanceExtend;
  let hasOffset = false;
  if (length > 0) {
    geometries = geometryPipeline(parameters);
    if (geometries.length > 0) {
      attributeLocations = GeometryPipeline.createAttributeLocations(
        geometries[0],
      );
      if (parameters.createPickOffsets) {
        pickOffsets = createInstancePickOffsets(instances, geometries);
      }
    }
    if (
      defined(instances[0].attributes) &&
      defined(instances[0].attributes.offset)
    ) {
      offsetInstanceExtend = new Array(length);
      hasOffset = true;
    }
  }

  const boundingSpheres = new Array(length);
  const boundingSpheresCV = new Array(length);
  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    const geometry = instance.geometry;
    if (defined(geometry)) {
      boundingSpheres[i] = geometry.boundingSphere;
      boundingSpheresCV[i] = geometry.boundingSphereCV;
      if (hasOffset) {
        offsetInstanceExtend[i] = instance.geometry.offsetAttribute;
      }
    }

    const eastHemisphereGeometry = instance.eastHemisphereGeometry;
    const westHemisphereGeometry = instance.westHemisphereGeometry;
    if (defined(eastHemisphereGeometry) && defined(westHemisphereGeometry)) {
      if (
        defined(eastHemisphereGeometry.boundingSphere) &&
        defined(westHemisphereGeometry.boundingSphere)
      ) {
        boundingSpheres[i] = BoundingSphere.union(
          eastHemisphereGeometry.boundingSphere,
          westHemisphereGeometry.boundingSphere,
        );
      }
      if (
        defined(eastHemisphereGeometry.boundingSphereCV) &&
        defined(westHemisphereGeometry.boundingSphereCV)
      ) {
        boundingSpheresCV[i] = BoundingSphere.union(
          eastHemisphereGeometry.boundingSphereCV,
          westHemisphereGeometry.boundingSphereCV,
        );
      }
    }
  }

  return {
    geometries: geometries,
    modelMatrix: parameters.modelMatrix,
    attributeLocations: attributeLocations,
    pickOffsets: pickOffsets,
    offsetInstanceExtend: offsetInstanceExtend,
    boundingSpheres: boundingSpheres,
    boundingSpheresCV: boundingSpheresCV,
  };
};

function transferGeometry(geometry, transferableObjects) {
  const attributes = geometry.attributes;
  for (const name in attributes) {
    if (attributes.hasOwnProperty(name)) {
      const attribute = attributes[name];

      if (defined(attribute) && defined(attribute.values)) {
        transferableObjects.push(attribute.values.buffer);
      }
    }
  }

  if (defined(geometry.indices)) {
    transferableObjects.push(geometry.indices.buffer);
  }
}

function transferGeometries(geometries, transferableObjects) {
  const length = geometries.length;
  for (let i = 0; i < length; ++i) {
    transferGeometry(geometries[i], transferableObjects);
  }
}

// This function was created by simplifying packCreateGeometryResults into a count-only operation.
function countCreateGeometryResults(items) {
  let count = 1;
  const length = items.length;
  for (let i = 0; i < length; i++) {
    const geometry = items[i];
    ++count;

    if (!defined(geometry)) {
      continue;
    }

    const attributes = geometry.attributes;

    count +=
      7 +
      2 * BoundingSphere.packedLength +
      (defined(geometry.indices) ? geometry.indices.length : 0);

    for (const property in attributes) {
      if (
        attributes.hasOwnProperty(property) &&
        defined(attributes[property])
      ) {
        const attribute = attributes[property];
        count += 5 + attribute.values.length;
      }
    }
  }

  return count;
}

/**
 * @private
 */
PrimitivePipeline.packCreateGeometryResults = function (
  items,
  transferableObjects,
) {
  const packedData = new Float64Array(countCreateGeometryResults(items));
  const stringTable = [];
  const stringHash = {};

  const length = items.length;
  let count = 0;
  packedData[count++] = length;
  for (let i = 0; i < length; i++) {
    const geometry = items[i];

    const validGeometry = defined(geometry);
    packedData[count++] = validGeometry ? 1.0 : 0.0;

    if (!validGeometry) {
      continue;
    }

    packedData[count++] = geometry.primitiveType;
    packedData[count++] = geometry.geometryType;
    packedData[count++] = geometry.offsetAttribute ?? -1;

    const validBoundingSphere = defined(geometry.boundingSphere) ? 1.0 : 0.0;
    packedData[count++] = validBoundingSphere;
    if (validBoundingSphere) {
      BoundingSphere.pack(geometry.boundingSphere, packedData, count);
    }

    count += BoundingSphere.packedLength;

    const validBoundingSphereCV = defined(geometry.boundingSphereCV)
      ? 1.0
      : 0.0;
    packedData[count++] = validBoundingSphereCV;
    if (validBoundingSphereCV) {
      BoundingSphere.pack(geometry.boundingSphereCV, packedData, count);
    }

    count += BoundingSphere.packedLength;

    const attributes = geometry.attributes;
    const attributesToWrite = [];
    for (const property in attributes) {
      if (
        attributes.hasOwnProperty(property) &&
        defined(attributes[property])
      ) {
        attributesToWrite.push(property);
        if (!defined(stringHash[property])) {
          stringHash[property] = stringTable.length;
          stringTable.push(property);
        }
      }
    }

    packedData[count++] = attributesToWrite.length;
    for (let q = 0; q < attributesToWrite.length; q++) {
      const name = attributesToWrite[q];
      const attribute = attributes[name];
      packedData[count++] = stringHash[name];
      packedData[count++] = attribute.componentDatatype;
      packedData[count++] = attribute.componentsPerAttribute;
      packedData[count++] = attribute.normalize ? 1 : 0;
      packedData[count++] = attribute.values.length;
      packedData.set(attribute.values, count);
      count += attribute.values.length;
    }

    const indicesLength = defined(geometry.indices)
      ? geometry.indices.length
      : 0;
    packedData[count++] = indicesLength;

    if (indicesLength > 0) {
      packedData.set(geometry.indices, count);
      count += indicesLength;
    }
  }

  transferableObjects.push(packedData.buffer);

  return {
    stringTable: stringTable,
    packedData: packedData,
  };
};

/**
 * @private
 */
PrimitivePipeline.unpackCreateGeometryResults = function (
  createGeometryResult,
) {
  const stringTable = createGeometryResult.stringTable;
  const packedGeometry = createGeometryResult.packedData;

  let i;
  const result = new Array(packedGeometry[0]);
  let resultIndex = 0;

  let packedGeometryIndex = 1;
  while (packedGeometryIndex < packedGeometry.length) {
    const valid = packedGeometry[packedGeometryIndex++] === 1.0;
    if (!valid) {
      result[resultIndex++] = undefined;
      continue;
    }

    const primitiveType = packedGeometry[packedGeometryIndex++];
    const geometryType = packedGeometry[packedGeometryIndex++];
    let offsetAttribute = packedGeometry[packedGeometryIndex++];
    if (offsetAttribute === -1) {
      offsetAttribute = undefined;
    }

    let boundingSphere;
    let boundingSphereCV;

    const validBoundingSphere = packedGeometry[packedGeometryIndex++] === 1.0;
    if (validBoundingSphere) {
      boundingSphere = BoundingSphere.unpack(
        packedGeometry,
        packedGeometryIndex,
      );
    }

    packedGeometryIndex += BoundingSphere.packedLength;

    const validBoundingSphereCV = packedGeometry[packedGeometryIndex++] === 1.0;
    if (validBoundingSphereCV) {
      boundingSphereCV = BoundingSphere.unpack(
        packedGeometry,
        packedGeometryIndex,
      );
    }

    packedGeometryIndex += BoundingSphere.packedLength;

    let length;
    let values;
    let componentsPerAttribute;
    const attributes = new GeometryAttributes();
    const numAttributes = packedGeometry[packedGeometryIndex++];
    for (i = 0; i < numAttributes; i++) {
      const name = stringTable[packedGeometry[packedGeometryIndex++]];
      const componentDatatype = packedGeometry[packedGeometryIndex++];
      componentsPerAttribute = packedGeometry[packedGeometryIndex++];
      const normalize = packedGeometry[packedGeometryIndex++] !== 0;

      length = packedGeometry[packedGeometryIndex++];
      values = ComponentDatatype.createTypedArray(componentDatatype, length);
      for (let valuesIndex = 0; valuesIndex < length; valuesIndex++) {
        values[valuesIndex] = packedGeometry[packedGeometryIndex++];
      }

      attributes[name] = new GeometryAttribute({
        componentDatatype: componentDatatype,
        componentsPerAttribute: componentsPerAttribute,
        normalize: normalize,
        values: values,
      });
    }

    let indices;
    length = packedGeometry[packedGeometryIndex++];

    if (length > 0) {
      const numberOfVertices = values.length / componentsPerAttribute;
      indices = IndexDatatype.createTypedArray(numberOfVertices, length);
      for (i = 0; i < length; i++) {
        indices[i] = packedGeometry[packedGeometryIndex++];
      }
    }

    result[resultIndex++] = new Geometry({
      primitiveType: primitiveType,
      geometryType: geometryType,
      boundingSphere: boundingSphere,
      boundingSphereCV: boundingSphereCV,
      indices: indices,
      attributes: attributes,
      offsetAttribute: offsetAttribute,
    });
  }

  return result;
};

function packInstancesForCombine(instances, transferableObjects) {
  const length = instances.length;
  const packedData = new Float64Array(1 + length * 19);
  let count = 0;
  packedData[count++] = length;
  for (let i = 0; i < length; i++) {
    const instance = instances[i];
    Matrix4.pack(instance.modelMatrix, packedData, count);
    count += Matrix4.packedLength;
    if (defined(instance.attributes) && defined(instance.attributes.offset)) {
      const values = instance.attributes.offset.value;
      packedData[count] = values[0];
      packedData[count + 1] = values[1];
      packedData[count + 2] = values[2];
    }
    count += 3;
  }
  transferableObjects.push(packedData.buffer);

  return packedData;
}

function unpackInstancesForCombine(data) {
  const packedInstances = data;
  const result = new Array(packedInstances[0]);
  let count = 0;

  let i = 1;
  while (i < packedInstances.length) {
    const modelMatrix = Matrix4.unpack(packedInstances, i);
    let attributes;
    i += Matrix4.packedLength;
    if (defined(packedInstances[i])) {
      attributes = {
        offset: new OffsetGeometryInstanceAttribute(
          packedInstances[i],
          packedInstances[i + 1],
          packedInstances[i + 2],
        ),
      };
    }
    i += 3;

    result[count++] = {
      modelMatrix: modelMatrix,
      attributes: attributes,
    };
  }

  return result;
}

/**
 * @private
 */
PrimitivePipeline.packCombineGeometryParameters = function (
  parameters,
  transferableObjects,
) {
  const createGeometryResults = parameters.createGeometryResults;
  const length = createGeometryResults.length;

  for (let i = 0; i < length; i++) {
    transferableObjects.push(createGeometryResults[i].packedData.buffer);
  }

  return {
    createGeometryResults: parameters.createGeometryResults,
    packedInstances: packInstancesForCombine(
      parameters.instances,
      transferableObjects,
    ),
    ellipsoid: parameters.ellipsoid,
    isGeographic: parameters.projection instanceof GeographicProjection,
    elementIndexUintSupported: parameters.elementIndexUintSupported,
    scene3DOnly: parameters.scene3DOnly,
    vertexCacheOptimize: parameters.vertexCacheOptimize,
    compressVertices: parameters.compressVertices,
    modelMatrix: parameters.modelMatrix,
    createPickOffsets: parameters.createPickOffsets,
  };
};

/**
 * @private
 */
PrimitivePipeline.unpackCombineGeometryParameters = function (
  packedParameters,
) {
  const instances = unpackInstancesForCombine(packedParameters.packedInstances);
  const createGeometryResults = packedParameters.createGeometryResults;
  const length = createGeometryResults.length;
  let instanceIndex = 0;

  for (let resultIndex = 0; resultIndex < length; resultIndex++) {
    const geometries = PrimitivePipeline.unpackCreateGeometryResults(
      createGeometryResults[resultIndex],
    );
    const geometriesLength = geometries.length;
    for (
      let geometryIndex = 0;
      geometryIndex < geometriesLength;
      geometryIndex++
    ) {
      const geometry = geometries[geometryIndex];
      const instance = instances[instanceIndex];
      instance.geometry = geometry;
      ++instanceIndex;
    }
  }

  const ellipsoid = Ellipsoid.clone(packedParameters.ellipsoid);
  const projection = packedParameters.isGeographic
    ? new GeographicProjection(ellipsoid)
    : new WebMercatorProjection(ellipsoid);

  return {
    instances: instances,
    ellipsoid: ellipsoid,
    projection: projection,
    elementIndexUintSupported: packedParameters.elementIndexUintSupported,
    scene3DOnly: packedParameters.scene3DOnly,
    vertexCacheOptimize: packedParameters.vertexCacheOptimize,
    compressVertices: packedParameters.compressVertices,
    modelMatrix: Matrix4.clone(packedParameters.modelMatrix),
    createPickOffsets: packedParameters.createPickOffsets,
  };
};

function packBoundingSpheres(boundingSpheres) {
  const length = boundingSpheres.length;
  const bufferLength = 1 + (BoundingSphere.packedLength + 1) * length;
  const buffer = new Float32Array(bufferLength);

  let bufferIndex = 0;
  buffer[bufferIndex++] = length;

  for (let i = 0; i < length; ++i) {
    const bs = boundingSpheres[i];
    if (!defined(bs)) {
      buffer[bufferIndex++] = 0.0;
    } else {
      buffer[bufferIndex++] = 1.0;
      BoundingSphere.pack(boundingSpheres[i], buffer, bufferIndex);
    }
    bufferIndex += BoundingSphere.packedLength;
  }

  return buffer;
}

function unpackBoundingSpheres(buffer) {
  const result = new Array(buffer[0]);
  let count = 0;

  let i = 1;
  while (i < buffer.length) {
    if (buffer[i++] === 1.0) {
      result[count] = BoundingSphere.unpack(buffer, i);
    }
    ++count;
    i += BoundingSphere.packedLength;
  }

  return result;
}

/**
 * @private
 */
PrimitivePipeline.packCombineGeometryResults = function (
  results,
  transferableObjects,
) {
  if (defined(results.geometries)) {
    transferGeometries(results.geometries, transferableObjects);
  }

  const packedBoundingSpheres = packBoundingSpheres(results.boundingSpheres);
  const packedBoundingSpheresCV = packBoundingSpheres(
    results.boundingSpheresCV,
  );
  transferableObjects.push(
    packedBoundingSpheres.buffer,
    packedBoundingSpheresCV.buffer,
  );

  return {
    geometries: results.geometries,
    attributeLocations: results.attributeLocations,
    modelMatrix: results.modelMatrix,
    pickOffsets: results.pickOffsets,
    offsetInstanceExtend: results.offsetInstanceExtend,
    boundingSpheres: packedBoundingSpheres,
    boundingSpheresCV: packedBoundingSpheresCV,
  };
};

/**
 * @private
 */
PrimitivePipeline.unpackCombineGeometryResults = function (packedResult) {
  return {
    geometries: packedResult.geometries,
    attributeLocations: packedResult.attributeLocations,
    modelMatrix: packedResult.modelMatrix,
    pickOffsets: packedResult.pickOffsets,
    offsetInstanceExtend: packedResult.offsetInstanceExtend,
    boundingSpheres: unpackBoundingSpheres(packedResult.boundingSpheres),
    boundingSpheresCV: unpackBoundingSpheres(packedResult.boundingSpheresCV),
  };
};
export default PrimitivePipeline;
