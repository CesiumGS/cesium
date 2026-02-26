import * as Cesium from "cesium";

const HEIGHT_THRESHOLD = 7000;
const PANO_SEARCH_RADIUS = 5;

const ViewType = Object.freeze({
  MapView: 0,
  PanoView: 1,
});
let selectedViewType = ViewType.MapView;

const streetviewOverlay = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.Google2DImageryProvider.fromIonAssetId({
    assetId: 3830184,
    overlayLayerType: "layerStreetview",
  }),
);

const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  baseLayer: false,
  baseLayerPicker: false,
  geocoder: Cesium.IonGeocodeProviderType.GOOGLE,
  timeline: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  homeButton: false,
  terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
});
viewer.geocoder.viewModel.keepExpanded = true;

const satelliteWithLabelsOverlay = viewer.imageryLayers.addImageryProvider(
  await Cesium.IonImageryProvider.fromAssetId(3830183),
);

const tileset = await Cesium.createGooglePhotorealistic3DTileset({
  // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
  onlyUsingWithGoogleGeocoder: true,
});
tileset.show = false;
viewer.scene.primitives.add(tileset);

const ionResponse = await Cesium.Resource.fetchJson({
  url: `${Cesium.Ion.defaultServer}/experimental/panoramas/google`,
  headers: {
    Authorization: `Bearer ${Cesium.Ion.defaultAccessToken}`,
  },
});

const cubeMapProvider =
  await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
    apiKey: ionResponse.options.key,
    url: ionResponse.options.url,
  });

let savedLng = 0;
let savedLat = 0;
let savedHeight = 25000000.0;
let savedHeading = Cesium.Math.toRadians(0.0);
let savedPitch = Cesium.Math.toRadians(-90.0); // looking straight down
let savedRoll = 0.0;
let position;

function saveCameraView(viewer) {
  const camera = viewer.camera;

  const carto = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC);

  savedLng = Cesium.Math.toDegrees(carto.longitude);
  savedLat = Cesium.Math.toDegrees(carto.latitude);
  savedHeight = carto.height;
  savedHeading = camera.heading;
  savedPitch = camera.pitch;
  savedRoll = camera.roll;
}

function selectPanoCubeMap(position) {
  const positionCartographic = Cesium.Cartographic.fromCartesian(position);
  cubeMapProvider
    .getNearestPanoId(positionCartographic, PANO_SEARCH_RADIUS)
    .then((panoIdObject) => {
      const { panoId, latitude, longitude } = panoIdObject;
      const height = positionCartographic.height;
      const panoCartographic = Cesium.Cartographic.fromDegrees(
        longitude,
        latitude,
        0,
      );

      cubeMapProvider
        .loadPanorama({ cartographic: panoCartographic, panoId })
        .then((cityPano) => {
          viewer.scene.primitives.add(cityPano);

          const lookPosition = Cesium.Cartesian3.fromDegrees(
            longitude,
            latitude,
            height + 2,
          );

          const heading = Cesium.Math.toRadians(-90);

          goToPanoView({
            position: lookPosition,
            heading,
          });
        });
    });
}

const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

// Function to enable picking
function enablePicking() {
  handler.setInputAction((click) => {
    const height = viewer.camera.positionCartographic.height;

    if (height > HEIGHT_THRESHOLD) {
      // too zoomed out — ignore clicks
      return;
    }

    saveCameraView(viewer);
    position = viewer.scene.pickPosition(click.position);
    if (Cesium.defined(position)) {
      selectPanoCubeMap(position);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Function to disable picking
function disablePicking() {
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

const minFov = Cesium.Math.toRadians(20.0);
const maxFov = Cesium.Math.toRadians(100.0);
const zoomSpeed = 0.05;

// Function to enable narrowing the field of view with the mouse wheel when in panorama view
function enableFieldOfViewAdjustment() {
  handler.setInputAction(function (movement) {
    const camera = viewer.camera;
    const frustum = camera.frustum;

    let fov = frustum.fov;

    // Wheel direction
    const delta = movement;

    if (delta < 0) {
      fov *= 1.0 + zoomSpeed; // zoom out
    } else {
      fov *= 1.0 - zoomSpeed; // zoom in
    }

    // Clamp FOV
    fov = Cesium.Math.clamp(fov, minFov, maxFov);

    frustum.fov = fov;
  }, Cesium.ScreenSpaceEventType.WHEEL);
}

// Function to disable field of view adjustment
function disableFieldOfViewAdjustment() {
  handler.removeInputAction(Cesium.ScreenSpaceEventType.WHEEL);
}

function goToPanoView(options) {
  const { position, heading } = options;

  selectedViewType = ViewType.PanoView;
  viewer.scene.globe.show = false;

  viewer.scene.camera.lookAt(
    position,
    new Cesium.HeadingPitchRange(
      heading, // heading
      0, // pitch
      2, // small offset to allow rotation
    ),
  );

  viewer.scene.screenSpaceCameraController.enableZoom = false;
  enableFieldOfViewAdjustment();
  streetviewOverlay.show = false;
  disablePicking();
  removeTopModal();
  setPanoViewToolBar();
}

function returnToMap() {
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(savedLng, savedLat, savedHeight), // 25,000 km altitude
    orientation: {
      heading: savedHeading,
      pitch: savedPitch, // looking straight down
      roll: savedRoll,
    },
    duration: 0,
  });
  selectedViewType = ViewType.MapView;
  viewer.scene.globe.show = true;
  tileset.show = true;
  streetviewOverlay.show = true;
  viewer.scene.screenSpaceCameraController.enableZoom = true;
  disableFieldOfViewAdjustment();
  const primitives = viewer.scene.primitives;
  // Iterate in reverse to avoid index issues when removing
  for (let i = primitives.length - 1; i >= 0; i--) {
    const primitive = primitives.get(i);
    const remove =
      primitive instanceof Cesium.EquirectangularPanorama ||
      primitive instanceof Cesium.CubeMapPanorama;
    if (remove) {
      primitives.remove(primitive);
    }
  }
  showTopModal(
    "Highlighted locations indicate available Street View imagery. Click to select.",
  );
  setMapViewToolBar();
}

let photorealisticTilesToggle;
let panoTypeDropdown;
let returnToMapButton;

const toolbar = document.getElementById("toolbar");

function createButton(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.className = "cesium-button";
  btn.onclick = onClick;
  toolbar.appendChild(btn);
  return btn;
}

function setPanoViewToolBar() {
  if (Cesium.defined(panoTypeDropdown)) {
    panoTypeDropdown.remove();
    panoTypeDropdown = undefined;
  }

  photorealisticTilesToggle = createButton(
    "Toggle Google Photorealistic 3D Tiles",
    function () {
      if (selectedViewType === ViewType.MapView) {
        return;
      }
      tileset.show = !tileset.show;
    },
  );

  returnToMapButton = createButton("Return to map", async function () {
    viewer.scene.terrainProvider =
      await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
    viewer.scene.skyBox = Cesium.SkyBox.createEarthSkyBox();
    returnToMap();
    enablePicking();
  });
}

function setMapViewToolBar() {
  if (Cesium.defined(photorealisticTilesToggle)) {
    photorealisticTilesToggle.remove();
    photorealisticTilesToggle = undefined;
  }

  if (Cesium.defined(returnToMapButton)) {
    returnToMapButton.remove();
    returnToMapButton = undefined;
  }
}

enablePicking();
setMapViewToolBar();

let modalElement;

function showTopModal(message) {
  // prevent duplicates
  if (modalElement) {
    return;
  }

  modalElement = document.createElement("div");
  modalElement.textContent = message;

  Object.assign(modalElement.style, {
    position: "absolute",
    top: "50px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.8)",
    color: "white",
    padding: "10px 16px",
    borderRadius: "6px",
    fontFamily: "sans-serif",
    fontSize: "14px",
    zIndex: 9999,
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    pointerEvents: "none", // clicks pass through
  });

  document.getElementById("cesiumContainer").appendChild(modalElement);
}

function removeTopModal() {
  if (modalElement) {
    modalElement.remove();
    modalElement = null;
  }
}

viewer.camera.changed.addEventListener(() => {
  if (selectedViewType === ViewType.PanoView) {
    return;
  }

  const height = viewer.camera.positionCartographic.height;
  if (height < HEIGHT_THRESHOLD) {
    satelliteWithLabelsOverlay.show = false;
    tileset.show = true;
    if (!tileset.imageryLayers.contains(streetviewOverlay)) {
      tileset.imageryLayers.add(streetviewOverlay);
    }

    removeTopModal();
    showTopModal(
      "Highlighted locations indicate available Street View imagery. Click to select.",
    );
  }

  if (height >= HEIGHT_THRESHOLD) {
    tileset.show = false;
    tileset.imageryLayers.remove(streetviewOverlay, false);
    satelliteWithLabelsOverlay.show = true;
    removeTopModal();
    showTopModal("Zoom in closer to select Streetview imagery");
  }
});

// City extents (west, south, east, north)
const cityRectangles = {
  "Los Angeles": [-118.5, 34.0, -118.47, 34.03],
  "New York": [-74.02, 40.7, -73.97, 40.75],
  London: [-0.15, 51.5, -0.1, 51.53],
  Tokyo: [139.74, 35.67, 139.79, 35.71],
};

function createCityDropdown() {
  const select = document.createElement("select");
  select.className = "cesium-button";

  // Default option
  const defaultOption = document.createElement("option");
  defaultOption.textContent = "Select City";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  select.appendChild(defaultOption);

  // Add city options
  Object.keys(cityRectangles).forEach((cityName) => {
    const option = document.createElement("option");
    option.value = cityName;
    option.textContent = cityName;
    select.appendChild(option);
  });

  select.onchange = function () {
    const rectangle = cityRectangles[this.value];

    if (!rectangle) {
      return;
    }

    // Ensure we're in map view
    if (selectedViewType === ViewType.PanoView) {
      viewer.scene.skyBox = Cesium.SkyBox.createEarthSkyBox();
      returnToMap();
      enablePicking();
    }

    viewer.scene.camera.flyTo({
      duration: 0,
      destination: Cesium.Rectangle.fromDegrees(
        rectangle[0],
        rectangle[1],
        rectangle[2],
        rectangle[3],
      ),
    });
  };

  toolbar.appendChild(select);
}

createCityDropdown();

viewer.scene.camera.flyTo({
  duration: 0,
  destination: new Cesium.Rectangle.fromDegrees(
    ...cityRectangles["Los Angeles"],
  ),
});
