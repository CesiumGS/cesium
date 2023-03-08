define(['./defaultValue-0a909f67', './Matrix3-315394f6', './ArcType-ce2e50ab', './Transforms-26539bce', './Check-666ab1a0', './ComponentDatatype-f7b11d02', './EllipsoidTangentPlane-cfb50678', './GeometryAttribute-0bfd05e8', './GeometryAttributes-f06a2792', './GeometryInstance-451dc1cd', './GeometryOffsetAttribute-04332ce7', './GeometryPipeline-0166905d', './IndexDatatype-a55ceaa1', './Math-2dbd6b93', './PolygonGeometryLibrary-f918ac26', './PolygonPipeline-f59a8f0a', './Matrix2-13178034', './RuntimeError-06c93819', './combine-ca22a614', './WebGLConstants-a8cc3e8c', './AxisAlignedBoundingBox-a4321399', './IntersectionTests-a93d3de9', './Plane-900aa728', './AttributeCompression-b646d393', './EncodedCartesian3-81f70735', './arrayRemoveDuplicates-c2038105', './EllipsoidRhumbLine-19756602'], (function (defaultValue, Matrix3, ArcType, Transforms, Check, ComponentDatatype, EllipsoidTangentPlane, GeometryAttribute, GeometryAttributes, GeometryInstance, GeometryOffsetAttribute, GeometryPipeline, IndexDatatype, Math$1, PolygonGeometryLibrary, PolygonPipeline, Matrix2, RuntimeError, combine, WebGLConstants, AxisAlignedBoundingBox, IntersectionTests, Plane, AttributeCompression, EncodedCartesian3, arrayRemoveDuplicates, EllipsoidRhumbLine) { 'use strict';

  const createGeometryFromPositionsPositions = [];
  const createGeometryFromPositionsSubdivided = [];

  function createGeometryFromPositions(
    ellipsoid,
    positions,
    minDistance,
    perPositionHeight,
    arcType
  ) {
    const tangentPlane = EllipsoidTangentPlane.EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
    const positions2D = tangentPlane.projectPointsOntoPlane(
      positions,
      createGeometryFromPositionsPositions
    );

    const originalWindingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(
      positions2D
    );
    if (originalWindingOrder === PolygonPipeline.WindingOrder.CLOCKWISE) {
      positions2D.reverse();
      positions = positions.slice().reverse();
    }

    let subdividedPositions;
    let i;

    let length = positions.length;
    let index = 0;

    if (!perPositionHeight) {
      let numVertices = 0;
      if (arcType === ArcType.ArcType.GEODESIC) {
        for (i = 0; i < length; i++) {
          numVertices += PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideLineCount(
            positions[i],
            positions[(i + 1) % length],
            minDistance
          );
        }
      } else if (arcType === ArcType.ArcType.RHUMB) {
        for (i = 0; i < length; i++) {
          numVertices += PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideRhumbLineCount(
            ellipsoid,
            positions[i],
            positions[(i + 1) % length],
            minDistance
          );
        }
      }
      subdividedPositions = new Float64Array(numVertices * 3);
      for (i = 0; i < length; i++) {
        let tempPositions;
        if (arcType === ArcType.ArcType.GEODESIC) {
          tempPositions = PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideLine(
            positions[i],
            positions[(i + 1) % length],
            minDistance,
            createGeometryFromPositionsSubdivided
          );
        } else if (arcType === ArcType.ArcType.RHUMB) {
          tempPositions = PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideRhumbLine(
            ellipsoid,
            positions[i],
            positions[(i + 1) % length],
            minDistance,
            createGeometryFromPositionsSubdivided
          );
        }
        const tempPositionsLength = tempPositions.length;
        for (let j = 0; j < tempPositionsLength; ++j) {
          subdividedPositions[index++] = tempPositions[j];
        }
      }
    } else {
      subdividedPositions = new Float64Array(length * 2 * 3);
      for (i = 0; i < length; i++) {
        const p0 = positions[i];
        const p1 = positions[(i + 1) % length];
        subdividedPositions[index++] = p0.x;
        subdividedPositions[index++] = p0.y;
        subdividedPositions[index++] = p0.z;
        subdividedPositions[index++] = p1.x;
        subdividedPositions[index++] = p1.y;
        subdividedPositions[index++] = p1.z;
      }
    }

    length = subdividedPositions.length / 3;
    const indicesSize = length * 2;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(length, indicesSize);
    index = 0;
    for (i = 0; i < length - 1; i++) {
      indices[index++] = i;
      indices[index++] = i + 1;
    }
    indices[index++] = length - 1;
    indices[index++] = 0;

    return new GeometryInstance.GeometryInstance({
      geometry: new GeometryAttribute.Geometry({
        attributes: new GeometryAttributes.GeometryAttributes({
          position: new GeometryAttribute.GeometryAttribute({
            componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: subdividedPositions,
          }),
        }),
        indices: indices,
        primitiveType: GeometryAttribute.PrimitiveType.LINES,
      }),
    });
  }

  function createGeometryFromPositionsExtruded(
    ellipsoid,
    positions,
    minDistance,
    perPositionHeight,
    arcType
  ) {
    const tangentPlane = EllipsoidTangentPlane.EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
    const positions2D = tangentPlane.projectPointsOntoPlane(
      positions,
      createGeometryFromPositionsPositions
    );

    const originalWindingOrder = PolygonPipeline.PolygonPipeline.computeWindingOrder2D(
      positions2D
    );
    if (originalWindingOrder === PolygonPipeline.WindingOrder.CLOCKWISE) {
      positions2D.reverse();
      positions = positions.slice().reverse();
    }

    let subdividedPositions;
    let i;

    let length = positions.length;
    const corners = new Array(length);
    let index = 0;

    if (!perPositionHeight) {
      let numVertices = 0;
      if (arcType === ArcType.ArcType.GEODESIC) {
        for (i = 0; i < length; i++) {
          numVertices += PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideLineCount(
            positions[i],
            positions[(i + 1) % length],
            minDistance
          );
        }
      } else if (arcType === ArcType.ArcType.RHUMB) {
        for (i = 0; i < length; i++) {
          numVertices += PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideRhumbLineCount(
            ellipsoid,
            positions[i],
            positions[(i + 1) % length],
            minDistance
          );
        }
      }

      subdividedPositions = new Float64Array(numVertices * 3 * 2);
      for (i = 0; i < length; ++i) {
        corners[i] = index / 3;
        let tempPositions;
        if (arcType === ArcType.ArcType.GEODESIC) {
          tempPositions = PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideLine(
            positions[i],
            positions[(i + 1) % length],
            minDistance,
            createGeometryFromPositionsSubdivided
          );
        } else if (arcType === ArcType.ArcType.RHUMB) {
          tempPositions = PolygonGeometryLibrary.PolygonGeometryLibrary.subdivideRhumbLine(
            ellipsoid,
            positions[i],
            positions[(i + 1) % length],
            minDistance,
            createGeometryFromPositionsSubdivided
          );
        }
        const tempPositionsLength = tempPositions.length;
        for (let j = 0; j < tempPositionsLength; ++j) {
          subdividedPositions[index++] = tempPositions[j];
        }
      }
    } else {
      subdividedPositions = new Float64Array(length * 2 * 3 * 2);
      for (i = 0; i < length; ++i) {
        corners[i] = index / 3;
        const p0 = positions[i];
        const p1 = positions[(i + 1) % length];

        subdividedPositions[index++] = p0.x;
        subdividedPositions[index++] = p0.y;
        subdividedPositions[index++] = p0.z;
        subdividedPositions[index++] = p1.x;
        subdividedPositions[index++] = p1.y;
        subdividedPositions[index++] = p1.z;
      }
    }

    length = subdividedPositions.length / (3 * 2);
    const cornersLength = corners.length;

    const indicesSize = (length * 2 + cornersLength) * 2;
    const indices = IndexDatatype.IndexDatatype.createTypedArray(
      length + cornersLength,
      indicesSize
    );

    index = 0;
    for (i = 0; i < length; ++i) {
      indices[index++] = i;
      indices[index++] = (i + 1) % length;
      indices[index++] = i + length;
      indices[index++] = ((i + 1) % length) + length;
    }

    for (i = 0; i < cornersLength; i++) {
      const corner = corners[i];
      indices[index++] = corner;
      indices[index++] = corner + length;
    }

    return new GeometryInstance.GeometryInstance({
      geometry: new GeometryAttribute.Geometry({
        attributes: new GeometryAttributes.GeometryAttributes({
          position: new GeometryAttribute.GeometryAttribute({
            componentDatatype: ComponentDatatype.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: subdividedPositions,
          }),
        }),
        indices: indices,
        primitiveType: GeometryAttribute.PrimitiveType.LINES,
      }),
    });
  }

  /**
   * A description of the outline of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy.
   *
   * @alias PolygonOutlineGeometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
   * @param {Number} [options.height=0.0] The distance in meters between the polygon and the ellipsoid surface.
   * @param {Number} [options.extrudedHeight] The distance in meters between the polygon's extruded face and the ellipsoid surface.
   * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of path the outline must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
   *
   * @see PolygonOutlineGeometry#createGeometry
   * @see PolygonOutlineGeometry#fromPositions
   *
   * @example
   * // 1. create a polygon outline from points
   * const polygon = new Cesium.PolygonOutlineGeometry({
   *   polygonHierarchy : new Cesium.PolygonHierarchy(
   *     Cesium.Cartesian3.fromDegreesArray([
   *       -72.0, 40.0,
   *       -70.0, 35.0,
   *       -75.0, 30.0,
   *       -70.0, 30.0,
   *       -68.0, 40.0
   *     ])
   *   )
   * });
   * const geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygon);
   *
   * // 2. create a nested polygon with holes outline
   * const polygonWithHole = new Cesium.PolygonOutlineGeometry({
   *   polygonHierarchy : new Cesium.PolygonHierarchy(
   *     Cesium.Cartesian3.fromDegreesArray([
   *       -109.0, 30.0,
   *       -95.0, 30.0,
   *       -95.0, 40.0,
   *       -109.0, 40.0
   *     ]),
   *     [new Cesium.PolygonHierarchy(
   *       Cesium.Cartesian3.fromDegreesArray([
   *         -107.0, 31.0,
   *         -107.0, 39.0,
   *         -97.0, 39.0,
   *         -97.0, 31.0
   *       ]),
   *       [new Cesium.PolygonHierarchy(
   *         Cesium.Cartesian3.fromDegreesArray([
   *           -105.0, 33.0,
   *           -99.0, 33.0,
   *           -99.0, 37.0,
   *           -105.0, 37.0
   *         ]),
   *         [new Cesium.PolygonHierarchy(
   *           Cesium.Cartesian3.fromDegreesArray([
   *             -103.0, 34.0,
   *             -101.0, 34.0,
   *             -101.0, 36.0,
   *             -103.0, 36.0
   *           ])
   *         )]
   *       )]
   *     )]
   *   )
   * });
   * const geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygonWithHole);
   *
   * // 3. create extruded polygon outline
   * const extrudedPolygon = new Cesium.PolygonOutlineGeometry({
   *   polygonHierarchy : new Cesium.PolygonHierarchy(
   *     Cesium.Cartesian3.fromDegreesArray([
   *       -72.0, 40.0,
   *       -70.0, 35.0,
   *       -75.0, 30.0,
   *       -70.0, 30.0,
   *       -68.0, 40.0
   *     ])
   *   ),
   *   extrudedHeight: 300000
   * });
   * const geometry = Cesium.PolygonOutlineGeometry.createGeometry(extrudedPolygon);
   */
  function PolygonOutlineGeometry(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("options", options);
    Check.Check.typeOf.object("options.polygonHierarchy", options.polygonHierarchy);

    if (options.perPositionHeight && defaultValue.defined(options.height)) {
      throw new Check.DeveloperError(
        "Cannot use both options.perPositionHeight and options.height"
      );
    }
    if (
      defaultValue.defined(options.arcType) &&
      options.arcType !== ArcType.ArcType.GEODESIC &&
      options.arcType !== ArcType.ArcType.RHUMB
    ) {
      throw new Check.DeveloperError(
        "Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB."
      );
    }
    //>>includeEnd('debug');

    const polygonHierarchy = options.polygonHierarchy;
    const ellipsoid = defaultValue.defaultValue(options.ellipsoid, Matrix3.Ellipsoid.WGS84);
    const granularity = defaultValue.defaultValue(
      options.granularity,
      Math$1.CesiumMath.RADIANS_PER_DEGREE
    );
    const perPositionHeight = defaultValue.defaultValue(options.perPositionHeight, false);
    const perPositionHeightExtrude =
      perPositionHeight && defaultValue.defined(options.extrudedHeight);
    const arcType = defaultValue.defaultValue(options.arcType, ArcType.ArcType.GEODESIC);

    let height = defaultValue.defaultValue(options.height, 0.0);
    let extrudedHeight = defaultValue.defaultValue(options.extrudedHeight, height);

    if (!perPositionHeightExtrude) {
      const h = Math.max(height, extrudedHeight);
      extrudedHeight = Math.min(height, extrudedHeight);
      height = h;
    }

    this._ellipsoid = Matrix3.Ellipsoid.clone(ellipsoid);
    this._granularity = granularity;
    this._height = height;
    this._extrudedHeight = extrudedHeight;
    this._arcType = arcType;
    this._polygonHierarchy = polygonHierarchy;
    this._perPositionHeight = perPositionHeight;
    this._perPositionHeightExtrude = perPositionHeightExtrude;
    this._offsetAttribute = options.offsetAttribute;
    this._workerName = "createPolygonOutlineGeometry";

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    this.packedLength =
      PolygonGeometryLibrary.PolygonGeometryLibrary.computeHierarchyPackedLength(
        polygonHierarchy,
        Matrix3.Cartesian3
      ) +
      Matrix3.Ellipsoid.packedLength +
      8;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {PolygonOutlineGeometry} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  PolygonOutlineGeometry.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    startingIndex = PolygonGeometryLibrary.PolygonGeometryLibrary.packPolygonHierarchy(
      value._polygonHierarchy,
      array,
      startingIndex,
      Matrix3.Cartesian3
    );

    Matrix3.Ellipsoid.pack(value._ellipsoid, array, startingIndex);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    array[startingIndex++] = value._height;
    array[startingIndex++] = value._extrudedHeight;
    array[startingIndex++] = value._granularity;
    array[startingIndex++] = value._perPositionHeightExtrude ? 1.0 : 0.0;
    array[startingIndex++] = value._perPositionHeight ? 1.0 : 0.0;
    array[startingIndex++] = value._arcType;
    array[startingIndex++] = defaultValue.defaultValue(value._offsetAttribute, -1);
    array[startingIndex] = value.packedLength;

    return array;
  };

  const scratchEllipsoid = Matrix3.Ellipsoid.clone(Matrix3.Ellipsoid.UNIT_SPHERE);
  const dummyOptions = {
    polygonHierarchy: {},
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {PolygonOutlineGeometry} [result] The object into which to store the result.
   * @returns {PolygonOutlineGeometry} The modified result parameter or a new PolygonOutlineGeometry instance if one was not provided.
   */
  PolygonOutlineGeometry.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const polygonHierarchy = PolygonGeometryLibrary.PolygonGeometryLibrary.unpackPolygonHierarchy(
      array,
      startingIndex,
      Matrix3.Cartesian3
    );
    startingIndex = polygonHierarchy.startingIndex;
    delete polygonHierarchy.startingIndex;

    const ellipsoid = Matrix3.Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
    startingIndex += Matrix3.Ellipsoid.packedLength;

    const height = array[startingIndex++];
    const extrudedHeight = array[startingIndex++];
    const granularity = array[startingIndex++];
    const perPositionHeightExtrude = array[startingIndex++] === 1.0;
    const perPositionHeight = array[startingIndex++] === 1.0;
    const arcType = array[startingIndex++];
    const offsetAttribute = array[startingIndex++];
    const packedLength = array[startingIndex];

    if (!defaultValue.defined(result)) {
      result = new PolygonOutlineGeometry(dummyOptions);
    }

    result._polygonHierarchy = polygonHierarchy;
    result._ellipsoid = Matrix3.Ellipsoid.clone(ellipsoid, result._ellipsoid);
    result._height = height;
    result._extrudedHeight = extrudedHeight;
    result._granularity = granularity;
    result._perPositionHeight = perPositionHeight;
    result._perPositionHeightExtrude = perPositionHeightExtrude;
    result._arcType = arcType;
    result._offsetAttribute =
      offsetAttribute === -1 ? undefined : offsetAttribute;
    result.packedLength = packedLength;

    return result;
  };

  /**
   * A description of a polygon outline from an array of positions.
   *
   * @param {Object} options Object with the following properties:
   * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
   * @param {Number} [options.height=0.0] The height of the polygon.
   * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
   * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
   * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
   * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
   * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of path the outline must follow. Valid options are {@link LinkType.GEODESIC} and {@link ArcType.RHUMB}.
   * @returns {PolygonOutlineGeometry}
   *
   *
   * @example
   * // create a polygon from points
   * const polygon = Cesium.PolygonOutlineGeometry.fromPositions({
   *   positions : Cesium.Cartesian3.fromDegreesArray([
   *     -72.0, 40.0,
   *     -70.0, 35.0,
   *     -75.0, 30.0,
   *     -70.0, 30.0,
   *     -68.0, 40.0
   *   ])
   * });
   * const geometry = Cesium.PolygonOutlineGeometry.createGeometry(polygon);
   *
   * @see PolygonOutlineGeometry#createGeometry
   */
  PolygonOutlineGeometry.fromPositions = function (options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("options.positions", options.positions);
    //>>includeEnd('debug');

    const newOptions = {
      polygonHierarchy: {
        positions: options.positions,
      },
      height: options.height,
      extrudedHeight: options.extrudedHeight,
      ellipsoid: options.ellipsoid,
      granularity: options.granularity,
      perPositionHeight: options.perPositionHeight,
      arcType: options.arcType,
      offsetAttribute: options.offsetAttribute,
    };
    return new PolygonOutlineGeometry(newOptions);
  };

  /**
   * Computes the geometric representation of a polygon outline, including its vertices, indices, and a bounding sphere.
   *
   * @param {PolygonOutlineGeometry} polygonGeometry A description of the polygon outline.
   * @returns {Geometry|undefined} The computed vertices and indices.
   */
  PolygonOutlineGeometry.createGeometry = function (polygonGeometry) {
    const ellipsoid = polygonGeometry._ellipsoid;
    const granularity = polygonGeometry._granularity;
    const polygonHierarchy = polygonGeometry._polygonHierarchy;
    const perPositionHeight = polygonGeometry._perPositionHeight;
    const arcType = polygonGeometry._arcType;

    const polygons = PolygonGeometryLibrary.PolygonGeometryLibrary.polygonOutlinesFromHierarchy(
      polygonHierarchy,
      !perPositionHeight,
      ellipsoid
    );

    if (polygons.length === 0) {
      return undefined;
    }

    let geometryInstance;
    const geometries = [];
    const minDistance = Math$1.CesiumMath.chordLength(
      granularity,
      ellipsoid.maximumRadius
    );

    const height = polygonGeometry._height;
    const extrudedHeight = polygonGeometry._extrudedHeight;
    const extrude =
      polygonGeometry._perPositionHeightExtrude ||
      !Math$1.CesiumMath.equalsEpsilon(height, extrudedHeight, 0, Math$1.CesiumMath.EPSILON2);
    let offsetValue;
    let i;
    if (extrude) {
      for (i = 0; i < polygons.length; i++) {
        geometryInstance = createGeometryFromPositionsExtruded(
          ellipsoid,
          polygons[i],
          minDistance,
          perPositionHeight,
          arcType
        );
        geometryInstance.geometry = PolygonGeometryLibrary.PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(
          geometryInstance.geometry,
          height,
          extrudedHeight,
          ellipsoid,
          perPositionHeight
        );
        if (defaultValue.defined(polygonGeometry._offsetAttribute)) {
          const size =
            geometryInstance.geometry.attributes.position.values.length / 3;
          let offsetAttribute = new Uint8Array(size);
          if (polygonGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.TOP) {
            offsetAttribute = offsetAttribute.fill(1, 0, size / 2);
          } else {
            offsetValue =
              polygonGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
                ? 0
                : 1;
            offsetAttribute = offsetAttribute.fill(offsetValue);
          }

          geometryInstance.geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute(
            {
              componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
              componentsPerAttribute: 1,
              values: offsetAttribute,
            }
          );
        }
        geometries.push(geometryInstance);
      }
    } else {
      for (i = 0; i < polygons.length; i++) {
        geometryInstance = createGeometryFromPositions(
          ellipsoid,
          polygons[i],
          minDistance,
          perPositionHeight,
          arcType
        );
        geometryInstance.geometry.attributes.position.values = PolygonPipeline.PolygonPipeline.scaleToGeodeticHeight(
          geometryInstance.geometry.attributes.position.values,
          height,
          ellipsoid,
          !perPositionHeight
        );

        if (defaultValue.defined(polygonGeometry._offsetAttribute)) {
          const length =
            geometryInstance.geometry.attributes.position.values.length;
          offsetValue =
            polygonGeometry._offsetAttribute === GeometryOffsetAttribute.GeometryOffsetAttribute.NONE
              ? 0
              : 1;
          const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
          geometryInstance.geometry.attributes.applyOffset = new GeometryAttribute.GeometryAttribute(
            {
              componentDatatype: ComponentDatatype.ComponentDatatype.UNSIGNED_BYTE,
              componentsPerAttribute: 1,
              values: applyOffset,
            }
          );
        }

        geometries.push(geometryInstance);
      }
    }

    const geometry = GeometryPipeline.GeometryPipeline.combineInstances(geometries)[0];
    const boundingSphere = Transforms.BoundingSphere.fromVertices(
      geometry.attributes.position.values
    );

    return new GeometryAttribute.Geometry({
      attributes: geometry.attributes,
      indices: geometry.indices,
      primitiveType: geometry.primitiveType,
      boundingSphere: boundingSphere,
      offsetAttribute: polygonGeometry._offsetAttribute,
    });
  };

  function createPolygonOutlineGeometry(polygonGeometry, offset) {
    if (defaultValue.defined(offset)) {
      polygonGeometry = PolygonOutlineGeometry.unpack(polygonGeometry, offset);
    }
    polygonGeometry._ellipsoid = Matrix3.Ellipsoid.clone(polygonGeometry._ellipsoid);
    return PolygonOutlineGeometry.createGeometry(polygonGeometry);
  }

  return createPolygonOutlineGeometry;

}));
