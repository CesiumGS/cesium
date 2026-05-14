import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

async function loadCzml(url) {
  viewer.dataSources.removeAll();
  await viewer.dataSources.add(Cesium.CzmlDataSource.load(url));
  // viewer.camera.flyHome(0);
}

const basePath = "../../../Specs/Data/CZML/";

Sandcastle.addDefaultToolbarButton("Portions", async function () {
  await loadCzml(`${basePath}TimeDependentPaths_Portions.czml`);
});

Sandcastle.addToolbarButton("Whole", async function () {
  await loadCzml(`${basePath}TimeDependentPaths_Whole.czml`);
});

Sandcastle.addToolbarButton("Orbit Modes", async function () {
  await loadCzml(`${basePath}OrbitModes.czml`);
});

/* Notes

Orbit Modes Test — Three operational modes in an orbit:
  1. Normal propagation (blue)  — short segment (< 1 revolution) + long segment (> 1 revolution)
  2. Maneuver (yellow)          — short segment (< 1 revolution) + long segment (> 1 revolution)
  3. Outage (gray)              — short segment (< 1 revolution) + long segment (> 1 revolution)

Segment layout (6 intervals, ~8.25 hours total):
  Short Normal   (blue)   :  0:00 –  0:45  (45 min)
  Long  Maneuver (yellow) :  0:45 –  2:45  (120 min, > 1 orbit ~90 min)
  Short Outage   (gray)   :  2:45 –  3:30  (45 min)
  Long  Normal   (blue)   :  3:30 –  5:30  (120 min, > 1 orbit)
  Short Maneuver (yellow) :  5:30 –  6:15  (45 min)
  Long  Outage   (gray)   :  6:15 –  8:15  (120 min, > 1 orbit)

Uses materialMode = PathMode.PORTIONS so each segment renders its own color.

- The current way this works is the entire material changes at the interval boundaries
- What we want is for it to be one color for the positions within the first interval, then another color in the next segment for the positions within the second interval, etc.
- '"Portions": apply interval-based material properties based on **temporal position information**'
- Must ultimately be enum not string
- When updater goes to check/update the material, if it's changed, we need to make a new polyline instead of modifying existing polyline material
- *** ^ where does the updater update the material/check if it's changed via TimeIntervalCollection
*/
