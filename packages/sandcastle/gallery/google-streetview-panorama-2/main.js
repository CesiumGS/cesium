import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const assetId = 3830184;
const HEIGHT_THRESHOLD = 9000;

let cubeMapPano = false;

const overlay = Cesium.ImageryLayer.fromProviderAsync(
  Cesium.Google2DImageryProvider.fromIonAssetId({
    assetId,
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

const tileset = await Cesium.createGooglePhotorealistic3DTileset({
  // Only the Google Geocoder can be used with Google Photorealistic 3D Tiles.  Set the `geocode` property of the viewer constructor options to IonGeocodeProviderType.GOOGLE.
  onlyUsingWithGoogleGeocoder: true,
  //show: false,
});
viewer.scene.primitives.add(tileset);

const apiKey = "Google Streetview Tiles API Key";

const provider = await Cesium.GoogleStreetViewProvider.fromUrl({
  apiKey,
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
  const carto = Cesium.Cartographic.fromCartesian(position);

  const panoLat = Cesium.Math.toDegrees(carto.latitude);
  const panoLng = Cesium.Math.toDegrees(carto.longitude);
  const height = carto.height;
  const pos = [panoLat, panoLng]; //lat,lng Aukland
  const posString = pos.join(",");
  const posObj = Cesium.Cartesian3.fromDegrees(pos[1], pos[0], 0);

  const baseUrl = "https://maps.googleapis.com/maps/api/streetview";
  function pUrl(h, p) {
    const r = new Cesium.Resource({
      url: baseUrl,
      queryParameters: {
        size: "600x600",
        location: posString,
        heading: h,
        pitch: p,
        key: "Google Streetview API Key",
      },
    });
    return r.url;
  }

  const positiveX = pUrl(0, 0);
  const negativeX = pUrl(180, 0);
  const positiveZ = pUrl(270, 0);
  const negativeZ = pUrl(90, 0);
  const positiveY = pUrl(-90, -90);
  const negativeY = pUrl(-90, 90);

  const cityPano = new Cesium.CubeMapPanorama({
    sources: {
      positiveX,
      negativeX,
      positiveY,
      negativeY,
      positiveZ,
      negativeZ,
    },
  });

  viewer.scene.primitives.add(cityPano);

  Cesium.Transforms.northDownEastToFixedFrame =
    Cesium.Transforms.localFrameToFixedFrameGenerator("north", "down");

  Cesium.Transforms.computeTemeToPseudoFixedMatrix = (time, result) =>
    Cesium.Matrix4.getMatrix3(
      Cesium.Transforms.northDownEastToFixedFrame(
        posObj,
        Cesium.Ellipsoid.default,
      ),
      result,
    );

  const lookPosition = Cesium.Cartesian3.fromDegrees(
    panoLng,
    panoLat,
    height + 2,
  );

  viewer.scene.camera.lookAt(
    lookPosition,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(-90), // heading
      0, // pitch
      2, // small offset to allow rotation
    ),
  );
  viewer.scene.screenSpaceCameraController.enableZoom = false;
  overlay.show = false;
  disablePicking();
  viewer.scene.globe.show = false;
}

function selectPano(position) {
  const carto = Cesium.Cartographic.fromCartesian(position);

  provider.getPanoIds({ cartographic: carto }).then((panoIds) => {
    console.log(panoIds);

    provider
      .getPanoIdMetadata({
        panoId: panoIds.panoIds[0],
      })
      .then((panoIdMetadata) => {
        const panoLat = panoIdMetadata.lat;
        const panoLng = panoIdMetadata.lng;
        const height = carto.height;

        provider
          .loadPanoramafromPanoId({
            zInput: 3,
            panoId: panoIds.panoIds[0],
          })
          .then((streetViewPanorama) => {
            viewer.scene.primitives.add(streetViewPanorama);

            const position = Cesium.Cartesian3.fromDegrees(
              panoLng,
              panoLat,
              height + 2,
            );

            viewer.scene.camera.lookAt(
              position,
              new Cesium.HeadingPitchRange(
                Cesium.Math.toRadians(panoIdMetadata.heading), // heading
                0, // pitch
                2, // small offset to allow rotation
              ),
            );
            viewer.scene.screenSpaceCameraController.enableZoom = false;
            overlay.show = false;
            disablePicking();
            viewer.scene.globe.show = false;
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
      if (cubeMapPano) {
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
  viewer.scene.globe.show = true;
  tileset.show = true;
  overlay.show = true;
  viewer.scene.screenSpaceCameraController.enableZoom = true;
  const primitives = viewer.scene.primitives;
  // Iterate in reverse to avoid index issues when removing
  for (let i = primitives.length - 1; i >= 0; i--) {
    const primitive = primitives.get(i);
    if (primitive instanceof Cesium.PanoramaCollection) {
      primitives.remove(primitive);
    }
  }
}

Sandcastle.addToolbarButton("Return to map", async function () {
  viewer.scene.terrainProvider =
    await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
  viewer.scene.skyBox = Cesium.SkyBox.createEarthSkyBox();
  returnToMap();
  enablePicking();
});

Sandcastle.addToolbarButton("Toggle Photorealistic Tiles", function () {
  if (tileset.show) {
    tileset.show = false;
  } else {
    tileset.show = true;
  }
});

enablePicking();

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
    top: "10px",
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

let overlayAdded = false;

viewer.camera.changed.addEventListener(() => {
  const height = viewer.camera.positionCartographic.height;

  if (height < HEIGHT_THRESHOLD && !overlayAdded) {
    overlayAdded = true;
    tileset.imageryLayers.add(overlay);
    removeTopModal();
  }

  if (height >= HEIGHT_THRESHOLD && overlayAdded) {
    tileset.imageryLayers.remove(overlay, false);
    overlayAdded = false;
    showTopModal("Zoom in closer to select Streetview imagery");
  }
});

showTopModal("Zoom in closer to select Streetview imagery");

Sandcastle.addToggleButton("Cube Map Pano", cubeMapPano, function (checked) {
  cubeMapPano = checked;
});
