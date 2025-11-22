import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});

const scene = viewer.scene;
const globe = scene.globe;

// Tropics of Cancer and Capricorn
const coffeeBeltRectangle = Cesium.Rectangle.fromDegrees(
  -180.0,
  -23.43687,
  180.0,
  23.43687,
);

globe.cartographicLimitRectangle = coffeeBeltRectangle;
globe.showSkirts = false;
globe.backFaceCulling = false;
globe.undergroundColor = undefined;
scene.skyAtmosphere.show = false;

// Add rectangles to show bounds
const rectangles = [];

for (let i = 0; i < 10; i++) {
  rectangles.push(
    viewer.entities.add({
      rectangle: {
        coordinates: coffeeBeltRectangle,
        material: Cesium.Color.WHITE.withAlpha(0.0),
        height: i * 5000.0,
        outline: true,
        outlineWidth: 4.0,
        outlineColor: Cesium.Color.WHITE,
      },
    }),
  );
}

Sandcastle.addToggleButton("Limit Enabled", true, function (checked) {
  if (checked) {
    viewer.scene.globe.cartographicLimitRectangle = coffeeBeltRectangle;
  } else {
    viewer.scene.globe.cartographicLimitRectangle = undefined;
  }
});

Sandcastle.addToggleButton("Show Bounds", true, function (checked) {
  const rectanglesLength = rectangles.length;
  for (let i = 0; i < rectanglesLength; i++) {
    const rectangleEntity = rectangles[i];
    rectangleEntity.show = checked;
  }
});
