import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
  sceneModePicker: false
});

// Load satellite data
const ds = await Cesium.CzmlDataSource.load("../../SampleData/TwoSats.czml");

const sat1 = ds.entities.getById("Satellite/Satellite1");
const sat2 = ds.entities.getById("Satellite/Satellite2");
sat1.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);
sat2.viewFrom = new Cesium.Cartesian3(-2000.0, -40000.0, 2000.0);

// Load vehicle data
const dsVehicle = await Cesium.CzmlDataSource.load(
  "../../SampleData/VehicleAndHelicopter.czml",
);

const vehicle = dsVehicle.entities.getById("Vehicle");
const helicopter = dsVehicle.entities.getById("Helicopter");
vehicle.viewFrom = new Cesium.Cartesian3(0.0, -2000.0, 500.0);
helicopter.viewFrom = new Cesium.Cartesian3(0.0, -2000.0, 500.0);
vehicle.billboard.image = Cesium.buildModuleUrl("Assets/Textures/maki/car.png");
vehicle.billboard.scale = 0.5;
helicopter.billboard.image = Cesium.buildModuleUrl(
  "Assets/Textures/maki/heliport.png",
);
helicopter.billboard.scale = 0.5;

// Satellite view functions
function sat1View() {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(ds);
  sat1.show = true;
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  sat1.path.relativeTo = undefined;
  sat2.path.relativeTo = sat1.id;
  viewer.trackedEntity = sat1;
}

function sat2View() {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(ds);
  sat1.show = true;
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  sat2.path.relativeTo = undefined;
  sat1.path.relativeTo = sat2.id;
  viewer.trackedEntity = sat2;
}

function bothView() {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(ds);
  sat1.show = true;
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  sat1.path.relativeTo = undefined;
  sat2.path.relativeTo = undefined;
  viewer.trackedEntity = sat1;
}

function earthView() {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(ds);
  sat1.show = true;
  sat1.path.relativeTo = undefined;
  sat2.path.relativeTo = undefined;
  viewer.trackedEntity = undefined;
  viewer.camera.frustum.fov = Cesium.Math.toRadians(15);
  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-150, 60, 1e8),
  });
}

// Vehicle view functions
function vehicleView() {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(dsVehicle);
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  vehicle.path.relativeTo = undefined;
  helicopter.path.relativeTo = vehicle.id;
  viewer.trackedEntity = vehicle;
}

function helicopterView() {
  viewer.dataSources.removeAll();
  viewer.dataSources.add(dsVehicle);
  viewer.camera.frustum.fov = Cesium.Math.toRadians(55);
  helicopter.path.relativeTo = undefined;
  vehicle.path.relativeTo = helicopter.id;
  viewer.trackedEntity = helicopter;
}

// Mode buttons
Sandcastle.addDefaultToolbarButton("Satellites", function () {
  satMenuContainer.style.display = "";
  vehMenuContainer.style.display = "none";
  const select = satMenuContainer.querySelector("select");
  if (select) {
    select.selectedIndex = 0;
  }
  sat1View();
});

Sandcastle.addToolbarButton("Vehicle", function () {
  satMenuContainer.style.display = "none";
  vehMenuContainer.style.display = "";
  const select = vehMenuContainer.querySelector("select");
  if (select) {
    select.selectedIndex = 0;
  }
  vehicleView();
});

// Create containers for the dropdown menus
const toolbar = document.getElementById("toolbar");

const satMenuContainer = document.createElement("span");
satMenuContainer.id = "satMenu";
const satLabel = document.createElement("span");
satLabel.textContent = "Draw paths relative to: ";
satMenuContainer.appendChild(satLabel);
toolbar.appendChild(satMenuContainer);

const vehMenuContainer = document.createElement("span");
vehMenuContainer.id = "vehMenu";
vehMenuContainer.style.display = "none";
const vehLabel = document.createElement("span");
vehLabel.textContent = "Draw paths relative to: ";
vehMenuContainer.appendChild(vehLabel);
toolbar.appendChild(vehMenuContainer);

// Satellite options dropdown
Sandcastle.addToolbarMenu(
  [
    { text: "Satellite 1", value: "sat1", onselect: sat1View },
    { text: "Satellite 2", value: "sat2", onselect: sat2View },
    { text: "Both", value: "both", onselect: bothView },
    { text: "Earth", value: "earth", onselect: earthView },
  ],
  "satMenu",
);

// Vehicle options dropdown
Sandcastle.addToolbarMenu(
  [
    { text: "Vehicle", value: "vehicle", onselect: vehicleView },
    { text: "Helicopter", value: "helicopter", onselect: helicopterView },
  ],
  "vehMenu",
);
