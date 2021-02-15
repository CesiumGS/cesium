import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import IntersectionTests from "./IntersectionTests.js";
import Ray from "./Ray.js";
import SceneMode from "../Scene/SceneMode.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import PolylineGeometry from "./PolylineGeometry.js";
import Primitive from "../Scene/Primitive.js";
import GeometryInstance from "./GeometryInstance.js";
import PolylineColorAppearance from "../Scene/PolylineColorAppearance.js";
import ColorGeometryInstanceAttribute from "./ColorGeometryInstanceAttribute.js";
import Color from "./Color.js";
import PolygonGeometry from "./PolygonGeometry.js";
import PolygonHierarchy from "./PolygonHierarchy.js";
import CesiumMath from "./Math.js";
import BoxGeometry from "./BoxGeometry.js";
import VertexFormat from "./VertexFormat.js";

/**
 * A mesh plus related metadata for a single tile of terrain.  Instances of this type are
 * usually created from raw {@link TerrainData}.
 *
 * @alias TerrainMesh
 * @constructor
 *
 * @param {Cartesian3} center The center of the tile.  Vertex positions are specified relative to this center.
 * @param {Float32Array} vertices The vertex data, including positions, texture coordinates, and heights.
 *                       The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
 *                       the Cartesian position of the vertex, H is the height above the ellipsoid, and
 *                       U and V are the texture coordinates.
 * @param {Uint8Array|Uint16Array|Uint32Array} indices The indices describing how the vertices are connected to form triangles.
 * @param {Number} indexCountWithoutSkirts The index count of the mesh not including skirts.
 * @param {Number} vertexCountWithoutSkirts The vertex count of the mesh not including skirts.
 * @param {Number} minimumHeight The lowest height in the tile, in meters above the ellipsoid.
 * @param {Number} maximumHeight The highest height in the tile, in meters above the ellipsoid.
 * @param {BoundingSphere} boundingSphere3D A bounding sphere that completely contains the tile.
 * @param {Cartesian3} occludeePointInScaledSpace The occludee point of the tile, represented in ellipsoid-
 *                     scaled space, and used for horizon culling.  If this point is below the horizon,
 *                     the tile is considered to be entirely below the horizon.
 * @param {Number} [vertexStride=6] The number of components in each vertex.
 * @param {OrientedBoundingBox} [orientedBoundingBox] A bounding box that completely contains the tile.
 * @param {TerrainEncoding} encoding Information used to decode the mesh.
 * @param {Number} exaggeration The amount that this mesh was exaggerated.
 * @param {Number[]} westIndicesSouthToNorth The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
 * @param {Number[]} southIndicesEastToWest The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
 * @param {Number[]} eastIndicesNorthToSouth The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
 * @param {Number[]} northIndicesWestToEast The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
 * @param {TrianglePicking} trianglePicking The triangle picking instance to use.
 *
 * @private
 */
function TerrainMesh(
  center,
  vertices,
  indices,
  indexCountWithoutSkirts,
  vertexCountWithoutSkirts,
  minimumHeight,
  maximumHeight,
  boundingSphere3D,
  occludeePointInScaledSpace,
  vertexStride,
  orientedBoundingBox,
  encoding,
  exaggeration,
  westIndicesSouthToNorth,
  southIndicesEastToWest,
  eastIndicesNorthToSouth,
  northIndicesWestToEast,
  trianglePicking,
  url,
  viewer
) {
  /**
   * The center of the tile.  Vertex positions are specified relative to this center.
   * @type {Cartesian3}
   */
  this.center = center;

  /**
   * The vertex data, including positions, texture coordinates, and heights.
   * The vertex data is in the order [X, Y, Z, H, U, V], where X, Y, and Z represent
   * the Cartesian position of the vertex, H is the height above the ellipsoid, and
   * U and V are the texture coordinates.  The vertex data may have additional attributes after those
   * mentioned above when the {@link TerrainMesh#stride} is greater than 6.
   * @type {Float32Array}
   */
  this.vertices = vertices;

  /**
   * The number of components in each vertex.  Typically this is 6 for the 6 components
   * [X, Y, Z, H, U, V], but if each vertex has additional data (such as a vertex normal), this value
   * may be higher.
   * @type {Number}
   */
  this.stride = defaultValue(vertexStride, 6);

  /**
   * The indices describing how the vertices are connected to form triangles.
   * @type {Uint8Array|Uint16Array|Uint32Array}
   */
  this.indices = indices;

  /**
   * The index count of the mesh not including skirts.
   * @type {Number}
   */
  this.indexCountWithoutSkirts = indexCountWithoutSkirts;

  /**
   * The vertex count of the mesh not including skirts.
   * @type {Number}
   */
  this.vertexCountWithoutSkirts = vertexCountWithoutSkirts;

  /**
   * The lowest height in the tile, in meters above the ellipsoid.
   * @type {Number}
   */
  this.minimumHeight = minimumHeight;

  /**
   * The highest height in the tile, in meters above the ellipsoid.
   * @type {Number}
   */
  this.maximumHeight = maximumHeight;

  /**
   * A bounding sphere that completely contains the tile.
   * @type {BoundingSphere}
   */
  this.boundingSphere3D = boundingSphere3D;

  /**
   * The occludee point of the tile, represented in ellipsoid-
   * scaled space, and used for horizon culling.  If this point is below the horizon,
   * the tile is considered to be entirely below the horizon.
   * @type {Cartesian3}
   */
  this.occludeePointInScaledSpace = occludeePointInScaledSpace;

  /**
   * A bounding box that completely contains the tile.
   * @type {OrientedBoundingBox}
   */
  this.orientedBoundingBox = orientedBoundingBox;

  /**
   * Information for decoding the mesh vertices.
   * @type {TerrainEncoding}
   */
  this.encoding = encoding;

  /**
   * The amount that this mesh was exaggerated.
   * @type {Number}
   */
  this.exaggeration = exaggeration;

  /**
   * The indices of the vertices on the Western edge of the tile, ordered from South to North (clockwise).
   * @type {Number[]}
   */
  this.westIndicesSouthToNorth = westIndicesSouthToNorth;

  /**
   * The indices of the vertices on the Southern edge of the tile, ordered from East to West (clockwise).
   * @type {Number[]}
   */
  this.southIndicesEastToWest = southIndicesEastToWest;

  /**
   * The indices of the vertices on the Eastern edge of the tile, ordered from North to South (clockwise).
   * @type {Number[]}
   */
  this.eastIndicesNorthToSouth = eastIndicesNorthToSouth;

  /**
   * The indices of the vertices on the Northern edge of the tile, ordered from West to East (clockwise).
   * @type {Number[]}
   */
  this.northIndicesWestToEast = northIndicesWestToEast;

  /**
   * Used when calling {@link TerrainMesh#getPickRay}
   * @type {TrianglePicking}
   * @private
   */
  this._trianglePicking = trianglePicking;
  this._url = url;
  this._viewer = viewer;
}

var scratchCartographic = new Cartographic();

/**
 *
 * @param encoding
 * @param {SceneMode} mode
 * @param {GeographicProjection|WebMercatorProjection} projection
 * @param vertices
 * @param index
 * @param result
 * @return {*}
 */
function getPosition(encoding, mode, projection, vertices, index, result) {
  encoding.decodePosition(vertices, index, result);

  if (defined(mode) && mode !== SceneMode.SCENE3D) {
    // TODO why do we need to do this?....
    var ellipsoid = projection.ellipsoid;
    var positionCart = ellipsoid.cartesianToCartographic(
      result,
      scratchCartographic
    );
    projection.project(positionCart, result);
    Cartesian3.fromElements(result.z, result.x, result.y, result);
  }

  return result;
}

function addLine(viewer, ray, color) {
  if (!viewer || !ray) {
    return;
  }
  var primitive = new Primitive({
    geometryInstances: new GeometryInstance({
      geometry: new PolylineGeometry({
        positions: [ray.origin, Ray.getPoint(ray, 100000)],
        width: 2,
        vertexFormat: PolylineColorAppearance.VERTEX_FORMAT,
      }),
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(color),
      },
    }),
    appearance: new PolylineColorAppearance({
      translucent: false,
    }),
  });
  viewer.scene.primitives.add(primitive);
}

function addTriangle(viewer, v0, v1, v2) {
  if (!viewer || !v0) {
    return;
  }

  var pointA = Cartographic.fromCartesian(v0);

  viewer.entities.add({
    position: pointA,
    ellipsoid: {
      radii: new Cartesian3(100.0, 100.0, 100.0),
      material: Color.RED,
    },
  });

  // // 1. create a polygon from points
  // var polygon = new PolygonGeometry({
  //   polygonHierarchy: new PolygonHierarchy(
  //     [v0, v1, v2]
  //     // Cartesian3.fromDegreesArray([
  //     //   -72.0, 40.0,
  //     //   -70.0, 35.0,
  //     //   -75.0, 30.0,
  //     //   -70.0, 30.0,
  //     //   -68.0, 40.0
  //     // ])
  //   ),
  // });
  // var geometry = PolygonGeometry.createGeometry(polygon);
  //
  // // var box = new BoxGeometry({
  // //   vertexFormat: VertexFormat.POSITION_ONLY,
  // //   maximum: new Cartesian3(minX, minY, minZ),
  // //   minimum: new Cartesian3(maxX, maxY, maxZ),
  // // });
  // // var geometry = BoxGeometry.createGeometry(box);
  //
  // var primitive = new Primitive({
  //   geometryInstances: new GeometryInstance({
  //     geometry: geometry,
  //     attributes: {
  //       color: ColorGeometryInstanceAttribute.fromColor(Color.GREEN),
  //     },
  //   }),
  //   // appearance: new PolylineColorAppearance({
  //   //   translucent: false,
  //   // }),
  // });
  // viewer.scene.primitives.add(primitive);

  // viewer.entities.add({
  //   name: "Red box with black outline",
  //   position: Cartesian3.fromDegrees(-107.0, 40.0, 300000.0),
  //   box: {
  //     dimensions: new Cartesian3(400000.0, 300000.0, 500000.0),
  //     material: Color.RED.withAlpha(0.5),
  //     outline: true,
  //     outlineColor: Color.BLACK,
  //   },
  // });
}

/**
 * Gives the point on the mesh where the give ray intersects
 * @param ray
 * @param cullBackFaces
 * @param mode
 * @param projection
 * @returns {Cartesian3}
 */
TerrainMesh.prototype.pickRay = function (
  ray,
  cullBackFaces,
  mode,
  projection,
  showDeails
) {
  var canNewPick = mode === SceneMode.SCENE3D && defined(this._trianglePicking);
  var newPickValue = undefined;
  if (canNewPick) {
    // console.time("new pick");
    var details = this._trianglePicking.rayIntersect(
      ray,
      cullBackFaces,
      newPickValue,
      showDeails
    );
    if (details) {
      newPickValue = details.result;
    }
    // console.timeEnd("new pick");

    if (showDeails) {
      addLine(this._viewer, ray, Color.RED);

      if (details) {
        addLine(this._viewer, details.transformedRay, Color.GREEN);

        if (details && details.traversalResult) {
          var v0 = new Cartesian3();
          var v1 = new Cartesian3();
          var v2 = new Cartesian3();
          this._trianglePicking._triangleVerticesCallback(
            details.traversalResult.triangleIndex,
            v0,
            v1,
            v2
          );
          // var triangle = this._trianglePicking._triangles.slice(
          //   details.traversalResult.triangleIndex,
          //   details.traversalResult.triangleIndex + 6
          // );
          addTriangle(this._viewer, v0, v1, v2);
        }
      }
    }
  }

  /**
   *
   * @param {TerrainMesh} mesh
   * @return {Cartesian3|*|undefined}
   */
  function oldPick(mesh) {
    var vertices = mesh.vertices;
    var indices = mesh.indices;
    var encoding = mesh.encoding;
    var indicesLength = indices.length;

    var scratchV0 = new Cartesian3();
    var scratchV1 = new Cartesian3();
    var scratchV2 = new Cartesian3();

    var minT = Number.MAX_VALUE;

    for (var i = 0; i < indicesLength; i += 3) {
      var i0 = indices[i];
      var i1 = indices[i + 1];
      var i2 = indices[i + 2];

      var v0 = getPosition(encoding, mode, projection, vertices, i0, scratchV0);
      var v1 = getPosition(encoding, mode, projection, vertices, i1, scratchV1);
      var v2 = getPosition(encoding, mode, projection, vertices, i2, scratchV2);

      var t = IntersectionTests.rayTriangleParametric(
        ray,
        v0,
        v1,
        v2,
        cullBackFaces
      );
      if (defined(t) && t < minT && t >= 0.0) {
        minT = t;
      }
    }
    return minT !== Number.MAX_VALUE ? Ray.getPoint(ray, minT) : undefined;
  }

  var doOldPick = true;

  var oldPickValue;
  if (doOldPick) {
    // console.time("old pick");
    oldPickValue = oldPick(this);
    // console.timeEnd("old pick");
  }

  if (
    doOldPick &&
    canNewPick &&
    !Cartesian3.equals(newPickValue, oldPickValue)
  ) {
    console.error("pick values are different", newPickValue, oldPickValue);
  }
  return newPickValue || oldPickValue;
};

export default TerrainMesh;
