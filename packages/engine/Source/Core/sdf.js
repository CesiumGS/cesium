import CesiumMath from "./Math.js";

/**
 * Calculates the shortest distance from a point to a line.
 * @param {Array} point - The point [x, y].
 * @param {Array} line - The line as an array of coordinates [[x1, y1], [x2, y2], ...].
 * @returns {number} - The shortest distance.
 */
function calculateDistanceToLine(point, line) {
  let minDistance = Infinity;

  for (let i = 0; i < line.length - 1; i++) {
    const segmentStart = line[i];
    const segmentEnd = line[i + 1];
    const distance = pointToSegmentDistance(point, segmentStart, segmentEnd);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

/**
 * Calculates the distance from a point to a line segment.
 * @param {Array} point - The point [x, y].
 * @param {Array} segmentStart - The start of the segment [x, y].
 * @param {Array} segmentEnd - The end of the segment [x, y].
 * @returns {number} - The distance.
 */
function pointToSegmentDistance(point, segmentStart, segmentEnd) {
  const [px, py] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // Segment is a point
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx ** 2 + dy ** 2);
  const clampedT = Math.max(0, Math.min(1, t));

  const closestPoint = [x1 + clampedT * dx, y1 + clampedT * dy];
  return Math.sqrt((px - closestPoint[0]) ** 2 + (py - closestPoint[1]) ** 2);
}

/**
 * Generates a Float32Array signed distance field (SDF) for GeoJSON line features
 * @param {Array} features - List of GeoJSON features.
 * @param {number} resolution - Resolution of the SDF grid.
 * @returns {Array} - 2D array representing the SDF grid.
 */
function generateSDF(rectangle, features, resolution) {
  const minX = CesiumMath.toDegrees(rectangle.west);
  const minY = CesiumMath.toDegrees(rectangle.south);
  const maxX = CesiumMath.toDegrees(rectangle.east);
  const maxY = CesiumMath.toDegrees(rectangle.north);

  const width = resolution;
  const height = resolution;

  const sdf = new Float32Array(width * height).fill(Infinity);
  const featureID = new Uint32Array(width * height).fill(-1);

  features.forEach((feature) => {
    if (
      feature.geometry.type === "LineString" ||
      feature.geometry.type === "Polygon"
    ) {
      let coordinates = feature.geometry.coordinates;
      const grid_coordinates = [];

      if (feature.geometry.type === "Polygon") {
        // for polygon, only take the outer ring
        coordinates = coordinates[0];
      }

      // convert each world coordinate to grid coordinate
      for (let i = 0; i < coordinates.length; i++) {
        const [worldX, worldY] = coordinates[i];
        const gridX = Math.floor(((worldX - minX) / (maxX - minX)) * width);
        const gridY = Math.floor(((worldY - minY) / (maxY - minY)) * height);
        grid_coordinates.push([gridX, gridY]);
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // convert grid point to world coordinates
          const gridPoints = [x, y];

          const distance = calculateDistanceToLine(
            gridPoints,
            grid_coordinates,
          );

          if (distance < sdf[y * width + x]) {
            sdf[y * width + x] = distance;
            featureID[y * width + x] = features.indexOf(feature);
          }
        }
      }

      // log progress bar at every 10%
      const featureIndex = features.indexOf(feature);
      const progress = Math.floor((featureIndex / features.length) * 10);
      if (featureIndex % Math.floor(features.length / 10) === 0) {
        console.log(`Processing features: ${progress * 10}%`);
      }
    }
  });

  return [sdf, featureID];
}

function getV(pix_x, pix_y, sdf, resolution) {
  if (pix_x < 0 || pix_y < 0 || pix_x >= resolution || pix_y >= resolution) {
    return Infinity;
  }
  return sdf[pix_y * resolution + pix_x];
}

function setV(pix_x, pix_y, value, sdf, resolution) {
  if (pix_x < 0 || pix_y < 0 || pix_x >= resolution || pix_y >= resolution) {
    return;
  }
  return (sdf[pix_y * resolution + pix_x] = value);
}

function isOnGeo(pix_x, pix_y, sdf, resolution) {
  if (pix_x < 0 || pix_y === resolution || pix_y < 0 || pix_y >= resolution) {
    return false;
  }
  return getV(pix_x, pix_y, sdf, resolution) === 0;
}

function updateByNeighbors(pix_x, pix_y, sdf, featureIDs, resolution) {
  const isOn = isOnGeo(pix_x, pix_y, sdf, resolution);

  if (isOn) {
    // on geo, skip
    return;
  }

  const minDistanceSigned = getV(pix_x, pix_y, sdf, resolution);
  let minDistance = Math.abs(minDistanceSigned);
  const minDistanceSign = minDistanceSigned >= 0 ? 1 : -1;
  let minDistanceIndx = getV(pix_x, pix_y, featureIDs, resolution);

  // 3x3 neighborhood
  const neighbors = [
    [1, -1],
    [1, 0],
    [1, 1],
    [0, -1],
    [0, 1],
    [-1, -1],
    [-1, 0],
    [-1, 1],
  ];

  for (let i = 0; i < neighbors.length; i++) {
    const [dx, dy] = neighbors[i];
    const n_x = pix_x + dx;
    const n_y = pix_y + dy;
    const n_featureID = getV(n_x, n_y, featureIDs, resolution);

    if (isOnGeo(n_x, n_y, sdf, resolution)) {
      // neighbor is on geo, make distance
      const adjusted_distance = Math.sqrt(dx * dx + dy * dy);
      if (adjusted_distance < minDistance) {
        minDistance = adjusted_distance;
        minDistanceIndx = n_featureID;
      }
    } else {
      // neighbor is not on geo, compute adjusted distance
      const n_v = Math.abs(getV(n_x, n_y, sdf, resolution));
      const distance = Math.sqrt(dx * dx + dy * dy);

      const adjusted_distance = n_v + distance;

      if (adjusted_distance < minDistance) {
        minDistance = adjusted_distance;
        minDistanceIndx = n_featureID;
      }
    }
  }

  setV(pix_x, pix_y, minDistance * minDistanceSign, sdf, resolution);
  setV(pix_x, pix_y, minDistanceIndx, featureIDs, resolution);
}

function generateSDFSweep(rectangle, features, resolution, negPoly = false) {
  const minX = CesiumMath.toDegrees(rectangle.west);
  const minY = CesiumMath.toDegrees(rectangle.south);
  const maxX = CesiumMath.toDegrees(rectangle.east);
  const maxY = CesiumMath.toDegrees(rectangle.north);

  const width = resolution;
  const height = resolution;

  const sdf = new Float32Array(width * height).fill(Infinity);
  const featureID = new Uint32Array(width * height).fill(-1);

  // set on geo pixels
  features.forEach((feature) => {
    if (
      feature.geometry.type === "LineString" ||
      feature.geometry.type === "Polygon"
    ) {
      let coordinates = feature.geometry.coordinates;
      //let grid_coordinates = [];

      if (feature.geometry.type === "Polygon") {
        // for polygon, only take the outer ring
        coordinates = coordinates.flat();
      }

      // get all pair of consecutive coordinates
      for (let i = 0; i < coordinates.length - 1; i++) {
        const [worldX1, worldY1] = coordinates[i];
        const [worldX2, worldY2] = coordinates[i + 1];
        const gridX1 = Math.floor(((worldX1 - minX) / (maxX - minX)) * width);
        const gridY1 = Math.floor(((worldY1 - minY) / (maxY - minY)) * height);
        const gridX2 = Math.floor(((worldX2 - minX) / (maxX - minX)) * width);
        const gridY2 = Math.floor(((worldY2 - minY) / (maxY - minY)) * height);

        // Bresenham's line algorithm to get all pixels between two points
        const dx = Math.abs(gridX2 - gridX1);
        const dy = Math.abs(gridY2 - gridY1);
        const sx = gridX1 < gridX2 ? 1 : -1;
        const sy = gridY1 < gridY2 ? 1 : -1;
        let err = dx - dy;

        let x = gridX1;
        let y = gridY1;

        while (true) {
          // set pixel as on geo
          setV(x, y, 0, sdf, resolution);
          setV(x, y, features.indexOf(feature), featureID, resolution);

          if (x === gridX2 && y === gridY2) {
            break;
          }
          const err2 = 2 * err;
          if (err2 > -dy) {
            err -= dy;
            x += sx;
          }
          if (err2 < dx) {
            err += dx;
            y += sy;
          }
        }
      }

      if (negPoly) {
        // Mark all pixel inside polygon as negative distance
        if (feature.geometry.type === "Polygon") {
          const grid_polygon = coordinates.map(([worldX, worldY]) => {
            const gridX = Math.floor(((worldX - minX) / (maxX - minX)) * width);
            const gridY = Math.floor(
              ((worldY - minY) / (maxY - minY)) * height,
            );
            return [gridX, gridY];
          });

          // get bounding box of the polygon in grid space
          let polyMinX = Infinity,
            polyMinY = Infinity,
            polyMaxX = -Infinity,
            polyMaxY = -Infinity;
          grid_polygon.forEach(([x, y]) => {
            polyMinX = Math.min(polyMinX, x);
            polyMinY = Math.min(polyMinY, y);
            polyMaxX = Math.max(polyMaxX, x);
            polyMaxY = Math.max(polyMaxY, y);
          });

          // scan through bounding box and use ray-casting to determine if inside polygon
          for (let y = polyMinY; y <= polyMaxY; y++) {
            for (let x = polyMinX; x <= polyMaxX; x++) {
              // ray-casting algorithm
              let inside = false;
              for (
                let i = 0, j = grid_polygon.length - 1;
                i < grid_polygon.length;
                j = i++
              ) {
                const xi = grid_polygon[i][0],
                  yi = grid_polygon[i][1];
                const xj = grid_polygon[j][0],
                  yj = grid_polygon[j][1];

                const intersect =
                  yi > y !== yj > y &&
                  x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
                if (intersect) {
                  inside = !inside;
                }
              }

              const idxCurr = y * resolution + x;
              if (inside) {
                if (sdf[idxCurr] !== 0) {
                  sdf[idxCurr] = -Infinity;
                }
              }
            }
          }
        }
      }
    }
  });

  // Sweep through the grid left to right, top to bottom
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      updateByNeighbors(x, y, sdf, featureID, resolution);
    }
  }

  // Sweep through the grid left to right, bottom to top
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      updateByNeighbors(x, y, sdf, featureID, resolution);
    }
  }

  // Sweep through the grid right to left, bottom to top
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      updateByNeighbors(x, y, sdf, featureID, resolution);
    }
  }

  // Sweep through the grid right to left, top to bottom
  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      updateByNeighbors(x, y, sdf, featureID, resolution);
    }
  }

  return [sdf, featureID];
}

function updateGridByNeighbors(
  pix_x,
  pix_y,
  sdf,
  sdfX,
  sdfY,
  featureIDs,
  resolution,
) {
  const isOn = isOnGeo(pix_x, pix_y, sdf, resolution);
  const p_this_v = getV(pix_x, pix_y, sdf, resolution);
  const p_this_featureID = getV(pix_x, pix_y, featureIDs, resolution);

  if (isOn) {
    // on geo, skip
    return;
  }

  let minDistance = p_this_v;
  let minDistanceX = -1;
  let minDistanceY = -1;
  let minDistanceIndx = p_this_featureID;

  // 3x3 neighborhood
  const neighbors = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  for (let i = 0; i < neighbors.length; i++) {
    const [dx, dy] = neighbors[i];
    const n_x = pix_x + dx;
    const n_y = pix_y + dy;
    const n_featureID = getV(n_x, n_y, featureIDs, resolution);

    if (isOnGeo(n_x, n_y, sdf, resolution)) {
      // neighbor is on geo, make distance
      const this_dx = dx;
      const this_dy = dy;
      const adjusted_distance = Math.sqrt(
        this_dx * this_dx + this_dy * this_dy,
      );

      if (adjusted_distance < minDistance) {
        minDistance = adjusted_distance;
        minDistanceX = n_x;
        minDistanceY = n_y;
        minDistanceIndx = n_featureID;
      }
    } else {
      // neighbor is not on geo, compute distance from grids
      const this_x = getV(n_x, n_y, sdfX, resolution);
      const this_y = getV(n_x, n_y, sdfY, resolution);
      if (this_x === -1 || this_y === -1) {
        continue;
      }

      const this_dx = pix_x - this_x;
      const this_dy = pix_y - this_y;

      const adjusted_distance = Math.sqrt(
        this_dx * this_dx + this_dy * this_dy,
      );

      if (adjusted_distance < minDistance) {
        minDistance = adjusted_distance;
        minDistanceX = this_x;
        minDistanceY = this_y;
        minDistanceIndx = n_featureID;
      }
    }
  }

  setV(pix_x, pix_y, minDistance, sdf, resolution);
  setV(pix_x, pix_y, minDistanceX, sdfX, resolution);
  setV(pix_x, pix_y, minDistanceY, sdfY, resolution);
  setV(pix_x, pix_y, minDistanceIndx, featureIDs, resolution);
}

function generateSDFSweepGridSpace(rectangle, features, resolution) {
  const minX = CesiumMath.toDegrees(rectangle.west);
  const minY = CesiumMath.toDegrees(rectangle.south);
  const maxX = CesiumMath.toDegrees(rectangle.east);
  const maxY = CesiumMath.toDegrees(rectangle.north);

  const width = resolution;
  const height = resolution;

  const sdf = new Float32Array(width * height).fill(Infinity);
  // store the xy of the closest feature point
  const sdfX = new Uint32Array(width * height).fill(-1);
  const sdfY = new Uint32Array(width * height).fill(-1);

  const featureID = new Uint32Array(width * height).fill(-1);

  // set on geo pixels
  features.forEach((feature) => {
    if (
      feature.geometry.type === "LineString" ||
      feature.geometry.type === "Polygon"
    ) {
      let coordinates = feature.geometry.coordinates;
      //let grid_coordinates = [];

      if (feature.geometry.type === "Polygon") {
        // for polygon, take both outer and inner rings
        coordinates = coordinates.flat();
      }

      // get all pair of consecutive coordinates
      for (let i = 0; i < coordinates.length - 1; i++) {
        const [worldX1, worldY1] = coordinates[i];
        const [worldX2, worldY2] = coordinates[i + 1];
        const gridX1 = Math.floor(((worldX1 - minX) / (maxX - minX)) * width);
        const gridY1 = Math.floor(((worldY1 - minY) / (maxY - minY)) * height);
        const gridX2 = Math.floor(((worldX2 - minX) / (maxX - minX)) * width);
        const gridY2 = Math.floor(((worldY2 - minY) / (maxY - minY)) * height);

        // Bresenham's line algorithm to get all pixels between two points
        const dx = Math.abs(gridX2 - gridX1);
        const dy = Math.abs(gridY2 - gridY1);
        const sx = gridX1 < gridX2 ? 1 : -1;
        const sy = gridY1 < gridY2 ? 1 : -1;
        let err = dx - dy;

        let x = gridX1;
        let y = gridY1;

        while (true) {
          // set pixel as on geo
          setV(x, y, 0, sdf, resolution);
          setV(x, y, features.indexOf(feature), featureID, resolution);

          if (x === gridX2 && y === gridY2) {
            break;
          }
          const err2 = 2 * err;
          if (err2 > -dy) {
            err -= dy;
            x += sx;
          }
          if (err2 < dx) {
            err += dx;
            y += sy;
          }
        }
      }
    }
  });

  // Sweep through the grid left to right, top to bottom
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      updateGridByNeighbors(x, y, sdf, sdfX, sdfY, featureID, resolution);
    }
  }

  // Sweep through the grid left to right, bottom to top
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      updateGridByNeighbors(x, y, sdf, sdfX, sdfY, featureID, resolution);
    }
  }

  // Sweep through the grid right to left, bottom to top
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      updateGridByNeighbors(x, y, sdf, sdfX, sdfY, featureID, resolution);
    }
  }

  // Sweep through the grid right to left, top to bottom
  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      updateGridByNeighbors(x, y, sdf, sdfX, sdfY, featureID, resolution);
    }
  }

  return [sdf, featureID];
}

export default {
  generateSDF,
  generateSDFSweep,
  generateSDFSweepGridSpace,
};
