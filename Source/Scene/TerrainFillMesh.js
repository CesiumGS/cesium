import AttributeCompression from "../Core/AttributeCompression.js";
import binarySearch from "../Core/binarySearch.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import HeightmapTerrainData from "../Core/HeightmapTerrainData.js";
import CesiumMath from "../Core/Math.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Queue from "../Core/Queue.js";
import Rectangle from "../Core/Rectangle.js";
import TerrainEncoding from "../Core/TerrainEncoding.js";
import TerrainMesh from "../Core/TerrainMesh.js";
import TileEdge from "../Core/TileEdge.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import GlobeSurfaceTile from "./GlobeSurfaceTile.js";
import TileSelectionResult from "./TileSelectionResult.js";

function TerrainFillMesh(tile) {
  this.tile = tile;
  this.frameLastUpdated = undefined;
  this.westMeshes = []; // north to south (CCW)
  this.westTiles = [];
  this.southMeshes = []; // west to east (CCW)
  this.southTiles = [];
  this.eastMeshes = []; // south to north (CCW)
  this.eastTiles = [];
  this.northMeshes = []; // east to west (CCW)
  this.northTiles = [];
  this.southwestMesh = undefined;
  this.southwestTile = undefined;
  this.southeastMesh = undefined;
  this.southeastTile = undefined;
  this.northwestMesh = undefined;
  this.northwestTile = undefined;
  this.northeastMesh = undefined;
  this.northeastTile = undefined;
  this.changedThisFrame = true;
  this.visitedFrame = undefined;
  this.enqueuedFrame = undefined;
  this.mesh = undefined;
  this.vertexArray = undefined;
  this.waterMaskTexture = undefined;
  this.waterMaskTranslationAndScale = new Cartesian4();
}

TerrainFillMesh.prototype.update = function (
  tileProvider,
  frameState,
  vertexArraysToDestroy
) {
  if (this.changedThisFrame) {
    createFillMesh(tileProvider, frameState, this.tile, vertexArraysToDestroy);
    this.changedThisFrame = false;
  }
};

TerrainFillMesh.prototype.destroy = function (vertexArraysToDestroy) {
  this._destroyVertexArray(vertexArraysToDestroy);

  if (defined(this.waterMaskTexture)) {
    --this.waterMaskTexture.referenceCount;
    if (this.waterMaskTexture.referenceCount === 0) {
      this.waterMaskTexture.destroy();
    }
    this.waterMaskTexture = undefined;
  }

  return undefined;
};

TerrainFillMesh.prototype._destroyVertexArray = function (
  vertexArraysToDestroy
) {
  if (defined(this.vertexArray)) {
    if (defined(vertexArraysToDestroy)) {
      vertexArraysToDestroy.push(this.vertexArray);
    } else {
      GlobeSurfaceTile._freeVertexArray(this.vertexArray);
    }
    this.vertexArray = undefined;
  }
};

const traversalQueueScratch = new Queue();

TerrainFillMesh.updateFillTiles = function (
  tileProvider,
  renderedTiles,
  frameState,
  vertexArraysToDestroy
) {
  // We want our fill tiles to look natural, which means they should align perfectly with
  // adjacent loaded tiles, and their edges that are not adjacent to loaded tiles should have
  // sensible heights (e.g. the average of the heights of loaded edges). Some fill tiles may
  // be adjacent only to other fill tiles, and in that case heights should be assigned fanning
  // outward from the loaded tiles so that there are no sudden changes in height.

  // We do this with a breadth-first traversal of the rendered tiles, starting with the loaded
  // ones. Graph nodes are tiles and graph edges connect to other rendered tiles that are spatially adjacent
  // to those tiles. As we visit each node, we propagate tile edges to adjacent tiles. If there's no data
  // for a tile edge,  we create an edge with an average height and then propagate it. If an edge is partially defined
  // (e.g. an edge is adjacent to multiple more-detailed tiles and only some of them are loaded), we
  // fill in the rest of the edge with the same height.
  const quadtree = tileProvider._quadtree;
  const levelZeroTiles = quadtree._levelZeroTiles;
  const lastSelectionFrameNumber = quadtree._lastSelectionFrameNumber;

  const traversalQueue = traversalQueueScratch;
  traversalQueue.clear();

  // Add the tiles with real geometry to the traversal queue.
  for (let i = 0; i < renderedTiles.length; ++i) {
    const renderedTile = renderedTiles[i];
    if (defined(renderedTile.data.vertexArray)) {
      traversalQueue.enqueue(renderedTiles[i]);
    }
  }

  let tile = traversalQueue.dequeue();

  while (tile !== undefined) {
    const tileToWest = tile.findTileToWest(levelZeroTiles);
    const tileToSouth = tile.findTileToSouth(levelZeroTiles);
    const tileToEast = tile.findTileToEast(levelZeroTiles);
    const tileToNorth = tile.findTileToNorth(levelZeroTiles);
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToWest,
      lastSelectionFrameNumber,
      TileEdge.EAST,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToSouth,
      lastSelectionFrameNumber,
      TileEdge.NORTH,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToEast,
      lastSelectionFrameNumber,
      TileEdge.WEST,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToNorth,
      lastSelectionFrameNumber,
      TileEdge.SOUTH,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );

    const tileToNorthwest = tileToWest.findTileToNorth(levelZeroTiles);
    const tileToSouthwest = tileToWest.findTileToSouth(levelZeroTiles);
    const tileToNortheast = tileToEast.findTileToNorth(levelZeroTiles);
    const tileToSoutheast = tileToEast.findTileToSouth(levelZeroTiles);
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToNorthwest,
      lastSelectionFrameNumber,
      TileEdge.SOUTHEAST,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToNortheast,
      lastSelectionFrameNumber,
      TileEdge.SOUTHWEST,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToSouthwest,
      lastSelectionFrameNumber,
      TileEdge.NORTHEAST,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );
    visitRenderedTiles(
      tileProvider,
      frameState,
      tile,
      tileToSoutheast,
      lastSelectionFrameNumber,
      TileEdge.NORTHWEST,
      false,
      traversalQueue,
      vertexArraysToDestroy
    );

    tile = traversalQueue.dequeue();
  }
};

function visitRenderedTiles(
  tileProvider,
  frameState,
  sourceTile,
  startTile,
  currentFrameNumber,
  tileEdge,
  downOnly,
  traversalQueue,
  vertexArraysToDestroy
) {
  if (startTile === undefined) {
    // There are no tiles North or South of the poles.
    return;
  }

  let tile = startTile;
  while (
    tile &&
    (tile._lastSelectionResultFrame !== currentFrameNumber ||
      TileSelectionResult.wasKicked(tile._lastSelectionResult) ||
      TileSelectionResult.originalResult(tile._lastSelectionResult) ===
        TileSelectionResult.CULLED)
  ) {
    // This tile wasn't visited or it was visited and then kicked, so walk up to find the closest ancestor that was rendered.
    // We also walk up if the tile was culled, because if siblings were kicked an ancestor may have been rendered.
    if (downOnly) {
      return;
    }

    const parent = tile.parent;
    if (tileEdge >= TileEdge.NORTHWEST && parent !== undefined) {
      // When we're looking for a corner, verify that the parent tile is still relevant.
      // That is, the parent and child must share the corner in question.
      switch (tileEdge) {
        case TileEdge.NORTHWEST:
          tile = tile === parent.northwestChild ? parent : undefined;
          break;
        case TileEdge.NORTHEAST:
          tile = tile === parent.northeastChild ? parent : undefined;
          break;
        case TileEdge.SOUTHWEST:
          tile = tile === parent.southwestChild ? parent : undefined;
          break;
        case TileEdge.SOUTHEAST:
          tile = tile === parent.southeastChild ? parent : undefined;
          break;
      }
    } else {
      tile = parent;
    }
  }

  if (tile === undefined) {
    return;
  }

  if (tile._lastSelectionResult === TileSelectionResult.RENDERED) {
    if (defined(tile.data.vertexArray)) {
      // No further processing necessary for renderable tiles.
      return;
    }
    visitTile(
      tileProvider,
      frameState,
      sourceTile,
      tile,
      tileEdge,
      currentFrameNumber,
      traversalQueue,
      vertexArraysToDestroy
    );
    return;
  }

  if (
    TileSelectionResult.originalResult(startTile._lastSelectionResult) ===
    TileSelectionResult.CULLED
  ) {
    return;
  }

  // This tile was refined, so find rendered children, if any.
  // Visit the tiles in counter-clockwise order.
  switch (tileEdge) {
    case TileEdge.WEST:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.northwestChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.southwestChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.EAST:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.southeastChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.northeastChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.SOUTH:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.southwestChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.southeastChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.NORTH:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.northeastChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.northwestChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.NORTHWEST:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.northwestChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.NORTHEAST:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.northeastChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.SOUTHWEST:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.southwestChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    case TileEdge.SOUTHEAST:
      visitRenderedTiles(
        tileProvider,
        frameState,
        sourceTile,
        startTile.southeastChild,
        currentFrameNumber,
        tileEdge,
        true,
        traversalQueue,
        vertexArraysToDestroy
      );
      break;
    default:
      throw new DeveloperError("Invalid edge");
  }
}

function visitTile(
  tileProvider,
  frameState,
  sourceTile,
  destinationTile,
  tileEdge,
  frameNumber,
  traversalQueue,
  vertexArraysToDestroy
) {
  const destinationSurfaceTile = destinationTile.data;

  if (destinationSurfaceTile.fill === undefined) {
    destinationSurfaceTile.fill = new TerrainFillMesh(destinationTile);
  } else if (destinationSurfaceTile.fill.visitedFrame === frameNumber) {
    // Don't propagate edges to tiles that have already been visited this frame.
    return;
  }

  if (destinationSurfaceTile.fill.enqueuedFrame !== frameNumber) {
    // First time visiting this tile this frame, add it to the traversal queue.
    destinationSurfaceTile.fill.enqueuedFrame = frameNumber;
    destinationSurfaceTile.fill.changedThisFrame = false;
    traversalQueue.enqueue(destinationTile);
  }

  propagateEdge(
    tileProvider,
    frameState,
    sourceTile,
    destinationTile,
    tileEdge,
    vertexArraysToDestroy
  );
}

function propagateEdge(
  tileProvider,
  frameState,
  sourceTile,
  destinationTile,
  tileEdge,
  vertexArraysToDestroy
) {
  const destinationFill = destinationTile.data.fill;

  let sourceMesh;
  const sourceFill = sourceTile.data.fill;
  if (defined(sourceFill)) {
    sourceFill.visitedFrame = frameState.frameNumber;

    // Source is a fill, create/update it if necessary.
    if (sourceFill.changedThisFrame) {
      createFillMesh(
        tileProvider,
        frameState,
        sourceTile,
        vertexArraysToDestroy
      );
      sourceFill.changedThisFrame = false;
    }
    sourceMesh = sourceTile.data.fill.mesh;
  } else {
    sourceMesh = sourceTile.data.mesh;
  }

  let edgeMeshes;
  let edgeTiles;

  switch (tileEdge) {
    case TileEdge.WEST:
      edgeMeshes = destinationFill.westMeshes;
      edgeTiles = destinationFill.westTiles;
      break;
    case TileEdge.SOUTH:
      edgeMeshes = destinationFill.southMeshes;
      edgeTiles = destinationFill.southTiles;
      break;
    case TileEdge.EAST:
      edgeMeshes = destinationFill.eastMeshes;
      edgeTiles = destinationFill.eastTiles;
      break;
    case TileEdge.NORTH:
      edgeMeshes = destinationFill.northMeshes;
      edgeTiles = destinationFill.northTiles;
      break;
    // Corners are simpler.
    case TileEdge.NORTHWEST:
      destinationFill.changedThisFrame =
        destinationFill.changedThisFrame ||
        destinationFill.northwestMesh !== sourceMesh;
      destinationFill.northwestMesh = sourceMesh;
      destinationFill.northwestTile = sourceTile;
      return;
    case TileEdge.NORTHEAST:
      destinationFill.changedThisFrame =
        destinationFill.changedThisFrame ||
        destinationFill.northeastMesh !== sourceMesh;
      destinationFill.northeastMesh = sourceMesh;
      destinationFill.northeastTile = sourceTile;
      return;
    case TileEdge.SOUTHWEST:
      destinationFill.changedThisFrame =
        destinationFill.changedThisFrame ||
        destinationFill.southwestMesh !== sourceMesh;
      destinationFill.southwestMesh = sourceMesh;
      destinationFill.southwestTile = sourceTile;
      return;
    case TileEdge.SOUTHEAST:
      destinationFill.changedThisFrame =
        destinationFill.changedThisFrame ||
        destinationFill.southeastMesh !== sourceMesh;
      destinationFill.southeastMesh = sourceMesh;
      destinationFill.southeastTile = sourceTile;
      return;
  }

  if (sourceTile.level <= destinationTile.level) {
    // Source edge completely spans the destination edge.
    destinationFill.changedThisFrame =
      destinationFill.changedThisFrame ||
      edgeMeshes[0] !== sourceMesh ||
      edgeMeshes.length !== 1;
    edgeMeshes[0] = sourceMesh;
    edgeTiles[0] = sourceTile;
    edgeMeshes.length = 1;
    edgeTiles.length = 1;
    return;
  }

  // Source edge is a subset of the destination edge.
  // Figure out the range of meshes we're replacing.
  let startIndex, endIndex, existingTile, existingRectangle;
  const sourceRectangle = sourceTile.rectangle;

  let epsilon;
  const destinationRectangle = destinationTile.rectangle;

  switch (tileEdge) {
    case TileEdge.WEST:
      epsilon =
        (destinationRectangle.north - destinationRectangle.south) *
        CesiumMath.EPSILON5;

      for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
        existingTile = edgeTiles[startIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.greaterThan(
            sourceRectangle.north,
            existingRectangle.south,
            epsilon
          )
        ) {
          break;
        }
      }
      for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
        existingTile = edgeTiles[endIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.greaterThanOrEquals(
            sourceRectangle.south,
            existingRectangle.north,
            epsilon
          )
        ) {
          break;
        }
      }
      break;
    case TileEdge.SOUTH:
      epsilon =
        (destinationRectangle.east - destinationRectangle.west) *
        CesiumMath.EPSILON5;

      for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
        existingTile = edgeTiles[startIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.lessThan(
            sourceRectangle.west,
            existingRectangle.east,
            epsilon
          )
        ) {
          break;
        }
      }
      for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
        existingTile = edgeTiles[endIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.lessThanOrEquals(
            sourceRectangle.east,
            existingRectangle.west,
            epsilon
          )
        ) {
          break;
        }
      }
      break;
    case TileEdge.EAST:
      epsilon =
        (destinationRectangle.north - destinationRectangle.south) *
        CesiumMath.EPSILON5;

      for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
        existingTile = edgeTiles[startIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.lessThan(
            sourceRectangle.south,
            existingRectangle.north,
            epsilon
          )
        ) {
          break;
        }
      }
      for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
        existingTile = edgeTiles[endIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.lessThanOrEquals(
            sourceRectangle.north,
            existingRectangle.south,
            epsilon
          )
        ) {
          break;
        }
      }
      break;
    case TileEdge.NORTH:
      epsilon =
        (destinationRectangle.east - destinationRectangle.west) *
        CesiumMath.EPSILON5;

      for (startIndex = 0; startIndex < edgeTiles.length; ++startIndex) {
        existingTile = edgeTiles[startIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.greaterThan(
            sourceRectangle.east,
            existingRectangle.west,
            epsilon
          )
        ) {
          break;
        }
      }
      for (endIndex = startIndex; endIndex < edgeTiles.length; ++endIndex) {
        existingTile = edgeTiles[endIndex];
        existingRectangle = existingTile.rectangle;
        if (
          CesiumMath.greaterThanOrEquals(
            sourceRectangle.west,
            existingRectangle.east,
            epsilon
          )
        ) {
          break;
        }
      }
      break;
  }

  if (endIndex - startIndex === 1) {
    destinationFill.changedThisFrame =
      destinationFill.changedThisFrame || edgeMeshes[startIndex] !== sourceMesh;
    edgeMeshes[startIndex] = sourceMesh;
    edgeTiles[startIndex] = sourceTile;
  } else {
    destinationFill.changedThisFrame = true;
    edgeMeshes.splice(startIndex, endIndex - startIndex, sourceMesh);
    edgeTiles.splice(startIndex, endIndex - startIndex, sourceTile);
  }
}

const cartographicScratch = new Cartographic();
const centerCartographicScratch = new Cartographic();
const cartesianScratch = new Cartesian3();
const normalScratch = new Cartesian3();
const octEncodedNormalScratch = new Cartesian2();
const uvScratch2 = new Cartesian2();
const uvScratch = new Cartesian2();

function HeightAndNormal() {
  this.height = 0.0;
  this.encodedNormal = new Cartesian2();
}

function fillMissingCorner(
  fill,
  ellipsoid,
  u,
  v,
  corner,
  adjacentCorner1,
  adjacentCorner2,
  oppositeCorner,
  vertex
) {
  if (defined(corner)) {
    return corner;
  }

  let height;

  if (defined(adjacentCorner1) && defined(adjacentCorner2)) {
    height = (adjacentCorner1.height + adjacentCorner2.height) * 0.5;
  } else if (defined(adjacentCorner1)) {
    height = adjacentCorner1.height;
  } else if (defined(adjacentCorner2)) {
    height = adjacentCorner2.height;
  } else if (defined(oppositeCorner)) {
    height = oppositeCorner.height;
  } else {
    const surfaceTile = fill.tile.data;
    const tileBoundingRegion = surfaceTile.tileBoundingRegion;
    let minimumHeight = 0.0;
    let maximumHeight = 0.0;
    if (defined(tileBoundingRegion)) {
      minimumHeight = tileBoundingRegion.minimumHeight;
      maximumHeight = tileBoundingRegion.maximumHeight;
    }
    height = (minimumHeight + maximumHeight) * 0.5;
  }

  getVertexWithHeightAtCorner(fill, ellipsoid, u, v, height, vertex);
  return vertex;
}

const heightRangeScratch = {
  minimumHeight: 0.0,
  maximumHeight: 0.0,
};

const scratchCenter = new Cartesian3();
const swVertexScratch = new HeightAndNormal();
const seVertexScratch = new HeightAndNormal();
const nwVertexScratch = new HeightAndNormal();
const neVertexScratch = new HeightAndNormal();
const heightmapBuffer =
  typeof Uint8Array !== "undefined" ? new Uint8Array(9 * 9) : undefined;

const scratchCreateMeshSyncOptions = {
  tilingScheme: undefined,
  x: 0,
  y: 0,
  level: 0,
  exaggeration: 1.0,
  exaggerationRelativeHeight: 0.0,
};
function createFillMesh(tileProvider, frameState, tile, vertexArraysToDestroy) {
  GlobeSurfaceTile.initialize(
    tile,
    tileProvider.terrainProvider,
    tileProvider._imageryLayers
  );

  const surfaceTile = tile.data;
  const fill = surfaceTile.fill;
  const rectangle = tile.rectangle;

  const exaggeration = frameState.terrainExaggeration;
  const exaggerationRelativeHeight =
    frameState.terrainExaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1.0;

  const ellipsoid = tile.tilingScheme.ellipsoid;

  let nwCorner = getCorner(
    fill,
    ellipsoid,
    0.0,
    1.0,
    fill.northwestTile,
    fill.northwestMesh,
    fill.northTiles,
    fill.northMeshes,
    fill.westTiles,
    fill.westMeshes,
    nwVertexScratch
  );
  let swCorner = getCorner(
    fill,
    ellipsoid,
    0.0,
    0.0,
    fill.southwestTile,
    fill.southwestMesh,
    fill.westTiles,
    fill.westMeshes,
    fill.southTiles,
    fill.southMeshes,
    swVertexScratch
  );
  let seCorner = getCorner(
    fill,
    ellipsoid,
    1.0,
    0.0,
    fill.southeastTile,
    fill.southeastMesh,
    fill.southTiles,
    fill.southMeshes,
    fill.eastTiles,
    fill.eastMeshes,
    seVertexScratch
  );
  let neCorner = getCorner(
    fill,
    ellipsoid,
    1.0,
    1.0,
    fill.northeastTile,
    fill.northeastMesh,
    fill.eastTiles,
    fill.eastMeshes,
    fill.northTiles,
    fill.northMeshes,
    neVertexScratch
  );

  nwCorner = fillMissingCorner(
    fill,
    ellipsoid,
    0.0,
    1.0,
    nwCorner,
    swCorner,
    neCorner,
    seCorner,
    nwVertexScratch
  );
  swCorner = fillMissingCorner(
    fill,
    ellipsoid,
    0.0,
    0.0,
    swCorner,
    nwCorner,
    seCorner,
    neCorner,
    swVertexScratch
  );
  seCorner = fillMissingCorner(
    fill,
    ellipsoid,
    1.0,
    1.0,
    seCorner,
    swCorner,
    neCorner,
    nwCorner,
    seVertexScratch
  );
  neCorner = fillMissingCorner(
    fill,
    ellipsoid,
    1.0,
    1.0,
    neCorner,
    seCorner,
    nwCorner,
    swCorner,
    neVertexScratch
  );

  const southwestHeight = swCorner.height;
  const southeastHeight = seCorner.height;
  const northwestHeight = nwCorner.height;
  const northeastHeight = neCorner.height;

  let minimumHeight = Math.min(
    southwestHeight,
    southeastHeight,
    northwestHeight,
    northeastHeight
  );
  let maximumHeight = Math.max(
    southwestHeight,
    southeastHeight,
    northwestHeight,
    northeastHeight
  );

  const middleHeight = (minimumHeight + maximumHeight) * 0.5;

  let i;
  let len;

  // For low-detail tiles, our usual fill tile approach will create tiles that
  // look really blocky because they don't have enough vertices to account for the
  // Earth's curvature. But the height range will also typically be well within
  // the allowed geometric error for those levels. So fill such tiles with a
  // constant-height heightmap.
  const geometricError = tileProvider.getLevelMaximumGeometricError(tile.level);
  const minCutThroughRadius = ellipsoid.maximumRadius - geometricError;
  let maxTileWidth =
    Math.acos(minCutThroughRadius / ellipsoid.maximumRadius) * 4.0;

  // When the tile width is greater than maxTileWidth as computed above, the error
  // of a normal fill tile from globe curvature alone will exceed the allowed geometric
  // error. Terrain won't change that much. However, we can allow more error than that.
  // A little blockiness during load is acceptable. For the WGS84 ellipsoid and
  // standard geometric error setup, the value here will have us use a heightmap
  // at levels 1, 2, and 3.
  maxTileWidth *= 1.5;

  if (
    rectangle.width > maxTileWidth &&
    maximumHeight - minimumHeight <= geometricError
  ) {
    const terrainData = new HeightmapTerrainData({
      width: 9,
      height: 9,
      buffer: heightmapBuffer,
      structure: {
        // Use the maximum as the constant height so that this tile's skirt
        // covers any cracks with adjacent tiles.
        heightOffset: maximumHeight,
      },
    });

    const createMeshSyncOptions = scratchCreateMeshSyncOptions;
    createMeshSyncOptions.tilingScheme = tile.tilingScheme;
    createMeshSyncOptions.x = tile.x;
    createMeshSyncOptions.y = tile.y;
    createMeshSyncOptions.level = tile.level;
    createMeshSyncOptions.exaggeration = exaggeration;
    createMeshSyncOptions.exaggerationRelativeHeight = exaggerationRelativeHeight;

    fill.mesh = terrainData._createMeshSync(createMeshSyncOptions);
  } else {
    const hasGeodeticSurfaceNormals = hasExaggeration;
    const centerCartographic = Rectangle.center(
      rectangle,
      centerCartographicScratch
    );
    centerCartographic.height = middleHeight;
    const center = ellipsoid.cartographicToCartesian(
      centerCartographic,
      scratchCenter
    );
    const encoding = new TerrainEncoding(
      center,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      true,
      hasGeodeticSurfaceNormals,
      exaggeration,
      exaggerationRelativeHeight
    );

    // At _most_, we have vertices for the 4 corners, plus 1 center, plus every adjacent edge vertex.
    // In reality there will be less most of the time, but close enough; better
    // to overestimate than to re-allocate/copy/traverse the vertices twice.
    // Also, we'll often be able to squeeze the index data into the extra space in the buffer.
    let maxVertexCount = 5;
    let meshes;

    meshes = fill.westMeshes;
    for (i = 0, len = meshes.length; i < len; ++i) {
      maxVertexCount += meshes[i].eastIndicesNorthToSouth.length;
    }

    meshes = fill.southMeshes;
    for (i = 0, len = meshes.length; i < len; ++i) {
      maxVertexCount += meshes[i].northIndicesWestToEast.length;
    }

    meshes = fill.eastMeshes;
    for (i = 0, len = meshes.length; i < len; ++i) {
      maxVertexCount += meshes[i].westIndicesSouthToNorth.length;
    }

    meshes = fill.northMeshes;
    for (i = 0, len = meshes.length; i < len; ++i) {
      maxVertexCount += meshes[i].southIndicesEastToWest.length;
    }

    const heightRange = heightRangeScratch;
    heightRange.minimumHeight = minimumHeight;
    heightRange.maximumHeight = maximumHeight;

    const stride = encoding.stride;
    let typedArray = new Float32Array(maxVertexCount * stride);

    let nextIndex = 0;
    const northwestIndex = nextIndex;
    nextIndex = addVertexWithComputedPosition(
      ellipsoid,
      rectangle,
      encoding,
      typedArray,
      nextIndex,
      0.0,
      1.0,
      nwCorner.height,
      nwCorner.encodedNormal,
      1.0,
      heightRange
    );
    nextIndex = addEdge(
      fill,
      ellipsoid,
      encoding,
      typedArray,
      nextIndex,
      fill.westTiles,
      fill.westMeshes,
      TileEdge.EAST,
      heightRange
    );
    const southwestIndex = nextIndex;
    nextIndex = addVertexWithComputedPosition(
      ellipsoid,
      rectangle,
      encoding,
      typedArray,
      nextIndex,
      0.0,
      0.0,
      swCorner.height,
      swCorner.encodedNormal,
      0.0,
      heightRange
    );
    nextIndex = addEdge(
      fill,
      ellipsoid,
      encoding,
      typedArray,
      nextIndex,
      fill.southTiles,
      fill.southMeshes,
      TileEdge.NORTH,
      heightRange
    );
    const southeastIndex = nextIndex;
    nextIndex = addVertexWithComputedPosition(
      ellipsoid,
      rectangle,
      encoding,
      typedArray,
      nextIndex,
      1.0,
      0.0,
      seCorner.height,
      seCorner.encodedNormal,
      0.0,
      heightRange
    );
    nextIndex = addEdge(
      fill,
      ellipsoid,
      encoding,
      typedArray,
      nextIndex,
      fill.eastTiles,
      fill.eastMeshes,
      TileEdge.WEST,
      heightRange
    );
    const northeastIndex = nextIndex;
    nextIndex = addVertexWithComputedPosition(
      ellipsoid,
      rectangle,
      encoding,
      typedArray,
      nextIndex,
      1.0,
      1.0,
      neCorner.height,
      neCorner.encodedNormal,
      1.0,
      heightRange
    );
    nextIndex = addEdge(
      fill,
      ellipsoid,
      encoding,
      typedArray,
      nextIndex,
      fill.northTiles,
      fill.northMeshes,
      TileEdge.SOUTH,
      heightRange
    );

    minimumHeight = heightRange.minimumHeight;
    maximumHeight = heightRange.maximumHeight;

    const obb = OrientedBoundingBox.fromRectangle(
      rectangle,
      minimumHeight,
      maximumHeight,
      tile.tilingScheme.ellipsoid
    );

    // Add a single vertex at the center of the tile.
    const southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      rectangle.south
    );
    const oneOverMercatorHeight =
      1.0 /
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(rectangle.north) -
        southMercatorY);
    const centerWebMercatorT =
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(
        centerCartographic.latitude
      ) -
        southMercatorY) *
      oneOverMercatorHeight;

    const geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormalCartographic(
      cartographicScratch,
      normalScratch
    );
    const centerEncodedNormal = AttributeCompression.octEncode(
      geodeticSurfaceNormal,
      octEncodedNormalScratch
    );

    const centerIndex = nextIndex;
    encoding.encode(
      typedArray,
      nextIndex * stride,
      obb.center,
      Cartesian2.fromElements(0.5, 0.5, uvScratch),
      middleHeight,
      centerEncodedNormal,
      centerWebMercatorT,
      geodeticSurfaceNormal
    );
    ++nextIndex;

    const vertexCount = nextIndex;

    const bytesPerIndex = vertexCount < 256 ? 1 : 2;
    const indexCount = (vertexCount - 1) * 3; // one triangle per edge vertex
    const indexDataBytes = indexCount * bytesPerIndex;
    const availableBytesInBuffer =
      (typedArray.length - vertexCount * stride) *
      Float32Array.BYTES_PER_ELEMENT;

    let indices;
    if (availableBytesInBuffer >= indexDataBytes) {
      // Store the index data in the same buffer as the vertex data.
      const startIndex = vertexCount * stride * Float32Array.BYTES_PER_ELEMENT;
      indices =
        vertexCount < 256
          ? new Uint8Array(typedArray.buffer, startIndex, indexCount)
          : new Uint16Array(typedArray.buffer, startIndex, indexCount);
    } else {
      // Allocate a new buffer for the index data.
      indices =
        vertexCount < 256
          ? new Uint8Array(indexCount)
          : new Uint16Array(indexCount);
    }

    typedArray = new Float32Array(typedArray.buffer, 0, vertexCount * stride);

    let indexOut = 0;
    for (i = 0; i < vertexCount - 2; ++i) {
      indices[indexOut++] = centerIndex;
      indices[indexOut++] = i;
      indices[indexOut++] = i + 1;
    }

    indices[indexOut++] = centerIndex;
    indices[indexOut++] = i;
    indices[indexOut++] = 0;

    const westIndicesSouthToNorth = [];
    for (i = southwestIndex; i >= northwestIndex; --i) {
      westIndicesSouthToNorth.push(i);
    }

    const southIndicesEastToWest = [];
    for (i = southeastIndex; i >= southwestIndex; --i) {
      southIndicesEastToWest.push(i);
    }

    const eastIndicesNorthToSouth = [];
    for (i = northeastIndex; i >= southeastIndex; --i) {
      eastIndicesNorthToSouth.push(i);
    }

    const northIndicesWestToEast = [];
    northIndicesWestToEast.push(0);
    for (i = centerIndex - 1; i >= northeastIndex; --i) {
      northIndicesWestToEast.push(i);
    }

    fill.mesh = new TerrainMesh(
      encoding.center,
      typedArray,
      indices,
      indexCount,
      vertexCount,
      minimumHeight,
      maximumHeight,
      BoundingSphere.fromOrientedBoundingBox(obb),
      computeOccludeePoint(
        tileProvider,
        obb.center,
        rectangle,
        minimumHeight,
        maximumHeight
      ),
      encoding.stride,
      obb,
      encoding,
      westIndicesSouthToNorth,
      southIndicesEastToWest,
      eastIndicesNorthToSouth,
      northIndicesWestToEast
    );
  }

  const context = frameState.context;

  fill._destroyVertexArray(vertexArraysToDestroy);

  fill.vertexArray = GlobeSurfaceTile._createVertexArrayForMesh(
    context,
    fill.mesh
  );
  surfaceTile.processImagery(
    tile,
    tileProvider.terrainProvider,
    frameState,
    true
  );

  const oldTexture = fill.waterMaskTexture;
  fill.waterMaskTexture = undefined;

  if (tileProvider.terrainProvider.hasWaterMask) {
    const waterSourceTile = surfaceTile._findAncestorTileWithTerrainData(tile);
    if (
      defined(waterSourceTile) &&
      defined(waterSourceTile.data.waterMaskTexture)
    ) {
      fill.waterMaskTexture = waterSourceTile.data.waterMaskTexture;
      ++fill.waterMaskTexture.referenceCount;
      surfaceTile._computeWaterMaskTranslationAndScale(
        tile,
        waterSourceTile,
        fill.waterMaskTranslationAndScale
      );
    }
  }

  if (defined(oldTexture)) {
    --oldTexture.referenceCount;
    if (oldTexture.referenceCount === 0) {
      oldTexture.destroy();
    }
  }
}

function addVertexWithComputedPosition(
  ellipsoid,
  rectangle,
  encoding,
  buffer,
  index,
  u,
  v,
  height,
  encodedNormal,
  webMercatorT,
  heightRange
) {
  const cartographic = cartographicScratch;
  cartographic.longitude = CesiumMath.lerp(rectangle.west, rectangle.east, u);
  cartographic.latitude = CesiumMath.lerp(rectangle.south, rectangle.north, v);
  cartographic.height = height;
  const position = ellipsoid.cartographicToCartesian(
    cartographic,
    cartesianScratch
  );

  let geodeticSurfaceNormal;
  if (encoding.hasGeodeticSurfaceNormals) {
    geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
      position,
      normalScratch
    );
  }

  const uv = uvScratch2;
  uv.x = u;
  uv.y = v;

  encoding.encode(
    buffer,
    index * encoding.stride,
    position,
    uv,
    height,
    encodedNormal,
    webMercatorT,
    geodeticSurfaceNormal
  );

  heightRange.minimumHeight = Math.min(heightRange.minimumHeight, height);
  heightRange.maximumHeight = Math.max(heightRange.maximumHeight, height);

  return index + 1;
}

const sourceRectangleScratch = new Rectangle();

function transformTextureCoordinates(
  sourceTile,
  targetTile,
  coordinates,
  result
) {
  let sourceRectangle = sourceTile.rectangle;
  const targetRectangle = targetTile.rectangle;

  // Handle transforming across the anti-meridian.
  if (
    targetTile.x === 0 &&
    coordinates.x === 1.0 &&
    sourceTile.x ===
      sourceTile.tilingScheme.getNumberOfXTilesAtLevel(sourceTile.level) - 1
  ) {
    sourceRectangle = Rectangle.clone(
      sourceTile.rectangle,
      sourceRectangleScratch
    );
    sourceRectangle.west -= CesiumMath.TWO_PI;
    sourceRectangle.east -= CesiumMath.TWO_PI;
  } else if (
    sourceTile.x === 0 &&
    coordinates.x === 0.0 &&
    targetTile.x ===
      targetTile.tilingScheme.getNumberOfXTilesAtLevel(targetTile.level) - 1
  ) {
    sourceRectangle = Rectangle.clone(
      sourceTile.rectangle,
      sourceRectangleScratch
    );
    sourceRectangle.west += CesiumMath.TWO_PI;
    sourceRectangle.east += CesiumMath.TWO_PI;
  }

  const sourceWidth = sourceRectangle.east - sourceRectangle.west;
  const umin = (targetRectangle.west - sourceRectangle.west) / sourceWidth;
  const umax = (targetRectangle.east - sourceRectangle.west) / sourceWidth;

  const sourceHeight = sourceRectangle.north - sourceRectangle.south;
  const vmin = (targetRectangle.south - sourceRectangle.south) / sourceHeight;
  const vmax = (targetRectangle.north - sourceRectangle.south) / sourceHeight;

  let u = (coordinates.x - umin) / (umax - umin);
  let v = (coordinates.y - vmin) / (vmax - vmin);

  // Ensure that coordinates very near the corners are at the corners.
  if (Math.abs(u) < Math.EPSILON5) {
    u = 0.0;
  } else if (Math.abs(u - 1.0) < Math.EPSILON5) {
    u = 1.0;
  }

  if (Math.abs(v) < Math.EPSILON5) {
    v = 0.0;
  } else if (Math.abs(v - 1.0) < Math.EPSILON5) {
    v = 1.0;
  }

  result.x = u;
  result.y = v;
  return result;
}

const encodedNormalScratch = new Cartesian2();

function getVertexFromTileAtCorner(sourceMesh, sourceIndex, u, v, vertex) {
  const sourceEncoding = sourceMesh.encoding;
  const sourceVertices = sourceMesh.vertices;

  vertex.height = sourceEncoding.decodeHeight(sourceVertices, sourceIndex);

  if (sourceEncoding.hasVertexNormals) {
    sourceEncoding.getOctEncodedNormal(
      sourceVertices,
      sourceIndex,
      vertex.encodedNormal
    );
  } else {
    const normal = vertex.encodedNormal;
    normal.x = 0.0;
    normal.y = 0.0;
  }
}

const encodedNormalScratch2 = new Cartesian2();
const cartesianScratch2 = new Cartesian3();

function getInterpolatedVertexAtCorner(
  ellipsoid,
  sourceTile,
  targetTile,
  sourceMesh,
  previousIndex,
  nextIndex,
  u,
  v,
  interpolateU,
  vertex
) {
  const sourceEncoding = sourceMesh.encoding;
  const sourceVertices = sourceMesh.vertices;

  const previousUv = transformTextureCoordinates(
    sourceTile,
    targetTile,
    sourceEncoding.decodeTextureCoordinates(
      sourceVertices,
      previousIndex,
      uvScratch
    ),
    uvScratch
  );
  const nextUv = transformTextureCoordinates(
    sourceTile,
    targetTile,
    sourceEncoding.decodeTextureCoordinates(
      sourceVertices,
      nextIndex,
      uvScratch2
    ),
    uvScratch2
  );

  let ratio;
  if (interpolateU) {
    ratio = (u - previousUv.x) / (nextUv.x - previousUv.x);
  } else {
    ratio = (v - previousUv.y) / (nextUv.y - previousUv.y);
  }

  const height1 = sourceEncoding.decodeHeight(sourceVertices, previousIndex);
  const height2 = sourceEncoding.decodeHeight(sourceVertices, nextIndex);

  const targetRectangle = targetTile.rectangle;
  cartographicScratch.longitude = CesiumMath.lerp(
    targetRectangle.west,
    targetRectangle.east,
    u
  );
  cartographicScratch.latitude = CesiumMath.lerp(
    targetRectangle.south,
    targetRectangle.north,
    v
  );
  vertex.height = cartographicScratch.height = CesiumMath.lerp(
    height1,
    height2,
    ratio
  );

  let normal;
  if (sourceEncoding.hasVertexNormals) {
    const encodedNormal1 = sourceEncoding.getOctEncodedNormal(
      sourceVertices,
      previousIndex,
      encodedNormalScratch
    );
    const encodedNormal2 = sourceEncoding.getOctEncodedNormal(
      sourceVertices,
      nextIndex,
      encodedNormalScratch2
    );
    const normal1 = AttributeCompression.octDecode(
      encodedNormal1.x,
      encodedNormal1.y,
      cartesianScratch
    );
    const normal2 = AttributeCompression.octDecode(
      encodedNormal2.x,
      encodedNormal2.y,
      cartesianScratch2
    );
    normal = Cartesian3.lerp(normal1, normal2, ratio, cartesianScratch);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, vertex.encodedNormal);
  } else {
    normal = ellipsoid.geodeticSurfaceNormalCartographic(
      cartographicScratch,
      cartesianScratch
    );
    AttributeCompression.octEncode(normal, vertex.encodedNormal);
  }
}

function getVertexWithHeightAtCorner(
  terrainFillMesh,
  ellipsoid,
  u,
  v,
  height,
  vertex
) {
  vertex.height = height;
  const normal = ellipsoid.geodeticSurfaceNormalCartographic(
    cartographicScratch,
    cartesianScratch
  );
  AttributeCompression.octEncode(normal, vertex.encodedNormal);
}

function getCorner(
  terrainFillMesh,
  ellipsoid,
  u,
  v,
  cornerTile,
  cornerMesh,
  previousEdgeTiles,
  previousEdgeMeshes,
  nextEdgeTiles,
  nextEdgeMeshes,
  vertex
) {
  const gotCorner =
    getCornerFromEdge(
      terrainFillMesh,
      ellipsoid,
      previousEdgeMeshes,
      previousEdgeTiles,
      false,
      u,
      v,
      vertex
    ) ||
    getCornerFromEdge(
      terrainFillMesh,
      ellipsoid,
      nextEdgeMeshes,
      nextEdgeTiles,
      true,
      u,
      v,
      vertex
    );
  if (gotCorner) {
    return vertex;
  }

  let vertexIndex;

  if (meshIsUsable(cornerTile, cornerMesh)) {
    // Corner mesh is valid, copy its corner vertex to this mesh.
    if (u === 0.0) {
      if (v === 0.0) {
        // southwest destination, northeast source
        vertexIndex = cornerMesh.eastIndicesNorthToSouth[0];
      } else {
        // northwest destination, southeast source
        vertexIndex = cornerMesh.southIndicesEastToWest[0];
      }
    } else if (v === 0.0) {
      // southeast destination, northwest source
      vertexIndex = cornerMesh.northIndicesWestToEast[0];
    } else {
      // northeast destination, southwest source
      vertexIndex = cornerMesh.westIndicesSouthToNorth[0];
    }
    getVertexFromTileAtCorner(cornerMesh, vertexIndex, u, v, vertex);
    return vertex;
  }

  // There is no precise vertex available from the corner or from either adjacent edge.
  // This is either because there are no tiles at all at the edges and corner, or
  // because the tiles at the edge are higher-level-number and don't extend all the way
  // to the corner.
  // Try to grab a height from the adjacent edges.
  let height;
  if (u === 0.0) {
    if (v === 0.0) {
      // southwest
      height = getClosestHeightToCorner(
        terrainFillMesh.westMeshes,
        terrainFillMesh.westTiles,
        TileEdge.EAST,
        terrainFillMesh.southMeshes,
        terrainFillMesh.southTiles,
        TileEdge.NORTH,
        u,
        v
      );
    } else {
      // northwest
      height = getClosestHeightToCorner(
        terrainFillMesh.northMeshes,
        terrainFillMesh.northTiles,
        TileEdge.SOUTH,
        terrainFillMesh.westMeshes,
        terrainFillMesh.westTiles,
        TileEdge.EAST,
        u,
        v
      );
    }
  } else if (v === 0.0) {
    // southeast
    height = getClosestHeightToCorner(
      terrainFillMesh.southMeshes,
      terrainFillMesh.southTiles,
      TileEdge.NORTH,
      terrainFillMesh.eastMeshes,
      terrainFillMesh.eastTiles,
      TileEdge.WEST,
      u,
      v
    );
  } else {
    // northeast
    height = getClosestHeightToCorner(
      terrainFillMesh.eastMeshes,
      terrainFillMesh.eastTiles,
      TileEdge.WEST,
      terrainFillMesh.northMeshes,
      terrainFillMesh.northTiles,
      TileEdge.SOUTH,
      u,
      v
    );
  }

  if (defined(height)) {
    getVertexWithHeightAtCorner(
      terrainFillMesh,
      ellipsoid,
      u,
      v,
      height,
      vertex
    );
    return vertex;
  }

  // No heights available that are closer than the adjacent corners.
  return undefined;
}

function getClosestHeightToCorner(
  previousMeshes,
  previousTiles,
  previousEdge,
  nextMeshes,
  nextTiles,
  nextEdge,
  u,
  v
) {
  const height1 = getNearestHeightOnEdge(
    previousMeshes,
    previousTiles,
    false,
    previousEdge,
    u,
    v
  );
  const height2 = getNearestHeightOnEdge(
    nextMeshes,
    nextTiles,
    true,
    nextEdge,
    u,
    v
  );
  if (defined(height1) && defined(height2)) {
    // It would be slightly better to do a weighted average of the two heights
    // based on their distance from the corner, but it shouldn't matter much in practice.
    return (height1 + height2) * 0.5;
  } else if (defined(height1)) {
    return height1;
  }
  return height2;
}

function addEdge(
  terrainFillMesh,
  ellipsoid,
  encoding,
  typedArray,
  nextIndex,
  edgeTiles,
  edgeMeshes,
  tileEdge,
  heightRange
) {
  for (let i = 0; i < edgeTiles.length; ++i) {
    nextIndex = addEdgeMesh(
      terrainFillMesh,
      ellipsoid,
      encoding,
      typedArray,
      nextIndex,
      edgeTiles[i],
      edgeMeshes[i],
      tileEdge,
      heightRange
    );
  }
  return nextIndex;
}

function addEdgeMesh(
  terrainFillMesh,
  ellipsoid,
  encoding,
  typedArray,
  nextIndex,
  edgeTile,
  edgeMesh,
  tileEdge,
  heightRange
) {
  // Handle copying edges across the anti-meridian.
  let sourceRectangle = edgeTile.rectangle;
  if (tileEdge === TileEdge.EAST && terrainFillMesh.tile.x === 0) {
    sourceRectangle = Rectangle.clone(
      edgeTile.rectangle,
      sourceRectangleScratch
    );
    sourceRectangle.west -= CesiumMath.TWO_PI;
    sourceRectangle.east -= CesiumMath.TWO_PI;
  } else if (tileEdge === TileEdge.WEST && edgeTile.x === 0) {
    sourceRectangle = Rectangle.clone(
      edgeTile.rectangle,
      sourceRectangleScratch
    );
    sourceRectangle.west += CesiumMath.TWO_PI;
    sourceRectangle.east += CesiumMath.TWO_PI;
  }

  const targetRectangle = terrainFillMesh.tile.rectangle;

  let lastU;
  let lastV;

  if (nextIndex > 0) {
    encoding.decodeTextureCoordinates(typedArray, nextIndex - 1, uvScratch);
    lastU = uvScratch.x;
    lastV = uvScratch.y;
  }

  let indices;
  let compareU;

  switch (tileEdge) {
    case TileEdge.WEST:
      indices = edgeMesh.westIndicesSouthToNorth;
      compareU = false;
      break;
    case TileEdge.NORTH:
      indices = edgeMesh.northIndicesWestToEast;
      compareU = true;
      break;
    case TileEdge.EAST:
      indices = edgeMesh.eastIndicesNorthToSouth;
      compareU = false;
      break;
    case TileEdge.SOUTH:
      indices = edgeMesh.southIndicesEastToWest;
      compareU = true;
      break;
  }

  const sourceTile = edgeTile;
  const targetTile = terrainFillMesh.tile;
  const sourceEncoding = edgeMesh.encoding;
  const sourceVertices = edgeMesh.vertices;
  const targetStride = encoding.stride;

  let southMercatorY;
  let oneOverMercatorHeight;
  if (sourceEncoding.hasWebMercatorT) {
    southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      targetRectangle.south
    );
    oneOverMercatorHeight =
      1.0 /
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(
        targetRectangle.north
      ) -
        southMercatorY);
  }

  for (let i = 0; i < indices.length; ++i) {
    const index = indices[i];

    const uv = sourceEncoding.decodeTextureCoordinates(
      sourceVertices,
      index,
      uvScratch
    );
    transformTextureCoordinates(sourceTile, targetTile, uv, uv);
    const u = uv.x;
    const v = uv.y;
    const uOrV = compareU ? u : v;

    if (uOrV < 0.0 || uOrV > 1.0) {
      // Vertex is outside the target tile - skip it.
      continue;
    }

    if (
      Math.abs(u - lastU) < CesiumMath.EPSILON5 &&
      Math.abs(v - lastV) < CesiumMath.EPSILON5
    ) {
      // Vertex is very close to the previous one - skip it.
      continue;
    }

    const nearlyEdgeU =
      Math.abs(u) < CesiumMath.EPSILON5 ||
      Math.abs(u - 1.0) < CesiumMath.EPSILON5;
    const nearlyEdgeV =
      Math.abs(v) < CesiumMath.EPSILON5 ||
      Math.abs(v - 1.0) < CesiumMath.EPSILON5;

    if (nearlyEdgeU && nearlyEdgeV) {
      // Corner vertex - skip it.
      continue;
    }

    const position = sourceEncoding.decodePosition(
      sourceVertices,
      index,
      cartesianScratch
    );
    const height = sourceEncoding.decodeHeight(sourceVertices, index);

    let normal;
    if (sourceEncoding.hasVertexNormals) {
      normal = sourceEncoding.getOctEncodedNormal(
        sourceVertices,
        index,
        octEncodedNormalScratch
      );
    } else {
      normal = octEncodedNormalScratch;
      normal.x = 0.0;
      normal.y = 0.0;
    }

    let webMercatorT = v;
    if (sourceEncoding.hasWebMercatorT) {
      const latitude = CesiumMath.lerp(
        targetRectangle.south,
        targetRectangle.north,
        v
      );
      webMercatorT =
        (WebMercatorProjection.geodeticLatitudeToMercatorAngle(latitude) -
          southMercatorY) *
        oneOverMercatorHeight;
    }

    let geodeticSurfaceNormal;
    if (encoding.hasGeodeticSurfaceNormals) {
      geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
        position,
        normalScratch
      );
    }

    encoding.encode(
      typedArray,
      nextIndex * targetStride,
      position,
      uv,
      height,
      normal,
      webMercatorT,
      geodeticSurfaceNormal
    );

    heightRange.minimumHeight = Math.min(heightRange.minimumHeight, height);
    heightRange.maximumHeight = Math.max(heightRange.maximumHeight, height);

    ++nextIndex;
  }

  return nextIndex;
}

function getNearestHeightOnEdge(meshes, tiles, isNext, edge, u, v) {
  let meshStart;
  let meshEnd;
  let meshStep;

  if (isNext) {
    meshStart = 0;
    meshEnd = meshes.length;
    meshStep = 1;
  } else {
    meshStart = meshes.length - 1;
    meshEnd = -1;
    meshStep = -1;
  }

  for (
    let meshIndex = meshStart;
    meshIndex !== meshEnd;
    meshIndex += meshStep
  ) {
    const mesh = meshes[meshIndex];
    const tile = tiles[meshIndex];
    if (!meshIsUsable(tile, mesh)) {
      continue;
    }

    let indices;
    switch (edge) {
      case TileEdge.WEST:
        indices = mesh.westIndicesSouthToNorth;
        break;
      case TileEdge.SOUTH:
        indices = mesh.southIndicesEastToWest;
        break;
      case TileEdge.EAST:
        indices = mesh.eastIndicesNorthToSouth;
        break;
      case TileEdge.NORTH:
        indices = mesh.northIndicesWestToEast;
        break;
    }

    const index = indices[isNext ? 0 : indices.length - 1];
    if (defined(index)) {
      return mesh.encoding.decodeHeight(mesh.vertices, index);
    }
  }

  return undefined;
}

function meshIsUsable(tile, mesh) {
  return (
    defined(mesh) &&
    (!defined(tile.data.fill) || !tile.data.fill.changedThisFrame)
  );
}

function getCornerFromEdge(
  terrainFillMesh,
  ellipsoid,
  edgeMeshes,
  edgeTiles,
  isNext,
  u,
  v,
  vertex
) {
  let edgeVertices;
  let compareU;
  let increasing;
  let vertexIndexIndex;
  let vertexIndex;
  const sourceTile = edgeTiles[isNext ? 0 : edgeMeshes.length - 1];
  const sourceMesh = edgeMeshes[isNext ? 0 : edgeMeshes.length - 1];

  if (meshIsUsable(sourceTile, sourceMesh)) {
    // Previous mesh is valid, but we don't know yet if it covers this corner.
    if (u === 0.0) {
      if (v === 0.0) {
        // southwest
        edgeVertices = isNext
          ? sourceMesh.northIndicesWestToEast
          : sourceMesh.eastIndicesNorthToSouth;
        compareU = isNext;
        increasing = isNext;
      } else {
        // northwest
        edgeVertices = isNext
          ? sourceMesh.eastIndicesNorthToSouth
          : sourceMesh.southIndicesEastToWest;
        compareU = !isNext;
        increasing = false;
      }
    } else if (v === 0.0) {
      // southeast
      edgeVertices = isNext
        ? sourceMesh.westIndicesSouthToNorth
        : sourceMesh.northIndicesWestToEast;
      compareU = !isNext;
      increasing = true;
    } else {
      // northeast
      edgeVertices = isNext
        ? sourceMesh.southIndicesEastToWest
        : sourceMesh.westIndicesSouthToNorth;
      compareU = isNext;
      increasing = !isNext;
    }

    if (edgeVertices.length > 0) {
      // The vertex we want will very often be the first/last vertex so check that first.
      vertexIndexIndex = isNext ? 0 : edgeVertices.length - 1;
      vertexIndex = edgeVertices[vertexIndexIndex];
      sourceMesh.encoding.decodeTextureCoordinates(
        sourceMesh.vertices,
        vertexIndex,
        uvScratch
      );
      const targetUv = transformTextureCoordinates(
        sourceTile,
        terrainFillMesh.tile,
        uvScratch,
        uvScratch
      );
      if (targetUv.x === u && targetUv.y === v) {
        // Vertex is good!
        getVertexFromTileAtCorner(sourceMesh, vertexIndex, u, v, vertex);
        return true;
      }

      // The last vertex is not the one we need, try binary searching for the right one.
      vertexIndexIndex = binarySearch(edgeVertices, compareU ? u : v, function (
        vertexIndex,
        textureCoordinate
      ) {
        sourceMesh.encoding.decodeTextureCoordinates(
          sourceMesh.vertices,
          vertexIndex,
          uvScratch
        );
        const targetUv = transformTextureCoordinates(
          sourceTile,
          terrainFillMesh.tile,
          uvScratch,
          uvScratch
        );
        if (increasing) {
          if (compareU) {
            return targetUv.x - u;
          }
          return targetUv.y - v;
        } else if (compareU) {
          return u - targetUv.x;
        }
        return v - targetUv.y;
      });

      if (vertexIndexIndex < 0) {
        vertexIndexIndex = ~vertexIndexIndex;

        if (vertexIndexIndex > 0 && vertexIndexIndex < edgeVertices.length) {
          // The corner falls between two vertices, so interpolate between them.
          getInterpolatedVertexAtCorner(
            ellipsoid,
            sourceTile,
            terrainFillMesh.tile,
            sourceMesh,
            edgeVertices[vertexIndexIndex - 1],
            edgeVertices[vertexIndexIndex],
            u,
            v,
            compareU,
            vertex
          );
          return true;
        }
      } else {
        // Found a vertex that fits in the corner exactly.
        getVertexFromTileAtCorner(
          sourceMesh,
          edgeVertices[vertexIndexIndex],
          u,
          v,
          vertex
        );
        return true;
      }
    }
  }

  return false;
}

const cornerPositionsScratch = [
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
  new Cartesian3(),
];

function computeOccludeePoint(
  tileProvider,
  center,
  rectangle,
  minimumHeight,
  maximumHeight,
  result
) {
  const ellipsoidalOccluder = tileProvider.quadtree._occluders.ellipsoid;
  const ellipsoid = ellipsoidalOccluder.ellipsoid;

  const cornerPositions = cornerPositionsScratch;
  Cartesian3.fromRadians(
    rectangle.west,
    rectangle.south,
    maximumHeight,
    ellipsoid,
    cornerPositions[0]
  );
  Cartesian3.fromRadians(
    rectangle.east,
    rectangle.south,
    maximumHeight,
    ellipsoid,
    cornerPositions[1]
  );
  Cartesian3.fromRadians(
    rectangle.west,
    rectangle.north,
    maximumHeight,
    ellipsoid,
    cornerPositions[2]
  );
  Cartesian3.fromRadians(
    rectangle.east,
    rectangle.north,
    maximumHeight,
    ellipsoid,
    cornerPositions[3]
  );

  return ellipsoidalOccluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
    center,
    cornerPositions,
    minimumHeight,
    result
  );
}
export default TerrainFillMesh;
