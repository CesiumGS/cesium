import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  timeline: false,
  animation: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
});
const scene = viewer.scene;

let worldTerrain;
try {
  worldTerrain = await Cesium.createWorldTerrainAsync();
  scene.terrainProvider = worldTerrain;
  scene.globe.show = true;
} catch (error) {
  window.alert(`There was an error creating world terrain. ${error}`);
}

let worldTileset;
try {
  worldTileset = await Cesium.createGooglePhotorealistic3DTileset({
    onlyUsingWithGoogleGeocoder: true,
  });
  worldTileset.show = false;
  scene.primitives.add(worldTileset);
} catch (error) {
  console.log(`Error loading Photorealistic 3D Tiles tileset.${error}`);
}

viewer.scene.debugShowFramesPerSecond = true;

// Load a batched 3D Tiles tileset.

// Sandcastle (1000 footprints)
const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2464651);

viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

// Collect clipping polygons from footprints
const clippingPolygons = [];

// --- UI controls ---
const statusEl = document.getElementById("status");
const btnGenerate = document.getElementById("btnGenerate");
const btnClear = document.getElementById("btnClear");
const btnToggleMesh = document.getElementById("btnToggleMesh");
const modeSelect = document.getElementById("modeSelect");
const geomErrorSelect = document.getElementById("geomErrorSelect");
const clipQualitySelect = document.getElementById("clipQualitySelect");
const clipTargetSelect = document.getElementById("clipTargetSelect");

let minGeometricError = 64;
let clipQuality = 0.25;
let clipTarget = "terrain";

geomErrorSelect.addEventListener("change", function () {
  minGeometricError = Number(geomErrorSelect.value);
});

clipQualitySelect.addEventListener("change", function () {
  clipQuality = Number(clipQualitySelect.value);
});

clipTargetSelect.addEventListener("change", function () {
  clipTarget = clipTargetSelect.value;
  worldTileset.show = clipTarget === "3dtiles";
  scene.globe.show = clipTarget === "terrain";
  clearAll();
});

let footprintCount = 0;

function updateStatus() {
  statusEl.textContent = `Footprints: ${footprintCount}`;
}

function updateClippingPolygons() {
  // Apply clipping polygons to the selected target
  const target = clipTarget === "3dtiles" ? worldTileset : viewer.scene.globe;
  target.clippingPolygons = new Cesium.ClippingPolygonCollection({
    polygons: clippingPolygons,
    inverse: false, // false = cut holes where buildings are
    debugShowDistanceTexture: false,
    quality: clipQuality,
  });
}

function addClip(footprint, _feature, _tile) {
  clippingPolygons.push(
    new Cesium.ClippingPolygon({
      positions: footprint.hierarchy.positions,
      autoUpdate: false,
    }),
  );
}

function addPolygonGraphics(footprint, feature, _tile) {
  viewer.entities.add(
    new Cesium.Entity({
      polygon: new Cesium.PolygonGraphics({
        hierarchy: footprint.hierarchy,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        material: Cesium.defined(footprint.color)
          ? footprint.color.withAlpha(0.4)
          : Cesium.Color.CYAN.withAlpha(0.4),
        classificationType: Cesium.ClassificationType.TERRAIN,
        zIndex: footprint.maxHeight,
      }),
      properties: { featureId: feature.featureId },
    }),
  );
}

function addOutlineGraphics(footprint, feature, _tile) {
  viewer.entities.add(
    new Cesium.Entity({
      polygon: new Cesium.PolygonGraphics({
        hierarchy: footprint.hierarchy,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        fill: false,
        outline: true,
        outlineColor: Cesium.defined(footprint.color)
          ? footprint.color
          : Cesium.Color.WHITE,
        classificationType: Cesium.ClassificationType.TERRAIN,
        zIndex: footprint.maxHeight,
      }),
      properties: { featureId: feature.featureId },
    }),
  );
}

function onFootprintsGenerated(tile, count) {
  console.log(
    `footprintsGenerated — depth: ${tile._depth}, geometricError: ${tile.geometricError}, count: ${count}`,
  );
}

async function generateFootprints(createEntity) {
  const start = performance.now();
  const count = await FootprintGenerator.generate({
    tileset: tileset,
    createEntity: createEntity,
    filterFeature: function (feature) {
      return true;
    },
    filterTile: function (tile) {
      return (
        tile.parent === undefined || tile.geometricError >= minGeometricError
      );
    },
    footprintsGenerated: onFootprintsGenerated,
  });
  footprintCount = count;
  const elapsed = (performance.now() - start).toFixed(2);
  console.log(`generate() took ${elapsed} ms — ${count} footprints`);
  return count;
}

function clearAll() {
  footprintCount = 0;
  clippingPolygons.length = 0;
  viewer.entities.removeAll();
  worldTileset.clippingPolygons = undefined;
  viewer.scene.globe.clippingPolygons = undefined;
}

// Generate based on selected mode
btnGenerate.addEventListener("click", async function () {
  clearAll();
  const mode = modeSelect.value;
  if (mode === "clip") {
    await generateFootprints(addClip);
    const removed =
      ContainmentRemoval.removeContainedPolygons(clippingPolygons);
    console.log(
      `Removed ${removed} contained polygons, ${clippingPolygons.length} remaining`,
    );
    footprintCount = clippingPolygons.length;
    updateClippingPolygons();
  } else if (mode === "fill") {
    await generateFootprints(addPolygonGraphics);
  } else {
    await generateFootprints(addOutlineGraphics);
  }
  updateStatus();
});

// Clear
btnClear.addEventListener("click", function () {
  clearAll();
  updateStatus();
});

// Toggle mesh visibility
btnToggleMesh.addEventListener("click", function () {
  tileset.show = !tileset.show;
  btnToggleMesh.textContent = tileset.show ? "Hide Mesh" : "Show Mesh";
});

// ---- ConvexHull2D helpers ---- //

const ConvexHull2D = (() => {
  function findPivotIndex(points) {
    let pivotIndex = 0;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const pivot = points[pivotIndex];
      if (p.y < pivot.y || (p.y === pivot.y && p.x < pivot.x)) {
        pivotIndex = i;
      }
    }
    return pivotIndex;
  }

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  function distanceSquared2D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function removeDuplicates2D(points, epsilon) {
    const sorted = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const epsilonSquared = epsilon * epsilon;
    const unique = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (
        distanceSquared2D(sorted[i], unique[unique.length - 1]) >=
        epsilonSquared
      ) {
        unique.push(sorted[i]);
      }
    }
    return unique;
  }

  /**
   * Computes the 2D convex hull of a set of points using the Graham scan algorithm.
   * @param {Cartesian2[]} points An array of {@link Cartesian2} points.
   * @param {number} [epsilon=1e-12] Tolerance for degenerate/collinear point removal.
   * @returns {Cartesian2[]} The convex hull in counter-clockwise order.
   * @private
   */
  function computeConvexHull2D(points, epsilon) {
    if (!Cesium.defined(epsilon)) {
      epsilon = 1e-12;
    }

    const uniquePoints = removeDuplicates2D(points, epsilon);

    if (uniquePoints.length === 1) {
      return [Cesium.Cartesian2.clone(uniquePoints[0])];
    }
    if (uniquePoints.length === 2) {
      return [
        Cesium.Cartesian2.clone(uniquePoints[0]),
        Cesium.Cartesian2.clone(uniquePoints[1]),
      ];
    }

    const pivotIndex = findPivotIndex(uniquePoints);
    const pivot = uniquePoints[pivotIndex];

    const sorted = [];
    for (let i = 0; i < uniquePoints.length; i++) {
      if (i !== pivotIndex) {
        sorted.push(uniquePoints[i]);
      }
    }

    sorted.sort(function (a, b) {
      const crossValue = cross(pivot, a, b);
      if (Math.abs(crossValue) < epsilon) {
        return distanceSquared2D(pivot, a) - distanceSquared2D(pivot, b);
      }
      return -crossValue;
    });

    const filtered = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const crossValue = cross(pivot, sorted[i - 1], sorted[i]);
      if (Math.abs(crossValue) < epsilon) {
        filtered[filtered.length - 1] = sorted[i];
      } else {
        filtered.push(sorted[i]);
      }
    }

    if (filtered.length < 2) {
      const result = [Cesium.Cartesian2.clone(pivot)];
      for (let i = 0; i < filtered.length; i++) {
        result.push(Cesium.Cartesian2.clone(filtered[i]));
      }
      return result;
    }

    const stack = [pivot, filtered[0]];
    for (let i = 1; i < filtered.length; i++) {
      while (
        stack.length > 1 &&
        cross(stack[stack.length - 2], stack[stack.length - 1], filtered[i]) <=
          epsilon
      ) {
        stack.pop();
      }
      stack.push(filtered[i]);
    }

    const result = new Array(stack.length);
    for (let i = 0; i < stack.length; i++) {
      result[i] = Cesium.Cartesian2.clone(stack[i]);
    }
    return result;
  }

  return { computeConvexHull2D };
})();

// ---- Containment removal for clipping polygons ---- //

const ContainmentRemoval = (() => {
  const cartographicScratch = new Cesium.Cartographic();

  function polygonTo2D(positions) {
    const pts = new Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
      const carto = Cesium.Cartographic.fromCartesian(
        positions[i],
        Cesium.Ellipsoid.WGS84,
        cartographicScratch,
      );
      pts[i] = { x: carto.longitude, y: carto.latitude };
    }
    return pts;
  }

  function computeAABB(pts) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].x < minX) {
        minX = pts[i].x;
      }
      if (pts[i].x > maxX) {
        maxX = pts[i].x;
      }
      if (pts[i].y < minY) {
        minY = pts[i].y;
      }
      if (pts[i].y > maxY) {
        maxY = pts[i].y;
      }
    }
    return { minX, maxX, minY, maxY, area: (maxX - minX) * (maxY - minY) };
  }

  function aabbContains(outer, inner) {
    return (
      inner.minX >= outer.minX &&
      inner.maxX <= outer.maxX &&
      inner.minY >= outer.minY &&
      inner.maxY <= outer.maxY
    );
  }

  function pointInConvexPolygon(point, polygon) {
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const cx =
        (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) -
        (polygon[j].y - polygon[i].y) * (point.x - polygon[i].x);
      if (cx < 0) {
        return false;
      }
    }
    return true;
  }

  function convexPolygonContains(outerPts, innerPts) {
    for (let i = 0; i < innerPts.length; i++) {
      if (!pointInConvexPolygon(innerPts[i], outerPts)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Removes polygons that are fully contained within larger polygons.
   * Uses AABB pre-filtering followed by convex polygon containment tests.
   *
   * @param {ClippingPolygon[]} polygons The array of clipping polygons (modified in place).
   * @returns {number} The number of contained polygons that were removed.
   */
  function removeContainedPolygons(polygons) {
    const n = polygons.length;
    if (n <= 1) {
      return 0;
    }

    // Project to 2D and compute AABBs
    const entries = new Array(n);
    for (let i = 0; i < n; i++) {
      const pts = polygonTo2D(polygons[i].positions);
      entries[i] = { index: i, pts, aabb: computeAABB(pts) };
    }

    // Sort by AABB area descending (larger polygons first)
    entries.sort((a, b) => b.aabb.area - a.aabb.area);

    const contained = new Set();
    for (let i = 0; i < n; i++) {
      if (contained.has(entries[i].index)) {
        continue;
      }
      for (let j = i + 1; j < n; j++) {
        if (contained.has(entries[j].index)) {
          continue;
        }
        // Quick AABB check
        if (!aabbContains(entries[i].aabb, entries[j].aabb)) {
          continue;
        }
        // Full containment test
        if (convexPolygonContains(entries[i].pts, entries[j].pts)) {
          contained.add(entries[j].index);
        }
      }
    }

    if (contained.size > 0) {
      // Remove from back to front to preserve indices
      const toRemove = Array.from(contained).sort((a, b) => b - a);
      for (const idx of toRemove) {
        polygons.splice(idx, 1);
      }
    }

    return contained.size;
  }

  return { removeContainedPolygons };
})();

// ---- FootprintGenerator ---- //

const FootprintGenerator = (() => {
  const cartographicScratch = new Cesium.Cartographic();

  function convexHullFromPositions(positions, options) {
    options = Cesium.defined(options) ? options : {};
    const ellipsoid = Cesium.defined(options.ellipsoid)
      ? options.ellipsoid
      : Cesium.Ellipsoid.default;

    const points2D = new Array(positions.length);
    let minHeight = Number.POSITIVE_INFINITY;
    let maxHeight = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < positions.length; i++) {
      const carto = Cesium.Cartographic.fromCartesian(
        positions[i],
        ellipsoid,
        cartographicScratch,
      );
      if (!Cesium.defined(carto)) {
        points2D[i] = new Cesium.Cartesian2(0, 0);
      } else {
        points2D[i] = new Cesium.Cartesian2(carto.longitude, carto.latitude);
        if (carto.height < minHeight) {
          minHeight = carto.height;
        }
        if (carto.height > maxHeight) {
          maxHeight = carto.height;
        }
      }
    }

    const hull2D = ConvexHull2D.computeConvexHull2D(points2D);

    if (hull2D.length < 3) {
      return undefined;
    }

    const hullPositions = new Array(hull2D.length);
    for (let i = 0; i < hull2D.length; i++) {
      hullPositions[i] = Cesium.Cartesian3.fromRadians(
        hull2D[i].x,
        hull2D[i].y,
        0.0,
        ellipsoid,
      );
    }

    return {
      hierarchy: new Cesium.PolygonHierarchy(hullPositions),
      minHeight: minHeight,
      maxHeight: maxHeight,
    };
  }

  function getTileKey(tile) {
    if (Cesium.defined(tile.content) && Cesium.defined(tile.content.url)) {
      return tile.content.url;
    }
    return `tile-${tile._depth}-${tile._x}-${tile._y}-${tile._z}`;
  }

  function getFeatureKey(tileKey, featureId) {
    return `${tileKey}#${featureId}`;
  }

  function calculateColor(colors) {
    if (!Cesium.defined(colors) || colors.length === 0) {
      return undefined;
    }
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let i = 0; i < colors.length; i++) {
      r += colors[i].red;
      g += colors[i].green;
      b += colors[i].blue;
      a += colors[i].alpha;
    }
    const len = colors.length;
    return new Cesium.Color(r / len, g / len, b / len, a / len);
  }

  async function extractFootprintsFromTile(tile, filterFeature) {
    const content = tile.content;
    if (!Cesium.defined(content)) {
      return undefined;
    }

    const featuresLength = content.featuresLength;
    if (featuresLength === 0) {
      return undefined;
    }

    const result = new Map();

    const geometryMap = await content.getGeometry({
      extractPositions: true,
      extractColors: true,
    });
    if (!Cesium.defined(geometryMap) || geometryMap.size === 0) {
      return undefined;
    }

    for (const [featureId, geometry] of geometryMap) {
      if (featureId < 0 || featureId >= featuresLength) {
        continue;
      }

      const positions = geometry.positions;
      if (!Cesium.defined(positions) || positions.length < 3) {
        continue;
      }

      if (typeof filterFeature === "function") {
        const feature = content.getFeature(featureId);
        if (!filterFeature(feature, positions.length)) {
          continue;
        }
      }

      const hullResult = convexHullFromPositions(positions);
      if (Cesium.defined(hullResult)) {
        const color = calculateColor(geometry.colors);
        result.set(featureId, {
          hierarchy: hullResult.hierarchy,
          color,
          minHeight: hullResult.minHeight,
          maxHeight: hullResult.maxHeight,
        });
      }
    }

    return result.size > 0 ? result : undefined;
  }

  /**
   * Process all currently loaded tiles in the tileset and create footprint
   * polygon entities for each feature.
   *
   * @example
   * // With filtering and custom entity creation
   * const count = await FootprintGenerator.generate({
   *   tileset,
   *   filterFeature: function (feature) {
   *     return feature.getProperty('height') > 10;
   *   },
   *   createEntity: function (footprint, feature, tile) {
   *     return new Cesium.Entity({
   *       polygon: new Cesium.PolygonGraphics({ hierarchy: footprint.hierarchy }),
   *     });
   *   },
   * });
   */
  async function generate(options) {
    const ts = options.tileset;
    const filterFeature = options.filterFeature;
    const filterTile = options.filterTile;
    const createEntity = options.createEntity;
    const footprintsGenerated = options.footprintsGenerated;

    const root = ts.root;
    if (!Cesium.defined(root)) {
      return 0;
    }

    let count = 0;
    const seen = new Set();

    const queue = [root];
    let head = 0;
    while (head < queue.length) {
      const tile = queue[head++];

      const children = tile.children;
      if (Cesium.defined(children)) {
        for (let i = 0; i < children.length; i++) {
          queue.push(children[i]);
        }
      }

      if (!Cesium.defined(tile.content) || !tile.contentReady) {
        continue;
      }

      if (typeof filterTile === "function" && !filterTile(tile)) {
        continue;
      }

      const tileKey = getTileKey(tile);

      if (seen.has(tileKey)) {
        continue;
      }
      seen.add(tileKey);

      const hierarchies = await extractFootprintsFromTile(tile, filterFeature);
      if (!Cesium.defined(hierarchies) || hierarchies.size === 0) {
        continue;
      }

      const content = tile.content;
      let tileCount = 0;

      for (const [fid, footprint] of hierarchies) {
        const key = getFeatureKey(tileKey, fid);

        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        const feature = content.getFeature(fid);

        if (Cesium.defined(createEntity)) {
          createEntity(footprint, feature, tile);
        }

        tileCount++;
        count++;
      }

      if (typeof footprintsGenerated === "function" && tileCount > 0) {
        footprintsGenerated(tile, tileCount);
      }
    }

    return count;
  }

  return { generate };
})();
