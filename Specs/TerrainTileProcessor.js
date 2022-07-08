import {
  clone,
  ImageryLayer,
  GlobeSurfaceTile,
  TerrainState,
  Texture,
} from "../Source/Cesium.js";

function TerrainTileProcessor(
  frameState,
  terrainProvider,
  imageryLayerCollection
) {
  this.frameState = frameState;
  this.terrainProvider = terrainProvider;
  this.imageryLayerCollection = imageryLayerCollection;
}

// Processes the given list of tiles until all terrain and imagery states stop changing.
TerrainTileProcessor.prototype.process = function (tiles, maxIterations) {
  const that = this;

  return new Promise((resolve) => {
    function getState(tile) {
      return [
        tile.state,
        tile.data ? tile.data.terrainState : undefined,
        tile.data && tile.data.imagery
          ? tile.data.imagery.map(function (imagery) {
              return [
                imagery.readyImagery ? imagery.readyImagery.state : undefined,
                imagery.loadingImagery
                  ? imagery.loadingImagery.state
                  : undefined,
              ];
            })
          : [],
      ];
    }

    function statesAreSame(a, b) {
      if (a.length !== b.length) {
        return false;
      }

      let same = true;
      for (let i = 0; i < a.length; ++i) {
        if (Array.isArray(a[i]) && Array.isArray(b[i])) {
          same = same && statesAreSame(a[i], b[i]);
        } else if (Array.isArray(a[i]) || Array.isArray(b[i])) {
          same = false;
        } else {
          same = same && a[i] === b[i];
        }
      }

      return same;
    }

    let iterations = 0;

    function next() {
      ++iterations;
      ++that.frameState.frameNumber;

      // Keep going until all terrain and imagery provider are ready and states are no longer changing.
      let changed = !that.terrainProvider.ready;

      for (let i = 0; i < that.imageryLayerCollection.length; ++i) {
        changed =
          changed || !that.imageryLayerCollection.get(i).imageryProvider.ready;
      }

      if (that.terrainProvider.ready) {
        tiles.forEach(function (tile) {
          const beforeState = getState(tile);
          GlobeSurfaceTile.processStateMachine(
            tile,
            that.frameState,
            that.terrainProvider,
            that.imageryLayerCollection
          );
          const afterState = getState(tile);
          changed =
            changed ||
            tile.data.terrainState === TerrainState.RECEIVING ||
            tile.data.terrainState === TerrainState.TRANSFORMING ||
            !statesAreSame(beforeState, afterState);
        });
      }

      if (!changed || iterations >= maxIterations) {
        resolve(iterations);
      } else {
        setTimeout(next, 0);
      }
    }

    next();
  });
};

TerrainTileProcessor.prototype.mockWebGL = function () {
  spyOn(GlobeSurfaceTile, "_createVertexArrayForMesh").and.callFake(
    function () {
      const vertexArray = jasmine.createSpyObj("VertexArray", [
        "destroy",
        "isDestroyed",
      ]);
      return vertexArray;
    }
  );

  spyOn(ImageryLayer.prototype, "_createTextureWebGL").and.callFake(function (
    context,
    imagery
  ) {
    const texture = jasmine.createSpyObj("Texture", ["destroy"]);
    texture.width = imagery.image.width;
    texture.height = imagery.image.height;
    return texture;
  });

  spyOn(ImageryLayer.prototype, "_finalizeReprojectTexture");

  spyOn(Texture, "create").and.callFake(function (options) {
    const result = clone(options);
    result.destroy = function () {};
    return result;
  });
};
export default TerrainTileProcessor;
