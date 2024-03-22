import Credit from "./Credit";
import Ellipsoid from "./Ellipsoid";
import Event from "./Event";
import HeightmapTerrainData from "./HeightmapTerrainData";
import TerrainProvider from "./TerrainProvider";
import WebMercatorTilingScheme from "./WebMercatorTilingScheme";

const ADDRESS = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/";
const MAX_LOD = 15;

function AWSTerrainProvider(options = {}) {
  this.targetResolution = options.targetResolution || 32;

  this._tilingScheme = new WebMercatorTilingScheme({
    ellipsoid: Ellipsoid.WGS84,
    numberOfLevelZeroTilesX: 1,
    numberOfLevelZeroTilesY: 1,
  });
  this._readyPromise = Promise.resolve(true);
  this._errorEvent = new Event();
  this._credit = new Credit(
    '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">AWS Open Data Terrain Tiles</a>',
    true
  );
}

AWSTerrainProvider.prototype = Object.create(TerrainProvider.prototype);
AWSTerrainProvider.prototype.constructor = AWSTerrainProvider;

AWSTerrainProvider.prototype.decodeElevation = function (rgb) {
  return rgb[0] * 256 + rgb[1] + rgb[2] / 256 - 32768;
};

AWSTerrainProvider.prototype.requestTileGeometry = function (
  x,
  y,
  level,
  request
) {
  return this.fetchTile(level, x, y)
    .then((image) => {
      const offscreenCanvas = new OffscreenCanvas(image.width, image.height);
      const context = offscreenCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(
        0,
        0,
        offscreenCanvas.width,
        offscreenCanvas.height
      );

      // Downsampling factor - how many original pixels correspond to one in the downsampled image
      const downsampleFactor = imageData.width / this.targetResolution;
      const downsampledHeightData = new Float32Array(
        this.targetResolution * this.targetResolution
      );

      for (let i = 0; i < this.targetResolution; i++) {
        for (let j = 0; j < this.targetResolution; j++) {
          // Calculate the index in the original data
          const idx =
            (i * downsampleFactor * imageData.width + j * downsampleFactor) * 4;
          const rgb = [
            imageData.data[idx],
            imageData.data[idx + 1],
            imageData.data[idx + 2],
          ];
          const elevation = this.decodeElevation(rgb);
          // Assign the downsampled elevation
          downsampledHeightData[i * this.targetResolution + j] = elevation;
        }
      }

      return new HeightmapTerrainData({
        buffer: downsampledHeightData,
        width: this.targetResolution,
        height: this.targetResolution,
      });
    })
    .catch((error) => {
      console.error("Failed to load or decode terrain tile:", error);
      return undefined;
    });
};

AWSTerrainProvider.prototype.fetchTile = function (zoom, x, y) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (e) =>
      reject(
        new Error(
          `Failed to load tile at zoom ${zoom}, x ${x}, y ${y}: ${e.message}`
        )
      );
    image.src = `${ADDRESS}${zoom}/${x}/${y}.png`;
  });
};

AWSTerrainProvider.prototype.getLevelMaximumGeometricError = function (level) {
  const levelZeroError = TerrainProvider.getEstimatedLevelZeroGeometricErrorForAHeightmap(
    this._tilingScheme.ellipsoid,
    256 /* tile width */,
    this._tilingScheme.getNumberOfXTilesAtLevel(0)
  );
  return levelZeroError / (1 << level);
};

AWSTerrainProvider.prototype.getTileDataAvailable = function (x, y, level) {
  return level <= MAX_LOD;
};

AWSTerrainProvider.prototype.loadTileDataAvailability = function (x, y, level) {
  if (level > MAX_LOD - 1) {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
};

AWSTerrainProvider.prototype.positionToTileXY = function (position, level) {
  return this._tilingScheme.positionToTileXY(position, level);
};

Object.defineProperties(AWSTerrainProvider.prototype, {
  errorEvent: {
    get: function () {
      return this._errorEvent;
    },
  },
  credit: {
    get: function () {
      return this._credit;
    },
  },
  tilingScheme: {
    get: function () {
      return this._tilingScheme;
    },
  },
  ready: {
    get: function () {
      return this._readyPromise;
    },
  },
  hasWaterMask: {
    get: function () {
      return false;
    },
  },
  hasVertexNormals: {
    get: function () {
      return false;
    },
  },
  availability: {
    get: function () {
      return {
        computeMaximumLevelAtPosition: (position) => {
          return MAX_LOD;
        },
      };
    },
  },
});

export default AWSTerrainProvider;
