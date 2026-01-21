function getNumofLineSegments(features) {
  let count = 0;
  features.forEach((feature) => {
    if (feature.geometry.type === "LineString") {
      count += feature.geometry.coordinates.length - 1;
    }
  });
  return count;
}

/*function geojsonToArray(features, bbox, useTest = false) {
  const numOfLineSegmentsGeoJSON = getNumofLineSegments(features);

  // get texture size to the next power of 2
  const textureWidth = Math.pow(
    2,
    Math.ceil(Math.log2(Math.ceil(Math.sqrt(numOfLineSegmentsGeoJSON)))),
  );
  const textureHeight = Math.pow(
    2,
    Math.ceil(Math.log2(Math.ceil(numOfLineSegmentsGeoJSON / textureWidth))),
  );
  const numOfLineSegments = textureWidth * textureHeight;

  console.log("Number of line segments:", numOfLineSegments);
  const coords = new Float32Array(numOfLineSegments * 4);
  // loop through features and extract line segments
  let index = 0;
  for (let i = 0; i < features.length; i++) {
    // do line string only for now
    const geometry = features[i].geometry;
    if (geometry.type === "LineString") {
      const lineCoords = geometry.coordinates;
      // normalize coordinates to [0,1] based on bbox
      for (let j = 0; j < lineCoords.length - 1; j++) {
        let x1, y1, x2, y2;
        if (!useTest) {
          x1 = (lineCoords[j][0] - bbox[0]) / (bbox[2] - bbox[0]);
          y1 = (lineCoords[j][1] - bbox[1]) / (bbox[3] - bbox[1]);
          x2 = (lineCoords[j + 1][0] - bbox[0]) / (bbox[2] - bbox[0]);
          y2 = (lineCoords[j + 1][1] - bbox[1]) / (bbox[3] - bbox[1]);
        } else {
          // fill in all diagonal lines for testing
          x1 = 0.0;
          y1 = 0.0;
          x2 = 1.0;
          y2 = 1.0;
        }
        coords[index * 4] = x1; // x1
        coords[index * 4 + 1] = y1; // y1
        coords[index * 4 + 2] = x2; // x2
        coords[index * 4 + 3] = y2; // y2
        index++;
      }
    }
  }

  // fill in the rest with -1
  for (; index < numOfLineSegments; index++) {
    coords[index * 4] = -1.0;
    coords[index * 4 + 1] = -1.0;
    coords[index * 4 + 2] = -1.0;
    coords[index * 4 + 3] = -1.0;
  }

  return [coords, textureWidth, textureHeight];
}*/

function geojsonToArrayInGrid(
  features,
  bbox,
  targetLinePerCell = 1000,
  useTest = false,
) {
  const lineSegmentsCount = getNumofLineSegments(features);

  // decide grid size based on features length
  // aim for 1k lines per grid cell
  const gridSizeX = Math.ceil(Math.sqrt(lineSegmentsCount / targetLinePerCell));
  const gridSizeY = Math.ceil(Math.sqrt(lineSegmentsCount / targetLinePerCell));
  console.log("Grid size (auto computed):", gridSizeX, gridSizeY);

  // chop into grid cells
  const cellWidth = (bbox[2] - bbox[0]) / gridSizeX;
  const cellHeight = (bbox[3] - bbox[1]) / gridSizeY;
  console.log("Cell size:", cellWidth, cellHeight);

  // get a 2D array to hold line segments in each cell
  const grid = new Array(gridSizeX);
  for (let i = 0; i < gridSizeX; i++) {
    grid[i] = new Array(gridSizeY);
    for (let j = 0; j < gridSizeY; j++) {
      grid[i][j] = [];
    }
  }

  // assign line segments to grid cells
  for (let i = 0; i < features.length; i++) {
    const geometry = features[i].geometry;
    if (geometry.type === "LineString") {
      const lineCoords = geometry.coordinates;
      // iterate through line segments
      // duplicate line segments that cross cell boundaries
      for (let j = 0; j < lineCoords.length - 1; j++) {
        const x1 = lineCoords[j][0];
        const y1 = lineCoords[j][1];
        const x2 = lineCoords[j + 1][0];
        const y2 = lineCoords[j + 1][1];

        // determine which cells the endpoints are in
        const cellX1 = Math.max(
          Math.min(Math.floor((x1 - bbox[0]) / cellWidth), gridSizeX - 1),
          0,
        );
        const cellY1 = Math.max(
          Math.min(Math.floor((y1 - bbox[1]) / cellHeight), gridSizeY - 1),
          0,
        );
        const cellX2 = Math.max(
          Math.min(Math.floor((x2 - bbox[0]) / cellWidth), gridSizeX - 1),
          0,
        );
        const cellY2 = Math.max(
          Math.min(Math.floor((y2 - bbox[1]) / cellHeight), gridSizeY - 1),
          0,
        );

        if (cellX1 === cellX2 && cellY1 === cellY2) {
          // endpoints in the same cell
          if (
            cellX1 >= gridSizeX ||
            cellY1 >= gridSizeY ||
            cellX1 < 0 ||
            cellY1 < 0
          ) {
            console.log(x1, y1, x2, y2, bbox[0], bbox[1], bbox[2], bbox[3]);
          }
          grid[cellX1][cellY1].push([x1, y1, x2, y2]);
        } else {
          // if differ, assign to both cells
          grid[cellX1][cellY1].push([x1, y1, x2, y2]);
          grid[cellX2][cellY2].push([x1, y1, x2, y2]);
        }
      }
    }
  }

  const numOfLineSegmentsGeoJSON = lineSegmentsCount;

  // get texture size to the next power of 2
  const textureWidth = Math.pow(
    2,
    Math.ceil(Math.log2(Math.ceil(Math.sqrt(numOfLineSegmentsGeoJSON)))),
  );
  const textureHeight = Math.pow(
    2,
    Math.ceil(Math.log2(Math.ceil(numOfLineSegmentsGeoJSON / textureWidth))),
  );
  const numOfLineSegments = textureWidth * textureHeight;

  console.log("Number of line segments:", numOfLineSegments);
  const coords = new Float32Array(numOfLineSegments * 4);
  const indices = new Uint32Array(gridSizeX * gridSizeY + 2); //squeeze in grid dimensions at the end
  indices[0] = gridSizeX;
  indices[1] = gridSizeY;

  // loop through grids and fill in coords
  // record the index of each grid cell end position
  let index = 0;
  for (let j = 0; j < gridSizeY; j++) {
    for (let i = 0; i < gridSizeX; i++) {
      const cellLines = grid[i][j];
      for (let k = 0; k < cellLines.length; k++) {
        let x1, y1, x2, y2;
        if (!useTest) {
          x1 = (cellLines[k][0] - bbox[0]) / (bbox[2] - bbox[0]);
          y1 = (cellLines[k][1] - bbox[1]) / (bbox[3] - bbox[1]);
          x2 = (cellLines[k][2] - bbox[0]) / (bbox[2] - bbox[0]);
          y2 = (cellLines[k][3] - bbox[1]) / (bbox[3] - bbox[1]);
        } else {
          // fill in all diagonal lines for testing
          x1 = 0.0;
          y1 = 0.0;
          x2 = 1.0;
          y2 = 1.0;
        }
        coords[index * 4] = x1; // x1
        coords[index * 4 + 1] = y1; // y1
        coords[index * 4 + 2] = x2; // x2
        coords[index * 4 + 3] = y2; // y2
        index++;
      }
      // record the end index of this cell
      indices[2 + j * gridSizeX + i] = index;
    }
  }

  // fill in the rest with -1
  for (; index < numOfLineSegments; index++) {
    coords[index * 4] = -1.0;
    coords[index * 4 + 1] = -1.0;
    coords[index * 4 + 2] = -1.0;
    coords[index * 4 + 3] = -1.0;
  }

  return [coords, textureWidth, textureHeight, indices, gridSizeX, gridSizeY];
}

export default {
  // geojsonToArray,
  geojsonToArrayInGrid,
};
