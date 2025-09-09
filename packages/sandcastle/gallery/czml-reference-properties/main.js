import * as Cesium from "cesium";

const czml = [
  {
    id: "document",
    name: "CZML Reference Properties",
    version: "1.0",
  },
  {
    id: "position-reference",
    position: {
      cartographicDegrees: [-110.0, 50.0, 0],
    },
  },
  {
    id: "fillColor-reference",
    name: "Referencing Position",
    description:
      "<p>For more examples of reference properties, see CZML Polygon - Interpolating References.</p>",
    billboard: {
      image:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACvSURBVDhPrZDRDcMgDAU9GqN0lIzijw6SUbJJygUeNQgSqepJTyHG91LVVpwDdfxM3T9TSl1EXZvDwii471fivK73cBFFQNTT/d2KoGpfGOpSIkhUpgUMxq9DFEsWv4IXhlyCnhBFnZcFEEuYqbiUlNwWgMTdrZ3JbQFoEVG53rd8ztG9aPJMnBUQf/VFraBJeWnLS0RfjbKyLJA8FkT5seDYS1Qwyv8t0B/5C2ZmH2/eTGNNBgMmAAAAAElFTkSuQmCC",
      scale: 1.5,
    },
    label: {
      fillColor: {
        rgba: [255, 255, 255, 255],
      },
      font: "13pt Lucida Console",
      horizontalOrigin: "LEFT",
      outlineColor: {
        rgba: [150, 0, 150, 255],
      },
      outlineWidth: 3,
      pixelOffset: {
        cartesian2: [20, 0],
      },
      style: "FILL_AND_OUTLINE",
      text: "referencing position",
    },
    position: {
      reference: "position-reference#position",
    },
  },
  {
    id: "polygon",
    name: "Referencing Fill Color",
    description:
      "<p>For more examples of reference properties, see CZML Polygon - Interpolating References.</p>",
    label: {
      fillColor: {
        rgba: [255, 255, 255, 255],
      },
      font: "13pt Lucida Console",
      horizontalOrigin: "LEFT",
      pixelOffset: {
        cartesian2: [20, 0],
      },
      style: "FILL_AND_OUTLINE",
      text: "referencing fillColor",
    },
    position: {
      cartographicDegrees: [-105, 35, 0],
    },
    polygon: {
      positions: {
        cartographicDegrees: [
          -115.0, 37.0, 0, -115.0, 32.0, 0, -107.0, 33.0, 0, -102.0, 31.0, 0,
          -102.0, 35.0, 0,
        ],
      },
      height: 0,
      material: {
        solidColor: {
          color: {
            reference: "fillColor-reference#label.outlineColor",
          },
        },
      },
    },
  },
];

const viewer = new Cesium.Viewer("cesiumContainer");
viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
