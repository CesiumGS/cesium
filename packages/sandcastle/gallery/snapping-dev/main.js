import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {});
viewer.scene.globe.show = true;
viewer.scene.debugShowFramesPerSecond = true;
const tilesetUrl =
  "https://d143ryb2ii5d8n.cloudfront.net/458c98ba-d007-40b9-9372-42d49f424a84/tileset.json?sv=2024-05-04&spr=https&se=2026-03-14T23%3A59%3A59Z&sr=c&sp=rl&sig=R1WPIZtHdgkf8TbaBgX1X7wFTygZKk6G7ESmtyqcLLI%3D&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9kMTQzcnliMmlpNWQ4bi5jbG91ZGZyb250Lm5ldC80NThjOThiYS1kMDA3LTQwYjktOTM3Mi00MmQ0OWY0MjRhODQvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc3MzUzMjc5OX19fV19&Key-Pair-Id=K113QB06JS6XAB&Signature=nfMde0WJdASE3KGTA-jMcoXua1PQGjbrENH9tqXowTaJjrgPtsXqbhupyyMMhk2NiFWx-hygwubW99rohnMDlol73UL3lXn2dZy8bbLmlWlhbIctrr97f0e41-m1TzAhLQSqpI6VCSwabKFyEzqbwITXytvHDnf6Oz1XfFU04a4VfthhkjQ7eC2QX6MRUNb~A4ilgB7nYpxpQAj43-LgCiZEiVCjiaKyk~8JqwpMp7SFj~IoAxmvT9T9bLkvSp3EHu5fQhl6P9kZu2pOM1u7rwq5THJ8wFe73pMpqhF0ZyiSgGwFVKDYRcf0885qIUEn0pGV5wVz5PY5eIYFCkcjtA__";
const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

viewer.screenSpaceEventHandler.setInputAction(async function onLeftClick(movement) {
  const pickPosition = viewer.scene.pickPosition(movement.position);
  const pickFeature = viewer.scene.pick(movement.position);
  const element = pickFeature.getProperty("element");
  const elementId = `0x${element.toString(16)}`;

  const cartoRad = Cesium.Cartographic.fromCartesian(pickPosition);
  const carto = {
    longitude: Cesium.Math.toDegrees(cartoRad.longitude),
    latitude: Cesium.Math.toDegrees(cartoRad.latitude),
    height: cartoRad.height
  }
  console.log(carto);
  console.log(elementId);

  if (pickPosition) {
    const snapResult = await doSnap(elementId, carto.latitude, carto.longitude, carto.height);
    console.log("snap result:", snapResult);

    const snapPoint = snapResult.snapPoint;

    // returned snap point
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        snapPoint.longitude, snapPoint.latitude, snapPoint.height
      ),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 10,
        outlineColor: Cesium.Color.YELLOW,
        outlineWidth: 3,
      },
    });

    // returned hit point
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        snapResult.hitPoint.longitude,
        snapResult.hitPoint.latitude,
        snapResult.hitPoint.height
      ),
      point: {
        color: Cesium.Color.PINK,
        pixelSize: 10,
        outlineColor: Cesium.Color.FUCHSIA,
        outlineWidth: 3,
      },
    });

    // picked position
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        carto.longitude, carto.latitude, carto.height
      ),
      point: {
        color: Cesium.Color.LIME,
        pixelSize: 10,
        outlineColor: Cesium.Color.CYAN,
        outlineWidth: 3,
      },
    });
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

async function doSnap(elementId, latitude, longitude, height) {
  const response = await fetch(
    "http://localhost:3000/api/assets/844c3411-0a0c-4ed5-b608-34dae75d3982/template/request-snap",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: elementId,
        testPoint: {
          latitude: latitude,
          longitude: longitude,
          height: height
        },
        worldToView: {},
      }),
    },
  );
  const data = await response.json();
  return data;
}
