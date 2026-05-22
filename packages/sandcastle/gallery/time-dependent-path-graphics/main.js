import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

async function loadCzml(url) {
  viewer.dataSources.removeAll();
  await viewer.dataSources.add(Cesium.CzmlDataSource.load(url));
}

const basePath = "../../SampleData/";

Sandcastle.addDefaultToolbarButton("Portions", async function () {
  await loadCzml(`${basePath}TimeDependentPaths_Portions.czml`);
});

Sandcastle.addToolbarButton("Whole", async function () {
  await loadCzml(`${basePath}TimeDependentPaths_Whole.czml`);
});

Sandcastle.addToolbarButton("Varying materialMode", async function () {
  await loadCzml(`${basePath}TimeDependentPaths_VaryingMaterialMode.czml`);
});
