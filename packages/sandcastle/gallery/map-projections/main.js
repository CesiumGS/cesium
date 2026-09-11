import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const countriesUrl = "../../SampleData/CNTR_RG_60M_2024_4326.geojson";

let viewer;
let pickOverlay;
let pickHandler;

function createViewer(projection, cameraDestination) {
  if (viewer) {
    if (pickHandler) {
      pickHandler.destroy();
      pickHandler = undefined;
    }
    viewer.destroy();
  }

  viewer = new Cesium.Viewer("cesiumContainer", {
    mapProjection: projection,
    sceneMode: Cesium.SceneMode.COLUMBUS_VIEW,
    baseLayerPicker: false,
    skyBox: false,
    skyAtmosphere: false,
  });

  // Use globe for mouse picking but make it transparent
  // so the GeoJSON polygons are visible underneath
  viewer.imageryLayers.removeAll();
  viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT;
  viewer.scene.globe.translucency.enabled = true;
  viewer.scene.globe.translucency.frontFaceAlpha = 0.0;
  viewer.scene.globe.showGroundAtmosphere = false;
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#1e3a5f");

  // Disable sun lighting so polygon fills render as flat, uniform
  // colors instead of being shaded by the default DirectionalLight.
  viewer.scene.light = new Cesium.DirectionalLight({
    direction: new Cesium.Cartesian3(0, 0, -1),
    intensity: 0,
  });

  const sscc = viewer.scene.screenSpaceCameraController;
  sscc.minimumZoomDistance = 250;
  sscc.maximumZoomDistance = 50000000;
  sscc.zoomFactor = 1.0;

  Cesium.GeoJsonDataSource.load(countriesUrl, {
    fill: Cesium.Color.fromCssColorString("#e8dcc8"),
    stroke: Cesium.Color.fromCssColorString("#e0e0e0"),
    strokeWidth: 1.0,
  }).then(function (ds) {
    viewer.dataSources.add(ds);
    const entities = ds.entities.values;
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].polygon) {
        entities[i].polygon.height = 100;
        entities[i].polygon.material =
          Cesium.Color.fromCssColorString("#e8dcc8");
        // Override GeoJsonDataSource's default ArcType.RHUMB — rhumb
        // line subdivision diverges at the pole (Antarctica at lat=-90°)
        // and causes "Too many properties to enumerate" in the worker.
        entities[i].polygon.arcType = Cesium.ArcType.GEODESIC;
      }
    }
  });

  addTestPrimitives();
  addPickOverlay();

  viewer.camera.setView({
    destination:
      cameraDestination || Cesium.Cartesian3.fromDegrees(10, 35, 15000000),
  });
}

// Picking verification overlay — shows the primitive under the cursor
// and the geographic coordinates from Camera#pickEllipsoid. Used to
// verify that picking works correctly under non-cylindrical projections.
function addPickOverlay() {
  if (!pickOverlay) {
    pickOverlay = document.createElement("div");
    pickOverlay.className = "infoPanel";
    pickOverlay.style.cssText =
      "display:inline-block;margin-left:10px;" +
      "font:12px monospace;min-width:220px;" +
      "vertical-align:middle;";
    pickOverlay.textContent = "Move mouse over the map…";
    document.getElementById("toolbar").appendChild(pickOverlay);
  }

  pickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  pickHandler.setInputAction((movement) => {
    const scene = viewer.scene;
    const picked = scene.pick(movement.endPosition);

    let pickedLabel = "(none)";
    if (picked) {
      if (picked.id && picked.id instanceof Cesium.Entity) {
        pickedLabel = picked.id.name || picked.id.id || "entity";
      } else if (picked.primitive) {
        pickedLabel = picked.primitive.constructor.name;
      }
    }

    const cartesian = viewer.camera.pickEllipsoid(
      movement.endPosition,
      scene.globe.ellipsoid,
    );
    let coordsLabel = "no ellipsoid intersection";
    if (cartesian) {
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(3);
      const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(3);
      coordsLabel = `${lon}°, ${lat}°`;
    }

    pickOverlay.innerHTML =
      `<b>Picked:</b> ${pickedLabel}<br>` + `<b>Lon/Lat:</b> ${coordsLabel}`;
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

// Low-level Primitive tests — exercises PrimitivePipeline worker
// serialization with the custom projection.
function addTestPrimitives() {
  // Polygon Primitive — red rectangle over Scandinavia
  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray([5, 55, 25, 55, 25, 68, 5, 68]),
          ),
          height: 200,
          // Coarse granularity — see note above on GeoJSON polygons.
          granularity: Math.PI / 8,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.RED.withAlpha(0.4),
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
      }),
    }),
  );

  // Polyline Primitive — Madrid → Paris → Berlin → Moscow
  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: Cesium.Cartesian3.fromDegreesArrayHeights([
            -3.7, 40.4, 300, 2.35, 48.86, 300, 13.4, 52.5, 300, 37.6, 55.75,
            300,
          ]),
          width: 3.0,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.CYAN,
          ),
        },
      }),
      appearance: new Cesium.PolylineColorAppearance(),
    }),
  );

  // Extruded polygon — 3D volume to verify Columbus View rendering
  const volumeHierarchy = new Cesium.PolygonHierarchy(
    Cesium.Cartesian3.fromDegreesArray([9, 48, 12, 48, 12, 51, 9, 51]),
  );
  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.PolygonGeometry({
          polygonHierarchy: volumeHierarchy,
          height: 0,
          extrudedHeight: 500000,
          // Coarse granularity — see note above on GeoJSON polygons.
          granularity: Math.PI / 8,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.ORANGE.withAlpha(0.6),
          ),
        },
      }),
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: true,
      }),
    }),
  );

  // Extruded polygon outline — built from PolylineGeometry instances
  // because PolygonOutlineGeometry uses gl.LINES which WebGL clamps to
  // 1 pixel width. Polylines support arbitrary thickness.
  const outlineColor = Cesium.ColorGeometryInstanceAttribute.fromColor(
    Cesium.Color.BLACK,
  );
  const outlineWidth = 3.0;
  const bottomRing = Cesium.Cartesian3.fromDegreesArrayHeights([
    9, 48, 0, 12, 48, 0, 12, 51, 0, 9, 51, 0, 9, 48, 0,
  ]);
  const topRing = Cesium.Cartesian3.fromDegreesArrayHeights([
    9, 48, 500000, 12, 48, 500000, 12, 51, 500000, 9, 51, 500000, 9, 48, 500000,
  ]);
  const verticals = [
    [9, 48],
    [12, 48],
    [12, 51],
    [9, 51],
  ].map(([lon, lat]) =>
    Cesium.Cartesian3.fromDegreesArrayHeights([lon, lat, 0, lon, lat, 500000]),
  );

  const outlineInstances = [bottomRing, topRing, ...verticals].map(
    (positions) =>
      new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: positions,
          width: outlineWidth,
          vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
        }),
        attributes: { color: outlineColor },
      }),
  );

  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: outlineInstances,
      appearance: new Cesium.PolylineColorAppearance(),
    }),
  );
}

// Projection definitions
function lambertEurope() {
  createViewer(
    new Cesium.Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs",
    }),
    Cesium.Cartesian3.fromDegrees(10, 52, 8000000),
  );
}

function lambertUsa() {
  createViewer(
    new Cesium.Proj4Projection({
      sourceProjection:
        "+proj=laea +lat_0=45 +lon_0=-100 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs",
    }),
    Cesium.Cartesian3.fromDegrees(-100, 40, 10000000),
  );
}

function geographic() {
  createViewer(new Cesium.GeographicProjection());
}

function webMercator() {
  createViewer(new Cesium.WebMercatorProjection());
}

function mollweide() {
  createViewer(
    new Cesium.Proj4Projection({
      sourceProjection:
        "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
    }),
  );
}

function robinson() {
  createViewer(
    new Cesium.Proj4Projection({
      sourceProjection:
        "+proj=robin +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
    }),
  );
}

function equalEarth() {
  createViewer(
    new Cesium.Proj4Projection({
      sourceProjection:
        "+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
    }),
  );
}

Sandcastle.addToolbarMenu([
  { text: "Lambert Europe (EPSG:3035)", onselect: lambertEurope },
  { text: "Lambert USA (EPSG:9311)", onselect: lambertUsa },
  { text: "Geographic (EPSG:4326)", onselect: geographic },
  { text: "Web Mercator (EPSG:3857)", onselect: webMercator },
  { text: "Mollweide", onselect: mollweide },
  { text: "Robinson", onselect: robinson },
  { text: "Equal Earth", onselect: equalEarth },
]);

// Initialize with the first option
lambertEurope();
