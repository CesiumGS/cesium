import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const czml1 = [
  {
    id: "document",
    name: "CZML Geometries: Rectangle",
    version: "1.0",
  },
  {
    rectangle: {
      coordinates: {
        wsenDegrees: [-120, 40, -110, 50],
      },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgba: [255, 0, 0, 255],
          },
        },
      },
    },
  },
  {
    rectangle: {
      coordinates: {
        wsenDegrees: [-110, 40, -100, 50],
      },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgba: [0, 0, 255, 255],
          },
        },
      },
    },
  },
];

const czml2 = [
  {
    id: "document",
    name: "CZML Geometries: Rectangle",
    version: "1.0",
  },
  {
    rectangle: {
      coordinates: {
        wsenDegrees: [-120, 45, -110, 55],
      },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgba: [255, 255, 0, 255],
          },
        },
      },
    },
  },
  {
    rectangle: {
      coordinates: {
        wsenDegrees: [-110, 45, -100, 55],
      },
      fill: true,
      material: {
        solidColor: {
          color: {
            rgba: [0, 255, 255, 255],
          },
        },
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
const promise1 = Cesium.CzmlDataSource.load(czml1);
viewer.dataSources.add(promise1);
const promise2 = Cesium.CzmlDataSource.load(czml2);
viewer.dataSources.add(promise2);

Sandcastle.addToolbarButton("Swap", function () {
  Promise.all([promise1, promise2]).then(function (results) {
    const ds1 = results[0];
    if (viewer.dataSources.indexOf(ds1) === 0) {
      viewer.dataSources.raise(ds1);
    } else {
      viewer.dataSources.lower(ds1);
    }
  });
});
