function getNumofLineSegments(features) {
  let count = 0;
  features.forEach((feature) => {
    if (feature.geometry.type === "LineString") {
      count += feature.geometry.coordinates.length - 1;
    } else if (feature.geometry.type === "Polygon") {
      // for polygon, take all rings
      const lineCoords = feature.geometry.coordinates.flat();
      count += lineCoords.length - 1;
      // note: for geojson the last and first point are duplicated
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

/**
 * Clips a polygon ring to a bounding box and returns a new ring enclosing the areas within the bounding box.
 *
 * @param {Array} ring - The polygon ring as an array of points [[x1, y1], [x2, y2], ...].
 * @param {number} x0 - The minimum x-coordinate of the bounding box.
 * @param {number} x1 - The maximum x-coordinate of the bounding box.
 * @param {number} y0 - The minimum y-coordinate of the bounding box.
 * @param {number} y1 - The maximum y-coordinate of the bounding box.
 * @returns {Array} The clipped polygon ring as an array of points.
 */
function clipPolygonToBoundingBox(ring, x0, x1, y0, y1) {
  // Helper function to check if a point is inside the boundary
  function isInside(point, boundary, isVertical, isMin) {
    const [x, y] = point;
    if (isVertical) {
      return isMin ? x >= boundary : x <= boundary;
    }
    return isMin ? y >= boundary : y <= boundary;
  }

  // Helper function to compute the intersection of a line segment with a boundary
  function findIntersection(p1, p2, boundary, isVertical) {
    const [x1, y1] = p1;
    const [x2, y2] = p2;

    if (isVertical) {
      // Vertical boundary: x = boundary
      const t = (boundary - x1) / (x2 - x1);
      const y = y1 + t * (y2 - y1);
      return [boundary, y];
    }
    // Horizontal boundary: y = boundary
    const t = (boundary - y1) / (y2 - y1);
    const x = x1 + t * (x2 - x1);
    return [x, boundary];
  }

  // Clip the polygon against a single boundary
  function clipAgainstBoundary(points, in_flags, boundary, isVertical, isMin) {
    const newPoints = [];
    const flags = [];
    for (let i = 0; i < points.length; i++) {
      const curr = points[i];
      const prev = points[(i - 1 + points.length) % points.length];
      const currInside = isInside(curr, boundary, isVertical, isMin);
      const prevInside = isInside(prev, boundary, isVertical, isMin);

      if (currInside && prevInside) {
        // Both points are inside, add the current point
        newPoints.push(curr);
        flags.push(in_flags[i]);
      } else if (currInside && !prevInside) {
        // Current point is inside, previous point is outside
        // Add the intersection point and the current point
        newPoints.push(findIntersection(prev, curr, boundary, isVertical));
        flags.push(true);
        newPoints.push(curr);
        flags.push(in_flags[i]);
      } else if (!currInside && prevInside) {
        // Current point is outside, previous point is inside
        // Add the intersection point
        newPoints.push(findIntersection(prev, curr, boundary, isVertical));
        flags.push(true);
      }
      // If both points are outside, do nothing
    }
    return [newPoints, flags];
  }

  // Start with the original ring
  let clippedRing = ring;
  let clippingFlags = [];

  // Clip against each boundary of the bounding box
  [clippedRing, clippingFlags] = clipAgainstBoundary(
    clippedRing,
    clippingFlags,
    x0,
    true,
    true,
  ); // Left boundary
  [clippedRing, clippingFlags] = clipAgainstBoundary(
    clippedRing,
    clippingFlags,
    x1,
    true,
    false,
  ); // Right boundary
  [clippedRing, clippingFlags] = clipAgainstBoundary(
    clippedRing,
    clippingFlags,
    y0,
    false,
    true,
  ); // Bottom boundary
  [clippedRing, clippingFlags] = clipAgainstBoundary(
    clippedRing,
    clippingFlags,
    y1,
    false,
    false,
  ); // Top boundary

  // Ensure the ring is closed (first and last points are the same)
  if (
    clippedRing.length > 0 &&
    (clippedRing[0][0] !== clippedRing[clippedRing.length - 1][0] ||
      clippedRing[0][1] !== clippedRing[clippedRing.length - 1][1])
  ) {
    clippedRing.push(clippedRing[0]);
    clippingFlags.push(clippingFlags[0]);
  }

  return [clippedRing, clippingFlags];
}

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
  const gridCutFlags = new Array(gridSizeX);
  for (let i = 0; i < gridSizeX; i++) {
    grid[i] = new Array(gridSizeY);
    gridCutFlags[i] = new Array(gridSizeY);
    for (let j = 0; j < gridSizeY; j++) {
      grid[i][j] = [];
      gridCutFlags[i][j] = [];
    }
  }

  console.log("Original number of line segments:", lineSegmentsCount);
  let numOfLineSegmentsGeoJSON = 0;

  // assign line segments to grid cells
  for (let i = 0; i < features.length; i++) {
    const geometry = features[i].geometry;
    if (geometry.type === "LineString" || geometry.type === "Polygon") {
      const lineCoords = geometry.coordinates;

      if (geometry.type === "Polygon") {
        for (let j = 0; j < lineCoords.length; j++) {
          // iterate through grid cells
          for (let c = 0; c < gridSizeX; c++) {
            for (let r = 0; r < gridSizeY; r++) {
              const cellMinX = bbox[0] + c * cellWidth;
              const cellMaxX = bbox[0] + (c + 1) * cellWidth;
              const cellMinY = bbox[1] + r * cellHeight;
              const cellMaxY = bbox[1] + (r + 1) * cellHeight;
              const clipped = clipPolygonToBoundingBox(
                lineCoords[j],
                cellMinX,
                cellMaxX,
                cellMinY,
                cellMaxY,
              );
              const p = clipped[0];
              const flags = clipped[1];
              if (p.length > 0) {
                // convert to line segments
                for (let k = 0; k < p.length - 1; k++) {
                  const x1 = p[k][0];
                  const y1 = p[k][1];
                  const x2 = p[k + 1][0];
                  const y2 = p[k + 1][1];
                  const flag0 = flags[k];
                  const flag1 = flags[k + 1];
                  const flagLine = flag0 && flag1 ? 1 : 0;
                  grid[c][r].push([x1, y1, x2, y2]);
                  gridCutFlags[c][r].push(flagLine);
                }
                numOfLineSegmentsGeoJSON += p.length - 1; // account for the duplicated line segment
              }
            }
          }
        }
      }

      if (geometry.type === "LineString") {
        // iterate through line segments
        // duplicate line segments that cross cell boundaries
        for (let j = 0; j < lineCoords.length - 1; j++) {
          const x1 = lineCoords[j][0];
          const y1 = lineCoords[j][1];
          // get next point
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

          // NOTE: this is assuming lines do not cross more than 2 cells
          // which is not always true. This is for convenience here.
          if (cellX1 === cellX2 && cellY1 === cellY2) {
            // endpoints in the same cell
            grid[cellX1][cellY1].push([x1, y1, x2, y2]);
            numOfLineSegmentsGeoJSON += 1;
          } else {
            // endpoints in different cells
            grid[cellX1][cellY1].push([x1, y1, x2, y2]);
            grid[cellX2][cellY2].push([x1, y1, x2, y2]);
            numOfLineSegmentsGeoJSON += 2; // account for the duplicated line segment
          }
        }
      }
    }
  }

  console.log(
    "Number of line segments after grid assignment:",
    numOfLineSegmentsGeoJSON,
  );

  console.log(
    "Number of line segments after grid split:",
    numOfLineSegmentsGeoJSON,
  );

  if (numOfLineSegmentsGeoJSON === 0) {
    return undefined;
  }

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

  console.log("Number of line segments in GPU texture:", numOfLineSegments);
  const coords = new Float32Array(numOfLineSegments * 4);
  const indices = new Uint32Array(gridSizeX * gridSizeY + 2); //squeeze in grid dimensions at the start
  const cutFlags = new Uint8Array(numOfLineSegments);
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

        cutFlags[index] = gridCutFlags[i][j][k];

        index++;
      }
      // record the end index of this cell
      indices[2 + j * gridSizeX + i] = index;
    }
  }

  // fill in the rest with -1
  for (; index < numOfLineSegments; index++) {
    // everything here is invalid
    coords[index * 4] = -1.0;
    coords[index * 4 + 1] = -1.0;
    coords[index * 4 + 2] = -1.0;
    coords[index * 4 + 3] = -1.0;
    cutFlags[index] = 2;
  }

  return [
    coords,
    textureWidth,
    textureHeight,
    indices,
    gridSizeX,
    gridSizeY,
    cutFlags,
  ];
}

export default {
  // geojsonToArray,
  geojsonToArrayInGrid,
};
