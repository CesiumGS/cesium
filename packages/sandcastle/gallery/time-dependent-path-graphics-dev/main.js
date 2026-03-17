import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  shouldAnimate: true,
});

viewer.dataSources.add(
  Cesium.CzmlDataSource.load("../../../Specs/Data/CZML/TimeDependentPaths_Portions.czml"),
);

viewer.camera.flyHome(0);

/* Notes

Q: With "Path.MaterialMode: Whole", is the material still required to have intervals? or should it be just one property, not a JSON array (or an array with just one interval)?
- A: No, it is not required to have intervals or be an array. With "Whole"/default behavior, it can be just an object, as the existing schema is.

Q: To confirm-- with "Path.MaterialMode: Portions", the material should be an array of objects, each with an "interval" property?

Changes:
- PolylineMaterial becomes interpolatable

*/
