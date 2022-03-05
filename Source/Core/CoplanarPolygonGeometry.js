import arrayRemoveDuplicates from "./arrayRemoveDuplicates.js";
import BoundingRectangle from "./BoundingRectangle.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import CoplanarPolygonGeometryLibrary from "./CoplanarPolygonGeometryLibrary.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import GeometryAttributes from "./GeometryAttributes.js";
import GeometryInstance from "./GeometryInstance.js";
import GeometryPipeline from "./GeometryPipeline.js";
import IndexDatatype from "./IndexDatatype.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import PolygonGeometryLibrary from "./PolygonGeometryLibrary.js";
import PolygonPipeline from "./PolygonPipeline.js";
import PrimitiveType from "./PrimitiveType.js";
import Quaternion from "./Quaternion.js";
import VertexFormat from "./VertexFormat.js";

const scratchPosition = new Cartesian3();
const scratchBR = new BoundingRectangle();
const stScratch = new Cartesian2();
const textureCoordinatesOrigin = new Cartesian2();
const scratchNormal = new Cartesian3();
const scratchTangent = new Cartesian3();
const scratchBitangent = new Cartesian3();
const centerScratch = new Cartesian3();
const axis1Scratch = new Cartesian3();
const axis2Scratch = new Cartesian3();
const quaternionScratch = new Quaternion();
const textureMatrixScratch = new Matrix3();
const tangentRotationScratch = new Matrix3();
const surfaceNormalScratch = new Cartesian3();

function createGeometryFromPolygon(
  polygon,
  vertexFormat,
  boundingRectangle,
  stRotation,
  hardcodedTextureCoordinates,
  projectPointTo2D,
  normal,
  tangent,
  bitangent
) {
  const positions = polygon.positions;
  let indices = PolygonPipeline.triangulate(polygon.positions2D, polygon.holes);

  /* If polygon is completely unrenderable, just use the first three vertices */
  if (indices.length < 3) {
    indices = [0, 1, 2];
  }

  const newIndices = IndexDatatype.createTypedArray(
    positions.length,
    indices.length
  );
  newIndices.set(indices);

  let textureMatrix = textureMatrixScratch;
  if (stRotation !== 0.0) {
    let rotation = Quaternion.fromAxisAngle(
      normal,
      stRotation,
      quaternionScratch
    );
    textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrix);

    if (vertexFormat.tangent || vertexFormat.bitangent) {
      rotation = Quaternion.fromAxisAngle(
        normal,
        -stRotation,
        quaternionScratch
      );
      const tangentRotation = Matrix3.fromQuaternion(
        rotation,
        tangentRotationScratch
      );

      tangent = Cartesian3.normalize(
        Matrix3.multiplyByVector(tangentRotation, tangent, tangent),
        tangent
      );
      if (vertexFormat.bitangent) {
        bitangent = Cartesian3.normalize(
          Cartesian3.cross(normal, tangent, bitangent),
          bitangent
        );
      }
    }
  } else {
    textureMatrix = Matrix3.clone(Matrix3.IDENTITY, textureMatrix);
  }

  const stOrigin = textureCoordinatesOrigin;
  if (vertexFormat.st) {
    stOrigin.x = boundingRectangle.x;
    stOrigin.y = boundingRectangle.y;
  }

  const length = positions.length;
  const size = length * 3;
  const flatPositions = new Float64Array(size);
  const normals = vertexFormat.normal ? new Float32Array(size) : undefined;
  const tangents = vertexFormat.tangent ? new Float32Array(size) : undefined;
  const bitangents = vertexFormat.bitangent
    ? new Float32Array(size)
    : undefined;
  const textureCoordinates = vertexFormat.st
    ? new Float32Array(length * 2)
    : undefined;

  let positionIndex = 0;
  let normalIndex = 0;
  let bitangentIndex = 0;
  let tangentIndex = 0;
  let stIndex = 0;

  for (let i = 0; i < length; i++) {
    const position = positions[i];
    flatPositions[positionIndex++] = position.x;
    flatPositions[positionIndex++] = position.y;
    flatPositions[positionIndex++] = position.z;

    if (hardcodedTextureCoordinates) {
      textureCoordinates[i * 2] = hardcodedTextureCoordinates.positions[i].x;
      textureCoordinates[i * 2 + 1] =
        hardcodedTextureCoordinates.positions[i].y;
    } else if (vertexFormat.st) {
      const p = Matrix3.multiplyByVector(
        textureMatrix,
        position,
        scratchPosition
      );
      const st = projectPointTo2D(p, stScratch);
      Cartesian2.subtract(st, stOrigin, st);

      const stx = CesiumMath.clamp(st.x / boundingRectangle.width, 0, 1);
      const sty = CesiumMath.clamp(st.y / boundingRectangle.height, 0, 1);
      textureCoordinates[stIndex++] = stx;
      textureCoordinates[stIndex++] = sty;
    }

    if (vertexFormat.normal) {
      normals[normalIndex++] = normal.x;
      normals[normalIndex++] = normal.y;
      normals[normalIndex++] = normal.z;
    }

    if (vertexFormat.tangent) {
      tangents[tangentIndex++] = tangent.x;
      tangents[tangentIndex++] = tangent.y;
      tangents[tangentIndex++] = tangent.z;
    }

    if (vertexFormat.bitangent) {
      bitangents[bitangentIndex++] = bitangent.x;
      bitangents[bitangentIndex++] = bitangent.y;
      bitangents[bitangentIndex++] = bitangent.z;
    }
  }

  const attributes = new GeometryAttributes();

  if (vertexFormat.position) {
    attributes.position = new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: flatPositions,
    });
  }

  if (vertexFormat.normal) {
    attributes.normal = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: normals,
    });
  }

  if (vertexFormat.tangent) {
    attributes.tangent = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: tangents,
    });
  }

  if (vertexFormat.bitangent) {
    attributes.bitangent = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: bitangents,
    });
  }

  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 2,
      values: textureCoordinates,
    });
  }

  return new Geometry({
    attributes: attributes,
    indices: newIndices,
    primitiveType: PrimitiveType.TRIANGLES,
  });
}

/**
 * A description of a polygon composed of arbitrary coplanar positions.
 *
 * @alias CoplanarPolygonGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
 * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
 *
 * @example
 * const polygonGeometry = new Cesium.CoplanarPolygonGeometry({
 *  polygonHierarchy: new Cesium.PolygonHierarchy(
 *     Cesium.Cartesian3.fromDegreesArrayHeights([
 *      -90.0, 30.0, 0.0,
 *      -90.0, 30.0, 300000.0,
 *      -80.0, 30.0, 300000.0,
 *      -80.0, 30.0, 0.0
 *   ]))
 * });
 *
 */
function CoplanarPolygonGeometry(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const polygonHierarchy = options.polygonHierarchy;
  const textureCoordinates = options.textureCoordinates;
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.polygonHierarchy", polygonHierarchy);
  //>>includeEnd('debug');

  const vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
  this._vertexFormat = VertexFormat.clone(vertexFormat);
  this._polygonHierarchy = polygonHierarchy;
  this._stRotation = defaultValue(options.stRotation, 0.0);
  this._ellipsoid = Ellipsoid.clone(
    defaultValue(options.ellipsoid, Ellipsoid.WGS84)
  );
  this._workerName = "createCoplanarPolygonGeometry";
  this._textureCoordinates = textureCoordinates;

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  this.packedLength =
    PolygonGeometryLibrary.computeHierarchyPackedLength(
      polygonHierarchy,
      Cartesian3
    ) +
    VertexFormat.packedLength +
    Ellipsoid.packedLength +
    (textureCoordinates
      ? PolygonGeometryLibrary.computeHierarchyPackedLength(
          textureCoordinates,
          Cartesian2
        )
      : 1) +
    2;
}

/**
 * A description of a coplanar polygon from an array of positions.
 *
 * @param {Object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
 * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
 * @returns {CoplanarPolygonGeometry}
 *
 * @example
 * // create a polygon from points
 * const polygon = Cesium.CoplanarPolygonGeometry.fromPositions({
 *   positions : Cesium.Cartesian3.fromDegreesArray([
 *     -72.0, 40.0,
 *     -70.0, 35.0,
 *     -75.0, 30.0,
 *     -70.0, 30.0,
 *     -68.0, 40.0
 *   ])
 * });
 * const geometry = Cesium.PolygonGeometry.createGeometry(polygon);
 *
 * @see PolygonGeometry#createGeometry
 */
CoplanarPolygonGeometry.fromPositions = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.positions", options.positions);
  //>>includeEnd('debug');

  const newOptions = {
    polygonHierarchy: {
      positions: options.positions,
    },
    vertexFormat: options.vertexFormat,
    stRotation: options.stRotation,
    ellipsoid: options.ellipsoid,
    textureCoordinates: options.textureCoordinates,
  };
  return new CoplanarPolygonGeometry(newOptions);
};

/**
 * Stores the provided instance into the provided array.
 *
 * @param {CoplanarPolygonGeometry} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
CoplanarPolygonGeometry.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(
    value._polygonHierarchy,
    array,
    startingIndex,
    Cartesian3
  );

  Ellipsoid.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid.packedLength;

  VertexFormat.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat.packedLength;

  array[startingIndex++] = value._stRotation;
  if (value._textureCoordinates) {
    startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(
      value._textureCoordinates,
      array,
      startingIndex,
      Cartesian2
    );
  } else {
    array[startingIndex++] = -1.0;
  }
  array[startingIndex++] = value.packedLength;

  return array;
};

const scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
const scratchVertexFormat = new VertexFormat();
const scratchOptions = {
  polygonHierarchy: {},
};
/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {CoplanarPolygonGeometry} [result] The object into which to store the result.
 * @returns {CoplanarPolygonGeometry} The modified result parameter or a new CoplanarPolygonGeometry instance if one was not provided.
 */
CoplanarPolygonGeometry.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  const polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(
    array,
    startingIndex,
    Cartesian3
  );
  startingIndex = polygonHierarchy.startingIndex;
  delete polygonHierarchy.startingIndex;

  const ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid.packedLength;

  const vertexFormat = VertexFormat.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat.packedLength;

  const stRotation = array[startingIndex++];
  const textureCoordinates =
    array[startingIndex] === -1.0
      ? undefined
      : PolygonGeometryLibrary.unpackPolygonHierarchy(
          array,
          startingIndex,
          Cartesian2
        );
  if (textureCoordinates) {
    startingIndex = textureCoordinates.startingIndex;
    delete textureCoordinates.startingIndex;
  } else {
    startingIndex++;
  }
  const packedLength = array[startingIndex++];

  if (!defined(result)) {
    result = new CoplanarPolygonGeometry(scratchOptions);
  }

  result._polygonHierarchy = polygonHierarchy;
  result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
  result._stRotation = stRotation;
  result._textureCoordinates = textureCoordinates;
  result.packedLength = packedLength;

  return result;
};

/**
 * Computes the geometric representation of an arbitrary coplanar polygon, including its vertices, indices, and a bounding sphere.
 *
 * @param {CoplanarPolygonGeometry} polygonGeometry A description of the polygon.
 * @returns {Geometry|undefined} The computed vertices and indices.
 */
CoplanarPolygonGeometry.createGeometry = function (polygonGeometry) {
  const vertexFormat = polygonGeometry._vertexFormat;
  const polygonHierarchy = polygonGeometry._polygonHierarchy;
  const stRotation = polygonGeometry._stRotation;
  const textureCoordinates = polygonGeometry._textureCoordinates;

  let outerPositions = polygonHierarchy.positions;
  outerPositions = arrayRemoveDuplicates(
    outerPositions,
    Cartesian3.equalsEpsilon,
    true
  );
  if (outerPositions.length < 3) {
    return;
  }

  let normal = scratchNormal;
  let tangent = scratchTangent;
  let bitangent = scratchBitangent;
  let axis1 = axis1Scratch;
  const axis2 = axis2Scratch;

  const validGeometry = CoplanarPolygonGeometryLibrary.computeProjectTo2DArguments(
    outerPositions,
    centerScratch,
    axis1,
    axis2
  );
  if (!validGeometry) {
    return undefined;
  }

  normal = Cartesian3.cross(axis1, axis2, normal);
  normal = Cartesian3.normalize(normal, normal);

  if (
    !Cartesian3.equalsEpsilon(
      centerScratch,
      Cartesian3.ZERO,
      CesiumMath.EPSILON6
    )
  ) {
    const surfaceNormal = polygonGeometry._ellipsoid.geodeticSurfaceNormal(
      centerScratch,
      surfaceNormalScratch
    );
    if (Cartesian3.dot(normal, surfaceNormal) < 0) {
      normal = Cartesian3.negate(normal, normal);
      axis1 = Cartesian3.negate(axis1, axis1);
    }
  }

  const projectPoints = CoplanarPolygonGeometryLibrary.createProjectPointsTo2DFunction(
    centerScratch,
    axis1,
    axis2
  );
  const projectPoint = CoplanarPolygonGeometryLibrary.createProjectPointTo2DFunction(
    centerScratch,
    axis1,
    axis2
  );

  if (vertexFormat.tangent) {
    tangent = Cartesian3.clone(axis1, tangent);
  }
  if (vertexFormat.bitangent) {
    bitangent = Cartesian3.clone(axis2, bitangent);
  }

  const results = PolygonGeometryLibrary.polygonsFromHierarchy(
    polygonHierarchy,
    projectPoints,
    false
  );
  const hierarchy = results.hierarchy;
  const polygons = results.polygons;

  const textureCoordinatePolygons = textureCoordinates
    ? PolygonGeometryLibrary.polygonsFromHierarchy(
        textureCoordinates,
        function (identity) {
          return identity;
        },
        false
      ).polygons
    : undefined;

  if (hierarchy.length === 0) {
    return;
  }
  outerPositions = hierarchy[0].outerRing;

  const boundingSphere = BoundingSphere.fromPoints(outerPositions);
  const boundingRectangle = PolygonGeometryLibrary.computeBoundingRectangle(
    normal,
    projectPoint,
    outerPositions,
    stRotation,
    scratchBR
  );

  const geometries = [];
  for (let i = 0; i < polygons.length; i++) {
    const geometryInstance = new GeometryInstance({
      geometry: createGeometryFromPolygon(
        polygons[i],
        vertexFormat,
        boundingRectangle,
        stRotation,
        textureCoordinates ? textureCoordinatePolygons[i] : undefined,
        projectPoint,
        normal,
        tangent,
        bitangent
      ),
    });

    geometries.push(geometryInstance);
  }

  const geometry = GeometryPipeline.combineInstances(geometries)[0];
  geometry.attributes.position.values = new Float64Array(
    geometry.attributes.position.values
  );
  geometry.indices = IndexDatatype.createTypedArray(
    geometry.attributes.position.values.length / 3,
    geometry.indices
  );

  const attributes = geometry.attributes;
  if (!vertexFormat.position) {
    delete attributes.position;
  }
  return new Geometry({
    attributes: attributes,
    indices: geometry.indices,
    primitiveType: geometry.primitiveType,
    boundingSphere: boundingSphere,
  });
};
export default CoplanarPolygonGeometry;
