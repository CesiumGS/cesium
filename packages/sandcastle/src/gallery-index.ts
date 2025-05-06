import { GalleryDemo } from "./Gallery";

const gallery_demos: GalleryDemo[] = [
  {
    name: "3D Models",
    isNew: false,
    img: "3D Models.jpg",
    js: `const viewer = new Cesium.Viewer("cesiumContainer", {
  infoBox: false,
  selectionIndicator: false,
  shadows: true,
  shouldAnimate: true,
});

function createModel(url, height) {
  viewer.entities.removeAll();

  const position = Cesium.Cartesian3.fromDegrees(
    -123.0744619,
    44.0503706,
    height,
  );
  const heading = Cesium.Math.toRadians(135);
  const pitch = 0;
  const roll = 0;
  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

  const entity = viewer.entities.add({
    name: url,
    position: position,
    orientation: orientation,
    model: {
      uri: url,
      minimumPixelSize: 128,
      maximumScale: 20000,
    },
  });
  viewer.trackedEntity = entity;
}

const options = [
  {
    text: "Aircraft",
    onselect: function () {
      createModel("../../SampleData/models/CesiumAir/Cesium_Air.glb", 5000.0);
    },
  },
  {
    text: "Drone",
    onselect: function () {
      createModel("../../SampleData/models/CesiumDrone/CesiumDrone.glb", 150.0);
    },
  },
  {
    text: "Ground Vehicle",
    onselect: function () {
      createModel("../../SampleData/models/GroundVehicle/GroundVehicle.glb", 0);
    },
  },
  {
    text: "Hot Air Balloon",
    onselect: function () {
      createModel(
        "../../SampleData/models/CesiumBalloon/CesiumBalloon.glb",
        1000.0,
      );
    },
  },
  {
    text: "Milk Truck",
    onselect: function () {
      createModel(
        "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
        0,
      );
    },
  },
  {
    text: "Skinned Character",
    onselect: function () {
      createModel("../../SampleData/models/CesiumMan/Cesium_Man.glb", 0);
    },
  },
  {
    text: "Unlit Box",
    onselect: function () {
      createModel("../../SampleData/models/BoxUnlit/BoxUnlit.gltf", 10.0);
    },
  },
  {
    text: "Draco Compressed Model",
    onselect: function () {
      createModel(
        "../../SampleData/models/DracoCompressed/CesiumMilkTruck.gltf",
        0,
      );
    },
  },
  {
    text: "KTX2 Compressed Balloon",
    onselect: function () {
      if (!Cesium.FeatureDetection.supportsBasis(viewer.scene)) {
        window.alert(
          "This browser does not support Basis Universal compressed textures",
        );
      }
      createModel(
        "../../SampleData/models/CesiumBalloonKTX2/CesiumBalloonKTX2.glb",
        1000.0,
      );
    },
  },
  {
    text: "Instanced Box",
    onselect: function () {
      createModel("../../SampleData/models/BoxInstanced/BoxInstanced.gltf", 15);
    },
  },
];

Sandcastle.addToolbarMenu(options);`,
  },
  {
    name: "Billboards",
    isNew: false,
    img: "Billboards.jpg",
    js: `const viewer = new Cesium.Viewer("cesiumContainer");

function addBillboard() {
  Sandcastle.declare(addBillboard);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: "../images/Cesium_Logo_overlay.png",
    },
  });
}

function setBillboardProperties() {
  Sandcastle.declare(setBillboardProperties);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: "../images/Cesium_Logo_overlay.png", // default: undefined
      show: true, // default
      pixelOffset: new Cesium.Cartesian2(0, -50), // default: (0, 0)
      eyeOffset: new Cesium.Cartesian3(0.0, 0.0, 0.0), // default
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER, // default
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // default: CENTER
      scale: 2.0, // default: 1.0
      color: Cesium.Color.LIME, // default: WHITE
      rotation: Cesium.Math.PI_OVER_FOUR, // default: 0.0
      alignedAxis: Cesium.Cartesian3.ZERO, // default
      width: 100, // default: undefined
      height: 25, // default: undefined
    },
  });
}

function changeBillboardProperties() {
  Sandcastle.declare(changeBillboardProperties);

  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 300000.0),
    billboard: {
      image: "../images/Cesium_Logo_overlay.png",
    },
  });

  const billboard = entity.billboard;
  billboard.scale = 3.0;
  billboard.color = Cesium.Color.WHITE.withAlpha(0.25);
}

function sizeBillboardInMeters() {
  Sandcastle.declare(sizeBillboardInMeters);

  const entity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: "../images/Cesium_Logo_overlay.png",
      sizeInMeters: true,
    },
  });

  viewer.zoomTo(entity);
}

function addMultipleBillboards() {
  Sandcastle.declare(addMultipleBillboards);

  const logoUrl = "../images/Cesium_Logo_overlay.png";
  const facilityUrl = "../images/facility.gif";

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: logoUrl,
    },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-80.5, 35.14),
    billboard: {
      image: facilityUrl,
    },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-80.12, 25.46),
    billboard: {
      image: facilityUrl,
    },
  });
}

function scaleByDistance() {
  Sandcastle.declare(scaleByDistance);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: "../images/facility.gif",
      scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
    },
  });
}

function fadeByDistance() {
  Sandcastle.declare(fadeByDistance);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: "../images/Cesium_Logo_overlay.png",
      translucencyByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
    },
  });
}

function offsetByDistance() {
  Sandcastle.declare(offsetByDistance);
  Promise.all([
    Cesium.Resource.fetchImage("../images/Cesium_Logo_overlay.png"),
    Cesium.Resource.fetchImage("../images/facility.gif"),
  ]).then(function (images) {
    // As viewer zooms closer to facility billboard,
    // increase pixelOffset on CesiumLogo billboard to this height
    const facilityHeight = images[1].height;

    // colocated billboards, separate as viewer gets closer
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
      billboard: {
        image: images[1],
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      },
    });
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
      billboard: {
        image: images[0],
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0.0, -facilityHeight),
        pixelOffsetScaleByDistance: new Cesium.NearFarScalar(
          1.0e3,
          1.0,
          1.5e6,
          0.0,
        ),
        translucencyByDistance: new Cesium.NearFarScalar(1.0e3, 1.0, 1.5e6, 0.1),
      },
    });
  });
}

function addMarkerBillboards() {
  Sandcastle.declare(addMarkerBillboards);

  // Add several billboards based on the above image in the atlas.
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883),
    billboard: {
      image: "../images/whiteShapes.png",
      imageSubRegion: new Cesium.BoundingRectangle(49, 43, 18, 18),
      color: Cesium.Color.LIME,
    },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-84.0, 39.0),
    billboard: {
      image: "../images/whiteShapes.png",
      imageSubRegion: new Cesium.BoundingRectangle(61, 23, 18, 18),
      color: new Cesium.Color(0, 0.5, 1.0, 1.0),
    },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-70.0, 41.0),
    billboard: {
      image: "../images/whiteShapes.png",
      imageSubRegion: new Cesium.BoundingRectangle(67, 80, 14, 14),
      color: new Cesium.Color(0.5, 0.9, 1.0, 1.0),
    },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-73.0, 37.0),
    billboard: {
      image: "../images/whiteShapes.png",
      imageSubRegion: new Cesium.BoundingRectangle(27, 103, 22, 22),
      color: Cesium.Color.RED,
    },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-79.0, 35.0),
    billboard: {
      image: "../images/whiteShapes.png",
      imageSubRegion: new Cesium.BoundingRectangle(105, 105, 18, 18),
      color: Cesium.Color.YELLOW,
    },
  });
}

async function disableDepthTest() {
  Sandcastle.declare(disableDepthTest);

  viewer.scene.globe.depthTestAgainstTerrain = true;

  try {
    const worldTerrainProvider = await Cesium.createWorldTerrainAsync();

    // Return early in case a different option has been selected in the meantime
    if (!viewer.scene.globe.depthTestAgainstTerrain) {
      return;
    }

    viewer.terrainProvider = worldTerrainProvider;
  } catch (error) {
    window.alert(\`Failed to load terrain. \${error}\`);
  }

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-122.1958, 46.1915),
    billboard: {
      image: "../images/facility.gif",
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  viewer.scene.camera.setView({
    destination: new Cesium.Cartesian3(
      -2357576.243142461,
      -3744417.5604860787,
      4581807.855903771,
    ),
    orientation: new Cesium.HeadingPitchRoll(
      5.9920811504170475,
      -0.6032820429886212,
      6.28201303164098,
    ),
  });
}

Sandcastle.addToolbarMenu([
  {
    text: "Add billboard",
    onselect: function () {
      addBillboard();
      Sandcastle.highlight(addBillboard);
    },
  },
  {
    text: "Set billboard properties at creation",
    onselect: function () {
      setBillboardProperties();
      Sandcastle.highlight(setBillboardProperties);
    },
  },
  {
    text: "Change billboard properties",
    onselect: function () {
      changeBillboardProperties();
      Sandcastle.highlight(changeBillboardProperties);
    },
  },
  {
    text: "Size billboard in meters",
    onselect: function () {
      sizeBillboardInMeters();
      Sandcastle.highlight(sizeBillboardInMeters);
    },
  },
  {
    text: "Add multiple billboards",
    onselect: function () {
      addMultipleBillboards();
      Sandcastle.highlight(addMultipleBillboards);
    },
  },
  {
    text: "Scale by viewer distance",
    onselect: function () {
      scaleByDistance();
      Sandcastle.highlight(scaleByDistance);
    },
  },
  {
    text: "Fade by viewer distance",
    onselect: function () {
      fadeByDistance();
      Sandcastle.highlight(fadeByDistance);
    },
  },
  {
    text: "Offset by viewer distance",
    onselect: function () {
      offsetByDistance();
      Sandcastle.highlight(offsetByDistance);
    },
  },
  {
    text: "Add marker billboards",
    onselect: function () {
      addMarkerBillboards();
      Sandcastle.highlight(addMarkerBillboards);
    },
  },
  {
    text: "Disable the depth test when clamped to ground",
    onselect: function () {
      disableDepthTest();
      Sandcastle.highlight(disableDepthTest);
    },
  },
]);

Sandcastle.reset = async function () {
  viewer.camera.flyHome(0);
  viewer.entities.removeAll();
  viewer.scene.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  viewer.scene.globe.depthTestAgainstTerrain = false;
};
`,
  },
  {
    name: "Moon",
    isNew: false,
    img: "Moon.jpg",
    js: `// Set the ellipsoid to be the moon before creating the viewer
Cesium.Ellipsoid.default = Cesium.Ellipsoid.MOON;

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrainProvider: false,
  baseLayer: false,
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  geocoder: false,
  shadows: true,
});

const scene = viewer.scene;

// Add Moon Terrain 3D Tiles
try {
  const tileset1 = await Cesium.Cesium3DTileset.fromIonAssetId(2684829, {
    // Allow clamp to 3D Tiles
    enableCollision: true,
  });
  viewer.scene.primitives.add(tileset1);
} catch (error) {
  console.log(\`Error loading tileset: \${error}\`);
}

// Boundary data from https://wms.lroc.asu.edu/lroc/view_rdr/SHAPEFILE_LROC_GLOBAL_MARE
const boundariesResource = await Cesium.IonResource.fromAssetId(2683530);
const boundarySource = await Cesium.GeoJsonDataSource.load(boundariesResource, {
  clampToGround: true,
  fill: Cesium.Color.fromBytes(26, 106, 113).withAlpha(0.6),
});
boundarySource.show = false;
viewer.dataSources.add(boundarySource);

// Possible Artemis 3 landing locations. data from https://files.actgate.com/lunar/A3_Named_regions.geojson
const artemis3resource = await Cesium.IonResource.fromAssetId(2683531);
const artemis3Source = await Cesium.GeoJsonDataSource.load(artemis3resource, {
  clampToGround: true,
  fill: Cesium.Color.fromBytes(243, 242, 99).withAlpha(0.6),
});
artemis3Source.show = false;
viewer.dataSources.add(artemis3Source);

// Positions courtesy of https://www.sciencedirect.com/science/article/abs/pii/S0019103516301518?via%3Dihub
const pointsOfInterest = [
  {
    text: "Apollo 11",
    latitude: 0.67416,
    longitude: 23.47315,
  },
  {
    text: "Apollo 14",
    latitude: -3.64417,
    longitude: 342.52135,
  },
  {
    text: "Apollo 15",
    latitude: 26.13341,
    longitude: 3.6285,
  },
  {
    text: "Lunokhod 1",
    latitude: 38.2378,
    longitude: -35.0017,
  },
  {
    text: "Lunokhod 2",
    latitude: 25.83232,
    longitude: 30.92215,
  },
];

for (const poi of pointsOfInterest) {
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(poi.longitude, poi.latitude),
    label: {
      text: poi.text,
      font: "14pt Verdana",
      outlineColor: Cesium.Color.DARKSLATEGREY,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -22),
      scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.0, 1.5e7, 0.5),
      translucencyByDistance: new Cesium.NearFarScalar(2.5e7, 1.0, 4.0e7, 0.0),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: new Cesium.CallbackProperty(() => {
        return Cesium.Cartesian3.magnitude(scene.camera.positionWC);
      }, false),
    },
    point: {
      pixelSize: 10,
      color: Cesium.Color.fromBytes(243, 242, 99),
      outlineColor: Cesium.Color.fromBytes(219, 218, 111),
      outlineWidth: 2,
      scaleByDistance: new Cesium.NearFarScalar(1.5e3, 1.0, 4.0e7, 0.1),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: new Cesium.CallbackProperty(() => {
        return Cesium.Cartesian3.magnitude(scene.camera.positionWC);
      }, false),
    },
  });
}

const seaOfTranquility = {
  destination: new Cesium.Cartesian3(
    2134594.9298812235,
    1256488.0678322134,
    379606.9284823841,
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      -0.8518395698371783,
      -0.5014189063342804,
      -0.1514873843927112,
    ),
    up: new Cesium.Cartesian3(
      -0.13054959630640847,
      -0.07684549781463353,
      0.9884591910493093,
    ),
  },
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const apollo11 = {
  destination: new Cesium.Cartesian3(
    1609100.311044896,
    733266.0643925276,
    53608.976740262646,
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      -0.41704286323660256,
      -0.7222280712427744,
      -0.5517806297183315,
    ),
    up: new Cesium.Cartesian3(
      0.8621189850799429,
      -0.12210806245903304,
      -0.49177278965720556,
    ),
  },
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const copernicus = {
  destination: new Cesium.Cartesian3(
    1613572.8201475781,
    -677039.3827805589,
    339559.7958496013,
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      -0.10007925201262617,
      0.8771366500325052,
      -0.4696971795597116,
    ),
    up: new Cesium.Cartesian3(
      0.9948921707513932,
      0.08196514973381885,
      -0.058917593354560566,
    ),
  },
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const tycho = {
  destination: new Cesium.Cartesian3(
    1368413.3560818078,
    -166198.00035620513,
    -1203576.7397013502,
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      -0.8601315724135887,
      -0.5073902275496569,
      0.05223825345888711,
    ),
    up: new Cesium.Cartesian3(
      0.2639103814694499,
      -0.5303301783281616,
      -0.8056681776681204,
    ),
  },
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const shackleton = {
  destination: Cesium.Rectangle.fromBoundingSphere(
    new Cesium.BoundingSphere(
      new Cesium.Cartesian3(
        -17505.087036391753,
        38147.40236305639,
        -1769721.5748224584,
      ),
      40000.0,
    ),
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      0.2568703591904826,
      -0.6405212914728244,
      0.7237058060699372,
    ),
    up: new Cesium.Cartesian3(
      0.26770932874967773,
      -0.6723714327527822,
      -0.6901075073627064,
    ),
  },
  easingFunction: Cesium.EasingFunction.LINEAR_NONE,
};

const camera = viewer.scene.camera;
const rotationSpeed = Cesium.Math.toRadians(0.1);
const removeRotation = viewer.scene.postRender.addEventListener(
  function (scene, time) {
    viewer.scene.camera.rotateRight(rotationSpeed);
  },
);

const options1 = [
  {
    text: "Fly to...",
    onselect: () => {},
  },
  {
    text: "Sea of Tranquility",
    onselect: function () {
      removeRotation();
      scene.camera.flyTo(seaOfTranquility);
      artemis3Source.show = false;
    },
  },
  {
    text: "Apollo 11 Landing Site",
    onselect: () => {
      removeRotation();
      scene.camera.flyTo(apollo11);
      artemis3Source.show = false;
    },
  },
  {
    text: "Copernicus Crater",
    onselect: () => {
      removeRotation();
      scene.camera.flyTo(copernicus);
      artemis3Source.show = false;
    },
  },
  {
    text: "Tycho Crater",
    onselect: () => {
      removeRotation();
      scene.camera.flyTo(tycho);
      artemis3Source.show = false;
    },
  },
  {
    text: "Shackleton Crater (South Pole) and Artemis 3 landing options",
    onselect: () => {
      removeRotation();
      scene.camera.flyTo(shackleton);
      artemis3Source.show = true;
    },
  },
];
Sandcastle.addToolbarMenu(options1);

Sandcastle.addToggleButton("Show Mare Boundaries", false, function (checked) {
  boundarySource.show = checked;
});

// Spin the moon on first load but disable the spinning upon any input
const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(
  () => removeRotation(),
  Cesium.ScreenSpaceEventType.LEFT_DOWN,
);
handler.setInputAction(
  () => removeRotation(),
  Cesium.ScreenSpaceEventType.RIGHT_DOWN,
);
handler.setInputAction(
  () => removeRotation(),
  Cesium.ScreenSpaceEventType.MIDDLE_DOWN,
);
handler.setInputAction(() => removeRotation(), Cesium.ScreenSpaceEventType.WHEEL);

`,
    html: `<style>
  @import url(../templates/bucket.css);
  #toolbar {
    background: rgba(42, 42, 42, 0.8);
    padding: 4px;
    border-radius: 4px;
  }
  #toolbar input {
    vertical-align: middle;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  #toolbar .header {
    font-weight: bold;
  }
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar"></div>
`,
  },
  {
    name: "Terrain Exaggeration",
    isNew: false,
    img: "Terrain Exaggeration.jpg",
    js: `const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const scene = viewer.scene;
const globe = scene.globe;
scene.verticalExaggeration = 2.0;
scene.verticalExaggerationRelativeHeight = 2400.0;

scene.camera.setView({
  destination: new Cesium.Cartesian3(
    336567.0354790703,
    5664688.047602498,
    2923204.3566963132,
  ),
  orientation: new Cesium.HeadingPitchRoll(
    1.2273281382639265,
    -0.32239612370237514,
    0.0027207329018610338,
  ),
});

viewer.entities.add({
  position: new Cesium.Cartesian3(
    314557.3531714575,
    5659723.771882165,
    2923538.5417330978,
  ),
  ellipsoid: {
    radii: new Cesium.Cartesian3(400.0, 400.0, 400.0),
    material: Cesium.Color.RED,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
  },
});

let visualizeRelativeHeight = true;

function updateMaterial() {
  if (visualizeRelativeHeight) {
    const height = scene.verticalExaggerationRelativeHeight;
    const exaggeration = scene.verticalExaggeration;
    const alpha = Math.min(1.0, exaggeration * 0.25);
    const layer = {
      extendUpwards: true,
      extendDownwards: true,
      entries: [
        {
          height: height + 100.0,
          color: new Cesium.Color(0.0, 1.0, 0.0, alpha * 0.25),
        },
        {
          height: height + 50.0,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha * 0.5),
        },
        {
          height: height,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha),
        },
        {
          height: height - 50.0,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha * 0.5),
        },
        {
          height: height - 100.0,
          color: new Cesium.Color(1.0, 0.0, 0.0, alpha * 0.25),
        },
      ],
    };
    scene.globe.material = Cesium.createElevationBandMaterial({
      scene: scene,
      layers: [layer],
    });
  } else {
    scene.globe.material = undefined;
  }
}
updateMaterial();

const viewModel = {
  exaggeration: scene.verticalExaggeration,
  relativeHeight: scene.verticalExaggerationRelativeHeight,
};

function updateExaggeration() {
  scene.verticalExaggeration = Number(viewModel.exaggeration);
  scene.verticalExaggerationRelativeHeight = Number(viewModel.relativeHeight);
  updateMaterial();
}

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(updateExaggeration);
  }
}

Sandcastle.addToggleButton(
  "Visualize Relative Height",
  visualizeRelativeHeight,
  function (checked) {
    visualizeRelativeHeight = checked;
    updateMaterial();
  },
);

Sandcastle.addToolbarButton("Remove Exaggeration", function () {
  viewModel.exaggeration = 1.0;
  viewModel.relativeHeight = 0.0;
});
`,
    html: `<style>
  @import url(../templates/bucket.css);
  #toolbar {
    background: rgba(42, 42, 42, 0.8);
    padding: 4px;
    border-radius: 4px;
  }
  #toolbar input {
    vertical-align: middle;
    padding-top: 2px;
    padding-bottom: 2px;
  }
  #toolbar .header {
    font-weight: bold;
  }
</style>
<div id="cesiumContainer" class="fullSize"></div>
<div id="loadingOverlay"><h1>Loading...</h1></div>
<div id="toolbar">
  <table>
    <tbody>
      <tr>
        <td>Exaggeration</td>
        <td>
          <input type="range" min="0" max="10" step="0.01" data-bind="value: exaggeration, valueUpdate: 'input'">
          <input type="text" size="5" data-bind="value: exaggeration">
        </td>
      </tr>
      <tr>
        <td>Relative Height</td>
        <td>
          <input type="range" min="-1000" max="9000" step="1" data-bind="value: relativeHeight, valueUpdate: 'input'">
          <input type="text" size="5" data-bind="value: relativeHeight">
        </td>
      </tr>
    </tbody>
  </table>
</div>
`,
  },
];

export default gallery_demos;
