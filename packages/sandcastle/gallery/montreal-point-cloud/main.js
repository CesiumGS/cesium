import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

// Fly to a nice overview of the city.
viewer.camera.flyTo({
  destination: new Cesium.Cartesian3(
    1223285.2286828577,
    -4319476.080312792,
    4562579.020145769,
  ),
  orientation: {
    direction: new Cesium.Cartesian3(
      0.63053223097472,
      0.47519958296727743,
      -0.6136892226931869,
    ),
    up: new Cesium.Cartesian3(
      0.7699959023135587,
      -0.4824455703743441,
      0.41755548379407276,
    ),
  },
  duration: 0,
});

// Add stored views around Montreal. You can add to this list by capturing camera.position, camera.direction and camera.up.
Sandcastle.addToolbarMenu([
  {
    text: "Overview",
    onselect: function () {
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(
          1268112.9336926902,
          -4347432.089579957,
          4539129.813606778,
        ),
        orientation: {
          direction: new Cesium.Cartesian3(
            -0.23288147105081208,
            0.9376599248561527,
            -0.25799241415197466,
          ),
          up: new Cesium.Cartesian3(
            -0.015748156073159988,
            0.2616156268422992,
            0.9650436567182887,
          ),
        },
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    },
  },
  {
    text: "Highway",
    onselect: function () {
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(
          1266560.143870489,
          -4278126.842199712,
          4542690.264566619,
        ),
        orientation: {
          direction: new Cesium.Cartesian3(
            -0.3402460635871598,
            -0.46669052711538217,
            -0.8163532128400116,
          ),
          up: new Cesium.Cartesian3(
            0.08964012922691329,
            -0.8802940231336787,
            0.46588311846138497,
          ),
        },
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    },
  },
  {
    text: "Olympic Stadium",
    onselect: function () {
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(
          1267081.619536883,
          -4290744.917138439,
          4530941.041519919,
        ),
        orientation: {
          direction: new Cesium.Cartesian3(
            -0.735813047510908,
            0.6294547560338262,
            0.24973159435503312,
          ),
          up: new Cesium.Cartesian3(
            -0.09796934684423217,
            -0.4638476756625683,
            0.88048131204549,
          ),
        },
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    },
  },
  {
    text: "Biosphere Museum",
    onselect: function () {
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(
          1269319.8408991008,
          -4293301.826913256,
          4527724.561372451,
        ),
        orientation: {
          direction: new Cesium.Cartesian3(
            -0.742505030107832,
            -0.3413204607149223,
            -0.5763563336703441,
          ),
          up: new Cesium.Cartesian3(
            -0.04655102331027917,
            -0.8320643756800384,
            0.5527222421370013,
          ),
        },
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    },
  },
  {
    text: "St. Joseph's Oratory of Mount Royal",
    onselect: function () {
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(
          1263148.6745904868,
          -4297262.506644816,
          4525958.844284831,
        ),
        orientation: {
          direction: new Cesium.Cartesian3(
            0.6550952540993403,
            0.7551122393690295,
            0.025606913355780074,
          ),
          up: new Cesium.Cartesian3(
            0.46670450470847263,
            -0.4310758971098583,
            0.7722437932516845,
          ),
        },
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    },
  },
]);

// Set up checkboxes for toggling the various classification settings.
const viewModel = {
  ground: true,
  other: true,
  buildings: true,
  low_vegetation: true,
  medium_vegetation: true,
  high_vegetation: true,
};

// Assign colors to each classification type.
const pointStyles = {
  unclassified: {
    color: "color('#808080')",
    show: true,
  },
  not_awarded: {
    color: "color('#FFDEAD')",
    show: true,
  },
  ground: {
    color: "color('#FFDEAD')",
    show: true,
  },
  low_vegetation: {
    color: "color('#63FF7E')",
    show: true,
  },
  medium_vegetation: {
    color: "color('#63FF7E')",
    show: true,
  },
  high_vegetation: {
    color: "color('#22B33A')",
    show: true,
  },
  buildings: {
    color: "color('#efefef')",
    show: true,
  },
  low_point: {
    color: "color('#808080')",
    show: true,
  },
  reserved_city_diffusion: {
    color: "color('#808080')",
    show: true,
  },
};

const classificationDictionary = {
  not_awarded: 1,
  ground: 2,
  low_vegetation: 3,
  medium_vegetation: 4,
  high_vegetation: 5,
  buildings: 6,
  low_point: 7,
  reserved_city_diffusion: 8,
  unclassified: -1,
};

// This is a helper function to re-apply the styles each time the UI/checkboxes are updated.
function applyStyle(tileset, styles) {
  const styleObject = {};
  const styleKeys = Object.keys(styles);

  styleObject.color = {
    conditions: [],
  };
  styleObject.show = {
    conditions: [],
  };

  let finalCondition;

  for (let i = 0; i < styleKeys.length; ++i) {
    const key = styleKeys[i];
    const id = classificationDictionary[key];

    const colorCondition = [`\${Classification} === ${id}`, styles[key].color];
    const showCondition = [`\${Classification} === ${id}`, styles[key].show];

    if (id === -1) {
      colorCondition[0] = true;
      showCondition[0] = true;

      finalCondition = {
        colorCondition: colorCondition,
        showCondition: showCondition,
      };
    } else {
      styleObject.color.conditions.push(colorCondition);
      styleObject.show.conditions.push(showCondition);
    }
  }

  if (Cesium.defined(finalCondition)) {
    styleObject.color.conditions.push(finalCondition.colorCondition);
    styleObject.show.conditions.push(finalCondition.showCondition);
  }

  tileset.style = new Cesium.Cesium3DTileStyle(styleObject);
}

let tileset;
try {
  // A ~10 billion point 3D Tileset of the city of Montreal, Canada captured in 2015 with a resolution of 20 cm. Tiled and hosted by Cesium ion.
  tileset = await Cesium.Cesium3DTileset.fromIonAssetId(28945, {
    pointCloudShading: {
      attenuation: true,
      maximumAttenuation: 2,
    },
  });
  viewer.scene.primitives.add(tileset);

  // Apply an initial style.
  applyStyle(tileset, pointStyles);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

Cesium.knockout.track(viewModel);

const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);

// Set up the checkboxes.
Cesium.knockout.getObservable(viewModel, "ground").subscribe(function (show) {
  pointStyles.ground.show = show;
  pointStyles.not_awarded.show = show;

  applyStyle(tileset, pointStyles);
});

Cesium.knockout
  .getObservable(viewModel, "low_vegetation")
  .subscribe(function (show) {
    pointStyles.low_vegetation.show = show;

    applyStyle(tileset, pointStyles);
  });

Cesium.knockout
  .getObservable(viewModel, "medium_vegetation")
  .subscribe(function (show) {
    pointStyles.medium_vegetation.show = show;

    applyStyle(tileset, pointStyles);
  });

Cesium.knockout
  .getObservable(viewModel, "high_vegetation")
  .subscribe(function (show) {
    pointStyles.high_vegetation.show = show;

    applyStyle(tileset, pointStyles);
  });

Cesium.knockout
  .getObservable(viewModel, "buildings")
  .subscribe(function (show) {
    pointStyles.buildings.show = show;

    applyStyle(tileset, pointStyles);
  });

Cesium.knockout.getObservable(viewModel, "other").subscribe(function (show) {
  pointStyles.low_point.show = show;
  pointStyles.reserved_city_diffusion.show = show;
  pointStyles.unclassified.show = show;

  applyStyle(tileset, pointStyles);
});
