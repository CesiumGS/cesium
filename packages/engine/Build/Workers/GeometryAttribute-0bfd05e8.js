define(['exports', './Matrix2-13178034', './Matrix3-315394f6', './Check-666ab1a0', './defaultValue-0a909f67', './WebGLConstants-a8cc3e8c', './Transforms-26539bce'], (function (exports, Matrix2, Matrix3, Check, defaultValue, WebGLConstants, Transforms) { 'use strict';

  /**
   * @private
   */
  const GeometryType = {
    NONE: 0,
    TRIANGLES: 1,
    LINES: 2,
    POLYLINES: 3,
  };
  var GeometryType$1 = Object.freeze(GeometryType);

  /**
   * The type of a geometric primitive, i.e., points, lines, and triangles.
   *
   * @enum {Number}
   */
  const PrimitiveType = {
    /**
     * Points primitive where each vertex (or index) is a separate point.
     *
     * @type {Number}
     * @constant
     */
    POINTS: WebGLConstants.WebGLConstants.POINTS,

    /**
     * Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
     *
     * @type {Number}
     * @constant
     */
    LINES: WebGLConstants.WebGLConstants.LINES,

    /**
     * Line loop primitive where each vertex (or index) after the first connects a line to
     * the previous vertex, and the last vertex implicitly connects to the first.
     *
     * @type {Number}
     * @constant
     */
    LINE_LOOP: WebGLConstants.WebGLConstants.LINE_LOOP,

    /**
     * Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
     *
     * @type {Number}
     * @constant
     */
    LINE_STRIP: WebGLConstants.WebGLConstants.LINE_STRIP,

    /**
     * Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
     *
     * @type {Number}
     * @constant
     */
    TRIANGLES: WebGLConstants.WebGLConstants.TRIANGLES,

    /**
     * Triangle strip primitive where each vertex (or index) after the first two connect to
     * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
     *
     * @type {Number}
     * @constant
     */
    TRIANGLE_STRIP: WebGLConstants.WebGLConstants.TRIANGLE_STRIP,

    /**
     * Triangle fan primitive where each vertex (or index) after the first two connect to
     * the previous vertex and the first vertex forming a triangle.  For example, this can be used
     * to model a cone or circle.
     *
     * @type {Number}
     * @constant
     */
    TRIANGLE_FAN: WebGLConstants.WebGLConstants.TRIANGLE_FAN,
  };

  /**
   * @private
   */
  PrimitiveType.isLines = function (primitiveType) {
    return (
      primitiveType === PrimitiveType.LINES ||
      primitiveType === PrimitiveType.LINE_LOOP ||
      primitiveType === PrimitiveType.LINE_STRIP
    );
  };

  /**
   * @private
   */
  PrimitiveType.isTriangles = function (primitiveType) {
    return (
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.TRIANGLE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLE_FAN
    );
  };

  /**
   * @private
   */
  PrimitiveType.validate = function (primitiveType) {
    return (
      primitiveType === PrimitiveType.POINTS ||
      primitiveType === PrimitiveType.LINES ||
      primitiveType === PrimitiveType.LINE_LOOP ||
      primitiveType === PrimitiveType.LINE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.TRIANGLE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLE_FAN
    );
  };

  var PrimitiveType$1 = Object.freeze(PrimitiveType);

  /**
   * A geometry representation with attributes forming vertices and optional index data
   * defining primitives.  Geometries and an {@link Appearance}, which describes the shading,
   * can be assigned to a {@link Primitive} for visualization.  A <code>Primitive</code> can
   * be created from many heterogeneous - in many cases - geometries for performance.
   * <p>
   * Geometries can be transformed and optimized using functions in {@link GeometryPipeline}.
   * </p>
   *
   * @alias Geometry
   * @constructor
   *
   * @param {Object} options Object with the following properties:
   * @param {GeometryAttributes} options.attributes Attributes, which make up the geometry's vertices.
   * @param {PrimitiveType} [options.primitiveType=PrimitiveType.TRIANGLES] The type of primitives in the geometry.
   * @param {Uint16Array|Uint32Array} [options.indices] Optional index data that determines the primitives in the geometry.
   * @param {BoundingSphere} [options.boundingSphere] An optional bounding sphere that fully enclosed the geometry.
   *
   * @see PolygonGeometry
   * @see RectangleGeometry
   * @see EllipseGeometry
   * @see CircleGeometry
   * @see WallGeometry
   * @see SimplePolylineGeometry
   * @see BoxGeometry
   * @see EllipsoidGeometry
   *
   * @demo {@link https://sandcastle.cesium.com/index.html?src=Geometry%20and%20Appearances.html|Geometry and Appearances Demo}
   *
   * @example
   * // Create geometry with a position attribute and indexed lines.
   * const positions = new Float64Array([
   *   0.0, 0.0, 0.0,
   *   7500000.0, 0.0, 0.0,
   *   0.0, 7500000.0, 0.0
   * ]);
   *
   * const geometry = new Cesium.Geometry({
   *   attributes : {
   *     position : new Cesium.GeometryAttribute({
   *       componentDatatype : Cesium.ComponentDatatype.DOUBLE,
   *       componentsPerAttribute : 3,
   *       values : positions
   *     })
   *   },
   *   indices : new Uint16Array([0, 1, 1, 2, 2, 0]),
   *   primitiveType : Cesium.PrimitiveType.LINES,
   *   boundingSphere : Cesium.BoundingSphere.fromVertices(positions)
   * });
   */
  function Geometry(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("options.attributes", options.attributes);
    //>>includeEnd('debug');

    /**
     * Attributes, which make up the geometry's vertices.  Each property in this object corresponds to a
     * {@link GeometryAttribute} containing the attribute's data.
     * <p>
     * Attributes are always stored non-interleaved in a Geometry.
     * </p>
     * <p>
     * There are reserved attribute names with well-known semantics.  The following attributes
     * are created by a Geometry (depending on the provided {@link VertexFormat}.
     * <ul>
     *    <li><code>position</code> - 3D vertex position.  64-bit floating-point (for precision).  3 components per attribute.  See {@link VertexFormat#position}.</li>
     *    <li><code>normal</code> - Normal (normalized), commonly used for lighting.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat#normal}.</li>
     *    <li><code>st</code> - 2D texture coordinate.  32-bit floating-point.  2 components per attribute.  See {@link VertexFormat#st}.</li>
     *    <li><code>bitangent</code> - Bitangent (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat#bitangent}.</li>
     *    <li><code>tangent</code> - Tangent (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat#tangent}.</li>
     * </ul>
     * </p>
     * <p>
     * The following attribute names are generally not created by a Geometry, but are added
     * to a Geometry by a {@link Primitive} or {@link GeometryPipeline} functions to prepare
     * the geometry for rendering.
     * <ul>
     *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
     *    <li><code>position3DLow</code> - Low 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
     *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
     *    <li><code>position2DLow</code> - Low 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
     *    <li><code>color</code> - RGBA color (normalized) usually from {@link GeometryInstance#color}.  32-bit floating-point.  4 components per attribute.</li>
     *    <li><code>pickColor</code> - RGBA color used for picking.  32-bit floating-point.  4 components per attribute.</li>
     * </ul>
     * </p>
     *
     * @type GeometryAttributes
     *
     * @default undefined
     *
     *
     * @example
     * geometry.attributes.position = new Cesium.GeometryAttribute({
     *   componentDatatype : Cesium.ComponentDatatype.FLOAT,
     *   componentsPerAttribute : 3,
     *   values : new Float32Array(0)
     * });
     *
     * @see GeometryAttribute
     * @see VertexFormat
     */
    this.attributes = options.attributes;

    /**
     * Optional index data that - along with {@link Geometry#primitiveType} -
     * determines the primitives in the geometry.
     *
     * @type Array
     *
     * @default undefined
     */
    this.indices = options.indices;

    /**
     * The type of primitives in the geometry.  This is most often {@link PrimitiveType.TRIANGLES},
     * but can varying based on the specific geometry.
     *
     * @type PrimitiveType
     *
     * @default undefined
     */
    this.primitiveType = defaultValue.defaultValue(
      options.primitiveType,
      PrimitiveType$1.TRIANGLES
    );

    /**
     * An optional bounding sphere that fully encloses the geometry.  This is
     * commonly used for culling.
     *
     * @type BoundingSphere
     *
     * @default undefined
     */
    this.boundingSphere = options.boundingSphere;

    /**
     * @private
     */
    this.geometryType = defaultValue.defaultValue(options.geometryType, GeometryType$1.NONE);

    /**
     * @private
     */
    this.boundingSphereCV = options.boundingSphereCV;

    /**
     * Used for computing the bounding sphere for geometry using the applyOffset vertex attribute
     * @private
     */
    this.offsetAttribute = options.offsetAttribute;
  }

  /**
   * Computes the number of vertices in a geometry.  The runtime is linear with
   * respect to the number of attributes in a vertex, not the number of vertices.
   *
   * @param {Geometry} geometry The geometry.
   * @returns {Number} The number of vertices in the geometry.
   *
   * @example
   * const numVertices = Cesium.Geometry.computeNumberOfVertices(geometry);
   */
  Geometry.computeNumberOfVertices = function (geometry) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("geometry", geometry);
    //>>includeEnd('debug');

    let numberOfVertices = -1;
    for (const property in geometry.attributes) {
      if (
        geometry.attributes.hasOwnProperty(property) &&
        defaultValue.defined(geometry.attributes[property]) &&
        defaultValue.defined(geometry.attributes[property].values)
      ) {
        const attribute = geometry.attributes[property];
        const num = attribute.values.length / attribute.componentsPerAttribute;
        //>>includeStart('debug', pragmas.debug);
        if (numberOfVertices !== num && numberOfVertices !== -1) {
          throw new Check.DeveloperError(
            "All attribute lists must have the same number of attributes."
          );
        }
        //>>includeEnd('debug');
        numberOfVertices = num;
      }
    }

    return numberOfVertices;
  };

  const rectangleCenterScratch = new Matrix3.Cartographic();
  const enuCenterScratch = new Matrix3.Cartesian3();
  const fixedFrameToEnuScratch = new Matrix2.Matrix4();
  const boundingRectanglePointsCartographicScratch = [
    new Matrix3.Cartographic(),
    new Matrix3.Cartographic(),
    new Matrix3.Cartographic(),
  ];
  const boundingRectanglePointsEnuScratch = [
    new Matrix2.Cartesian2(),
    new Matrix2.Cartesian2(),
    new Matrix2.Cartesian2(),
  ];
  const points2DScratch = [new Matrix2.Cartesian2(), new Matrix2.Cartesian2(), new Matrix2.Cartesian2()];
  const pointEnuScratch = new Matrix3.Cartesian3();
  const enuRotationScratch = new Transforms.Quaternion();
  const enuRotationMatrixScratch = new Matrix2.Matrix4();
  const rotation2DScratch = new Matrix2.Matrix2();

  /**
   * For remapping texture coordinates when rendering GroundPrimitives with materials.
   * GroundPrimitive texture coordinates are computed to align with the cartographic coordinate system on the globe.
   * However, EllipseGeometry, RectangleGeometry, and PolygonGeometry all bake rotations to per-vertex texture coordinates
   * using different strategies.
   *
   * This method is used by EllipseGeometry and PolygonGeometry to approximate the same visual effect.
   * We encapsulate rotation and scale by computing a "transformed" texture coordinate system and computing
   * a set of reference points from which "cartographic" texture coordinates can be remapped to the "transformed"
   * system using distances to lines in 2D.
   *
   * This approximation becomes less accurate as the covered area increases, especially for GroundPrimitives near the poles,
   * but is generally reasonable for polygons and ellipses around the size of USA states.
   *
   * RectangleGeometry has its own version of this method that computes remapping coordinates using cartographic space
   * as an intermediary instead of local ENU, which is more accurate for large-area rectangles.
   *
   * @param {Cartesian3[]} positions Array of positions outlining the geometry
   * @param {Number} stRotation Texture coordinate rotation.
   * @param {Ellipsoid} ellipsoid Ellipsoid for projecting and generating local vectors.
   * @param {Rectangle} boundingRectangle Bounding rectangle around the positions.
   * @returns {Number[]} An array of 6 numbers specifying [minimum point, u extent, v extent] as points in the "cartographic" system.
   * @private
   */
  Geometry._textureCoordinateRotationPoints = function (
    positions,
    stRotation,
    ellipsoid,
    boundingRectangle
  ) {
    let i;

    // Create a local east-north-up coordinate system centered on the polygon's bounding rectangle.
    // Project the southwest, northwest, and southeast corners of the bounding rectangle into the plane of ENU as 2D points.
    // These are the equivalents of (0,0), (0,1), and (1,0) in the texture coordiante system computed in ShadowVolumeAppearanceFS,
    // aka "ENU texture space."
    const rectangleCenter = Matrix2.Rectangle.center(
      boundingRectangle,
      rectangleCenterScratch
    );
    const enuCenter = Matrix3.Cartographic.toCartesian(
      rectangleCenter,
      ellipsoid,
      enuCenterScratch
    );
    const enuToFixedFrame = Transforms.Transforms.eastNorthUpToFixedFrame(
      enuCenter,
      ellipsoid,
      fixedFrameToEnuScratch
    );
    const fixedFrameToEnu = Matrix2.Matrix4.inverse(
      enuToFixedFrame,
      fixedFrameToEnuScratch
    );

    const boundingPointsEnu = boundingRectanglePointsEnuScratch;
    const boundingPointsCarto = boundingRectanglePointsCartographicScratch;

    boundingPointsCarto[0].longitude = boundingRectangle.west;
    boundingPointsCarto[0].latitude = boundingRectangle.south;

    boundingPointsCarto[1].longitude = boundingRectangle.west;
    boundingPointsCarto[1].latitude = boundingRectangle.north;

    boundingPointsCarto[2].longitude = boundingRectangle.east;
    boundingPointsCarto[2].latitude = boundingRectangle.south;

    let posEnu = pointEnuScratch;

    for (i = 0; i < 3; i++) {
      Matrix3.Cartographic.toCartesian(boundingPointsCarto[i], ellipsoid, posEnu);
      posEnu = Matrix2.Matrix4.multiplyByPointAsVector(fixedFrameToEnu, posEnu, posEnu);
      boundingPointsEnu[i].x = posEnu.x;
      boundingPointsEnu[i].y = posEnu.y;
    }

    // Rotate each point in the polygon around the up vector in the ENU by -stRotation and project into ENU as 2D.
    // Compute the bounding box of these rotated points in the 2D ENU plane.
    // Rotate the corners back by stRotation, then compute their equivalents in the ENU texture space using the corners computed earlier.
    const rotation = Transforms.Quaternion.fromAxisAngle(
      Matrix3.Cartesian3.UNIT_Z,
      -stRotation,
      enuRotationScratch
    );
    const textureMatrix = Matrix3.Matrix3.fromQuaternion(
      rotation,
      enuRotationMatrixScratch
    );

    const positionsLength = positions.length;
    let enuMinX = Number.POSITIVE_INFINITY;
    let enuMinY = Number.POSITIVE_INFINITY;
    let enuMaxX = Number.NEGATIVE_INFINITY;
    let enuMaxY = Number.NEGATIVE_INFINITY;
    for (i = 0; i < positionsLength; i++) {
      posEnu = Matrix2.Matrix4.multiplyByPointAsVector(
        fixedFrameToEnu,
        positions[i],
        posEnu
      );
      posEnu = Matrix3.Matrix3.multiplyByVector(textureMatrix, posEnu, posEnu);

      enuMinX = Math.min(enuMinX, posEnu.x);
      enuMinY = Math.min(enuMinY, posEnu.y);
      enuMaxX = Math.max(enuMaxX, posEnu.x);
      enuMaxY = Math.max(enuMaxY, posEnu.y);
    }

    const toDesiredInComputed = Matrix2.Matrix2.fromRotation(
      stRotation,
      rotation2DScratch
    );

    const points2D = points2DScratch;
    points2D[0].x = enuMinX;
    points2D[0].y = enuMinY;

    points2D[1].x = enuMinX;
    points2D[1].y = enuMaxY;

    points2D[2].x = enuMaxX;
    points2D[2].y = enuMinY;

    const boundingEnuMin = boundingPointsEnu[0];
    const boundingPointsWidth = boundingPointsEnu[2].x - boundingEnuMin.x;
    const boundingPointsHeight = boundingPointsEnu[1].y - boundingEnuMin.y;

    for (i = 0; i < 3; i++) {
      const point2D = points2D[i];
      // rotate back
      Matrix2.Matrix2.multiplyByVector(toDesiredInComputed, point2D, point2D);

      // Convert point into east-north texture coordinate space
      point2D.x = (point2D.x - boundingEnuMin.x) / boundingPointsWidth;
      point2D.y = (point2D.y - boundingEnuMin.y) / boundingPointsHeight;
    }

    const minXYCorner = points2D[0];
    const maxYCorner = points2D[1];
    const maxXCorner = points2D[2];
    const result = new Array(6);
    Matrix2.Cartesian2.pack(minXYCorner, result);
    Matrix2.Cartesian2.pack(maxYCorner, result, 2);
    Matrix2.Cartesian2.pack(maxXCorner, result, 4);

    return result;
  };

  /**
   * Values and type information for geometry attributes.  A {@link Geometry}
   * generally contains one or more attributes.  All attributes together form
   * the geometry's vertices.
   *
   * @alias GeometryAttribute
   * @constructor
   *
   * @param {Object} [options] Object with the following properties:
   * @param {ComponentDatatype} [options.componentDatatype] The datatype of each component in the attribute, e.g., individual elements in values.
   * @param {Number} [options.componentsPerAttribute] A number between 1 and 4 that defines the number of components in an attributes.
   * @param {Boolean} [options.normalize=false] When <code>true</code> and <code>componentDatatype</code> is an integer format, indicate that the components should be mapped to the range [0, 1] (unsigned) or [-1, 1] (signed) when they are accessed as floating-point for rendering.
   * @param {number[]|Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} [options.values] The values for the attributes stored in a typed array.
   *
   * @exception {DeveloperError} options.componentsPerAttribute must be between 1 and 4.
   *
   *
   * @example
   * const geometry = new Cesium.Geometry({
   *   attributes : {
   *     position : new Cesium.GeometryAttribute({
   *       componentDatatype : Cesium.ComponentDatatype.FLOAT,
   *       componentsPerAttribute : 3,
   *       values : new Float32Array([
   *         0.0, 0.0, 0.0,
   *         7500000.0, 0.0, 0.0,
   *         0.0, 7500000.0, 0.0
   *       ])
   *     })
   *   },
   *   primitiveType : Cesium.PrimitiveType.LINE_LOOP
   * });
   *
   * @see Geometry
   */
  function GeometryAttribute(options) {
    options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(options.componentDatatype)) {
      throw new Check.DeveloperError("options.componentDatatype is required.");
    }
    if (!defaultValue.defined(options.componentsPerAttribute)) {
      throw new Check.DeveloperError("options.componentsPerAttribute is required.");
    }
    if (
      options.componentsPerAttribute < 1 ||
      options.componentsPerAttribute > 4
    ) {
      throw new Check.DeveloperError(
        "options.componentsPerAttribute must be between 1 and 4."
      );
    }
    if (!defaultValue.defined(options.values)) {
      throw new Check.DeveloperError("options.values is required.");
    }
    //>>includeEnd('debug');

    /**
     * The datatype of each component in the attribute, e.g., individual elements in
     * {@link GeometryAttribute#values}.
     *
     * @type ComponentDatatype
     *
     * @default undefined
     */
    this.componentDatatype = options.componentDatatype;

    /**
     * A number between 1 and 4 that defines the number of components in an attributes.
     * For example, a position attribute with x, y, and z components would have 3 as
     * shown in the code example.
     *
     * @type Number
     *
     * @default undefined
     *
     * @example
     * attribute.componentDatatype = Cesium.ComponentDatatype.FLOAT;
     * attribute.componentsPerAttribute = 3;
     * attribute.values = new Float32Array([
     *   0.0, 0.0, 0.0,
     *   7500000.0, 0.0, 0.0,
     *   0.0, 7500000.0, 0.0
     * ]);
     */
    this.componentsPerAttribute = options.componentsPerAttribute;

    /**
     * When <code>true</code> and <code>componentDatatype</code> is an integer format,
     * indicate that the components should be mapped to the range [0, 1] (unsigned)
     * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
     * <p>
     * This is commonly used when storing colors using {@link ComponentDatatype.UNSIGNED_BYTE}.
     * </p>
     *
     * @type Boolean
     *
     * @default false
     *
     * @example
     * attribute.componentDatatype = Cesium.ComponentDatatype.UNSIGNED_BYTE;
     * attribute.componentsPerAttribute = 4;
     * attribute.normalize = true;
     * attribute.values = new Uint8Array([
     *   Cesium.Color.floatToByte(color.red),
     *   Cesium.Color.floatToByte(color.green),
     *   Cesium.Color.floatToByte(color.blue),
     *   Cesium.Color.floatToByte(color.alpha)
     * ]);
     */
    this.normalize = defaultValue.defaultValue(options.normalize, false);

    /**
     * The values for the attributes stored in a typed array.  In the code example,
     * every three elements in <code>values</code> defines one attributes since
     * <code>componentsPerAttribute</code> is 3.
     *
     * @type {number[]|Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array}
     *
     * @default undefined
     *
     * @example
     * attribute.componentDatatype = Cesium.ComponentDatatype.FLOAT;
     * attribute.componentsPerAttribute = 3;
     * attribute.values = new Float32Array([
     *   0.0, 0.0, 0.0,
     *   7500000.0, 0.0, 0.0,
     *   0.0, 7500000.0, 0.0
     * ]);
     */
    this.values = options.values;
  }

  exports.Geometry = Geometry;
  exports.GeometryAttribute = GeometryAttribute;
  exports.GeometryType = GeometryType$1;
  exports.PrimitiveType = PrimitiveType$1;

}));
