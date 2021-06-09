import Ellipsoid from "../Core/Ellipsoid.js";
import HeightmapEncoding from "../Core/HeightmapEncoding.js";
import HeightmapTessellator from "../Core/HeightmapTessellator.js";
import Rectangle from "../Core/Rectangle.js";
import RuntimeError from "../Core/RuntimeError.js";
import Lerc from "../ThirdParty/LercDecode.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

function createVerticesFromHeightmap(parameters, transferableObjects) {
  // LERC encoded buffers must be decoded, then we can process them like normal
  if (parameters.encoding === HeightmapEncoding.LERC) {
    var result;
    try {
      result = Lerc.decode(parameters.heightmap);
    } catch (error) {
      throw new RuntimeError(error);
    }

    var lercStatistics = result.statistics[0];
    if (lercStatistics.minValue === Number.MAX_VALUE) {
      throw new RuntimeError("Invalid tile data");
    }

    parameters.heightmap = result.pixels[0];
    parameters.width = result.width;
    parameters.height = result.height;
  }

  parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
  parameters.rectangle = Rectangle.clone(parameters.rectangle);

  var statistics = HeightmapTessellator.computeVertices(parameters);
  var vertices = statistics.vertices;
  transferableObjects.push(vertices.buffer);

  return {
    vertices: vertices.buffer,
    numberOfAttributes: statistics.encoding.stride,
    minimumHeight: statistics.minimumHeight,
    maximumHeight: statistics.maximumHeight,
    gridWidth: parameters.width,
    gridHeight: parameters.height,
    boundingSphere3D: statistics.boundingSphere3D,
    orientedBoundingBox: statistics.orientedBoundingBox,
    occludeePointInScaledSpace: statistics.occludeePointInScaledSpace,
    encoding: statistics.encoding,
    westIndicesSouthToNorth: statistics.westIndicesSouthToNorth,
    southIndicesEastToWest: statistics.southIndicesEastToWest,
    eastIndicesNorthToSouth: statistics.eastIndicesNorthToSouth,
    northIndicesWestToEast: statistics.northIndicesWestToEast,
  };
}
export default createTaskProcessorWorker(createVerticesFromHeightmap);
