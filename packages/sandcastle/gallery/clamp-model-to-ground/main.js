import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  shadows: true,
});
const scene = viewer.scene;
const clock = viewer.clock;

viewer.camera.setView({
  destination: Cesium.Cartesian3.fromRadians(
    -1.3193669086512454,
    0.698810888305128,
    220,
  ),
  orientation: {
    heading: -1.3,
    pitch: -0.6,
    roll: 0,
  },
  endTransform: Cesium.Matrix4.IDENTITY,
});

let tileset;
try {
  tileset = await Cesium.Cesium3DTileset.fromIonAssetId(40866, {
    enableCollision: true,
  });
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

let entity, positionProperty;
try {
  const dataSource = await Cesium.CzmlDataSource.load(
    "../../SampleData/ClampToGround.czml",
  );
  viewer.dataSources.add(dataSource);
  entity = dataSource.entities.getById("CesiumMilkTruck");
  positionProperty = entity.position;
  entity.orientation = new Cesium.VelocityOrientationProperty(positionProperty);
} catch (error) {
  console.log(`Error loading CZML: ${error}`);
}

clock.shouldAnimate = true;

const clampingOptions = [
  {
    text: "Clamp to ground",
    onselect: () => {
      entity.model.uri =
        "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb";
      entity.model.scale = 2.5;
      entity.model.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
    },
  },
  {
    text: "Relative to ground",
    onselect: () => {
      entity.model.uri = "../../SampleData/models/CesiumAir/Cesium_Air.glb";
      entity.model.scale = 1.0;
      entity.model.heightReference = Cesium.HeightReference.RELATIVE_TO_GROUND;
    },
  },
  {
    text: "Clamp to terrain only",
    onselect: () => {
      entity.model.uri =
        "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb";
      entity.model.scale = 2.5;
      entity.model.heightReference = Cesium.HeightReference.CLAMP_TO_TERRAIN;
    },
  },
  {
    text: "Relative to terrain only",
    onselect: () => {
      entity.model.uri = "../../SampleData/models/CesiumAir/Cesium_Air.glb";
      entity.model.scale = 1.0;
      entity.model.heightReference = Cesium.HeightReference.RELATIVE_TO_TERRAIN;
    },
  },
  {
    text: "Clamp to 3D Tiles only",
    onselect: () => {
      entity.model.uri =
        "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb";
      entity.model.scale = 1.0;
      entity.model.heightReference = Cesium.HeightReference.CLAMP_TO_3D_TILE;
    },
  },
  {
    text: "Relative to 3D Tiles only",
    onselect: () => {
      entity.model.uri = "../../SampleData/models/CesiumAir/Cesium_Air.glb";
      entity.model.scale = 1.0;
      entity.model.heightReference = Cesium.HeightReference.RELATIVE_TO_3D_TILE;
    },
  },
  {
    text: "No clamping",
    onselect: () => {
      entity.model.uri = "../../SampleData/models/CesiumDrone/CesiumDrone.glb";
      entity.model.scale = 2.5;
      entity.model.heightReference = Cesium.HeightReference.NONE;
    },
  },
];

Sandcastle.addDefaultToolbarMenu(clampingOptions);

Sandcastle.addToggleButton("Show 3D tileset", tileset.show, (checked) => {
  tileset.show = checked;
});
Sandcastle.addToggleButton("Show globe", scene.globe.show, (checked) => {
  scene.globe.show = checked;
});
Sandcastle.addToggleButton(
  "Track entity",
  Cesium.defined(viewer.trackedEntity),
  (checked) => {
    viewer.trackedEntity = checked ? entity : undefined;
  },
);
