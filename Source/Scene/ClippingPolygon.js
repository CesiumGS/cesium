import PolygonClippingAccelerationGrid from "./PolygonClippingAccelerationGrid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian2 from "../Core/Cartesian2.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import WindingOrder from "../Core/WindingOrder.js";
import earcut from "../ThirdParty/earcut-2.2.1.js";
import DeveloperError from "../Core/DeveloperError.js";
import Texture from "../Renderer/Texture.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import PixelFormat from "../Core/PixelFormat.js";
import Matrix4 from "../Core/Matrix4.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartographic from "../Core/Cartographic.js";
import Transforms from "../Core/Transforms.js";
import simplify3d from "../ThirdParty/simplify3d.js";
import Check from "../Core/Check.js";

/**
 *
 * @param options
 *
 * @private
 */
function ClippingPolygon(options) {
  this._worldToENU = options.worldToENU;
  this._union = options.union;
  this._enabled = options.enabled;

  var positions = options.positions;
  var indices = options.indices;
  var splits = options.splits;

  var accelerator = new PolygonClippingAccelerationGrid({
    positions: positions,
    indices: indices,
    splits: splits,
  });

  var i;
  this._minimumZ = Infinity;
  for (i = 0; i < positions.length; i += 3) {
    this._minimumZ = Math.min(positions[i + 2], this._minimumZ);
  }

  // precision hack, if zoomed out the eye space -> enu space conversion
  // can cause some triangles inside the clipping polygon to be < minimumZ
  // when they're really not, causing visual artifacts until you zoom in
  // making the floor -100km from the actual floor fixes all issues
  this._minimumZ -= 100000;

  this._accelerator = accelerator;
  this._grid = accelerator.grid;
  this._overlappingTriangleIndices = accelerator.overlappingTriangleIndices;
  this._meshPositions = Float32Array.from(positions);
  this._dirty = true;

  var boundingBox = this._accelerator.boundingBox;
  this._boundingBox = boundingBox.toClockwiseCartesian2Pairs();
  this._cellDimensions = new Cartesian2(
    this._accelerator.cellWidth,
    this._accelerator.cellHeight
  );

  this._numRowsAndCols = new Cartesian2(
    this._accelerator.numRows,
    this._accelerator.numCols
  );

  // data texture limits:
  // - 16,777,216 cells are supported (if you make 4096 splits; overkill as 20-32 splits for most cases)
  // - 805,306,368 million overlapping triangle indices (32 bit float precision)
  // - 805,306,3368 million overlapping triangle vertex positions (32 bit float precision)

  // the 2D grid acceleration texture stores the cell status in the R channel
  // the startIndex into the overlappingTriangleIndicesTexture in the G channel
  // and the endIndex into the overlappingTriangleIndicesTexture in the B channel
  // The number of triangles that a cell recorded as partially overlapping
  // can be computed as (endIndex - startIndex) / 3.0
  var gridPixels = this._grid.length / this._accelerator.cellNumElements;
  var gridWidthPixels = gridPixels / this._accelerator.numCols;
  var gridHeightPixels = gridPixels / this._accelerator.numRows;
  this._gridPixelDimensions = new Cartesian2(gridWidthPixels, gridHeightPixels);

  // dimensions for 2D overlappingTriangleIndicesTexture, note that the indices from
  // the gridTexture are 1D and need to be converted into 2D rows and columns,
  // and then 2D pixel coordinates before doing a look up in this texture.

  var totalOverlappingTriangles = this._overlappingTriangleIndices.length / 3.0;
  var maxDimensionPixelSize = ContextLimits.maximumTextureSize;
  var colsToCreate = Math.min(totalOverlappingTriangles, maxDimensionPixelSize);
  var rowsToCreate =
    Math.floor(totalOverlappingTriangles / maxDimensionPixelSize) + 1.0;

  this._overlappingTrianglePixelIndicesDimensions = new Cartesian2(
    colsToCreate,
    rowsToCreate
  );

  var totalTrianglesInMesh = this._meshPositions.length / 3.0;
  colsToCreate = Math.min(totalTrianglesInMesh, maxDimensionPixelSize);
  rowsToCreate = Math.floor(totalTrianglesInMesh / maxDimensionPixelSize) + 1.0;

  this._meshPositionPixelDimensions = new Cartesian2(
    colsToCreate,
    rowsToCreate
  );
}

/**
 * Constructs a clipping mesh used to selectively enable / disable rendering
 * inside of the region defined by the clipping mesh.
 *
 * @param {Object} options Object with the following properties:
 * @param {Array.<PolygonHierarchy>} options.polygonHierarchies An ARRAY of Polygon
 * Hierarchies to amalgamate into a single clipping mesh. Holes are supported.
 * @param {Number} [options.simplify-0] Tolerance threshold that should be used
 * for mesh simplification. Note that over simplification can result in a degenerate
 * mesh which will trigger an exception
 * @param {Boolean} [options.union-false] If union is TRUE only geometry inside
 * the ClippingPolygon will be rendered. Otherwise only geometry outside the
 * ClippingPolygon will be rendered.
 */

ClippingPolygon.fromPolygonHierarchies = function (options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygonHierarchies", options.polygonHierarchies);
  //>>includeEnd('debug');

  var enabled = defaultValue(options.enabled, true);
  var polygonHierarchies = options.polygonHierarchies;
  var worldToENU = options.worldToENU;

  if (!defined(worldToENU)) {
    worldToENU = generateWorldToENUMatrixFromPolygonHierarchies(
      polygonHierarchies
    );
  }

  var simplify = defaultValue(options.simplify, 0);
  var union = defaultValue(options.union, false);
  var splits = defaultValue(options.splits, 33);
  var amalgamatedMesh = combinePolygonHierarchiesIntoSingleMesh(
    polygonHierarchies,
    worldToENU,
    simplify
  );

  options.positions = amalgamatedMesh.positions;
  options.indices = amalgamatedMesh.indices;
  options.worldToENU = worldToENU;
  options.union = union;
  options.simplify = simplify;
  options.splits = splits;
  options.enabled = enabled;
  return new ClippingPolygon(options);
};

Object.defineProperties(ClippingPolygon.prototype, {
  grid: {
    get: function () {
      return this._grid;
    },
  },

  gridNumPixels: {
    get: function () {
      return this._grid.length / this._accelerator.cellNumElements;
    },
  },

  gridPixelDimensions: {
    get: function () {
      return this._gridPixelDimensions;
    },
  },

  gridTexture: {
    get: function () {
      return this._gridTexture;
    },
  },

  minimumZ: {
    get: function () {
      return this._minimumZ;
    },
  },

  meshPositions: {
    get: function () {
      return this._meshPositions;
    },
  },

  enabled: {
    set: function (enable) {
      this._enabled = enable;
    },
    get: function () {
      return this._enabled;
    },
  },

  union: {
    set: function (v) {
      this._dirty = true;
      this._dirty = v;
    },

    get: function () {
      return this._union;
    },
  },

  meshPositionsTexture: {
    get: function () {
      return this._meshPositionTexture;
    },
  },

  meshPositionPixelDimensions: {
    get: function () {
      return this._meshPositionPixelDimensions;
    },
  },

  overlappingTriangleIndices: {
    get: function () {
      return this._overlappingTriangleIndices;
    },
  },

  overlappingTrianglePixelIndicesDimensions: {
    get: function () {
      return this._overlappingTrianglePixelIndicesDimensions;
    },
  },

  overlappingTriangleIndicesTexture: {
    get: function () {
      return this._overlappingTriangleIndicesTexture;
    },
  },

  boundingBox: {
    get: function () {
      return this._boundingBox;
    },
  },

  cellDimensions: {
    get: function () {
      return this._cellDimensions;
    },
  },

  numRowsAndCols: {
    get: function () {
      return this._numRowsAndCols;
    },
  },

  worldToENU: {
    get: function () {
      return this._worldToENU;
    },
  },
});

ClippingPolygon.prototype.update = function (frameState) {
  if (!this._dirty) {
    return;
  }

  this._dirty = false;
  var context = frameState.context;

  if (!context.floatingPointTexture) {
    throw new DeveloperError(
      "OES_texture_float or WebGL2 required to use ClippingPolygon"
    );
  }

  this._gridTexture = new Texture({
    context: context,
    width: this.gridPixelDimensions.x,
    height: this.gridPixelDimensions.y,
    pixelFormat: PixelFormat.RGB,
    pixelDatatype: PixelDatatype.FLOAT,
    sampler: Sampler.NEAREST,
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });

  this._gridTexture.copyFrom({
    width: this.gridPixelDimensions.x,
    height: this.gridPixelDimensions.y,
    arrayBufferView: this.grid,
  });

  this._meshPositionTexture = new Texture({
    context: context,
    width: this.meshPositionPixelDimensions.x,
    height: this.meshPositionPixelDimensions.y,
    pixelFormat: PixelFormat.RGB,
    pixelDatatype: PixelDatatype.FLOAT,
    sampler: Sampler.NEAREST,
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });

  this._meshPositionTexture.copyFrom({
    width: this.meshPositionPixelDimensions.x,
    height: this.meshPositionPixelDimensions.y,
    arrayBufferView: this.meshPositions,
  });

  this._overlappingTriangleIndicesTexture = new Texture({
    context: context,
    width: this.overlappingTrianglePixelIndicesDimensions.x,
    height: this.overlappingTrianglePixelIndicesDimensions.y,
    pixelFormat: PixelFormat.RGB,
    pixelDatatype: PixelDatatype.FLOAT,
    sampler: Sampler.NEAREST,
    wrapS: TextureWrap.CLAMP_TO_EDGE,
    wrapT: TextureWrap.CLAMP_TO_EDGE,
    minificationFilter: TextureMinificationFilter.NEAREST,
    magnificationFilter: TextureMagnificationFilter.NEAREST,
  });

  this._overlappingTriangleIndicesTexture.copyFrom({
    width: this.overlappingTrianglePixelIndicesDimensions.x,
    height: this.overlappingTrianglePixelIndicesDimensions.y,
    arrayBufferView: this.overlappingTriangleIndices,
  });
};

/**
 * @param {Array.<PolygonHierarchy>} hierarchies
 * @param {Matrix4} worldToENU matrix
 * @param {Number} simplify Simplification amount
 * @return {Object} An object containing the vertex positions plus indices
 */

function combinePolygonHierarchiesIntoSingleMesh(
  hierarchies,
  worldToENU,
  simplify
) {
  // convert each polygon into mesh(es)
  var i, j;
  var polygonHierarchiesAsMeshes = [];
  for (i = 0; i < hierarchies.length; ++i) {
    var asMeshes = convertPolygonHierarchyIntoMesh(
      hierarchies[i],
      worldToENU,
      simplify
    );
    polygonHierarchiesAsMeshes.push(asMeshes);
  }

  // amalgamate the meshes into a single polygon, updating indices as we go
  var positions = [];
  var indices = [];

  for (i = 0; i < polygonHierarchiesAsMeshes.length; ++i) {
    var mesh = polygonHierarchiesAsMeshes[i];

    for (j = 0; j < mesh.length; ++j) {
      var m = mesh[j];

      var k;
      for (k = 0; k < m.indices.length; ++k) {
        indices.push(m.indices[k] + positions.length / 3.0);
      }

      positions = positions.concat(m.positions);
    }
  }

  if (indices.length < 3) {
    throw new DeveloperError(
      "Degenerate clipping mesh generated, try reducing or disabling simplification."
    );
  }

  return {
    positions: positions,
    indices: indices,
  };
}

function convertPolygonHierarchyIntoMesh(
  polygonHierarchy,
  worldToENU,
  simplify
) {
  var holes = defaultValue(polygonHierarchy.holes, []);
  var visitHoles = holes.length > 0 ? [].concat(holes) : [];
  var isHole = true;
  var i, j;
  var mesh;
  var positions;
  var holeIndices;

  var meshes = [
    [
      {
        positions: polygonHierarchy.positions,
        isHole: false,
      },
    ],
  ];

  // collapse the polygonHierarchy into a 2D array, where each
  // element is a mesh and the mesh contains the positions that
  // form the mesh (plus its non-recursive holes)

  // collapse the PolygonHierarchy into a 1D array
  var meshIndex = 0;
  do {
    if (!defined(meshes[meshIndex])) {
      meshes[meshIndex] = [];
    }

    mesh = meshes[meshIndex];
    var childCount = visitHoles.length;

    for (i = 0; i < childCount; ++i) {
      var hole = visitHoles.splice(0, 1)[0];
      var childHoles = defined(hole.holes) ? [].concat(hole.holes) : [];
      visitHoles = visitHoles.concat(childHoles);
      mesh.push({
        positions: hole.positions,
        isHole: isHole,
      });
    }

    isHole = !isHole;
    meshIndex += 1;
  } while (visitHoles.length > 0);

  var flatPolygon;
  var positionsAndIndicesForEarcut = [];

  // translate & simplify each mesh
  for (i = 0; i < meshes.length; ++i) {
    var transformedPositions = [];
    holeIndices = [];
    mesh = meshes[i];
    for (j = 0; j < mesh.length; ++j) {
      flatPolygon = mesh[j];
      positions = defined(flatPolygon.positions)
        ? [].concat(flatPolygon.positions)
        : [];
      var translatedPositions = [];
      var k;
      for (k = 0; k < positions.length; ++k) {
        var p = Cartesian3.clone(positions[k]);
        Matrix4.multiplyByPoint(worldToENU, p, p);
        translatedPositions.push(p);
      }

      var posWinding = PolygonPipeline.computeWindingOrder2D(
        translatedPositions
      );
      if (posWinding === WindingOrder.CLOCKWISE) {
        translatedPositions.reverse();
      }

      if (simplify > 0) {
        translatedPositions = simplify3d(translatedPositions, simplify);
      }

      if (flatPolygon.isHole) {
        holeIndices.push(transformedPositions.length);
      }

      transformedPositions = transformedPositions.concat(translatedPositions);
    }

    positionsAndIndicesForEarcut.push({
      positions: transformedPositions,
      holeIndices: holeIndices,
    });
  }

  var triangulatedMeshes = [];

  for (i = 0; i < positionsAndIndicesForEarcut.length; ++i) {
    positions = positionsAndIndicesForEarcut[i].positions;
    holeIndices = positionsAndIndicesForEarcut[i].holeIndices;

    var flatPositions = Cartesian3.packArray(positions);
    triangulatedMeshes.push({
      positions: flatPositions,
      indices: earcut(flatPositions, holeIndices, 3),
    });
  }

  return triangulatedMeshes;
}

/**
 * @param polygonHierarchies Array<PolygonHierarchy> An array of ECEF positions
 * @returns Matrix4 a worldToENU matrix
 *
 * @private
 */

function generateWorldToENUMatrixFromPolygonHierarchies(polygonHierarchies) {
  var i;
  var allPoints = [];
  for (i = 0; i < polygonHierarchies.length; ++i) {
    var positions = polygonHierarchies[i].positions;
    allPoints = allPoints.concat(positions);
  }

  var boundingSphere = BoundingSphere.fromPoints(allPoints);
  var cartographic = Cartographic.fromCartesian(boundingSphere.center);
  var origin = Cartographic.toCartesian(cartographic);
  var enu = Transforms.eastNorthUpToFixedFrame(origin);

  return Matrix4.inverse(enu, new Matrix4());
}

export default ClippingPolygon;
