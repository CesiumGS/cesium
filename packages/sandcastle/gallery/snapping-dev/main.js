import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {});
viewer.scene.globe.show = true;
viewer.scene.debugShowFramesPerSecond = true;
const tilesetUrl =
  "https://d143ryb2ii5d8n.cloudfront.net/458c98ba-d007-40b9-9372-42d49f424a84/tileset.json?sv=2024-05-04&spr=https&se=2026-03-14T23%3A59%3A59Z&sr=c&sp=rl&sig=R1WPIZtHdgkf8TbaBgX1X7wFTygZKk6G7ESmtyqcLLI%3D&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9kMTQzcnliMmlpNWQ4bi5jbG91ZGZyb250Lm5ldC80NThjOThiYS1kMDA3LTQwYjktOTM3Mi00MmQ0OWY0MjRhODQvKiIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc3MzUzMjc5OX19fV19&Key-Pair-Id=K113QB06JS6XAB&Signature=nfMde0WJdASE3KGTA-jMcoXua1PQGjbrENH9tqXowTaJjrgPtsXqbhupyyMMhk2NiFWx-hygwubW99rohnMDlol73UL3lXn2dZy8bbLmlWlhbIctrr97f0e41-m1TzAhLQSqpI6VCSwabKFyEzqbwITXytvHDnf6Oz1XfFU04a4VfthhkjQ7eC2QX6MRUNb~A4ilgB7nYpxpQAj43-LgCiZEiVCjiaKyk~8JqwpMp7SFj~IoAxmvT9T9bLkvSp3EHu5fQhl6P9kZu2pOM1u7rwq5THJ8wFe73pMpqhF0ZyiSgGwFVKDYRcf0885qIUEn0pGV5wVz5PY5eIYFCkcjtA__";
const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl);
viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(movement) {
  const pickPosition = viewer.scene.pickPosition(movement.position);
  const pickFeature = viewer.scene.pick(movement.position);
  const element = pickFeature.getProperty("element");

  console.log(pickPosition);
  console.log(element);

  if (pickPosition) {
    doSnap(pickPosition);
  }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

async function doSnap(pickPosition) {
  const point = { x: pickPosition.x, y: pickPosition.y, z: pickPosition.z };
  const response = await fetch(
    "http://localhost:3000/api/assets/844c3411-0a0c-4ed5-b608-34dae75d3982/template/request-snap",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "0x300000008b1",
        testPoint: point,
        closePoint: point,
        worldToView: [
          [1, 0, 0, 0],
          [0, 1, 0, 0],
          [0, 0, 1, 0],
          [0, 0, 0, 1],
        ],
        snapModes: [1],
        snapAperture: 1000,
      }),
    },
  );
  const data = await response.json();
  console.log("snap result:", data);
  return data;
}
