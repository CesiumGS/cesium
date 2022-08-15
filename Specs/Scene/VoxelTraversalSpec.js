import {
  AttributeType,
  ComponentDatatype,
  defer,
  VoxelTraversal,
  VoxelPrimitive,
  VoxelBoxShape,
  Cartesian3,
  OrientedBoundingBox,
  Math as CesiumMath,
  CullingVolume,
} from "../../Source/Cesium.js";
import MetadataType from "../../Source/Scene/MetadataType.js";
import createScene from "../createScene.js";

const randomNumber = CesiumMath.nextRandomNumber;
const testQueryCoords = Cartesian3.fromElements(
  randomNumber() - 0.5, // get in the same interval as the shape [-0.5, 0.5]
  randomNumber() - 0.5,
  randomNumber() - 0.5
);
const numberOfLevels = 15;
const numberOfBins = Math.pow(2, numberOfLevels - 1);
const maxIndex = numberOfBins - 1;
const testQueryTileCoords = Cartesian3.fromElements(
  Math.floor((testQueryCoords.x + 0.5) * numberOfBins),
  Math.floor((testQueryCoords.y + 0.5) * numberOfBins),
  Math.floor((testQueryCoords.z + 0.5) * numberOfBins)
);
if (testQueryCoords.x > maxIndex) {
  testQueryCoords.x = maxIndex;
}
if (testQueryCoords.y > maxIndex) {
  testQueryCoords.y = maxIndex;
}
if (testQueryCoords.z > maxIndex) {
  testQueryCoords.z = maxIndex;
}
const metadataName = "dummyMetadataName";
function DummyVoxelProvider() {
  this.shape = new VoxelBoxShape();
  const voxelDimension = 64;
  this.voxelDimensions = new Cartesian3(
    voxelDimension,
    voxelDimension,
    voxelDimension
  );
  const channelCount = 4;
  this.voxelsPerTile = voxelDimension * voxelDimension * voxelDimension;
  this.floatsPerTile = channelCount * this.voxelsPerTile;
  this.ready = true;
  this.readyPromise = Promise.resolve(this);
  this._tileCount = 4096;
  this.neighborEdgeCount = 0;
  this.numberOfLevels = numberOfLevels;

  this.properties = {};
  this.properties[metadataName] = {
    type: AttributeType.VEC4,
    componentType: ComponentDatatype.FLOAT,
    componentCount: 4,
    min: 0,
    max: 1,
    count: this.voxelsPerTile * this._tileCount,
  };
}
DummyVoxelProvider.prototype.requestData = function (options) {
  const maxIndex = Math.pow(2, options.level) - 1;
  const requestOutsideOfShape =
    options.x < 0 ||
    options.x > maxIndex ||
    options.y < 0 ||
    options.y > maxIndex ||
    options.z < 0 ||
    options.z > maxIndex;
  if (options.level >= this.numberOfLevels || requestOutsideOfShape) {
    return Promise.resolve(undefined);
  }
  const returnArray = new Uint32Array(this.floatsPerTile);
  if (
    (options.x === testQueryTileCoords.x &&
      options.y === testQueryTileCoords.y &&
      options.z === testQueryTileCoords.z &&
      options.level === this.numberOfLevels - 1) ||
    this.numberOfLevels === 1 // voxel index test
  ) {
    for (let i = 0; i < this.floatsPerTile; i++) {
      returnArray[i] = i;
    }
  }
  return Promise.resolve(returnArray);
};

const towardPrimitive = Cartesian3.fromElements(1.0, 1.0, 1.0);

function turnCameraAround(scene) {
  scene.camera.direction = Cartesian3.negate(towardPrimitive, new Cartesian3());
  scene.renderForSpecs();
}

describe(
  "Scene/VoxelTraversal",
  function () {
    const provider = new DummyVoxelProvider();
    const scene = createScene();
    const frameState = scene.frameState;
    const camera = frameState.camera;
    const context = scene.context;
    const keyframeCount = 1;
    const voxelDimensions = provider.voxelDimensions;
    const neighborEdgeCount = provider.neighborEdgeCount;
    // TODO: not available from the dummy provider (nor from the real providers)
    const datatypes = provider.datatypes;
    const textureMemory = 500;

    let traversalPromise = defer();
    let primitive;
    beforeEach(function () {
      camera.position = Cartesian3.fromElements(-10, -10, -10);
      camera.direction = Cartesian3.fromElements(1, 1, 1);
      camera.frustum.fov = CesiumMath.PI_OVER_TWO;
      scene.primitives.removeAll();
      primitive = new VoxelPrimitive({
        voxelProvider: provider,
      });
      scene.primitives.add(primitive);
      scene.renderForSpecs();
      traversalPromise = primitive.readyPromise.then(function () {
        return new VoxelTraversal(
          primitive,
          context,
          voxelDimensions,
          datatypes,
          datatypes,
          keyframeCount,
          textureMemory
        );
      });
    });

    it("constructs with arguments", function () {
      return traversalPromise.then(function (traversal) {
        expect(traversal.primitive).toBe(primitive);
        const megatextureKeys = Object.keys(traversal.megatextures);
        expect(megatextureKeys.length).toBe(1);
        expect(megatextureKeys).toEqual(
          jasmine.arrayContaining([metadataName])
        );
        const megatexture = traversal.megatexture;
        expect(megatexture.channelCount).toBe(
          provider.properties[metadataName].componentCount
        );
        expect(megatexture.datatype).toBe(MetadataType.FLOAT);
        const twiceNeighborEdgeCount = 2 * neighborEdgeCount;
        expect(
          megatexture.voxelCountPerTile.equals(
            Cartesian3.add(
              voxelDimensions,
              Cartesian3.fromElements(
                twiceNeighborEdgeCount,
                twiceNeighborEdgeCount,
                twiceNeighborEdgeCount
              ),
              new Cartesian3()
            )
          )
        ).toBe(true);
        expect(megatexture.metadataName).toBe(metadataName);
      });
    });

    it("recomputes bounding volume when shape moves", function () {
      return traversalPromise.then(function (traversal) {
        const rootNode = traversal.rootNode;
        const oldOrientedBoundingBox = rootNode.orientedBoundingBox.clone();
        const shape = traversal.primitive._shape;
        const translation = Cartesian3.fromElements(1, 1, 1);
        shape.translation = translation;
        shape.update();
        const keyFrameLocation = 0;
        const recomputeBoundingVolumes = true;
        const pauseUpdate = false;
        traversal.update(
          frameState,
          keyFrameLocation,
          recomputeBoundingVolumes,
          pauseUpdate
        );
        const newOrientedBoundingBox = rootNode.orientedBoundingBox.clone();
        expect(
          OrientedBoundingBox.equals(
            oldOrientedBoundingBox,
            newOrientedBoundingBox
          )
        ).toBe(false);
        expect(newOrientedBoundingBox.center.equals(translation)).toBe(true);
      });
    });

    it("computes screen space error for root tile", function () {
      return traversalPromise.then(function (traversal) {
        const rootNode = traversal.rootNode;
        const cameraPosition = frameState.camera.positionWC;
        const screenSpaceErrorDenominator =
          frameState.camera.frustum.sseDenominator;
        const screenHeight =
          frameState.context.drawingBufferHeight / frameState.pixelRatio;
        const screenSpaceErrorMultiplier =
          screenHeight / screenSpaceErrorDenominator;
        rootNode.computeScreenSpaceError(
          cameraPosition,
          screenSpaceErrorMultiplier
        );

        let distanceToCamera = Math.sqrt(
          rootNode.orientedBoundingBox.distanceSquaredTo(cameraPosition)
        );
        distanceToCamera = Math.max(distanceToCamera, CesiumMath.EPSILON7);
        const error =
          screenSpaceErrorMultiplier *
          (rootNode.approximateVoxelSize / distanceToCamera);
        expect(rootNode.screenSpaceError).toBe(error);
      });
    });

    it("computes visibility for root tile", function () {
      return traversalPromise.then(function (traversal) {
        const rootNode = traversal.rootNode;
        const visibilityPlaneMask = CullingVolume.MASK_INDETERMINATE;

        const visibilityWhenLookingAtRoot = rootNode.visibility(
          frameState,
          visibilityPlaneMask
        );
        expect(visibilityWhenLookingAtRoot).toBe(CullingVolume.MASK_INSIDE);

        turnCameraAround(scene);
        const visibilityWhenLookingAway = rootNode.visibility(
          frameState,
          visibilityPlaneMask
        );
        expect(visibilityWhenLookingAway).toBe(CullingVolume.MASK_OUTSIDE);
      });
    });

    it("loads tiles into megatexture", function () {
      return traversalPromise.then(function (traversal) {
        const keyFrameLocation = 0;
        const recomputeBoundingVolumes = true;
        const pauseUpdate = false;
        traversal.update(
          frameState,
          keyFrameLocation,
          recomputeBoundingVolumes,
          pauseUpdate
        );

        const megatexture = traversal.megatextures[metadataName];
        let tilesInMegatextureCount = megatexture.occupiedCount;
        const tileInQueueWhenLookingAtRoot = tilesInMegatextureCount === 1;
        expect(tileInQueueWhenLookingAtRoot).toBe(true);

        traversal.megatexture.remove(0);
        turnCameraAround(scene);
        traversal.update(
          frameState,
          keyFrameLocation,
          recomputeBoundingVolumes,
          pauseUpdate
        );
        tilesInMegatextureCount = traversal.megatexture.occupiedCount;
        const tileNotInQueueWhenLookingAway = tilesInMegatextureCount === 0;
        expect(tileNotInQueueWhenLookingAway).toBe(true);
      });
    });

    it("unloads tiles in megatexture", function () {
      return traversalPromise.then(function (traversal) {
        const keyFrameLocation = 0;
        const recomputeBoundingVolumes = true;
        const pauseUpdate = false;
        function updateTraversalTenTimes() {
          // to fully fetch data and copy to texture
          function updateTraversal() {
            traversal.update(
              frameState,
              keyFrameLocation,
              recomputeBoundingVolumes,
              pauseUpdate
            );
          }
          for (let i = 0; i < 10; i++) {
            updateTraversal();
          }
        }

        const eps = CesiumMath.EPSILON7;
        const bottomLeftNearCorner = Cartesian3.fromElements(
          -0.5 - eps,
          -0.5 - eps,
          -0.5 - eps
        );
        const topRightFarCorner = Cartesian3.fromElements(
          0.5 + eps,
          0.5 + eps,
          0.5 + eps
        );
        scene.camera.position = bottomLeftNearCorner;
        updateTraversalTenTimes();
        const numberOfNodesOnGPU = traversal.keyframeNodesInMegatexture.length;
        const deepestNode =
          traversal.keyframeNodesInMegatexture[numberOfNodesOnGPU - 1];
        const deepestSpatialNode = deepestNode.spatialNode;
        const nodeIsInMegatexture =
          deepestNode.state === VoxelTraversal.LoadState.LOADED;
        expect(nodeIsInMegatexture).toBe(true);

        scene.camera.position = topRightFarCorner;
        turnCameraAround(scene);
        updateTraversalTenTimes();
        const nodeNoLongerInMegatexture =
          traversal.keyframeNodesInMegatexture.filter(function (keyFrameNode) {
            const spatialNode = keyFrameNode.spatialNode;
            return (
              spatialNode.level === deepestSpatialNode.level &&
              spatialNode.x === deepestSpatialNode.x &&
              spatialNode.y === deepestSpatialNode.y &&
              spatialNode.x === deepestSpatialNode.z
            );
          }).length === 0;
        expect(nodeNoLongerInMegatexture).toBe(true);
      });
    });

    it("gets tile metadata at a world cartesian coordiate", function () {
      return traversalPromise
        .then(function (traversal) {
          return traversal.getMetadataAtWorldCartesian(
            testQueryCoords,
            metadataName
          );
        })
        .then(function (queryValue) {
          expect(queryValue[1]).not.toBe(0);
        });
    });

    it("gives undefined when querying metadata outside of bounds", function () {
      return traversalPromise
        .then(function (traversal) {
          return traversal.getMetadataAtWorldCartesian(
            Cartesian3.fromElements(1, 1, 1),
            metadataName
          );
        })
        .then(function (queryValue) {
          expect(queryValue).toBe(undefined);
        });
    });

    it("returns right voxel within tile when querying", function () {
      return traversalPromise.then(function (traversal) {
        traversal.primitive.provider.numberOfLevels = 1;
        const voxelsPerTile = provider.voxelsPerTile;
        const queryPromises = new Array(voxelsPerTile);
        const queryPointCoords = [
          [-0.5, -0.5, -0.5],
          [0, -0.5, -0.5],
          [-0.5, 0, -0.5],
          [0, 0, -0.5],
          [-0.5, -0.5, 0],
          [0, -0.5, 0],
          [-0.5, 0, 0],
          [0, 0, 0],
        ];
        queryPointCoords.forEach(function (coord, index) {
          queryPromises[index] = traversal.getMetadataAtWorldCartesian(
            Cartesian3.fromArray(coord),
            metadataName
          );
        });
        return Promise.all(queryPromises).then(function (queryValues) {
          queryValues.forEach(function (value, index) {
            expect(value[0]).toBe(index);
          });
        });
      });
    });
  },
  "WebGL"
);
