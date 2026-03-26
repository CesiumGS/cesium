import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

///////////////////////////////////////////////////////////////////////////////
// LOADER

const {
  BufferPoint,
  BufferPointCollection,
  BufferPointMaterial,
  BufferPolygon,
  BufferPolygonCollection,
  BufferPolygonMaterial,
  BufferPolyline,
  BufferPolylineCollection,
  BufferPolylineMaterial,
  Cartesian3,
  Color,
} = Cesium;

// For illustration in 'vector-alpha' sandcastles only! For production applications,
// install the 'earcut' dependency from npm.
const earcut = BufferPolygonCollection.INTERNAL_USE_ONLY_EARCUT;

const DEFAULT_GEOJSON_OPTIONS = {
  stream: false,
  color: "#FFFFFF",
};

async function loadGeoJSON(src, _options = DEFAULT_GEOJSON_OPTIONS) {
  const options = {
    ...DEFAULT_GEOJSON_OPTIONS,
    ..._options,
  };

  const response = await fetch(src);
  const featureCollection = await response.json();

  console.time("load dataset");

  const layout = createLayout(featureCollection);

  const result = {};

  if (layout.points.featureCount > 0) {
    result.points = new BufferPointCollection({
      primitiveCountMax: layout.points.primCount,
    });
  }

  if (layout.lines.featureCount > 0) {
    result.lines = new BufferPolylineCollection({
      primitiveCountMax: layout.lines.primCount,
      vertexCountMax: layout.lines.vertexCount,
    });
  }

  if (layout.polygons.featureCount > 0) {
    result.polygons = new BufferPolygonCollection({
      primitiveCountMax: layout.polygons.primCount,
      vertexCountMax: layout.polygons.vertexCount,
      holeCountMax: layout.polygons.holeCount,
      triangleCountMax: layout.polygons.vertexCount, // TODO(donmccurdy)
    });
  }

  const color = new Color();

  if (options.color !== "random") {
    Color.fromCssColorString(options.color, color);
  }

  let i = 0;
  for (const feature of featureCollection.features) {
    const geometry = feature.geometry;

    if (options.color === "random") {
      Color.fromRandom(undefined, color);
    }

    switch (geometry.type) {
      case "Point":
      case "MultiPoint":
        addPoints(result.points, geometry, color);
        break;
      case "LineString":
      case "MultiLineString":
        addLines(result.lines, geometry, color);
        break;
      case "Polygon":
      case "MultiPolygon":
        addPolygons(result.polygons, geometry, color);
        break;
      default:
        throw new Error(`Unsupported geometry: ${geometry.type}`);
    }

    // TODO(donmccurdy): Return result, then stream features.
    if (options.stream && ++i % 100 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  }

  console.timeEnd("load dataset");

  return result;
}

///////////////////////////////////////////////////////////////////////////////
// SCRATCH

const point = new BufferPoint();
const polyline = new BufferPolyline();
const polygon = new BufferPolygon();

const pointMaterial = new BufferPointMaterial();
const polylineMaterial = new BufferPolylineMaterial();
const polygonMaterial = new BufferPolygonMaterial();

const position = new Cartesian3();

///////////////////////////////////////////////////////////////////////////////
// POINTS

function addPoints(collection, geometry, color) {
  Color.clone(color, pointMaterial.color);
  const coordinates =
    geometry.type === "Point" ? [geometry.coordinates] : geometry.coordinates;

  for (const coord of coordinates) {
    Cartesian3.fromDegrees(coord[0], coord[1], undefined, undefined, position);
    collection.add({ position, material: pointMaterial }, point);
  }
}

///////////////////////////////////////////////////////////////////////////////
// LINES

function addLines(collection, geometry, color) {
  Color.clone(color, polylineMaterial.color);
  const lineStrings =
    geometry.type === "LineString"
      ? [geometry.coordinates]
      : geometry.coordinates;

  for (const lineString of lineStrings) {
    const positions = new Float64Array(lineString.length * 3);
    for (let j = 0, jl = lineString.length; j < jl; j++) {
      const coord = lineString[j];
      Cartesian3.fromDegrees(
        coord[0],
        coord[1],
        undefined,
        undefined,
        position,
      );
      Cartesian3.pack(position, positions, j * 3);
    }
    collection.add({ positions, material: polylineMaterial }, polyline);
  }
}

///////////////////////////////////////////////////////////////////////////////
// POLYGONS

function addPolygons(collection, geometry, color) {
  Color.clone(color, polygonMaterial.color);

  if (geometry.type === "Polygon") {
    _addPolygon(collection, geometry.coordinates, polygonMaterial);
  } else {
    for (const coordinates of geometry.coordinates) {
      _addPolygon(collection, coordinates, polygonMaterial);
    }
  }
}

function _addPolygon(collection, coordinates, material) {
  const positions = [];
  const holes = [];
  for (let i = 0, il = coordinates.length; i < il; i++) {
    if (i > 0) {
      holes.push(positions.length / 3);
    }
    for (let j = 0, jl = coordinates[i].length; j < jl; j++) {
      const coord = coordinates[i][j];
      Cartesian3.fromDegrees(
        coord[0],
        coord[1],
        undefined,
        undefined,
        position,
      );
      positions.push(position.x, position.y, position.z);
    }
  }
  collection.add(
    {
      positions: new Float64Array(positions),
      holes: new Uint32Array(holes),
      triangles: new Uint32Array(earcut(positions, holes, 3)),
      material,
    },
    polygon,
  );
}

///////////////////////////////////////////////////////////////////////////////
// LAYOUT

function createLayout(collection) {
  const layout = {
    featureCount: 0,
    points: { featureCount: 0, primCount: 0, vertexCount: 0 },
    lines: { featureCount: 0, primCount: 0, vertexCount: 0 },
    polygons: {
      featureCount: 0,
      primCount: 0,
      vertexCount: 0,
      holeCount: 0,
    },
  };

  for (const feature of collection.features) {
    switch (feature.geometry.type) {
      case "Point":
        layout.points.featureCount++;
        layout.points.primCount++;
        layout.points.vertexCount++;
        break;

      case "MultiPoint":
        layout.points.featureCount++;
        layout.points.primCount += feature.geometry.coordinates.length;
        layout.points.vertexCount += feature.geometry.coordinates.length;
        break;

      case "LineString":
        layout.lines.featureCount++;
        layout.lines.primCount++;
        layout.lines.vertexCount += feature.geometry.coordinates.length;
        break;

      case "MultiLineString":
        layout.lines.featureCount++;
        layout.lines.primCount += feature.geometry.coordinates.length;
        for (const linestring of feature.geometry.coordinates) {
          layout.lines.vertexCount += linestring.length;
        }
        break;

      case "Polygon":
        layout.polygons.featureCount++;
        layout.polygons.primCount++;
        layout.polygons.holeCount += feature.geometry.coordinates.length - 1;
        for (const loop of feature.geometry.coordinates) {
          layout.polygons.vertexCount += loop.length;
        }
        break;

      case "MultiPolygon":
        layout.polygons.featureCount++;
        for (const polygon of feature.geometry.coordinates) {
          layout.polygons.primCount++;
          layout.polygons.holeCount += polygon.length - 1;
          for (const linestring of polygon) {
            layout.polygons.vertexCount += linestring.length;
          }
        }
        break;

      default:
        throw new Error(
          `Unsupported geometry type, "${feature.geometry.type}".`,
        );
    }
  }

  layout.featureCount =
    layout.points.featureCount +
    layout.lines.featureCount +
    layout.polygons.featureCount;

  return layout;
}

///////////////////////////////////////////////////////////////////////////////
// INIT

const viewer = new Cesium.Viewer("cesiumContainer");

let points, lines, polygons;

async function setCollection(path) {
  if (points) {
    viewer.scene.primitives.remove(points);
  }

  if (lines) {
    viewer.scene.primitives.remove(lines);
  }

  if (polygons) {
    viewer.scene.primitives.remove(polygons);
  }

  const result = await loadGeoJSON(path, { color: "random" });

  points = result.points;
  lines = result.lines;
  polygons = result.polygons;

  if (points) {
    viewer.scene.primitives.add(points);
  }

  if (lines) {
    viewer.scene.primitives.add(lines);
  }

  if (polygons) {
    viewer.scene.primitives.add(polygons);
  }
}

const options = [
  {
    text: "U.S. Highways",
    onselect: () => setCollection("../../SampleData/us_highways.json"),
  },
  {
    text: "U.S. States",
    onselect: () => setCollection("../../SampleData/us_states.json"),
  },
];

Sandcastle.addToolbarMenu(options);
