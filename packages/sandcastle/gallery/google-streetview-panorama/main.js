import * as Cesium from "cesium";

const HEIGHT_THRESHOLD = 9000;

const googleStreetViewStaticApiKey = "key for Google Street View Static API";
const googleMapTilesApiKey = "key for Google Map Tiles API";

const ViewType = Object.freeze({
  MapView: 0,
  PanoView: 1,
});
let selectedViewType = ViewType.MapView;

const PanoType = Object.freeze({
  Equirectangular: 0,
  CubeMap: 1,
});
let selectedPanoType = PanoType.Equirectangular;

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

const provider =
  await Cesium.GoogleStreetViewEquirectangularPanoramaProvider.fromUrl({
    apiKey: googleMapTilesApiKey,
  });

const cubeMapProvider =
  await Cesium.GoogleStreetViewCubeMapPanoramaProvider.fromUrl({
    apiKey: googleStreetViewStaticApiKey,
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
    .getNearestPanoId(positionCartographic)
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

function selectPano(position) {
  const carto = Cesium.Cartographic.fromCartesian(position);
  provider.getPanoIds(carto).then((panoIdList) => {
    const panoId = panoIdList[0];
    provider.getPanoIdMetadata(panoId).then((panoIdMetadata) => {
      const panoLat = panoIdMetadata.lat;
      const panoLng = panoIdMetadata.lng;
      const height = carto.height;

      provider.loadPanoramaFromPanoId(panoId, 3).then((streetViewPanorama) => {
        viewer.scene.primitives.add(streetViewPanorama);

        const lookPosition = Cesium.Cartesian3.fromDegrees(
          panoLng,
          panoLat,
          height + 2,
        );

        const heading = Cesium.Math.toRadians(panoIdMetadata.heading);

        goToPanoView({
          position: lookPosition,
          heading,
        });
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
      if (selectedPanoType === PanoType.CubeMap) {
        selectPanoCubeMap(position);
      } else {
        selectPano(position);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Function to disable picking
function disablePicking() {
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
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

function createDropdown(options, initialIndex = 0) {
  const select = document.createElement("select");
  select.className = "cesium-button";

  options.forEach((opt, index) => {
    const option = document.createElement("option");
    option.text = opt.text;
    option.value = index;
    select.add(option);
  });

  // Set initial selection
  select.selectedIndex = initialIndex;

  select.onchange = () => {
    options[select.selectedIndex].onselect();
  };

  toolbar.appendChild(select);
  return select;
}

function setPanoViewToolBar() {
  if (Cesium.defined(panoTypeDropdown)) {
    panoTypeDropdown.remove();
    panoTypeDropdown = undefined;
  }

  photorealisticTilesToggle = createButton(
    "Toggle Photorealistic Tiles",
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

  panoTypeDropdown = createDropdown(
    [
      {
        text: "Equirectangular Panorama Tiles",
        onselect: function () {
          selectedPanoType = PanoType.Equirectangular;
        },
      },
      {
        text: "Cube Map Panorama",
        onselect: function () {
          selectedPanoType = PanoType.CubeMap;
        },
      },
    ],
    selectedPanoType,
  );
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

showTopModal("Zoom in closer to select Streetview imagery");
