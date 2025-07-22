import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Geometries: Polyline Volume",
    version: "1.0",
  },
  {
    id: "greenBox",
    name: "Green box with beveled corners and outline",
    polylineVolume: {
      positions: {
        cartographicDegrees: [
          -90.0, 32.0, 0, -90.0, 36.0, 100000, -94.0, 36.0, 0,
        ],
      },
      shape: {
        cartesian2: [
          -50000, -50000, 50000, -50000, 50000, 50000, -50000, 50000,
        ],
      },
      cornerType: "BEVELED",
      material: {
        solidColor: {
          color: {
            rgba: [0, 255, 0, 128],
          },
        },
      },
      outline: true,
      outlineColor: {
        rgba: [0, 0, 0, 255],
      },
    },
  },
  {
    id: "blueStar",
    name: "Blue star with mitered corners and outline",
    polylineVolume: {
      positions: {
        cartographicDegrees: [
          -95.0, 32.0, 0, -95.0, 36.0, 100000, -99.0, 36.0, 200000,
        ],
      },
      shape: {
        cartesian2: [
          70000, 0, 45048.44339512096, 21694.186955877907, 43644.28613011135,
          54728.203772762085, 11126.046697815722, 48746.39560909118,
          -15576.465376942004, 68244.95385272766, -31174.490092936674,
          39091.57412340149, -63067.82075316933, 30371.861738229076, -50000,
          6.123233995736766e-12, -63067.82075316934, -30371.86173822906,
          -31174.490092936685, -39091.574123401486, -15576.465376942022,
          -68244.95385272766, 11126.046697815711, -48746.39560909118,
          43644.28613011134, -54728.20377276209, 45048.44339512095,
          -21694.186955877918,
        ],
      },
      cornerType: "MITERED",
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

const viewer = new Cesium.Viewer("cesiumContainer");
const dataSourcePromise = Cesium.CzmlDataSource.load(czml);
viewer.dataSources.add(dataSourcePromise);
viewer.zoomTo(dataSourcePromise);
