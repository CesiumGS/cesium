import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    requestVertexNormals: true, //Needed to visualize slope
  }),
});

viewer.camera.setView({
  destination: new Cesium.Cartesian3(
    290637.5534733206,
    5637471.593707632,
    2978256.8126927214,
  ),
  orientation: {
    heading: 4.747266966349747,
    pitch: -0.2206998858596192,
    roll: 6.280340554587955,
  },
});

const viewModel = {
  gradient: false,
  band1Position: 7000.0,
  band2Position: 7500.0,
  band3Position: 8000.0,
  bandThickness: 100.0,
  bandTransparency: 0.5,
  backgroundTransparency: 0.75,
};

Cesium.knockout.track(viewModel);
const toolbar = document.getElementById("toolbar");
Cesium.knockout.applyBindings(viewModel, toolbar);
for (const name in viewModel) {
  if (viewModel.hasOwnProperty(name)) {
    Cesium.knockout.getObservable(viewModel, name).subscribe(updateMaterial);
  }
}

function updateMaterial() {
  const gradient = Boolean(viewModel.gradient);
  const band1Position = Number(viewModel.band1Position);
  const band2Position = Number(viewModel.band2Position);
  const band3Position = Number(viewModel.band3Position);
  const bandThickness = Number(viewModel.bandThickness);
  const bandTransparency = Number(viewModel.bandTransparency);
  const backgroundTransparency = Number(viewModel.backgroundTransparency);

  const layers = [];
  const backgroundLayer = {
    entries: [
      {
        height: 4200.0,
        color: new Cesium.Color(0.0, 0.0, 0.2, backgroundTransparency),
      },
      {
        height: 8000.0,
        color: new Cesium.Color(1.0, 1.0, 1.0, backgroundTransparency),
      },
      {
        height: 8500.0,
        color: new Cesium.Color(1.0, 0.0, 0.0, backgroundTransparency),
      },
    ],
    extendDownwards: true,
    extendUpwards: true,
  };
  layers.push(backgroundLayer);

  const gridStartHeight = 4200.0;
  const gridEndHeight = 8848.0;
  const gridCount = 50;
  for (let i = 0; i < gridCount; i++) {
    const lerper = i / (gridCount - 1);
    const heightBelow = Cesium.Math.lerp(
      gridStartHeight,
      gridEndHeight,
      lerper,
    );
    const heightAbove = heightBelow + 10.0;
    const alpha = Cesium.Math.lerp(0.2, 0.4, lerper) * backgroundTransparency;
    layers.push({
      entries: [
        {
          height: heightBelow,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha),
        },
        {
          height: heightAbove,
          color: new Cesium.Color(1.0, 1.0, 1.0, alpha),
        },
      ],
    });
  }

  const antialias = Math.min(10.0, bandThickness * 0.1);

  if (!gradient) {
    const band1 = {
      entries: [
        {
          height: band1Position - bandThickness * 0.5 - antialias,
          color: new Cesium.Color(0.0, 0.0, 1.0, 0.0),
        },
        {
          height: band1Position - bandThickness * 0.5,
          color: new Cesium.Color(0.0, 0.0, 1.0, bandTransparency),
        },
        {
          height: band1Position + bandThickness * 0.5,
          color: new Cesium.Color(0.0, 0.0, 1.0, bandTransparency),
        },
        {
          height: band1Position + bandThickness * 0.5 + antialias,
          color: new Cesium.Color(0.0, 0.0, 1.0, 0.0),
        },
      ],
    };

    const band2 = {
      entries: [
        {
          height: band2Position - bandThickness * 0.5 - antialias,
          color: new Cesium.Color(0.0, 1.0, 0.0, 0.0),
        },
        {
          height: band2Position - bandThickness * 0.5,
          color: new Cesium.Color(0.0, 1.0, 0.0, bandTransparency),
        },
        {
          height: band2Position + bandThickness * 0.5,
          color: new Cesium.Color(0.0, 1.0, 0.0, bandTransparency),
        },
        {
          height: band2Position + bandThickness * 0.5 + antialias,
          color: new Cesium.Color(0.0, 1.0, 0.0, 0.0),
        },
      ],
    };

    const band3 = {
      entries: [
        {
          height: band3Position - bandThickness * 0.5 - antialias,
          color: new Cesium.Color(1.0, 0.0, 0.0, 0.0),
        },
        {
          height: band3Position - bandThickness * 0.5,
          color: new Cesium.Color(1.0, 0.0, 0.0, bandTransparency),
        },
        {
          height: band3Position + bandThickness * 0.5,
          color: new Cesium.Color(1.0, 0.0, 0.0, bandTransparency),
        },
        {
          height: band3Position + bandThickness * 0.5 + antialias,
          color: new Cesium.Color(1.0, 0.0, 0.0, 0.0),
        },
      ],
    };

    layers.push(band1);
    layers.push(band2);
    layers.push(band3);
  } else {
    const combinedBand = {
      entries: [
        {
          height: band1Position - bandThickness * 0.5,
          color: new Cesium.Color(0.0, 0.0, 1.0, bandTransparency),
        },
        {
          height: band2Position,
          color: new Cesium.Color(0.0, 1.0, 0.0, bandTransparency),
        },
        {
          height: band3Position + bandThickness * 0.5,
          color: new Cesium.Color(1.0, 0.0, 0.0, bandTransparency),
        },
      ],
    };

    layers.push(combinedBand);
  }

  const material = Cesium.createElevationBandMaterial({
    scene: viewer.scene,
    layers: layers,
  });
  viewer.scene.globe.material = material;
}

updateMaterial();
