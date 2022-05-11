window.CESIUM_BASE_URL = "../../Source/";

import {
  Cartesian3,
  createWorldTerrain,
  defined,
  formatError,
  Math as CesiumMath,
  objectToQuery,
  queryToObject,
  CzmlDataSource,
  GeoJsonDataSource,
  KmlDataSource,
  GpxDataSource,
  TileMapServiceImageryProvider,
  Viewer,
  viewerCesiumInspectorMixin,
  viewerDragDropMixin,
} from "../../Build/CesiumUnminified/Cesium.js";

function main() {
  /*
     Options parsed from query string:
       source=url          The URL of a CZML/GeoJSON/KML data source to load at startup.
                           Automatic data type detection uses file extension.
       sourceType=czml/geojson/kml
                           Override data type detection for source.
       flyTo=false         Don't automatically fly to the loaded source.
       tmsImageryUrl=url   Automatically use a TMS imagery provider.
       lookAt=id           The ID of the entity to track at startup.
       stats=true          Enable the FPS performance display.
       inspector=true      Enable the inspector widget.
       debug=true          Full WebGL error reporting at substantial performance cost.
       theme=lighter       Use the dark-text-on-light-background theme.
       scene3DOnly=true    Enable 3D only mode.
       view=longitude,latitude,[height,heading,pitch,roll]
                           Automatically set a camera view. Values in degrees and meters.
                           [height,heading,pitch,roll] default is looking straight down, [300,0,-90,0]
       saveCamera=false    Don't automatically update the camera view in the URL when it changes.
     */
  const endUserOptions = queryToObject(window.location.search.substring(1));

  let imageryProvider;
  if (defined(endUserOptions.tmsImageryUrl)) {
    imageryProvider = new TileMapServiceImageryProvider({
      url: endUserOptions.tmsImageryUrl,
    });
  }

  const loadingIndicator = document.getElementById("loadingIndicator");
  let viewer;
  try {
    const hasBaseLayerPicker = !defined(imageryProvider);
    viewer = new Viewer("cesiumContainer", {
      imageryProvider: imageryProvider,
      baseLayerPicker: hasBaseLayerPicker,
      scene3DOnly: endUserOptions.scene3DOnly,
      requestRenderMode: true,
    });

    if (hasBaseLayerPicker) {
      const viewModel = viewer.baseLayerPicker.viewModel;
      viewModel.selectedTerrain = viewModel.terrainProviderViewModels[1];
    } else {
      viewer.terrainProvider = createWorldTerrain({
        requestWaterMask: true,
        requestVertexNormals: true,
      });
    }
  } catch (exception) {
    loadingIndicator.style.display = "none";
    const message = formatError(exception);
    console.error(message);
    if (!document.querySelector(".cesium-widget-errorPanel")) {
      //eslint-disable-next-line no-alert
      window.alert(message);
    }
    return;
  }

  viewer.extend(viewerDragDropMixin);
  if (endUserOptions.inspector) {
    viewer.extend(viewerCesiumInspectorMixin);
  }

  const showLoadError = function (name, error) {
    const title = `An error occurred while loading the file: ${name}`;
    const message =
      "An error occurred while loading the file, which may indicate that it is invalid.  A detailed error report is below:";
    viewer.cesiumWidget.showErrorPanel(title, message, error);
  };

  viewer.dropError.addEventListener(function (viewerArg, name, error) {
    showLoadError(name, error);
  });

  const scene = viewer.scene;
  const context = scene.context;
  if (endUserOptions.debug) {
    context.validateShaderProgram = true;
    context.validateFramebuffer = true;
    context.logShaderCompilation = true;
    context.throwOnWebGLError = true;
  }

  const view = endUserOptions.view;
  const source = endUserOptions.source;
  if (defined(source)) {
    let sourceType = endUserOptions.sourceType;
    if (!defined(sourceType)) {
      // autodetect using file extension if not specified
      if (/\.czml$/i.test(source)) {
        sourceType = "czml";
      } else if (
        /\.geojson$/i.test(source) ||
        /\.json$/i.test(source) ||
        /\.topojson$/i.test(source)
      ) {
        sourceType = "geojson";
      } else if (/\.kml$/i.test(source) || /\.kmz$/i.test(source)) {
        sourceType = "kml";
      } else if (/\.gpx$/i.test(source) || /\.gpx$/i.test(source)) {
        sourceType = "gpx";
      }
    }

    let loadPromise;
    if (sourceType === "czml") {
      loadPromise = CzmlDataSource.load(source);
    } else if (sourceType === "geojson") {
      loadPromise = GeoJsonDataSource.load(source);
    } else if (sourceType === "kml") {
      loadPromise = KmlDataSource.load(source, {
        camera: scene.camera,
        canvas: scene.canvas,
        screenOverlayContainer: viewer.container,
      });
    } else if (sourceType === "gpx") {
      loadPromise = GpxDataSource.load(source);
    } else {
      showLoadError(source, "Unknown format.");
    }

    if (defined(loadPromise)) {
      viewer.dataSources
        .add(loadPromise)
        .then(function (dataSource) {
          const lookAt = endUserOptions.lookAt;
          if (defined(lookAt)) {
            const entity = dataSource.entities.getById(lookAt);
            if (defined(entity)) {
              viewer.trackedEntity = entity;
            } else {
              const error = `No entity with id "${lookAt}" exists in the provided data source.`;
              showLoadError(source, error);
            }
          } else if (!defined(view) && endUserOptions.flyTo !== "false") {
            viewer.flyTo(dataSource);
          }
        })
        .catch(function (error) {
          showLoadError(source, error);
        });
    }
  }

  if (endUserOptions.stats) {
    scene.debugShowFramesPerSecond = true;
  }

  const theme = endUserOptions.theme;
  if (defined(theme)) {
    if (endUserOptions.theme === "lighter") {
      document.body.classList.add("cesium-lighter");
      viewer.animation.applyThemeChanges();
    } else {
      const error = `Unknown theme: ${theme}`;
      viewer.cesiumWidget.showErrorPanel(error, "");
    }
  }

  if (defined(view)) {
    const splitQuery = view.split(/[ ,]+/);
    if (splitQuery.length > 1) {
      const longitude = !isNaN(+splitQuery[0]) ? +splitQuery[0] : 0.0;
      const latitude = !isNaN(+splitQuery[1]) ? +splitQuery[1] : 0.0;
      const height =
        splitQuery.length > 2 && !isNaN(+splitQuery[2])
          ? +splitQuery[2]
          : 300.0;
      const heading =
        splitQuery.length > 3 && !isNaN(+splitQuery[3])
          ? CesiumMath.toRadians(+splitQuery[3])
          : undefined;
      const pitch =
        splitQuery.length > 4 && !isNaN(+splitQuery[4])
          ? CesiumMath.toRadians(+splitQuery[4])
          : undefined;
      const roll =
        splitQuery.length > 5 && !isNaN(+splitQuery[5])
          ? CesiumMath.toRadians(+splitQuery[5])
          : undefined;

      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
          heading: heading,
          pitch: pitch,
          roll: roll,
        },
      });
    }
  }

  const camera = viewer.camera;
  function saveCamera() {
    const position = camera.positionCartographic;
    let hpr = "";
    if (defined(camera.heading)) {
      hpr = `,${CesiumMath.toDegrees(camera.heading)},${CesiumMath.toDegrees(
        camera.pitch
      )},${CesiumMath.toDegrees(camera.roll)}`;
    }
    endUserOptions.view = `${CesiumMath.toDegrees(
      position.longitude
    )},${CesiumMath.toDegrees(position.latitude)},${position.height}${hpr}`;
    history.replaceState(undefined, "", `?${objectToQuery(endUserOptions)}`);
  }

  let timeout;
  if (endUserOptions.saveCamera !== "false") {
    camera.changed.addEventListener(function () {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(saveCamera, 1000);
    });
  }

  loadingIndicator.style.display = "none";
}

main();
