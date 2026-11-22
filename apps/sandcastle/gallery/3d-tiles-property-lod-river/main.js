import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
const scene = viewer.scene;

try {
  const tileset = scene.primitives.add(
    await Cesium.Cesium3DTileset.fromIonAssetId(5135960, {
      // enable draping for this tileset
      heightReference: Cesium.HeightReference.CLAMP_TO_TERRAIN,
      scene: scene,
    }),
  );

  tileset.style = new Cesium.Cesium3DTileStyle({
    color: {
      conditions: [
        ["Number(${ORD_FLOW}) <= 1", "color('navy')"],
        ["Number(${ORD_FLOW}) <= 2", "color('blue')"],
        ["Number(${ORD_FLOW}) <= 3", "color('dodgerblue')"],
        ["Number(${ORD_FLOW}) <= 4", "color('cyan')"],
        ["Number(${ORD_FLOW}) <= 5", "color('limegreen')"],
        ["Number(${ORD_FLOW}) <= 6", "color('yellow')"],
        ["Number(${ORD_FLOW}) <= 7", "color('gold')"],
        ["Number(${ORD_FLOW}) <= 8", "color('orange')"],
        ["Number(${ORD_FLOW}) <= 9", "color('orangered')"],
        ["Number(${ORD_FLOW}) <= 10", "color('red')"],
        ["true", "color('gray')"],
      ],
    },
    lineWidth: "5.0 - clamp(Number(${ORD_FLOW}), 0.0, 10.0) * 0.4",
  });

  function addOrdFlowLegend(viewer) {
    const bins = [
      { label: "1", color: "navy", width: 3.0 },
      { label: "2", color: "blue", width: 2.8 },
      { label: "3", color: "dodgerblue", width: 2.6 },
      { label: "4", color: "cyan", width: 2.4 },
      { label: "5", color: "limegreen", width: 2.2 },
      { label: "6", color: "yellow", width: 2.0 },
      { label: "7", color: "gold", width: 1.8 },
      { label: "8", color: "orange", width: 1.6 },
      { label: "9", color: "orangered", width: 1.4 },
      { label: "10", color: "red", width: 1.2 },
    ];

    const el = document.createElement("div");
    el.id = "ordFlowLegend";
    Object.assign(el.style, {
      position: "absolute",
      top: "10px",
      left: "10px",
      padding: "10px 12px",
      background: "rgba(0, 0, 0, 0.6)",
      color: "#fff",
      font: "12px/1.4 sans-serif",
      borderRadius: "6px",
      zIndex: 1000,
      pointerEvents: "none",
      maxWidth: "150px",
    });

    const title = document.createElement("div");
    title.textContent = "ORD_FLOW";
    Object.assign(title.style, {
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: "4px",
    });
    el.appendChild(title);

    const desc = document.createElement("div");
    desc.innerHTML =
      "Indicator of river order using river flow to distinguish logarithmic size classes, smaller value means bigger river " +
      '<a href="https://data.hydrosheds.org/file/technical-documentation/HydroRIVERS_TechDoc_v10.pdf" ' +
      'target="_blank" rel="noopener" ' +
      'style="color:#8cf;text-decoration:underline;pointer-events:auto;">' +
      "Learn more</a>";
    Object.assign(desc.style, {
      fontSize: "11px",
      opacity: "0.85",
      marginBottom: "8px",
      lineHeight: "1.3",
    });
    el.appendChild(desc);

    for (const bin of bins) {
      const row = document.createElement("div");
      Object.assign(row.style, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        margin: "3px 0",
      });

      const swatch = document.createElement("span");
      Object.assign(swatch.style, {
        display: "inline-block",
        width: "28px",
        height: `${bin.width * 2}px`,
        background: bin.color,
        borderRadius: "1px",
        flex: "none",
      });

      const label = document.createElement("span");
      label.textContent = bin.label;

      row.appendChild(swatch);
      row.appendChild(label);
      el.appendChild(row);
    }

    viewer.container.appendChild(el);
    return el;
  }

  addOrdFlowLegend(viewer);
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(86.859391, 26.907291, 73151.49),
    orientation: {
      heading: Cesium.Math.toRadians(359.93),
      pitch: Cesium.Math.toRadians(-38.55),
      roll: Cesium.Math.toRadians(360.0),
    },
    duration: 0,
  });
} catch (error) {
  console.log(error);
}
