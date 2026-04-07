import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

viewer.dataSources.add(
  Cesium.CzmlDataSource.load("../../../Specs/Data/CZML/TimeDependentPaths_Portions.czml"),
);

viewer.camera.flyHome(0);

/* Notes

- The current way this works is the entire material changes at the interval boundaries
- What we want is for it to be one color for the positions within the first interval, then another color in the next segment for the positions within the second interval, etc.
- '"Portions": apply interval-based material properties based on **temporal position information**'
- Must ultimately be enum not string
- When updater goes to check/update the material, if it's changed, we need to make a new polyline instead of modifying existing polyline material
- *** ^ where does the updater update the material/check if it's changed via TimeIntervalCollection
*/
