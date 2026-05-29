// import * as Cesium from "cesium";
// import Sandcastle from "Sandcastle";

// const viewer = new Cesium.Viewer("cesiumContainer", {
//   shouldAnimate: true,
// });

// async function loadCzml(url) {
//   viewer.dataSources.removeAll();
//   await viewer.dataSources.add(Cesium.CzmlDataSource.load(url));
// }

// const basePath = "../../SampleData/";

// Sandcastle.addDefaultToolbarButton("Portions", async function () {
//   await loadCzml(`${basePath}TimeDependentPaths_Portions.czml`);
// });

// Sandcastle.addToolbarButton("Whole", async function () {
//   await loadCzml(`${basePath}TimeDependentPaths_Whole.czml`);
// });

// Sandcastle.addToolbarButton("Varying materialMode", async function () {
//   await loadCzml(`${basePath}TimeDependentPaths_VaryingMaterialMode.czml`);
// });

import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {});

async function loadCzml(czml) {
  viewer.dataSources.removeAll();
  await viewer.dataSources.add(Cesium.CzmlDataSource.load(czml));
}

function getCzml(materialMode) {
const czml = [
  {
    "id":"document",
    "version":"1.0",
    "clock":{
      "interval":"2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      "currentTime":"2026-04-01T00:00:00Z"
    }
  },
  {
    "availability":"2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
    "position":{
      "epoch":"2026-04-01T00:00:00Z",
      "cartographicDegrees":[
        0,-70,20,1.5e5,
        60,-75,15,1.6e5,
        120,-78,24,1.4e5,
        180,-83,10,1.7e5
      ]
    },
    "billboard":{
      "image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjA1G8PgXAAAAKpJREFUOE+Vk80NwCAIhR3NURiloziKo3SE3nugQsUYfqo14dLkfbwHNKWfL+eKTUL1/5FYagUxHWYxlIpUBgJw8EfIbHFAPHGPYmLgWRMWMBC2Lp1DMd4XAwTSXYgTBkRisYICIbHnZGf0nJ9AtbiQHcYrnCE83DZkGTTFNCR1JAOy2jmDgiMZ6+ydfftfR6KEvm0BeHvWnb3sqyPZ+nHCI3GnHSxyq5PWPvZO1Mf6/eeiAAAAAElFTkSuQmCC"
    },
    "path":{
      "width":8,
      "resolution": 1.0,
      "materialMode": materialMode || "PORTIONS",
      "material":[
        {
          "interval":"2026-04-01T00:00:00Z/2026-04-01T00:01:00Z",
          "solidColor":{
            "color":{
              "rgba":[
                255,0,0,255
              ]
            }
          }
        },
        {
          "interval":"2026-04-01T00:01:00Z/2026-04-01T00:02:00Z",
          "polylineGlow":{
            "color":{
              "rgba":[
                128,0,128,255
              ]
            },
            "glowPower":{
              "epoch":"2026-04-01T00:01:00Z",
              "number":[
                0,0,
                60,1
              ]
            }
          }
        },
        {
          "interval":"2026-04-01T00:02:00Z/2026-04-01T00:03:00Z",
          "polylineDash":{
            "color":[
              {
                "interval":"2026-04-01T00:02:00Z/2026-04-01T00:02:30Z",
                "rgba":[
                  144,238,144,255
                ]
              },
              {
                "interval":"2026-04-01T00:02:30Z/2026-04-01T00:03:00Z",
                "rgba":[
                  240,128,128,255
                ]
              }
            ]
          }
        }
      ]
    }
  }
];
return czml;
}

Sandcastle.addDefaultToolbarButton("Portions", async function () {
  await loadCzml(getCzml());
});

Sandcastle.addToolbarButton("Whole", async function () {
  await loadCzml(getCzml("WHOLE"));
});

function getCzml2(materialMode) {
const czml = [
  {
    "id":"document",
    "version":"1.0",
    "clock":{
      "interval":"2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      "currentTime":"2026-04-01T00:00:00Z"
    }
  },
  {
    "availability":"2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
    "position":{
      "epoch":"2026-04-01T00:00:00Z",
      "cartographicDegrees":[
        0,-70,20,1.5e5,
        60,-75,15,1.6e5,
        120,-78,24,1.4e5,
        180,-83,10,1.7e5
      ]
    },
    "billboard":{
      "image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjA1G8PgXAAAAKpJREFUOE+Vk80NwCAIhR3NURiloziKo3SE3nugQsUYfqo14dLkfbwHNKWfL+eKTUL1/5FYagUxHWYxlIpUBgJw8EfIbHFAPHGPYmLgWRMWMBC2Lp1DMd4XAwTSXYgTBkRisYICIbHnZGf0nJ9AtbiQHcYrnCE83DZkGTTFNCR1JAOy2jmDgiMZ6+ydfftfR6KEvm0BeHvWnb3sqyPZ+nHCI3GnHSxyq5PWPvZO1Mf6/eeiAAAAAElFTkSuQmCC"
    },
    "path":{
      "width":8,
      "materialMode": materialMode || "PORTIONS",
      "material":
        {
          "polylineDash":{
            "color":{
              "rgba":[
                144,238,144,255
              ]
            },
          }
        }
    }
  }
];
return czml;
}

Sandcastle.addToolbarButton("non-time varying", async function () {
  await loadCzml(getCzml2());
});

Sandcastle.addToolbarButton("non-time varying WHOLE", async function () {
  await loadCzml(getCzml2("WHOLE"));
});




function getCzml3(materialMode) {
const czml = [
  {
    "id":"document",
    "version":"1.0",
    "clock":{
      "interval":"2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
      "currentTime":"2026-04-01T00:00:00Z"
    }
  },
  {
    "availability":"2026-04-01T00:00:00Z/2026-04-01T00:03:00Z",
    "position":{
      "epoch":"2026-04-01T00:00:00Z",
      "cartographicDegrees":[
        0,-70,20,1.5e5,
        60,-75,15,1.6e5,
        120,-78,24,1.4e5,
        180,-83,10,1.7e5
      ]
    },
    "billboard":{
      "image":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjA1G8PgXAAAAKpJREFUOE+Vk80NwCAIhR3NURiloziKo3SE3nugQsUYfqo14dLkfbwHNKWfL+eKTUL1/5FYagUxHWYxlIpUBgJw8EfIbHFAPHGPYmLgWRMWMBC2Lp1DMd4XAwTSXYgTBkRisYICIbHnZGf0nJ9AtbiQHcYrnCE83DZkGTTFNCR1JAOy2jmDgiMZ6+ydfftfR6KEvm0BeHvWnb3sqyPZ+nHCI3GnHSxyq5PWPvZO1Mf6/eeiAAAAAElFTkSuQmCC"
    },
    "path":{
      "width":8,
      "materialMode": materialMode || "PORTIONS",
      "material":{
        "solidColor":{
          "color":[{
            "epoch":"2026-04-01T00:00:00Z",
            "rgba":[
              0,  255,0,0,255,
              180,0,255,0,255
            ]
          }]
        }
      }
    }
  }
];
return czml;
}

Sandcastle.addToolbarButton("sampled", async function () {
  await loadCzml(getCzml3());
});

Sandcastle.addToolbarButton("sampled WHOLE", async function () {
  await loadCzml(getCzml3("WHOLE"));
});

